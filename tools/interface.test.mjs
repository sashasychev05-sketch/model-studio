import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {palettes,themeNames,withHTMLTheme} from '../lib/theme.js';
import {normalizePanels,initPanels} from '../web/panels.js';
import {chartLegend,initAnalysis} from '../web/data/analysis.js';
import {emptyModel} from '../lib/model.js';
import {refreshHTMLChrome} from '../web/html-chrome.js';
import {installSpeedInput} from '../lib/playback.js';

test('Manual playback supports decimals, rejects invalid speeds and shares the preset control',()=>{
 const handlers={},options=[{value:'.25'},{value:'.5'},{value:'1'},{value:'2'}],created=[];
 const select={tagName:'SELECT',value:'1',options,parentElement:{querySelector:()=>null},after(){},querySelector:()=>options.find(o=>Object.hasOwn(o.dataset??{},'customOption')),append:o=>{if(!options.includes(o))options.push(o);},addEventListener:(k,fn)=>handlers[k]=fn,dispatchEvent:e=>handlers[e.type]?.(e)};
 const doc={getElementById:()=>select,createElement:tag=>{const listeners={},node={tag,dataset:{},setAttribute(){},append(){},setCustomValidity:v=>node.validity=v,reportValidity(){},addEventListener:(k,fn)=>listeners[k]=fn,dispatchEvent:e=>listeners[e.type]?.(e),listeners};created.push(node);return node;}};
 installSpeedInput(doc);const input=created.find(n=>n.tag==='input');assert.equal(input.value,'1');
 input.value='1.5';input.listeners.keydown({key:'Enter',preventDefault(){}});assert.equal(select.value,'1.5');assert.equal(options.at(-1).textContent,'1,5×');
 for(const value of ['0','-2','Infinity','','21']){input.value=value;input.listeners.change();assert.equal(select.value,'1.5');assert.ok(input.validity);}
 input.value='.01';input.listeners.input();input.listeners.change();assert.equal(select.value,'0.01');assert.equal(input.validity,'');
 select.value='.5';handlers.change();assert.equal(input.value,'.5');assert.equal(options.filter(o=>o.dataset?.customOption==='').length,1);
});

test('HTML presentation/editor transitions restore side controls without replacing the experiment',()=>{
 const frame={value:75},children=new Map([['#html-frame',frame]]);
 const element=key=>({key,replaceWith(next){children.set(key,next);},remove(){children.delete(key);}});
 for(const key of ['#teaching-kit','.editor-header'])children.set(key,element(key));
 const shell={classList:{toggle(){}},querySelector:key=>children.get(key)??null};
 children.set('.html-workspace',{prepend(next){children.set('.html-tabs',next);}});
 children.set('.html-main',{append(next){children.set('.inspector',next);}});
 const fresh=present=>({querySelector:key=>key==='.html-editor'?{classList:{contains:()=>present}}:present&&['.html-tabs','.inspector'].includes(key)?null:element(key)});
 refreshHTMLChrome(shell,fresh(false));assert.ok(children.has('.inspector'));assert.ok(children.has('.html-tabs'));assert.equal(children.get('#html-frame'),frame);
 refreshHTMLChrome(shell,fresh(true));assert.equal(children.has('.inspector'),false);assert.equal(children.has('.html-tabs'),false);
 refreshHTMLChrome(shell,fresh(false));assert.ok(children.has('.inspector'));assert.ok(children.has('.html-tabs'));assert.equal(children.get('#html-frame').value,75);
});

