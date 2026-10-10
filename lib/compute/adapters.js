import {parseCSV,analyze,fitParameters,recordSimulation,sha256,numberCell} from './statistics.js';
import {ANALYSIS_VERSION,validateDataset,validateAnalysis} from './analysis-schema.js';
import {Papa} from '../../web/vendor/statistics.js';
import {parseTableJSON} from './table-import.js';
export const statisticsAdapter={
 id:ANALYSIS_VERSION,
 capabilities(){return {operations:['import-analysis','parse','analyze','fit','record','coerce','csv'],maxRows:50000,maxColumns:20,physics:'native-v1',units:'declared labels; no dimensional inference',determinism:'fixed input; no random fitting'};},
 validate(request){if(!request||!this.capabilities().operations.includes(request.operation))throw Error('Операция вычисления не разрешена');if(['analyze','fit','coerce','csv'].includes(request.operation))validateDataset(request.dataset);},
 async run(request){this.validate(request);switch(request.operation){
  case 'import-analysis':{if(typeof request.text!=='string'||new TextEncoder().encode(request.text).length>16*1024*1024)throw Error('JSON: максимум 16 MiB');let value;try{value=JSON.parse(request.text);}catch{throw Error('JSON не читается. Проверьте запятые, кавычки и скобки.');}if(value?.format==='model-studio-analysis'){if(value.version!==1)throw Error('Версия анализа JSON не поддерживается');validateAnalysis(value.analysis);if(value.analysis.datasets.length!==1)throw Error('В JSON нет таблицы');return value.analysis;}return {schemaVersion:1,datasets:[await parseTableJSON(request.text,request.name,request.options)]};}
  case 'parse':return parseCSV(request);
  case 'analyze':return analyze(request.dataset,request.config,request.model);
  case 'fit':return {...fitParameters(request.dataset,request.config,request.model),provenance:{adapter:ANALYSIS_VERSION,datasetHash:await sha256(JSON.stringify(request.dataset)),modelHash:await sha256(JSON.stringify(request.model)),createdAt:new Date().toISOString()}};
  case 'record':return recordSimulation(request.model,request.options);
  case 'coerce':{const d=structuredClone(request.dataset),i=request.column;if(!Number.isInteger(i)||!d.columns[i]||!['number','text'].includes(request.type))throw Error('Неверная колонка');const c=d.columns[i];if(c.type===request.type)return d;let invalid=0;for(let ri=0;ri<d.rows.length;ri++){const value=d.rows[ri][i];if(value===null)continue;if(request.type==='text')d.rows[ri][i]=String(value);else {const parsed=numberCell(String(value),d.source.options?.decimal??'.');d.rows[ri][i]=parsed.value;if(parsed.invalid){invalid++;if(d.diagnostics.length<100)d.diagnostics.push({row:d.sourceRows?.[ri]??ri+1,message:'Неверное число в «'+c.label+'»'});}}}c.type=request.type;c.role=request.type==='text'?'category':'measurement';d.invalid[i]+=invalid;return validateDataset(d);}
  case 'csv':return Papa.unparse({fields:request.dataset.columns.map(c=>c.label),data:request.dataset.rows},{escapeFormulae:true,newline:'\r\n'});
 }}
};
