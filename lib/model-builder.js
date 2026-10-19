import {emptyModel,newBody,validateModel} from './model.js';
import {validatePhysics} from './engine.js';
import {newConnection,newField} from './components.js';
import {mathPresets} from './math-preset-catalog.js';
import {mathPresetModel} from './math-presets.js';
import {solidKinds} from './spatial-catalog.js';
import {spatialModel} from './spatial-authoring.js';
import {calculationKinds} from './calculations.js';

const input=(key,label,value,min,max,unit='',hint='Введите число или оставьте предложенное.')=>({key,label,value,min,max,unit,hint});
const quantity=(id,label,expression,unit='')=>({id,label,expression,unit});
export const builderGroups=[
 {id:'plane',subject:'geometry',title:'Фигура на плоскости',description:'Длины, углы, площадь и периметр',mark:'△'},
 {id:'solid',subject:'geometry',title:'Объёмная фигура',description:'Размеры, площадь поверхности и объём',mark:'◇'},
 {id:'graph',subject:'math',title:'График функции',description:'Посмотреть, как меняется график',mark:'∿'},
 {id:'algebra',subject:'math',title:'Числа и уравнения',description:'Проценты, пропорции и уравнения',mark:'='},
 {id:'motion',subject:'physics',title:'Движение и силы',description:'Движение, разгон, пружина и маятник',mark:'↗'},
 {id:'electric',subject:'physics',title:'Электричество',description:'Два резистора и постоянный ток',mark:'ϟ'},
 {id:'heat',subject:'physics',title:'Теплота',description:'Нагревание и тепловое равновесие',mark:'°'},
 {id:'optics',subject:'physics',title:'Линза',description:'Размер и положение изображения',mark:'↔'},
];
const calculationFields={
 percent:[input('whole','Исходное число',200,-10000,10000),input('percent','Сколько процентов',15,-100,200,'%')],
 proportion:[input('a','Первое число: a',2,-100,100),input('b','Второе число: b',3,-100,100),input('c','Третье число: c',4,-100,100)],
 quadratic:[input('a','Число перед x²',1,-100,100),input('b','Число перед x',-3,-100,100),input('c','Свободное число',2,-100,100)],
 system:[input('a','Первое уравнение: число перед x',1,-100,100),input('b','Первое уравнение: число перед y',1,-100,100),input('c','Первое уравнение: правая часть',5,-100,100),input('d','Второе уравнение: число перед x',1,-100,100),input('e','Второе уравнение: число перед y',-1,-100,100),input('f','Второе уравнение: правая часть',1,-100,100)],
 series:[input('voltage','Напряжение источника',12,-48,48,'В'),input('r1','Сопротивление первого резистора',4,.1,100,'Ом'),input('r2','Сопротивление второго резистора',8,.1,100,'Ом')],
 parallel:[input('voltage','Напряжение источника',12,-48,48,'В'),input('r1','Сопротивление первой ветви',4,.1,100,'Ом'),input('r2','Сопротивление второй ветви',8,.1,100,'Ом')],
 heat:[input('mass','Масса тела',1,.1,10,'кг'),input('capacity','Удельная теплоёмкость',4200,100,5000,'Дж/(кг·°C)'),input('start','Начальная температура',20,-100,300,'°C'),input('end','Конечная температура',60,-100,300,'°C')],
 mixing:[input('m1','Масса первого тела',1,.1,10,'кг'),input('c1','Теплоёмкость первого вещества',4200,100,5000,'Дж/(кг·°C)'),input('t1','Температура первого тела',80,-100,300,'°C'),input('m2','Масса второго тела',1,.1,10,'кг'),input('c2','Теплоёмкость второго вещества',4200,100,5000,'Дж/(кг·°C)'),input('t2','Температура второго тела',20,-100,300,'°C')],
 lens:[input('focal','Фокусное расстояние',.2,-1,1,'м','Положительное — собирающая линза, отрицательное — рассеивающая. Ноль не подходит.'),input('distance','Расстояние от предмета до линзы',.6,.05,3,'м'),input('height','Высота предмета',.1,.01,1,'м')],
};
const calculationNotes={percent:'Находим указанную часть числа и результат её прибавления.',proportion:'Ищем x в равенстве a / b = c / x. Знаменатели b и x должны быть ненулевыми.',quadratic:'Решаем a·x² + b·x + c = 0. Отсутствие действительных корней — тоже результат.',system:'Решаем a·x + b·y = c и d·x + e·y = f. Показываем также отсутствие и бесконечное множество решений.',series:'Идеальный источник и два омических резистора последовательно. Расчёт постоянного тока.',parallel:'Идеальный источник и две параллельные ветви с резисторами. Расчёт постоянного тока.',heat:'Теплоёмкость постоянна. Рассматриваем изменение температуры без плавления и испарения.',mixing:'Два тела обмениваются теплом без потерь и фазовых переходов. Теплоёмкости постоянны.',lens:'Тонкая линза и действительный предмет. Считаем по формуле линзы, без аберраций и волновых эффектов.'};
export const builderTasks=[
 ...mathPresets.map(def=>({id:(def.group==='geometry'?'plane-':'graph-')+def.id,group:def.group==='geometry'?'plane':'graph',title:def.label,description:def.description,fields:[...(def.sides?[input('sides','Число сторон',6,3,12,'','Целое число от 3 до 12.')]:[]),...def.fields],preset:def.id})),
 ...solidKinds.map(def=>({id:'solid-'+def.id,group:'solid',title:def.label,description:'Зададим размеры и получим объём и площадь поверхности.',fields:[...(def.sides?[input('sides','Сторон в основании',def.sides,3,12)]:[]),...def.fields],solid:def.id})),
 {id:'motion',group:'motion',title:'Движение по прямой',description:'Тело движется с постоянной скоростью.',fields:[input('speed','Начальная скорость',2,-3,3,'м/с','Положительное число — вправо, отрицательное — влево.')]},
 {id:'force',group:'motion',title:'Разгон под действием силы',description:'Сила меняет скорость; масса определяет ускорение.',fields:[input('mass','Масса тела',1,1,5,'кг'),input('force','Постоянная сила',2,-3,3,'Н')]},
 {id:'spring',group:'motion',title:'Груз на пружине',description:'Растянутая или сжатая пружина возвращает груз к равновесию.',fields:[input('mass','Масса груза',1,.5,3,'кг'),input('stiffness','Жёсткость пружины',4,1,10,'Н/м'),input('shift','Начальное смещение груза',1,-1.5,1.5,'м'),input('drag','Сопротивление движению',0,0,1,'Н·с/м')]},
 {id:'pendulum',group:'motion',title:'Маятник на нити',description:'Отклонённый на 30° груз качается под действием тяжести.',fields:[input('mass','Масса груза',1,.5,3,'кг'),input('length','Длина нити',2,.5,3,'м'),input('gravity','Ускорение свободного падения',9.81,1,15,'м/с²')]},
 ...Object.entries(calculationKinds).map(([id,def])=>({id:'calc-'+id,group:['series','parallel'].includes(id)?'electric':['heat','mixing'].includes(id)?'heat':id==='lens'?'optics':'algebra',title:def.label,description:calculationNotes[id],fields:calculationFields[id],calculation:id})),
];
export const builderTask=id=>builderTasks.find(task=>task.id===id);
export function builderValues(id,values={}){const task=builderTask(id);if(!task)throw new Error('Выберите вид модели');const result={};for(const f of task.fields){const raw=values[f.key]??f.value,value=typeof raw==='number'?raw:Number(String(raw).trim().replace(',','.'));if(String(raw).trim()===''||!Number.isFinite(value)||value<f.min||value>f.max||f.key==='sides'&&!Number.isInteger(value))throw new Error('«'+f.label+'»: введите число от '+f.min+' до '+f.max);result[f.key]=value;}return result;}
const parameter=(id,field,value,binding)=>({id,label:field.label,unit:field.unit??'',value,min:field.min,max:field.max,...(binding?{binding}:{})});
export function createModelPart(id,values={}){
 const task=builderTask(id),v=builderValues(id,values);let m;
 if(task.preset){m=mathPresetModel(task.preset,{values:v,sides:v.sides??6});}
 else if(task.solid){m=spatialModel(task.solid);if(v.sides)m.mathObjects[0].sides=v.sides;const solid=m.mathObjects[0];for(const f of task.fields)if(f.key!=='sides')m.parameters.find(p=>p.id===solid.dimensions[f.key]).value=v[f.key];}
 else{
  m=emptyModel();m.title=task.title;m.topic=builderGroups.find(g=>g.id===task.group).title;m.description=task.description;m.notes=task.description;m.scene={minX:-6,maxX:6,minY:-4,maxY:4,grid:true};
  if(task.calculation){m.subject=['algebra'].includes(task.group)?'math':'physics';m.duration=1;m.parameters=task.fields.map(f=>parameter('input_'+f.key,f,v[f.key]));m.calculations=[{id:'result',name:task.title,type:task.calculation,inputs:Object.fromEntries(task.fields.map(f=>[f.key,'input_'+f.key]))}];}
  else{
   m.duration=id==='motion'?4:id==='force'?2:12;m.dt=.01;const body={...newBody('body','circle'),name:id==='motion'||id==='force'?'Тело':'Груз',x:0,y:0,motion:'force',fieldEnabled:false,trail:true};m.bodies=[body];m.quantities=[quantity('position','Положение по горизонтали','body_x','м'),quantity('speed','Скорость','sqrt(body_vx^2+body_vy^2)','м/с')];m.graphs=[quantity('positionGraph','Положение во времени','body_x','м')];
   if(id==='motion'){body.vx=v.speed;m.scene={minX:-14,maxX:14,minY:-4,maxY:4,grid:true};m.parameters=[parameter('speedInput',task.fields[0],v.speed,{body:'body',property:'vx'})];}
   if(id==='force'){body.mass=v.mass;body.fx='forceInput';m.parameters=[parameter('massInput',task.fields[0],v.mass,{body:'body',property:'mass'}),parameter('forceInput',task.fields[1],v.force)];m.quantities.push(quantity('acceleration','Ускорение','forceInput/body_m','м/с²'));m.scene={minX:-8,maxX:8,minY:-3,maxY:3,grid:true};}
   if(id==='spring'){body.mass=v.mass;body.x=v.shift;m.bodies.unshift({...newBody('support','anchor'),name:'Опора',x:-3,y:0,trail:false});m.connections=[{...newConnection('spring','support','body','spring',3),stiffness:'stiffnessInput',damping:'dragInput'}];m.parameters=task.fields.map(f=>parameter(f.key+'Input',f,v[f.key],f.key==='mass'?{body:'body',property:'mass'}:f.key==='shift'?{body:'body',property:'x'}:null));m.quantities.push(quantity('energy','Механическая энергия','body_m*(body_vx^2+body_vy^2)/2+stiffnessInput*body_x^2/2','Дж'));}
   if(id==='pendulum'){body.mass=v.mass;body.x=v.length*.5;body.y=2-v.length*Math.sqrt(3)/2;m.bodies.unshift({...newBody('support','anchor'),name:'Подвес',x:0,y:2,trail:false});m.connections=[newConnection('rope','support','body','rope',v.length)];m.fields=[{...newField('gravityField','gravity'),gy:'-gravityInput'}];m.parameters=task.fields.map(f=>parameter(f.key+'Input',f,v[f.key],f.key==='mass'?{body:'body',property:'mass'}:f.key==='length'?{connection:'rope',property:'length',reposition:'body'}:null));}
  }
 }
 m.title=task.title;m.notes=(m.notes||task.description);return validatePhysics(validateModel(m));
}
const partLists=['parameters','bodies','quantities','graphs','connections','fields','mathObjects','geometry','measurements','calculations'];
export function composeModel(base,part){
 if(base.kind==='html')throw new Error('К HTML-демонстрации нельзя добавить объекты конструктора');
 const next=structuredClone(base),source=structuredClone(part),used=new Set(partLists.flatMap(key=>(next[key]??[]).map(o=>o.id)).filter(Boolean)),mapping=new Map();
 for(const list of partLists)for(const item of source[list]??[])if(item.id){let n=1,id;do{id=('part'+n+'_'+item.id).slice(0,40);n++;}while(used.has(id));mapping.set(item.id,id);used.add(id);}
 for(const b of source.bodies)for(const key of ['x','y','vx','vy','m','q','R','gravity','gamma','beta','tau','px','py','Ek','energy'])mapping.set(b.id+'_'+key,mapping.get(b.id)+'_'+key);
 for(const block of source.calculations??[])for(const key of calculationKinds[block.type].outputs)mapping.set(block.id+'_'+key,mapping.get(block.id)+'_'+key);
 const expressions=new Set(['expression','fx','fy','xFormula','yFormula','stiffness','damping','tension','gx','gy','ex','ey','bz','drag','b0','bxGradient','byGradient','originX','originY','radius','startAngle','sweepAngle','dx','dy','length','angle']),references=new Set(['id','a','b','c','d','vertex','target','center','origin','body','connection','reposition']);
 const replace=text=>text.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g,id=>mapping.get(id)??id);
 function remap(value,key='',parent=''){if(typeof value==='string')return references.has(key)?mapping.get(value)??value:expressions.has(key)||['dimensions','inputs','parameters'].includes(parent)?replace(value):value;if(Array.isArray(value))return value.map(v=>['points','targets'].includes(key)&&typeof v==='string'?mapping.get(v)??v:remap(v,'',key));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,k,key)]));return value;}
 const mapped=remap(source);for(const [key,label,limit]of [['parameters','настраиваемых чисел',24],['bodies','тел и точек',60],['mathObjects','математических объектов',40],['quantities','измеряемых величин',20],['graphs','графиков времени',4],['calculations','расчётов',12],['fields','полей',12],['connections','связей',80],['geometry','геометрических зависимостей',40]])if((next[key]?.length??0)+(mapped[key]?.length??0)>limit)throw new Error('В одной модели можно разместить не больше '+limit+' '+label+'. Для новой части создайте отдельную модель');for(const list of partLists)if(mapped[list]?.length)next[list]=[...(next[list]??[]),...mapped[list]];
 if(source.subject==='physics'&&(source.bodies.some(b=>b.motion==='force')||source.fields.length)){if(next.scene.dimension===3)throw new Error('Этот опыт использует физическую плоскость. Создайте для него отдельную модель');next.subject='physics';}
 if(source.scene.dimension===3){if(next.subject==='physics')throw new Error('Объёмные фигуры добавляют в математическую модель');next.scene.dimension=3;}
 else if(next.subject==='math'&&source.mathObjects?.length)next.scene.dimension=2;
 return validatePhysics(validateModel(next));
}
export function changeModelParameter(model,id,value){const next=structuredClone(model),p=next.parameters.find(p=>p.id===id);if(!p)throw new Error('Это число больше не используется');const number=typeof value==='number'?value:Number(String(value).trim().replace(',','.'));if(String(value).trim()===''||!Number.isFinite(number)||number<p.min||number>p.max)throw new Error('Введите число от '+p.min+' до '+p.max);p.value=number;return validatePhysics(validateModel(next));}
