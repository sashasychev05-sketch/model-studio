import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTableJSON,importAdvice} from '../lib/compute/table-import.js';
import {statisticsAdapter} from '../lib/compute/adapters.js';
import {parseCSV} from '../lib/compute/statistics.js';

test('JSON tables preserve Russian headers, numeric decimal values and null observations',async()=>{
 const text=JSON.stringify([{'Время':0,'Координата':1.25},{'Время':1,'Координата':'2,5'},{'Время':2}]);
 const dataset=await parseTableJSON(text,'Опыт',{decimal:','});
 assert.deepEqual(dataset.rows,[[0,1.25],[1,2.5],[2,null]]);assert.equal(dataset.source.kind,'json');assert.deepEqual(dataset.sourceRows,[1,2,3]);assert.match(importAdvice(dataset).join(' '),/Пустые ячейки/);
 const imported=await statisticsAdapter.run({operation:'import-analysis',text:JSON.stringify({columns:['t','x'],rows:[[0,0],[1,2]]}),name:'JSON'});
 assert.deepEqual(imported.datasets[0].rows,[[0,0],[1,2]]);
 await assert.rejects(parseTableJSON(JSON.stringify([{x:{nested:1}}])),/вложенные/);
 await assert.rejects(parseTableJSON(JSON.stringify({columns:['x','x'],rows:[[1,2]]})),/уникальные/);
 await assert.rejects(parseTableJSON('{oops'),/JSON не читается/);
});
test('CSV guidance identifies delimiter, units and invalid cells; imports remain reproducible',async()=>{
 const data=await parseCSV({text:'Время;Координата\n0;1,5\n1;2,5\n2;ошибка\n3;',options:{decimal:','}});
 assert.deepEqual(data.rows,[[0,1.5],[1,2.5],[2,null],[3,null]]);
 assert.match(importAdvice(data).join(' '),/Неверные числа/);assert.match(importAdvice(data).join(' '),/единицы/);
 const single=await parseCSV({text:'t|x\n0|1\n1|2',options:{delimiter:';'}});assert.match(importAdvice(single)[0],/одна колонка/);
 const saved={format:'model-studio-analysis',version:1,analysis:{schemaVersion:1,datasets:[data]}};
 const imported=await statisticsAdapter.run({operation:'import-analysis',text:JSON.stringify(saved)});assert.deepEqual(imported,saved.analysis);
});
