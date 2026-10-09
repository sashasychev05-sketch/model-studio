import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {emptyModel} from '../lib/model.js';
import {defaultConfig,parseCSV} from '../lib/compute/statistics.js';
import {validateBackup} from '../lib/library-backup.mjs';

const root=path.resolve('work','persistence-'+crypto.randomUUID());
process.env.MODEL_STUDIO_DATA_DIR=root;
const store=await import('../lib/storage.mjs');
await store.initialize();
const dataset=await parseCSV({text:'x,y\n0,1\n1,3\n2,5',name:'Измерения'});
const analysis={schemaVersion:1,datasets:[dataset],config:defaultConfig(dataset)};

test('Standalone analysis persists across initialization, rejects stale writes and invalid data',async()=>{
 assert.equal((await store.getWorkspace()).analysis,null);
 const saved=await store.saveWorkspace({analysis,expectedRevision:0});
 await store.initialize();assert.deepEqual(await store.getWorkspace(),saved);
 await assert.rejects(store.saveWorkspace({analysis,expectedRevision:0}),error=>error.status===409);
 const bad=structuredClone(analysis);bad.datasets[0].rows[0][0]=Infinity;
 await assert.rejects(store.saveWorkspace({analysis:bad,expectedRevision:saved.revision}),/значение/);
 assert.deepEqual(await store.getWorkspace(),saved);
});

let backup,model;
test('Backup contains folders, archived models, original version history and standalone data',async()=>{
 const folder=await store.createFolder('Мои опыты'),spec=emptyModel();spec.title='Сохранённый опыт';
 model=await store.saveModel({spec,folderId:folder.id});
 model=await store.saveModel({id:model.id,spec:{...spec,title:'Вторая версия'},folderId:folder.id,expectedRevision:model.revision});
 model=await store.archiveModel(model.id,model.revision,true);
 backup=await store.exportBackup();assert.equal(backup.library.models.length,21);
 assert.equal(backup.histories.find(h=>h.id===model.id).records.length,2);
 assert.deepEqual(backup.workspace.analysis,analysis);assert.equal(backup.library.models.find(m=>m.id===model.id).archived,1);
 assert.deepEqual(validateBackup(backup),backup);
});

test('Corrupt backups, traversal IDs, folder cycles and repeated revisions fail before any writes',async()=>{
 const before=await fs.readFile(path.join(root,'catalog.json'),'utf8');
 const changes=[b=>{b.library.models[0].id='../outside';},b=>{b.library.folders[0].parentId=b.library.folders[0].id;},b=>{b.library.models.push(b.library.models[0]);},b=>{b.workspace.analysis.datasets[0].rows[0][0]='bad';},b=>{b.histories[0].records.push(b.histories[0].records[0]);}];
 for(const change of changes){const bad=structuredClone(backup);change(bad);await assert.rejects(store.previewBackup(bad));}
 assert.equal(await fs.readFile(path.join(root,'catalog.json'),'utf8'),before);
});

test('Restore refuses a changed library, retains pre-restore files and invalidates old revisions',async()=>{
 const preview=await store.previewBackup(backup);
 const newer=await store.saveModel({id:model.id,spec:{...model.spec,title:'После копии'},folderId:model.folderId,expectedRevision:model.revision});
 await assert.rejects(store.restoreBackup(backup,preview.expectedState),error=>error.status===409);
 const fresh=await store.previewBackup(backup),result=await store.restoreBackup(backup,fresh.expectedState);
 const old=JSON.parse(await fs.readFile(path.join(result.recoveryDirectory,'models',model.id+'.json'),'utf8'));
 assert.equal(old.spec.title,'После копии');
 const restored=await store.getModel(model.id);assert.equal(restored.spec.title,'Вторая версия');assert.ok(restored.revision>newer.revision);
 assert.deepEqual((await store.getWorkspace()).analysis,analysis);
 await assert.rejects(store.saveModel({id:model.id,spec:newer.spec,folderId:model.folderId,expectedRevision:newer.revision}),error=>error.status===409);
 assert.equal((await store.listVersions(model.id)).length,3);
});

test('Interrupted restore recovers the original directory instead of reseeding user data',async()=>{
 const previous=root+'.before-'+crypto.randomUUID();await fs.writeFile(root+'.restore-journal.json',JSON.stringify({previous}));
 await fs.rename(root,previous);await store.initialize();
 assert.equal((await store.getModel(model.id)).spec.title,'Вторая версия');assert.deepEqual((await store.getWorkspace()).analysis,analysis);
 await assert.rejects(fs.access(root+'.restore-journal.json'),error=>error.code==='ENOENT');
});

test('HTTP analysis and backup endpoints use revisions, origin checks and sandboxed HTML',async()=>{
 const {startServer}=await import('../server.mjs'),server=await startServer({port:0}),base='http://127.0.0.1:'+server.address().port;
 try{
  const current=await (await fetch(base+'/api/analysis')).json();assert.deepEqual(current.analysis,analysis);
  const denied=await fetch(base+'/api/analysis',{method:'POST',headers:{Origin:'https://example.com'},body:JSON.stringify({analysis,expectedRevision:current.revision})});assert.equal(denied.status,403);
  const stale=await fetch(base+'/api/analysis',{method:'POST',body:JSON.stringify({analysis,expectedRevision:0})});assert.equal(stale.status,409);
  const response=await fetch(base+'/api/backup');assert.match(response.headers.get('content-disposition'),/attachment/);assert.equal((await response.json()).format,'model-studio-backup');
  const invalid=await fetch(base+'/api/backup/preview',{method:'POST',body:'{}'});assert.equal(invalid.status,400);
  const html=await fetch(base+'/api/html/gallery_circle');assert.match(html.headers.get('content-security-policy'),/sandbox allow-scripts/);assert.doesNotMatch(html.headers.get('content-security-policy'),/allow-same-origin/);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