const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('All six themes keep readable text, accent labels and trusted iframe switching',()=>{
 assert.equal(Object.keys(palettes).length,6);assert.equal(palettes.black.bg,'#000000');
 for(const [theme,p] of Object.entries(palettes)){
  assert.ok(themeNames[theme]);
  for(const bg of [p.bg,p.surface,p.soft])for(const ink of [p.ink,p.muted])assert.ok(contrast(bg,ink)>=4.5,`${theme} ${bg}/${ink}`);
  assert.ok(contrast(p.accent,p.onAccent)>=4.5,theme+' accent');
  const handlers={},root={dataset:{}},parent={},win={matchMedia:()=>({matches:false}),addEventListener:(key,fn)=>(handlers[key]??=[]).push(fn),dispatchEvent:()=>{}};
  const html=withHTMLTheme('<html><head></head><body></body></html>',theme);
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{window:win,parent,document:{documentElement:root,addEventListener:()=>{}},Event,EventTarget});
  assert.equal(root.dataset.studioTheme,theme);
  handlers.message.forEach(fn=>fn({source:{},data:{type:'model-studio-theme',theme:'black'}}));assert.equal(root.dataset.studioTheme,theme);
  handlers.message.forEach(fn=>fn({source:parent,data:{type:'model-studio-theme',theme:'forest'}}));assert.equal(root.dataset.studioTheme,'forest');assert.equal(win.matchMedia('(prefers-color-scheme: dark)').matches,true);
 }
});
test('Panel widths are bounded; pointer/keyboard changes and collapse persist independently',()=>{
 assert.equal(normalizePanels({catalog:{width:999}}).catalog.width,420);
 assert.equal(normalizePanels({objects:{width:-10}}).objects.width,170);
 assert.equal(normalizePanels({properties:{width:'bad'}}).properties.width,310);
 const attributes={},styles={},classes=new Set(),saved=[];
 const handle={dataset:{panelResize:'properties'},setAttribute:(k,v)=>attributes[k]=v,setPointerCapture:()=>{}},button={dataset:{panelToggle:'properties'},setAttribute:()=>{}},shell={classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)}};
 const prior=globalThis.localStorage;globalThis.localStorage={setItem:(k,v)=>saved.push(JSON.parse(v))};
 try{
  initPanels({documentElement:{style:{setProperty:(k,v)=>styles[k]=v},classList:{add:()=>{},remove:()=>{}}},querySelectorAll:s=>s==='[data-panel-toggle]'?[button]:s==='[data-panel-resize]'?[handle]:s==='[data-panel-shell]'?[shell]:s.includes('properties')?[s.includes('resize')?handle:button]:[]});
  handle.onpointerdown({button:0,clientX:900,pointerId:1,preventDefault:()=>{}});handle.onpointermove({clientX:850});handle.onpointerup();assert.equal(attributes['aria-valuenow'],'360');
  handle.onkeydown({key:'ArrowRight',preventDefault:()=>{}});assert.equal(attributes['aria-valuenow'],'344');
  button.onclick({stopPropagation:()=>{}});assert.ok(classes.has('properties-hidden'));assert.equal(saved.at(-1).properties.hidden,true);assert.equal(saved.at(-1).catalog.hidden,false);
  handle.ondblclick();assert.equal(styles['--properties-width'],'310px');button.onclick({stopPropagation:()=>{}});
 }finally{globalThis.localStorage=prior;}
});
test('Legends describe visible marks and distinguish data, regression and the current model',()=>{
 const r={regression:{m:2},comparison:{}};
 const legend=chartLegend(r,{chart:'scatter',expression:'body_x'});
 assert.match(legend,/Данные из таблицы/);assert.match(legend,/Прямая регрессии/);assert.match(legend,/Расчёт текущей модели: body_x/);
 const histogram=chartLegend(r,{chart:'histogram'});assert.match(histogram,/Число наблюдений/);assert.doesNotMatch(histogram,/регрессии|модели/);
 assert.doesNotMatch(chartLegend({...r,regression:{}},{chart:'scatter',expression:'<script>'}),/<script>/);
});
test('Standalone data workspace is separate from scene measurements and keeps its session',()=>{
 const S={analysisStandalone:true,tab:'data',draft:emptyModel(),record:null};
 const api=initAnalysis(S,{document:{querySelector:()=>null}});
 const standalone=api.panel();assert.match(standalone,/Анализ таблицы/);assert.match(standalone,/Среднее и выброс/);assert.doesNotMatch(standalone,/Записать расчёт в таблицу|Вернуться к сцене/);
 api.remember();api.reset();assert.match(api.panel(),/Анализ таблицы/);
 S.analysisStandalone=false;api.reset();const orbit=api.panel();assert.match(orbit,/Записать расчёт в таблицу/);assert.doesNotMatch(orbit,/Среднее и выброс|Корреляция и совпадение/);
});
