/* Dedicated workers avoid blob-worker CSP failures. Each run gets a fresh worker. */
self.onmessage = async ({data}) => {
  const stdout = [], stderr = [];
  try {
    if (data.language === 'Python') {
      self.postMessage({type:'status',message:'Loading Python (first run may take a minute)…'});
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
      const py = await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
      const input = String(data.stdin || '').split('\n'); let cursor = 0;
      py.setStdout({batched:s=>stdout.push(s)});
      py.setStderr({batched:s=>stderr.push(s)});
      py.setStdin({stdin:()=>cursor < input.length ? input[cursor++] : null});
      const globals = py.toPy({});
      try { await py.runPythonAsync(data.code, {globals}); } finally { globals.destroy(); }
    } else if (data.language === 'JavaScript') {
      const format = x => typeof x === 'string' ? x : typeof x === 'undefined' ? 'undefined' : JSON.stringify(x);
      const console = {log:(...x)=>stdout.push(x.map(format).join(' ')),warn:(...x)=>stderr.push(x.map(format).join(' ')),error:(...x)=>stderr.push(x.map(format).join(' '))};
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      await new AsyncFunction('console','stdin',data.code)(console,String(data.stdin||''));
    } else { throw new Error('Unsupported local language'); }
    self.postMessage({type:'result',stdout:stdout.join('\n'),stderr:stderr.join('\n'),exitCode:0});
  } catch(e) { self.postMessage({type:'result',stdout:stdout.join('\n'),stderr:[...stderr,String(e)].join('\n'),exitCode:1}); }
};
