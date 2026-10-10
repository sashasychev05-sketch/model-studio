import {themePicker} from './theme.js';
import {panelLimits,getPanelLayout,setPanelLayout} from './panels.js';
import {updateButton} from './desktop-updates.js';

let fullscreen=false;
const button=(action,label,symbol)=>`<button type="button" class="icon-btn" data-a="${action}" aria-label="${label}" title="${label}">${symbol}</button>`;
export function appChrome(){return button('app-settings','Настройки приложения','<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3 1-2h4l1 2 2 1 2-1 2 3-1 2v3l1 2-2 3-2-1-2 1-1 2h-4l-1-2-2-1-2 1-2-3 1-2V8L3 6l2-3 2 1Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3"/></svg>')+button('app-fullscreen',fullscreen?'Выйти из полноэкранного режима':'Полноэкранный режим',fullscreen?'⤡':'⤢');}
function syncFullscreen(value){
 fullscreen=!!value;
 document.querySelectorAll('[data-a="app-fullscreen"]').forEach(element=>{
  const label=fullscreen?'Выйти из полноэкранного режима':'Полноэкранный режим';element.title=label;element.setAttribute('aria-label',label);element.textContent=fullscreen?'⤡':'⤢';
 });
 const toggle=document.querySelector('#settings-fullscreen');if(toggle)toggle.textContent=fullscreen?'Выйти из полноэкранного режима':'На весь экран';
}
export async function toggleFullscreen(){
 if(window.modelStudio?.toggleFullscreen)syncFullscreen(await window.modelStudio.toggleFullscreen());
 else if(document.fullscreenElement)await document.exitFullscreen();
 else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
 else throw Error('Этот браузер не поддерживает полноэкранный режим');
}
export function initAppSettings(){
 document.addEventListener('fullscreenchange',()=>syncFullscreen(!!document.fullscreenElement));
 document.addEventListener('keydown',event=>{
  if(event.key==='F11'||(event.key==='Escape'&&fullscreen&&window.modelStudio)){
   event.preventDefault();toggleFullscreen().catch(()=>{});
  }
 });
 window.modelStudio?.onFullscreen?.(syncFullscreen);
 window.modelStudio?.fullscreenState?.().then(syncFullscreen).catch(()=>{});
}
export function settingsDialog(env){
 const layout=getPanelLayout();
 env.dialog('Настройки приложения',`<div class="app-settings"><section><h3>Внешний вид</h3>${themePicker()}<label class="check"><input type="checkbox" id="settings-intro" ${env.introVisible()?'checked':''}>Показывать быстрый старт в каталоге</label><label class="field"><span>Навигация каталога</span><select id="settings-navigation"><option value="folders" ${env.navMode()==='folders'?'selected':''}>Разделы</option><option value="topics" ${env.navMode()==='topics'?'selected':''}>Темы моделей</option></select></label><button type="button" class="btn quiet" id="settings-fullscreen">${fullscreen?'Выйти из полноэкранного режима':'На весь экран'}</button><p class="hint">F11 — переключить полный экран, Esc — выйти.</p></section><section><h3>Боковые панели</h3>${Object.entries(panelLimits).map(([id,[min,max]])=>`<div class="settings-panel"><label class="check"><input type="checkbox" data-settings-panel="${id}" ${!layout[id].hidden?'checked':''}>${{catalog:'Каталог',objects:'Состав модели',properties:'Свойства модели'}[id]}</label><label>Ширина, px<input type="number" data-settings-width="${id}" aria-label="Ширина: ${{catalog:'каталог',objects:'состав модели',properties:'свойства модели'}[id]}" min="${min}" max="${max}" value="${layout[id].width}"></label></div>`).join('')}<button type="button" class="btn quiet" id="settings-reset-panels">Вернуть исходные панели</button></section><section><h3>Библиотека и перенос</h3><p>Модели и сохранённый анализ хранятся на этом компьютере. Сначала сохраняйте изменения, затем создавайте копию или переносите библиотеку.</p><div class="settings-actions"><button type="button" class="btn quiet" data-a="backup">Резервная копия</button><button type="button" class="btn quiet" data-a="migrate-library">Перенести старую библиотеку</button></div></section><section><h3>Обновления и справка</h3>${window.modelStudio?updateButton()+'<label class="check"><input type="checkbox" id="settings-update-check" disabled>Проверять обновления при запуске</label><p class="hint">Фоновая проверка не скачивает и не устанавливает обновления. Изменение действует со следующего запуска.</p>':'<p>Исходную браузерную версию обновляют заменой файлов программы; сначала сохраните резервную копию библиотеки.</p>'}<button type="button" class="btn quiet" data-a="help">Как пользоваться</button></section><section><h3>Горячие клавиши</h3><dl class="shortcut-list"><dt><kbd>Ctrl</kbd> + <kbd>S</kbd></dt><dd>Сохранить модель или самостоятельный анализ</dd><dt><kbd>Ctrl</kbd> + <kbd>Z</kbd></dt><dd>Отменить изменение модели</dd><dt><kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></dt><dd>Повторить изменение модели</dd><dt><kbd>F11</kbd> / <kbd>Esc</kbd></dt><dd>Полный экран / выход из него</dd></dl><p class="hint">В текстовом поле отмена и повтор относятся к тексту. На macOS вместо Ctrl используйте ⌘; F11 зависит от настроек клавиатуры.</p></section><section><h3>О приложении</h3><p id="settings-version" role="status">Читаем сведения о версии…</p><div class="settings-actions"><button type="button" class="btn quiet" data-a="help">Руководство</button><button type="button" class="btn quiet" id="settings-changes">Список изменений</button></div></section><p role="status" id="settings-status">Изменения внешнего вида сохраняются сразу.</p></div>`);
 const document=env.document,status=document.querySelector('#settings-status');
 document.querySelector('#settings-changes').onclick=()=>window.open('/changes.html','_blank','noopener');
 const version=document.querySelector('#settings-version');
 const info=window.modelStudio?.applicationInfo?window.modelStudio.applicationInfo():fetch('/api/health').then(async response=>{if(!response.ok)throw Error('Не удалось прочитать версию');const value=await response.json();return {name:'Модельная',version:value.release,channel:value.channel};});
 info.then(value=>{if(version.isConnected)version.textContent=value.name+' · '+value.version+(value.channel==='draft'?' · черновик':'');}).catch(error=>{if(version.isConnected)version.textContent=error.message;});
 document.querySelector('#settings-intro').onchange=event=>env.setIntroVisible(event.target.checked);
 document.querySelector('#settings-navigation').onchange=event=>env.setNavMode(event.target.value);
 document.querySelector('#settings-fullscreen').onclick=()=>toggleFullscreen().catch(error=>{status.textContent=error.message;});
 const applyPanels=()=>{
  const next=getPanelLayout();
  document.querySelectorAll('[data-settings-panel]').forEach(input=>{next[input.dataset.settingsPanel].hidden=!input.checked;});
  document.querySelectorAll('[data-settings-width]').forEach(input=>{next[input.dataset.settingsWidth].width=Number(input.value);});
  setPanelLayout(next,document);env.render();
  const current=getPanelLayout();document.querySelectorAll('[data-settings-width]').forEach(input=>{input.value=current[input.dataset.settingsWidth].width;});
 };
 document.querySelectorAll('[data-settings-panel],[data-settings-width]').forEach(input=>input.onchange=applyPanels);
 document.querySelector('#settings-reset-panels').onclick=()=>{setPanelLayout({},document);env.render();document.querySelectorAll('[data-settings-panel]').forEach(input=>input.checked=true);const prefs=getPanelLayout();document.querySelectorAll('[data-settings-width]').forEach(input=>input.value=prefs[input.dataset.settingsWidth].width);};
 if(window.modelStudio?.desktopPreferences){
  const input=document.querySelector('#settings-update-check');
  window.modelStudio.desktopPreferences().then(value=>{input.checked=value.checkUpdates;input.disabled=false;}).catch(error=>{status.textContent=error.message;});
  input.onchange=async()=>{input.disabled=true;try{await window.modelStudio.setDesktopPreferences({checkUpdates:input.checked});status.textContent='Настройка проверки обновлений сохранена.';}catch(error){input.checked=!input.checked;status.textContent=error.message;}finally{input.disabled=false;}};
 }
}
