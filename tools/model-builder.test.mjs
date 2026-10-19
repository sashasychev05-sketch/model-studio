import test from 'node:test';
import assert from 'node:assert/strict';
import {builderTasks,createModelPart,composeModel,changeModelParameter} from '../lib/model-builder.js';
import {calculate,calculationReports} from '../lib/calculations.js';
import {validateModel,emptyModel} from '../lib/model.js';
import {initialState,context,step,validatePhysics} from '../lib/engine.js';
import {renameReferences} from '../lib/authoring.js';
import {spatialMetrics} from '../lib/spatial.js';
const values=result=>Object.fromEntries(result.values.map(v=>[v.key,v.value]));
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('All 49 guided parts and every input endpoint compile to finite editable native models',()=>{
 assert.equal(builderTasks.length,49);for(const task of builderTasks){const m=createModelPart(task.id);validatePhysics(validateModel(JSON.parse(JSON.stringify(m))));for(const field of task.fields)for(const value of [field.min,field.max]){const spec=createModelPart(task.id,{[field.key]:value});assert.ok(Object.values(context(spec,initialState(spec))).every(Number.isFinite));}}
});
test('Polygon side counts and 3D dimensions really alter the geometry and remain independent',()=>{
 const triangle=createModelPart('plane-regular-polygon',{sides:3,radius:2}),polygon=createModelPart('plane-regular-polygon',{sides:12,radius:2});assert.equal(triangle.mathObjects[0].points.length,3);assert.equal(polygon.mathObjects[0].points.length,12);const cube=createModelPart('solid-cube',{side:4});near(spatialMetrics(cube.mathObjects[0],cube).volume,64);const merged=composeModel(cube,createModelPart('solid-cube',{side:2}));near(spatialMetrics(merged.mathObjects[1],merged).volume,8);assert.deepEqual(merged.scene,cube.scene);
});
test('Guided physical experiments solve motion and preserve spring energy and pendulum length',()=>{
 for(const id of ['motion','force','spring','pendulum']){const m=createModelPart(id),bounds=structuredClone(m.scene);let s=initialState(m);const e0=id==='spring'?context(m,s).energy:0;while(s.t<m.duration-1e-10)s=step(m,s,Math.min(m.dt,m.duration-s.t));assert.deepEqual(m.scene,bounds);if(id==='motion')near(s.bodies.body.x,8);if(id==='force'){near(s.bodies.body.x,4);near(s.bodies.body.vx,4);}if(id==='spring')near(context(m,s).energy,e0,1e-6);if(id==='pendulum')near(Math.hypot(s.bodies.body.x,s.bodies.body.y-2),2);}
});
test('Quadratics use stable roots and distinguish linear, repeated, absent and infinitely many solutions',()=>{
 const r=values(calculate('quadratic',{a:1,b:-1e8,c:1}));near(r.root1,1e-8,1e-12);near(r.root2,1e8);near(r.root1*r.root2,1);assert.equal(values(calculate('quadratic',{a:1,b:2,c:1})).root1,-1);assert.equal(values(calculate('quadratic',{a:0,b:2,c:-6})).root1,3);const none=calculate('quadratic',{a:1,b:0,c:1});assert.equal(none.status,'none');assert.equal(values(none).root1,undefined);assert.equal(calculate('quadratic',{a:0,b:0,c:0}).status,'many');
});
test('Linear systems classify degenerate rows and flag nearly parallel equations',()=>{
 const a={a:1,b:1,c:5,d:1,e:-1,f:1};const answer=values(calculate('system',a));assert.equal(answer.count,1);near(answer.x,3);near(answer.y,2);assert.equal(calculate('system',{...a,d:2,e:2,f:10}).status,'many');assert.equal(calculate('system',{...a,d:2,e:2,f:11}).status,'none');assert.equal(calculate('system',{a:0,b:0,c:1,d:0,e:0,f:0}).status,'none');assert.equal(calculate('system',{a:0,b:0,c:0,d:1,e:0,f:2}).status,'many');assert.equal(calculate('system',{a:1,b:1,c:1,d:1,e:1+1e-14,f:1}).status,'uncertain');
});
test('Electrical, thermal and optical blocks follow analytical laws and report their singular cases',()=>{
 const series=values(calculate('series',{voltage:12,r1:4,r2:8}));assert.equal(series.current,1);assert.equal(series.u1+series.u2,12);const parallel=values(calculate('parallel',{voltage:-12,r1:4,r2:8}));near(parallel.current,parallel.i1+parallel.i2);near(parallel.power,54);assert.equal(values(calculate('heat',{mass:2,capacity:1000,start:30,end:10})).heat,-40000);const mixing=values(calculate('mixing',{m1:1,c1:4200,t1:80,m2:1,c2:4200,t2:20}));near(mixing.temperature,50);near(mixing.heat1+mixing.heat2,0);const lens=values(calculate('lens',{focal:.2,distance:.6,height:.1}));near(lens.image,.3);near(lens.magnification,-.5);near(values(calculate('lens',{focal:-.2,distance:.6,height:.1})).image,-.15);assert.equal(calculate('lens',{focal:.2,distance:.2,height:.1}).status,'infinity');assert.throws(()=>calculate('lens',{focal:0,distance:1,height:1}));assert.throws(()=>calculate('series',{voltage:1,r1:0,r2:1}));
});
test('Composition remaps all dependencies, supports calculation chains, renaming and atomic parameter edits',()=>{
 const a=createModelPart('plane-trapezoid'),before=structuredClone(a),b=composeModel(a,createModelPart('calc-quadratic'));assert.deepEqual(a,before);const c=composeModel(b,createModelPart('plane-square'));validatePhysics(validateModel(c));assert.equal(c.calculations.length,1);const roots=calculationReports(c,context(c,initialState(c)))[0];near(values(roots).root1,1);const p=c.parameters.find(p=>p.id.endsWith('input_a'));renameReferences(c,p.id,'coefficient');p.id='coefficient';validatePhysics(validateModel(c));const saved=structuredClone(c);assert.throws(()=>changeModelParameter(c,'coefficient',''));assert.deepEqual(c,saved);const changed=changeModelParameter(c,'coefficient',2);assert.deepEqual(changed.scene,c.scene);assert.equal(c.parameters.find(p=>p.id==='coefficient').value,1);
 const chain=createModelPart('calc-percent');chain.calculations.push({id:'second',name:'Ещё процент',type:'percent',inputs:{whole:'result_part',percent:'10'}});const ctx=context(chain,initialState(chain));near(ctx.second_part,3);chain.calculations[0].inputs.whole='second_part';assert.throws(()=>validatePhysics(validateModel(chain)),/кругу/);
});
test('Schema, scene compatibility, capacity and hostile formulas fail without partial model changes',()=>{
 const m=createModelPart('solid-cube'),saved=structuredClone(m);assert.throws(()=>composeModel(m,createModelPart('force')),/отдельную/);assert.deepEqual(m,saved);const limited=emptyModel();limited.parameters=Array.from({length:24},(_,i)=>({id:'a'+i,label:'Число',value:1,min:0,max:2,unit:''}));const snapshot=structuredClone(limited);assert.throws(()=>composeModel(limited,createModelPart('plane-square')));assert.deepEqual(limited,snapshot);const bad=createModelPart('calc-percent');bad.calculations[0].inputs.whole='globalThis.fetch(1)';assert.throws(()=>validateModel(bad));bad.calculations[0].inputs.whole='1';bad.parameters[0].id='result_part';assert.throws(()=>validateModel(bad),/совпадает/);const grade={...createModelPart('plane-square'),grade:'5'};validateModel(grade);
});
