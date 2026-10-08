import {gravitationalForces,GRAVITATIONAL_G,gravityCoefficient} from './gravity.js';
import {evaluate} from './expression.js';
import {electricForces,COULOMB_K} from './electrostatics.js';
// Conservative rate estimate for built-in interactions. It controls RK4 accuracy,
// not the display speed, model duration or the camera. Author forces can be arbitrary.
export function interactionRate(m,s,c){
 const moving=new Map(m.bodies.filter(b=>b.motion==='force').map(b=>[b.id,b]));
 const rates=new Map([...moving.keys()].map(id=>[id,{stiffness:0,decay:0,rotation:0,gx:0,gy:0}]));
 for(const link of m.connections??[]){if(!link.enabled||link.type!=='spring')continue;
  const k=evaluate(link.stiffness,c),d=evaluate(link.damping,c);
  for(const id of [link.a,link.b])if(moving.has(id)){rates.get(id).stiffness+=2*Math.abs(k)/moving.get(id).mass;rates.get(id).decay+=2*Math.abs(d)/moving.get(id).mass;}
 }
 for(const field of m.fields??[]){if(!field.enabled||!['magnetic','magnetic-gradient','drag'].includes(field.type))continue;
  for(const b of moving.values()){if(!(field.all??!field.targets.length)&&!field.targets.includes(b.id))continue;
   const values=fieldValues(field,c,s.bodies[b.id]);if(field.type.startsWith('magnetic')){const rate=rates.get(b.id),q=(b.charge??0)/b.mass;rate.rotation+=q*values.bz;if(field.type==='magnetic-gradient'){rate.gx+=q*values.bxGradient;rate.gy+=q*values.byGradient;}}
   else rates.get(b.id).decay+=values.drag/b.mass;
  }
 }
 const charged=m.bodies.filter(b=>(b.charge??0)!==0);
 for(let i=0;i<charged.length;i++)for(let j=i+1;j<charged.length;j++){
  const a=charged[i],b=charged[j],sa=s.bodies[a.id],sb=s.bodies[b.id],distance=Math.hypot(sa.x-sb.x,sa.y-sb.y);
  const toA=moving.has(a.id)&&b.fieldEnabled!==false,toB=moving.has(b.id)&&a.fieldEnabled!==false;
  if(!toA&&!toB)continue;
  if(distance<1e-10)throw new Error(`Заряды «${a.name}» и «${b.name}» совпали. Разведите частицы: поле точечного заряда в его центре не определено.`);
  const curvature=2*COULOMB_K*Math.abs(a.charge*b.charge)/distance**3;
  if(toA)rates.get(a.id).stiffness+=curvature/a.mass;
  if(toB)rates.get(b.id).stiffness+=curvature/b.mass;
 }
 for(const source of m.bodies){if(source.gravityEnabled!==true)continue;for(const b of moving.values()){if(b.id===source.id)continue;const r=Math.hypot(s.bodies[b.id].x-s.bodies[source.id].x,s.bodies[b.id].y-s.bodies[source.id].y);rates.get(b.id).stiffness+=2*gravityCoefficient(source.mass,source.gravityRadius,r);}}
 return Math.max(0,...[...rates.entries()].map(([id,v])=>Math.sqrt(v.stiffness)+v.decay+Math.abs(v.rotation)+Math.sqrt(Math.hypot(s.bodies[id].vx,s.bodies[id].vy)*Math.hypot(v.gx,v.gy))));
}
// All body shapes are translated point masses. Fixed/formula bodies are driven supports.
export function fieldValues(field,c,position={x:0,y:0}){if(field.type==='magnetic-gradient'){const v=Object.fromEntries(['b0','bxGradient','byGradient','originX','originY'].map(k=>[k,evaluate(field[k],c)]));return {...v,bz:v.b0+v.bxGradient*(position.x-v.originX)+v.byGradient*(position.y-v.originY)};}const keys={gravity:['gx','gy'],electric:['ex','ey'],magnetic:['bz'],drag:['drag']}[field.type];const v=Object.fromEntries(keys.map(k=>[k,evaluate(field[k],c)]));if(field.type==='drag'&&v.drag<0)throw new Error(`«${field.name}»: сопротивление должно быть неотрицательным`);return v;}
export function componentForces(m,s,c){const forces=electricForces(m,s),gravity=gravitationalForces(m,s);for(const b of m.bodies){forces[b.id].x+=gravity[b.id].x;forces[b.id].y+=gravity[b.id].y;}
 for(const f of m.fields??[]){if(!f.enabled)continue;const v=fieldValues(f,c);for(const b of m.bodies){if(b.motion!=='force'||(!(f.all??!f.targets.length)&&!f.targets.includes(b.id)))continue;const out=forces[b.id],state=s.bodies[b.id],charge=b.charge??0;
  if(f.type==='gravity'){out.x+=b.mass*v.gx;out.y+=b.mass*v.gy;}
  if(f.type==='electric'){out.x+=charge*v.ex;out.y+=charge*v.ey;}
  if(f.type.startsWith('magnetic')){const bz=f.type==='magnetic-gradient'?v.b0+v.bxGradient*(state.x-v.originX)+v.byGradient*(state.y-v.originY):v.bz;out.x+=charge*state.vy*bz;out.y-=charge*state.vx*bz;}
  if(f.type==='drag'){out.x-=v.drag*state.vx;out.y-=v.drag*state.vy;}
 }}
 for(const link of m.connections??[]){if(!link.enabled||link.type!=='spring')continue;const a=s.bodies[link.a],b=s.bodies[link.b],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),k=evaluate(link.stiffness,c),d=evaluate(link.damping,c);if(k<0||d<0)throw new Error(`«${link.name}»: жёсткость и сопротивление должны быть неотрицательными`);if(length<1e-10){if(link.length*k>0)throw new Error(`«${link.name}»: концы пружины совпадают. Разведите объекты.`);continue;}const nx=dx/length,ny=dy/length,tension=k*(length-link.length)+d*((b.vx-a.vx)*nx+(b.vy-a.vy)*ny);forces[link.a].x+=tension*nx;forces[link.a].y+=tension*ny;forces[link.b].x-=tension*nx;forces[link.b].y-=tension*ny;}
 return forces;
}
export function constraintLinks(m){const mass=new Map(m.bodies.map(b=>[b.id,b.motion==='force'?1/b.mass:0]));return (m.connections??[]).filter(c=>c.enabled&&(c.type==='rope'||c.type==='rod')).map(c=>({...c,wa:mass.get(c.a),wb:mass.get(c.b)}));}
// Distance constraints also constrain acceleration, including the centripetal term.
export function tautRopes(m,s){return new Set(constraintLinks(m).filter(l=>{const a=s.bodies[l.a],b=s.bodies[l.b],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);return l.type==='rope'&&length>=l.length-1e-7&&((b.vx-a.vx)*dx+(b.vy-a.vy)*dy)>=-1e-7;}).map(l=>l.id));}
export function constrainAcceleration(m,s,d,activeRopes=tautRopes(m,s)){const links=constraintLinks(m);for(let iteration=0;iteration<12;iteration++){let error=0;for(const l of links){const a=s.bodies[l.a],b=s.bodies[l.b],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),w=l.wa+l.wb;if(!w||length<1e-10||(l.type==='rope'&&!activeRopes.has(l.id)))continue;const nx=dx/length,ny=dy/length,vx=b.vx-a.vx,vy=b.vy-a.vy,radial=vx*nx+vy*ny,da=d.bodies[l.a],db=d.bodies[l.b];const pull=((db.vx-da.vx)*nx+(db.vy-da.vy)*ny+(vx*vx+vy*vy-radial*radial)/length)/w;if(l.type==='rope'&&pull<=0){if(iteration===0&&pull< -1e-9)activeRopes.delete(l.id);continue;}error=Math.max(error,Math.abs(pull*w));da.vx+=pull*l.wa*nx;da.vy+=pull*l.wa*ny;db.vx-=pull*l.wb*nx;db.vy-=pull*l.wb*ny;}if(error<1e-9)break;}}
export function projectConstraints(m,s,activeRopes=new Set()){const links=constraintLinks(m);
 for(let iteration=0;iteration<80;iteration++){let error=0;for(const l of links){const a=s.bodies[l.a],b=s.bodies[l.b],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),w=l.wa+l.wb,deviation=length-l.length;if(l.type==='rope'&&!activeRopes.has(l.id)&&deviation<=0)continue;error=Math.max(error,Math.abs(deviation));if(Math.abs(deviation)<1e-10)continue;if(!w)throw new Error(`«${l.name}»: неподвижные или заданные формулой концы несовместимы с длиной связи`);if(length<1e-10)throw new Error(`«${l.name}»: концы стержня совпадают`);const correction=deviation/w,nx=dx/length,ny=dy/length;a.x+=correction*l.wa*nx;a.y+=correction*l.wa*ny;b.x-=correction*l.wb*nx;b.y-=correction*l.wb*ny;}if(error<1e-9)break;if(iteration===79&&error>1e-6)throw new Error('Не удалось совместить длины связей. Проверьте длины и расположение опор.');}
 for(let iteration=0;iteration<40;iteration++){let error=0;for(const l of links){const a=s.bodies[l.a],b=s.bodies[l.b],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),w=l.wa+l.wb;if(!w||length<1e-10||(l.type==='rope'&&length<l.length-1e-7))continue;const nx=dx/length,ny=dy/length,radial=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(l.type==='rope'&&!activeRopes.has(l.id)&&radial<=0)continue;error=Math.max(error,Math.abs(radial));const correction=radial/w;a.vx+=correction*l.wa*nx;a.vy+=correction*l.wa*ny;b.vx-=correction*l.wb*nx;b.vy-=correction*l.wb*ny;}if(error<1e-9)break;}
 return s;
}
