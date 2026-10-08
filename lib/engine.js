import {applyGeometry,applyBindings} from './teaching.js';
function boundModel(m){return m.parameters.some(p=>p.binding)?applyBindings({...m,bodies:m.bodies.map(b=>({...b}))}):m;}

import {evaluate,dependencies} from './expression.js';
import {componentForces,constrainAcceleration,projectConstraints,tautRopes,interactionRate} from './interaction.js';

export function initialState(m      )       {m=boundModel(m);const s      ={t:0,bodies:{}};for(const b of m.bodies)s.bodies[b.id]={x:b.x,y:b.y,vx:b.vx,vy:b.vy};applyKinematics(m,s);projectConstraints(m,s);context(m,s);return s;}
export function context(m      ,s      )                      {m=boundModel(m);const c                      ={t:s.t};for(const p of m.parameters)c[p.id]=p.value;for(const b of m.bodies){const v=s.bodies[b.id];c[`${b.id}_x`]=v.x;c[`${b.id}_y`]=v.y;c[`${b.id}_vx`]=v.vx;c[`${b.id}_vy`]=v.vy;c[`${b.id}_m`]=b.mass;c[`${b.id}_q`]=b.charge??0;c[`${b.id}_R`]=b.gravityRadius??0;c[`${b.id}_gravity`]=b.gravityEnabled===true?1:0;}
 const q=new Map(m.quantities.map(v=>[v.id,v]));const active=new Set        ();function calc(id       ){if(Object.hasOwn(c,id))return;if(active.has(id))throw new Error(`Циклическая зависимость у «${id}»`);active.add(id);const item=q.get(id) ;for(const dep of dependencies(item.expression))if(q.has(dep))calc(dep);c[id]=evaluate(item.expression,c);active.delete(id);}for(const id of q.keys())calc(id);return c;}
function scope(b     ,s      ,c                      ){const v=s.bodies[b.id];return {...c,x:v.x,y:v.y,vx:v.vx,vy:v.vy,m:b.mass,x0:b.x,y0:b.y,vx0:b.vx,vy0:b.vy};}
function applyKinematics(m      ,s      ){for(const b of m.bodies)if(b.motion==='fixed')Object.assign(s.bodies[b.id],{x:b.x,y:b.y,vx:0,vy:0});const c=context(m,s);for(const b of m.bodies)if(b.motion==='formula'){const loc=scope(b,s,c),eps=1e-5;s.bodies[b.id]={x:evaluate(b.xFormula,loc),y:evaluate(b.yFormula,loc),vx:(evaluate(b.xFormula,{...loc,t:s.t+eps})-evaluate(b.xFormula,{...loc,t:s.t-eps}))/(2*eps),vy:(evaluate(b.yFormula,{...loc,t:s.t+eps})-evaluate(b.yFormula,{...loc,t:s.t-eps}))/(2*eps)};}applyGeometry(m,s);}
function derivative(m,s,activeRopes){applyKinematics(m,s);const c=context(m,s),forces=componentForces(m,s,c),d      ={t:1,bodies:{}};for(const b of m.bodies){const v=s.bodies[b.id],loc=b.motion==='formula'||(b.motion==='force'&&(b.fx!=='0'||b.fy!=='0'))?scope(b,s,c):c;d.bodies[b.id]=b.motion==='force'?{x:v.vx,y:v.vy,vx:(evaluate(b.fx,loc)+forces[b.id].x)/b.mass,vy:(evaluate(b.fy,loc)+forces[b.id].y)/b.mass}:b.motion==='formula'?{x:v.vx,y:v.vy,vx:(evaluate(b.xFormula,{...loc,t:s.t+.0001})-2*v.x+evaluate(b.xFormula,{...loc,t:s.t-.0001}))/.0001**2,vy:(evaluate(b.yFormula,{...loc,t:s.t+.0001})-2*v.y+evaluate(b.yFormula,{...loc,t:s.t-.0001}))/.0001**2}:{x:0,y:0,vx:0,vy:0};}constrainAcceleration(m,s,d,activeRopes);return d;}
function shifted(s      ,d      ,h       )      {const o      ={t:s.t+h,bodies:{}};for(const [id,v]of Object.entries(s.bodies)){const k=d.bodies[id];o.bodies[id]={x:v.x+h*k.x,y:v.y+h*k.y,vx:v.vx+h*k.vx,vy:v.vy+h*k.vy};}return o;}
function rk4Step(m,input,h){const s=structuredClone(input),activeRopes=tautRopes(m,s),a=derivative(m,s,activeRopes),b=derivative(m,shifted(s,a,h/2),activeRopes),c=derivative(m,shifted(s,b,h/2),activeRopes),d=derivative(m,shifted(s,c,h),activeRopes);const out={t:s.t+h,bodies:{}};for(const body of m.bodies){const id=body.id,v=s.bodies[id],o={...v};for(const key of ['x','y','vx','vy'])o[key]=v[key]+h*(a.bodies[id][key]+2*b.bodies[id][key]+2*c.bodies[id][key]+d.bodies[id][key])/6;out.bodies[id]=o;}applyKinematics(m,out);projectConstraints(m,out,activeRopes);for(const body of Object.values(out.bodies))for(const value of Object.values(body))if(!Number.isFinite(value)||Math.abs(value)>1e9)throw new Error('Движение вышло за диапазон модели. Уменьшите шаг или проверьте силы.');context(m,out);return out;}
export function validatePhysics(m){if(m.kind==='html')return m;const allowed=new Set(['t','pi','e','m','x0','y0','vx0','vy0',...m.parameters.map(p=>p.id)]);for(const b of m.bodies)if(b.motion==='formula')for(const f of [b.xFormula,b.yFormula])for(const name of dependencies(f))if(!allowed.has(name))throw new Error(`Движение по формуле: «${name}» недоступно. Используйте t, параметры и начальные условия. Для взаимодействий задайте силы.`);let s=initialState(m);for(const b of m.bodies)if(b.motion==='force'){const c=scope(b,s,context(m,s));evaluate(b.fx,c);evaluate(b.fy,c);}for(const g of [...m.graphs,...(m.invariants??[])])evaluate(g.expression,context(m,s));for(let i=0;i<3;i++)s=step(m,s);return m;}

// Split fast built-in interactions so a large lesson step cannot erase an orbit
// or add energy to a stiff spring. Re-evaluate after every internal step.
export function step(m,input,h=m.dt){
 if(!(h>0&&Number.isFinite(h)))throw new Error('Шаг расчёта должен быть положительным');
 m=boundModel(m);let state=input,remaining=h,count=0;
 while(remaining>h*1e-12){
  const rate=interactionRate(m,state,context(m,state)),increment=rate>0?Math.min(remaining,.1/rate):remaining;
  if(!Number.isFinite(rate)||rate*remaining>.1*(1000-count)||++count>1000)throw new Error('Слишком быстрые взаимодействия для выбранного шага. Уменьшите шаг расчёта, жёсткость или поле; проверьте массы и расстояния между источниками.');
  state=rk4Step(m,state,increment);remaining-=increment;
 }
 state.t=input.t+h;return state;
}
