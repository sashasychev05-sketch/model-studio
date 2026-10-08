import * as teachingFunctions from '../lib/teaching.js';
import * as measurementFunctions from '../lib/measurements.js';
import {auditModel} from '../lib/audit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {newField} from '../lib/components.js';
import {initialState,step,context,validatePhysics} from '../lib/engine.js';
import * as potentials from '../lib/field-potential.js';
import * as electro from '../lib/electrostatics.js';
import {GRAVITATIONAL_G,gravitationalForces} from '../lib/gravity.js';
import {componentForces,fieldValues} from '../lib/interaction.js';
import {sceneTransform} from '../lib/camera.js';
import {fieldExamples} from '../lib/field-examples.js';
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}; ${tol}`);
const body=(id,x=0,extra={})=>({...newBody(id),x,y:0,motion:'force',...extra});
test('Combined electric potential includes hidden external sources; −∇φ matches force',()=>{
 const m=emptyModel();m.bodies=[body('source',-1,{motion:'fixed',charge:1e-6}),body('probe',1,{charge:2e-6,fieldEnabled:false})];m.fields=[{...newField('E','electric'),ex:'700',ey:'-50',show:false}];
 const s=initialState(m),c=context(m,s),f=potentials.scalarField(m,s,c),p=s.bodies.probe,h=1e-5,F=componentForces(m,s,c).probe;
 near(-(f.at(p.x+h,p.y)-f.at(p.x-h,p.y))/(2*h)*2e-6,F.x,1e-11);near(-(f.at(p.x,p.y+h)-f.at(p.x,p.y-h))/(2*h)*2e-6,F.y,1e-11);
 const original=f.at(2,1);m.scene.camera={x:200,y:-200,zoom:30};near(potentials.scalarField(m,s,c).at(2,1),original);assert.deepEqual(potentials.scalarField(m,s,c).levels,f.levels);
 m.fields[0].all=false;m.fields[0].targets=['probe'];const scoped=potentials.scalarField(m,s,c);assert.equal(scoped.vector.excluded,1);near(scoped.at(2,1),electro.chargePotential(scoped.sources,2,1));
});
test('Electric-only uniform field has straight nonempty equipotentials and superposes',()=>{
 const m=emptyModel();m.fields=[{...newField('E1','electric'),ex:'2',ey:'0'},{...newField('E2','electric'),ex:'0',ey:'3'}];const s=initialState(m),f=potentials.scalarField(m,s,context(m,s));assert.equal(f.active,true);near(f.at(f.origin.x+1,f.origin.y+2),-8);
 const contours=electro.potentialContours([],m.scene,[0],60,40,(_,x,y)=>f.at(x,y));assert.ok(contours[0].segments.length>20);for(const [x,y,a,b] of contours[0].segments){near(f.at(x,y),0);near(f.at(a,b),0);}
});
test('Gravity attraction scales with masses/r²; source switch retains response and no self force',()=>{
 const m=emptyModel();m.bodies=[body('a',-1,{mass:3,gravityEnabled:true}),body('b',1,{mass:5,gravityEnabled:true})];let s=initialState(m),f=gravitationalForces(m,s);near(f.a.x,GRAVITATIONAL_G*15/4,1e-20);near(f.a.x,-f.b.x,1e-20);m.bodies[1].x=3;near(gravitationalForces(m,initialState(m)).a.x,f.a.x/4,1e-20);
 m.bodies[0].gravityEnabled=false;f=gravitationalForces(m,initialState(m));assert.ok(f.a.x>0);assert.equal(f.b.x,0);m.bodies.length=1;assert.deepEqual(gravitationalForces(m,initialState(m)).a,{x:0,y:0});
});
test('Gravity summed potential gradient agrees with acceleration including uniform g',()=>{
 const m=fieldExamples()[0];m.fields=[{...newField('earth'),gx:'.02',gy:'-.03'}];let s=initialState(m),c=context(m,s),f=potentials.scalarField(m,s,c,'gravity'),p=s.bodies.probe,h=1e-5,F=componentForces(m,s,c).probe;
 near(-(f.at(p.x+h,p.y)-f.at(p.x-h,p.y))/(2*h),F.x,1e-10);near(-(f.at(p.x,p.y+h)-f.at(p.x,p.y-h))/(2*h),F.y,1e-10);
});
test('Gravitational circular orbit preserves radius, energy and angular momentum through a full period',t=>{
 const m=fieldExamples()[0];validatePhysics(validateModel(m));let s=initialState(m),maxR=0,maxE=0,maxL=0;const mu=GRAVITATIONAL_G*1e7,v=Math.sqrt(mu/.5),E=-mu,r=.5,L=r*v;
 for(let i=0;i<10000;i++){s=step(m,s);const b=s.bodies.probe,d=Math.hypot(b.x,b.y);maxR=Math.max(maxR,Math.abs(d-r));maxE=Math.max(maxE,Math.abs((b.vx*b.vx+b.vy*b.vy)/2-mu/d-E));maxL=Math.max(maxL,Math.abs(b.x*b.vy-b.y*b.vx-L));}
 assert.ok(maxR<1e-9&&maxE<1e-12&&maxL<1e-12);t.diagnostic(`100 с: Δr=${maxR}, ΔE=${maxE}, ΔL=${maxL}`);
});
test('Inhomogeneous Lorentz force is local and perpendicular; long motion conserves kinetic energy',()=>{
 const m=fieldExamples()[1];validatePhysics(validateModel(m));let s=initialState(m);s.bodies.particle.x=2;s.bodies.particle.vy=3;const F=componentForces(m,s,context(m,s)).particle;near(F.x,6);near(F.y,-4);near(F.x*2+F.y*3,0);
 s=initialState(m);for(let i=0;i<3000;i++)s=step(m,s);near((s.bodies.particle.vx**2+s.bodies.particle.vy**2)/2,2,1e-7);
});
test('Field layers alter only drawings; magnetic map superposes and cancellation becomes one vector',async()=>{
 const src=(await fs.readFile(new URL('../web/field-drawing.js',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const)\b)/g,'');const runtime={...potentials,...electro,fieldValues};vm.createContext(runtime);vm.runInContext(src+'\nglobalThis.draw=magneticFieldSVG;globalThis.electric=chargeFieldSVG;',runtime);
 const m=fieldExamples()[1],s=initialState(m),tr=sceneTransform(m.scene),c=context(m,s);m.fields.push({...newField('opposite','magnetic-gradient'),b0:'1',bxGradient:'-.5',byGradient:'0'});
 let out=runtime.draw(m,s,c,tr);assert.equal((out.match(/data-field-vector/g)??[]).length,1);assert.doesNotMatch(out,/data-potential-level/);m.fields[1].bxGradient='0';out=runtime.draw(m,s,c,tr);assert.match(out,/data-contour-kind="magnetic"/);assert.match(out,/data-potential-level="2"/);
 const boxes=[...out.matchAll(/<g data-potential-label="[^"]+"[^>]*><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)].map(x=>x.slice(1).map(Number));assert.ok(boxes.length>1);for(const [i,a]of boxes.entries()){assert.ok(a[0]>=tr.ox&&a[0]+a[2]<800-tr.ox);for(const b of boxes.slice(i+1))assert.ok(a[0]+a[2]<b[0]||b[0]+b[2]<a[0]||a[1]+a[3]<b[1]||b[1]+b[3]<a[1],'Contour labels overlap');}
 const before=step(m,s);m.scene.fieldLayers.magnetic=false;assert.equal(runtime.draw(m,s,c,tr),'');assert.deepEqual(step(m,s),before);
 m.fields=[{...newField('uniform','electric'),ex:'2'}];m.scene.fieldLayers.electric=true;assert.match(runtime.electric(m,s,tr,false,c),/data-potential-level/);m.scene.fieldLayers.electric=false;assert.equal(runtime.electric(m,s,tr,false,c),'');
});
test('Native examples validate and new flags reject wrong types',()=>{
 for(const m of fieldExamples())assert.doesNotThrow(()=>validatePhysics(validateModel(m)));const m=fieldExamples()[0];m.bodies[0].gravityEnabled='yes';assert.throws(()=>validateModel(m),/гравитационного/);m.bodies[0].gravityEnabled=true;m.scene.fieldLayers.electric='yes';assert.throws(()=>validateModel(m),/слой поля/);
});
test('Fast crossing of zero magnetic induction subdivides by spatial gradient and preserves energy',()=>{
 const m=fieldExamples()[1];m.dt=.05;m.bodies[0].vx=100;m.parameters[0].value=0;m.parameters[1].value=2;let s=initialState(m),error=0;for(let i=0;i<100;i++){s=step(m,s);const b=s.bodies.particle;error=Math.max(error,Math.abs((b.vx*b.vx+b.vy*b.vy)/2-5000)/5000);}assert.ok(error<1e-5,`Relative energy drift ${error}`);
 m.fields.push({...newField('opposite','magnetic-gradient'),b0:'-B',bxGradient:'-gradient',byGradient:'0'});const straight=step(m,initialState(m));near(straight.bodies.particle.x,5);near(straight.bodies.particle.vx,100);near(straight.bodies.particle.vy,0);
});
test('Mutually gravitating free bodies conserve momentum, angular momentum and energy',()=>{
 const m=emptyModel(),M=1e7,mu=GRAVITATIONAL_G*M,v=Math.sqrt(mu/4);m.bodies=[body('a',-1,{mass:M,gravityEnabled:true,vy:-v}),body('b',1,{mass:M,gravityEnabled:true,vy:v})];let s=initialState(m);for(let i=0;i<10000;i++)s=step(m,s);const a=s.bodies.a,b=s.bodies.b;
 near(M*(a.vx+b.vx),0,1e-7);near(M*(a.vy+b.vy),0,1e-7);near(M*(a.x*a.vy-a.y*a.vx+b.x*b.vy-b.y*b.vx),2*M*v,1e-6);near(M*(a.vx*a.vx+a.vy*a.vy+b.vx*b.vx+b.vy*b.vy)/2-GRAVITATIONAL_G*M*M/Math.hypot(a.x-b.x,a.y-b.y),-M*mu/4,1e-6);
});
test('Small physical quantities remain readable rather than rounding to zero',async()=>{
 const src=(await fs.readFile(new URL('../web/scene.js',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const)\b)/g,'');const rt={};vm.createContext(rt);vm.runInContext(src+'\nglobalThis.format=fmt;',rt);assert.match(rt.format(-.00066743),/−|-6,674/);assert.match(rt.format(1e-6),/10⁻⁶/);assert.equal(rt.format(0),'0');assert.equal(rt.format(.01),'0,01');
});
test('Offline native field lessons include maps and layer switches; gravity source configuration stays in the editor',async()=>{
 const root=new URL('../',import.meta.url),source=(await fs.readFile(new URL('web/standalone.js',root),'utf8')).replace(/^import[^\n]*\n/gm,'').replace('export async function','async function'),generator={esc:String,fetch:async url=>({ok:true,text:()=>fs.readFile(new URL(url.startsWith('/lib/')?url.slice(1):'web/'+url.slice(1),root),'utf8')})};vm.createContext(generator);vm.runInContext(source+'\nglobalThis.generate=standaloneHTML;',generator);
 for(const m of fieldExamples()){const html=await generator.generate(m);assert.doesNotMatch(html,/<script[^>]*\bsrc=/);const nodes=new Map(),runtime={structuredClone,performance:{now:()=>0},requestAnimationFrame(){},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'1'});return nodes.get(id);},addEventListener(){}}};vm.createContext(runtime);vm.runInContext(html.match(/<script>([\s\S]*)<\/script>/)[1],runtime);assert.match(nodes.get('layers').innerHTML,/data-layer="magnetic"/);nodes.get('step').onclick();const t=nodes.get('time').textContent;nodes.get('layers').onchange({target:{dataset:{layer:'gravity'},checked:false}});assert.equal(nodes.get('time').textContent,t);
  if(m.bodies.some(b=>b.gravityEnabled)){assert.doesNotMatch(nodes.get('controls').innerHTML,/data-gravity-source/);assert.equal(vm.runInContext('model.bodies[0].gravityEnabled',runtime),true);}
  assert.doesNotMatch(nodes.get('scene').innerHTML,/NaN|Infinity|undefined/);
 }
});
