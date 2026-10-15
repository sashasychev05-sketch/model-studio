import {evaluate,parse} from './expression.js';

export function defaultDynamicLabel(body){return {enabled:false,expression:`sqrt(${body.id}_vx^2+${body.id}_vy^2)`,prefix:'Скорость: ',unit:'м/с',precision:2};}
export function validateBodyDisplay(body){
 for(const key of ['visible','dragLocked'])if(body[key]!==undefined&&typeof body[key]!=='boolean')throw new Error('Проверьте видимость и блокировку объекта');
 const label=body.dynamicLabel;if(label===undefined)return;
 if(!label||typeof label!=='object'||Array.isArray(label)||typeof label.enabled!=='boolean')throw new Error('Проверьте динамическую подпись');
 for(const [key,max]of [['expression',500],['prefix',80],['unit',30]])if(typeof label[key]!=='string'||label[key].length>max)throw new Error('Проверьте текст и формулу динамической подписи');
 if(!Number.isInteger(label.precision)||label.precision<0||label.precision>8)throw new Error('Точность подписи: целое число от 0 до 8');
 if(label.enabled)try{parse(label.expression);}catch(error){throw new Error(`Подпись «${body.name}»: ${error.message}`);}
}
// Display expressions use the same bounded parser as physical quantities. They
// never contribute to forces, and a runtime error must not stop the experiment.
export function bodyLabel(body,values={}){
 const label=body.dynamicLabel;if(!label?.enabled)return {text:body.name,error:null};
 let value='—',error=null;
 try{
  const number=evaluate(label.expression,values),precision=label.precision;
  value=number!==0&&(Math.abs(number)>=1e7||Math.abs(number)<10**-precision)
   ?number.toExponential(precision).replace('.',',')
   :(Object.is(Number(number.toFixed(precision)),-0)?0:number).toLocaleString('ru-RU',{minimumFractionDigits:precision,maximumFractionDigits:precision});
 }catch(cause){error=`Подпись «${body.name}»: ${cause.message}`;}
 return {text:label.prefix+value+(label.unit?' '+label.unit:''),error};
}
