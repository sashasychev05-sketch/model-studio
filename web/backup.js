import {esc} from './data/format.js';
import {timestamp} from '/lib/export-name.js';
const limit=128*1024*1024;
async function request(url,value){
 const response=await fetch(url,value?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}:{});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Не удалось открыть резервную копию');return data;
}
export function backupDialog(env){
 env.dialog('Резервная копия библиотеки',`<p>В один файл войдут сохранённые модели, папки, история версий и сохранённый самостоятельный анализ. Несохранённые изменения и настройки окна в копию не входят.</p><div class="menu-actions"><button type="button" class="btn primary full" id="backup-download">Скачать резервную копию</button><button type="button" class="btn quiet full" id="backup-select">Открыть резервную копию</button><input type="file" id="backup-file" accept=".json,application/json" hidden></div><p role="status" id="backup-status"></p>`);
 const status=env.document.querySelector('#backup-status');
 env.document.querySelector('#backup-download').onclick=async event=>{
  event.target.disabled=true;status.textContent='Готовим резервную копию…';
  try{const value=await request('/api/backup');env.download('model-studio-backup-'+timestamp()+'.json',JSON.stringify(value),'application/json');status.textContent='Резервная копия готова. Сохраните файл в надёжном месте.';}
  catch(error){status.textContent=error.message;}finally{event.target.disabled=false;}
 };
 const input=env.document.querySelector('#backup-file');
 env.document.querySelector('#backup-select').onclick=()=>{
  if(env.hasUnsaved()){status.textContent='Сначала сохраните или экспортируйте изменения самостоятельного анализа.';return;}input.click();
 };
 input.onchange=async()=>{
  const file=input.files[0];if(!file)return;status.textContent='Проверяем резервную копию…';
  try{
   if(file.size>limit)throw Error('Резервная копия: максимум 128 MiB');
   const backup=JSON.parse(await file.text()),preview=await request('/api/backup/preview',backup);
   env.dialog('Восстановить библиотеку?',`<p>Копия от ${esc(new Date(preview.createdAt).toLocaleString('ru-RU'))}: ${preview.models} моделей, ${preview.folders} папок, ${preview.versions} предыдущих версий; ${preview.analysisRows} строк самостоятельного анализа.</p><p>Сохранённая библиотека будет заменена этой копией. Перед заменой приложение автоматически сохранит прежнюю библиотеку в отдельной папке.</p><label class="check"><input type="checkbox" name="confirmed" required>Заменить сохранённую библиотеку выбранной копией</label>`,'Восстановить',async form=>{
    if(!form.get('confirmed'))return;
    const restored=await request('/api/backup/restore',{backup,expectedState:preview.expectedState});
    await env.restored();
    env.dialog('Библиотека восстановлена',`<p>Восстановлено моделей: ${restored.models}. Самостоятельный анализ можно открыть из каталога и пересчитать.</p><details><summary>Где сохранена прежняя библиотека</summary><p class="data-hash">${esc(restored.recoveryDirectory)}</p></details>`);
   });
  }catch(error){status.textContent=error.message;}
 };
}
