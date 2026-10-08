import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateModel} from '../lib/model.js';
import {initialState,step} from '../lib/engine.js';
import {applyBindings} from '../lib/teaching.js';
import {renameReferences,removeBody} from '../lib/authoring.js';
import {sceneTransform} from '../lib/camera.js';
const template=JSON.parse(await fs.readFile(new URL('../gallery/gallery_pendulum.json',import.meta.url),'utf8')).spec;
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('Pendulum length slider preserves angle, fixed scale, taut length and input model',()=>{
 const model=structuredClone(template),control=model.parameters.find(p=>p.id==='ropeLength'),camera=JSON.stringify(model.scene),transform=sceneTransform(model.scene);
 for(const length of [.5,1,2,4,2]){
  control.value=length;const original=JSON.stringify(model);let state=initialState(model);const a=state.bodies.anchor,b=state.bodies.bob;
  near(Math.hypot(b.x-a.x,b.y-a.y),length);near((b.x-a.x)/length,.6);near((b.y-a.y)/length,-.8);
  near(Math.hypot(transform.X(b.x)-transform.X(a.x),transform.Y(b.y)-transform.Y(a.y)),length*(transform.X(1)-transform.X(0)));
  for(let i=0;i<200;i++){state=step(model,state);near(Math.hypot(state.bodies.bob.x-a.x,state.bodies.bob.y-a.y),length,1e-7);}
  assert.equal(JSON.stringify(model),original);assert.equal(JSON.stringify(model.scene),camera);
  applyBindings(model);near(model.connections[0].length,length);
 }
});

test('Pendulum period doubles when length grows four times at the same initial angle',()=>{
 function period(length){const model=structuredClone(template);model.parameters.find(p=>p.id==='ropeLength').value=length;let state=initialState(model),crossings=[];
  while(state.t<12&&crossings.length<2){const previous=state;state=step(model,state);const x0=previous.bodies.bob.x,x1=state.bodies.bob.x;if(x0>0&&x1<=0)crossings.push(previous.t+model.dt*x0/(x0-x1));}
  assert.equal(crossings.length,2);return crossings[1]-crossings[0];
 }
 near(period(4)/period(1),2,.003);
});

test('Length binding validates, follows renaming and detaches when its rope disappears',()=>{
 const model=structuredClone(template),binding=model.parameters.find(p=>p.id==='ropeLength').binding;
 renameReferences(model,'thread','string');model.connections[0].id='string';assert.equal(binding.connection,'string');
 renameReferences(model,'bob','weight',true);model.bodies.find(b=>b.id==='bob').id='weight';assert.equal(binding.reposition,'weight');assert.doesNotThrow(()=>validateModel(model));
 const invalid=structuredClone(model);invalid.parameters.find(p=>p.id==='ropeLength').min=0;assert.throws(()=>validateModel(invalid),/длиной/);
 const duplicate=structuredClone(model);duplicate.parameters.push({...duplicate.parameters.find(p=>p.id==='ropeLength'),id:'otherLength'});assert.throws(()=>validateModel(duplicate),/уже есть/);
 removeBody(model,'weight');assert.equal(model.parameters.find(p=>p.id==='ropeLength').binding,undefined);
});
