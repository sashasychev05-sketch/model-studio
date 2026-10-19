import {evaluate,dependencies} from './expression.js';
import {fieldValues} from './interaction.js';

export const C_LIGHT=299792458;
export const relativisticSymbols=['gamma','beta','tau','px','py','Ek','energy'];
export const isRelativistic=m=>m.physics?.mode==='relativistic';
export function validateRelativity(m){
 if(m.physics!==undefined&&(!m.physics||!['classical','relativistic'].includes(m.physics.mode)))throw new Error('Выберите классический или релятивистский режим');
 if(!isRelativistic(m))return;
 if(m.kind==='html'||m.subject!=='physics'||m.scene.dimension===3)throw new Error('Релятивистский режим предназначен для частиц на физической плоскости');
 if((m.connections??[]).some(c=>c.enabled&&c.type!=='line')||(m.geometry??[]).length)throw new Error('В режиме СТО отключите механические связи и геометрические ограничения');
 const params=m.parameters.map(p=>p.id),base=['t','pi','e','c_light',...params],local=['x','y','vx','vy','m','x0','y0','vx0','vy0'];
 const check=(expr,allowed)=>{for(const id of dependencies(expr))if(!allowed.includes(id))throw new Error('Силы в режиме СТО используют только внешние параметры и состояние самой частицы: '+id);};
 const ids=[...m.parameters,...m.quantities,...m.bodies,...(m.mathObjects??[])].map(p=>p.id);
 if(ids.includes('c_light'))throw new Error('Имя c_light занято скоростью света в режиме СТО');
 for(const b of m.bodies){
  if(b.motion==='formula'||b.gravityEnabled||(b.charge&&b.fieldEnabled!==false))throw new Error('В режиме СТО используйте движение по силам или покой; отключите собственные источники полей');
  if(Math.hypot(b.vx,b.vy)>=C_LIGHT)throw new Error('Начальная скорость массивной частицы должна быть меньше скорости света');
  if(relativisticSymbols.some(k=>ids.includes(b.id+'_'+k)))throw new Error('Имя величины совпадает с релятивистским измерением частицы');
  if(b.motion==='force')for(const expr of [b.fx,b.fy])check(expr,[...base,...local,...relativisticSymbols.map(k=>b.id+'_'+k),...['x','y','vx','vy','m','q'].map(k=>b.id+'_'+k)]);
 }
 for(const f of m.fields??[]){if(!f.enabled)continue;if(!['electric','magnetic','magnetic-gradient','custom-force'].includes(f.type))throw new Error('В режиме СТО доступны внешние электрические, магнитные поля и заданное поле силы');for(const key of ({electric:['ex','ey'],magnetic:['bz'],'magnetic-gradient':['b0','bxGradient','byGradient','originX','originY'],'custom-force':['fx','fy']}[f.type]))check(f[key],[...base,...(f.type==='custom-force'?local:[])]);}
}
export function relativisticValues(body,state){
 const gamma=Math.hypot(1,state.px/(body.mass*C_LIGHT),state.py/(body.mass*C_LIGHT));
 if(!Number.isFinite(gamma)||gamma>1e6)throw new Error('Частица слишком близка к скорости света для точности расчёта. Уменьшите силу или время.');
 const vx=state.px/(body.mass*gamma),vy=state.py/(body.mass*gamma);
 return {gamma,beta:Math.hypot(vx,vy)/C_LIGHT,vx,vy,energy:gamma*body.mass*C_LIGHT**2,Ek:(state.px**2+state.py**2)/(body.mass*(gamma+1))};
}
export function relativisticInitial(m){
 validateRelativity(m);const s={t:0,bodies:{}};
 for(const b of m.bodies){const speed=b.motion==='fixed'?0:Math.hypot(b.vx,b.vy),gamma=1/Math.sqrt((1-speed/C_LIGHT)*(1+speed/C_LIGHT));s.bodies[b.id]={x:b.x,y:b.y,vx:b.motion==='fixed'?0:b.vx,vy:b.motion==='fixed'?0:b.vy,px:gamma*b.mass*(b.motion==='fixed'?0:b.vx),py:gamma*b.mass*(b.motion==='fixed'?0:b.vy),tau:0};relativisticValues(b,s.bodies[b.id]);}return s;
}
export function relativisticContext(m,s,c){
 c.c_light=C_LIGHT;for(const b of m.bodies){const state=s.bodies[b.id],v=relativisticValues(b,state);for(const key of relativisticSymbols)c[b.id+'_'+key]=key==='tau'?state.tau:key==='px'||key==='py'?state[key]:v[key];}return c;
}
function relativisticForce(m,b,s,c){
 const v=s.bodies[b.id],loc={...c,...v,m:b.mass,x0:b.x,y0:b.y,vx0:b.vx,vy0:b.vy},out={x:evaluate(b.fx,loc),y:evaluate(b.fy,loc)};
 for(const f of m.fields??[]){if(!f.enabled||(!(f.all??!f.targets.length)&&!f.targets.includes(b.id)))continue;const q=b.charge??0,values=fieldValues(f,loc,v);
  if(f.type==='electric'){out.x+=q*values.ex;out.y+=q*values.ey;}
  else if(f.type.startsWith('magnetic')){out.x+=q*v.vy*values.bz;out.y-=q*v.vx*values.bz;}
  else if(f.type==='custom-force'){out.x+=values.fx;out.y+=values.fy;}
 }return out;
}
export function relativisticStep(m,input,h,makeContext){
 const sync=s=>{for(const b of m.bodies)Object.assign(s.bodies[b.id],(({vx,vy})=>({vx,vy}))(relativisticValues(b,s.bodies[b.id])));return s;};
 const derivative=s=>{sync(s);const c=makeContext(m,s),out={};for(const b of m.bodies){const v=s.bodies[b.id],g=relativisticValues(b,v).gamma,f=b.motion==='force'?relativisticForce(m,b,s,c):{x:0,y:0};out[b.id]={x:v.vx,y:v.vy,px:f.x,py:f.y,tau:1/g};}return out;};
 const shifted=(s,d,dt)=>{const next=structuredClone(s);next.t+=dt;for(const b of m.bodies)for(const key of ['x','y','px','py','tau'])next.bodies[b.id][key]+=dt*d[b.id][key];return sync(next);};
 let s=structuredClone(input),remaining=h,count=0;
 while(remaining>h*1e-12){const a=derivative(s),ctx=makeContext(m,s),rates=m.bodies.map(b=>{
   const state=s.bodies[b.id],gamma=relativisticValues(b,state).gamma;let rate=Math.hypot(a[b.id].px,a[b.id].py)/(b.mass*C_LIGHT*gamma);
   if(b.motion==='force')for(const f of m.fields??[]){if(!f.enabled||!f.type.startsWith('magnetic')||(!(f.all??!f.targets.length)&&!f.targets.includes(b.id)))continue;const v=fieldValues(f,ctx,state),q=Math.abs(b.charge??0)/(b.mass*gamma);rate+=q*Math.abs(v.bz)+Math.sqrt(Math.hypot(state.vx,state.vy)*q*Math.hypot(v.bxGradient??0,v.byGradient??0));}return rate;
  }),rate=Math.max(0,...rates),dt=Math.min(remaining,.005,rate>0?.025/rate:remaining);
  if(!Number.isFinite(rate)||!(dt>0)||++count>1000)throw new Error('Слишком быстро меняется релятивистский импульс: уменьшите шаг или силу');
  const b=derivative(shifted(s,a,dt/2)),c=derivative(shifted(s,b,dt/2)),d=derivative(shifted(s,c,dt)),out=structuredClone(s);out.t+=dt;
  for(const body of m.bodies)for(const key of ['x','y','px','py','tau'])out.bodies[body.id][key]+=dt*(a[body.id][key]+2*b[body.id][key]+2*c[body.id][key]+d[body.id][key])/6;
  s=sync(out);for(const v of Object.values(s.bodies))if(Object.values(v).some(n=>!Number.isFinite(n))||Math.abs(v.x)>1e12||Math.abs(v.y)>1e12)throw new Error('Движение вышло за диапазон релятивистской модели');remaining-=dt;
 }s.t=input.t+h;makeContext(m,s);return s;
}
