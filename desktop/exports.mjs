import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {trustedUpdateSender} from './updates.mjs';

export function createExportRegistry(reveal){
 const files=new Map();
 return {
  remember(file){if(!path.isAbsolute(file))throw Error('Некорректный файл экспорта');const id=randomUUID();files.set(id,file);if(files.size>20)files.delete(files.keys().next().value);return {id,name:path.basename(file)};},
  async reveal(id){const file=typeof id==='string'?files.get(id):null;if(!file)throw Error('Этот файл экспорта недоступен. Сохраните его снова.');try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('not a file');}catch{throw Error('Сохранённый файл перемещён или удалён.');}reveal(file);return true;},
  clear:()=>files.clear()
 };
}
export function trackExports(window,origin,registry){
 const session=window.webContents.session;
 const handler=(_event,item,contents,frame)=>{
  // The initiator and exact main frame are available in pinned Electron 44.7.
  if(!trustedUpdateSender({sender:contents,senderFrame:frame},window,origin)||item.getInitiatorOrigin()!==origin||!item.getURL().startsWith('blob:'+origin+'/'))return;
  item.once('done',(_event,state)=>{
   if(state!=='completed'||window.isDestroyed())return;
   const value=registry.remember(item.getSavePath());window.webContents.send('model-studio:export-ready',value);
  });
 };
 session.on('will-download',handler);
 window.once('closed',()=>{session.removeListener('will-download',handler);registry.clear();});
}
