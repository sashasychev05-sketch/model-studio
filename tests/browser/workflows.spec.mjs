import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

test('Catalog, native and HTML experiments retain controls across themes and fit a narrow screen',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await expect(page.locator('.model-card')).toHaveCount(20);
 await page.locator('[data-open="gallery_pendulum"]').first().click();await expect(page.locator('#scene svg')).toBeVisible();
 await page.locator('[data-a="step"]').click();await expect(page.locator('#stage-time')).not.toHaveText('t = 0 с');
 await page.locator('[data-a="back"]').click();
 await page.locator('[data-open="gallery_circle"]').first().click();
 const frame=page.frameLocator('#html-frame'),slider=frame.locator('input[type="range"]').first();
 await expect(slider).toBeVisible();const value=await slider.inputValue();
 const theme=page.locator('select[aria-label="Тема приложения"]');
 await theme.selectOption('black');
 await expect(slider).toHaveValue(value);
 await page.locator('[data-a="back"]').click();await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});

test('Standalone CSV and settings persist after reload and survive an optimistic conflict',async({page,context})=>{
 await page.goto('/?analysis=1');await expect(page.getByRole('button',{name:'Открыть пример',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Открыть пример',exact:true}).click();
 await page.getByRole('button',{name:'Рассчитать статистику и график',exact:true}).click();await expect(page.locator('#analysis-plot svg')).toBeVisible();
 await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
 await page.reload();await expect(page.getByRole('heading',{name:'Выброс: среднее и медиана',exact:true})).toBeVisible();
 const other=await context.newPage();await other.goto('/?analysis=1');await expect(other.getByRole('heading',{name:'Выброс: среднее и медиана',exact:true})).toBeVisible();
 await page.getByLabel('Учебный опыт', {exact:true}).selectOption('correlation');await page.getByRole('button',{name:'Открыть пример',exact:true}).click();
 await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
 await other.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(other.getByRole('alert')).toContainText('другом окне');
 await other.getByRole('button',{name:'Открыть сохранённую версию',exact:true}).click();await expect(other.getByRole('heading',{name:'Корреляция: закономерность и совпадение',exact:true})).toBeVisible();
 await other.close();await page.reload();await expect(page.getByRole('heading',{name:'Корреляция: закономерность и совпадение',exact:true})).toBeVisible();
});

test('Backup restores a changed library through preview and explicit confirmation',async({page},testInfo)=>{
 await page.goto('/');await page.getByRole('button',{name:'Резервная копия',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать резервную копию',exact:true}).click();
 const file=testInfo.outputPath('library.json');await (await download).saveAs(file);
 const backup=JSON.parse(await fs.readFile(file,'utf8'));expect(backup.library.models.length).toBe(20);expect(backup.workspace.analysis.datasets[0].rows.length).toBeGreaterThan(0);
 await page.locator('[data-close-dialog]').click();
 const created=await page.request.post('/api/library',{data:{action:'save',spec:{...backup.library.models[0].spec,title:'Проверка восстановления'}}});expect(created.ok()).toBe(true);
 await page.reload();await expect(page.locator('.model-card')).toHaveCount(21);
 await page.getByRole('button',{name:'Резервная копия',exact:true}).click();await page.locator('#backup-file').setInputFiles(file);
 await expect(page.getByRole('heading',{name:'Восстановить библиотеку?',exact:true})).toBeVisible();
 await page.getByLabel('Заменить сохранённую библиотеку выбранной копией').check();await page.getByRole('button',{name:'Восстановить',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Библиотека восстановлена',exact:true})).toBeVisible();await page.locator('[data-close-dialog]').click();await expect(page.locator('.model-card')).toHaveCount(20);
});

for(const [id,native]of [['gallery_pendulum',true],['gallery_circle',false]]){
 test('Exported '+(native?'native':'HTML')+' experiment opens as an offline file',async({page,context},testInfo)=>{
  await page.goto('/');await page.locator('[data-open="'+id+'"]').first().click();
  await page.getByRole('button',{name:'Экспорт',exact:true}).click();
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Готовая демонстрация · HTML',exact:true}).click();
  const file=testInfo.outputPath('experiment.html');await (await downloading).saveAs(file);
  const html=await fs.readFile(file,'utf8');expect(html).not.toMatch(/<script[^>]+src=/);
  const offline=await context.newPage(),network=[],errors=[];offline.on('request',req=>{if(/^https?:/.test(req.url()))network.push(req.url());});offline.on('pageerror',e=>errors.push(e.message));
  await offline.goto(pathToFileURL(path.resolve(file)).href);
  if(native){await expect(offline.locator('#scene svg')).toBeVisible();await offline.locator('#step').click();await expect(offline.locator('#time')).not.toHaveText('t = 0 с');}
  else{await expect(offline.locator('input[type="range"]').first()).toBeVisible();await expect(offline.locator('svg#scene')).toBeVisible();}
  expect(network).toEqual([]);expect(errors).toEqual([]);await offline.close();
 });
}

test('CSV preview, column metadata and chart settings persist through a restart',async({page})=>{
 await page.goto('/?analysis=1');await expect(page.getByRole('button',{name:'Открыть пример',exact:true})).toBeVisible();
 await page.locator('#analysis-file').setInputFiles({name:'измерения.csv',mimeType:'text/csv',buffer:Buffer.from('Время,Координата\n0,0\n1,2\n2,8\n3,18')});
 await page.getByRole('button',{name:'Разобрать и показать предпросмотр',exact:true}).click();await expect(page.getByRole('heading',{name:'Предпросмотр: измерения.csv',exact:true})).toBeVisible();
 const preview=page.locator('.data-card').filter({has:page.getByRole('heading',{name:'Предпросмотр: измерения.csv',exact:true})});
 await preview.getByLabel('Единица колонки 1', {exact:true}).fill('s');await preview.getByLabel('Единица колонки 2',{exact:true}).fill('m');
 await page.getByRole('button',{name:'Использовать таблицу',exact:true}).click();await expect(page.locator('.data-status')).toContainText('несохранённые');
 await page.getByLabel('Тип графика',{exact:true}).selectOption('histogram');
 await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
 await page.reload();await expect(page.getByRole('heading',{name:'измерения.csv',exact:true})).toBeVisible();await expect(page.getByLabel('Тип графика',{exact:true})).toHaveValue('histogram');
 await page.getByText('Таблица и колонки · 4 строк',{exact:true}).click();await expect(page.getByLabel('Единица колонки 2',{exact:true})).toHaveValue('m');
 await page.getByRole('button',{name:'Рассчитать статистику и график',exact:true}).click();await expect(page.locator('#analysis-plot svg')).toBeVisible();
 await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
});

test('Copying and editing a native model preserves the original and saves the changed title',async({page})=>{
 await page.goto('/');await page.locator('[data-open="gallery_newton"]').first().click();
 await page.getByRole('button',{name:'Экспорт',exact:true}).click();await page.getByRole('button',{name:'Сохранить копию в каталоге',exact:true}).click();
 await expect(page.getByRole('button',{name:'Сохранить',exact:true})).toBeVisible();
 await page.locator('[data-tab="settings"]').click();await page.locator('[data-field="title"]').fill('Мой проверенный опыт');
 await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('#save-state')).toHaveText('Сохранено в каталоге');
 await page.locator('[data-a="back"]').click();await page.reload();await expect(page.getByRole('button',{name:'Мой проверенный опыт',exact:true})).toBeVisible();
 const library=await (await page.request.get('/api/library')).json();expect(library.models.find(m=>m.id==='gallery_newton').spec.title).not.toBe('Мой проверенный опыт');
});
