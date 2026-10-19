import {projectedSpatialMesh,spatialEdgesSVG} from './spatial-edges.js';
import {solidMesh,spatialProjection,spatialMetrics} from '../lib/spatial.js';
import {isSpatialObject} from '../lib/spatial-catalog.js';

export function spatialSceneSVG(m,selected,small,escape,format){
 const {project,scale}=spatialProjection(m.scene),line=(a,b,color,width=1,extra='')=>{const p=project(a),q=project(b);return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${color}" stroke-width="${width}" ${extra}/>`;};
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Трёхмерная сцена" data-spatial-scene="true"><defs><clipPath id="spatialClip"><rect x="1" y="1" width="798" height="448"/></clipPath></defs><rect width="800" height="450" fill="var(--studio-plot,#f8faff)"/><g clip-path="url(#spatialClip)">';
 if(m.scene.grid)for(let i=-6;i<=6;i++){svg+=line({x:i,y:-6,z:0},{x:i,y:6,z:0},'var(--studio-line,#dce3ee)',.7)+line({x:-6,y:i,z:0},{x:6,y:i,z:0},'var(--studio-line,#dce3ee)',.7);}
 for(const [axis,color]of [['x','#ce5363'],['y','#239d86'],['z','#5585d7']]){const a={x:0,y:0,z:0},b={...a,[axis]:6};svg+=line({...a,[axis]:-6},b,color,1.7);const p=project(b);svg+=`<text x="${p.x+7}" y="${p.y-7}" fill="${color}" font-size="15" font-weight="600">${axis}</text>`;if(!small)for(const k of [-4,-2,2,4]){const q=project({...a,[axis]:k});svg+=`<text x="${q.x+5}" y="${q.y+14}" fill="${color}" font-size="10">${k}</text>`;}}
 const faces=[],edges=[],labels=[],errors=[],solids=[];
 for(const item of m.mathObjects??[]){if(!isSpatialObject(item)||!item.visible)continue;const attr=`data-spatial-object="${escape(item.id)}"`,active=item.id===selected;
  try{const metrics=spatialMetrics(item,m);let anchor;
   if(item.type==='solid'){
    const mesh=solidMesh(item,m),screen=mesh.vertices.map(project);solids.push({item,active,projected:projectedSpatialMesh(mesh,project,['sphere','hemisphere','torus','cylinder','cone','conical-frustum'].includes(item.solid),item.wireframe)});anchor={x:screen.reduce((sum,p)=>sum+p.x,0)/screen.length,y:Math.min(...screen.map(p=>p.y))-12};
    for(const face of mesh.faces){const points=face.map(i=>mesh.vertices[i]),normal={x:0,y:0,z:0};for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];normal.x+=(a.y-b.y)*(a.z+b.z);normal.y+=(a.z-b.z)*(a.x+b.x);normal.z+=(a.x-b.x)*(a.y+b.y);}const norm=Math.hypot(normal.x,normal.y,normal.z);if(norm<1e-12)continue;
     if(!item.wireframe){const brightness=.63+.37*Math.max(0,(normal.x*.4-normal.y*.6+normal.z)/norm/Math.sqrt(1.52)),color=spatialShade(item.color,brightness),pts=face.map(i=>screen[i]);faces.push({depth:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length,svg:`<polygon points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="${color}" fill-opacity="${item.opacity}" stroke="none" ${attr}/>`});}
    }
   }else if(item.type==='point3d'){const p=project(item.position);anchor={x:p.x,y:p.y-12};edges.push({depth:p.depth,svg:`<circle cx="${p.x}" cy="${p.y}" r="${active?7:5}" fill="${item.color}" stroke="var(--studio-surface,#fff)" stroke-width="2" ${attr}/>`});}
   else{const a=project(item.a3),b=project(item.b3),angle=Math.atan2(b.y-a.y,b.x-a.x),width=item.strokeWidth+(active?1.5:0);anchor={x:(a.x+b.x)/2,y:(a.y+b.y)/2-12};let shape=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${item.color}" stroke-width="${width}" ${attr}/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="transparent" stroke-width="16" ${attr}/>`;if(item.type==='vector3d'&&Math.hypot(a.x-b.x,a.y-b.y)>.01)shape+=`<path d="M${b.x-13*Math.cos(angle-.4)} ${b.y-13*Math.sin(angle-.4)}L${b.x} ${b.y}L${b.x-13*Math.cos(angle+.4)} ${b.y-13*Math.sin(angle+.4)}" fill="none" stroke="${item.color}" stroke-width="${width}" ${attr}/>`;edges.push({depth:(a.depth+b.depth)/2,svg:shape});}
   if(!small){const title=item.showLabel?item.name:'',detail=item.showMeasurements?(metrics.volume!==undefined?'V = '+format(metrics.volume)+'; S = '+format(metrics.area):metrics.length!==undefined?'L = '+format(metrics.length):'('+format(item.position.x)+'; '+format(item.position.y)+'; '+format(item.position.z)+')'):'';labels.push(`<g data-spatial-label="${escape(item.id)}" ${attr} fill="${item.color}" text-anchor="middle" font-size="12" paint-order="stroke" stroke="var(--studio-plot,#f8faff)" stroke-width="4">${title?`<text x="${anchor.x}" y="${anchor.y}">${escape(title)}</text>`:''}${detail?`<text data-spatial-metrics="${escape(item.id)}" x="${anchor.x}" y="${anchor.y+(title?16:0)}">${escape(detail)}</text>`:''}</g>`);}
  }catch(error){errors.push(item.name+': '+error.message);}
 }
 svg+=[...faces,...edges].sort((a,b)=>a.depth-b.depth).map(f=>f.svg).join('')+spatialEdgesSVG(solids,escape,small)+labels.join('');
 if(!small&&!m.mathObjects?.some(o=>isSpatialObject(o)&&o.visible))svg+='<text x="400" y="90" text-anchor="middle" fill="var(--studio-muted,#65758d)" font-size="15">Добавьте объёмную фигуру, точку или вектор</text>';
 if(!small)svg+=`<text x="16" y="430" font-size="11" fill="var(--studio-muted,#65758d)">3D · ортографическая проекция · масштаб ${format(scale/38*100)}%</text>`;
 svg+=errors.map((e,i)=>`<text data-spatial-error="true" x="16" y="${25+18*i}" font-size="12" fill="var(--studio-danger,#b42318)">${escape(e)}</text>`).join('');return svg+'</g></svg>';
}
function spatialShade(hex,factor){return '#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*factor).toString(16).padStart(2,'0')).join('');}
