import fs from 'node:fs/promises';
import path from 'node:path';
import {legacyBackup,legacyFile} from '../lib/legacy-library.js';
import {BACKUP_LIMITS} from '../lib/library-backup.mjs';

export async function readLegacyDirectory(directory){
 const root=path.resolve(directory);let bytes=0;
 async function scan(folder,prefix=''){
  const info=await fs.lstat(folder);if(!info.isDirectory()||info.isSymbolicLink())throw Error('Выберите обычную папку библиотеки');
  const result=[];
  for(const item of await fs.readdir(folder,{withFileTypes:true})){
   const name=prefix+item.name;
   if(item.isDirectory()&&(name==='models'||name==='versions'||/^versions\/\w{1,80}$/.test(name))){result.push(...await scan(path.join(folder,item.name),name+'/'));}
   else if(legacyFile(name)){
    if(!item.isFile()||item.isSymbolicLink())throw Error('Библиотека содержит ссылку вместо файла: '+name);
    const file=path.join(root,...name.split('/')),stat=await fs.lstat(file);
    if(stat.isSymbolicLink())throw Error('Файл библиотеки должен быть обычным файлом');
    result.push({name,size:stat.size,mtime:stat.mtimeMs});
   }else if(item.isSymbolicLink()&&['models','versions'].includes(name))throw Error('Папки библиотеки не должны быть ссылками');
  }
  return result.sort((a,b)=>a.name.localeCompare(b.name));
 }
 const before=await scan(root),entries=[];
 if(before.length>15502)throw Error('Слишком много файлов библиотеки');
 for(const file of before){
  bytes+=file.size;if(bytes>BACKUP_LIMITS.bytes)throw Error('Старая библиотека: максимум 128 MiB');
  entries.push({name:file.name,text:await fs.readFile(path.join(root,...file.name.split('/')),'utf8')});
 }
 if(JSON.stringify(before)!==JSON.stringify(await scan(root)))throw Error('Старая библиотека изменилась при чтении. Закройте прежнее приложение и выберите папку заново.');
 return {backup:legacyBackup(entries),sourceLabel:path.basename(root)};
}
