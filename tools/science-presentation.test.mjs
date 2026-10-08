import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {initialState,step} from '../lib/engine.js';
import {applyScenario} from '../lib/teaching.js';
import {histogramBins,compare,defaultConfig,analyze} from '../lib/compute/statistics.js';
import {emptyModel} from '../lib/model.js';
import {statisticsAdapter} from '../lib/compute/adapters.js';
import {demonstration} from '../web/data/demos.js';
import {validateAnalysis} from '../lib/compute/analysis-schema.js';
import {renameReferences} from '../lib/authoring.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('Shipped Newton braking obeys signed force, initial velocity and constant deceleration',async()=>{
 const {spec}=JSON.parse(await fs.readFile(new URL('../gallery/gallery_newton.json',import.meta.url),'utf8'));
 for(const mass of [1,2,4]){const m=applyScenario(spec,{parameters:{F:-3,massControl:mass,initialSpeed:6}});let s=initialState(m);
  while(s.t<m.duration-1e-10){s=step(m,s,Math.min(m.dt,m.duration-s.t));near(s.bodies.body.vx,6-3*s.t/mass);near(s.bodies.body.x,6*s.t-1.5*s.t*s.t/mass);}
  assert.ok(s.bodies.body.vx<6);if(mass===1)near(s.bodies.body.vx,0);
 }
});
test('Histogram bins have fixed bounds, include the final right edge and count excluded values',async()=>{
 const result=histogramBins([-1,0,1,2,3,4,5],4,[0,4]);assert.deepEqual(result.bins.map(b=>b.count),[1,1,1,2]);assert.equal(result.outside,2);assert.deepEqual(result.domain,[0,4]);
 const same=histogramBins([0,0,0],4,[0,4]);assert.deepEqual(same.domain,result.domain);assert.deepEqual(same.bins.map(b=>b.x1),[0,1,2,3]);
 assert.equal(compare([{x:0,y:1}], [1e-320]).rows[0].relative,null);
 const {dataset}=await demonstration('outlier',{}),config={...defaultConfig(dataset),chart:'histogram',residualDomain:{x:[0,10],y:[-1,1]}};
 const first=await analyze(dataset,config,emptyModel());assert.equal(first.result.histogram.bins.reduce((n,b)=>n+b.count,0),21);
 config.domain=first.result.domain;config.bins=30;const second=await analyze(dataset,config,emptyModel());assert.deepEqual(second.result.domain.x,first.result.domain.x);
 config.residualDomain.y=[2,1];assert.throws(()=>validateAnalysis({schemaVersion:1,datasets:[dataset],config}),/фиксированные оси/);
});
test('Standalone analysis JSON round-trips validated data/config and ignores untrusted calculated results',async()=>{
 const {dataset}=await demonstration('correlation',{}),config=defaultConfig(dataset),analysis={schemaVersion:1,datasets:[dataset],config};
 const restored=await statisticsAdapter.run({operation:'import-analysis',text:JSON.stringify({format:'model-studio-analysis',version:1,analysis,result:'untrusted'})});assert.deepEqual(restored,analysis);
 const bad=structuredClone(analysis);bad.config.fit=[{id:'a',min:0,max:1,value:.5},{id:'a',min:0,max:1,value:.5}];assert.throws(()=>validateAnalysis(bad),/Повторный/);
 await assert.rejects(statisticsAdapter.run({operation:'import-analysis',text:'{"format":"other","version":1}'}),/экспорта/);
});
test('Teacher presentation omits assignment/notes without concealing measurements',async()=>{
 const source=await fs.readFile(new URL('../web/teaching-ui.js',import.meta.url),'utf8'),bar=source.slice(source.indexOf('export function teachingBar'),source.indexOf('export function initTeaching')).replace('export function','function');
 const runtime={esc:String};vm.createContext(runtime);vm.runInContext(bar+'\nthis.bar=teachingBar;',runtime);
 const draft={parameters:[],bodies:[],kind:'native',assignment:{prediction:'Предскажите',experiment:'Опыт',explanation:'Почему',hideResults:true},scenarios:[{title:'Настройка'}]};
 const html=runtime.bar({draft,present:true,scenarioNote:'Предскажите ускорение'});assert.ok(html.includes('Настройка'));assert.doesNotMatch(html,/Предскажите|lesson-task|Ответ ученика|scenario-note/);
 const app=await fs.readFile(new URL('../web/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/gravity-switch-group/);assert.ok(app.includes("field('body.gravityEnabled'")||app.includes('body.gravityEnabled'));
});
test('History shares immutable table rows; analysis formulas/fit references survive renaming without altering old configs',async()=>{
 const source=await fs.readFile(new URL('../web/app.js',import.meta.url),'utf8'),definition=source.slice(source.indexOf('function historySnapshot()'),source.indexOf('function pushUndo()'));
 const {dataset}=await demonstration('newton',{}),spec={bodies:[],parameters:[],quantities:[],graphs:[],analysis:{schemaVersion:1,datasets:[dataset],config:{...defaultConfig(dataset),expression:'body_x+a*t^2',fit:[{id:'a',min:0,max:6,value:1}]}}};
 const runtime={structuredClone,S:{draft:spec,folderId:'folder'}};vm.createContext(runtime);vm.runInContext(definition+'\nthis.saved=historySnapshot();',runtime);
 assert.equal(runtime.saved.spec.analysis.datasets,spec.analysis.datasets);assert.notEqual(runtime.saved.spec.analysis.config,spec.analysis.config);
 const old=spec.analysis;renameReferences(spec,'a','acceleration');renameReferences(spec,'body','particle',true);
 assert.equal(spec.analysis.config.expression,'particle_x+acceleration*t^2');assert.equal(spec.analysis.config.fit[0].id,'acceleration');assert.equal(old.config.expression,'body_x+a*t^2');assert.equal(runtime.saved.spec.analysis.config.fit[0].id,'a');assert.deepEqual(spec.analysis.datasets[0].rows,dataset.rows);
});
