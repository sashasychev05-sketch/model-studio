import {emptyModel} from './model.js';
import {solidKind} from './spatial-catalog.js';

export function addSpatialObject(model,kind,{values={},sides}={}){
 const next=structuredClone(model),def=solidKind(kind);sides??=def?.sides??6;if(next.subject!=='math'||next.kind==='html')throw new Error('Создайте математическую модель для 3D-построений');
 if((next.mathObjects??[]).length>=40)throw new Error('Можно добавить до 40 математических объектов');if((next.mathObjects??[]).filter(o=>o.type==='solid').length>=16&&def)throw new Error('В одной сцене можно разместить до 16 объёмных фигур');
 if(!def&&!['point3d','segment3d','vector3d'].includes(kind))throw new Error('3D-фигура не найдена');
 if(def&&next.parameters.length+def.fields.length>24)throw new Error('Для фигуры не хватает ползунков: максимум 24');if(def?.sides&&(!Number.isInteger(sides)||sides<3||sides>12))throw new Error('Число сторон основания: целое от 3 до 12');
 const used=new Set([...next.bodies,...next.parameters,...next.quantities,...(next.mathObjects??[]),...(next.connections??[]),...(next.fields??[])].map(o=>o.id)),unique=prefix=>{let n=1;while(used.has(prefix+n))n++;const id=prefix+n;used.add(id);return id;};
 const item={id:unique('space'),type:def?'solid':kind,name:def?.label??{point3d:'Точка',segment3d:'Отрезок',vector3d:'Вектор'}[kind],color:'#4f56e8',strokeWidth:2,visible:true,showLabel:true,showMeasurements:true,fill:true};
 if(def){Object.assign(item,{solid:kind,dimensions:{},position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},wireframe:false,opacity:.9});if(def.sides)item.sides=sides;
  for(const f of def.fields){const value=values[f.key]??f.value;if(!Number.isFinite(value)||value<f.min||value>f.max)throw new Error('Проверьте размер «'+f.label+'»');const id=unique('p');next.parameters.push({id,label:(def.label+' · '+f.label).slice(0,80),unit:'',value,min:f.min,max:f.max});item.dimensions[f.key]=id;}
 }else if(kind==='point3d')item.position={x:1,y:1,z:2};else{item.a3={x:-2,y:0,z:0};item.b3={x:2,y:1,z:3};}
 next.mathObjects??=[];next.mathObjects.push(item);next.scene.dimension=3;Object.assign(model,next);return item;
}
export function spatialModel(kind='space3d'){const m=emptyModel();Object.assign(m,{subject:'math',title:'Трёхмерная модель',topic:'Стереометрия',description:'Объёмные фигуры и построения в пространстве',notes:'Перетаскивайте сцену, чтобы вращать вид. Колесо и кнопки +/− меняют масштаб. Меняйте размеры ползунками. В редакторе доступны также поля размеров, координаты x, y, z и углы поворота. Объём и площадь поверхности вычисляются по формулам геометрических тел.',scene:{minX:-6,maxX:6,minY:-4,maxY:4,grid:true,dimension:3}});if(kind!=='space3d'){const item=addSpatialObject(m,kind);m.title=item.name;}return m;}
export function duplicateSpatialObject(model,item){
 const next=structuredClone(model);let copy;
 if(item.type==='solid'){const values=Object.fromEntries(Object.entries(item.dimensions).map(([key,id])=>[key,next.parameters.find(p=>p.id===id)?.value]));copy=addSpatialObject(next,item.solid,{values,sides:item.sides});for(const key of ['position','rotation','wireframe','opacity'])copy[key]=structuredClone(item[key]);copy.position.x+=1;}
 else{copy=addSpatialObject(next,item.type);if(item.type==='point3d')copy.position={...item.position,x:item.position.x+1};else{copy.a3={...item.a3,x:item.a3.x+1};copy.b3={...item.b3,x:item.b3.x+1};}}
 for(const key of ['name','color','strokeWidth','visible','showLabel','showMeasurements','fill'])copy[key]=item[key];copy.name=(item.name+' · копия').slice(0,80);Object.assign(model,next);return copy;
}
