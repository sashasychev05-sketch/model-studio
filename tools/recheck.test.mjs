import * as teachingFunctions from '../lib/teaching.js';
import * as measurementFunctions from '../lib/measurements.js';
import {auditModel} from '../lib/audit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {initialState,step,context,validatePhysics} from '../lib/engine.js';
import {GRAVITATIONAL_G as G,gravitationalForces,gravityPotential} from '../lib/gravity.js';
import {gravityLesson} from '../lib/gravity-lesson.js';
import {newField} from '../lib/components.js';
import {renameReferences} from '../lib/authoring.js';
import * as potentials from '../lib/field-potential.js';
import * as electro from '../lib/electrostatics.js';
import * as interactions from '../lib/interaction.js';
import * as camera from '../lib/camera.js';
import {evaluate} from '../lib/expression.js';
import {fieldExamples} from '../lib/field-examples.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}, tolerance ${t}`);
async function renderRuntime(){const rt={...potentials,...electro,...interactions,...camera,initialState,step,context,evaluate};vm.createContext(rt);for(const file of ['field-drawing.js','scene.js'])vm.runInContext((await fs.readFile(new URL('../web/'+file,import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const)\b)/g,''),rt);vm.runInContext('globalThis.render=sceneSVG;globalThis.graph=graphSVG;globalThis.magnetic=magneticFieldSVG;globalThis.electric=chargeFieldSVG;',rt);return rt;}
test('Uniform sphere: inverse square outside, linear interior, finite centre, continuous potential and force',()=>{
 const m=gravityLesson(),M=m.bodies[0].mass,R=m.bodies[0].gravityRadius;
 for(const r of [0,1,50,99.999,100,100.001,200,400]){m.bodies[1].x=r;const s=initialState(m),force=gravitationalForces(m,s).probe;
  near(force.x,-G*M*r/Math.max(R,r)**3,1e-11);near(force.y,0);const f=potentials.scalarField(m,s,context(m,s),'gravity');near(f.at(r,0),gravityPotential(M,R,r),1e-8);
  const h=1e-4;near(-(f.at(r+h,0)-f.at(r-h,0))/(2*h),force.x,1e-4);
 }
 near(gravityPotential(M,R,R-1e-6),gravityPotential(M,R,R+1e-6),.0001);
});
test('Planetary masses validate, evaluate and give Earth surface acceleration; source switch retains response',()=>{
 const m=emptyModel();m.bodies=[{...newBody('earth'),mass:5.9722e24,x:0,y:0,gravityRadius:6371000,gravityEnabled:true},{...newBody('probe'),motion:'force',x:6371000,y:0}];m.quantities=[{id:'mass',label:'Масса',unit:'кг',expression:'earth_m'}];validatePhysics(validateModel(m));const s=initialState(m);near(context(m,s).mass,5.9722e24,1);near(-gravitationalForces(m,s).probe.x,9.820302293385645,1e-10);
 m.bodies[0].gravityEnabled=false;near(gravitationalForces(m,s).probe.x,0);m.bodies[0].gravityEnabled=true;m.bodies[1].gravityEnabled=false;assert.ok(gravitationalForces(m,s).probe.x<0);
 m.bodies[0].mass=1e31;assert.throws(()=>validateModel(m),/массу/);assert.throws(()=>evaluate('1e101',{}),/диапазона/);
});
test('Uniform-sphere tunnel: analytic harmonic period and conserved energy, centre crossing has no singularity',t=>{
 const m=gravityLesson();m.bodies[1].x=50;m.dt=.05;let s=initialState(m),start=context(m,s).energy,error=0,maxX=0;
 const omega=Math.sqrt(G*m.bodies[0].mass/100**3);for(let i=0;i<2400;i++){s=step(m,s);error=Math.max(error,Math.abs(context(m,s).energy-start));maxX=Math.max(maxX,Math.abs(s.bodies.probe.x-50*Math.cos(omega*s.t)));}
 assert.ok(error<.003&&maxX<.001,`${error}, ${maxX}`);t.diagnostic(`120 s: max energy error ${error} J; max position error ${maxX} m`);
});
test('Falling through sphere surface and centre preserves total energy over the complete lesson',t=>{
 const m=gravityLesson();let s=initialState(m),energy=context(m,s).energy,error=0,minR=Infinity,maxR=0;for(let i=0;i<3000;i++){s=step(m,s);const c=context(m,s);error=Math.max(error,Math.abs(c.energy-energy)/Math.abs(energy));minR=Math.min(minR,c.r);maxR=Math.max(maxR,c.r);}
 assert.ok(minR<1&&maxR>200&&error<1e-4,`${minR}, ${maxR}, ${error}`);t.diagnostic(`30 s with surface crossings: relative max energy error ${error}`);
});
test('Two uniform sources plus external gravity: acceleration matches summed potential gradient',()=>{
 const m=gravityLesson();m.quantities=[];m.graphs=[];m.bodies.push({...newBody('second'),x:60,y:40,mass:2e15,gravityEnabled:true,gravityRadius:80});m.bodies[1].x=20;m.bodies[1].y=10;m.fields=[{...newField('external'),gx:'2',gy:'-3',show:false}];const s=initialState(m),c=context(m,s),f=potentials.scalarField(m,s,c,'gravity'),F=interactions.componentForces(m,s,c).probe,h=1e-4;
 near(-(f.at(20+h,10)-f.at(20-h,10))/(2*h),F.x,1e-6);near(-(f.at(20,10+h)-f.at(20,10-h))/(2*h),F.y,1e-6);
});
test('Radius and source-state formula variables survive rename and prevent misleading gravity readouts',()=>{
 const m=gravityLesson();let s=initialState(m);near(context(m,s).g,G*6e15/250**2);m.bodies[0].gravityRadius=300;near(context(m,initialState(m)).g,G*6e15*250/300**3);m.bodies[0].gravityEnabled=false;const c=context(m,initialState(m));near(c.g,0);near(c.potential,0);
 renameReferences(m,'sphere','planet',true);m.bodies[0].id='planet';assert.doesNotThrow(()=>validatePhysics(validateModel(m)));assert.match(m.quantities[1].expression,/planet_R/);assert.match(m.quantities[1].expression,/planet_gravity/);
 m.parameters.push({id:'planet_R',label:'Конфликт',value:1,min:0,max:2,unit:''});assert.throws(()=>validateModel(m),/совпадает/);
});
test('Moving extended gravity sources and invalid graph axes reject explicitly; old models retain point semantics',()=>{
 const m=gravityLesson();m.bodies[0].motion='force';assert.throws(()=>validateModel(m),/неподвижным/);m.bodies[0].motion='fixed';m.graphs[0].minY=400;assert.throws(()=>validateModel(m),/больше/);m.graphs[0].minY=-300;delete m.bodies[0].gravityRadius;assert.doesNotThrow(()=>validatePhysics(validateModel(m)));
});
test('Gravity sphere radius is drawn in physical scale; zoom keeps equal axes and does not alter state',async()=>{
 const rt=await renderRuntime(),m=gravityLesson(),s=initialState(m),before=structuredClone(s);const read=html=>Number(html.match(/data-gravity-sphere="sphere"><circle[^>]* r="([^"]+)"/)[1]);let tr=camera.sceneTransform(m.scene),r=read(rt.render(m,s));near(r,100*tr.scale);m.scene.camera=camera.zoomCamera(m.scene,2);near(read(rt.render(m,s)),r*2);assert.deepEqual(s,before);m.bodies[0].gravityEnabled=false;assert.match(rt.render(m,s),/data-gravity-sphere="sphere"/);assert.doesNotMatch(rt.render(m,s),/data-gravity-field/);
});
test('Fixed graph axes persist across prefixes and outliers; tiny auto-scaled signals remain visible',async()=>{
 const rt=await renderRuntime(),m=gravityLesson(),g=m.graphs[0],a=initialState(m),b=structuredClone(a);b.t=1;b.bodies.probe.x=1200;for(const history of [[a],[a,b]]){const out=rt.graph(m,history,g);assert.match(out,/data-graph-min="-300" data-graph-max="300" data-graph-scale="fixed"/);assert.match(out,/clip-path="url\(#graphClip0\)"/);assert.match(out,/Масштаб фиксирован/);}
 const tiny={id:'tiny',label:'Малый сигнал',unit:'',expression:'probe_x*1e-9'},html=rt.graph(m,[a,b],tiny);const hi=Number(html.match(/data-graph-max="([^"]+)"/)[1]);assert.ok(hi<2e-6&&hi>1e-6);assert.match(html,/Автомасштаб/);g.maxY=g.minY;assert.match(rt.graph(m,[a],g),/role="alert"/);
});
test('Contour cache invalidates on source position, source toggle, external values, camera and source radius',async()=>{
 const rt=await renderRuntime(),m=gravityLesson();let s=initialState(m),c=context(m,s),tr=camera.sceneTransform(m.scene),first=rt.render(m,s);assert.equal(rt.render(m,s),first);
 m.bodies[0].mass*=2;assert.notEqual(rt.render(m,s),first);m.bodies[0].mass/=2;m.bodies[0].gravityRadius=200;assert.notEqual(rt.render(m,s),first);m.bodies[0].gravityRadius=100;s.bodies.sphere.x=15;assert.notEqual(rt.render(m,s),first);
 const electric=emptyModel();electric.bodies=[{...newBody('source','charge'),x:0,y:0}];electric.fields=[{...newField('external','electric'),ex:'E'}];electric.parameters=[{id:'E',label:'E',value:0,min:0,max:100,unit:''}];s=initialState(electric);tr=camera.sceneTransform(electric.scene);first=rt.electric(electric,s,tr,false,context(electric,s));electric.parameters[0].value=100;assert.notEqual(rt.electric(electric,s,tr,false,context(electric,s)),first);electric.bodies[0].fieldEnabled=false;assert.notEqual(rt.electric(electric,s,tr,false,context(electric,s)),first);electric.scene.camera=camera.zoomCamera(electric.scene,2);assert.notEqual(rt.electric(electric,s,camera.sceneTransform(electric.scene),false,context(electric,s)),first);
});
test('Magnetic map evaluates expressions once per field, preserves nonzero origin and time-dependent superposition',async()=>{
 const rt=await renderRuntime(),m=emptyModel();m.fields=[{...newField('gradient','magnetic-gradient'),b0:'t+2',bxGradient:'3',byGradient:'-1',originX:'5',originY:'2'},{...newField('uniform','magnetic'),bz:'4'}];let s=initialState(m),tr=camera.sceneTransform(m.scene),first=rt.magnetic(m,s,context(m,s),tr);s.t=1;let second=rt.magnetic(m,s,context(m,s),tr);assert.notEqual(first,second);assert.doesNotMatch(second,/NaN|Infinity/);
 for(const [,level,path]of first.matchAll(/data-potential-level="([^"]+)" data-contour-kind="magnetic" d="([^"]+)"/g))for(const [,px,py]of path.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)){const x=tr.r.minX+(Number(px)-tr.ox)/tr.scale,y=tr.r.maxY-(Number(py)-tr.oy)/tr.scale;near(2+3*(x-5)-(y-2)+4,Number(level),.001);}
});
test('Orbit lesson energy follows edited source mass, position, radius and source switch',()=>{
 const m=fieldExamples()[0];m.bodies[0].mass=2e7;let s=initialState(m),c=context(m,s);near(c.energy,(s.bodies.probe.vy**2)/2-G*2e7/.5,1e-12);m.bodies[0].x=.1;near(context(m,initialState(m)).radius,.4);m.bodies[0].gravityRadius=1;c=context(m,initialState(m));near(c.energy,(s.bodies.probe.vy**2)/2+gravityPotential(2e7,1,.4),1e-12);m.bodies[0].gravityEnabled=false;near(context(m,initialState(m)).energy,(s.bodies.probe.vy**2)/2,1e-12);
});
test('Standalone sphere lesson preserves physical radius, source controls, fixed axes and source-dependent measurements',async()=>{
 const root=new URL('../',import.meta.url),source=(await fs.readFile(new URL('web/standalone.js',root),'utf8')).replace(/^import[^\n]*\n/gm,'').replace('export async function','async function'),generator={esc:String,fetch:async url=>({ok:true,text:()=>fs.readFile(new URL(url.startsWith('/lib/')?url.slice(1):'web/'+url.slice(1),root),'utf8')})};vm.createContext(generator);vm.runInContext(source+'\nglobalThis.generate=standaloneHTML;',generator);const html=await generator.generate(gravityLesson()),nodes=new Map(),rt={structuredClone,performance:{now:()=>0},requestAnimationFrame(){},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'1'});return nodes.get(id);},addEventListener(){}}};vm.createContext(rt);vm.runInContext(html.match(/<script>([\s\S]*)<\/script>/)[1],rt);
 assert.match(nodes.get('graphs').innerHTML,/data-graph-scale="fixed"/);assert.match(nodes.get('scene').innerHTML,/data-gravity-sphere="sphere"/);nodes.get('step').onclick();const time=nodes.get('time').textContent;nodes.get('layers').onchange({target:{dataset:{layer:'gravity'},checked:false}});assert.equal(nodes.get('time').textContent,time);nodes.get('controls').onchange({target:{dataset:{gravitySource:'sphere'},checked:false}});assert.equal(nodes.get('time').textContent,'t = 0 с');assert.equal(vm.runInContext('context(model,sim).g',rt),0);assert.doesNotMatch(nodes.get('scene').innerHTML,/NaN|Infinity/);assert.doesNotMatch(html,/<script[^>]*\bsrc=/);
});
