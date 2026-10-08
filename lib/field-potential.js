import {electricSources,chargePotential,potentialLevels,COULOMB_K} from './electrostatics.js';
import {gravitySources,GRAVITATIONAL_G,gravityPotential} from './gravity.js';
import {fieldValues} from './interaction.js';
export function globalFieldVector(m,c,type){
 const out={x:0,y:0,excluded:0};
 for(const f of m.fields??[]){if(!f.enabled||f.type!==type)continue;if(!(f.all??!f.targets.length)){out.excluded++;continue;}
  const v=fieldValues(f,c);out.x+=type==='electric'?v.ex:v.gx;out.y+=type==='electric'?v.ey:v.gy;
 }return out;
}
export function fieldLayerEnabled(m,type){return m.scene.fieldLayers?.[type]!==false;}
// The zero of uniform-field potential is fixed at the ORIGINAL scene centre.
// A targeted field is a body-specific force rule, not a global scalar field.
export function scalarField(m,s,c,type='electric'){
 const vector=globalFieldVector(m,c,type),origin={x:(m.scene.minX+m.scene.maxX)/2,y:(m.scene.minY+m.scene.maxY)/2};
 const sources=type==='electric'?electricSources(m,s):gravitySources(m,s);
 const at=(x,y)=>{
  let value=-(vector.x*(x-origin.x)+vector.y*(y-origin.y));
  if(type==='electric')return value+chargePotential(sources,x,y);
  for(const source of sources)value+=gravityPotential(source.mass,source.radius,Math.hypot(x-source.x,y-source.y));return value;
 };
 const size=Math.max(m.scene.maxX-m.scene.minX,m.scene.maxY-m.scene.minY),strength=sources.reduce((sum,p)=>sum+(type==='electric'?COULOMB_K*Math.abs(p.q):GRAVITATIONAL_G*p.mass),0),reference=strength/size+Math.hypot(vector.x,vector.y)*size/2;
 let levels=[];
 if(reference>0){if(type==='electric'&&Math.hypot(vector.x,vector.y)===0)levels=potentialLevels(m,sources);
  else{const power=10**Math.floor(Math.log10(reference)),base=[1,2,5,10].map(n=>n*power).find(n=>n>=reference);levels=[-8,-4,-2,-1,-.5,-.25,0,.25,.5,1,2,4,8].map(n=>n*base);}}
 return {sources,vector,origin,at,levels,active:reference>0,signature:[vector.x,vector.y,origin.x,origin.y]};
}
