import {spatialView,zoomSpatialView,defaultSpatialView,normalizeSpatialYaw} from '../lib/spatial.js';
export function installSpatialNavigation(element,options){
 let gesture=null,wheelTimer=null,pending=null,frame=null,wheelStarted=false;
 const getScene=()=>options.getModel().scene;
 const write=view=>{pending=view;if(frame===null)frame=requestAnimationFrame(()=>{frame=null;const next=pending;pending=null;options.onSpatialViewChange?.(next);});};
 const flush=()=>{if(frame!==null){cancelAnimationFrame(frame);frame=null;}if(pending){const next=pending;pending=null;options.onSpatialViewChange?.(next);}};
 const endWheel=()=>{clearTimeout(wheelTimer);wheelTimer=null;flush();if(wheelStarted){wheelStarted=false;options.onGestureEnd?.('view');}};
 element.onpointerdown=e=>{
  if(e.button!==0||gesture)return;endWheel();
  const item=e.target.closest?.('[data-spatial-object]');gesture={id:item?.dataset.spatialObject,x:e.clientX,y:e.clientY,view:spatialView(getScene()),pan:options.getMode?.()==='pan'||e.shiftKey,pointer:e.pointerId,started:false};
  element.setPointerCapture?.(e.pointerId);element.focus?.({preventScroll:true});e.preventDefault();
 };
 element.onpointermove=e=>{
  if(!gesture||gesture.pointer!==e.pointerId)return;const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.started&&Math.hypot(dx,dy)<3)return;
  if(!g.started){options.onGestureStart?.('view');g.started=true;}
  const rect=element.getBoundingClientRect(),factor=Math.max(.001,Math.min(rect.width/800,rect.height/450)),scale=38*g.view.zoom*factor;
  write(g.pan?{...g.view,x:Math.max(-2e4,Math.min(2e4,g.view.x-dx/scale)),y:Math.max(-2e4,Math.min(2e4,g.view.y+dy/scale))}:{...g.view,yaw:normalizeSpatialYaw(g.view.yaw+dx*.45),pitch:Math.max(-90,Math.min(90,g.view.pitch+dy*.4))});
 };
 const finish=(e,cancelled=false)=>{
  if(!gesture||gesture.pointer!==e.pointerId)return;const g=gesture;gesture=null;flush();
  if(element.hasPointerCapture?.(e.pointerId))element.releasePointerCapture?.(e.pointerId);
  if(g.started)options.onGestureEnd?.('view');else if(g.id&&!cancelled)options.onSelect?.('math',g.id);
 };
 element.onpointerup=e=>finish(e);element.onpointercancel=e=>finish(e,true);element.onlostpointercapture=e=>finish(e,true);
 element.onwheel=e=>{
  e.preventDefault();if(gesture)return;if(!wheelStarted){options.onGestureStart?.('view');wheelStarted=true;}
  const scene={...getScene(),view3d:pending??spatialView(getScene())};write(zoomSpatialView(scene,Math.exp(-Math.max(-200,Math.min(200,e.deltaY))*.002)));
  clearTimeout(wheelTimer);wheelTimer=setTimeout(endWheel,250);
 };
 element.onkeydown=e=>{
  if(e.target!==element||gesture||!['0','Home','+','=','-','_','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();endWheel();const scene=getScene(),v=spatialView(scene);let next;
  if(['0','Home'].includes(e.key))next=defaultSpatialView();
  else if(['+','=','-','_'].includes(e.key))next=zoomSpatialView(scene,['+','='].includes(e.key)?1.25:.8);
  else next={...v,yaw:normalizeSpatialYaw(v.yaw+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0)),pitch:Math.max(-90,Math.min(90,v.pitch+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)))};
  options.onGestureStart?.('view');options.onSpatialViewChange?.(next);options.onGestureEnd?.('view');
 };
 return ()=>{endWheel();if(gesture?.started)options.onGestureEnd?.('view');gesture=null;for(const key of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture','onwheel','onkeydown'])element[key]=null;};
}
