import {showDialogError} from './ui-messages.js';

export function initExportFeedback(){
 if(!window.modelStudio?.onExportReady)return;
 window.modelStudio.onExportReady(value=>{
  if(!value||typeof value.id!=='string'||typeof value.name!=='string')return;
  document.querySelectorAll('.export-notice').forEach(element=>element.remove());
  const notice=document.createElement('section');notice.className='export-notice';notice.setAttribute('aria-label','Сохранённый файл');
  const label=document.createElement('p');label.setAttribute('role','status');label.textContent='Сохранено: '+value.name;
  const reveal=document.createElement('button');reveal.type='button';reveal.className='btn quiet';reveal.textContent='Показать в папке';
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='btn quiet';dismiss.textContent='Закрыть уведомление';dismiss.onclick=()=>notice.remove();
  reveal.onclick=async()=>{reveal.disabled=true;try{await window.modelStudio.revealExport(value.id);}catch(error){label.textContent=error.message;label.setAttribute('role','alert');showDialogError(error);}finally{reveal.disabled=false;}};
  notice.append(label,reveal,dismiss);
  const dialog=document.querySelector('#dialog[open]');if(dialog)dialog.querySelector('.dialog-content').append(notice);else{notice.classList.add('export-notice-floating');document.body.append(notice);}
 });
}
