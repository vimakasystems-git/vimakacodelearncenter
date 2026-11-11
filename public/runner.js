let activeExecution = null;
function stopExecution(){if(activeExecution)activeExecution.stop()}
async function execute(code, language, stdin = '', onStatus = ()=>{}, remotePython=false){
  stopExecution();
  if(language==='Go'||language==='Java'||remotePython){
    const controller=new AbortController();const execution={stop:()=>controller.abort()};activeExecution=execution;
    const timer=setTimeout(()=>controller.abort(),30000);
    try{onStatus('Compiling with Wandbox (may take up to 90 seconds)…');const response=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,language,stdin}),signal:controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'Compiler unavailable');return result}
    catch(e){if(e.name==='AbortError')throw new Error('Execution stopped or timed out.');throw e}finally{clearTimeout(timer);if(activeExecution===execution)activeExecution=null}
  }
  return new Promise((resolve,reject)=>{
    let worker;
    try{worker=new Worker('/runtime/code-worker.js')}catch(e){reject(new Error('Browser worker could not start: '+e.message));return}
    let done=false;
    const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();activeExecution=null;error?reject(error):resolve(result)};
    const timer=setTimeout(()=>finish(new Error('Execution timed out. First Python load needs internet access; use the optional cloud runner if the runtime cannot download.')),language==='Python'?90000:10000);
    activeExecution={stop:()=>finish(new Error('Execution stopped.'))};
    worker.onmessage=({data})=>{if(data.type==='status')onStatus(data.message);else if(data.type==='result')finish(null,data)};
    worker.onerror=e=>finish(new Error(e.message||'Runtime could not start. Check the network and browser worker support.'));
    worker.postMessage({code,language,stdin});
  })
}
async function run(review){
  if(review&&mode!=='exercise'){toast('Switch to Exercise and write your solution to earn XP.');return}
  const code=$('#code').value,currentKey=codeKey(),runLanguage=lang,currentView=view;
  const output=$('#output'),status=$('#runStatus'),runButton=$('#runBtn'),reviewButton=$('#reviewBtn');
  const stdin=$('#stdin')?.value||'',remotePython=!!$('#remotePython')?.checked;
  runButton.disabled=reviewButton.disabled=true;$('#feedback').innerHTML='';output.textContent='';status.textContent='Starting…';
  try{const result=await execute(code,runLanguage,stdin,message=>{if(status.isConnected)status.textContent=message},remotePython);
    if(!output.isConnected||codeKey()!==currentKey||view!==currentView)return;
    output.textContent=[result.stdout,result.stderr].filter(Boolean).join('\n')||'(No output)';status.textContent=result.exitCode===0?'Finished · exit 0':'Failed · exit '+result.exitCode;
    if(review){if(result.exitCode===0)grade(result.stdout,code,false);else $('#feedback').innerHTML='<div class="feedback">The code did not finish successfully. Fix the error in the terminal, then run the exercise again.</div>'}
  }catch(e){if(output.isConnected){output.textContent=e.message;status.textContent='Execution failed'}}finally{if(runButton.isConnected)runButton.disabled=reviewButton.disabled=false}
}
