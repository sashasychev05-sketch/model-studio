import {mathObjectGeometry,mathFunctionSegments} from '../lib/math-objects.js';
import {clipInfiniteLine} from '../lib/construction.js';

export function mathObjectsSVG(m,s,c,tr,selected,small,escape,format){
 let out='';const {X,Y,scale,r}=tr;
 for(const item of m.mathObjects??[]){if(!item.visible)continue;
  try{
   const v=mathObjectGeometry(item,s,c),color=item.color,width=item.strokeWidth+(selected===item.id&&!small?1.5:0),style=`stroke="${color}" stroke-width="${width}"`,fill=item.fill?color:'none';let shape='',anchor,detail='';
   if(item.type==='function'){
    const paths=mathFunctionSegments(item,c,r,small?80:320);shape=paths.map(points=>`<polyline points="${points.map(p=>X(p.x)+','+Y(p.y)).join(' ')}" fill="none" ${style}/>`).join('');
    const visible=paths.flat().filter(p=>p.y>=r.minY&&p.y<=r.maxY);anchor=visible[Math.floor(visible.length*.65)]??{x:r.minX,y:r.maxY};
   }else if(item.type==='arc'){
    const radians=angle=>angle*Math.PI/180,at=angle=>({x:v.center.x+v.radius*Math.cos(radians(angle)),y:v.center.y+v.radius*Math.sin(radians(angle))}),start=at(v.startAngle),parts=Math.ceil(Math.abs(v.sweepAngle)/180);let path=`M${X(start.x)} ${Y(start.y)}`;
    for(let i=1;i<=parts;i++){const end=at(v.startAngle+v.sweepAngle*i/parts);path+=`A${v.radius*scale} ${v.radius*scale} 0 0 ${v.sweepAngle>0?0:1} ${X(end.x)} ${Y(end.y)}`;}
    if(item.fill)path+=Math.abs(v.sweepAngle)===360?'Z':`L${X(v.center.x)} ${Y(v.center.y)}Z`;
    shape=`<path d="${path}" fill="${fill}" fill-opacity=".12" ${style}/>`;const mid=radians(v.startAngle+v.sweepAngle/2);anchor={x:v.center.x+v.radius*.7*Math.cos(mid),y:v.center.y+v.radius*.7*Math.sin(mid)};detail='α = '+format(v.sweepAngle)+'°; L = '+format(v.length)+(item.fill?'; S = '+format(v.area):'');
   }else if(item.type==='line'){
    const ends=clipInfiniteLine(v.points[0],v.points[1],r);if(!ends)continue;const [a,b]=ends;shape=`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" ${style}/><line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="transparent" stroke-width="14"/>`;anchor={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   }else if(item.type==='circle'){
    shape=`<circle cx="${X(v.center.x)}" cy="${Y(v.center.y)}" r="${v.radius*scale}" fill="${fill}" fill-opacity=".1" ${style}/>`;anchor={x:v.center.x,y:v.center.y+v.radius/2};detail='r = '+format(v.radius);
   }else if(item.type==='polygon'){
    shape=`<polygon points="${v.points.map(p=>X(p.x)+','+Y(p.y)).join(' ')}" fill="${fill}" fill-opacity=".12" fill-rule="evenodd" ${style}/>`;anchor={x:v.points.reduce((sum,p)=>sum+p.x,0)/v.points.length,y:v.points.reduce((sum,p)=>sum+p.y,0)/v.points.length};detail='P = '+format(v.perimeter)+'; S = '+format(v.area);
   }else{
    const [a,b]=v.points;shape=`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" ${style}/><line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="transparent" stroke-width="14"/>`;
    if(item.type==='vector'){const angle=Math.atan2(Y(b.y)-Y(a.y),X(b.x)-X(a.x)),tip={x:X(b.x),y:Y(b.y)};shape+=`<path d="M${tip.x-12*Math.cos(angle-.45)} ${tip.y-12*Math.sin(angle-.45)}L${tip.x} ${tip.y}L${tip.x-12*Math.cos(angle+.45)} ${tip.y-12*Math.sin(angle+.45)}" fill="none" ${style}/>`;}
    anchor={x:(a.x+b.x)/2,y:(a.y+b.y)/2};detail=item.type==='vector'?'('+format(v.dx)+'; '+format(v.dy)+'); |v| = '+format(v.length):'L = '+format(v.length);
   }
   const label=[item.showLabel?item.name:'',item.showMeasurements?detail:''].filter(Boolean).join(' · ');
   out+=`<g data-math-object="${escape(item.id)}" style="cursor:${small?'default':'pointer'}">${shape}${!small&&label?`<text x="${X(anchor.x)}" y="${Y(anchor.y)-10}" text-anchor="middle" font-size="13" fill="${color}" paint-order="stroke" stroke="var(--studio-plot,#f8faff)" stroke-width="4">${escape(label)}</text>`:''}</g>`;
  }catch(error){if(!small)out+=`<text data-math-error="${escape(item.id)}" x="${tr.ox+8}" y="${tr.oy+18+(m.mathObjects.indexOf(item)%12)*18}" font-size="12" fill="var(--studio-danger,#b42318)">${escape(item.name+': '+error.message)}</text>`;}
 }
 return out;
}
