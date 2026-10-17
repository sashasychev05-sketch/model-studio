export function geometryReferenceKeys(type){return ['circle','offset'].includes(type)?['center']:type==='midpoint'?['a','b']:type==='intersection'?['a','b','c','d']:['center','a','b'];}
export function geometryFormulaKeys(type){return ['midpoint','intersection'].includes(type)?[]:type==='offset'?['dx','dy']:['length','angle'];}
function lineDirection(a,b){const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(!(length>0&&Number.isFinite(length)))throw new Error('Для прямой нужны две несовпадающие точки');return {x:dx/length,y:dy/length};}
export function lineIntersection(a,b,c,d){
 const u=lineDirection(a,b),v=lineDirection(c,d),det=u.x*v.y-u.y*v.x;
 if(Math.abs(det)<1e-10)throw new Error('Прямые параллельны, совпадают или слишком близки к параллельным: единственная точка пересечения не определена');
 const dx=c.x-a.x,dy=c.y-a.y,t=(dx*v.y-dy*v.x)/det,x=a.x+t*u.x,y=a.y+t*u.y;
 if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e7||Math.abs(y)>1e7)throw new Error('Пересечение вышло за допустимый диапазон координат');
 return {x,y};
}
export function clipInfiniteLine(a,b,bounds){
 const direction=lineDirection(a,b);let lo=-Infinity,hi=Infinity;
 for(const [key,min,max]of [['x',bounds.minX,bounds.maxX],['y',bounds.minY,bounds.maxY]]){
  const delta=direction[key];if(delta===0){if(a[key]<min||a[key]>max)return null;continue;}
  const t1=(min-a[key])/delta,t2=(max-a[key])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
 }
 if(!(hi>=lo&&Number.isFinite(lo)&&Number.isFinite(hi)))return null;
 return [{x:a.x+lo*direction.x,y:a.y+lo*direction.y},{x:a.x+hi*direction.x,y:a.y+hi*direction.y}];
}
