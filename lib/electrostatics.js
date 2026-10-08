// SI units, point charges, instantaneous electrostatic approximation.
export const COULOMB_K=8.9875517923e9;
export function electricSources(model,state){return model.bodies.filter(b=>(b.charge??0)!==0&&b.fieldEnabled!==false&&state.bodies[b.id]).map(b=>({id:b.id,q:b.charge,x:state.bodies[b.id].x,y:state.bodies[b.id].y}));}
export function electricForces(model,state){const forces=Object.fromEntries(model.bodies.map(b=>[b.id,{x:0,y:0}]));
 const charged=model.bodies.filter(b=>(b.charge??0)!==0);
 for(let i=0;i<charged.length;i++)for(let j=i+1;j<charged.length;j++){const a=charged[i],b=charged[j],qa=a.charge??0,qb=b.charge??0,toA=a.motion==='force'&&b.fieldEnabled!==false,toB=b.motion==='force'&&a.fieldEnabled!==false;if(!qa||!qb||(!toA&&!toB))continue;const av=state.bodies[a.id],bv=state.bodies[b.id],dx=av.x-bv.x,dy=av.y-bv.y,r=Math.hypot(dx,dy);if(r<1e-10)throw new Error(`Заряды «${a.name}» и «${b.name}» совпали. Разведите частицы: поле точечного заряда в его центре не определено.`);const factor=COULOMB_K*qa*qb/r**3,fx=factor*dx,fy=factor*dy;if(toA){forces[a.id].x+=fx;forces[a.id].y+=fy;}if(toB){forces[b.id].x-=fx;forces[b.id].y-=fy;}}
 return forces;
}
export function chargePotential(sources,x,y){let potential=0;for(const q of sources){const r=Math.hypot(x-q.x,y-q.y);if(r<1e-12)return NaN;potential+=COULOMB_K*q.q/r;}return potential;}
// Levels depend on original model bounds and charges, never the moving camera.
export function potentialLevels(model,sources){if(!sources.length)return [];const size=Math.max(model.scene.maxX-model.scene.minX,model.scene.maxY-model.scene.minY),reference=COULOMB_K*sources.reduce((sum,q)=>sum+Math.abs(q.q),0)/size,power=10**Math.floor(Math.log10(reference)),base=[1,2,5,10].map(n=>n*power).find(n=>n>=reference),positive=sources.some(q=>q.q>0),negative=sources.some(q=>q.q<0),levels=[.5,1,2,4,8].map(n=>base*n);return [...(negative?levels.map(n=>-n).reverse():[]),...(positive&&negative?[0]:[]),...(positive?levels:[])];}
export function potentialContours(sources,bounds,levels,columns=100,rows=64,potential=chargePotential){const {minX,maxX,minY,maxY}=bounds,dx=(maxX-minX)/columns,dy=(maxY-minY)/rows,values=new Float64Array((columns+1)*(rows+1)),index=(x,y)=>y*(columns+1)+x,mask=Math.min(dx,dy)*.55;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const x=minX+i*dx,y=minY+j*dy;values[index(i,j)]=sources.some(q=>!(q.radius>0)&&Math.hypot(x-q.x,y-q.y)<mask)?NaN:potential(sources,x,y);}
 const edges=[[0,1],[1,2],[2,3],[3,0]],contours=levels.map(level=>({level,segments:[]}));
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const points=[[minX+i*dx,minY+j*dy],[minX+(i+1)*dx,minY+j*dy],[minX+(i+1)*dx,minY+(j+1)*dy],[minX+i*dx,minY+(j+1)*dy]],v=[values[index(i,j)],values[index(i+1,j)],values[index(i+1,j+1)],values[index(i,j+1)]];if(v.some(n=>!Number.isFinite(n)))continue;
  const low=Math.min(...v),high=Math.max(...v);for(const contour of contours){const level=contour.level;if(level<=low||level>high)continue;const hits=new Map();for(let e=0;e<4;e++){const [a,b]=edges[e];if((v[a]>=level)===(v[b]>=level))continue;const t=(level-v[a])/(v[b]-v[a]);hits.set(e,[points[a][0]+t*(points[b][0]-points[a][0]),points[a][1]+t*(points[b][1]-points[a][1])]);}let pairs=[];if(hits.size===2)pairs=[[...hits.keys()]];else if(hits.size===4){const code=v.reduce((sum,n,k)=>sum+(n>=level?1<<k:0),0),center=potential(sources,minX+(i+.5)*dx,minY+(j+.5)*dy)>=level;pairs=(code===5?center:!center)?[[0,1],[2,3]]:[[3,0],[1,2]];}for(const [a,b]of pairs){const p=hits.get(a),q=hits.get(b);if(Math.hypot(p[0]-q[0],p[1]-q[1])>1e-12)contour.segments.push([...p,...q]);}}
 }
 return contours;
}
