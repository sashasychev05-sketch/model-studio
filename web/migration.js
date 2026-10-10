import {legacyBackup,legacyFile} from '/lib/legacy-library.js';
import {timestamp} from '/lib/export-name.js';
import {esc} from './data/format.js';

const request=async(url,value)=>{
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Не удалось перенести библиотеку');return result;
};
export function migrationDialog(env){
 env.dialog('Перенести старую библиотеку',`<p>Закройте прежнюю Модельную и выберите её папку <strong>data</strong>, содержащую catalog.json и папку models. Исходная папка останется без изменений.</p><p>Перед переносом вы увидите состав библиотеки. Текущая библиотека будет заменена; приложение сохранит её прежнюю копию рядом.</p><button type="button" class="btn primary" id="legacy-select">Выбрать папку старой библиотеки</button><input type="file" id="legacy-files" webkitdirectory multiple hidden><p role="status" id="legacy-status"></p>`);
 const status=env.document.querySelector('#legacy-status'),input=env.document.querySelector('#legacy-files'),select=env.document.querySelector('#legacy-select');
 async function preview({backup,sourceLabel}){
  const summary=await request('/api/backup/preview',backup);
  env.dialog('Предпросмотр переноса',`<p>Библиотека «${esc(sourceLabel)}»: ${summary.models} моделей, ${summary.folders} папок, ${summary.versions} предыдущих версий, ${summary.analysisRows} строк анализа.</p><p>Исходные файлы сохранятся. Перед заменой приложение также сохранит текущую библиотеку в отдельной папке.</p><button type="button" class="btn quiet" id="legacy-backup">Скачать копию переносимой библиотеки</button><label class="check"><input type="checkbox" name="confirmed" required>Заменить текущую библиотеку выбранной старой библиотекой</label>`,'Перенести',async form=>{
   if(!form.get('confirmed'))return;
   if(env.hasUnsaved())throw Error('Сначала сохраните текущую работу');
   const result=await request('/api/backup/restore',{backup,expectedState:summary.expectedState});
   await env.restored();
   env.dialog('Перенос завершён',`<p>Перенесено моделей: ${result.models}. Исходная папка не изменена. Сохранённый анализ можно открыть из каталога.</p><details><summary>Где сохранена прежняя текущая библиотека</summary><p class="data-hash">${esc(result.recoveryDirectory)}</p></details>`);
  });
  env.document.querySelector('#legacy-backup').onclick=()=>env.download('model-studio-legacy-backup-'+timestamp()+'.json',JSON.stringify(backup),'application/json');
 }
 select.onclick=async()=>{
  if(env.hasUnsaved()){status.textContent='Сначала сохраните модель и самостоятельный анализ.';return;}
  if(!window.modelStudio?.chooseLegacyLibrary){input.click();return;}
  select.disabled=true;status.textContent='Читаем и проверяем старую библиотеку…';
  try{const selected=await window.modelStudio.chooseLegacyLibrary();if(selected)await preview(selected);else status.textContent='Выбор папки отменён.';}
  catch(error){status.textContent=error.message;}finally{select.disabled=false;}
 };
 input.onchange=async()=>{
  select.disabled=true;status.textContent='Читаем и проверяем старую библиотеку…';
  try{
   const files=[...input.files],catalogs=files.filter(f=>f.webkitRelativePath.split('/').length===2&&f.name==='catalog.json');
   if(catalogs.length!==1)throw Error('Выберите именно папку data с catalog.json');
   const prefix=catalogs[0].webkitRelativePath.slice(0,-'catalog.json'.length),selected=files.filter(f=>f.webkitRelativePath.startsWith(prefix)&&legacyFile(f.webkitRelativePath.slice(prefix.length)));
   if(selected.length>15502||selected.reduce((sum,f)=>sum+f.size,0)>128*1024*1024)throw Error('Старая библиотека превышает допустимый размер');
   const entries=[];for(const file of selected)entries.push({name:file.webkitRelativePath.slice(prefix.length),text:await file.text()});
   await preview({backup:legacyBackup(entries),sourceLabel:prefix.slice(0,-1)});
  }catch(error){status.textContent=error.message;}finally{select.disabled=false;input.value='';}
 };
}
