import {test as base,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {emptyModel,newBody} from '../../lib/model.js';
import {defaultDynamicLabel} from '../../lib/display.js';


// Restore only the isolated test server's library, including when an assertion fails.
const test=base.extend({originalLibrary:[async({request},use)=>{
 const backup=await(await request.get('/api/backup')).json();
 try{await use(backup);}finally{const preview=await(await request.post('/api/backup/preview',{data:backup})).json();const restored=await request.post('/api/backup/restore',{data:{backup,expectedState:preview.expectedState}});expect(restored.ok()).toBe(true);}
},{auto:true}]});

async function create(page){
 const m=emptyModel();m.title='Подписи и видимость';m.bodies=[{...newBody('ball'),x:1,y:2,motion:'force',vx:1,fx:'2',trail:true,vector:true},{...newBody('caption','text'),x:4,y:5,name:'Время',dynamicLabel:{...defaultDynamicLabel({id:'caption'}),enabled:true,expression:'t',prefix:'t = ',unit:'с'}}];
 const response=await page.request.post('/api/library',{data:{action:'save',spec:m}});expect(response.ok()).toBe(true);const {result}=await response.json();await page.goto('/?model='+result.id);await page.getByRole('button',{name:'Редактор',exact:true}).click();return result.id;
}
async function drag(page,locator){const box=await locator.boundingBox();expect(box).toBeTruthy();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2+20,{steps:5});await page.mouse.up();}
test('Invalid label precision restores the previous value and keeps the model saveable',async({page})=>{
 await create(page);await page.getByLabel('Динамическая подпись',{exact:true}).check();const precision=page.getByLabel('Знаков после запятой',{exact:true});
 for(const invalid of ['','9','2.5']){await precision.fill(invalid);await precision.press('Tab');await expect(precision).toHaveValue('2');await expect(page.locator('#scene [data-dynamic-label="ball"]')).toHaveText('Скорость: 1,00 м/с');}
 await precision.fill('0');await precision.press('Tab');await expect(page.locator('#scene [data-dynamic-label="ball"]')).toHaveText('Скорость: 1 м/с');await precision.fill('');await precision.press('Tab');await expect(precision).toHaveValue('0');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('#save-state')).toHaveText('Сохранено в каталоге');
});
test('Visibility, drag locking and dynamic labels survive Undo, copying, save and reload',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));const id=await create(page);
 await page.locator('[data-a="step"]').click();const time=await page.locator('#stage-time').textContent();
 await page.getByLabel('Запретить перетаскивание',{exact:true}).check();await expect(page.locator('#stage-time')).toHaveText(time);
 const x=await page.getByLabel('Координата x, м',{exact:true}).inputValue();await drag(page,page.locator('#scene [data-body="ball"] circle').first());await expect(page.getByLabel('Координата x, м',{exact:true})).toHaveValue(x);await expect(page.locator('#stage-time')).toHaveText(time);
 await drag(page,page.locator('#scene [data-label="ball"]'));await expect(page.locator('#scene [data-label="ball"]')).toHaveAttribute('data-label-x','0');
 await page.getByLabel('Показывать на сцене',{exact:true}).uncheck();await expect(page.locator('#scene [data-body="ball"]')).toHaveCount(0);await expect(page.locator('[data-select-body="ball"]')).toContainText('Скрыт');
 await page.getByRole('button',{name:'Отменить',exact:true}).click();await expect(page.locator('#scene [data-body="ball"]')).toHaveCount(1);await page.getByRole('button',{name:'Повторить',exact:true}).click();await expect(page.locator('#scene [data-body="ball"]')).toHaveCount(0);
 await page.getByLabel('Показывать на сцене',{exact:true}).check();await page.getByLabel('Динамическая подпись',{exact:true}).check();await expect(page.locator('#scene [data-dynamic-label="ball"]')).toHaveText('Скорость: 1,00 м/с');
 await page.getByLabel('Формула подписи',{exact:true}).fill('ball_x');await page.getByLabel('Формула подписи',{exact:true}).press('Tab');await page.getByLabel('Текст перед значением',{exact:true}).fill('x = ');await page.getByLabel('Текст перед значением',{exact:true}).press('Tab');await page.getByLabel('Единица подписи',{exact:true}).fill('м');await page.getByLabel('Единица подписи',{exact:true}).press('Tab');
 await page.locator('[data-a="step"]').click();await expect(page.locator('#scene [data-dynamic-label="ball"]')).not.toHaveText('x = 1,00 м');
 await page.getByLabel('Запретить перетаскивание',{exact:true}).uncheck();const before=await page.getByLabel('Координата x, м',{exact:true}).inputValue();await drag(page,page.locator('#scene [data-body="ball"] circle').first());expect(await page.getByLabel('Координата x, м',{exact:true}).inputValue()).not.toBe(before);
 await page.getByRole('button',{name:'Копия',exact:true}).click();await expect(page.getByLabel('Формула подписи',{exact:true})).toHaveValue('b1_x');await page.getByLabel('Запретить перетаскивание',{exact:true}).check();await page.getByLabel('Показывать на сцене',{exact:true}).uncheck();
 await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('#save-state')).toHaveText('Сохранено в каталоге');await page.reload();await page.getByRole('button',{name:'Редактор',exact:true}).click();await page.locator('[data-select-body="b1"]').click();await expect(page.getByLabel('Формула подписи',{exact:true})).toHaveValue('b1_x');await expect(page.getByLabel('Запретить перетаскивание',{exact:true})).toBeChecked();await expect(page.locator('#scene [data-body="b1"]')).toHaveCount(0);
 const library=await (await page.request.get('/api/library')).json();expect(library.models.find(m=>m.id===id).spec.bodies.find(b=>b.id==='b1').visible).toBe(false);
 await page.locator('[data-select-body="ball"]').click();await page.screenshot({path:testInfo.outputPath('editor-display.png'),fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
});

