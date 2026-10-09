import {test,expect,_electron as electron} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
function execute(file,args,env){return new Promise((resolve,reject)=>{const child=spawn(file,args,{env,windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Installer exit code '+code)));});}
async function waitRemoved(file){await expect.poll(async()=>{try{await fs.access(file);return false;}catch(error){if(error.code==='ENOENT')return true;throw error;}},{timeout:30000}).toBe(true);}
test('NSIS installs, upgrades and uninstalls while keeping the saved library',async()=>{
 test.skip(process.env.MODEL_STUDIO_INSTALLER_TEST!=='1','Installer registration is tested on disposable CI Windows runners only');
 test.setTimeout(240000);
 const work=path.resolve('work'),install=path.join(work,'nsis-install-'+crypto.randomUUID()),profile=path.join(work,'nsis-profile-'+crypto.randomUUID());
 if(!install.startsWith(work+path.sep)||!profile.startsWith(work+path.sep))throw new Error('Test path outside work');
 const env={...process.env,MODEL_STUDIO_PROFILE_DIR:profile,MODEL_STUDIO_DISABLE_UPDATE_CHECK:'1'};
 const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
 const older=path.resolve('dist/installer-fixture/ModelStudio-Setup-2.3.0-x64.exe'),current=path.resolve(`dist/installer/ModelStudio-Setup-${version}-x64.exe`);
 const exe=path.join(install,'ModelStudio.exe'),uninstaller=path.join(install,'Uninstall ModelStudio.exe');
 let desktop,uninstalled=false;
 try{
  await execute(older,['/S','/CURRENTUSER','/D='+install],env);
  desktop=await electron.launch({executablePath:exe,args:[],env});let page=await desktop.firstWindow();
  await expect(page.locator('.model-card')).toHaveCount(20);expect(await desktop.evaluate(({app})=>app.getVersion())).toBe('2.3.0');
  expect((await page.evaluate(()=>window.modelStudio.updateStatus())).supported).toBe(true);
  await page.getByRole('button',{name:'Анализ данных',exact:true}).click();await page.getByRole('button',{name:'Открыть пример',exact:true}).click();
  await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
  const analysis=await fs.readFile(path.join(profile,'library/analysis.json'),'utf8');
  await desktop.close();desktop=null;
  await execute(current,['/S','/CURRENTUSER','/D='+install],env);
  desktop=await electron.launch({executablePath:exe,args:[],env});page=await desktop.firstWindow();
  await expect(page.locator('.model-card')).toHaveCount(20);expect(await desktop.evaluate(({app})=>app.getVersion())).toBe(version);
  await page.getByRole('button',{name:'Анализ данных',exact:true}).click();await expect(page.getByRole('heading',{name:'Выброс: среднее и медиана',exact:true})).toBeVisible();
  expect(await fs.readFile(path.join(profile,'library/analysis.json'),'utf8')).toBe(analysis);
  await desktop.close();desktop=null;
  await execute(uninstaller,['/S'],env);
  // NSIS relocates the uninstaller into TEMP and the launching process can exit
  // before its child finishes. Never start another app while that child kills apps.
  await waitRemoved(exe);await waitRemoved(uninstaller);uninstalled=true;
  expect(await fs.readFile(path.join(profile,'library/analysis.json'),'utf8')).toBe(analysis);
 }finally{await desktop?.close();if(!uninstalled){try{await fs.access(uninstaller);await execute(uninstaller,['/S'],env);await waitRemoved(exe);await waitRemoved(uninstaller);}catch{}}}
});
