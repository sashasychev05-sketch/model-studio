import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {C_LIGHT} from '../lib/relativity.js';
import {newField,newConnection} from '../lib/components.js';
import {initialState,step,context,validatePhysics} from '../lib/engine.js';
import {renameReferences} from '../lib/authoring.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function model(){return {...emptyModel(),physics:{mode:'relativistic'},duration:.2,bodies:[{...newBody('p'),name:'Частица',x:0,y:0,motion:'force',fieldEnabled:false}]};}
test('Relativistic free motion preserves momentum, mass shell and proper time at 0.8 c',()=>{
 const m=model();m.bodies[0].vx=.8*C_LIGHT;validatePhysics(validateModel(m));let s=initialState(m);for(let i=0;i<20;i++)s=step(m,s,.01);const c=context(m,s);near(c.p_gamma,5/3);near(c.p_beta,.8);near(c.p_tau,.12);near(s.bodies.p.x,.16*C_LIGHT);near(c.p_px,5/3*.8*C_LIGHT);near((c.p_energy/C_LIGHT**2)**2-(c.p_px/C_LIGHT)**2,1);near(c.p_Ek,2/3*C_LIGHT**2);const bound=structuredClone(m);bound.parameters=[{id:'speed',label:'Скорость',unit:'м/с',min:0,max:.9*C_LIGHT,value:.6*C_LIGHT,binding:{body:'p',property:'vx'}}];const checked=validateModel(bound);near(context(checked,initialState(checked)).p_beta,.6);bound.bodies[0].mass=1e-31;bound.parameters=[{id:'M',label:'Масса',unit:'кг',min:1e-32,max:1e-30,value:1e-31,binding:{body:'p',property:'mass'}}];validatePhysics(validateModel(bound));assert.ok(Math.hypot(s.bodies.p.vx,s.bodies.p.vy)<C_LIGHT);
});
test('Constant laboratory force agrees with analytical momentum, hyperbolic motion and proper time',()=>{
 const m=model();m.bodies[0].fx=String(3*C_LIGHT);let s=initialState(m);for(let i=0;i<20;i++)s=step(m,s,.01);const c=context(m,s),gamma=Math.hypot(1,.6);near(c.p_px,.6*C_LIGHT,1e-10);near(c.p_gamma,gamma);near(s.bodies.p.x,C_LIGHT*(gamma-1)/3);near(c.p_tau,Math.asinh(.6)/3);near(c.p_beta,.6/gamma);
});
test('Magnetic Lorentz force preserves speed and energy and gives the relativistic cyclotron radius',()=>{
 const m=model();Object.assign(m.bodies[0],{vx:.8*C_LIGHT,charge:1});m.fields=[{...newField('B','magnetic'),bz:'30'}];validatePhysics(validateModel(m));let s=initialState(m);for(let i=0;i<100;i++)s=step(m,s,.001);const c=context(m,s),omega=18,r=.8*C_LIGHT/omega;near(c.p_beta,.8,1e-9);near(c.p_gamma,5/3,1e-8);near(s.bodies.p.x,r*Math.sin(omega*.1),1e-8);near(s.bodies.p.y,r*(Math.cos(omega*.1)-1),1e-8);near(c.p_tau,.06,1e-8);
});
test('Electric and spatially defined external force fields add and obey selected targets',()=>{
 const m=model();m.bodies[0].charge=2;m.fields=[{...newField('E','electric'),ex:'3',ey:'0'},{...newField('force','custom-force'),fx:'2*x+4',fy:'-vy'},{...newField('ignored','custom-force'),all:false,targets:[],fx:'10000',fy:'0'}];validatePhysics(validateModel(m));const s=step(m,initialState(m),.01);near(s.bodies.p.px,.1000033333666668,1e-7);assert.equal(s.bodies.p.py,0);assert.ok(context(m,s).p_Ek>0);
});
test('Newtonian low-speed limit and tiny kinetic energies retain numerical precision',()=>{
 const m=model();m.bodies[0].mass=2;m.bodies[0].fx='4';const classic=structuredClone(m);delete classic.physics;let a=initialState(m),b=initialState(classic);for(let i=0;i<100;i++){a=step(m,a,.01);b=step(classic,b,.01);}near(a.bodies.p.x,b.bodies.p.x,1e-10);near(a.bodies.p.vx,b.bodies.p.vx,1e-10);near(context(m,a).p_Ek,4,1e-10);
});
test('Slow particles in strong and rapidly varying magnetic fields keep energy with bounded internal steps',()=>{
 const m=model();Object.assign(m.bodies[0],{vx:300,charge:1});m.fields=[{...newField('B','magnetic'),bz:'1000'}];let s=initialState(m);for(let i=0;i<20;i++)s=step(m,s,.001);near(s.bodies.p.x,.3*Math.sin(20),1e-7);near(s.bodies.p.y,.3*(Math.cos(20)-1),1e-7);near(context(m,s).p_Ek,45000,1e-7);
 m.bodies[0].vx=100;m.fields=[{...newField('B','magnetic-gradient'),b0:'0',bxGradient:'1000',byGradient:'0',originX:'0',originY:'0'}];s=initialState(m);for(let i=0;i<10;i++)s=step(m,s,.01);near(context(m,s).p_Ek,5000,1e-6);
});
test('Relativistic validation rejects superluminal states, nonlocal interactions and invalid modes',()=>{
 const m=model();for(const mutate of [n=>n.bodies[0].vx=C_LIGHT,n=>n.bodies[0].motion='formula',n=>n.bodies[0].gravityEnabled=true,n=>n.fields=[newField('g')],n=>n.bodies[0].fx='other_x',n=>n.physics.mode='general']){const n=structuredClone(m);mutate(n);assert.throws(()=>validatePhysics(validateModel(n)));}
 const n=structuredClone(m);n.bodies.push({...newBody('b'),x:2});n.connections=[newConnection('link','p','b')];assert.throws(()=>validatePhysics(validateModel(n)),/связи/);n.connections[0].enabled=false;validatePhysics(validateModel(n));
 m.bodies[0].vx=.8*C_LIGHT;m.quantities=[{id:'clock',label:'Часы',expression:'p_tau',unit:'с'}];renameReferences(m,'p','beam',true);m.bodies[0].id='beam';validatePhysics(validateModel(m));assert.equal(m.quantities[0].expression,'beam_tau');
});
