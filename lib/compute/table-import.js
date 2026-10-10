import {Papa} from '../../web/vendor/statistics.js';
import {parseCSV,sha256} from './statistics.js';
import {ANALYSIS_LIMITS} from './analysis-schema.js';

export async function parseTableJSON(text,name='Таблица JSON',options={}){
 if(new TextEncoder().encode(text).length>ANALYSIS_LIMITS.bytes)throw Error('Таблица JSON: максимум 5 MiB');
 let value;try{value=JSON.parse(text);}catch{throw Error('JSON не читается. Проверьте запятые, кавычки и скобки в файле.');}
 let columns,rows;
 if(Array.isArray(value)){
  if(!value.length||value.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('JSON: нужен непустой массив объектов с именами колонок');
  if(value.length>ANALYSIS_LIMITS.rows)throw Error('JSON: максимум 50 000 строк');
  const keys=new Set();for(const row of value)for(const key of Object.keys(row)){keys.add(key);if(keys.size>ANALYSIS_LIMITS.columns)throw Error('JSON: максимум 20 колонок');}
  columns=[...keys];rows=value.map(row=>columns.map(key=>Object.hasOwn(row,key)?row[key]??null:null));
 }else if(value&&Array.isArray(value.columns)&&Array.isArray(value.rows)){
  columns=value.columns;rows=value.rows;
 }else throw Error('JSON: используйте массив объектов или объект с columns и rows. Файлы экспорта анализа JSON тоже поддерживаются.');
 if(!columns.length||columns.length>ANALYSIS_LIMITS.columns||columns.some(c=>typeof c!=='string'||!c.trim()||c.length>80)||new Set(columns).size!==columns.length)throw Error('JSON: нужны уникальные названия, максимум 20 колонок');
 if(rows.length>ANALYSIS_LIMITS.rows||rows.some(row=>!Array.isArray(row)||row.length!==columns.length))throw Error('JSON: максимум 50 000 строк, число ячеек должно совпадать с колонками');
 if(rows.some(row=>row.some(cell=>cell!==null&&(typeof cell!=='string'&&typeof cell!=='number'||typeof cell==='string'&&cell.length>2000))))throw Error('JSON: ячейка должна содержать число, текст или null; вложенные объекты не поддерживаются');
 const decimal=options.decimal??'.';
 // JSON numbers keep their numeric meaning even when strings use a decimal comma.
 const cells=rows.map(row=>row.map(cell=>typeof cell==='number'&&decimal===','?String(cell).replace('.',','):cell));
 const data=await parseCSV({text:Papa.unparse({fields:columns,data:cells},{delimiter:';',newline:'\n'}),name,options:{delimiter:';',decimal,encoding:'utf-8',header:true}});
 const lineToRow=new Map(data.sourceRows.map((line,i)=>[line,i+1]));
 data.diagnostics=data.diagnostics.map(d=>({...d,row:lineToRow.get(d.row)??d.row}));
 data.sourceRows=rows.map((_,i)=>i+1);data.source.kind='json';data.source.hash=await sha256(text);data.source.method='JSON table; scalar cells; strict decimal conversion';
 return data;
}

export function importAdvice(dataset){
 const tips=[];
 if(dataset.columns.length===1)tips.push('Получилась одна колонка. Если в файле несколько колонок, проверьте разделитель и повторите разбор.');
 if(dataset.invalid.some(n=>n>0))tips.push('Неверные числа оставлены пропусками. Проверьте десятичный знак и тип колонки; исправьте исходный файл либо повторите импорт.');
 if(dataset.missing.some(n=>n>0))tips.push('Пустые ячейки не заменяются нулём. Анализ использует только строки с числовыми значениями выбранных осей.');
 if(dataset.columns.some(c=>c.type==='number'&&!c.unit.trim()))tips.push('Укажите единицы числовых колонок: s, m, kg или 1 для безразмерных значений. Это подписи; пересчёт единиц не выполняется.');
 if(dataset.columns.filter(c=>c.type==='number').length<2)tips.push('Для графика выберите числовые колонки. При необходимости измените тип колонки в предпросмотре; неверные значения станут пропусками.');
 return tips;
}
