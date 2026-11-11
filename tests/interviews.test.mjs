import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
function bucket(){const data=new Map();return {async get(k){const v=data.get(k);return v?{etag:v.etag,json:async()=>JSON.parse(v.value)}:null},async put(k,value,o={}){const current=data.get(k);if(o.onlyIf?.etagMatches&&current?.etag!==o.onlyIf.etagMatches)return null;const v={value,etag:crypto.randomUUID()};data.set(k,v);return v}}}
const origin='https://test.example';
function req(path,method='GET',value,token){return new Request(origin+path,{method,headers:{origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})})}
async function call(env,path,method,value,token){const r=await worker.fetch(req(path,method,value,token),env);return {status:r.status,body:await r.json()}}
test('Two participants share code and chat with role checks, conflicts and expiry',async()=>{
 const env={BUCKET:bucket()};const created=await call(env,'/api/interviews','POST',{company:'Test company',prompt:'Sum three values',language:'Python',durationMinutes:30,code:'# start'});assert.equal(created.status,201);
 const {session,companyToken,candidateToken}=created.body,p='/api/interviews/'+session.id;
 assert.equal((await call(env,p)).status,401);
 const joined=await call(env,p,'GET',null,candidateToken);assert.equal(joined.body.session.role,'candidate');assert.equal(joined.body.session.companyHash,undefined);assert.equal(joined.body.session.candidateHash,undefined);
 assert.equal((await call(env,p,'PATCH',{revision:0,code:'forbidden'},companyToken)).status,403);
 const edited=await call(env,p,'PATCH',{revision:0,code:'print(60)'},candidateToken);assert.equal(edited.status,200);
 const observed=await call(env,p,'GET',null,companyToken);assert.equal(observed.body.session.code,'print(60)');
 assert.equal((await call(env,p,'PATCH',{revision:0,message:'stale'},companyToken)).status,409);
 const chat=await call(env,p,'PATCH',{revision:1,message:'Explain the loop'},companyToken);assert.equal(chat.body.session.messages[0].role,'company');
 assert.equal((await call(env,p,'PATCH',{revision:2,end:true},candidateToken)).status,403);
 const ended=await call(env,p,'PATCH',{revision:2,end:true},companyToken);assert.equal(ended.body.session.status,'ended');
 assert.equal((await call(env,p,'PATCH',{revision:3,code:'print(1)'},candidateToken)).status,409);
 assert.equal((await call(env,p,'GET',null,'a'.repeat(48))).status,404);
 const raw=await env.BUCKET.get('interviews/'+session.id+'.json'),expired=await raw.json();expired.expiresAt=0;await env.BUCKET.put('interviews/'+session.id+'.json',JSON.stringify(expired));assert.equal((await call(env,p,'GET',null,candidateToken)).status,404);
});
test('Cross-origin mutations are rejected',async()=>{const request=new Request(origin+'/api/interviews',{method:'POST',headers:{origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'});assert.equal((await worker.fetch(request,{BUCKET:bucket()})).status,403)});
test('Compiler uses only fixed languages and bounded input',async()=>{const result=await call({},'/api/run','POST',{language:'Shell',code:'ls'});assert.equal(result.status,400)});
test('Conflicting updates never overwrite a newer revision',async()=>{const env={BUCKET:bucket()};const c=await call(env,'/api/interviews','POST',{company:'Concurrency test',prompt:'Test',language:'JavaScript'});const p='/api/interviews/'+c.body.session.id;const first=await call(env,p,'PATCH',{revision:0,code:'console.log(1)'},c.body.candidateToken);assert.equal(first.status,200);const stale=await call(env,p,'PATCH',{revision:0,code:'console.log(0)'},c.body.candidateToken);assert.equal(stale.status,409);assert.equal((await call(env,p,'GET',null,c.body.companyToken)).body.session.code,'console.log(1)')});
