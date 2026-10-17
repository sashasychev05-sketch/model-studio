import {emptyModel,newBody} from './model.js';
import {cameraOf} from './camera.js';
import {mathPresetById} from './math-preset-catalog.js';
import {evaluate} from './expression.js';
import {dependencies} from './expression.js';
import {geometryReferenceKeys,geometryFormulaKeys} from './construction.js';

// Construct on a clone so limits or invalid settings never leave partial objects.
export function addMathPreset(model,kind,{values={},sides=6,position,name}={}){
 const def=mathPresetById(kind);if(!def)throw new Error('Шаблон не найден');
 if(def.id==='regular-polygon'&&(!Number.isInteger(sides)||sides<3||sides>12))throw new Error('Выберите целое число сторон от 3 до 12');
 const next=structuredClone(model),used=new Set([...next.bodies,...next.parameters,...next.quantities,...(next.mathObjects??[]),...(next.connections??[]),...(next.fields??[]),...(next.geometry??[]),...(next.measurements??[])].map(o=>o.id));
 for(const b of next.bodies)for(const suffix of ['x','y','vx','vy','m','q','R','gravity'])used.add(b.id+'_'+suffix);
 const unique=prefix=>{let n=1;while(used.has(prefix+n))n++;const id=prefix+n;used.add(id);return id;};
 if((next.mathObjects??[]).length>=40)throw new Error('Можно добавить до 40 математических объектов');
 if(next.parameters.length+def.fields.length>24)throw new Error('Для шаблона не хватает ползунков: максимум 24');
 if(def.group==='functions'&&(next.mathObjects??[]).filter(o=>o.type==='function').length>=8)throw new Error('Можно добавить до 8 графиков функций');
 const item={id:unique('shape'),type:def.group==='functions'?'function':def.type??'polygon',name:(name?.trim()||def.label).slice(0,80),color:'#4f56e8',strokeWidth:2,visible:true,showLabel:true,showMeasurements:def.group!=='functions',fill:def.group==='geometry',preset:{kind,parameters:{}}};
 const scope={};for(const f of def.fields){const value=values[f.key]??f.value;if(!Number.isFinite(value)||value<f.min||value>f.max)throw new Error('«'+f.label+'»: допустимо от '+f.min+' до '+f.max);const id=unique('p');next.parameters.push({id,label:(item.name+' · '+f.label).slice(0,80),unit:f.unit,value,min:f.min,max:f.max});item.preset.parameters[f.key]=id;scope[f.key]=value;}
 const expression=text=>text.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g,key=>item.preset.parameters[key]??key);
 if(def.group==='functions')Object.assign(item,{expression:expression(def.expression),minX:next.scene.minX,maxX:next.scene.maxX});
 else{
  const pointCount=item.type==='polygon'?(def.id==='regular-polygon'?sides:def.points.length):0;
  if(next.bodies.length+pointCount+1>60)throw new Error('Для шаблона не хватает точек: максимум 60');
  if((next.geometry??[]).length+pointCount>40)throw new Error('Для шаблона не хватает геометрических зависимостей: максимум 40');
  const center=position??cameraOf(next.scene),origin={...newBody(unique('O'),'point'),name:pointCount?('Начало: '+item.name).slice(0,80):'O',x:center.x,y:center.y,trail:false,vector:false,visible:!pointCount};next.bodies.push(origin);item.preset.origin=origin.id;
  if(item.type==='polygon'){
   item.points=[];next.geometry??=[];const coords=def.id==='regular-polygon'?Array.from({length:sides},(_,i)=>['radius*cos((rotation+'+(90+360*i/sides)+')*pi/180)','radius*sin((rotation+'+(90+360*i/sides)+')*pi/180)']):def.points;
   for(const [i,[dx,dy]]of coords.entries()){const point={...newBody(unique('P'),'point'),name:String.fromCharCode(65+i),x:origin.x+evaluate(dx,scope),y:origin.y+evaluate(dy,scope),trail:false,vector:false};next.bodies.push(point);item.points.push(point.id);next.geometry.push({id:unique('geometry'),type:'offset',target:point.id,center:origin.id,dx:expression(dx),dy:expression(dy)});}
   if(def.id==='regular-polygon')item.preset.sides=sides;
  }else{item.center=origin.id;item.radius=expression('radius');if(item.type==='arc'){item.startAngle=expression('start');item.sweepAngle=expression('sweep');}}
 }
 next.mathObjects??=[];next.mathObjects.push(item);Object.assign(model,next);return item;
}
export function mathPresetModel(kind){const def=mathPresetById(kind);if(!def)throw new Error('Шаблон не найден');const m=emptyModel();Object.assign(m,{subject:'math',title:def.label,topic:def.group==='functions'?'Функции и графики':'Геометрия',description:def.description,scene:{minX:-8,maxX:8,minY:-5,maxY:5,grid:true},notes:def.description+' Выберите фигуру в списке и меняйте её размеры в свойствах или ползунками под сценой. Масштаб осей остаётся одинаковым.'});addMathPreset(m,kind);return m;}
export function duplicateMathPreset(model,item){
 const p=item.preset,values=Object.fromEntries(Object.entries(p.parameters).map(([key,id])=>[key,model.parameters.find(q=>q.id===id).value])),origin=model.bodies.find(b=>b.id===p.origin),copy=addMathPreset(model,p.kind,{values,sides:p.sides,position:origin?{x:origin.x+.5,y:origin.y+.5}:undefined,name:item.name+' · копия'});
 for(const key of ['color','strokeWidth','visible','showLabel','showMeasurements','fill'])copy[key]=item[key];return copy;
}
export function removeMathObject(model,id){
 const item=model.mathObjects?.find(o=>o.id===id);model.mathObjects=(model.mathObjects??[]).filter(o=>o.id!==id);const controls=item?.preset?.parameters??(item?.type==='solid'?item.dimensions:null);if(!controls)return;
 const owned=new Set([item.preset?.origin,...(item.points??[])].filter(Boolean)),keep=new Set();
 const references=o=>[o.a,o.b,o.c,o.d,o.vertex,o.center,...(o.points??[])];
 for(const o of [...model.mathObjects,...(model.measurements??[]),...(model.connections??[])])for(const ref of references(o))if(owned.has(ref))keep.add(ref);
 for(const p of model.parameters)if(owned.has(p.binding?.body))keep.add(p.binding.body);
 for(const f of model.fields??[])for(const ref of f.targets??[])if(owned.has(ref))keep.add(ref);
 for(const g of model.geometry??[])if(!owned.has(g.target))for(const key of geometryReferenceKeys(g.type))if(owned.has(g[key]))keep.add(g[key]);
 const expressions=()=>[...model.bodies.flatMap(b=>[b.fx,b.fy,b.xFormula,b.yFormula,b.dynamicLabel?.expression]),...model.mathObjects.flatMap(o=>[o.expression,o.radius,o.startAngle,o.sweepAngle,...Object.values(o.dimensions??{})]),...model.quantities.map(q=>q.expression),...model.graphs.map(q=>q.expression),...(model.connections??[]).flatMap(c=>[c.stiffness,c.damping]),...(model.invariants??[]).map(q=>q.expression),...(model.geometry??[]).flatMap(g=>geometryFormulaKeys(g.type).map(k=>g[k])),...(model.fields??[]).flatMap(f=>Object.values(f).filter(v=>typeof v==='string'))].filter(v=>typeof v==='string');
 for(const text of expressions())for(const ref of owned)if(new RegExp('\\b'+ref+'_(x|y|vx|vy|m|q|R|gravity)\\b').test(text))keep.add(ref);
 let changed=true;while(changed){changed=false;for(const g of model.geometry??[])if(keep.has(g.target))for(const key of geometryReferenceKeys(g.type))if(owned.has(g[key])&&!keep.has(g[key])){keep.add(g[key]);changed=true;}}
 model.bodies=model.bodies.filter(b=>!owned.has(b.id)||keep.has(b.id));model.geometry=(model.geometry??[]).filter(g=>!owned.has(g.target)||keep.has(g.target));
 const remaining=new Set();for(const text of expressions())try{for(const symbol of dependencies(text))remaining.add(symbol);}catch{}
 if(model.analysis?.config?.expression)try{for(const symbol of dependencies(model.analysis.config.expression))remaining.add(symbol);}catch{}
 for(const p of model.parameters)if(p.binding)remaining.add(p.id);for(const p of model.analysis?.config?.fit??[])remaining.add(p.id);
 const generated=new Set(Object.values(controls));for(const o of model.mathObjects)for(const param of Object.values(o.preset?.parameters??{}))remaining.add(param);
 model.parameters=model.parameters.filter(p=>!generated.has(p.id)||remaining.has(p.id));
 for(const scenario of model.scenarios??[])for(const key of generated)if(!model.parameters.some(p=>p.id===key)&&scenario.parameters)delete scenario.parameters[key];
}
