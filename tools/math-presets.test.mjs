import test from 'node:test';
import assert from 'node:assert/strict';
import {mathPresets} from '../lib/math-preset-catalog.js';
import {mathPresetModel,addMathPreset,duplicateMathPreset,removeMathObject} from '../lib/math-presets.js';
import {mathTemplate} from '../lib/math-templates.js';
import {initialState,validatePhysics,context} from '../lib/engine.js';
import {validateModel} from '../lib/model.js';
import {mathObjectGeometry,mathFunctionSegments} from '../lib/math-objects.js';
import {renameReferences} from '../lib/authoring.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const geometry=m=>mathObjectGeometry(m.mathObjects[0],initialState(m),context(m,initialState(m)));
test('All 23 presets and every slider endpoint validate, stay finite and keep the camera fixed',()=>{
 assert.equal(mathPresets.length,23);
 for(const def of mathPresets){const m=mathPresetModel(def.id),scene=structuredClone(m.scene);validatePhysics(validateModel(m));
  for(const param of m.parameters)for(const value of [param.min,param.max]){const saved=param.value;param.value=value;validatePhysics(validateModel(m));const s=initialState(m),c=context(m,s),item=m.mathObjects[0];
   if(item.type==='polygon'){const g=mathObjectGeometry(item,s,c);assert.equal(g.selfIntersecting,false,def.id);assert.ok(g.area>0,def.id);}
   if(item.type==='function')assert.ok(mathFunctionSegments(item,c,m.scene).length,def.id);
   for(const p of Object.values(s.bodies))assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.deepEqual(m.scene,scene);param.value=saved;
  }
 }
});
test('Trapezoid and parallelogram preserve their defining geometry and analytical areas',()=>{
 const trap=mathPresetModel('trapezoid');near(geometry(trap).area,12);for(const [bottom,top,height,shift] of [[7,.4,.4,-3],[.4,7,7,3],[4,4,3,2]]){trap.parameters.forEach((p,i)=>p.value=[bottom,top,height,shift][i]);const g=geometry(trap);near(g.area,(bottom+top)*height/2);near(g.points[0].y,g.points[1].y);near(g.points[2].y,g.points[3].y);}
 const para=mathPresetModel('parallelogram');para.parameters[2].value=135;let g=geometry(para);near(g.area,4*3*Math.sin(135*Math.PI/180));near(g.points[1].x-g.points[0].x,g.points[2].x-g.points[3].x);near(g.points[1].y-g.points[0].y,g.points[2].y-g.points[3].y);
 const eq=mathPresetModel('equilateral-triangle');g=geometry(eq);near(g.area,9*Math.sqrt(3)/4);near(g.perimeter,9);
 for(const sides of [3,5,6,12]){const m=mathTemplate();addMathPreset(m,'regular-polygon',{sides});validatePhysics(validateModel(m));const g=geometry(m);near(g.area,sides*2.5**2*Math.sin(2*Math.PI/sides)/2);}
});
test('A preset copy has its own points, position and parameters; removal releases unused objects',()=>{
 const m=mathPresetModel('trapezoid'),original=m.mathObjects[0],before=geometry(m),copy=duplicateMathPreset(m,original);validatePhysics(validateModel(m));assert.ok(copy.points.every(id=>!original.points.includes(id)));assert.notEqual(copy.preset.origin,original.preset.origin);
 m.parameters.find(p=>p.id===copy.preset.parameters.height).value=5;const s=initialState(m);near(mathObjectGeometry(original,s,context(m,s)).area,before.area);near(mathObjectGeometry(copy,s,context(m,s)).area,20);
 removeMathObject(m,copy.id);validatePhysics(validateModel(m));assert.equal(m.parameters.length,4);assert.equal(m.bodies.length,5);removeMathObject(m,original.id);assert.equal(m.parameters.length,0);assert.equal(m.bodies.length,0);assert.equal(m.geometry.length,0);validatePhysics(validateModel(m));
 const longName=addMathPreset(m,'rectangle',{name:'Я'.repeat(80)});duplicateMathPreset(m,longName);validatePhysics(validateModel(m));assert.equal(m.mathObjects[1].name.length,80);
});
test('Removal keeps externally used points, measurements and formula parameters',()=>{
 const m=mathPresetModel('rectangle'),shape=m.mathObjects[0],a=shape.points[0],b=shape.points[1],width=shape.preset.parameters.width;m.measurements=[{id:'ruler',type:'distance',label:'Сторона',a,b}];m.quantities.push({id:'widthNow',label:'Ширина',expression:width,unit:''});removeMathObject(m,shape.id);validatePhysics(validateModel(m));assert.ok(m.bodies.some(p=>p.id===a));assert.ok(m.bodies.some(p=>p.id===b));assert.equal(m.parameters.length,2);assert.equal(m.measurements.length,1);
});
test('Rename updates metadata and offset formulas; invalid dimensions and limits are atomic',()=>{
 const m=mathPresetModel('trapezoid'),item=m.mathObjects[0],old=m.parameters[0].id;renameReferences(m,old,'lowerBase');m.parameters[0].id='lowerBase';assert.equal(item.preset.parameters.bottom,'lowerBase');validatePhysics(validateModel(m));
 const origin=item.preset.origin;renameReferences(m,origin,'anchor',true);m.bodies.find(b=>b.id===origin).id='anchor';assert.equal(item.preset.origin,'anchor');validatePhysics(validateModel(m));
 for(const options of [{values:{height:0}},{values:{height:NaN}},{values:{bottom:100}}]){const before=structuredClone(m);assert.throws(()=>addMathPreset(m,'trapezoid',options));assert.deepEqual(m,before);}
 const empty=mathTemplate();assert.throws(()=>addMathPreset(empty,'regular-polygon',{sides:3.5}),/целое/);assert.deepEqual(empty,mathTemplate());
 while(m.parameters.length<24)m.parameters.push({id:'extra'+m.parameters.length,label:'Дополнительный',value:1,min:0,max:2,unit:''});const before=structuredClone(m);assert.throws(()=>duplicateMathPreset(m,item),/24/);assert.deepEqual(m,before);
});
test('Offset constraints detect cycles, reject nonfinite results and survive JSON round trips',()=>{
 const m=mathPresetModel('parallelogram'),round=JSON.parse(JSON.stringify(m));validatePhysics(validateModel(round));assert.deepEqual(initialState(m),initialState(round));const g=round.geometry[0];g.center=g.target;assert.throws(()=>validateModel(round),/самой себя/);g.center=m.geometry[0].center;g.dx='1/0';assert.throws(()=>validatePhysics(validateModel(round)),/Деление на ноль/);
});
