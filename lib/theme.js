import {installSpeedInput} from './playback.js';
export const palettes={
 light:{bg:'#f6f7fb',surface:'#ffffff',soft:'#eef1f8',plot:'#f8faff',ink:'#26334a',muted:'#596981',line:'#dce3ee',accent:'#4f56e8',accentHover:'#4248d4',accentSoft:'#eeefff',blue:'#356acc',orange:'#b9581d',green:'#16866d',purple:'#8055a0',water:'#cee6fa',warm:'#fbebdf',danger:'#ab4357',dangerSoft:'#fff0f1',onAccent:'#ffffff'},
 dark:{bg:'#111925',surface:'#1b2738',soft:'#233249',plot:'#182539',ink:'#edf2fa',muted:'#afbed2',line:'#455871',accent:'#a0a6ff',accentHover:'#b3b8ff',accentSoft:'#30345a',blue:'#82b9f6',orange:'#ffb470',green:'#6ed2b6',purple:'#c4a1ef',water:'#2b5379',warm:'#493629',danger:'#ff9cab',dangerSoft:'#422735',onAccent:'#171d35'}
};
Object.assign(palettes,{
 black:{...palettes.dark,bg:'#000000',surface:'#080808',soft:'#141414',plot:'#050505',ink:'#fafafa',muted:'#c2c2c2',line:'#424242',accentSoft:'#24243a'},
 midnight:{...palettes.dark,bg:'#060b18',surface:'#0c1427',soft:'#172440',plot:'#081021',ink:'#eef4ff',muted:'#b3c6e3',line:'#405877',accent:'#8acfff',accentHover:'#a8dcff',accentSoft:'#183653',onAccent:'#081727'},
 forest:{...palettes.dark,bg:'#071813',surface:'#10251d',soft:'#19352b',plot:'#091f17',ink:'#eaf9f0',muted:'#bad1c3',line:'#406553',accent:'#a2e2b8',accentHover:'#b9edcb',accentSoft:'#284934',onAccent:'#102319'},
 sepia:{...palettes.light,bg:'#f4eedf',surface:'#fff9ec',soft:'#eae0cb',plot:'#fbf3e4',ink:'#362c22',muted:'#6e5c49',line:'#aa957d',accent:'#805231',accentHover:'#694225',accentSoft:'#ead9c4',onAccent:'#fff9ed'}
});
export const themeNames={light:'Светлая',dark:'Тёмная',black:'Чёрная',midnight:'Полночь',forest:'Лес',sepia:'Бумага'};
export const validTheme=value=>Object.hasOwn(palettes,value)?value:'light';
export const isDarkTheme=value=>['dark','black','midnight','forest'].includes(value);
export const paletteCSS=(attribute='data-theme')=>Object.entries(palettes).map(([theme,p])=>`:root[${attribute}="${theme}"]{color-scheme:${isDarkTheme(theme)?'dark':'light'};${Object.entries(p).map(([key,value])=>`--studio-${key}:${value}`).join(';')}}`).join('\n');
const aliases={bg:'bg',card:'surface',surface:'surface',ink:'ink',muted:'muted',line:'line',accent:'accent',soft:'soft',orange:'orange',warm:'warm',blue:'blue',purple:'purple',green:'green',water:'water'};
// Preserve semantic diagram colours while adapting legacy SVG attributes.
export const diagramThemeCSS=[
 ['fill',['#f8faff'],'plot'],['fill',['#fff','#ffffff'],'surface'],
 ['fill',['#183047','#44516b'],'ink'],['fill',['#4f6576','#8090a8','#61718c','#8390a8','#8a97ab','#98a5bc'],'muted'],
 ['fill',['#e8f5f5','#e8ecf8','#e8eef7'],'soft'],['fill',['#fbebdf'],'warm'],
 ['fill',['#087d86','#4f56e8'],'accent'],['stroke',['#087d86','#4f56e8'],'accent'],
 ['fill',['#3664a0'],'blue'],['stroke',['#3664a0'],'blue'],
 ['fill',['#b9581d'],'orange'],['stroke',['#b9581d'],'orange'],
 ['fill',['#8055a0'],'purple'],['stroke',['#8055a0'],'purple'],
 ['fill',['#d7e2e8','#cfd6e3','#d1d9e8'],'line'],
 ['stroke',['#d7e2e8','#c8d0df','#d9dfeb','#e9edf5','#b5c2d9','#c4cede'],'line']
].map(([property,colors,key])=>colors.map(color=>`svg [${property}="${color}"]{${property}:var(--studio-${key})}`).join('\n')).join('\n');
export const modelThemeCSS=paletteCSS('data-studio-theme')+`
:root[data-studio-theme]{${Object.entries(aliases).map(([key,token])=>`--${key}:var(--studio-${token})`).join(';')}}
:root[data-studio-theme] body{background:var(--studio-bg);color:var(--studio-ink)}
:root[data-studio-theme] :is(.card,.panel,.controls,.reveal,.chart,.measure){background:var(--studio-surface);border-color:var(--studio-line)}
:root[data-studio-theme] :is(.stage,.scene){background:var(--studio-plot)}
:root[data-studio-theme] :is(.toolbar,.formula,.hint){background:var(--studio-soft);border-color:var(--studio-line)}
:root[data-studio-theme] :is(button,select,input:not([type=range]):not([type=checkbox]),textarea){background:var(--studio-surface);color:var(--studio-ink);border-color:var(--studio-line)}
:root[data-studio-theme] button.primary{background:var(--studio-accent);color:var(--studio-onAccent);border-color:var(--studio-accent)}
:root[data-studio-theme] button.primary:hover{background:var(--studio-accentHover)}
:root[data-studio-theme] input{accent-color:var(--studio-accent)}
.custom-speed{display:inline-flex;align-items:center;gap:8px}.custom-speed input{width:85px;padding:8px;border:1px solid var(--studio-line);border-radius:8px;background:var(--studio-surface);color:var(--studio-ink)}
:root[data-studio-theme] option{background:var(--studio-surface);color:var(--studio-ink)}
${diagramThemeCSS}`;
export function withHTMLTheme(html,theme='light',initialControls=[]){
 theme=validTheme(theme);
 html=html.replace(/<!--model-studio-theme-(boot|style):start-->[\s\S]*?<!--model-studio-theme-\1:end-->/g,'');
 const boot=`<!--model-studio-theme-boot:start--><script>(function(){
 const defaults=${JSON.stringify(initialControls).replaceAll('<','\\u003c')};
 const themes=${JSON.stringify(Object.keys(palettes))},darkThemes=['dark','black','midnight','forest'];let theme=${JSON.stringify(theme)};const root=document.documentElement;root.dataset.studioTheme=theme;
 const nativeMedia=window.matchMedia.bind(window),darkMedia=new EventTarget();Object.defineProperty(darkMedia,'matches',{get:()=>darkThemes.includes(theme)});darkMedia.media='(prefers-color-scheme: dark)';darkMedia.addListener=fn=>darkMedia.addEventListener('change',fn);darkMedia.removeListener=fn=>darkMedia.removeEventListener('change',fn);
 window.matchMedia=query=>/^\\(prefers-color-scheme:\\s*dark\\)$/.test(query.trim())?darkMedia:nativeMedia(query);
 window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='model-studio-theme'||!themes.includes(event.data.theme))return;theme=event.data.theme;root.dataset.studioTheme=theme;const change=new Event('change');Object.defineProperty(change,'matches',{value:darkThemes.includes(theme)});darkMedia.dispatchEvent(change);window.dispatchEvent(new Event('model-studio-theme'));});
 const notify=data=>{if(parent!==window)parent.postMessage(data,'*');};
 window.addEventListener('error',event=>notify({type:'model-studio-error',message:String(event.message||'Ошибка в сценарии модели').slice(0,800),line:event.lineno||0}));
 window.addEventListener('unhandledrejection',event=>notify({type:'model-studio-error',message:String(event.reason?.message||event.reason||'Не удалось выполнить сценарий').slice(0,800),line:0}));
 const readControls=()=>Array.from(document.querySelectorAll('input[id][type=range],input[id][type=number],input[id][type=checkbox],select[id]')).filter(el=>/^[-A-Za-z0-9_:]{1,80}$/.test(el.id)).slice(0,64).map(el=>({id:el.id,type:el.tagName==='SELECT'?'select':el.type,value:el.type==='checkbox'?String(el.checked):String(el.value).slice(0,80)}));
 for(const phase of ['input','change'])document.addEventListener(phase,event=>{if(event.isTrusted&&event.target?.matches?.('input[id][type=range],input[id][type=number],input[id][type=checkbox],select[id],input[data-custom-speed]'))notify({type:'model-studio-controls-changed',controls:readControls(),phase});});
 function applyControls(controls){if(!Array.isArray(controls)||controls.length>64)return;for(const saved of controls){const el=document.getElementById(saved.id);if(!el||el.tagName!=='SELECT'&&(!['range','number','checkbox'].includes(el.type)))continue;if(saved.type==='checkbox')el.checked=saved.value==='true';else {if(el.id==='speed'&&el.tagName==='SELECT'&&Number(saved.value)>=.01&&Number(saved.value)<=20&&!Array.from(el.options).some(option=>option.value===saved.value)){const option=document.createElement('option');option.value=saved.value;option.textContent=saved.value.replace('.',',')+'×';option.dataset.customOption='';el.append(option);}el.value=saved.value;}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}
 window.addEventListener('message',event=>{if(event.source!==parent)return;if(event.data?.type==='model-studio-apply-controls'){applyControls(event.data.controls);return;}if(event.data?.type!=='model-studio-capture-controls'||typeof event.data.requestId!=='string')return;notify({type:'model-studio-controls',requestId:event.data.requestId,controls:readControls()});});
 document.addEventListener('DOMContentLoaded',()=>{(${installSpeedInput.toString()})(document);applyControls(defaults);notify({type:'model-studio-theme-ready',baseline:readControls()});});
 })();</script><!--model-studio-theme-boot:end-->`;
 const style=`<!--model-studio-theme-style:start--><style>${modelThemeCSS}</style><!--model-studio-theme-style:end-->`;
 if(/<head[\s>]/i.test(html))return html.replace(/<head\b[^>]*>/i,match=>match+boot).replace(/<\/head\s*>/i,style+'</head>');
 return html.replace(/<html\b[^>]*>/i,match=>match+'<head>'+boot+style+'</head>');
}
