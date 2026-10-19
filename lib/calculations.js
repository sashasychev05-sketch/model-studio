import {evaluate,dependencies} from './expression.js';

// Typed calculation blocks use the same bounded expression language as the scene.
// Missing roots and infinite images are states, never invented numerical answers.
export const calculationKinds={
 percent:{label:'Проценты',inputs:['whole','percent'],outputs:['part','total']},
 proportion:{label:'Пропорция',inputs:['a','b','c'],outputs:['x']},
 quadratic:{label:'Квадратное уравнение',inputs:['a','b','c'],outputs:['count','discriminant','root1','root2']},
 system:{label:'Два линейных уравнения',inputs:['a','b','c','d','e','f'],outputs:['count','x','y']},
 series:{label:'Последовательное соединение',inputs:['voltage','r1','r2'],outputs:['resistance','current','power','u1','u2']},
 parallel:{label:'Параллельное соединение',inputs:['voltage','r1','r2'],outputs:['resistance','current','power','i1','i2']},
 heat:{label:'Нагревание и охлаждение',inputs:['mass','capacity','start','end'],outputs:['heat']},
 mixing:{label:'Тепловое равновесие',inputs:['m1','c1','t1','m2','c2','t2'],outputs:['temperature','heat1','heat2']},
 lens:{label:'Тонкая линза',inputs:['focal','distance','height'],outputs:['image','magnification','imageHeight']},
};
export function validateCalculations(m,ids){
 if(m.calculations===undefined)return;
 if(m.kind==='html'||!Array.isArray(m.calculations)||m.calculations.length>12)throw new Error('В конструкторе можно добавить до 12 расчётов');
 for(const block of m.calculations){const def=calculationKinds[block?.type];if(!def||typeof block.name!=='string'||!block.name.trim()||block.name.length>80||!block.inputs||typeof block.inputs!=='object'||Array.isArray(block.inputs)||Object.keys(block.inputs).length!==def.inputs.length)throw new Error('Проверьте расчётный блок');
  for(const key of def.inputs){if(typeof block.inputs[key]!=='string'||block.inputs[key].length>500)throw new Error('Проверьте исходные числа расчёта');dependencies(block.inputs[key]);}
  for(const key of def.outputs)if(ids.has(block.id+'_'+key))throw new Error('Имя величины совпадает с результатом расчёта');
 }
}
export function calculate(type,v){
 const def=calculationKinds[type];if(!def)throw new Error('Неизвестный вид расчёта');if(def.inputs.some(key=>!Number.isFinite(v[key])))throw new Error('В расчёте нужны конечные числа');
 const result={status:'ok',message:'',values:[]},value=(key,label,number,unit='')=>{if(!Number.isFinite(number)||Math.abs(number)>1e100)throw new Error('Результат слишком велик для точного представления');result.values.push({key,label,value:number,unit});};
 const positive=(...keys)=>{for(const key of keys)if(!(v[key]>0))throw new Error('Масса, сопротивление, теплоёмкость и расстояние должны быть больше нуля');};
 if(type==='percent'){value('part','Указанная часть',v.whole*v.percent/100);value('total','После прибавления этой части',v.whole*(1+v.percent/100));}
 if(type==='proportion'){if(v.b===0)throw new Error('В пропорции второе число не может быть нулём');if(v.a===0){result.status=v.b*v.c===0?'many':'none';result.message=v.b*v.c===0?'Подходит любое ненулевое x':'Решений нет';}else if(v.c===0){result.status='none';result.message='Решений с ненулевым x нет';}else value('x','Неизвестное x',v.b*(v.c/v.a));}
 if(type==='quadratic'){
  const scale=Math.max(Math.abs(v.a),Math.abs(v.b),Math.abs(v.c));
  if(scale===0){result.status='many';result.message='Подходит любое x';value('count','Число корней',-1);return result;}
  const a=v.a/scale,b=v.b/scale,c=v.c/scale;
  if(v.a===0){if(v.b===0){result.status='none';result.message='Решений нет';value('count','Число корней',0);}else{result.message='Это линейное уравнение';value('count','Число корней',1);value('root1','Корень x',-v.c/v.b);}return result;}
  const d=b*b-4*a*c;value('discriminant','Дискриминант',d*scale*scale);
  if(d<0){result.status='none';result.message='Действительных корней нет';value('count','Число действительных корней',0);}
  else if(d===0){value('count','Число различных корней',1);value('root1','Корень x',-b/(2*a));}
  else{const q=-.5*(b+(b>=0?1:-1)*Math.sqrt(d)),roots=[q/a,c/q].sort((a,b)=>a-b);value('count','Число корней',2);value('root1','Первый корень',roots[0]);value('root2','Второй корень',roots[1]);}
 }
 if(type==='system'){
  const s1=Math.max(Math.abs(v.a),Math.abs(v.b),Math.abs(v.c)),s2=Math.max(Math.abs(v.d),Math.abs(v.e),Math.abs(v.f)),[a,b,c]=s1?[v.a/s1,v.b/s1,v.c/s1]:[0,0,0],[d,e,f]=s2?[v.d/s2,v.e/s2,v.f/s2]:[0,0,0],det=a*e-b*d;
  if(det===0){const impossible=(a===0&&b===0&&c!==0)||(d===0&&e===0&&f!==0)||a*f-c*d!==0||b*f-c*e!==0;result.status=impossible?'none':'many';result.message=impossible?'Общего решения нет':'Решений бесконечно много';value('count','Число решений',impossible?0:-1);}
  else if(Math.abs(det)<1e-12*(Math.abs(a*e)+Math.abs(b*d))){result.status='uncertain';result.message='Уравнения почти совпадают. Уточните исходные числа';}
  else{value('count','Число решений',1);value('x','Значение x',(c*e-b*f)/det);value('y','Значение y',(a*f-c*d)/det);}
 }
 if(type==='series'||type==='parallel'){positive('r1','r2');const r=type==='series'?v.r1+v.r2:Math.min(v.r1,v.r2)/(1+Math.min(v.r1,v.r2)/Math.max(v.r1,v.r2)),i=v.voltage/r;value('resistance','Общее сопротивление',r,'Ом');value('current','Общий ток',i,'А');value('power','Общая мощность',v.voltage*i,'Вт');if(type==='series'){value('u1','Напряжение на первом',i*v.r1,'В');value('u2','Напряжение на втором',i*v.r2,'В');}else{value('i1','Ток в первой ветви',v.voltage/v.r1,'А');value('i2','Ток во второй ветви',v.voltage/v.r2,'А');}}
 if(type==='heat'){positive('mass','capacity');value('heat','Полученное тепло',v.mass*v.capacity*(v.end-v.start),'Дж');result.message=v.end>=v.start?'Тело получает тепло':'Тело отдаёт тепло';}
 if(type==='mixing'){positive('m1','m2','c1','c2');const w1=v.m1*v.c1,w2=v.m2*v.c2,t=(w1/(w1+w2))*v.t1+(w2/(w1+w2))*v.t2;value('temperature','Общая температура',t,'°C');value('heat1','Тепло первого тела',w1*(t-v.t1),'Дж');value('heat2','Тепло второго тела',w2*(t-v.t2),'Дж');result.message='Без потерь тепла и изменения агрегатного состояния';}
 if(type==='lens'){positive('distance');if(v.focal===0)throw new Error('Фокусное расстояние не может быть нулём');const denominator=v.distance-v.focal;if(denominator===0){result.status='infinity';result.message='Предмет в фокусе: изображение на бесконечности';}else{const image=v.focal*(v.distance/denominator),magnification=-image/v.distance;value('image','Расстояние до изображения',image,'м');value('magnification','Увеличение со знаком',magnification);value('imageHeight','Высота изображения со знаком',magnification*v.height,'м');result.message=image>0?'Действительное изображение':'Мнимое изображение';}}
 return result;
}
export function resolveModelValues(m,c){
 const quantities=new Map(m.quantities.map(item=>[item.id,item])),blocks=new Map((m.calculations??[]).map(item=>[item.id,item])),outputs=new Map(),active=new Set(),done=new Set();
 for(const block of blocks.values())for(const key of calculationKinds[block.type].outputs)outputs.set(block.id+'_'+key,block.id);
 function resolve(id){if(Object.hasOwn(c,id))return;if(quantities.has(id)){if(active.has(id))throw new Error('Циклическая зависимость у «'+id+'»');active.add(id);const item=quantities.get(id);for(const dep of dependencies(item.expression))resolve(dep);c[id]=evaluate(item.expression,c);active.delete(id);}else if(outputs.has(id))run(outputs.get(id));}
 function run(id){if(done.has(id))return;if(active.has(id))throw new Error('Расчёты зависят друг от друга по кругу');active.add(id);const block=blocks.get(id),values={};for(const [key,expr]of Object.entries(block.inputs)){for(const dep of dependencies(expr))resolve(dep);values[key]=evaluate(expr,c);}const result=calculate(block.type,values);for(const output of result.values)c[id+'_'+output.key]=output.value;active.delete(id);done.add(id);}
 for(const id of blocks.keys())run(id);for(const id of quantities.keys())resolve(id);return c;
}
export function calculationReports(m,c){return (m.calculations??[]).map(block=>({id:block.id,name:block.name,...calculate(block.type,Object.fromEntries(Object.entries(block.inputs).map(([key,expr])=>[key,evaluate(expr,c)])))}));}
