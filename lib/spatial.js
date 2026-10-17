import {evaluate,dependencies} from './expression.js';
import {solidKind} from './spatial-catalog.js';

export const defaultSpatialView=()=>({yaw:45,pitch:Math.atan(1/Math.sqrt(2))*180/Math.PI,zoom:1,x:0,y:0});
export function spatialView(scene){return {...defaultSpatialView(),...scene.view3d};}
export function namedSpatialView(scene,name){return {...defaultSpatialView(),zoom:spatialView(scene).zoom,...({front:{yaw:0,pitch:0},top:{yaw:0,pitch:90},side:{yaw:90,pitch:0}}[name]??{})};}
export function validateSpatialScene(m){
 const scene=m.scene;if(scene?.dimension!==undefined&&![2,3].includes(scene.dimension))throw new Error('Проверьте размерность сцены');
 if(scene?.dimension===3&&(m.subject!=='math'||m.kind==='html'))throw new Error('3D-сцена доступна для математического конструктора');
 if(scene?.view3d!==undefined){const v=scene.view3d;if(!v||typeof v!=='object')throw new Error('Проверьте вид 3D-сцены');for(const [key,lo,hi]of [['yaw',-36000,36000],['pitch',-90,90],['zoom',.1,10],['x',-1e4,1e4],['y',-1e4,1e4]])if(!Number.isFinite(v[key])||v[key]<lo||v[key]>hi)throw new Error('Проверьте вид 3D-сцены');}
}
export function validateSpatialObject(item,m){
 const fail=message=>{throw new Error(message);},coordinate=p=>{if(!p||['x','y','z'].some(k=>!Number.isFinite(p[k])||Math.abs(p[k])>1e4))fail('Координаты 3D: от −10 000 до 10 000');};
 if(m.subject!=='math')fail('Объёмные построения доступны в математической модели');
 if(item.type==='solid'){
  const def=solidKind(item.solid);if(!def||!item.dimensions||Object.keys(item.dimensions).length!==def.fields.length)fail('Проверьте объёмную фигуру');
  coordinate(item.position);coordinate(item.rotation);if(typeof item.wireframe!=='boolean'||!Number.isFinite(item.opacity)||item.opacity<.15||item.opacity>1)fail('Проверьте отображение объёмной фигуры');
  if(def.sides&&(!Number.isInteger(item.sides)||item.sides<3||item.sides>12))fail('Число сторон основания: целое от 3 до 12');
  const allowed=new Set(m.parameters.map(p=>p.id));for(const f of def.fields){const expression=item.dimensions[f.key];if(typeof expression!=='string'||!expression.trim()||expression.length>500)fail('Проверьте размер объёмной фигуры');for(const key of dependencies(expression))if(!allowed.has(key)&&!['pi','e'].includes(key))fail('Размеры объёмной фигуры используют параметры');}
 }else if(item.type==='point3d')coordinate(item.position);
 else{coordinate(item.a3);coordinate(item.b3);}
}
export function spatialDimensions(item,m){
 const values=Object.fromEntries(m.parameters.map(p=>[p.id,p.value])),out={};for(const f of solidKind(item.solid).fields){const value=evaluate(item.dimensions[f.key],values);if(!(value>0&&value<=100))throw new Error('Размеры объёмной фигуры должны быть больше 0 и не больше 100');out[f.key]=value;}
 if(item.solid==='torus'&&!(out.radius>out.tube))throw new Error('Большой радиус тора должен быть больше радиуса трубки');return out;
}
export function spatialMetrics(item,m){
 if(item.type==='point3d')return {};
 if(item.type!=='solid'){const a=item.a3,b=item.b3;return {length:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)};}
 const d=spatialDimensions(item,m),pi=Math.PI;let volume,area;
 if(item.solid==='cube'){volume=d.side**3;area=6*d.side**2;}
 else if(item.solid==='box'){volume=d.width*d.depth*d.height;area=2*(d.width*d.depth+d.width*d.height+d.depth*d.height);}
 else if(item.solid==='sphere'){volume=4*pi*d.radius**3/3;area=4*pi*d.radius**2;}
 else if(item.solid==='cylinder'){volume=pi*d.radius**2*d.height;area=2*pi*d.radius*(d.radius+d.height);}
 else if(item.solid==='cone'){volume=pi*d.radius**2*d.height/3;area=pi*d.radius*(d.radius+Math.hypot(d.radius,d.height));}
 else if(item.solid==='torus'){volume=2*pi*pi*d.radius*d.tube**2;area=4*pi*pi*d.radius*d.tube;}
 else{const n=item.solid==='square-pyramid'?4:item.solid==='triangular-prism'?3:item.sides,r=d.radius??d.side/(2*Math.sin(pi/n)),base=n*r*r*Math.sin(2*pi/n)/2,perimeter=2*n*r*Math.sin(pi/n),pyramid=item.solid.includes('pyramid');volume=base*d.height/(pyramid?3:1);area=pyramid?base+perimeter*Math.hypot(d.height,r*Math.cos(pi/n))/2:2*base+perimeter*d.height;}
 return {volume,area};
}
export function solidMesh(item,m){
 const d=spatialDimensions(item,m),vertices=[],faces=[],point=(x,y,z)=>{vertices.push({x,y,z});return vertices.length-1;};
 const ring=(n,r,z,phase=0)=>Array.from({length:n},(_,i)=>point(r*Math.cos(phase+2*Math.PI*i/n),r*Math.sin(phase+2*Math.PI*i/n),z));
 if(item.solid==='sphere'||item.solid==='torus'){
  const n=24,rows=item.solid==='sphere'?12:12,torus=item.solid==='torus';
  for(let j=0;j<=(torus?rows-1:rows);j++)for(let i=0;i<n;i++){const u=2*Math.PI*i/n,v=torus?2*Math.PI*j/rows:-Math.PI/2+Math.PI*j/rows,r=torus?d.radius+d.tube*Math.cos(v):d.radius*Math.cos(v);point(r*Math.cos(u),r*Math.sin(u),(torus?d.tube:d.radius)*Math.sin(v));}
  for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const next=(i+1)%n,nextRow=torus?(j+1)%rows:j+1;faces.push([j*n+i,j*n+next,nextRow*n+next,nextRow*n+i]);}
 }else{
  const box=['cube','box'].includes(item.solid),pyramid=['cone','square-pyramid','regular-pyramid'].includes(item.solid),n=box?4:['cylinder','cone'].includes(item.solid)?32:item.solid==='square-pyramid'?4:item.solid==='triangular-prism'?3:item.sides,h=d.height??d.side;
  let base;if(box){const w=d.width??d.side,t=d.depth??d.side;base=[point(-w/2,-t/2,-h/2),point(w/2,-t/2,-h/2),point(w/2,t/2,-h/2),point(-w/2,t/2,-h/2)];}
  else base=ring(n,d.radius??d.side/(2*Math.sin(Math.PI/n)),-h/2,item.solid==='square-pyramid'?Math.PI/4:Math.PI/2);
  faces.push([...base].reverse());
  if(pyramid){const tip=point(0,0,h/2);for(let i=0;i<n;i++)faces.push([base[i],base[(i+1)%n],tip]);}
  else{const top=base.map(i=>{const p=vertices[i];return point(p.x,p.y,h/2);});faces.push(top);for(let i=0;i<n;i++)faces.push([base[i],base[(i+1)%n],top[(i+1)%n],top[i]]);}
 }
 return {vertices:vertices.map(p=>spatialTransform(p,item)),faces};
}
export function spatialTransform(p,item){
 const angle=axis=>(item.rotation?.[axis]??0)*Math.PI/180;let {x,y,z}=p,a=angle('x'),c=Math.cos(a),s=Math.sin(a);[y,z]=[y*c-z*s,y*s+z*c];a=angle('y');c=Math.cos(a);s=Math.sin(a);[x,z]=[x*c+z*s,-x*s+z*c];a=angle('z');c=Math.cos(a);s=Math.sin(a);[x,y]=[x*c-y*s,x*s+y*c];return {x:x+(item.position?.x??0),y:y+(item.position?.y??0),z:z+(item.position?.z??0)};
}
export function spatialProjection(scene){
 const view=spatialView(scene),yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180,scale=38*view.zoom;
 return {scale,project:p=>{const right=p.x*Math.cos(yaw)-p.y*Math.sin(yaw),forward=p.x*Math.sin(yaw)+p.y*Math.cos(yaw),up=p.z*Math.cos(pitch)-forward*Math.sin(pitch),depth=p.z*Math.sin(pitch)+forward*Math.cos(pitch);return {x:400+(right-view.x)*scale,y:225-(up-view.y)*scale,depth};}};
}
export function zoomSpatialView(scene,factor){const v=spatialView(scene);return {...v,zoom:Math.min(10,Math.max(.1,v.zoom*factor))};}