test('Native and student HTML update escaped labels offline; expression errors do not stop motion',async({page,context},testInfo)=>{
 await create(page);await page.getByLabel('Динамическая подпись',{exact:true}).check();await page.getByLabel('Текст перед значением',{exact:true}).fill('<img src=x onerror=alert(1)> ');await page.getByLabel('Текст перед значением',{exact:true}).press('Tab');await expect(page.locator('#scene img')).toHaveCount(0);
 await page.getByLabel('Формула подписи',{exact:true}).fill('1/(t-0.01)');await page.getByLabel('Формула подписи',{exact:true}).press('Tab');await page.locator('[data-a="step"]').click();await expect(page.locator('#scene [data-label-error] title')).toHaveText(/Деление на ноль/);await page.locator('[data-a="step"]').click();await expect(page.locator('#scene [data-label-error]')).toHaveCount(0);
 await page.getByLabel('Формула подписи',{exact:true}).fill('unknown');await page.getByLabel('Формула подписи',{exact:true}).press('Tab');await expect(page.locator('#editor-feedback')).toContainText('unknown');await page.getByLabel('Формула подписи',{exact:true}).fill('ball_vx');await page.getByLabel('Формула подписи',{exact:true}).press('Tab');
 await page.locator('[data-select-body="caption"]').click();await page.getByLabel('Показывать на сцене',{exact:true}).uncheck();await page.locator('[data-select-body="ball"]').click();
 for(const student of [false,true]){
  await page.getByRole('button',{name:'Экспорт',exact:true}).click();if(student)await page.getByRole('button',{name:'Подготовить опыт для ученика',exact:true}).click();
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:student?'Скачать HTML для ученика':'Готовая демонстрация · HTML',exact:true}).click();const file=testInfo.outputPath(student?'student.html':'native.html');await(await downloading).saveAs(file);
  const offline=await context.newPage(),network=[],errors=[];offline.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});offline.on('pageerror',error=>errors.push(error.message));await offline.goto(pathToFileURL(path.resolve(file)).href);const root=student?offline.frameLocator('iframe'):offline;
  if(student)await expect(offline.locator('iframe')).toHaveAttribute('sandbox','allow-scripts');await expect(root.locator('#scene [data-body="caption"]')).toHaveCount(0);const label=root.locator('#scene [data-dynamic-label="ball"]');await expect(label).toHaveText('<img src=x onerror=alert(1)> 1,00 м/с');await root.locator('#step').click();await expect(label).toHaveText('<img src=x onerror=alert(1)> 1,02 м/с');await expect(root.locator('#scene img')).toHaveCount(0);expect(network).toEqual([]);expect(errors).toEqual([]);await offline.close();
 }
});
