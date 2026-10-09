import {validateBackup,BACKUP_LIMITS} from './library-backup.mjs';

export const legacyFile = name => /^(catalog\.json|analysis\.json|models\/\w{1,80}\.json|versions\/\w{1,80}\/\d+\.json)$/.test(name);

// Both the native directory picker and browser directory uploads use this validator.
export function legacyBackup(entries) {
 const files=new Map();let bytes=0;
 for(const {name,text} of entries){
  if(!legacyFile(name)||typeof text!=='string'||files.has(name))throw Error('Некорректный или повторный файл старой библиотеки');
  bytes+=new TextEncoder().encode(text).length;
  if(bytes>BACKUP_LIMITS.bytes||files.size>=15502)throw Error('Старая библиотека превышает допустимый размер');
  try{files.set(name,JSON.parse(text));}catch{throw Error('Не удалось прочитать JSON: '+name);}
 }
 const catalog=files.get('catalog.json');
 if(catalog?.version!==1||!Array.isArray(catalog.folders))throw Error('Выберите папку data с файлом catalog.json');
 const models=[...files].filter(([name])=>name.startsWith('models/')).map(([name,record])=>{
  if(record?.id!==name.slice(7,-5))throw Error('Имя файла не совпадает с моделью: '+name);
  return record;
 });
 const histories=models.map(model=>({id:model.id,records:[...files].filter(([name])=>name.startsWith('versions/'+model.id+'/')).map(([name,record])=>{
  if(record?.revision!==Number(name.split('/').at(-1).slice(0,-5)))throw Error('Имя файла не совпадает с версией: '+name);
  return record;
 })})).filter(history=>history.records.length);
 return validateBackup({format:'model-studio-backup',version:1,createdAt:new Date().toISOString(),library:{version:1,folders:catalog.folders,models},histories,workspace:files.get('analysis.json')??{revision:0,updatedAt:new Date(0).toISOString(),analysis:null}});
}
