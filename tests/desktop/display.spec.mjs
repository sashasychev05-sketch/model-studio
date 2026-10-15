import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {emptyModel,newBody} from '../../lib/model.js';

test('Desktop display settings and dynamic labels save, reload and export with the bundled runtime',async({},testInfo)=>{
 const desktop=await electron.launch({...(process.env.MODEL_STUDIO_TEST_EXE?{executablePath:process.env.MODEL_STUDIO_TEST_EXE,args:[]}:{args:['.']}),cwd:path.resolve('.'),env:{...process.env,MODEL_STUDIO_PROFILE_DIR:path.resolve('work','desktop-display-'+crypto.randomUUID()),MODEL_STUDIO_DISABLE_UPDATE_CHECK:'1'},timeout:60000});
 try{
  const page=await desktop.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await expect(page.locator('.model-card')).toHaveCount(20);
  const spec=emptyModel();spec.title='Подписи в приложении';spec.bodies=[{...newBody('ball'),motion:'force',vx:1,fx:'2'}];
  const {result}=await page.evaluate(async spec=>{const response=await fetch('/api/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',spec})});if(!response.ok)throw new Error(await response.text());return response.json();},spec);await page.goto(new URL('/?model='+result.id,page.url()).href);await page.getByRole('button',{name:'Редактор',exact:true}).click();
  await page.getByLabel('Динамическая подпись',{exact:true}).check();await page.getByLabel('Запретить перетаскивание',{exact:true}).check();await page.getByLabel('Показывать на сцене',{exact:true}).uncheck();await expect(page.locator('#scene [data-body="ball"]')).toHaveCount(0);await page.getByRole('button',{name:'Отменить',exact:true}).click();await expect(page.locator('#scene [data-dynamic-label="ball"]')).toHaveText('Скорость: 1,00 м/с');
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('#save-state')).toHaveText('Сохранено в каталоге');await page.reload();await page.getByRole('button',{name:'Редактор',exact:true}).click();await expect(page.getByLabel('Запретить перетаскивание',{exact:true})).toBeChecked();await page.locator('[data-a="step"]').click();await expect(page.locator('#scene [data-dynamic-label="ball"]')).toHaveText('Скорость: 1,02 м/с');
  const file=testInfo.outputPath('desktop-label.html');await desktop.evaluate(({BrowserWindow},file)=>{BrowserWindow.getAllWindows()[0].webContents.session.once('will-download',(_event,item)=>item.setSavePath(file));},file);
  await page.getByRole('button',{name:'Экспорт',exact:true}).click();await page.getByRole('button',{name:'Готовая демонстрация · HTML',exact:true}).click();await expect.poll(async()=>{try{return (await fs.readFile(file,'utf8')).includes('function bodyLabel');}catch{return false;}}).toBe(true);expect(errors).toEqual([]);
 }finally{await desktop.close();}
});
