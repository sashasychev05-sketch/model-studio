import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {load}=createRequire(require.resolve('electron-updater'))('js-yaml');
export async function releaseAssets(directory,version){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid release version');
 const name=`ModelStudio-Setup-${version}-x64.exe`;
 const manifestBytes=await fs.readFile(path.join(directory,'latest.yml'));
 const manifest=load(manifestBytes.toString('utf8'));
 if(manifest?.version!==version||manifest?.path!==name||manifest.files?.length!==1||manifest.files[0].url!==name)throw new Error('Update manifest does not match release');
 const installer=await fs.readFile(path.join(directory,name));
 const digest=createHash('sha512').update(installer).digest('base64');
 if(manifest.sha512!==digest||manifest.files[0].sha512!==digest||manifest.files[0].size!==installer.length)throw new Error('Installer checksum/size does not match update manifest');
 const blockmap=await fs.readFile(path.join(directory,name+'.blockmap'));
 if(!blockmap.length)throw new Error('Missing block map');
 return [{name,bytes:installer,type:'application/octet-stream'},{name:name+'.blockmap',bytes:blockmap,type:'application/octet-stream'},{name:'latest.yml',bytes:manifestBytes,type:'application/yaml'}];
}
