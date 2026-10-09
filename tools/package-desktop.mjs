import {packager} from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {desktopStage,root} from './desktop-stage.mjs';
const {stage,pkg}=await desktopStage();
const platform=process.env.MODEL_STUDIO_PACKAGE_PLATFORM??process.platform;
const output=await packager({dir:stage,out:path.join(root,'dist'),name:'ModelStudio',platform,arch:process.env.MODEL_STUDIO_PACKAGE_ARCH??process.arch,electronVersion:pkg.devDependencies.electron,asar:true,prune:false,overwrite:true,icon:path.join(root,'desktop','icon.ico'),appVersion:pkg.version,appCopyright:'Модельная',win32metadata:{CompanyName:'Модельная',ProductName:'Модельная',FileDescription:'Модельная — физика и математика',InternalName:'ModelStudio'}});
for(const directory of output){
 await fs.copyFile(path.join(root,'docs','DESKTOP.md'),path.join(directory,'КАК-ЗАПУСТИТЬ.md'));
 console.log(directory);
}
