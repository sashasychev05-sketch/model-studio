import {validateModel} from './model.js';
import {validatePhysics} from './engine.js';
import {validateAnalysis} from './compute/analysis-schema.js';

export const BACKUP_LIMITS={bytes:128*1024*1024,models:500,folders:500,versions:30};
const fail=message=>{throw new Error(message);};
const id=value=>typeof value==='string'&&/^\w{1,80}$/.test(value);
const date=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));

export function validateWorkspace(record){
 if(!record||!Number.isSafeInteger(record.revision)||record.revision<0||record.revision>=Number.MAX_SAFE_INTEGER||!date(record.updatedAt))fail('Некорректная запись анализа');
 if(record.analysis!==null){validateAnalysis(record.analysis);if(record.analysis?.datasets?.length!==1)fail('В анализе должна быть одна таблица');}
 return record;
}

export function validateBackup(input){
 if(!input||input.format!=='model-studio-backup'||input.version!==1||!date(input.createdAt))fail('Нужна резервная копия Модельной версии 1');
 const value=structuredClone(input),library=value.library;
 if(!library||library.version!==1||!Array.isArray(library.folders)||library.folders.length>BACKUP_LIMITS.folders||!Array.isArray(library.models)||library.models.length>BACKUP_LIMITS.models)fail('Некорректная библиотека резервной копии');
 const folders=new Map();
 for(const folder of library.folders){
  if(!id(folder.id)||folders.has(folder.id)||typeof folder.name!=='string'||!folder.name.trim()||folder.name.length>80||(folder.parentId!==null&&!id(folder.parentId)))fail('Некорректная папка резервной копии');
  folders.set(folder.id,folder);
 }
 for(const folder of folders.values()){
  const seen=new Set();let current=folder;
  while(current){if(seen.has(current.id))fail('Папки образуют цикл');seen.add(current.id);if(current.parentId===null)break;current=folders.get(current.parentId);if(!current)fail('Родительская папка не найдена');}
 }
 const records=new Map();
 function checkRecord(record){
  if(!record||!id(record.id)||!Number.isSafeInteger(record.revision)||record.revision<1||record.revision>=Number.MAX_SAFE_INTEGER||![0,1].includes(record.archived)||!date(record.updatedAt)||(record.folderId!==null&&!folders.has(record.folderId)))fail('Некорректная модель резервной копии');
  validatePhysics(validateModel(record.spec));
 }
 for(const record of library.models){checkRecord(record);if(records.has(record.id))fail('Повторный идентификатор модели');records.set(record.id,record);}
 if(!Array.isArray(value.histories)||value.histories.length>library.models.length)fail('Некорректная история резервной копии');
 const histories=new Set();
 for(const history of value.histories){
  if(!history||!records.has(history.id)||histories.has(history.id)||!Array.isArray(history.records)||history.records.length>BACKUP_LIMITS.versions)fail('Некорректная история модели');
  histories.add(history.id);const revisions=new Set();
  for(const record of history.records){
   // Historical folders may have since been removed. They are metadata only.
   const folder=record.folderId;record.folderId=records.get(history.id).folderId;checkRecord(record);record.folderId=folder;
   if(folder!==null&&!id(folder))fail('Некорректная папка исторической модели');
   if(record.id!==history.id||record.revision>=records.get(history.id).revision||revisions.has(record.revision))fail('Некорректные ревизии истории');revisions.add(record.revision);
  }
 }
 validateWorkspace(value.workspace);
 return value;
}
