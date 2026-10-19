import {esc} from './scene.js';
import {withHTMLTheme} from '/lib/theme.js';
import {seamlessFrameCSS,withFrameSizing,frameSizeListener} from '/lib/offline-layout.js';

export function htmlLessonExport(model,theme){
 const inner=withHTMLTheme(model.html,theme,model.initialControls);if(!(model.scenarios??[]).length)return inner;
 const data=JSON.stringify({scenarios:model.scenarios??[]}).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 const script=`const lesson=${data},frame=document.querySelector('iframe');document.querySelector('main').addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.scenario!==undefined){const s=lesson.scenarios[Number(b.dataset.scenario)];frame.contentWindow.postMessage({type:'model-studio-apply-controls',controls:s.controls??[]},'*');}});`;
 return withHTMLTheme(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(model.title)}</title><style>body{margin:0;font-family:Segoe UI,Arial;background:#f6f7fb;color:#33415b}main{max-width:1200px;margin:auto;padding:20px}button{font:inherit;padding:10px;border:1px solid #dce3f0;background:white;color:#33415b;border-radius:8px;margin:4px;cursor:pointer}button[aria-pressed=true]{border-color:#4f56e8}${seamlessFrameCSS}p{white-space:pre-wrap}</style></head><body><main><h1>${esc(model.title)}</h1><nav>${(model.scenarios??[]).map((s,i)=>`<button data-scenario="${i}">${esc(s.title)}</button>`).join('')}</nav><p id="scenario-note"></p><iframe sandbox="allow-scripts" scrolling="no" srcdoc="${esc(withFrameSizing(inner))}" title="${esc(model.title)}"></iframe></main><script>${frameSizeListener()}${script}</script></body></html>`,theme);
}
