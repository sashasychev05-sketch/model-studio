import {esc} from './scene.js';
let status={state:'idle'};
export function updateButton(){
 if(!window.modelStudio)return '';
 const labels={checking:'Проверка обновлений…',downloading:`Загрузка обновления · ${Math.round(status.percent||0)}%`,available:`Обновить до ${status.version}`,ready:`Установить ${status.version}`};
 return `<button class="nav-item" data-a="check-updates" ${['checking','downloading','installing'].includes(status.state)?'disabled':''}>${esc(labels[status.state]||'Проверить обновления')}</button>`;
}
export function initDesktopUpdates(){
 if(!window.modelStudio)return;
 const apply=value=>{
  // Main-process metadata is escaped before constructing a button.
  status=value;
  const button=document.querySelector('[data-a="check-updates"]');
  if(button){const template=document.createElement('template');template.innerHTML=updateButton();button.replaceWith(template.content.firstElementChild);}
 };
 window.modelStudio.onUpdateStatus(apply);
 window.modelStudio.updateStatus().then(apply).catch(()=>{});
}
