import {performance} from 'node:perf_hooks';
import os from 'node:os';
import fs from 'node:fs/promises';
import {parseCSV,analyze,defaultConfig} from '../lib/compute/statistics.js';
import {emptyModel} from '../lib/model.js';
const records=[];
for(const count of [10000,50000]){const csv='x;y;z;q;r\n'+Array.from({length:count},(_,i)=>[i,i*2+1,i%17,i%29,i%101].join(';')).join('\n');const memory=process.memoryUsage().rss,start=performance.now();const dataset=await parseCSV({text:csv,options:{delimiter:';'}});const parsed=performance.now();const result=await analyze(dataset,defaultConfig(dataset),emptyModel());records.push({rows:count,columns:5,csvBytes:Buffer.byteLength(csv),parseMs:parsed-start,totalMs:performance.now()-start,rssDeltaBytes:process.memoryUsage().rss-memory,regression:result.result.regression,displayedPoints:result.result.points.length});}
const report={measuredAt:new Date().toISOString(),node:process.version,platform:process.platform,architecture:process.arch,cpus:os.cpus()[0]?.model,totalMemoryGiB:os.totalmem()/1024**3,scope:'Node warm module; excludes browser worker startup, IPC, chart rendering and transient peak memory; not weak-laptop certification',records};await fs.writeFile(new URL('../docs/science-benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
