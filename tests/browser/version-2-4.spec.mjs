import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

test('Settings persist panels and quick start without changing a running HTML experiment',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/');
 await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();
 await page.getByLabel('Показывать быстрый старт в каталоге').uncheck();
 await page.getByLabel('Каталог',{exact:true}).uncheck();
 await page.getByLabel('Ширина: свойства модели',{exact:true}).fill('360');await page.getByLabel('Ширина: свойства модели',{exact:true}).press('Tab');
 await page.getByLabel('Тема приложения',{exact:true}).selectOption('black');await page.locator('[data-close-dialog]').click();
 await expect(page.locator('.public-intro')).toHaveCount(0);await expect(page.locator('.workspace')).toHaveClass(/catalog-hidden/);
 await page.reload();await expect(page.locator('.workspace')).toHaveClass(/catalog-hidden/);
 await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();await expect(page.getByLabel('Тема приложения')).toHaveValue('black');
 await page.getByRole('button',{name:'Вернуть исходные панели',exact:true}).click();await page.getByLabel('Показывать быстрый старт в каталоге').check();await page.locator('[data-close-dialog]').click();
 await page.locator('[data-open="gallery_circle"]').first().click();const slider=page.frameLocator('#html-frame').locator('input[type=range]').first();const before=await slider.inputValue();
 await slider.fill(before==='45'?'60':'45');await slider.dispatchEvent('input');const changed=await slider.inputValue();
 await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();await page.getByLabel('Тема приложения').selectOption('light');await page.locator('[data-close-dialog]').click();
 await expect(slider).toHaveValue(changed);expect(changed).not.toBe(before);
 await page.getByRole('button',{name:'Полноэкранный режим',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await page.getByRole('button',{name:'Выйти из полноэкранного режима',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 expect(errors).toEqual([]);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('Russian JSON tables preview units and restore saved charts automatically',async({page})=>{
 await page.goto('/?analysis=1');
 await page.locator('#analysis-file').setInputFiles({name:'измерения.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{'Время':0,'Координата':0},{'Время':1,'Координата':2},{'Время':2,'Координата':8},{'Время':3,'Координата':null}]))});
 await page.getByRole('button',{name:'Разобрать и показать предпросмотр',exact:true}).click();await expect(page.getByRole('heading',{name:'Предпросмотр: измерения.json',exact:true})).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Подсказки по таблице'})).toContainText('Пустые ячейки');
 const preview=page.locator('.data-card').filter({has:page.getByRole('heading',{name:'Предпросмотр: измерения.json',exact:true})});
 await preview.getByLabel('Единица колонки 1',{exact:true}).fill('s');await preview.getByLabel('Единица колонки 2',{exact:true}).fill('m');
 await page.getByRole('button',{name:'Использовать таблицу',exact:true}).click();await page.getByRole('button',{name:'Сохранить анализ',exact:true}).click();
 await page.reload();await expect(page.locator('#analysis-plot svg')).toBeVisible();await expect(page.locator('.data-status')).toContainText('Сохранено на этом компьютере');
 await expect(page.locator('.data-status')).not.toContainText('несохранённые');
});

for(const id of ['gallery_pendulum','gallery_circle'])test('Student HTML '+id+' includes instructions and works offline with isolation',async({page,context},testInfo)=>{
 await page.goto('/?model='+id);await page.getByRole('button',{name:'Экспорт',exact:true}).click();await page.getByRole('button',{name:'Подготовить опыт для ученика',exact:true}).click();
 await page.getByLabel('Инструкция для ученика',{exact:true}).fill('Проверьте два значения. <script>window.bad=true</script>');
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать HTML для ученика',exact:true}).click();
 const output=testInfo.outputPath('student.html');await (await downloading).saveAs(output);
 const offline=await context.newPage(),requests=[],errors=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});offline.on('pageerror',e=>errors.push(e.message));
 await offline.goto(pathToFileURL(output).href);await expect(offline.locator('details')).toContainText('Проверьте два значения. <script>');
 expect(await offline.evaluate(()=>window.bad)).toBeUndefined();await expect(offline.locator('iframe')).toHaveAttribute('sandbox','allow-scripts');
 const frame=offline.frameLocator('iframe');if(id==='gallery_pendulum'){await expect(frame.locator('#scene svg')).toBeVisible();await frame.locator('#step').click();await expect(frame.locator('#time')).not.toHaveText('t = 0 с');}else await expect(frame.locator('input[type=range]').first()).toBeVisible();
 expect(requests).toEqual([]);expect(errors).toEqual([]);await offline.close();
});

test('Migration previews a directory, preserves the source and refuses malformed JSON',async({page})=>{
 await page.goto('/');const backup=await (await page.request.get('/api/backup')).json();
 const root=path.resolve('work','browser-legacy-'+crypto.randomUUID());await fs.mkdir(path.join(root,'models'),{recursive:true});await fs.mkdir(path.join(root,'versions','old_experiment'),{recursive:true});
 const record={...backup.library.models.find(m=>m.spec.kind!=='html'),id:'old_experiment',revision:2,spec:{...backup.library.models.find(m=>m.spec.kind!=='html').spec,title:'Мой старый опыт'}};
 await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify({version:1,folders:backup.library.folders}));const source=JSON.stringify(record);await fs.writeFile(path.join(root,'models','old_experiment.json'),source);
 await fs.writeFile(path.join(root,'versions','old_experiment','1.json'),JSON.stringify({...record,revision:1}));await fs.writeFile(path.join(root,'analysis.json'),JSON.stringify(backup.workspace));
 await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();await page.getByRole('button',{name:'Перенести старую библиотеку',exact:true}).click();
 await page.locator('#legacy-files').setInputFiles(root);await expect(page.getByRole('heading',{name:'Предпросмотр переноса',exact:true})).toBeVisible();await expect(page.locator('.dialog-content')).toContainText('1 моделей');
 await page.getByLabel('Заменить текущую библиотеку выбранной старой библиотекой').check();await page.getByRole('button',{name:'Перенести',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Перенос завершён',exact:true})).toBeVisible();await page.locator('[data-close-dialog]').click();await expect(page.locator('.model-card')).toHaveCount(1);
 expect(await fs.readFile(path.join(root,'models','old_experiment.json'),'utf8')).toBe(source);
 const after=await (await page.request.get('/api/backup')).json();expect(after.histories[0].records[0].revision).toBe(1);expect(after.workspace.analysis).toEqual(backup.workspace.analysis);
 await fs.writeFile(path.join(root,'models','old_experiment.json'),'{broken');await page.getByRole('button',{name:'Настройки приложения',exact:true}).click();await page.getByRole('button',{name:'Перенести старую библиотеку',exact:true}).click();await page.locator('#legacy-files').setInputFiles(root);await expect(page.locator('#legacy-status')).toContainText('Не удалось прочитать JSON');
 expect((await (await page.request.get('/api/library')).json()).models).toHaveLength(1);
 const preview=await (await page.request.post('/api/backup/preview',{data:backup})).json();expect((await page.request.post('/api/backup/restore',{data:{backup,expectedState:preview.expectedState}})).ok()).toBe(true);
});
