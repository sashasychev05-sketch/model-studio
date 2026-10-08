import test from 'node:test';
import assert from 'node:assert/strict';
import {modelTopic,folderPath,folderDefaults,catalogModels} from '../lib/topics.js';
import {renameReferences,validateControls} from '../lib/authoring.js';
import {emptyModel,newBody,validateModel} from '../lib/model.js';

const folders=[{id:'a',name:'Группа А · 8 класс',parentId:null},{id:'g',name:'Геометрия',parentId:'a'},{id:'d',name:'Группа Б · 10 класс',parentId:null}];
const record=(id,title,topic,folderId,grade='8',archived=0)=>({id,folderId,archived,updatedAt:'2026-10-04',spec:{...emptyModel(),title,topic,grade}});
const library={folders,models:[record('1','Трапеция','Геометрия','g'),record('2','Бросок','Кинематика','a'),record('3','Геометрия группы Б','Геометрия','d','10'),record('4','Архив','Геометрия','g','8',1)]};
test('Каталог: ученики, вложенные папки, темы, поиск и корзина сочетаются',()=>{
 assert.deepEqual(catalogModels(library,{folder:'a'}).map(m=>m.id),['2','1']);
 assert.deepEqual(catalogModels(library,{topic:'Геометрия',grade:'10'}).map(m=>m.id),['3']);
 assert.deepEqual(catalogModels(library,{search:'группа а',topic:'Геометрия'}).map(m=>m.id),['1']);
 assert.equal(catalogModels(library,{topic:'Алгебра'}).length,0);
 assert.deepEqual(catalogModels(library,{folder:'trash'}).map(m=>m.id),['4']);
 assert.deepEqual(catalogModels(library,{sort:'topic'}).map(m=>m.id),['3','1','2']);
 assert.equal(library.models[0].id,'1');
});
test('Темы старых моделей, свои темы и наследование класса из папки',()=>{
 assert.equal(modelTopic({previewTheme:'boiling'}),'Тепловые явления');
 assert.equal(modelTopic({previewTheme:'rectangle'}),'Геометрия');
 assert.equal(modelTopic({topic:' Моя тема ',previewTheme:'force'}),'Моя тема');
 assert.deepEqual(folderDefaults(folders,'g'),{grade:'8',subject:'math',topic:'Геометрия'});
 assert.deepEqual(folderPath(folders,'g').map(f=>f.id),['a','g']);
 assert.equal(folderPath([{id:'a',parentId:'b'},{id:'b',parentId:'a'}],'a').length,2);
});
test('Редактор: переименование параметра и объекта сохраняет ссылки в формулах',()=>{
 const spec=emptyModel();spec.bodies=[{...newBody('b1'),fy:'-m*g',fx:'b1_x+g2'}];spec.parameters=[{id:'g',label:'g',value:9,min:0,max:10,unit:''},{id:'g2',label:'g2',value:1,min:0,max:10,unit:''}];spec.graphs=[{id:'plot1',label:'График',expression:'b1_vx*g+g2',unit:''}];
 renameReferences(spec,'g','gravity');assert.equal(spec.bodies[0].fy,'-m*gravity');assert.equal(spec.bodies[0].fx,'b1_x+g2');
 renameReferences(spec,'b1','ball',true);assert.equal(spec.graphs[0].expression,'ball_vx*gravity+g2');assert.equal(spec.bodies[0].fx,'ball_x+g2');
});
test('Начальные параметры HTML: проверка идентификаторов, типов и повторов',()=>{
 const controls=[{id:'angle',type:'range',value:'35'}];assert.equal(validateControls(controls),controls);
 assert.doesNotThrow(()=>validateModel({...emptyModel(),kind:'html',html:'<html><body></body></html>',initialControls:controls,topic:'Геометрия'}));
 for(const bad of [[...controls,...controls],[{id:'<script>',type:'number',value:'1'}],[{id:'x',type:'file',value:'1'}]])assert.throws(()=>validateControls(bad));
});
