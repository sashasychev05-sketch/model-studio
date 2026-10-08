import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,brotliCompressSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'web/vendor');
await fs.mkdir(path.join(out,'licenses'),{recursive:true});
for(const name of ['statistics','plot'])await build({entryPoints:[path.join(root,`tools/vendor-${name}.mjs`)],outfile:path.join(out,name+'.js'),bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'linked',charset:'utf8'});
const packages=[],seen=new Set();
async function collect(dir){let meta;try{meta=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));}catch{return;}if(seen.has(meta.name+'@'+meta.version))return;seen.add(meta.name+'@'+meta.version);const notices=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(!entry.isFile()||!/^(licen[sc]e|copying|notice)/i.test(entry.name))continue;const dest=meta.name.replace(/[^a-z0-9_-]/gi,'_')+'-'+meta.version+'-'+entry.name;await fs.copyFile(path.join(dir,entry.name),path.join(out,'licenses',dest));notices.push('licenses/'+dest);}packages.push({name:meta.name,version:meta.version,license:meta.license??'SEE NOTICES',notices});}
for(const entry of await fs.readdir(path.join(root,'node_modules/.pnpm'),{withFileTypes:true})){if(!entry.isDirectory()||entry.name==='node_modules')continue;const mods=path.join(root,'node_modules/.pnpm',entry.name,'node_modules');let names=[];try{names=await fs.readdir(mods);}catch{continue;}for(const name of names){if(name.startsWith('@')){for(const child of await fs.readdir(path.join(mods,name)))await collect(path.join(mods,name,child));}else await collect(path.join(mods,name));}}
const bundles=[];for(const name of ['statistics','plot']){const file=name+'.js',data=await fs.readFile(path.join(out,file));bundles.push({file,bytes:data.length,gzip:gzipSync(data).length,brotli:brotliCompressSync(data).length,sha256:createHash('sha256').update(data).digest('hex')});}
const manifest={format:1,createdAt:new Date().toISOString(),build:'esbuild 0.25.12 / es2022 / minified ESM',bundles,packages:packages.sort((a,b)=>a.name.localeCompare(b.name))};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const gzip=bundles.reduce((n,b)=>n+b.gzip,0);if(gzip>500*1024)throw Error('Science dependency budget exceeded');
console.log(JSON.stringify({bundles,gzipBudget:500*1024,packages:packages.length},null,2));
