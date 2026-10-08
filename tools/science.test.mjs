import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseCSV,numberCell,describe,regression,analyze,predict,fitParameters,recordSimulation,defaultConfig,sha256} from '../lib/compute/statistics.js';
import {validateDataset,validateAnalysis} from '../lib/compute/analysis-schema.js';
import {statisticsAdapter} from '../lib/compute/adapters.js';
import {emptyModel,newBody,validateModel} from '../lib/model.js';
import {demonstration} from '../web/data/demos.js';
import {reportHTML} from '../web/data/analysis.js';
import {ComputeClient} from '../web/data/client.js';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
test('CSV: BOM, quoted newline, decimal comma, missing vs invalid, physical row diagnostics',async()=>{
 const d=await parseCSV({text:'\uFEFFt;value;label\r\n0;1,25;"две\r\nстроки"\r\n1;;B\r\n2;не число;C\r\n3;2,5;D',options:{delimiter:';',decimal:','}});
 assert.equal(d.rows[0][1],1.25);assert.equal(d.rows[0][2],'две\r\nстроки');assert.equal(d.rows[1][1],null);assert.equal(d.rows[2][1],null);assert.deepEqual(d.missing,[0,1,0]);assert.deepEqual(d.invalid,[0,1,0]);assert.deepEqual(d.sourceRows,[2,4,5,6]);assert.equal(d.diagnostics[0].row,5);assert.equal(d.source.hash.length,64);
});
test('CSV: TSV/headerless/Windows-1251 and strict finite numeric values',async()=>{
 const d=await parseCSV({text:'1\t2\n3\t4',options:{delimiter:'\t',header:false}});assert.deepEqual(d.rows,[[1,2],[3,4]]);
 const encoded=Uint8Array.from([0xc8,0xec,0xff,59,120,10,0xc0,59,49]);const ru=await parseCSV({buffer:encoded.buffer,options:{delimiter:';',encoding:'windows-1251'}});assert.equal(ru.columns[0].label,'Имя');assert.equal(ru.rows[0][0],'А');
 for(const v of ['1x','Infinity','NaN','1e999','1.2.3','0x10'])assert.equal(numberCell(v).invalid,true,v);assert.equal(numberCell(' ').missing,true);assert.equal(numberCell('0').value,0);
 await assert.rejects(parseCSV({text:'a,b\n1,2',options:{delimiter:',',decimal:','}}),/десятичной/);
});
test('CSV limits abort instead of accepting partial or malformed tables',async()=>{
 await assert.rejects(parseCSV({buffer:new ArrayBuffer(5*1024*1024+1)}),/5 MiB/);
 await assert.rejects(parseCSV({text:Array.from({length:21},(_,i)=>'c'+i).join(';')+'\n'+Array(21).fill('1').join(';'),options:{delimiter:';'}}),/20 колонок/);
 await assert.rejects(parseCSV({text:'x\n'+Array(50001).fill('1').join('\n'),options:{delimiter:';'}}),/50 000/);
 await assert.rejects(parseCSV({text:'a;b\n1;2;3',options:{delimiter:';'}}),/лишние/);
 await assert.rejects(parseCSV({text:'a;b\n"unclosed;1',options:{delimiter:';'}}),/CSV/);
});
test('Statistics: analytic sample/population expectations, type-7 interpolated quartiles and edge cases',()=>{
 const s=describe([1,2,3,4,null]);close(s.mean,2.5);close(s.median,2.5);close(s.variance,5/3);close(s.std,Math.sqrt(5/3));close(s.q1,1.75);close(s.q3,3.25);assert.equal(s.missing,1);close(describe([1,2,3,4],'population').variance,1.25);assert.equal(describe([2]).variance,null);assert.equal(describe([2],'population').variance,0);assert.equal(describe([]).n,0);
});
test('Regression: analytic line, constant x/y and incomplete pairs',async()=>{
 const r=regression([0,1,2,3].map(x=>({x,y:2*x+1})));close(r.m,2);close(r.b,1);close(r.r2,1);close(r.correlation,1);assert.match(regression([{x:1,y:1},{x:1,y:2}]).reason,/одинаковы/);const constant=regression([{x:1,y:2},{x:2,y:2}]);assert.equal(constant.r2,null);assert.equal(constant.correlation,null);
 const d=await parseCSV({text:'x;y\n0;1\n1;3\n2;\n3;7',options:{delimiter:';'}}),c=defaultConfig(d);const a=await analyze(d,c,emptyModel());assert.equal(a.result.totalPoints,3);assert.equal(a.result.omitted,1);close(a.result.regression.m,2);
});
test('Comparison: native body trajectory, declared units, residuals and bounded fitting',async()=>{
 const model=emptyModel();model.duration=2;model.parameters=[{id:'a',label:'Ускорение',unit:'m/s^2',value:1,min:0,max:6}];const body=newBody();body.motion='force';body.x=0;body.y=0;body.mass=2;body.fx='m*a';body.fy='0';model.bodies=[body];
 const d=await parseCSV({text:'t;x\n0;0\n0.5;0.375\n1;1.5\n1.5;3.375\n2;6',options:{delimiter:';'}});d.columns[0].role='time';d.columns[0].unit='s';d.columns[1].unit='m';const c={...defaultConfig(d),expression:'b1_x',xUnit:'s',modelUnit:'m',fit:[{id:'a',min:0,max:6,value:1}]};const fit=fitParameters(d,c,model);assert.equal(fit.status,'converged');close(fit.parameters.a,3,2e-6);assert.ok(fit.rmse<2e-6);
 model.parameters[0].value=3;const a=await analyze(d,c,model);close(a.result.comparison.rmse,0,1e-9);assert.equal(a.result.comparison.relativeUndefined,1);assert.equal(a.result.comparison.preview[0].relative,null);
 assert.throws(()=>predict([{x:1,y:2,row:2}],d,{...c,modelUnit:'cm'},model),/Единицы/);assert.throws(()=>predict([{x:3,y:2,row:2}],d,c,model),/Время/);
});
test('Simulation recording, saved analysis JSON round-trip and malicious schema rejection',async()=>{
 const model=emptyModel();model.duration=1;model.bodies=[{...newBody(),motion:'force',x:0,y:0,vx:2,fx:'0',fy:'0'}];const d=await recordSimulation(model,{y:'b1_x',unit:'m',count:11});close(d.rows.at(-1)[1],2);const config={...defaultConfig(d),expression:'b1_x',xUnit:'s',modelUnit:'m'};model.analysis={schemaVersion:1,datasets:[d],config};const restored=validateModel(JSON.parse(JSON.stringify(model)));assert.deepEqual(restored.analysis,model.analysis);assert.equal(restored.analysis.datasets[0].source.modelHash.length,64);
 const bad=structuredClone(d);bad.rows[0][0]=Infinity;assert.throws(()=>validateDataset(bad));assert.throws(()=>validateAnalysis({...model.analysis,schemaVersion:99}));assert.throws(()=>validateModel({...model,kind:'html',html:'<html></html>'}),/конструкторе/);
});
test('Analysis CSV protects text formulas, preserves negative numbers and nulls',async()=>{
 const d=await parseCSV({text:'category;value\n"=1+1";-3\n"@SUM(A1)";\n"normal";2',options:{delimiter:';'}});const csv=await statisticsAdapter.run({operation:'csv',dataset:d});assert.match(csv,/'=1\+1/);assert.match(csv,/'@SUM/);assert.match(csv,/-3/);assert.doesNotMatch(csv,/'-3/);assert.throws(()=>statisticsAdapter.validate({operation:'eval',code:'evil'}),/не разрешена/);
});
test('Three teaching experiments are reproducible and analysis report escapes hostile content',async()=>{
 for(const key of ['newton','outlier','correlation']){const a=await demonstration(key,emptyModel()),b=await demonstration(key,emptyModel());assert.deepEqual(a.dataset.rows,b.dataset.rows);assert.equal(a.dataset.source.hash,b.dataset.source.hash);validateDataset(a.dataset);}
 const {dataset}=await demonstration('outlier',emptyModel());dataset.name='<img src=x onerror=alert(1)>';dataset.columns[0].label='</script>';const config=defaultConfig(dataset),result=await analyze(dataset,config,emptyModel()),html=reportHTML({dataset,config,result},'<svg></svg>');assert.doesNotMatch(html,/<img src=x|<script/);assert.match(html,/Пересчёт недоступен/);assert.match(html,/&lt;img/);
});
test('Compute client: cancellation terminates worker and ignores wrong/stale revisions',async()=>{
 const prior=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(message){this.request=message;}terminate(){this.terminated=true;}};
 try{const client=new ComputeClient();const old=client.run({operation:'parse'},'r1');const rejected=assert.rejects(old,{name:'AbortError'});const next=client.run({operation:'parse'},'r2');await rejected;assert.equal(workers[0].terminated,true);const w=workers[1];w.onmessage({data:{jobId:w.request.jobId,modelRevision:'r1',status:'ok',result:'wrong'}});assert.ok(client.active);w.onmessage({data:{jobId:w.request.jobId,modelRevision:'r2',status:'ok',result:'correct'}});assert.equal(await next,'correct');assert.equal(w.terminated,true);const canceled=client.run({operation:'parse'},'r3');const check=assert.rejects(canceled,{name:'AbortError'});client.cancel();await check;assert.equal(client.active,null);}finally{globalThis.Worker=prior;}
});
test('Vendored dependency checksums, license notices and gzip budget are reproducible',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../web/vendor/manifest.json',import.meta.url),'utf8'));assert.ok(manifest.bundles.reduce((n,b)=>n+b.gzip,0)<500*1024);for(const b of manifest.bundles){assert.equal(await sha256(await fs.readFile(new URL('../web/vendor/'+b.file,import.meta.url))),b.sha256);}for(const name of ['papaparse','simple-statistics','@observablehq/plot','d3']){const p=manifest.packages.find(p=>p.name===name);assert.ok(p?.notices.length,name);for(const notice of p.notices)assert.ok((await fs.readFile(new URL('../web/vendor/'+notice,import.meta.url),'utf8')).length>20);}
});
