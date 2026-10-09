import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.');
function launch(profile){return electron.launch({...(process.env.MODEL_STUDIO_TEST_EXE?{executablePath:process.env.MODEL_STUDIO_TEST_EXE,args:[]}:{args:['.']}),cwd:root,env:{...process.env,MODEL_STUDIO_PROFILE_DIR:profile,MODEL_STUDIO_DISABLE_UPDATE_CHECK:'1'},timeout:60000});}

test('Desktop window is isolated, exports HTML and keeps saved analysis through a restart',async({},testInfo)=>{
 const profile=path.resolve('work','desktop-test-'+crypto.randomUUID());
 let desktop=await launch(profile);
 try{
  let page=await desktop.firstWindow();await expect(page.locator('.model-card')).toHaveCount(20);
  const prefs=await desktop.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {nodeIntegration:p.nodeIntegration,contextIsolation:p.contextIsolation,sandbox:p.sandbox};});
  expect(prefs).toEqual({nodeIntegration:false,contextIsolation:true,sandbox:true});expect(await page.evaluate(()=>typeof process)).toBe('undefined');
  await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();
  await expect(page.getByRole('button',{name:'Проверить обновления',exact:true})).toBeVisible();
  // Stub native dialogs, not the updater or IPC; source/ZIP mode never contacts a feed.
  await desktop.evaluate(({dialog})=>{globalThis.updateDialogMessages=[];dialog.showMessageBox=async(...args)=>{globalThis.updateDialogMessages.push(args.at(-1).message);return {response:0};};});
  if(!(await page.evaluate(()=>window.modelStudio.updateStatus())).supported){
   await page.getByRole('button',{name:'Проверить обновления',exact:true}).click();
   await expect.poll(()=>desktop.evaluate(()=>globalThis.updateDialogMessages.length)).toBe(1);
   expect(await desktop.evaluate(()=>globalThis.updateDialogMessages[0])).toContain('установленной Windows-версии');
  }
  await page.locator('[data-close-dialog]').click();
  await page.getByRole('button',{name:'Анализ данных',exact:true}).click();await page.getByRole('button',{name:'Открыть пример',exact:true}).click();
  expect((await page.evaluate(()=>window.modelStudio.updateStatus())).currentVersion).toBe(await desktop.evaluate(({app})=>app.getVersion()));
  expect(await page.evaluate(()=>window.dispatchEvent(new Event('beforeunload',{cancelable:true})))).toBe(false);
  await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
  expect(await page.evaluate(()=>window.dispatchEvent(new Event('beforeunload',{cancelable:true})))).toBe(true);
  await page.screenshot({path:testInfo.outputPath('desktop-analysis.png'),fullPage:true});
  await desktop.close();desktop=await launch(profile);page=await desktop.firstWindow();await expect(page.locator('.model-card')).toHaveCount(20);
  await page.getByRole('button',{name:'Анализ данных',exact:true}).click();await expect(page.getByRole('heading',{name:'Выброс: среднее и медиана',exact:true})).toBeVisible();
  await page.locator('[data-a="back"]').click();await page.locator('[data-open="gallery_circle"]').first().click();
  const frame=page.frameLocator('#html-frame');await expect(frame.locator('input[type="range"]').first()).toBeVisible();
  expect((await page.evaluate(()=>window.modelStudio.updateStatus())).currentVersion).toBe(await desktop.evaluate(({app})=>app.getVersion()));
  expect(await frame.locator('body').evaluate(()=>typeof window.modelStudio)).toBe('undefined');
  const output=testInfo.outputPath('desktop-export.html');
  await desktop.evaluate(({BrowserWindow},file)=>{BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_event,item)=>item.setSavePath(file));},output);
  await page.getByRole('button',{name:'Экспорт',exact:true}).click();await page.getByRole('button',{name:'Готовая демонстрация · HTML',exact:true}).click();
  await expect.poll(async()=>{try{return (await fs.readFile(output,'utf8')).includes('<html');}catch{return false;}}).toBe(true);
  expect(await fs.readFile(output,'utf8')).not.toMatch(/<script[^>]+src=/);
  expect((await fs.readdir(path.join(profile,'library')))).toContain('analysis.json');
 }finally{await desktop.close();}
});
