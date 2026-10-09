import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateModel} from './model.js';
import {validatePhysics} from './engine.js';
import {exampleFolders,examples} from './public-gallery.mjs';
import {validateAnalysis} from './compute/analysis-schema.js';
import {validateBackup,BACKUP_LIMITS} from './library-backup.mjs';
import {validateWorkspace} from './library-backup.mjs';
import {createHash} from 'node:crypto';
const root=process.env.MODEL_STUDIO_DATA_DIR??path.join(path.dirname(fileURLToPath(import.meta.url)),'../data');
const modelsPath=path.join(root,'models');
const indexPath=path.join(root,'catalog.json');
const versionsPath=path.join(root,'versions');
async function rememberVersion(record){const dir=path.join(versionsPath,safeId(record.id));await fs.mkdir(dir,{recursive:true});await atomic(path.join(dir,record.revision+'.json'),record);const names=(await fs.readdir(dir)).filter(n=>/^\d+\.json$/.test(n)).sort((a,b)=>Number(b.split('.')[0])-Number(a.split('.')[0]));for(const name of names.slice(30))await fs.unlink(path.join(dir,name));}
export async function listVersions(id){const current=await getModel(id);let names=[];try{names=await fs.readdir(path.join(versionsPath,safeId(id)));}catch(e){if(e.code!=='ENOENT')throw e;}const records=await Promise.all(names.filter(n=>/^\d+\.json$/.test(n)).map(n=>fs.readFile(path.join(versionsPath,safeId(id),n),'utf8').then(JSON.parse)));return [current,...records.filter(r=>r.revision!==current.revision)].sort((a,b)=>b.revision-a.revision).map(r=>({revision:r.revision,updatedAt:r.updatedAt,title:r.spec.title,current:r.revision===current.revision}));}
export async function getVersion(id,revision){const current=await getModel(id);if(current.revision===revision)return current;if(!Number.isInteger(revision)||revision<1)throw new AppError('Некорректная версия');try{return JSON.parse(await fs.readFile(path.join(versionsPath,safeId(id),revision+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')throw new AppError('Версия не найдена',404);throw e;}}
export class AppError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const safeId=id=>{if(typeof id!=='string'||!/^\w{1,80}$/.test(id))throw new AppError('Некорректное имя файла');return id;};
async function atomic(file,data){const temp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2),'utf8');await fs.rename(temp,file);}
let queue=Promise.resolve();function serial(fn){const p=queue.then(fn);queue=p.catch(()=>{});return p;}
export async function initialize(){await recoverRestore();await fs.mkdir(modelsPath,{recursive:true});try{await fs.access(indexPath);}catch(e){if(e.code!=='ENOENT')throw e;const now=new Date().toISOString();for(const m of examples)await atomic(path.join(modelsPath,m.id+'.json'),{...m,revision:1,updatedAt:now,archived:0});await atomic(indexPath,{version:1,folders:exampleFolders});}}
async function catalog(){return JSON.parse(await fs.readFile(indexPath,'utf8'));}
export async function getModel(id){try{return JSON.parse(await fs.readFile(path.join(modelsPath,safeId(id)+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')throw new AppError('Модель не найдена',404);throw e;}}
export async function listLibrary(){const c=await catalog();const names=(await fs.readdir(modelsPath)).filter(f=>f.endsWith('.json'));const models=await Promise.all(names.map(async f=>JSON.parse(await fs.readFile(path.join(modelsPath,f),'utf8'))));models.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));return {folders:c.folders,models};}
async function checkFolder(id){if(id&&!((await catalog()).folders.some(f=>f.id===id)))throw new AppError('Папка не найдена',404);}
export function saveModel(a){return serial(async()=>{const spec=validatePhysics(validateModel(a.spec));const folderId=a.folderId??null;await checkFolder(folderId);let id=a.id,revision=1,archived=0;if(id){const old=await getModel(id);if(a.expectedRevision!==old.revision)throw new AppError('Модель изменена в другом окне или помощником. Экспортируйте свои изменения, обновите каталог и откройте последнюю версию.',409);await rememberVersion(old);revision=old.revision+1;archived=old.archived;}else id='model_'+crypto.randomUUID().replaceAll('-','');const result={id,folderId,spec,revision,archived,updatedAt:new Date().toISOString()};await atomic(path.join(modelsPath,safeId(id)+'.json'),result);return result;});}
export function createFolder(name,parentId=null){return serial(async()=>{if(typeof name!=='string'||!name.trim()||name.length>80)throw new AppError('Проверьте название папки');await checkFolder(parentId);const c=await catalog(),f={id:'folder_'+crypto.randomUUID().replaceAll('-',''),name:name.trim(),parentId};c.folders.push(f);await atomic(indexPath,c);return f;});}
export function renameFolder(id,name){return serial(async()=>{if(typeof name!=='string'||!name.trim()||name.length>80)throw new AppError('Проверьте название папки');const c=await catalog(),f=c.folders.find(f=>f.id===id);if(!f)throw new AppError('Папка не найдена',404);f.name=name.trim();await atomic(indexPath,c);return f;});}
export function deleteFolder(id){return serial(async()=>{const lib=await listLibrary();if(lib.models.some(m=>m.folderId===id)||lib.folders.some(f=>f.parentId===id))throw new AppError('Сначала переместите модели и удалите вложенные папки');await atomic(indexPath,{version:1,folders:lib.folders.filter(f=>f.id!==id)});});}
export function archiveModel(id,revision,archived){return serial(async()=>{const m=await getModel(id);if(revision!==m.revision)throw new AppError('Модель изменена. Обновите каталог.',409);await rememberVersion(m);m.archived=archived?1:0;m.revision++;m.updatedAt=new Date().toISOString();await atomic(path.join(modelsPath,safeId(id)+'.json'),m);return m;});}
export async function operation(a){switch(a.action){case 'versions':return listVersions(a.id);case 'version':return getVersion(a.id,a.revision);case 'save':return saveModel(a);case 'createFolder':return createFolder(a.name,a.parentId);case 'renameFolder':return renameFolder(a.id,a.name);case 'deleteFolder':return deleteFolder(a.id);case 'archive':return archiveModel(a.id,a.expectedRevision,a.archived);case 'move':{const m=await getModel(a.id);return saveModel({id:a.id,spec:m.spec,folderId:a.folderId,expectedRevision:a.expectedRevision});}default:throw new AppError('Неизвестное действие');}}

const workspacePath=path.join(root,'analysis.json');
export async function getWorkspace(){
 try{return validateWorkspace(JSON.parse(await fs.readFile(workspacePath,'utf8')));}
 catch(error){if(error.code==='ENOENT')return {revision:0,updatedAt:new Date(0).toISOString(),analysis:null};throw error;}
}
export function saveWorkspace({analysis,expectedRevision}){return serial(async()=>{
 validateAnalysis(analysis);if(analysis?.datasets?.length!==1)throw new AppError('Сначала загрузите одну таблицу');
 const current=await getWorkspace();if(expectedRevision!==current.revision)throw new AppError('Анализ изменён в другом окне. Экспортируйте свой JSON и откройте сохранённую версию.',409);
 const record={revision:current.revision+1,updatedAt:new Date().toISOString(),analysis};
 await atomic(workspacePath,record);return record;
});}

async function backupSnapshot(){
 const library=await listLibrary(),histories=[];
 for(const model of library.models){
  const records=[];let names=[];
  try{names=await fs.readdir(path.join(versionsPath,safeId(model.id)));}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const name of names.filter(n=>/^\d+\.json$/.test(n)).sort((a,b)=>Number(a.split('.')[0])-Number(b.split('.')[0])))records.push(JSON.parse(await fs.readFile(path.join(versionsPath,model.id,name),'utf8')));
  if(records.length)histories.push({id:model.id,records});
 }
 return {format:'model-studio-backup',version:1,createdAt:new Date().toISOString(),library:{version:1,...library},histories,workspace:await getWorkspace()};
}
const stateToken=snapshot=>createHash('sha256').update(JSON.stringify({library:snapshot.library,workspace:snapshot.workspace})).digest('hex');
export function exportBackup(){return serial(async()=>{
 const snapshot=await backupSnapshot();if(Buffer.byteLength(JSON.stringify(snapshot))>BACKUP_LIMITS.bytes)throw new AppError('Резервная копия превышает 128 MiB',413);
 return snapshot;
});}
export function previewBackup(input){return serial(async()=>{
 const value=validateBackup(input),current=await backupSnapshot();
 return {models:value.library.models.length,folders:value.library.folders.length,versions:value.histories.reduce((n,h)=>n+h.records.length,0),analysisRows:value.workspace.analysis?.datasets[0]?.rows.length??0,createdAt:value.createdAt,expectedState:stateToken(current)};
});}

const absoluteRoot=path.resolve(root),journalPath=absoluteRoot+'.restore-journal.json';
async function exists(file){try{await fs.access(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function recoverRestore(){
 if(!await exists(journalPath))return;
 const journal=JSON.parse(await fs.readFile(journalPath,'utf8'));
 // Only sibling directories created by this restore operation are recoverable.
 if(typeof journal.previous!=='string'||path.dirname(journal.previous)!==path.dirname(absoluteRoot)||!journal.previous.startsWith(absoluteRoot+'.before-'))throw new AppError('Проверьте журнал восстановления библиотеки');
 if(!await exists(absoluteRoot)){if(!await exists(journal.previous))throw new AppError('Не найдена библиотека для восстановления');await fs.rename(journal.previous,absoluteRoot);}
 await fs.unlink(journalPath);
}
export function restoreBackup(input,expectedState){return serial(async()=>{
 const value=validateBackup(input),current=await backupSnapshot();
 if(expectedState!==stateToken(current))throw new AppError('Библиотека изменилась после предпросмотра. Откройте резервную копию заново.',409);
 if(absoluteRoot===path.dirname(absoluteRoot))throw new AppError('Нельзя восстанавливать в корень диска');
 const token=crypto.randomUUID(),stage=absoluteRoot+'.restore-'+token,previous=absoluteRoot+'.before-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+token;
 await fs.mkdir(path.join(stage,'models'),{recursive:true});
 const oldRevisions=new Map(current.library.models.map(m=>[m.id,m.revision]));
 for(const record of value.library.models){
  // All restored records get fresh revisions, invalidating existing drafts.
  record.revision=Math.max(record.revision,oldRevisions.get(record.id)??0)+1;
  record.updatedAt=new Date().toISOString();
  await atomic(path.join(stage,'models',record.id+'.json'),record);
 }
 for(const history of value.histories)for(const record of history.records){const dir=path.join(stage,'versions',history.id);await fs.mkdir(dir,{recursive:true});await atomic(path.join(dir,record.revision+'.json'),record);}
 await atomic(path.join(stage,'catalog.json'),{version:1,folders:value.library.folders});
 const workspace={...value.workspace,revision:Math.max(value.workspace.revision,current.workspace.revision)+1,updatedAt:new Date().toISOString()};
 await atomic(path.join(stage,'analysis.json'),workspace);
 await atomic(journalPath,{previous});
 await fs.rename(absoluteRoot,previous);
 try{await fs.rename(stage,absoluteRoot);}catch(error){await fs.rename(previous,absoluteRoot);await fs.unlink(journalPath);throw error;}
 await fs.unlink(journalPath);
 return {models:value.library.models.length,recoveryDirectory:previous};
});}
