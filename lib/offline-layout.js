// Keep authored HTML sandboxed while making it part of one scrolling document.
export const seamlessFrameCSS='iframe{display:block;width:100%;height:240px;border:0;border-radius:0;background:transparent}';
function reportFrameSize(){
 let pending=false,lastHeight=0;
 const measure=()=>{pending=false;const body=document.body;if(!body)return;
  const rect=body.getBoundingClientRect(),margin=parseFloat(getComputedStyle(body).marginBottom)||0;
  const height=Math.ceil(Math.max(document.documentElement.offsetHeight,Math.max(rect.height,body.scrollHeight,body.offsetHeight)+Math.max(0,rect.top)+margin));
  if(height>0&&height<=100000&&height!==lastHeight){lastHeight=height;parent.postMessage({type:'model-studio-frame-size',height},'*');}
 };
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(measure);}};
 const start=()=>{if(parent===window)return;new ResizeObserver(schedule).observe(document.body);schedule();document.fonts?.ready.then(schedule);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('resize',schedule);window.addEventListener('load',schedule);
}
function receiveFrameSize(){
 const frame=document.querySelector('iframe');
 window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.data?.type!=='model-studio-frame-size')return;
  const height=event.data.height;
  if(typeof height!=='number'||!Number.isFinite(height)||height<=0||height>100000)return;
  frame.style.height=Math.ceil(height)+'px';
 });
}
export const frameSizeListener=()=> '('+receiveFrameSize.toString()+')();';
export function withFrameSizing(html){
 const payload='<style data-model-studio-layout>html,body{height:auto!important;min-height:0!important;overflow:visible!important}</style><script>('+reportFrameSize.toString()+')();</script>';
 if(/<\/head\s*>/i.test(html))return html.replace(/<\/head\s*>/i,payload+'</head>');
 return html.replace(/<body\b[^>]*>/i,match=>match+payload);
}
