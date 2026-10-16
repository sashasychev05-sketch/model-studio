import {evaluate,dependencies} from './expression.js';

export const mathObjectKinds=[['segment','Отрезок'],['vector','Вектор'],['circle','Окружность'],['polygon','Многоугольник'],['function','График y = f(x)']];
export function mathPointIds(item){return item.type==='polygon'?item.points:item.type==='circle'?[item.center]:item.type==='function'?[]:[item.a,item.b];}
export function validateMathObjects(m){
 const list=m.mathObjects===undefined?[]:m.mathObjects;
 const fail=message=>{throw new Error(message);};
 if(!Array.isArray(list)||list.length>40)fail('Математических объектов может быть не больше 40');
 if(m.kind==='html'&&list.length)fail('Математические объекты доступны в конструкторе');
 const points=new Set((m.bodies??[]).map(b=>b.id)),allowed=new Set(['t','pi','e',...(m.parameters??[]).map(p=>p.id),...(m.quantities??[]).map(q=>q.id)]);
 for(const b of m.bodies??[])for(const suffix of ['x','y','vx','vy','m','q','R','gravity'])allowed.add(b.id+'_'+suffix);
 if(list.filter(o=>o?.type==='function').length>8)fail('На одной сцене можно построить до 8 графиков функций');
 for(const item of list){
  if(!item||!mathObjectKinds.some(([type])=>type===item.type)||typeof item.name!=='string'||!item.name.trim()||item.name.length>80)fail('Проверьте математический объект');
  if(!/^#[0-9a-fA-F]{6}$/.test(item.color)||!Number.isFinite(item.strokeWidth)||item.strokeWidth<1||item.strokeWidth>8)fail('Проверьте цвет и толщину математического объекта');
  for(const key of ['visible','showLabel','showMeasurements','fill'])if(typeof item[key]!=='boolean')fail('Проверьте отображение математического объекта');
  if(item.type==='polygon'&&(!Array.isArray(item.points)||item.points.length<3||item.points.length>12||new Set(item.points).size!==item.points.length))fail('Для многоугольника выберите от 3 до 12 разных точек');
  if(mathPointIds(item).some(id=>!points.has(id)))fail('Опорная точка математического объекта не найдена');
  if(['segment','vector'].includes(item.type)&&item.a===item.b)fail('Выберите две разные точки отрезка или вектора');
  if(item.type==='function'&&(!Number.isFinite(item.minX)||!Number.isFinite(item.maxX)||Math.abs(item.minX)>1e7||Math.abs(item.maxX)>1e7||item.maxX<=item.minX))fail('Проверьте диапазон x графика функции');
  const expression=item.type==='circle'?item.radius:item.type==='function'?item.expression:null;
  if(expression!==null)try{
   if(typeof expression!=='string'||!expression.trim()||expression.length>500)fail('Формула должна содержать от 1 до 500 символов');
   for(const name of dependencies(expression))if(!allowed.has(name)&&!(item.type==='function'&&name==='x'))fail(`Величина «${name}» недоступна`);
  }catch(error){fail(`«${item.name}»: ${error.message}`);}
 }
}
export function mathObjectGeometry(item,state,values={}){
 const points=mathPointIds(item).map(id=>state.bodies[id]);
 if(points.some(p=>!p))throw new Error('Опорная точка не найдена');
 if(item.type==='circle'){
  const radius=evaluate(item.radius,values);if(!(radius>0&&radius<=1e7))throw new Error('Радиус должен быть положительным и не больше 10 000 000');
  return {center:points[0],radius,length:2*Math.PI*radius,area:Math.PI*radius*radius};
 }
 if(item.type==='polygon'){
  // Translate to the first vertex before the shoelace sum to reduce cancellation.
  const origin=points[0];let twiceArea=0,perimeter=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];twiceArea+=(a.x-origin.x)*(b.y-origin.y)-(b.x-origin.x)*(a.y-origin.y);perimeter+=Math.hypot(b.x-a.x,b.y-a.y);}
  return {points,area:Math.abs(twiceArea)/2,perimeter};
 }
 if(item.type==='function')return {};
 const dx=points[1].x-points[0].x,dy=points[1].y-points[0].y;
 return {points,dx,dy,length:Math.hypot(dx,dy)};
}
// A bounded numerical picture, not symbolic analysis. Invalid domains and steep
// jumps split the path instead of drawing a line across an asymptote.
export function mathFunctionSegments(item,values,bounds,samples=320){
 const lo=Math.max(item.minX,bounds.minX),hi=Math.min(item.maxX,bounds.maxX);if(!(hi>lo))return [];
 const count=Math.max(20,Math.min(640,samples)),height=bounds.maxY-bounds.minY,segments=[];let current=[];
 const value=x=>{try{return evaluate(item.expression,{...values,x});}catch{return null;}};
 for(let i=0;i<=count;i++){
  const x=lo+(hi-lo)*i/count,y=value(x),previous=current.at(-1);
  let connect=y!==null&&Math.abs(y)<1e9;
  if(connect&&previous){const mid=value((previous.x+x)/2);connect=mid!==null&&Math.abs(y-previous.y)<=height*2&&Math.abs(mid-(y+previous.y)/2)<=height*.15;}
  if(!connect){if(current.length>1)segments.push(current);current=[];}
  if(y!==null&&Math.abs(y)<1e9)current.push({x,y});
 }
 if(current.length>1)segments.push(current);return segments;
}
