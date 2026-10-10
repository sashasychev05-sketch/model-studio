import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createExportRegistry,trackExports} from '../desktop/exports.mjs';

test('Reveal export accepts only opaque IDs of completed files and detects removed files',async()=>{
 await fs.mkdir('work',{recursive:true});const folder=await fs.mkdtemp(path.resolve('work','export-registry-')),file=path.join(folder,'Опыт.html');await fs.writeFile(file,'<!doctype html>');
 const revealed=[],registry=createExportRegistry(value=>revealed.push(value)),entry=registry.remember(file);
 assert.equal(entry.name,'Опыт.html');assert.equal(JSON.stringify(entry).includes(folder),false);
 await assert.rejects(registry.reveal(file),/недоступен/);await assert.rejects(registry.reveal({id:entry.id}),/недоступен/);
 await registry.reveal(entry.id);assert.deepEqual(revealed,[file]);await fs.unlink(file);await assert.rejects(registry.reveal(entry.id),/перемещён/);
 for(let i=0;i<21;i++)registry.remember(path.join(folder,String(i)));await assert.rejects(registry.reveal(entry.id),/недоступен/);registry.clear();
});

test('Download tracking rejects subframes, guides and opaque initiators; ignores cancelled downloads',()=>{
 const session=new EventEmitter(),window=new EventEmitter(),mainFrame={url:'http://127.0.0.1:4190/?model=a'},messages=[];
 window.webContents={session,mainFrame,send:(...args)=>messages.push(args)};window.isDestroyed=()=>false;
 const registry=createExportRegistry(()=>{});trackExports(window,'http://127.0.0.1:4190',registry);
 const make=(initiator='http://127.0.0.1:4190')=>Object.assign(new EventEmitter(),{getInitiatorOrigin:()=>initiator,getURL:()=> 'blob:http://127.0.0.1:4190/id',getSavePath:()=>path.resolve('work/export.html')});
 for(const [contents,frame,initiator]of [[window.webContents,{url:mainFrame.url},'http://127.0.0.1:4190'],[{},mainFrame,'http://127.0.0.1:4190'],[window.webContents,mainFrame,'null']]){const item=make(initiator);session.emit('will-download',{},item,contents,frame);item.emit('done',{},'completed');}
 const cancelled=make();session.emit('will-download',{},cancelled,window.webContents,mainFrame);cancelled.emit('done',{},'cancelled');assert.equal(messages.length,0);
 const valid=make();session.emit('will-download',{},valid,window.webContents,mainFrame);valid.emit('done',{},'completed');assert.equal(messages.length,1);assert.equal(messages[0][0],'model-studio:export-ready');assert.equal(messages[0][1].name,'export.html');
 Object.defineProperty(window,'webContents',{get(){throw Error('Object has been destroyed');}});window.emit('closed');assert.equal(session.listenerCount('will-download'),0);
});
