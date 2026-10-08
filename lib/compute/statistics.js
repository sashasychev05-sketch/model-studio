import * as stats from '../../web/vendor/statistics.js';
import {ANALYSIS_LIMITS,ANALYSIS_VERSION,validateDataset,validateAnalysis} from './analysis-schema.js';
import {evaluate} from '../expression.js';
import {context,initialState,step} from '../engine.js';
export async function sha256(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
export function numberCell(value,decimal='.'){const v=value.trim();if(!v)return {value:null,missing:true};const normal=decimal===','?v.replace(',','.'):v;if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normal))return {value:null,invalid:true};const n=Number(normal);return Number.isFinite(n)?{value:n}:{value:null,invalid:true};}
export async function parseCSV({buffer,text,name='Таблица',options={}}){
 const bytes=buffer?new Uint8Array(buffer):new TextEncoder().encode(text??'');if(bytes.length>ANALYSIS_LIMITS.bytes)throw Error('CSV: максимум 5 MiB');
 const o={delimiter:'',decimal:'.',encoding:'utf-8',header:true,...options};if(!['',',',';','\t','|'].includes(o.delimiter)||!['.',','].includes(o.decimal)||!['utf-8','windows-1251'].includes(o.encoding)||typeof o.header!=='boolean')throw Error('Проверьте параметры CSV');
 if(o.delimiter===','&&o.decimal===',')throw Error('Для десятичной запятой выберите ; или табуляцию');
 const raw=new TextDecoder(o.encoding,{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
 const source=[],sourceRows=[],diagnostics=[];let columns=null,delimiter=o.delimiter,fatal=null,cursor=0,line=1,headerRead=false;
 stats.Papa.parse(raw,{delimiter:o.delimiter,header:false,dynamicTyping:false,skipEmptyLines:'greedy',step(result,parser){
  const startLine=line;const segment=raw.slice(cursor,result.meta.cursor);line+=(segment.match(/\n|\r(?!\n)/g)??[]).length;cursor=result.meta.cursor;delimiter=result.meta.delimiter;
  const row=result.data;if(result.errors.length){fatal='CSV: строка '+startLine+' — '+result.errors[0].message;parser.abort();return;}
  if(!headerRead){headerRead=true;columns=o.header?row.map((v,i)=>(v.trim()||'Колонка '+(i+1)).slice(0,80)):row.map((v,i)=>'Колонка '+(i+1));if(columns.length>20){fatal='CSV: максимум 20 колонок';parser.abort();return;}if(o.header)return;}
  if(source.length>=50000){fatal='CSV: максимум 50 000 строк';parser.abort();return;}
  if(row.length>columns.length){fatal='CSV: строка '+startLine+' содержит лишние ячейки';parser.abort();return;}
  if(row.some(v=>v.length>2000)){fatal='CSV: слишком длинная ячейка в строке '+startLine;parser.abort();return;}
  if(row.length<columns.length&&diagnostics.length<100)diagnostics.push({row:startLine,message:'Недостающие ячейки оставлены пустыми'});
  source.push(Array.from({length:columns.length},(_,i)=>row[i]??''));sourceRows.push(startLine);
 }});
 if(fatal)throw Error(fatal);if(!columns||!source.length)throw Error('В файле нет строк данных');
 if(delimiter===','&&o.decimal===',')throw Error('Определён разделитель-запятая. Выберите ; или табуляцию для десятичной запятой');
 const numeric=columns.map((_,i)=>{const filled=source.map(r=>r[i].trim()).filter(Boolean);return !filled.length||filled.filter(v=>!numberCell(v,o.decimal).invalid).length>=filled.length*.6;});
 const missing=columns.map(()=>0),invalid=columns.map(()=>0);
 const rows=source.map((row,ri)=>row.map((v,i)=>{if(!v.trim()){missing[i]++;return null;}if(!numeric[i])return v;const parsed=numberCell(v,o.decimal);if(parsed.invalid){invalid[i]++;if(diagnostics.length<100)diagnostics.push({row:sourceRows[ri],message:'Неверное число в «'+columns[i]+'»: '+v.slice(0,100)});}return parsed.value;}));
 const dataset={version:1,id:'dataset',name:name.slice(0,120),columns:columns.map((label,i)=>({id:'c'+(i+1),label,unit:'',type:numeric[i]?'number':'text',role:numeric[i]?(i===0?'coordinate':'measurement'):'category'})),rows,sourceRows,missing,invalid,diagnostics,source:{kind:'csv',hash:await sha256(bytes),method:'Papa Parse 5.7.0; strict decimal conversion',createdAt:new Date().toISOString(),options:{...o,delimiter},policy:'Пустая ячейка = null; неверное число = null с диагностикой; анализ пар пропускает неполные строки.'}};
 return validateDataset(dataset);
}
export function defaultConfig(d){const numeric=d.columns.filter(c=>c.type==='number');return {x:numeric[0]?.id??'',y:numeric[1]?.id??numeric[0]?.id??'',variance:'sample',chart:'scatter',bins:20,expression:'',modelUnit:'',xUnit:'',fit:[],domain:null,residualDomain:null};}
export function describe(values,mode='sample'){
 const data=values.filter(v=>typeof v==='number'&&Number.isFinite(v)),missing=values.length-data.length,n=data.length;
 if(!n)return {n,missing,reason:'Нет числовых значений'};
 const sorted=data.slice().sort((a,b)=>a-b),variance=mode==='sample'?(n>1?stats.sampleVariance(data):null):stats.variance(data);
 const result={n,missing,mean:stats.mean(data),median:stats.median(sorted),min:sorted[0],max:sorted.at(-1),variance,std:variance===null?null:Math.sqrt(variance),q1:stats.quantileSorted(sorted,.25),q3:stats.quantileSorted(sorted,.75),mode,quartileMethod:'Simple Statistics quantileSorted 7.12.1 (Hyndman–Fan type 7)'};
 for(const [key,value]of Object.entries(result))if(typeof value==='number'&&!Number.isFinite(value))throw Error('Статистика вышла за численный диапазон: '+key);
 return result;
}
export function pairedRows(d,c){const xi=d.columns.findIndex(v=>v.id===c.x&&v.type==='number'),yi=d.columns.findIndex(v=>v.id===c.y&&v.type==='number');if(xi<0||yi<0)throw Error('Выберите две числовые колонки');return d.rows.flatMap((r,i)=>Number.isFinite(r[xi])&&Number.isFinite(r[yi])?[{x:r[xi],y:r[yi],row:d.sourceRows?.[i]??i+1}]:[]);}
export function regression(points){
 if(points.length<2)return {reason:'Для регрессии нужны хотя бы две полные пары'};
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);if(xs.every(x=>x===xs[0]))return {reason:'Все x одинаковы: наклон прямой не определён'};
 const {m,b}=stats.linearRegression(points.map(p=>[p.x,p.y]));if(!Number.isFinite(m)||!Number.isFinite(b))throw Error('Регрессия вышла за численный диапазон');
 const residuals=points.map(p=>p.y-(m*p.x+b)),mean=stats.mean(ys),sst=ys.reduce((n,y)=>n+(y-mean)**2,0),sse=residuals.reduce((n,e)=>n+e*e,0),constant=ys.every(y=>y===ys[0]);
 const correlation=constant?null:stats.sampleCorrelation(xs,ys),r2=constant?null:1-sse/sst;
 if([sse,sst,correlation??0,r2??0].some(v=>!Number.isFinite(v)))throw Error('Регрессия вышла за численный диапазон');
 return {m,b,correlation,r2,reason:constant?'Постоянный y: корреляция и стандартный R² не определены':'',rmse:Math.sqrt(sse/points.length)};
}
function unit(value){return value.trim().replace(/^м$/,'m').replace(/^с$/,'s').replace(/^кг$/,'kg');}
export function checkUnits(d,c){const x=d.columns.find(v=>v.id===c.x),y=d.columns.find(v=>v.id===c.y);if(!x||!y)throw Error('Выберите оси');if(!x.unit.trim()||!y.unit.trim()||!c.modelUnit.trim()||!c.xUnit.trim())throw Error('Для сравнения объявите единицы обеих колонок и модельной кривой. Для безразмерных величин: 1.');if(unit(x.unit)!==unit(c.xUnit)||unit(y.unit)!==unit(c.modelUnit))throw Error('Единицы данных и модели не совпадают. Автоматическая конверсия относится к следующему этапу.');return x.role==='time';}
export function predict(points,d,c,model,parameters={}){
 const time=checkUnits(d,c),params=Object.fromEntries(model.parameters.map(p=>[p.id,parameters[p.id]??p.value]));
 const {analysis,...base}=model,m=structuredClone(base);for(const p of m.parameters)p.value=params[p.id];delete m.analysis;
 if(time&&unit(c.xUnit)!=='s')throw Error('Время модели задаётся в секундах: используйте s или с');
 const sorted=points.map((p,index)=>({...p,index})).sort((a,b)=>a.x-b.x),out=new Array(points.length);let state=initialState(m),steps=0;
 for(const p of sorted){if(time){if(p.x<0||p.x>m.duration)throw Error('Время данных должно лежать в диапазоне 0…'+m.duration+' с');while(state.t<p.x-1e-10){if(++steps>100000)throw Error('Более 100 000 шагов: сократите длительность или увеличьте шаг');state=step(m,state,Math.min(m.dt,p.x-state.t));}}
  const scope={...context(m,state),...params,x:p.x,t:time?p.x:state.t};const predicted=evaluate(c.expression,scope);if(!Number.isFinite(predicted))throw Error('Модельная кривая не определена в строке '+p.row);out[p.index]=predicted;
 }
 return out;
}
export function compare(points,predicted){const rows=points.map((p,i)=>{const residual=p.y-predicted[i],relative=residual/Math.abs(predicted[i]);return {...p,predicted:predicted[i],residual,relative:Number.isFinite(relative)&&predicted[i]!==0?relative:null};});const n=rows.length;if(!n)throw Error('Нет полных пар для сравнения');const mae=rows.reduce((s,p)=>s+Math.abs(p.residual),0)/n,rmse=Math.sqrt(rows.reduce((s,p)=>s+p.residual*p.residual,0)/n);if(!Number.isFinite(mae)||!Number.isFinite(rmse))throw Error('Ошибка сравнения вышла за численный диапазон');return {n,mae,rmse,relativeUndefined:rows.filter(r=>r.relative===null).length,rows};}
export function thin(data,max=2500){if(data.length<=max)return data;return Array.from({length:max},(_,i)=>data[Math.round(i*(data.length-1)/(max-1))]);}
export function fitParameters(d,c,model){
 validateAnalysis({schemaVersion:1,datasets:[d],config:c});
 const points=pairedRows(d,c);if(!points.length||points.length>ANALYSIS_LIMITS.fitRows)throw Error('Подбор: от 1 до 5 000 полных пар');if(!c.expression.trim()||!c.fit.length)throw Error('Укажите кривую и параметры для подбора');
 if(c.fit.some(p=>!model.parameters.some(q=>q.id===p.id&&p.min>=q.min&&p.max<=q.max)))throw Error('Подбор использует параметры модели в пределах их диапазонов');
 const current=Object.fromEntries(c.fit.map(p=>[p.id,p.value])),sizes=Object.fromEntries(c.fit.map(p=>[p.id,(p.max-p.min)/4]));let evaluations=0;
 function loss(params){evaluations++;try{return compare(points,predict(points,d,c,model,params)).rmse;}catch{return Infinity;}}
 let best=loss(current);if(!Number.isFinite(best))throw Error('Начальные параметры не дают определённую модельную кривую');let status='iteration-limit',iterations=0;
 for(;iterations<160;iterations++){let improved=false;for(const p of c.fit)for(const sign of [-1,1]){const candidate={...current,[p.id]:Math.max(p.min,Math.min(p.max,current[p.id]+sign*sizes[p.id]))};const value=loss(candidate);if(value<best-1e-13*Math.max(1,best)){best=value;Object.assign(current,candidate);improved=true;}}
  if(!improved)for(const p of c.fit)sizes[p.id]/=2;
  if(c.fit.every(p=>sizes[p.id]<=(p.max-p.min)*1e-7)){status='converged';break;}
 }
 const atBoundary=c.fit.filter(p=>Math.min(current[p.id]-p.min,p.max-current[p.id])<=(p.max-p.min)*1e-6).map(p=>p.id);
 return {status,iterations,evaluations,parameters:current,rmse:best,atBoundary,method:'bounded coordinate pattern search / 160 iterations / range tolerance 1e-7',assumptions:'Локальный минимум RMSE, без весов. Неполные пары исключены. Глобальный оптимум не гарантируется.'+(atBoundary.length?' Достигнута граница: '+atBoundary.join(', ')+'. Проверьте диапазоны и пригодность модели.':'')};
}
export async function analyze(d,c,model){
 validateAnalysis({schemaVersion:1,datasets:[d],config:c});const column=d.columns.findIndex(v=>v.id===c.y&&v.type==='number');if(column<0)throw Error('Выберите числовую колонку Y');
 const description=describe(d.rows.map(r=>r[column]),c.variance),points=pairedRows(d,c),line=regression(points),comparison=c.expression.trim()?compare(points,predict(points,d,c,model)):null;
 const sorted=points.slice().sort((a,b)=>a.x-b.x),domain={x:extent(points.map(p=>p.x)),y:extent([...points.map(p=>p.y),...(comparison?.rows.map(p=>p.predicted)??[])])};
 const distribution=d.rows.map(r=>r[column]).filter(Number.isFinite),histogram=histogramBins(distribution,c.bins,c.chart==='histogram'?c.domain?.x:undefined);
 if(c.chart==='histogram'){domain.x=histogram.domain;domain.y=[0,Math.max(1,...histogram.bins.map(b=>b.count))*1.1];}
 const residualDomain={x:extent(points.map(p=>p.x)),y:extent(comparison?.rows.map(p=>p.residual)??[])};
 const result={residualDomain,description,regression:line,points:thin(sorted),totalPoints:points.length,omitted:d.rows.length-points.length,domain,histogram,comparison:comparison?{...comparison,rows:thin(comparison.rows),preview:comparison.rows.slice(0,20)}:null};
 return {status:'ok',adapter:ANALYSIS_VERSION,result,provenance:{adapter:ANALYSIS_VERSION,papa:'5.7.0',statistics:'7.12.1',datasetHash:await sha256(JSON.stringify(d)),sourceHash:d.source.hash,modelHash:await sha256(JSON.stringify(model)),config:structuredClone(c),missingPolicy:'complete pairs; no zero imputation',createdAt:new Date().toISOString()}};
}
export function extent(values){if(!values.length)return [0,1];let lo=Infinity,hi=-Infinity;for(const n of values){if(!Number.isFinite(n))continue;lo=Math.min(lo,n);hi=Math.max(hi,n);}if(lo===Infinity)return [0,1];if(lo===hi){const pad=Math.max(1,Math.abs(lo)*.1);return [lo-pad,hi+pad];}const pad=(hi-lo)*.05;return [lo-pad,hi+pad];}
export function histogramBins(values,count=20,domain=extent(values)){
 const [lo,hi]=domain,width=(hi-lo)/count;if(!Number.isFinite(width)||width<=0)throw Error('Диапазон гистограммы выходит за численный диапазон');
 const bins=Array.from({length:count},(_,i)=>({x1:lo+i*width,x2:i===count-1?hi:lo+(i+1)*width,count:0}));let outside=0;
 for(const v of values){if(v<lo||v>hi){outside++;continue;}bins[Math.min(count-1,Math.floor((v-lo)/width))].count++;}return {bins,domain:[lo,hi],outside};
}
export async function recordSimulation(model,{x='t',y,unit='1',count=301}={}){
 if(!y||!Number.isInteger(count)||count<2||count>5000)throw Error('Выберите величину и от 2 до 5 000 отсчётов');const {analysis,...base}=model,m=structuredClone(base);const rows=[];let state=initialState(m);for(let i=0;i<count;i++){const t=m.duration*i/(count-1);while(state.t<t-1e-10)state=step(m,state,Math.min(m.dt,t-state.t));const c=context(m,state);rows.push([t,evaluate(y,c)]);}
 const hash=await sha256(JSON.stringify(rows));return validateDataset({version:1,id:'simulation',name:'Расчёт: '+y,columns:[{id:'c1',label:'Время',unit:'s',type:'number',role:'time'},{id:'c2',label:y,unit,type:'number',role:'measurement'}],rows,sourceRows:rows.map((_,i)=>i+1),missing:[0,0],invalid:[0,0],diagnostics:[],source:{kind:'simulation',hash,modelHash:await sha256(JSON.stringify(m)),method:'Native RK4; dt='+m.dt+'; equally spaced output; '+y,createdAt:new Date().toISOString()}});
}
