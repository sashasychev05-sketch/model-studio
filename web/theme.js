import {validTheme,themeNames} from '/lib/theme.js';
let theme='light';try{const saved=localStorage.getItem('model-studio-theme');theme=Object.hasOwn(themeNames,saved)?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch{}
export const currentTheme=()=>theme;
export const themePicker=()=>`<label class="theme-picker"><span>Тема</span><select data-app-theme aria-label="Тема приложения">${Object.entries(themeNames).map(([id,label])=>`<option value="${id}" ${theme===id?'selected':''}>${label}</option>`).join('')}</select></label>`;
export function syncModelTheme(frame=document.querySelector('#html-frame')){frame?.contentWindow?.postMessage({type:'model-studio-theme',theme},'*');}
export function setAppTheme(value){theme=validTheme(value);document.documentElement.dataset.theme=theme;try{localStorage.setItem('model-studio-theme',theme);}catch{}document.querySelectorAll('[data-app-theme]').forEach(select=>select.value=theme);syncModelTheme();}
setAppTheme(theme);
document.addEventListener('change',event=>{if(event.target.matches?.('[data-app-theme]'))setAppTheme(event.target.value);});
document.addEventListener('load',event=>{if(event.target.id==='html-frame')syncModelTheme(event.target);},true);
window.addEventListener('message',event=>{const frame=document.querySelector('#html-frame');if(frame&&event.source===frame.contentWindow&&event.data?.type==='model-studio-theme-ready')syncModelTheme(frame);});
window.addEventListener('storage',event=>{if(event.key==='model-studio-theme'&&Object.hasOwn(themeNames,event.newValue))setAppTheme(event.newValue);});
