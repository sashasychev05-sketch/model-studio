export const ANALYSIS_LIMITS={bytes:5*1024*1024,rows:50000,columns:20,savedBytes:12*1024*1024,fitRows:5000};
export const ANALYSIS_VERSION='statistics-js/1';
const fail=message=>{throw new Error(message);};
const text=(v,n,label)=>{if(typeof v!=='string'||v.length>n)fail('Проверьте '+label);};
export function validateDataset(d){
 if(!d||d.version!==1||!Array.isArray(d.columns)||!d.columns.length||d.columns.length>20||!Array.isArray(d.rows)||d.rows.length>50000)fail('Таблица: максимум 50 000 строк и 20 колонок');
 text(d.id,80,'идентификатор таблицы');text(d.name,120,'название таблицы');const ids=new Set();
 for(const c of d.columns){text(c.id,40,'имя колонки');if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(c.id)||ids.has(c.id))fail('Имена колонок должны быть уникальными');ids.add(c.id);text(c.label,80,'подпись колонки');text(c.unit,30,'единицу колонки');if(!['number','text'].includes(c.type)||!['time','coordinate','measurement','category'].includes(c.role))fail('Проверьте тип и роль колонки');}
 let bytes=0;for(const row of d.rows){if(!Array.isArray(row)||row.length!==d.columns.length)fail('Число ячеек не совпадает с колонками');for(let i=0;i<row.length;i++){const v=row[i];if(v!==null&&(d.columns[i].type==='number'?typeof v!=='number'||!Number.isFinite(v):typeof v!=='string'||v.length>2000))fail('Таблица содержит неверное значение');bytes+=v===null?4:typeof v==='string'?v.length*3+2:String(v).length;bytes++;}if(bytes>ANALYSIS_LIMITS.savedBytes)fail('Таблица слишком велика для сохранения с моделью');}
 if(!d.source||!['csv','simulation','demo'].includes(d.source.kind))fail('Проверьте источник данных');
 text(d.source.hash,64,'контрольную сумму');if(!/^[a-f0-9]{64}$/.test(d.source.hash))fail('Нужна SHA-256 источника');
 text(d.source.method,240,'методику');text(d.source.createdAt,40,'дату данных');
 if(d.source.policy)text(d.source.policy,500,'обработку данных');
 if(d.source.modelHash!==undefined){text(d.source.modelHash,64,'хеш модели');if(!/^[a-f0-9]{64}$/.test(d.source.modelHash))fail('Неверный хеш модели');}
 if(d.source.seed!==undefined&&!Number.isInteger(d.source.seed))fail('Проверьте seed');
 if(d.source.generator!==undefined)text(d.source.generator,80,'генератор');
 if(d.source.options!==undefined){const o=d.source.options;if(!o||!['',',',';','\t','|'].includes(o.delimiter)||!['.',','].includes(o.decimal)||!['utf-8','windows-1251'].includes(o.encoding)||typeof o.header!=='boolean')fail('Проверьте параметры CSV');}
 if(d.sourceRows!==undefined&&(!Array.isArray(d.sourceRows)||d.sourceRows.length!==d.rows.length||d.sourceRows.some(n=>!Number.isInteger(n)||n<1||n>1e7)))fail('Проверьте номера строк');
 for(const key of ['missing','invalid'])if(!Array.isArray(d[key])||d[key].length!==d.columns.length||d[key].some(n=>!Number.isInteger(n)||n<0||n>d.rows.length))fail('Проверьте пропуски и ошибки');
 if(!Array.isArray(d.diagnostics)||d.diagnostics.length>100||d.diagnostics.some(x=>!Number.isInteger(x.row)||x.row<1||typeof x.message!=='string'||x.message.length>240))fail('Проверьте сообщения таблицы');
 return d;
}
export function validateAnalysis(a){
 if(a===undefined)return;
 if(!a||a.schemaVersion!==1||!Array.isArray(a.datasets)||a.datasets.length>1)fail('Версия анализа не поддерживается');
 a.datasets.forEach(validateDataset);
 if(a.config!==undefined){const c=a.config;for(const k of ['x','y'])text(c[k],40,'ось');if(!['sample','population'].includes(c.variance)||!['scatter','histogram'].includes(c.chart)||!Number.isInteger(c.bins)||c.bins<2||c.bins>100)fail('Проверьте настройки анализа');for(const k of ['expression','modelUnit','xUnit'])text(c[k],k==='expression'?500:30,'модельную кривую');if(!Array.isArray(c.fit)||c.fit.length>3)fail('Подбор: максимум три параметра');const fitIds=new Set();for(const p of c.fit){if(fitIds.has(p.id))fail('Повторный параметр подбора');fitIds.add(p.id);text(p.id,40,'параметр подбора');if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(p.id)||![p.min,p.max,p.value].every(Number.isFinite)||p.min>=p.max||p.value<p.min||p.value>p.max)fail('Проверьте границы подбора');}for(const domain of [c.domain,c.residualDomain])if(domain!==null&&domain!==undefined){for(const k of ['x','y'])if(!Array.isArray(domain[k])||domain[k].length!==2||!domain[k].every(Number.isFinite)||domain[k][1]<=domain[k][0])fail('Проверьте фиксированные оси');}}
}
