const key='model-studio-panel-layout';
export const panelLimits={catalog:[180,420,242],objects:[170,380,215],properties:[240,520,310]};
export function normalizePanels(value={}){
 const result={};
 for(const [id,[min,max,initial]] of Object.entries(panelLimits)){
  const candidate=Number(value[id]?.width);
  result[id]={width:Number.isFinite(candidate)?Math.max(min,Math.min(max,candidate)):initial,hidden:value[id]?.hidden===true};
 }
 return result;
}
function load(){try{return normalizePanels(JSON.parse(localStorage.getItem(key)||'{}'));}catch{return normalizePanels();}}
const layout=load();
export const getPanelLayout=()=>structuredClone(layout);
export function setPanelLayout(value,doc=document){Object.assign(layout,normalizePanels(value));try{localStorage.setItem(key,JSON.stringify(layout));}catch{}initPanels(doc);}
export const panelToggle=(id,label,icon='☰')=>`<button class="icon-btn panel-toggle" type="button" data-panel-toggle="${id}" aria-label="${label}" title="${label}" aria-expanded="${!layout[id].hidden}">${icon}</button>`;
export const panelHandle=(id,label)=>`<div class="panel-resizer ${id==='properties'?'right-edge':'left-edge'}" role="separator" aria-orientation="vertical" aria-label="${label}" tabindex="0" data-panel-resize="${id}" aria-valuemin="${panelLimits[id][0]}" aria-valuemax="${panelLimits[id][1]}" aria-valuenow="${layout[id].width}" title="Перетащите границу. Двойной щелчок — исходная ширина; стрелки — изменить ширину."></div>`;
export function initPanels(doc){
 if(!doc.documentElement?.style||!doc.querySelectorAll)return;
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(layout));}catch{}};
 const apply=()=>{
  for(const [id,prefs] of Object.entries(layout)){
   doc.documentElement.style.setProperty('--'+id+'-width',prefs.width+'px');
   doc.querySelectorAll('[data-panel-shell]').forEach(shell=>shell.classList.toggle(id+'-hidden',prefs.hidden));
   doc.querySelectorAll('[data-panel-toggle="'+id+'"]').forEach(button=>button.setAttribute('aria-expanded',String(!prefs.hidden)));
   doc.querySelectorAll('[data-panel-resize="'+id+'"]').forEach(handle=>handle.setAttribute('aria-valuenow',String(prefs.width)));
  }
 };
 doc.querySelectorAll('[data-panel-toggle]').forEach(button=>button.onclick=event=>{event.stopPropagation();const id=button.dataset.panelToggle;layout[id].hidden=!layout[id].hidden;apply();persist();});
 doc.querySelectorAll('[data-panel-resize]').forEach(handle=>{
  const id=handle.dataset.panelResize,[min,max,initial]=panelLimits[id],direction=id==='properties'?-1:1;
  const resize=width=>{layout[id].width=Math.max(min,Math.min(max,width));apply();};
  handle.onpointerdown=event=>{
   if(event.button!==0)return;
   event.preventDefault();const startX=event.clientX,startWidth=layout[id].width;handle.setPointerCapture(event.pointerId);doc.documentElement.classList.add('panel-dragging');
   handle.onpointermove=move=>resize(startWidth+direction*(move.clientX-startX));
   const finish=()=>{handle.onpointermove=null;doc.documentElement.classList.remove('panel-dragging');persist();};
   handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=finish;
  };
  handle.ondblclick=()=>{resize(initial);persist();};
  handle.onkeydown=event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();resize(event.key==='Home'?min:event.key==='End'?max:layout[id].width+direction*(event.key==='ArrowRight'?16:-16));persist();
  };
 });
 apply();
}
