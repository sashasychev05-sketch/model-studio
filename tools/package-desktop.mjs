import {packager} from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const stage=path.join(root,'work','desktop-stage-'+crypto.randomUUID());
await fs.mkdir(stage,{recursive:true});
for(const directory of ['desktop','web','lib','gallery'])await fs.cp(path.join(root,directory),path.join(stage,directory),{recursive:true});
await fs.copyFile(path.join(root,'server.mjs'),path.join(stage,'server.mjs'));
await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:pkg.name,productName:'Модельная',version:pkg.version,type:'module',main:'desktop/main.mjs',description:pkg.description}));
const platform=process.env.MODEL_STUDIO_PACKAGE_PLATFORM??process.platform;
const output=await packager({dir:stage,out:path.join(root,'dist'),name:'ModelStudio',platform,arch:process.env.MODEL_STUDIO_PACKAGE_ARCH??process.arch,electronVersion:pkg.devDependencies.electron,asar:true,prune:false,overwrite:true,icon:path.join(root,'desktop','icon.ico'),appVersion:pkg.version,appCopyright:'Модельная',win32metadata:{CompanyName:'Модельная',ProductName:'Модельная',FileDescription:'Модельная — физика и математика',InternalName:'ModelStudio'}});
for(const directory of output){
 await fs.copyFile(path.join(root,'docs','DESKTOP.md'),path.join(directory,'КАК-ЗАПУСТИТЬ.md'));
 console.log(directory);
}
