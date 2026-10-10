import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {emptyModel,newBody} from '../lib/model.js';
import {legacyBackup} from '../lib/legacy-library.js';
import {readLegacyDirectory} from '../desktop/legacy.mjs';

const time='2026-10-09T00:00:00.000Z';
const record=revision=>({id:'old_model',revision,updatedAt:time,archived:1,folderId:'old_folder',spec:{...emptyModel(),title:'Старая авторская модель',bodies:[newBody()]}});
const entries=()=>[
 {name:'catalog.json',text:JSON.stringify({version:1,folders:[{id:'old_folder',name:'Старые опыты',parentId:null}]})},
 {name:'models/old_model.json',text:JSON.stringify(record(2))},
 {name:'versions/old_model/1.json',text:JSON.stringify(record(1))}
];
test('Legacy migration preserves archived models, folders and history without inventing analysis',()=>{
 const backup=legacyBackup(entries());assert.equal(backup.library.models[0].archived,1);assert.equal(backup.histories[0].records[0].revision,1);assert.equal(backup.workspace.analysis,null);
 const duplicate=entries();duplicate.push(duplicate[0]);assert.throws(()=>legacyBackup(duplicate),/повторный/);
 const invalid=entries();invalid[1].text=JSON.stringify({...record(2),id:'another'});assert.throws(()=>legacyBackup(invalid),/не совпадает/);
 assert.throws(()=>legacyBackup([{name:'../catalog.json',text:'{}'}]),/Некорректный/);
 assert.throws(()=>legacyBackup([{name:'catalog.json',text:'{'}]),/прочитать JSON/);
});
test('Native legacy reader is read-only, ignores unrelated files and rejects a junction',async()=>{
 const root=path.resolve('work','legacy-test-'+crypto.randomUUID());await fs.mkdir(root,{recursive:true});
 for(const item of entries()){const file=path.join(root,...item.name.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,item.text);}
 await fs.writeFile(path.join(root,'private.txt'),'not part of the library');
 const before=await Promise.all(entries().map(e=>fs.readFile(path.join(root,...e.name.split('/')),'utf8')));
 const selected=await readLegacyDirectory(root);assert.equal(selected.backup.library.models.length,1);
 assert.deepEqual(before,await Promise.all(entries().map(e=>fs.readFile(path.join(root,...e.name.split('/')),'utf8'))));
 const other=path.resolve('work','legacy-link-'+crypto.randomUUID());await fs.mkdir(other,{recursive:true});await fs.symlink(root,path.join(other,'models'),process.platform==='win32'?'junction':'dir');
 await assert.rejects(readLegacyDirectory(other),/ссылк/);
});
