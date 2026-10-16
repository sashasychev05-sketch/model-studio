import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {initialState,context,step,validatePhysics} from '../lib/engine.js';
import {mathObjectGeometry,mathFunctionSegments} from '../lib/math-objects.js';
import {mathTemplate,addMathObject} from '../lib/math-templates.js';
import {mathObjectsSVG} from '../web/math-drawing.js';
import {sceneTransform} from '../lib/camera.js';
import {renameReferences,removeBody} from '../lib/authoring.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
test('Mathematical starters validate, remain editable native models and do not alter the public gallery',()=>{
 for(const kind of ['math','function','geometry']){const m=mathTemplate(kind);assert.equal(m.subject,'math');assert.equal(m.kind,undefined);validatePhysics(validateModel(m));}
 assert.deepEqual(validateModel(emptyModel()),emptyModel());
 const m=mathTemplate();let n=0;for(const type of ['segment','vector','circle','polygon','function'])addMathObject(m,type,'shape'+(++n),()=>('P'+m.bodies.length));assert.equal(m.bodies.length,3);validatePhysics(validateModel(m));
});
test('Geometry uses the true control-point coordinates and stays invariant under translation',()=>{
 const m=mathTemplate('geometry');let s=initialState(m),c=context(m,s);const triangle=m.mathObjects[0],circle=m.mathObjects[1];let v=mathObjectGeometry(triangle,s,c);near(v.area,6);near(v.perimeter,4+2*Math.sqrt(13));v=mathObjectGeometry(circle,s,c);near(v.radius,2);near(v.area,4*Math.PI);
 for(const b of m.bodies){b.x+=1e6;b.y-=1e6;}s=initialState(m);v=mathObjectGeometry(triangle,s,context(m,s));near(v.area,6);m.bodies[2].y+=1;s=initialState(m);near(mathObjectGeometry(triangle,s,context(m,s)).area,8);
});
test('Mathematical overlays, their visibility and sampling never change a physical trajectory or the camera',()=>{
 const plain=emptyModel();plain.bodies=[{...newBody('b1'),motion:'force',fx:'2',vy:1}];const decorated=structuredClone(plain);addMathObject(decorated,'circle','circle',()=>{});addMathObject(decorated,'function','curve',()=>{});const scene=structuredClone(decorated.scene);let a=initialState(plain),b=initialState(decorated);for(let i=0;i<50;i++){a=step(plain,a);b=step(decorated,b);const c=context(decorated,b);mathObjectsSVG(decorated,b,c,sceneTransform(decorated.scene),null,false,esc,String);}assert.deepEqual(a,b);assert.deepEqual(decorated.scene,scene);
});
test('Function curves honor parameter values and partial domains and split a reciprocal discontinuity',()=>{
 const m=mathTemplate('function'),curve=m.mathObjects[0],bounds=m.scene;const sample=()=>mathFunctionSegments(curve,context(m,initialState(m)),bounds);let segments=sample();assert.ok(segments.flat().some(p=>Math.abs(p.x-3)<1e-9&&Math.abs(p.y-9)<1e-9));m.parameters[0].value=-1;segments=sample();assert.ok(segments.flat().some(p=>Math.abs(p.x-3)<1e-9&&Math.abs(p.y+9)<1e-9));curve.expression='sqrt(x)';assert.ok(sample().flat().every(p=>p.x>=0));curve.expression='1/x';assert.ok(sample().length>=2);assert.ok(sample().every(points=>points.every(p=>p.x<0)||points.every(p=>p.x>0)));curve.expression='log(-1)';assert.deepEqual(sample(),[]);
});
test('Schema rejects unsafe formulas, invalid references, repeated ids, negative radii and unbounded lists',()=>{
 const m=mathTemplate('geometry');m.mathObjects[1].radius='-1';assert.throws(()=>validatePhysics(validateModel(m)),/Радиус/);m.mathObjects[1].radius='r';m.mathObjects[0].points=['A','A','C'];assert.throws(()=>validateModel(m),/разных точек/);m.mathObjects[0].points=['A','B','C'];m.mathObjects[0].id='A';assert.throws(()=>validateModel(m),/повторяется/);m.mathObjects[0].id='triangle';m.mathObjects[1].center='missing';assert.throws(()=>validateModel(m),/Опорная точка/);
 const f=mathTemplate('function');f.mathObjects[0].expression='window.alert(1)';assert.throws(()=>validateModel(f),/Парабола/);f.mathObjects[0].expression='unknown+x';assert.throws(()=>validateModel(f),/unknown/);f.mathObjects[0].expression='x';f.mathObjects[0].minX=6;assert.throws(()=>validateModel(f),/диапазон/);
});
test('Renaming preserves reference points, radius formulas and function expressions; deleting a point removes attached geometry',()=>{
 const m=mathTemplate('geometry');addMathObject(m,'segment','edge',()=>{});addMathObject(m,'function','curve',()=>{}).expression='A_x*x+r';renameReferences(m,'A','origin',true);m.bodies[0].id='origin';renameReferences(m,'r','radius');m.parameters[0].id='radius';assert.equal(m.mathObjects.find(o=>o.type==='polygon').points[0],'origin');assert.equal(m.mathObjects.find(o=>o.type==='circle').radius,'radius');assert.equal(m.mathObjects.find(o=>o.type==='function').expression,'origin_x*x+radius');validatePhysics(validateModel(m));removeBody(m,'B');assert.ok(!m.mathObjects.some(o=>o.type==='polygon'||o.type==='segment'));validatePhysics(validateModel(m));
});
test('Drawing escapes names, obeys visibility, keeps circle scale and reports a runtime radius error',()=>{
 const m=mathTemplate('geometry'),s=initialState(m),tr=sceneTransform(m.scene);m.mathObjects[0].name='<img src=x>';let svg=mathObjectsSVG(m,s,context(m,s),tr,null,false,esc,String);assert.ok(!svg.includes('<img'));assert.ok(svg.includes('&lt;img'));assert.ok(svg.includes('r="'+2*tr.scale+'"'));m.mathObjects[0].visible=false;svg=mathObjectsSVG(m,s,context(m,s),tr,null,true,esc,String);assert.ok(!svg.includes('data-math-object="triangle"'));m.mathObjects[1].radius='-1';svg=mathObjectsSVG(m,s,context(m,s),tr,null,false,esc,String);assert.ok(svg.includes('data-math-error="circle"'));assert.doesNotThrow(()=>step(m,s));
});
test('Function and point limits fail before creating partial objects; removal cleans expression references too',()=>{
 const m=mathTemplate();for(let i=0;i<8;i++)addMathObject(m,'function','curve'+i,()=>{});const before=structuredClone(m);assert.throws(()=>addMathObject(m,'function','overflow',()=>{}),/8 графиков/);assert.deepEqual(m,before);
 const full=mathTemplate();full.bodies=Array.from({length:60},(_,i)=>newBody('text'+i,'text'));assert.throws(()=>addMathObject(full,'segment','edge',()=>{}),/60 объектов/);assert.equal(full.mathObjects,undefined);
 const geometry=mathTemplate('geometry');addMathObject(geometry,'function','curve',()=>{}).expression='A_x*x';removeBody(geometry,'A');assert.ok(!geometry.mathObjects.some(o=>o.id==='curve'));validatePhysics(validateModel(geometry));
});
