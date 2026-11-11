import {readdir,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
const files={};
async function walk(dir,prefix=''){for(const ent of await readdir(dir,{withFileTypes:true})){const rel=prefix+ent.name;if(ent.isDirectory())await walk(path.join(dir,ent.name),rel+'/');else files['/'+rel]=await readFile(path.join(dir,ent.name),'utf8')}}
await walk('public');
const source=await readFile('worker/index.js','utf8');
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(files)+';\n'+source.replace('const ASSETS = {};','').replace('export async function handle','async function handle'));
let manifest;try{manifest=await readFile('.openai/hosting.json')}catch{manifest=JSON.stringify({d1:null,r2:'BUCKET'})}await writeFile('dist/.openai/hosting.json',manifest);
console.log('Built Worker with '+Object.keys(files).length+' assets');
