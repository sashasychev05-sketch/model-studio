import {emptyModel,newBody} from './model.js';
import {cameraOf} from './camera.js';
import {mathPresetById} from './math-preset-catalog.js';
import {mathPresetModel} from './math-presets.js';
import {mathObjectKinds} from './math-objects.js';

export function addMathObject(model,type,id,nextPointId){
 if(!mathObjectKinds.some(([kind])=>kind===type))throw new Error('Неизвестный математический объект');
 if((model.mathObjects??[]).length>=40)throw new Error('Можно добавить до 40 математических объектов');
 if(type==='function'&&(model.mathObjects??[]).filter(o=>o.type==='function').length>=8)throw new Error('Можно добавить до 8 графиков функций');
 const needed=type==='function'?0:['circle','arc'].includes(type)?1:type==='polygon'?3:2,points=model.bodies.filter(b=>b.shape!=='text').slice(0,needed),camera=cameraOf(model.scene),span=Math.min(model.scene.maxX-model.scene.minX,model.scene.maxY-model.scene.minY)/camera.zoom/4;
 if(model.bodies.length+Math.max(0,needed-points.length)>60)throw new Error('Не хватает места для опорных точек: максимум 60 объектов');
 while(points.length<needed){const i=points.length,pointId=nextPointId(),b={...newBody(pointId,'point'),name:pointId,motion:'fixed',x:camera.x+(i===0?-span:i===1?span:0),y:camera.y+(i===2?span:-span/2),trail:false,vector:false};model.bodies.push(b);points.push(b);}
 const item={id,type,name:mathObjectKinds.find(([kind])=>kind===type)[1],color:'#4f56e8',strokeWidth:2,visible:true,showLabel:true,showMeasurements:type!=='line',fill:type==='polygon'};
 if(['circle','arc'].includes(type)){item.center=points[0].id;item.radius='2';if(type==='arc')Object.assign(item,{startAngle:'0',sweepAngle:'90'});}
 else if(type==='polygon')item.points=points.map(p=>p.id);
 else if(type==='function')Object.assign(item,{expression:'x^2',minX:model.scene.minX,maxX:model.scene.maxX,showMeasurements:false});
 else Object.assign(item,{a:points[0].id,b:points[1].id});
 model.mathObjects??=[];model.mathObjects.push(item);return item;
}
export function mathTemplate(kind='math'){
 if(mathPresetById(kind))return mathPresetModel(kind);
 const m=emptyModel();m.subject='math';m.title='Математическая модель';m.topic=kind==='function'?'Функции и графики':'Геометрия';m.scene={minX:-6,maxX:6,minY:-4,maxY:4,grid:true};
 if(kind==='function'){
  m.title='Исследование функции';m.parameters=[{id:'a',label:'Коэффициент a',unit:'',value:1,min:-3,max:3},{id:'b',label:'Сдвиг b',unit:'',value:0,min:-3,max:3}];
  const curve=addMathObject(m,'function','curve',()=>{});curve.expression='a*x^2+b';curve.name='Парабола';m.notes='Изменяйте a и b. Как меняются направление ветвей и положение вершины? В редакторе формулу можно изменить в свойствах графика.';
 }
 if(kind==='geometry'){
  m.title='Треугольник и окружность';m.bodies=[['A',-2,-1],['B',2,-1],['C',0,2]].map(([id,x,y])=>({...newBody(id,'point'),name:id,x,y,motion:'fixed',trail:false}));
  addMathObject(m,'polygon','triangle',()=>{}).name='ABC';const circle=addMathObject(m,'circle','circle',()=>{});circle.center='C';circle.radius='r';circle.color='#239d86';circle.name='Окружность';
  m.parameters=[{id:'r',label:'Радиус r',unit:'',value:2,min:.2,max:4}];m.notes='В редакторе перетаскивайте вершины A, B и C и следите за площадью и периметром. В демонстрации и готовом HTML изменяйте радиус ползунком; для перемещения вершин автор может заранее связать их координаты с ползунками. Центр окружности связан с точкой C. Площадь многоугольника предназначена для простого контура без самопересечений.';
 }
 return m;
}
