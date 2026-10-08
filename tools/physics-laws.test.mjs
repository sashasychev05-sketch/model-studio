import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {newField,newConnection} from '../lib/components.js';
import {initialState,step,validatePhysics} from '../lib/engine.js';
import {COULOMB_K} from '../lib/electrostatics.js';

const body=(id,values={})=>({...newBody(id),motion:'force',x:0,y:0,trail:false,...values});
function run(m,seconds,observe=()=>{}){
 validatePhysics(validateModel(m));let s=initialState(m);observe(s);
 const count=Math.round(seconds/m.dt);for(let i=0;i<count;i++){s=step(m,s);observe(s);}return s;
}
function near(actual,expected,tolerance,message){assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} ≠ ${expected}; допуск ${tolerance}`);}

test('Закон падения: траектория и скорость одинаковы для разных масс',t=>{
 const m=emptyModel();m.bodies=[body('light',{mass:.1,x:1,y:8,vx:3,vy:2}),body('heavy',{mass:100,x:1,y:8,vx:3,vy:2})];m.fields=[newField('earth')];
 const s=run(m,4),p=s.bodies.light,q=s.bodies.heavy;
 near(p.x,13,1e-10,'x=x₀+vₓt');near(p.y,8+2*4-9.81*16/2,1e-9,'y=y₀+vᵧt−gt²/2');near(p.vy,2-9.81*4,1e-10,'vᵧ=v₀−gt');
 for(const key of ['x','y','vx','vy'])near(p[key],q[key],1e-10,'Независимость от массы');
 t.diagnostic('4 с; массы 0.1 и 100 кг; ошибки координат < 10⁻⁹ м.');
});
test('Сопротивление среды: аналитическая скорость падения и предельная скорость',t=>{
 const m=emptyModel(),mass=2,c=3,g=9.81,tau=mass/c;m.bodies=[body('fall',{mass,y:20,vy:4})];m.fields=[newField('earth'),{...newField('air','drag'),drag:String(c)}];
 let error=0;run(m,12,s=>{const expected=-mass*g/c+(4+mass*g/c)*Math.exp(-s.t/tau);error=Math.max(error,Math.abs(s.bodies.fall.vy-expected));
  const y=20-mass*g/c*s.t+(4+mass*g/c)*tau*(1-Math.exp(-s.t/tau));near(s.bodies.fall.y,y,1e-8,'Координата с сопротивлением');});
 assert.ok(error<1e-8);t.diagnostic(`12 с; максимальная ошибка скорости ${error.toExponential(2)} м/с; предел −mg/c = −6.54 м/с.`);
});
test('Затухающая пружина: аналитическое решение и убывание механической энергии',t=>{
 const m=emptyModel(),mass=2,k=18,c=1.2,decay=c/(2*mass),w=Math.sqrt(k/mass-decay**2);
 m.bodies=[{...body('anchor'),motion:'fixed'},body('bob',{x:3,mass})];m.connections=[{...newConnection('spring','anchor','bob','spring',2),stiffness:String(k),damping:String(c)}];
 let error=0,last=Infinity;run(m,10,s=>{const b=s.bodies.bob,expected=2+Math.exp(-decay*s.t)*(Math.cos(w*s.t)+decay/w*Math.sin(w*s.t));
  error=Math.max(error,Math.abs(b.x-expected));const energy=mass*b.vx**2/2+k*(b.x-2)**2/2;assert.ok(energy<=last+1e-10,'Пассивное сопротивление не добавляет энергию');last=energy;});
 assert.ok(error<1e-7);t.diagnostic(`10 с; максимальная ошибка координаты ${error.toExponential(2)} м.`);
});
test('Скрещённые E и B: аналитическая циклоида, знак заряда и дрейф',t=>{
 for(const charge of [1,-1]){
  const m=emptyModel();m.dt=.005;m.bodies=[body('particle',{mass:2,charge})];m.fields=[{...newField('electric','electric'),ex:'3',ey:'0'},{...newField('magnetic','magnetic'),bz:'2'}];
  const omega=charge,drift=1.5;let error=0;
  run(m,8,s=>{const b=s.bodies.particle,ref={vx:drift*Math.sin(omega*s.t),vy:drift*(Math.cos(omega*s.t)-1),x:drift/omega*(1-Math.cos(omega*s.t)),y:drift/omega*Math.sin(omega*s.t)-drift*s.t};
   for(const key of ['x','y','vx','vy'])error=Math.max(error,Math.abs(b[key]-ref[key]));});
  assert.ok(error<1e-8);t.diagnostic(`q=${charge} Кл; 8 с; максимальная ошибка ${error.toExponential(2)}.`);
 }
});
test('Центральное кулоновское поле: круговая орбита, энергия и момент импульса',t=>{
 const m=emptyModel();m.dt=.005;const q=1/Math.sqrt(COULOMB_K);m.bodies=[{...body('source',{charge:q}),motion:'fixed'},body('orbit',{x:2,vy:Math.sqrt(.5),charge:-q})];
 const initialEnergy=-.25,initialAngular=Math.sqrt(2),omega=Math.sqrt(.5)/2;let energyError=0,angularError=0,positionError=0;
 run(m,36,s=>{const b=s.bodies.orbit,r=Math.hypot(b.x,b.y);energyError=Math.max(energyError,Math.abs((b.vx**2+b.vy**2)/2-1/r-initialEnergy));angularError=Math.max(angularError,Math.abs(b.x*b.vy-b.y*b.vx-initialAngular));positionError=Math.max(positionError,Math.hypot(b.x-2*Math.cos(omega*s.t),b.y-2*Math.sin(omega*s.t)));});
 assert.ok(energyError<1e-9);assert.ok(angularError<1e-9);assert.ok(positionError<1e-7);t.diagnostic(`36 с; ΔE ≤ ${energyError.toExponential(2)} Дж; ΔL ≤ ${angularError.toExponential(2)} кг·м²/с; ошибка орбиты ${positionError.toExponential(2)} м.`);
});
test('Двумерная пара тел на пружине: импульс, момент импульса и энергия',t=>{
 const m=emptyModel();m.dt=.005;m.bodies=[body('a',{mass:2,x:-1.2,y:-.9,vx:.2,vy:-.3}),body('b',{mass:3,x:1.2,y:.9,vx:-.1,vy:.4})];m.connections=[{...newConnection('spring','a','b','spring',2),stiffness:'4'}];
 const invariants=s=>{const a=s.bodies.a,b=s.bodies.b;return [2*a.vx+3*b.vx,2*a.vy+3*b.vy,2*(a.x*a.vy-a.y*a.vx)+3*(b.x*b.vy-b.y*b.vx),(2*(a.vx**2+a.vy**2)+3*(b.vx**2+b.vy**2))/2+2*(Math.hypot(b.x-a.x,b.y-a.y)-2)**2];};
 const before=invariants(initialState(m)),errors=[0,0,0,0];run(m,20,s=>invariants(s).forEach((v,i)=>errors[i]=Math.max(errors[i],Math.abs(v-before[i]))));
 assert.ok(errors.slice(0,3).every(v=>v<1e-8));assert.ok(errors[3]<1e-7);t.diagnostic(`20 с; максимальные Δpₓ, Δpᵧ, ΔL, ΔE: ${errors.map(v=>v.toExponential(2)).join(', ')}.`);
});
test('Малые колебания маятника: период 2π√(L/g) и точность при уменьшении шага',t=>{
 const length=2,g=9.81,amplitude=.01,period=2*Math.PI*Math.sqrt(length/g),values=[];
 for(const dt of [.02,.01]){const m=emptyModel();m.dt=dt;m.bodies=[{...body('pivot'),motion:'fixed'},body('bob',{x:length*Math.sin(amplitude),y:-length*Math.cos(amplitude)})];m.connections=[newConnection('rope','pivot','bob','rope',length)];m.fields=[newField('earth')];let previous=initialState(m),crossing=null,maxEnergy=0;const energy0=g*previous.bodies.bob.y;
  run(m,6,s=>{const b=s.bodies.bob;if(crossing===null&&previous.bodies.bob.x>0&&b.x<=0){const fraction=previous.bodies.bob.x/(previous.bodies.bob.x-b.x);crossing=previous.t+fraction*(s.t-previous.t);}maxEnergy=Math.max(maxEnergy,Math.abs((b.vx**2+b.vy**2)/2+g*b.y-energy0));previous=s;});
  near(crossing*4,period,3e-5,'Период малых колебаний');values.push(maxEnergy);}
 assert.ok(values[1]<values[0]);t.diagnostic(`T≈${period.toFixed(5)} с; допуск 3·10⁻⁵ с (малый угол); ошибки энергии при шагах 0.02/0.01: ${values.map(v=>v.toExponential(2)).join(' / ')} Дж.`);
});
test('Сильное магнитное поле при максимальном шаге не меняет кинетическую энергию',t=>{
 const m=emptyModel();m.dt=.05;m.bodies=[body('particle',{charge:1,vx:2})];m.fields=[{...newField('magnetic','magnetic'),bz:'20'}];let energyError=0,coordinateError=0;
 run(m,10,s=>{const b=s.bodies.particle;energyError=Math.max(energyError,Math.abs((b.vx**2+b.vy**2)/2-2));coordinateError=Math.max(coordinateError,Math.hypot(b.x-.1*Math.sin(20*s.t),b.y-.1*(Math.cos(20*s.t)-1)));});
 assert.ok(energyError<1e-4,`Магнитное поле не совершает работу: ошибка ${energyError}`);assert.ok(coordinateError<5e-5);t.diagnostic(`B=20 Тл, q=m=1; 10 с, внешний шаг 0.05 с; ΔE=${energyError.toExponential(2)} Дж; ошибка координаты ${coordinateError.toExponential(2)} м.`);
});
test('Жёсткая пружина при максимальном шаге сохраняет энергию и период',t=>{
 const m=emptyModel();m.dt=.05;m.bodies=[{...body('anchor'),motion:'fixed'},body('bob',{x:3})];m.connections=[{...newConnection('spring','anchor','bob','spring',2),stiffness:'1600'}];let error=0,energyError=0;
 run(m,4,s=>{const b=s.bodies.bob;error=Math.max(error,Math.abs(b.x-2-Math.cos(40*s.t)));energyError=Math.max(energyError,Math.abs(b.vx**2/2+800*(b.x-2)**2-800)/800);});
 assert.ok(error<2e-4);assert.ok(energyError<1e-4);t.diagnostic(`k=1600 Н/м; 4 с, внешний шаг 0.05 с; ошибка x=${error.toExponential(2)} м; относительная ΔE=${energyError.toExponential(2)}.`);
});
test('Быстрое сопротивление не разгоняет тело; внутренние шаги сохраняют модель и время',()=>{
 const m=emptyModel();m.dt=.05;m.bodies=[body('bob',{vx:2,vy:-3})];m.fields=[{...newField('air','drag'),drag:'100'}];m.scene.camera={x:8,y:9,zoom:2};
 const modelBefore=structuredClone(m),input=initialState(m),stateBefore=structuredClone(input),out=step(m,input);
 near(out.bodies.bob.vx,2*Math.exp(-5),2e-7,'Экспоненциальное затухание');near(out.bodies.bob.vy,-3*Math.exp(-5),2e-7,'Экспоненциальное затухание');
 assert.equal(out.t,.05);assert.deepEqual(input,stateBefore);assert.deepEqual(m,modelBefore);
 m.fields=[{...newField('magnetic','magnetic'),bz:'1e9'}];m.bodies[0].charge=1;
 assert.throws(()=>step(m,initialState(m)),/Слишком быстрые взаимодействия/);
});
test('Противоположные магнитные поля взаимно компенсируются',()=>{
 const m=emptyModel();m.dt=.05;m.bodies=[body('particle',{charge:1,vx:2,vy:3})];
 m.fields=[{...newField('up','magnetic'),bz:'1e9'},{...newField('down','magnetic'),bz:'-1e9'}];
 const s=step(m,initialState(m));near(s.bodies.particle.x,.1,1e-12,'Равномерное движение по x');near(s.bodies.particle.y,.15,1e-12,'Равномерное движение по y');assert.equal(s.bodies.particle.vx,2);assert.equal(s.bodies.particle.vy,3);
});
