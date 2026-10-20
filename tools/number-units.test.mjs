import test from 'node:test';
import assert from 'node:assert/strict';
import {numberUnits,unitNumber,modelNumber} from '../web/number-units.js';

test('Display units convert lengths, masses, time, speed and electrical values without changing base units',()=>{
 for(const [base,label,shown,stored]of [['м','см','20',.2],['кг','г','1500',1.5],['с','мин','2',120],['м/с','км/ч','3,6',1],['Н','кН','2',2000],['В','мВ','100',.1],['Ом','кОм','1,5',1500]]){const option=numberUnits(base).find(v=>v.label===label);assert.equal(modelNumber(shown,option.scale),stored);assert.ok(Math.abs(unitNumber(stored,option.scale)-Number(shown.replace(',','.')))<1e-12);}
 assert.equal(modelNumber('100',.001),.1);assert.equal(modelNumber('0.12345678901234567'),Number('0.12345678901234567'));assert.deepEqual(numberUnits('°C'),[{label:'°C',scale:1}]);assert.deepEqual(numberUnits(''),[{label:'Без единицы',scale:1}]);assert.deepEqual(numberUnits('constructor'),[{label:'constructor',scale:1}]);
});

test('Unit entry rejects empty, nonfinite and malformed values instead of turning them into zero',()=>{
 for(const raw of ['', ' ', 'Infinity','NaN','1,2,3','12 см'])assert.throws(()=>modelNumber(raw,.01));for(const scale of [0,-1,Infinity,NaN])assert.throws(()=>modelNumber('2',scale));assert.throws(()=>modelNumber('1e308',1000));assert.equal(modelNumber('-2,5',.01),-.025);
});
