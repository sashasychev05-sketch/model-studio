const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
export function projectedSpatialMesh(mesh,project,smooth=false,wireframe=false){
 const points=mesh.vertices.map(project),occluders=[],edges=new Map();
 for(const face of mesh.faces){
  const normal={x:0,y:0,z:0};for(let i=0;i<face.length;i++){const a=mesh.vertices[face[i]],b=mesh.vertices[face[(i+1)%face.length]];normal.x+=(a.y-b.y)*(a.z+b.z);normal.y+=(a.z-b.z)*(a.x+b.x);normal.z+=(a.x-b.x)*(a.y+b.y);}
  const norm=Math.hypot(normal.x,normal.y,normal.z);if(norm<1e-12)continue;for(const axis of ['x','y','z'])normal[axis]/=norm;
  const polygon=face.map(i=>points[i]),area=polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p.x*q.y-p.y*q.x;},0),front=area<0;
  for(let i=1;i<polygon.length-1;i++){
   const a=polygon[0],b=polygon[i],c=polygon[i+1],det=cross(b.x-a.x,b.y-a.y,c.x-a.x,c.y-a.y);if(Math.abs(det)<1e-8)continue;
   const dzB=b.depth-a.depth,dzC=c.depth-a.depth,px=(dzB*(c.y-a.y)-dzC*(b.y-a.y))/det,py=((b.x-a.x)*dzC-(c.x-a.x)*dzB)/det;
   occluders.push({points:[a,b,c],sign:Math.sign(det),px,py,p0:a.depth-px*a.x-py*a.y,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y)});
  }
  for(let i=0;i<face.length;i++){const a=face[i],b=face[(i+1)%face.length],key=[a,b].sort((x,y)=>x-y).join(':');if(!edges.has(key))edges.set(key,{a:points[a],b:points[b],faces:[]});edges.get(key).faces.push({front,normal});}
 }
 return {occluders,edges:[...edges.values()].filter(e=>{
  if(Math.hypot(e.a.x-e.b.x,e.a.y-e.b.y)<.02)return false;
  if(!smooth||wireframe||e.faces.length!==2)return true;
  const [a,b]=e.faces;return a.front!==b.front||a.normal.x*b.normal.x+a.normal.y*b.normal.y+a.normal.z*b.normal.z<.7;
 })};
}
export function spatialEdgeIntervals(edge,occluders){
 const a=edge.a,b=edge.b,dx=b.x-a.x,dy=b.y-a.y,dz=b.depth-a.depth,minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y),hidden=[];
 for(const f of occluders){
  if(maxX<f.minX||minX>f.maxX||maxY<f.minY||minY>f.maxY)continue;let lo=0,hi=1;
  for(let i=0;i<3;i++){const p=f.points[i],q=f.points[(i+1)%3],ex=q.x-p.x,ey=q.y-p.y,start=f.sign*cross(ex,ey,a.x-p.x,a.y-p.y),slope=f.sign*cross(ex,ey,dx,dy);
   if(Math.abs(slope)<1e-10){if(start<-.000001){hi=-1;break;}}else{const t=(-.000001-start)/slope;if(slope>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);}if(hi<=lo)break;
  }
  if(hi<=lo)continue;const start=f.px*a.x+f.py*a.y+f.p0-a.depth-1e-7,slope=f.px*dx+f.py*dy-dz;
  if(Math.abs(slope)<1e-12){if(start<=0)continue;}else{const t=-start/slope;if(slope>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);}
  if(hi-lo>1e-6)hidden.push([Math.max(0,lo),Math.min(1,hi)]);
 }
 hidden.sort((a,b)=>a[0]-b[0]);const merged=[];for(const span of hidden){if(!merged.length||span[0]>merged.at(-1)[1]+1e-6)merged.push([...span]);else merged.at(-1)[1]=Math.max(merged.at(-1)[1],span[1]);}
 const segments=[];let t=0;for(const [lo,hi]of merged){if(lo-t>1e-6)segments.push({from:t,to:lo,hidden:false});segments.push({from:lo,to:hi,hidden:true});t=hi;}if(1-t>1e-6)segments.push({from:t,to:1,hidden:false});return segments;
}
export function spatialEdgesSVG(solids,escape,small=false){
 const occluders=solids.flatMap(s=>s.projected.occluders),buckets=new Map(),cached=new Map(),range=(min,max,limit)=>[Math.max(0,Math.floor(min/64)),Math.min(limit,Math.floor(max/64))];let out='';
 for(const f of occluders){const [x0,x1]=range(f.minX,f.maxX,12),[y0,y1]=range(f.minY,f.maxY,7);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=x+':'+y;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(f);}}
 const intervals=edge=>{const key=[edge.a.x,edge.a.y,edge.a.depth,edge.b.x,edge.b.y,edge.b.depth].join(',');if(cached.has(key))return cached.get(key);const found=new Set(),[x0,x1]=range(Math.min(edge.a.x,edge.b.x),Math.max(edge.a.x,edge.b.x),12),[y0,y1]=range(Math.min(edge.a.y,edge.b.y),Math.max(edge.a.y,edge.b.y),7);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const f of buckets.get(x+':'+y)??[])found.add(f);const value=spatialEdgeIntervals(edge,[...found]);cached.set(key,value);return value;};
 for(const {item,projected,active}of solids)for(const edge of projected.edges)for(const span of intervals(edge)){
  if(span.hidden&&(small||item.hiddenEdges===false))continue;
  const a=edge.a,b=edge.b,point=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),p=point(span.from),q=point(span.to);
  out+=`<line data-spatial-object="${escape(item.id)}" data-spatial-edge="${span.hidden?'hidden':'visible'}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${item.color}" stroke-width="${(item.strokeWidth??2)+(active ? .7 : 0)}" fill="none" ${span.hidden?'stroke-dasharray="5 4" opacity=".65"':''}/>`;
 }return out;
}
