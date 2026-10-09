import {test,expect,_electron as electron} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseCSV,defaultConfig} from '../../lib/compute/statistics.js';
const root=path.resolve('.');
const launch=profile=>electron.launch({...(process.env.MODEL_STUDIO_TEST_EXE?{executablePath:process.env.MODEL_STUDIO_TEST_EXE,args:[]}:{args:['.']}),cwd:root,env:{...process.env,MODEL_STUDIO_PROFILE_DIR:profile,MODEL_STUDIO_DISABLE_UPDATE_CHECK:'1'},timeout:60000});

test('Desktop settings and fullscreen persist safely; native folder migration preserves source and analysis',async({},testInfo)=>{
 const profile=path.resolve('work','desktop-settings-'+crypto.randomUUID()),source=path.resolve('work','desktop-legacy-'+crypto.randomUUID());
 let desktop=await launch(profile);
 try{
  let page=await desktop.firstWindow();await expect(page.locator('.model-card')).toHaveCount(20);
  await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();await expect(page.getByLabel('Проверять обновления при запуске')).toBeEnabled();await page.getByLabel('Проверять обновления при запуске').uncheck();
  await expect.poll(()=>page.evaluate(()=>window.modelStudio.desktopPreferences())).toEqual({checkUpdates:false});
  expect(await page.evaluate(()=>window.modelStudio.setDesktopPreferences({port:1}).then(()=>false,()=>true))).toBe(true);
  await page.getByRole('button',{name:'На весь экран',exact:true}).click();await expect.poll(()=>desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(true);
  await expect(page.locator('#settings-fullscreen')).toHaveText('Выйти из полноэкранного режима');await page.keyboard.press('Escape');await expect.poll(()=>desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  await page.getByLabel('Тема приложения').selectOption('black');await page.locator('[data-close-dialog]').click();
  await page.keyboard.press('F11');await expect.poll(()=>page.evaluate(()=>window.modelStudio.fullscreenState())).toBe(true);await page.keyboard.press('F11');await expect.poll(()=>page.evaluate(()=>window.modelStudio.fullscreenState())).toBe(false);
  await desktop.close();desktop=await launch(profile);page=await desktop.firstWindow();await expect(page.locator('.model-card')).toHaveCount(20);
  await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();await expect(page.getByLabel('Проверять обновления при запуске')).not.toBeChecked();await expect(page.getByLabel('Тема приложения')).toHaveValue('black');
  const library=await page.evaluate(async()=>(await fetch('/api/library')).json()),record={...library.models.find(m=>m.spec.kind!=='html'),id:'old_model',revision:2};
  record.spec={...record.spec,title:'Перенесённый desktop-опыт'};
  await fs.mkdir(path.join(source,'models'),{recursive:true});await fs.mkdir(path.join(source,'versions','old_model'),{recursive:true});
  await fs.writeFile(path.join(source,'catalog.json'),JSON.stringify({version:1,folders:library.folders}));const bytes=JSON.stringify(record);await fs.writeFile(path.join(source,'models','old_model.json'),bytes);await fs.writeFile(path.join(source,'versions','old_model','1.json'),JSON.stringify({...record,revision:1}));
  const dataset=await parseCSV({text:'t;x\n0;0\n1;2\n2;8'}),analysis={schemaVersion:1,datasets:[dataset],config:defaultConfig(dataset)};
  await fs.writeFile(path.join(source,'analysis.json'),JSON.stringify({revision:1,updatedAt:new Date().toISOString(),analysis}));
  await desktop.evaluate(({dialog},selected)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[selected]});},source);
  await page.getByRole('button',{name:'Перенести старую библиотеку',exact:true}).click();await page.getByRole('button',{name:'Выбрать папку старой библиотеки',exact:true}).click();await expect(page.getByRole('heading',{name:'Предпросмотр переноса',exact:true})).toBeVisible();
  await page.getByLabel('Заменить текущую библиотеку выбранной старой библиотекой').check();await page.getByRole('button',{name:'Перенести',exact:true}).click();await expect(page.getByRole('heading',{name:'Перенос завершён',exact:true})).toBeVisible();await page.locator('[data-close-dialog]').click();await expect(page.locator('.model-card')).toHaveCount(1);
  expect(await fs.readFile(path.join(source,'models','old_model.json'),'utf8')).toBe(bytes);
  await page.getByRole('button',{name:'Анализ данных',exact:true}).click();await expect(page.locator('#analysis-plot svg')).toBeVisible();await expect(page.locator('.data-status')).not.toContainText('несохранённые');
  await page.screenshot({path:testInfo.outputPath('settings-migration.png'),fullPage:true});
  const prefs=JSON.parse(await fs.readFile(path.join(profile,'desktop.json'),'utf8'));expect(prefs.checkUpdates).toBe(false);expect(prefs.port).toBeGreaterThan(1023);
  const opening=desktop.waitForEvent('window');await page.evaluate(()=>window.open('/guide.html','_blank'));const guide=await opening;await guide.waitForLoadState('domcontentloaded');
  expect(await guide.evaluate(()=>Promise.all([window.modelStudio.chooseLegacyLibrary(),window.modelStudio.toggleFullscreen(),window.modelStudio.setDesktopPreferences({checkUpdates:true})].map(p=>p.then(()=>false,()=>true))))).toEqual([true,true,true]);await guide.close();
 }finally{await desktop.close();}
});
