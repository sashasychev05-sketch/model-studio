import {emptyModel} from './model.js';
import {solidKind} from './spatial-catalog.js';
import {spatialDimensions,spatialParameterIds} from './spatial.js';

function prepareSpatialObject(model,kind,parameterCount,sides){
 const next=structuredClone(model),def=solidKind(kind);sides??=def?.sides??6;if(next.subject!=='math'||next.kind==='html')throw new Error('Создайте математическую модель для 3D-построений');
 if((next.mathObjects??[]).length>=40)throw new Error('Можно добавить до 40 математических объектов');if((next.mathObjects??[]).filter(o=>o.type==='solid').length>=16&&def)throw new Error('В одной сцене можно разместить до 16 объёмных фигур');
 if(!def&&!['point3d','segment3d','vector3d'].includes(kind))throw new Error('3D-фигура не найдена');
 if(next.parameters.length+parameterCount>24)throw new Error('Для фигуры не хватает ползунков: максимум 24');if(def?.sides&&(!Number.isInteger(sides)||sides<3||sides>12))throw new Error('Число сторон основания: целое от 3 до 12');
 const used=new Set([...next.bodies,...next.parameters,...next.quantities,...(next.mathObjects??[]),...(next.connections??[]),...(next.fields??[])].map(o=>o.id)),unique=prefix=>{let n=1;while(used.has(prefix+n))n++;const id=prefix+n;used.add(id);return id;};
 const item={id:unique('space'),type:def?'solid':kind,name:def?.label??{point3d:'Точка',segment3d:'Отрезок',vector3d:'Вектор'}[kind],color:'#4f56e8',strokeWidth:2,visible:true,showLabel:true,showMeasurements:true,fill:true};
 return {next,def,item,unique,sides};
}
export function addSpatialObject(model,kind,{values={},sides}={}){
 const {next,def,item,unique,sides:count}=prepareSpatialObject(model,kind,solidKind(kind)?.fields.length??0,sides);sides=count;
 if(def){Object.assign(item,{solid:kind,dimensions:{},position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},wireframe:false,opacity:.9});if(def.sides)item.sides=sides;
  for(const f of def.fields){const value=values[f.key]??f.value;if(!Number.isFinite(value)||value<f.min||value>f.max)throw new Error('Проверьте размер «'+f.label+'»');const id=unique('p');next.parameters.push({id,label:(def.label+' · '+f.label).slice(0,80),unit:'',value,min:f.min,max:f.max});item.dimensions[f.key]=id;}
 }else if(kind==='point3d')item.position={x:1,y:1,z:2};else{item.a3={x:-2,y:0,z:0};item.b3={x:2,y:1,z:3};}
 next.mathObjects??=[];next.mathObjects.push(item);next.scene.dimension=3;Object.assign(model,next);return item;
}
export function spatialModel(kind='space3d'){const m=emptyModel();Object.assign(m,{subject:'math',title:'Трёхмерная модель',topic:'Стереометрия',description:'Объёмные фигуры и построения в пространстве',notes:'Перетаскивайте сцену, чтобы вращать вид. Колесо и кнопки +/− меняют масштаб. Меняйте размеры ползунками. В редакторе доступны также поля размеров, координаты x, y, z и углы поворота. Объём и площадь поверхности вычисляются по формулам геометрических тел.',scene:{minX:-6,maxX:6,minY:-4,maxY:4,grid:true,dimension:3}});if(kind!=='space3d'){const item=addSpatialObject(m,kind);m.title=item.name;}return m;}
export function duplicateSpatialObject(model,item){
 const references=spatialParameterIds(item),{next,item:created,unique}=prepareSpatialObject(model,item.type==='solid'?item.solid:item.type,references.length,item.sides),copy={...structuredClone(item),id:created.id,name:(item.name+' · копия').slice(0,80)},mapping=new Map();
 if(item.type==='solid'){
  spatialDimensions(item,model);
  for(const old of references){const original=model.parameters.find(p=>p.id===old);if(!original)throw new Error('Параметр размера не найден');const p={...structuredClone(original),id:unique('p')};delete p.binding;next.parameters.push(p);mapping.set(old,p.id);}
  copy.dimensions=Object.fromEntries(Object.entries(item.dimensions).map(([key,expr])=>[key,expr.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g,id=>mapping.get(id)??id)]));
 }
 const points=copy.position?[copy.position]:[copy.a3,copy.b3],dx=Math.max(...points.map(p=>p.x))<=9999?1:Math.min(...points.map(p=>p.x))>=-9999?-1:0;for(const p of points)p.x+=dx;
 next.mathObjects??=[];next.mathObjects.push(copy);next.scene.dimension=3;Object.assign(model,next);return copy;
}
