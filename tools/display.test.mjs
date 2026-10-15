import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {bodyLabel,defaultDynamicLabel} from '../lib/display.js';
import {initialState,step,context,validatePhysics} from '../lib/engine.js';
import {renameReferences,copyBody} from '../lib/authoring.js';
import {newConnection,newField} from '../lib/components.js';

function model(){const m=emptyModel();m.bodies=[{...newBody('ball'),motion:'force',vx:3,vy:4}];return m;}
const dynamic=(b,extra={})=>({...defaultDynamicLabel(b),enabled:true,...extra});
test('Old projects keep their labels; optional display settings validate without a format migration',()=>{
 const m=model(),old=structuredClone(m);assert.deepEqual(validateModel(m),old);assert.equal(bodyLabel(m.bodies[0]).text,'Круг');
 for(const key of ['visible','dragLocked']){m.bodies[0][key]='false';assert.throws(()=>validateModel(m),/видимость/);delete m.bodies[0][key];}
 for(const precision of [-1,9,1.5,NaN]){m.bodies[0].dynamicLabel=dynamic(m.bodies[0],{precision});assert.throws(()=>validateModel(m),/Точность/);}
});
test('Hidden locked sources and spring endpoints produce exactly the same trajectory as visible bodies',()=>{
 const m=model();m.bodies.push({...newBody('support','anchor'),x:0,y:3,gravityEnabled:true,mass:1e8});m.connections=[newConnection('spring','support','ball','spring',2)];m.bodies[0].x=2;m.fields=[newField('gravity')];
 const hidden=structuredClone(m);for(const b of hidden.bodies){b.visible=false;b.dragLocked=true;}
 let a=initialState(m),b=initialState(hidden);for(let i=0;i<100;i++){a=step(m,a);b=step(hidden,b);}assert.deepEqual(a,b);
});
test('Dynamic labels evaluate parameters and quantities, preserve precision and report unsafe or unknown expressions',()=>{
 const m=model(),b=m.bodies[0];b.dynamicLabel=dynamic(b);let s=initialState(m);assert.equal(bodyLabel(b,context(m,s)).text,'Скорость: 5,00 м/с');
 m.parameters=[{id:'gain',label:'Множитель',unit:'',value:2,min:1,max:3}];m.quantities=[{id:'energy',label:'Энергия',unit:'Дж',expression:'gain*ball_m*(ball_vx^2+ball_vy^2)/2'}];b.dynamicLabel=dynamic(b,{prefix:'Энергия: ',expression:'energy',unit:'Дж',precision:3});s=initialState(m);assert.equal(bodyLabel(b,context(m,s)).text,'Энергия: 25,000 Дж');validatePhysics(validateModel(m));
 b.dynamicLabel.expression='window.alert(1)';assert.throws(()=>validateModel(m),/Подпись/);
 b.dynamicLabel.expression='unknown';assert.throws(()=>validatePhysics(validateModel(m)),/Подпись.*unknown/);
 b.dynamicLabel.expression='1/(t-0.01)';validatePhysics(validateModel(m));s=step(m,initialState(m));const label=bodyLabel(b,context(m,s));assert.match(label.text,/—/);assert.match(label.error,/Деление на ноль/);assert.doesNotThrow(()=>step(m,s));
});
test('Labels follow body, parameter and quantity renaming; a copied label follows the copied body',()=>{
 const m=model(),b=m.bodies[0];m.parameters=[{id:'gain',label:'g',unit:'',value:2,min:1,max:3}];m.quantities=[{id:'energy',label:'E',unit:'Дж',expression:'ball_m*ball_vx^2/2'}];b.dynamicLabel=dynamic(b,{expression:'ball_x+gain+energy',prefix:'ball_x'});
 renameReferences(m,'ball','bob',true);b.id='bob';renameReferences(m,'gain','factor');m.parameters[0].id='factor';renameReferences(m,'energy','kinetic');m.quantities[0].id='kinetic';assert.equal(b.dynamicLabel.expression,'bob_x+factor+kinetic');assert.equal(b.dynamicLabel.prefix,'ball_x');validatePhysics(validateModel(m));
 const copy=copyBody(b,'b2');assert.equal(copy.dynamicLabel.expression,'b2_x+factor+kinetic');assert.equal(b.dynamicLabel.expression,'bob_x+factor+kinetic');copy.dynamicLabel.expression='0';assert.notEqual(copy.dynamicLabel.expression,b.dynamicLabel.expression);
});
