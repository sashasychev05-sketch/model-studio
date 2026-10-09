import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function desktopStage({version}={}){
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 if(version){if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid test build version');pkg.version=version;}
 const stage=path.join(root,'work','desktop-stage-'+crypto.randomUUID());
 await fs.mkdir(stage,{recursive:true});
 for(const directory of ['desktop','web','lib','gallery'])await fs.cp(path.join(root,directory),path.join(stage,directory),{recursive:true});
 await fs.copyFile(path.join(root,'server.mjs'),path.join(stage,'server.mjs'));
 await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:pkg.name,productName:'Модельная',version:pkg.version,type:'module',main:'desktop/main.mjs',description:pkg.description,author:'Model Studio contributors',repository:pkg.repository}));
 const bundle=await build({stdin:{contents:"module.exports = require('electron-updater');",resolveDir:root,sourcefile:'updater-entry.cjs'},bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron'],metafile:true,outfile:path.join(stage,'desktop','updater-runtime.cjs')});
 const seen=new Set(),licenses=[];
 for(const input of Object.keys(bundle.metafile.inputs)){
  if(!input.includes('node_modules'))continue;
  let directory=path.dirname(path.resolve(root,input));
  while(directory!==path.dirname(directory)){
   try{
    const dependency=JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8'));
    const key=dependency.name+'@'+dependency.version;
    if(!seen.has(key)){
     seen.add(key);let license='';
     for(const file of await fs.readdir(directory))if(/^(licen[cs]e|copying|notice)(\.|$)/i.test(file))license+='\n'+await fs.readFile(path.join(directory,file),'utf8');
     licenses.push(key+' — '+dependency.license+'\n'+license);
    }
    break;
   }catch(error){if(error.code!=='ENOENT')throw error;directory=path.dirname(directory);}
  }
 }
 await fs.writeFile(path.join(stage,'desktop','UPDATE-LICENSES.txt'),licenses.join('\n\n----------------\n\n'));
 return {stage,pkg};
}
