import {sha256} from '../../lib/compute/statistics.js';
export function random(seed){let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
export async function demonstration(key,model){
 const seed=314159,rng=random(seed);let rows,columns,name,expression='',fit=[];
 if(key==='newton'){name='Второй закон Ньютона: измерения и модель';rows=Array.from({length:21},(_,i)=>{const t=i/10;return [t,1.5*t*t+(rng()-.5)*.09];});columns=[['Время','s','time'],['Координата','m','measurement']];expression='a*t^2/2';fit=[{id:'a',min:0,max:6,value:1}];}
 else if(key==='outlier'){name='Выброс: среднее и медиана';rows=Array.from({length:21},(_,i)=>[i+1,i===20?35:5+(rng()-.5)*2]);columns=[['Наблюдение','1','coordinate'],['Результат','1','measurement']];}
 else if(key==='correlation'){name='Корреляция: закономерность и совпадение';rows=Array.from({length:101},(_,i)=>{const x=i/10;return [x,2*x+1+(rng()-.5)*2,(rng()-.5)*20];});columns=[['X','1','coordinate'],['Связанная величина','1','measurement'],['Независимая величина','1','measurement']];}
 else throw Error('Неизвестный учебный набор');
 const d={version:1,id:'demo_'+key,name,columns:columns.map(([label,unit,role],i)=>({id:'c'+(i+1),label,unit,role,type:'number'})),rows,sourceRows:rows.map((_,i)=>i+1),missing:columns.map(()=>0),invalid:columns.map(()=>0),diagnostics:[],source:{kind:'demo',hash:await sha256(JSON.stringify(rows)),method:'Synthetic teaching data, not real measurements',createdAt:new Date().toISOString(),seed,generator:'LCG32: a=1664525,c=1013904223 / v1'}};
 const teaching=key==='newton'?'Сравните измерения с a·t²/2. Найдите ускорение, затем сопоставьте его с F/m. Шум синтетический; совпадение не доказывает закон.':key==='outlier'?'Сравните среднее и медиану с выбросом и без него. Значение 35 сохранено в последней строке; пропуски не заменяются нулём.':'Сначала выберите Y «Связанная величина», затем «Независимая величина». Корреляция показывает связь, а не причинность.';
 return {dataset:d,expression,fit,teaching};
}
