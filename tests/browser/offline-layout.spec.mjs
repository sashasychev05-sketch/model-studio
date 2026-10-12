import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {emptyModel} from '../../lib/model.js';

const authoredHTML='<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;height:100vh;overflow:auto;font:16px system-ui}main{padding:20px}.scene{height:950px;background:#eef1f8}@media(max-width:600px){.scene{height:1350px}}#extra{height:500px}button{padding:12px}</style></head><body><main><h1>Откуда берётся давление газа?</h1><input id="speed" type="range" min="1" max="3" value="1"><output id="value">1</output><div class="scene">Высокая сцена опыта</div><button id="toggle">Дополнительные результаты</button><div id="extra" hidden>Расчёты и пояснения</div><p id="bottom">Конец опыта</p></main><script>document.getElementById("speed").oninput=e=>document.getElementById("value").textContent=e.target.value;document.getElementById("toggle").onclick=()=>{document.getElementById("extra").hidden=!document.getElementById("extra").hidden;};</script></body></html>';
async function fits(frame){
 await expect.poll(()=>frame.locator('body').evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(2);
}
test('Tall HTML with scenarios uses one page scroll, resizes both ways and stays isolated offline',async({page,context},testInfo)=>{
 const spec={...emptyModel(),kind:'html',title:'Проверка большого опыта',html:authoredHTML,scenarios:[{id:'double',title:'Удвоенная скорость',note:'',controls:[{id:'speed',type:'range',value:'2'}]}]};
 const backup=await(await page.request.get('/api/backup')).json();
 const saved=await(await page.request.post('/api/library',{data:{action:'save',spec}})).json();const id=saved.result.id;
 try{
  for(const student of [false,true]){
   await page.goto('/?model='+id);await page.getByRole('button',{name:'Экспорт',exact:true}).click();
   if(student)await page.getByRole('button',{name:'Подготовить опыт для ученика',exact:true}).click();
   const downloading=page.waitForEvent('download');await page.getByRole('button',{name:student?'Скачать HTML для ученика':'Готовая демонстрация · HTML',exact:true}).click();
   const file=testInfo.outputPath(student?'student.html':'lesson.html');await(await downloading).saveAs(file);
   const offline=await context.newPage(),requests=[],errors=[];
   offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});offline.on('pageerror',e=>errors.push(e.message));
   await offline.goto(pathToFileURL(file).href);
   const lesson=student?offline.frameLocator('iframe'):offline;
   const experiment=lesson.frameLocator('iframe');await expect(experiment.locator('#bottom')).toBeVisible();await fits(experiment);
   if(student)await fits(lesson);
   expect(await lesson.locator('iframe').evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('0px');
   await expect(lesson.locator('iframe')).toHaveAttribute('sandbox','allow-scripts');
   const height=await lesson.locator('iframe').evaluate(el=>el.getBoundingClientRect().height);
   await experiment.getByRole('button',{name:'Дополнительные результаты',exact:true}).click();
   await expect.poll(()=>lesson.locator('iframe').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(height+450);await fits(experiment);
   await experiment.getByRole('button',{name:'Дополнительные результаты',exact:true}).click();
   await expect.poll(()=>lesson.locator('iframe').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(height+5);
   await lesson.getByRole('button',{name:'Удвоенная скорость',exact:true}).click();await expect(experiment.locator('#value')).toHaveText('2');
   await offline.setViewportSize({width:390,height:844});await fits(experiment);if(student)await fits(lesson);
   expect(await offline.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   expect(await experiment.locator('body').evaluate(()=>{try{return parent.document.body?'accessible':'empty';}catch{return 'isolated';}})).toBe('isolated');
   expect(requests).toEqual([]);expect(errors).toEqual([]);await offline.close();
  }
 }finally{const preview=await(await page.request.post('/api/backup/preview',{data:backup})).json();const restored=await page.request.post('/api/backup/restore',{data:{backup,expectedState:preview.expectedState}});expect(restored.ok()).toBe(true);}
});
