import {esc} from './scene.js';
import {validateControls} from '/lib/authoring.js';
export function editorFeedback(S){const message=S.saveError||S.previewError||S.validationError;return `<div id="editor-feedback" class="editor-feedback ${message?'visible':''}" role="alert">${message?`<span>${esc(message)}</span>${S.saveConflict?'<button class="btn quiet" data-a="save-copy">Сохранить копию</button>':''}`:''}</div>`;}
export function sceneExportSVG(source){
 const host=document.createElement('div');host.className='scene';
 host.style.cssText='position:fixed;left:-10000px;top:0;width:800px;pointer-events:none';
 host.innerHTML=source;document.body.appendChild(host);
 try{
  const svg=host.querySelector('svg');if(!svg)throw new Error('Сцена для экспорта недоступна');
  // Image/canvas does not inherit the page's palette or font. Resolve the
  // same scene CSS before detaching the SVG, keeping all geometry untouched.
  for(const node of [svg,...svg.querySelectorAll('*')]){
   const style=getComputedStyle(node);
   for(const property of ['fill','stroke','stroke-width','color','font-family','font-size','font-weight','font-style','opacity']){
    const value=style.getPropertyValue(property);if(value)node.style.setProperty(property,value);
   }
  }
  return new XMLSerializer().serializeToString(svg);
 }finally{host.remove();}
}
export function requestModelControls(frame){return new Promise((resolve,reject)=>{if(!frame?.contentWindow)return resolve([]);const requestId=crypto.randomUUID();const finish=(error,controls)=>{clearTimeout(timer);window.removeEventListener('message',listener);error?reject(error):resolve(controls);};const listener=event=>{if(event.source!==frame.contentWindow||event.data?.type!=='model-studio-controls'||event.data.requestId!==requestId)return;try{finish(null,validateControls(event.data.controls));}catch(error){finish(error);}};const timer=setTimeout(()=>finish(new Error('Модель пока не отвечает. Дождитесь загрузки и попробуйте ещё раз.')),4000);window.addEventListener('message',listener);frame.contentWindow.postMessage({type:'model-studio-capture-controls',requestId},'*');});}
export const blankHTML=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Моя модель</title><style>body{font:16px/1.6 system-ui;margin:0;padding:24px}main{max-width:850px;margin:auto}.panel{padding:24px;border:1px solid var(--line,#dce3ee);border-radius:16px}input{width:100%;accent-color:var(--accent,#4f56e8)}svg{width:100%;height:auto}h1{font-size:26px}</style></head><body><main><h1>Моя модель</h1><section class="panel"><p>Меняйте ползунок и наблюдайте движение точки. Оформление и расчёт можно изменить во вкладке «Исходный HTML».</p><svg viewBox="0 0 600 260" role="img" aria-label="Точка на оси"><line x1="40" y1="150" x2="560" y2="150" stroke="var(--line,#dce3ee)" stroke-width="3"/><circle id="point" cx="100" cy="150" r="20" fill="var(--accent,#4f56e8)"/></svg><label for="position">Положение: <output id="value">0</output> м</label><input id="position" type="range" min="0" max="10" value="0" step="0.1"></section></main><script>const slider=document.getElementById('position');function draw(){document.getElementById('point').setAttribute('cx',40+Number(slider.value)*52);document.getElementById('value').textContent=slider.value;}slider.addEventListener('input',draw);draw();</script></body></html>`;
