import * as teachingFunctions from '../lib/teaching.js';
import * as measurementFunctions from '../lib/measurements.js';
import {auditModel} from '../lib/audit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {enrichmentDefinitions} from '../lib/enrichment-models.js';
import {lessonSpec} from '../lib/lesson-models.js';
import {validateModel} from '../lib/model.js';
const all=enrichmentDefinitions(),d=key=>all.find(x=>x.key===key),defaults=x=>Object.fromEntries(x.parameters.map(p=>[p.id,p.value]));
const calc=(key,changes={})=>d(key).calculate({...defaults(d(key)),...changes});
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('All 19 offline lessons validate, run embedded code and draw finite output at every boundary combination',()=>{
 for(const model of all){const spec=validateModel(lessonSpec(model,enrichmentDefinitions));assert.ok(spec.html.length<180000);assert.doesNotMatch(spec.html,/<script[^>]*\bsrc=|fetch\(|XMLHttpRequest|<iframe/);
  const nodes=new Map(),frames=new Map();let frameId=0;const el=()=>({value:'',textContent:'',innerHTML:'',listeners:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){},append(){},replaceChildren(){}});
  for(const p of model.parameters){nodes.set(p.id,{...el(),value:String(p.value)});nodes.set('out-'+p.id,el());}for(const id of ['scene','scene-content','readouts','formulas','play','step','speed','reset'])nodes.set(id,el());nodes.get('speed').value='1';const win={};const runtime={window:win,parent:win,document:{getElementById:id=>nodes.get(id),createElement:el,addEventListener(){}},requestAnimationFrame:f=>{frames.set(++frameId,f);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  for(const [,script]of spec.html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInNewContext(script,runtime);assert.match(nodes.get('formulas').innerHTML,/<math/);assert.ok(nodes.get('scene-content').innerHTML.length>100);
  if(model.animation){nodes.get('play').onclick({isTrusted:false});for(let tick=0;tick<=10;tick++){const next=frames.entries().next().value;frames.delete(next[0]);next[1](tick*100);}assert.notEqual(Number(nodes.get(model.animation.parameter).value),defaults(model)[model.animation.parameter],model.key);nodes.get('play').onclick({isTrusted:false});assert.equal(frames.size,0);}
  for(let mask=0;mask<2**model.parameters.length;mask++){const v=Object.fromEntries(model.parameters.map((p,i)=>[p.id,(mask>>i)&1?p.max:p.min])),s=model.calculate(v);assert.doesNotMatch(model.draw(v,s),/NaN|Infinity|undefined/);assert.ok(model.readout(v,s).every(([a,b])=>a&&b));}
 }
});
test('Traveling and standing waves obey phase speed, superposition and stationary nodes',()=>{
 const v=defaults(d('traveling-wave')),s=calc('traveling-wave'),later=calc('traveling-wave',{time:.3});near(s.displacement(2),later.displacement(2+1.5*.3));near(s.omega/s.k,1.5);
 for(const time of [0,.1,.5,2,7]){const s=calc('standing-wave',{reflection:1,time});for(let j=0;j<9;j++)near(s.total(j),0);for(const x of [.1,1.8,4.2])near(s.total(x),s.left(x)+s.right(x));}
});
test('Spring chain solves Newton equations, fixed boundaries and conserves computed energy for every mode',()=>{
 for(let mode=1;mode<=8;mode++){const v={...defaults(d('spring-chain')),mode},initial=d('spring-chain').calculate(v);for(const time of [0,.1,1.7,7,20]){const s=d('spring-chain').calculate({...v,time});near(s.u(0),0);near(s.u(25),0);near(s.energy,initial.energy);for(let j=1;j<=24;j++)near(-v.mass*s.omega**2*s.u(j),v.stiffness*(s.u(j-1)-2*s.u(j)+s.u(j+1)));}}
});
test('Vacuum EM wave has E=cB, correct speed, phase and zero-amplitude limit',()=>{
 for(const wavelength of [2,4,8])for(const time of [0,13,60]){const s=calc('electromagnetic-wave',{wavelength,time});near(s.frequency*wavelength,299792458,1e-6);for(const x of [0,1,3,7])near(s.E(x),s.c*s.B(x));}const s=calc('electromagnetic-wave',{amplitude:0});near(s.E(1),0);near(s.B(1),0);
});
test('Dipole decays as 1/r³ and axial field is twice the equatorial field',()=>{
 const axial=calc('magnetic-dipole',{x:1,y:0}),far=calc('magnetic-dipole',{x:2,y:0});near(axial.by/far.by,8);const z=calc('magnetic-dipole',{x:1,y:0,angle:90});near(Math.hypot(z.bx,z.by),2*Math.hypot(axial.bx,axial.by));
});
test('Derivative tends to tangent; integral midpoint errors converge quadratically',()=>{
 for(const x0 of [-2,0,2]){near(calc('derivative',{x0,h:0}).slope,2*x0);}
 const small=calc('integral',{count:10,method:1}),large=calc('integral',{count:20,method:1});near(Math.abs(small.sum-small.exact)/Math.abs(large.sum-large.exact),4);
});
test('Binomial probabilities sum to one with correct mean/variance and endpoint masses',()=>{
 for(const count of [1,10,50])for(const probability of [0,.01,.5,.99,1]){const s=calc('binomial',{count,probability,selected:50});near(s.total,1);near(s.probabilities.reduce((a,p,k)=>a+p*k,0),s.mean);near(s.probabilities.reduce((a,p,k)=>a+p*(k-s.mean)**2,0),s.variance);if(count<50)assert.equal(s.selected,0);}
});
test('Gaussian interval probability is symmetric, bounded and agrees with standard reference',()=>{
 near(calc('normal').probability,.682689492,3e-7);near(calc('normal',{left:0,right:0}).probability,0);for(const mean of [-2,0,2])for(const sigma of [.3,1,2]){const s=calc('normal',{mean,sigma});assert.ok(s.probability>=0&&s.probability<=1);near(s.density(mean+1),s.density(mean-1));}
});
test('Descriptive stats translate and scale correctly; regression handles zero variance and exact lines',()=>{
 const a=calc('descriptive'),shift=calc('descriptive',{shift:10}),scale=calc('descriptive',{scale:2});near(shift.mean,a.mean+10);near(shift.variance,a.variance);near(scale.variance,4*a.variance);near(a.sampleVariance,a.variance*7/6);
 const line=calc('regression',{slope:.6,noise:0,outlier:0});near(line.beta,.6);near(line.alpha,0);near(line.r,1);assert.equal(calc('regression',{slope:0,noise:0,outlier:0}).r,null);
});
test('Random experiments reproduce seeds, Monte Carlo preserves prefix; CLT normalises histogram including tails',()=>{
 const a=calc('monte-carlo',{count:100}),b=calc('monte-carlo',{count:200});assert.deepEqual(b.points.slice(0,100),a.points);near(a.estimate,4*a.inside/100);
 const clt=calc('central-limit');assert.deepEqual(clt,calc('central-limit'));assert.equal(clt.bins.reduce((a,b)=>a+b,0)+clt.outside,300);near(clt.sigma,1/Math.sqrt(10));
});
test('Bayes uses base rate; logistic recurrence preserves [0,1]',()=>{
 const s=calc('bayes');near(s.posterior,.009/(.009+.99*.05));near(calc('bayes',{specificity:1}).posterior,1);
 for(const r of [2.5,3,3.8,4]){const s=calc('logistic',{r,count:100});assert.ok([...s.a,...s.b].every(x=>x>=0&&x<=1));for(let j=1;j<s.a.length;j++)near(s.a[j],r*s.a[j-1]*(1-s.a[j-1]));}
});
