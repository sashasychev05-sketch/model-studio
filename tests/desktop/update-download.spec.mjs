import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
test('Real NSIS updater verifies a download, rejects a damaged file and never installs without consent',async()=>{
 test.skip(!process.env.MODEL_STUDIO_UPDATE_ASSET,'Build an installer first and set MODEL_STUDIO_UPDATE_ASSET');
 const profile=path.resolve('work','download-test-'+crypto.randomUUID());await fs.mkdir(profile,{recursive:true});
 const currentVersion=JSON.parse(await fs.readFile('package.json','utf8')).version;
 const parts=currentVersion.split('.').map(Number);parts[2]++;const nextVersion=parts.join('.');
 const bytes=await fs.readFile(process.env.MODEL_STUDIO_UPDATE_ASSET),sha512=createHash('sha512').update(bytes).digest('base64');
 let corrupt=false,downloads=0;
 const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/latest.yml')){res.end(`version: ${nextVersion}\nfiles:\n  - url: ModelStudio-Setup-${nextVersion}-x64.exe\n    sha512: ${sha512}\n    size: ${bytes.length}\npath: ModelStudio-Setup-${nextVersion}-x64.exe\nsha512: ${sha512}\n`);return;}
  downloads++;res.writeHead(200,{'content-type':'application/octet-stream','content-length':corrupt?5:bytes.length});res.end(corrupt?Buffer.from('wrong'):bytes);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const desktop=await electron.launch({...(process.env.MODEL_STUDIO_TEST_EXE?{executablePath:process.env.MODEL_STUDIO_TEST_EXE,args:[]}:{args:['.']}),env:{...process.env,MODEL_STUDIO_PROFILE_DIR:profile,MODEL_STUDIO_DISABLE_UPDATE_CHECK:'1'}});
 try{
  const page=await desktop.firstWindow();await expect(page.locator('.model-card')).toHaveCount(20);
  const run=async suffix=>desktop.evaluate(async({app},{profile,url,suffix})=>{
   const {createRequire}=process.getBuiltinModule('node:module'),path=process.getBuiltinModule('node:path'),fs=process.getBuiltinModule('node:fs/promises');
   const require=createRequire(path.join(app.getAppPath(),'package.json'));
   const {NsisUpdater}=app.isPackaged?require('./desktop/updater-runtime.cjs'):require('electron-updater');
   const {createUpdateController}=require('./desktop/updates.mjs');
   const folder=path.join(profile,suffix);await fs.mkdir(folder,{recursive:true});
   const config=path.join(folder,'app-update.yml');await fs.writeFile(config,'provider: generic\nurl: '+url+'\nupdaterCacheDirName: test-updater\n');
   const updater=new NsisUpdater({provider:'generic',url});
   // Keep the real Electron network executor but route all cache/config into work/.
   updater.app={version:app.getVersion(),name:'test-update',isPackaged:true,userDataPath:folder,baseCachePath:folder,appUpdateConfigPath:config,whenReady:()=>app.whenReady(),onQuit:()=>{}};
   updater.updateConfigPath=config;updater.disableDifferentialDownload=true;updater.logger=null;
   let installed=0;const answers=[1,0];
   const controller=createUpdateController({version:app.getVersion(),supported:true,getUpdater:async()=>updater,ask:async()=>answers.shift()??0,notify:()=>{},progress:()=>{},closeForInstall:async()=>true,install:()=>installed++});
   await controller.check();return {state:controller.get(),installed,autoInstallOnAppQuit:updater.autoInstallOnAppQuit};
  },{profile,url:'http://127.0.0.1:'+server.address().port,suffix});
  const valid=await run('valid');expect(valid.state.state).toBe('ready');expect(valid.installed).toBe(0);expect(valid.autoInstallOnAppQuit).toBe(false);
  corrupt=true;const damaged=await run('damaged');expect(damaged.state.state).toBe('error');expect(damaged.installed).toBe(0);expect(downloads).toBe(2);
 }finally{await desktop.close();await new Promise(resolve=>server.close(resolve));}
});
