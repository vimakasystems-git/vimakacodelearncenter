const ASSETS = {};
const encoder = new TextEncoder();
const ttl = 24 * 60 * 60 * 1000;
const rates = new Map();
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})}
function random(){return Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('')}
async function digest(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),x=>x.toString(16).padStart(2,'0')).join('')}
function limit(key,max,window){let r=rates.get(key),now=Date.now();if(!r||r.until<now)r={n:0,until:now+window};r.n++;rates.set(key,r);if(rates.size>5000)for(const[k,v]of rates)if(v.until<now)rates.delete(k);return r.n<=max}
async function body(req){if(Number(req.headers.get('content-length'))>65536)throw new Error('Request too large');const t=await req.text();if(t.length>65536)throw new Error('Request too large');return JSON.parse(t)}
const text=(s,n)=>typeof s==='string'?s.slice(0,n):'';
function recordKey(id){return 'interviews/'+id+'.json'}
async function loadSession(env,id,token){const obj=await env.BUCKET.get(recordKey(id));if(!obj)return null;const data=await obj.json();if(data.expiresAt<Date.now())return null;const hash=await digest(token);let role=hash===data.companyHash?'company':hash===data.candidateHash?'candidate':null;return role?{data,etag:obj.etag,role}:null}
function publicSession(s,role){const {companyHash,candidateHash,...data}=s;return {...data,role}}
async function storeSession(env,loaded,next){const result=await env.BUCKET.put(recordKey(next.id),JSON.stringify(next),{onlyIf:{etagMatches:loaded.etag},httpMetadata:{contentType:'application/json'}});return !!result}
async function compile(req){const b=await body(req);if(!['Python','Go','Java'].includes(b.language)||typeof b.code!=='string'||b.code.length>20000)return json({error:'Unsupported language or source too large'},400);
 const compiler={Python:'cpython-3.12.7',Go:'go-1.22.8',Java:'openjdk-jdk-22+36'}[b.language];
 try{const res=await fetch('https://wandbox.org/api/compile.json',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'VimakaCodeLearnCenter/0.2'},body:JSON.stringify({compiler,code:b.language==='Java'?b.code.replace(/^(\s*)public(\s+(?:(?:final|abstract)\s+)?class\s+)/gm,'$1$2'):b.code,stdin:text(b.stdin,8000),save:false}),signal:AbortSignal.timeout(90000)});
 if(!res.ok)return json({error:'Compiler service unavailable ('+res.status+'). Retry later or use the external playground.'},502);
 const r=await res.json();return json({stdout:text(r.program_output,32000),stderr:text((r.compiler_error||'')+(r.program_error||'')+(r.signal?'\nSignal: '+r.signal:''),32000),exitCode:Number(r.status||0),compiler});
 }catch{return json({error:'Compiler service timed out or could not be reached. Your code is still in the editor.'},502)}
}
export async function handle(req,env){const url=new URL(req.url),p=url.pathname;
 if(p.startsWith('/api/')){
  if(!['GET','POST','PATCH'].includes(req.method))return json({error:'Method not allowed'},405);
  if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return json({error:'Origin not allowed'},403);
  const ip=req.headers.get('cf-connecting-ip')||'local';
  if(p==='/api/run'&&req.method==='POST'){if(!limit('run:'+ip,20,60000))return json({error:'Too many runs. Wait a minute.'},429);return compile(req)}
  if(!env.BUCKET)return json({error:'Session storage is unavailable'},503);
  if(p==='/api/interviews'&&req.method==='POST'){
   if(!limit('create:'+ip,10,3600000))return json({error:'Too many new sessions. Try again later.'},429);
   const b=await body(req);if(!['Python','JavaScript','Go','Java'].includes(b.language)||!text(b.company,80).trim()||!text(b.prompt,4000).trim())return json({error:'Company, language and challenge are required'},400);
   const companyToken=random(),candidateToken=random(),id=crypto.randomUUID();
   const data={id,company:text(b.company,80),title:text(b.title,120)||'Coding interview',prompt:text(b.prompt,4000),language:b.language,code:text(b.code,20000),stdin:'',output:'',revision:0,status:'open',createdAt:Date.now(),expiresAt:Date.now()+ttl,durationMinutes:Math.max(5,Math.min(180,Number(b.durationMinutes)||45)),candidateName:'',candidateSeenAt:null,companySeenAt:Date.now(),messages:[],companyHash:await digest(companyToken),candidateHash:await digest(candidateToken)};
   await env.BUCKET.put(recordKey(id),JSON.stringify(data),{httpMetadata:{contentType:'application/json'}});
   return json({session:publicSession(data,'company'),companyToken,candidateToken},201);
  }
  const match=p.match(/^\/api\/interviews\/([0-9a-f-]{36})(\/presence)?$/);
  if(!match)return json({error:'Not found'},404);
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(!/^[0-9a-f]{48}$/.test(token))return json({error:'A valid session invitation is required'},401);
  const loaded=await loadSession(env,match[1],token);if(!loaded)return json({error:'Session not found, expired, or invitation is invalid'},404);
  let s=loaded.data;
  if(req.method==='GET')return json({session:publicSession(s,loaded.role)});
  const b=await body(req);
  if(match[2]){
   s={...s,[loaded.role+'SeenAt']:Date.now()};
   if(loaded.role==='candidate'&&typeof b.name==='string')s.candidateName=text(b.name,80);
   // Presence is best-effort: a stale update must never overwrite a newer code revision.
   await storeSession(env,loaded,s);return json({ok:true});
  }
  if(req.method!=='PATCH')return json({error:'Method not allowed'},405);
  if(b.revision!==s.revision)return json({error:'Session changed. Refresh and retry.',session:publicSession(s,loaded.role)},409);
  if(s.status==='ended')return json({error:'This session has ended',session:publicSession(s,loaded.role)},409);
  const next={...s,revision:s.revision+1,[loaded.role+'SeenAt']:Date.now()};
  if(b.end===true){if(loaded.role!=='company')return json({error:'Only the company can end the session'},403);next.status='ended'}
  if('code'in b||'stdin'in b){if(loaded.role!=='candidate')return json({error:'Only the candidate can edit the solution'},403);next.code=text(b.code??s.code,20000);next.stdin=text(b.stdin??s.stdin,8000)}
  if(typeof b.output==='string'){if(loaded.role!=='candidate')return json({error:'Only the candidate can share output'},403);next.output=text(b.output,32000)}
  if(typeof b.message==='string'&&b.message.trim())next.messages=[...s.messages,{role:loaded.role,text:text(b.message.trim(),1000),at:Date.now()}].slice(-100);
  if(!await storeSession(env,loaded,next))return json({error:'Another update arrived. Refresh and retry.'},409);
  return json({session:publicSession(next,loaded.role)});
 }
 const path=p==='/'?'/index.html':p;
 if(!(path in ASSETS))return new Response('Not found',{status:404});
 const ext=path.split('.').pop(),mime={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json'}[ext]||'text/plain';
 const headers={'Content-Type':mime+'; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'};
 // A worker's own CSP permits the runtime compiler while the document stays restricted.
 headers['Content-Security-Policy']=path==='/runtime/code-worker.js'?"default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-eval' 'wasm-unsafe-eval'; connect-src 'self' https://cdn.jsdelivr.net;":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; worker-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data:; base-uri 'self'; frame-ancestors 'self'; object-src 'none'";
 return new Response(ASSETS[path],{headers});
}
export default {async fetch(req,env){try{return await handle(req,env)}catch(e){return json({error:e instanceof SyntaxError?'Invalid JSON request':'Request failed. Please retry.'},e instanceof SyntaxError?400:500)}}};
