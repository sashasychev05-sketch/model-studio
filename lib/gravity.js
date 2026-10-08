export const GRAVITATIONAL_G=6.67430e-11;
export function gravitySources(m,s){return m.bodies.filter(b=>b.gravityEnabled===true).map(b=>({id:b.id,mass:b.mass,radius:b.gravityRadius??0,x:s.bodies[b.id].x,y:s.bodies[b.id].y}));}
// Shell theorem. A positive radius denotes a FIXED sphere of uniform density.
// Test bodies remain point masses; radius 0 preserves the old point-source law.
export function gravityCoefficient(mass,radius,r){
 const distance=Math.max(radius??0,r);
 if(distance<1e-10)throw new Error('Гравитирующие точки совпали. Разведите объекты или задайте радиус неподвижного однородного шара.');
 return GRAVITATIONAL_G*mass/distance**3;
}
export function gravityPotential(mass,radius,r){
 if(radius>0&&r<radius)return -GRAVITATIONAL_G*mass*(3-(r/radius)**2)/(2*radius);
 return r<1e-12?NaN:-GRAVITATIONAL_G*mass/r;
}
export function gravitationalForces(m,s){
 const forces=Object.fromEntries(m.bodies.map(b=>[b.id,{x:0,y:0}]));
 for(let i=0;i<m.bodies.length;i++)for(let j=i+1;j<m.bodies.length;j++){
  const a=m.bodies[i],b=m.bodies[j],toA=a.motion==='force'&&b.gravityEnabled===true,toB=b.motion==='force'&&a.gravityEnabled===true;if(!toA&&!toB)continue;
  const av=s.bodies[a.id],bv=s.bodies[b.id],dx=bv.x-av.x,dy=bv.y-av.y,r=Math.hypot(dx,dy);
  if(toA){const f=a.mass*gravityCoefficient(b.mass,b.gravityRadius,r);forces[a.id].x+=f*dx;forces[a.id].y+=f*dy;}
  if(toB){const f=b.mass*gravityCoefficient(a.mass,a.gravityRadius,r);forces[b.id].x-=f*dx;forces[b.id].y-=f*dy;}
 }return forces;
}
