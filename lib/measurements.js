import {COULOMB_K,electricSources} from './electrostatics.js';
import {gravitySources,gravityCoefficient} from './gravity.js';
import {globalFieldVector,scalarField} from './field-potential.js';
import {fieldValues} from './interaction.js';

export function probeAt(m,s,c,x,y){
 const E=globalFieldVector(m,c,'electric'),g=globalFieldVector(m,c,'gravity');let bz=0;
 for(const p of electricSources(m,s)){const dx=x-p.x,dy=y-p.y,r=Math.hypot(dx,dy);if(r<1e-12)throw new Error('Пробник совпал с точечным зарядом');const k=COULOMB_K*p.q/r**3;E.x+=k*dx;E.y+=k*dy;}
 for(const p of gravitySources(m,s)){const dx=p.x-x,dy=p.y-y,k=gravityCoefficient(p.mass,p.radius,Math.hypot(dx,dy));g.x+=k*dx;g.y+=k*dy;}
 for(const f of m.fields??[])if(f.enabled&&f.type.startsWith('magnetic')&&(f.all??!f.targets.length))bz+=fieldValues(f,c,{x,y}).bz;
 return {ex:E.x,ey:E.y,gx:g.x,gy:g.y,bz,phi:scalarField(m,s,c,'electric').at(x,y),gravityPotential:scalarField(m,s,c,'gravity').at(x,y),excluded:E.excluded+g.excluded};
}
export function measure(m,s,item,c={}){const p=id=>s.bodies[id],angle=(u,v)=>{const a=Math.hypot(u.x,u.y),b=Math.hypot(v.x,v.y);if(a<1e-12||b<1e-12)throw new Error('Угол не определён для нулевого отрезка');return Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(a*b))))*180/Math.PI;},delta=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
 if(item.type==='probe')return {type:'probe',...probeAt(m,s,c,item.x,item.y)};
 if(item.type==='distance'){const v=delta(p(item.a),p(item.b));return {value:Math.hypot(v.x,v.y),unit:'м'};}
 if(item.type==='angle')return {value:angle(delta(p(item.vertex),p(item.a)),delta(p(item.vertex),p(item.b))),unit:'°'};
 return {value:angle(delta(p(item.a),p(item.b)),delta(p(item.c),p(item.d))),unit:'°'};
}
