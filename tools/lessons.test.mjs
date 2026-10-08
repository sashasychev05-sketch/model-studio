import * as teachingFunctions from '../lib/teaching.js';
import * as measurementFunctions from '../lib/measurements.js';
import {auditModel} from '../lib/audit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {lessonDefinitions,lessonSpec,lessonRuntime} from '../lib/lesson-models.js';
import {lessonFormulaCards} from '../lib/lesson-formulas.js';
import {advanceLessonAnimation} from '../lib/lesson-animation.js';
import {validateModel} from '../lib/model.js';
import {geometryFrame} from '../lib/geometry.js';
const definitions=lessonDefinitions(),definition=key=>definitions.find(d=>d.key===key);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
test('Geometry preserves side lengths in pixels for all allowed angles and viewports',()=>{
 for(const [w,h]of [[300,490],[800,370],[1200,370]]){
  const f=geometryFrame('parallelogram',w,h),points=angle=>{const a=angle*Math.PI/180;return [[0,0],[8,0],[8+5*Math.cos(a),5*Math.sin(a)],[5*Math.cos(a),5*Math.sin(a)]].map(([x,y])=>[f.X(x),f.Y(y)]);};
  for(let a=35;a<=145;a++){const p=points(a);near(Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]),8*f.scale);near(Math.hypot(p[3][0]-p[0][0],p[3][1]-p[0][1]),5*f.scale);for(const [x,y]of p)assert.ok(x>=40&&x<=w-40&&y>=65&&y<=h-80);}
 }
});
test('Trapezoid base, height, scale and anchor remain fixed during shifts',()=>{
 const f=geometryFrame('trapezoid',800,370);
 for(let shift=0;shift<=6;shift+=.05){near(f.X(shift+6)-f.X(shift),6*f.scale);near(f.X(12)-f.X(0),12*f.scale);near(f.Y(0)-f.Y(3*Math.sqrt(3)),3*Math.sqrt(3)*f.scale);}
});
test('Physics: Newton scaling, spring energy, torque balance, buoyancy, Ohm and heat conservation',()=>{
 const a=definition('newton').calculate({force:3,mass:3,time:2});near(a.a1,3);near(a.a2,1);near(a.x1,6);near(a.x2,2);
 const spring=definition('hooke'),s=spring.calculate({stiffness:50,extension:.2,mass:1,time:0}),s2=spring.calculate({stiffness:50,extension:.4,mass:1,time:0});near(s.force,-10);near(s2.energy,4*s.energy);
 for(const time of [0,.1,.5,1,3,6]){const state=spring.calculate({stiffness:50,extension:.2,mass:1,time});near(state.total,1);}
 near(definition('lever').calculate({leftForce:20,leftArm:1.5,rightForce:15,rightArm:2}).delta,0);
 const buoyancy=definition('archimedes').calculate({bodyDensity:800,fluidDensity:1000,submerged:80});near(buoyancy.buoyancy,buoyancy.gravity);near(buoyancy.fraction,.8);
 const ohm=definition('ohm'),o=ohm.calculate({voltage:6,resistance:10,time:10}),o2=ohm.calculate({voltage:12,resistance:10,time:10});near(o.current,.6);near(o.heat,36);near(o2.current,2*o.current);near(o2.heat,4*o.heat);
 const heat=definition('heat').calculate({mass1:.3,temp1:20,mass2:.6,temp2:80});near(heat.temperature,60);near(heat.q1+heat.q2,0);
});
test('Math: Pythagoras, signed circle projections, degenerate quadratic and similarity',()=>{
 const p=definition('pythagoras').calculate({a:3,b:4});near(p.c,5);near(p.c2,25);
 for(let angle=0;angle<=360;angle++){const s=definition('circle').calculate({angle});near(s.x*s.x+s.y*s.y,1);}
 assert.ok(definition('circle').calculate({angle:135}).x<0);
 const circleZero=definition('circle').readout({angle:270},definition('circle').calculate({angle:270}));assert.equal(circleZero[0][1],'0');
 const quadratic=definition('quadratic');assert.deepEqual(quadratic.calculate({a:1,b:0,c:-1}).roots,[-1,1]);assert.deepEqual(quadratic.calculate({a:-1,b:4,c:-4}).roots,[2]);assert.deepEqual(quadratic.calculate({a:1,b:0,c:1}).roots,[]);assert.equal(quadratic.calculate({a:0,b:0,c:0}).roots,null);assert.deepEqual(quadratic.calculate({a:0,b:2,c:-4}).roots,[2]);assert.deepEqual(quadratic.calculate({a:0,b:0,c:1}).roots,[]);
 const sim=definition('similarity').calculate({factor:2});near(sim.area,24);near(sim.perimeter,24);
});
test('Quadratic forms agree algebraically; translations preserve shape and scale',()=>{
 const general=definition('quadratic'),shift=definition('quadratic-shift');
 for(const [h,k]of [[-3,-4],[0,0],[1.5,-2],[3,4]]){const v={h,k},state=shift.calculate(v),other=general.calculate({a:1,b:-2*h,c:h*h+k});assert.deepEqual(state,other);near(state.vertex.x,h);near(state.vertex.y,k);for(const x of [-5,-1,0,1,5])near((x-h)**2+k,x*x-2*h*x+h*h+k);assert.match(shift.draw(v,state),/width="360" height="360"/);}
 for(const [a,b,c]of [[-2,5,-5],[.25,-5,5],[1,-3,2],[-1,0,4]]){const state=general.calculate({a,b,c});for(const x of state.roots)near(a*x*x+b*x+c,0);near(2*a*state.vertex.x+b,0);}
});
test('Circle guide colours match the destination coordinates',()=>{
 const d=definition('circle'),v={angle:45},svg=d.draw(v,d.calculate(v));assert.match(svg,/<g id="sine-guide"><line[^>]*stroke="var\(--studio-orange\)"[^>]*stroke-dasharray/);assert.match(svg,/<g id="cosine-guide"><line[^>]*stroke="var\(--studio-blue\)"[^>]*stroke-dasharray/);
});
test('Formula cards use actual fractions and handle linear and no-root cases',()=>{
 for(const d of definitions){const v=Object.fromEntries(d.parameters.map(p=>[p.id,p.value])),html=lessonFormulaCards(d.key,v,d.calculate(v));assert.match(html,/<h2>Формулы и смысл<\/h2>/);assert.match(html,/<article class="formula-card">/);assert.match(html,/<math /);assert.doesNotMatch(html,/NaN|undefined|Infinity/);}
 const d=definition('quadratic');assert.match(lessonFormulaCards(d.key,{a:1,b:0,c:-1},d.calculate({a:1,b:0,c:-1})),/<mfrac>/);const linear=lessonFormulaCards(d.key,{a:0,b:2,c:1},d.calculate({a:0,b:2,c:1}));assert.match(linear,/Линейное уравнение/);assert.doesNotMatch(linear,/Корни уравнения|Дискриминант/);
});
test('Animation time is bounded and bounce handles long elapsed intervals',()=>{
 near(advanceLessonAnimation(1,1,.1,2,0,3).position,1.2);assert.equal(advanceLessonAnimation(2.9,1,.2,1,0,3).finished,true);near(advanceLessonAnimation(2.9,1,.2,1,0,3).position,3);
 const bounce=advanceLessonAnimation(2.9,1,1,.5,-3,3,'bounce');near(bounce.position,2.6);assert.equal(bounce.direction,-1);const long=advanceLessonAnimation(0,1,100,1,-3,3,'bounce');assert.ok(long.position>=-3&&long.position<=3);assert.throws(()=>advanceLessonAnimation(0,1,1,0,0,3));
 const loop=advanceLessonAnimation(179,1,1,25,-180,180,'loop');near(loop.position,-156);assert.equal(loop.finished,false);near(advanceLessonAnimation(0,1,3601,1,-180,180,'loop').position,1);
});
test('Animation UI starts on request, advances, pauses, steps, resets and stops on manual input',()=>{
 for(const key of ['newton','hooke','ohm','circle','quadratic-shift']){
  const d=definition(key),nodes=new Map(),frames=new Map(),documentListeners={};let frameId=0;
  const element=()=>({value:'',textContent:'',innerHTML:'',listeners:{},children:[],addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(name,value){this[name]=value;},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}});
  for(const p of d.parameters){const node=element();node.value=String(p.value);nodes.set(p.id,node);nodes.set('out-'+p.id,element());}for(const id of ['scene-content','scene','readouts','formulas','play','step','speed','reset'])nodes.set(id,element());nodes.get('speed').value='1';
  const win={},runtime={lessonDefinitions,lessonFormulaCards,advanceLessonAnimation,window:win,parent:win,document:{hidden:false,getElementById:id=>nodes.get(id),createElement:element,addEventListener:(name,fn)=>documentListeners[name]=fn},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  vm.runInNewContext(`(${lessonRuntime.toString()})(${JSON.stringify(key)})`,runtime);assert.equal(frames.size,0);const control=nodes.get(d.animation.parameter),original=Number(control.value),tick=t=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(t);};nodes.get('play').onclick({isTrusted:false});tick(0);tick(100);assert.notEqual(Number(control.value),original);nodes.get('play').onclick({isTrusted:false});assert.equal(frames.size,0);const paused=Number(control.value);nodes.get('step').onclick({isTrusted:false});assert.notEqual(Number(control.value),paused);nodes.get('reset').onclick({isTrusted:false});near(Number(control.value),original);assert.equal(frames.size,0);
  nodes.get('play').onclick({isTrusted:false});control.value=String(original);control.listeners.input();assert.equal(frames.size,0);nodes.get('play').onclick({isTrusted:false});runtime.document.hidden=true;documentListeners.visibilitychange();assert.equal(frames.size,0);
 }
});
test('Every HTML document validates, is offline and renders finite output at parameter boundaries',()=>{
 for(const d of definitions){const spec=validateModel(lessonSpec(d));assert.ok(spec.html.length<180000);assert.doesNotMatch(spec.html,/<script[^>]*\bsrc=|fetch\(|XMLHttpRequest|<iframe/);for(const [,script]of spec.html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script);
  const count=d.parameters.length;for(let mask=0;mask<2**count;mask++){const values=Object.fromEntries(d.parameters.map((p,i)=>[p.id,(mask>>i)&1?p.max:p.min])),state=d.calculate(values),drawing=d.draw(values,state);assert.doesNotMatch(drawing,/NaN|Infinity|undefined/);assert.ok(d.readout(values,state).every(([label,value])=>label&&value));}
 }
});
test('Unit circle radius and similarity use fixed coordinate lengths',()=>{
 const circle=definition('circle');for(const angle of [0,35,90,145,180,270,360]){const drawing=circle.draw({angle},circle.calculate({angle}));assert.match(drawing,/id="unit-circle" cx="270" cy="250" r="150"/);}
 const d=definition('similarity'),v={factor:2},svg=d.draw(v,d.calculate(v));const points=id=>svg.match(new RegExp(`id="${id}" points="([^"]+)"`))[1].split(' ').map(p=>p.split(',').map(Number));const length=p=>Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]);near(length(points('scaled-triangle'))/length(points('original-triangle')),2);
});
