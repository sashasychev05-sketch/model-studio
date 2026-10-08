import * as teachingFunctions from '../lib/teaching.js';
import * as measurementFunctions from '../lib/measurements.js';
import {auditModel} from '../lib/audit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {palettes,validTheme,withHTMLTheme,modelThemeCSS} from '../lib/theme.js';
const source='<!doctype html><html><head><style>:root{--ink:red}</style></head><body><canvas></canvas><script>window.original=42</script></body></html>';

test('PNG scene snapshot resolves the current palette and font without changing geometry',async()=>{
 const source=(await fs.readFile(new URL('../web/editor-tools.js',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+/g,'');
 const nodes=Array.from({length:3},()=>({style:{values:{},setProperty(k,v){this.values[k]=v;}}}));
 const svg=nodes[0];svg.querySelectorAll=()=>nodes.slice(1);
 let mounted=false,removed=false;
 const host={style:{},querySelector:()=>svg,remove:()=>{removed=true;mounted=false;}};
 const rt={document:{createElement:()=>host,body:{appendChild:()=>{mounted=true;}}},getComputedStyle:()=>({getPropertyValue:k=>({'fill':'rgb(24, 37, 57)','font-family':'Studio, "Segoe UI", Arial, sans-serif','stroke':'rgb(175, 190, 210)'}[k]??'')}),XMLSerializer:class{serializeToString(node){assert.equal(mounted,true);assert.equal(node,svg);return '<svg viewBox="0 0 800 450"/>';}}};
 vm.createContext(rt);vm.runInContext(source+'\nglobalThis.exportScene=sceneExportSVG;',rt);
 assert.equal(rt.exportScene('<svg viewBox="0 0 800 450"/>'),'<svg viewBox="0 0 800 450"/>');
 assert.equal(host.innerHTML,'<svg viewBox="0 0 800 450"/>');assert.equal(removed,true);
 for(const n of nodes){assert.equal(n.style.values.fill,'rgb(24, 37, 57)');assert.match(n.style.values['font-family'],/Segoe UI/);assert.equal(n.style.values.stroke,'rgb(175, 190, 210)');}
 host.querySelector=()=>null;assert.throws(()=>rt.exportScene(''),/Сцена/);assert.equal(mounted,false);
});

test('HTML-параметры: восстановление, чтение, изменения и граница сообщений',()=>{
 const handlers={},docHandlers={},messages=[],events=[];
 const control={id:'angle',tagName:'INPUT',type:'range',value:'70',matches:()=>true,dispatchEvent:event=>events.push(event.type)};
 const parent={postMessage:message=>messages.push(message)},window={matchMedia:query=>({media:query,matches:false}),addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),dispatchEvent:()=>{}};
 const document={documentElement:{dataset:{}},getElementById:id=>id==='angle'?control:null,querySelectorAll:()=>[control],addEventListener:(name,fn)=>(docHandlers[name]??=[]).push(fn)};
 const controls=[{id:'angle',type:'range',value:'35'}];
 const js=withHTMLTheme(source,'light',controls).match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInNewContext(js,{window,parent,document,Event,EventTarget});
 const dispatch=event=>handlers.message.forEach(fn=>fn(event));
 docHandlers.DOMContentLoaded.forEach(fn=>fn());assert.equal(control.value,'35');assert.deepEqual(events,['input','change']);assert.equal(messages.at(-1).baseline[0].value,'35');
 const request={type:'model-studio-capture-controls',requestId:'test'};dispatch({source:{},data:request});assert.equal(messages.length,1);
 dispatch({source:parent,data:request});assert.equal(messages.at(-1).requestId,'test');assert.equal(messages.at(-1).controls[0].value,'35');
 control.value='50';docHandlers.input.forEach(fn=>fn({isTrusted:true,target:control}));assert.equal(messages.at(-1).type,'model-studio-controls-changed');assert.equal(messages.at(-1).controls[0].value,'50');
 const count=messages.length;docHandlers.input.forEach(fn=>fn({isTrusted:false,target:control}));assert.equal(messages.length,count);
 dispatch({source:parent,data:{type:'model-studio-apply-controls',controls}});assert.equal(control.value,'35');
 const escaped=withHTMLTheme(source,'light',[{id:'choice',type:'select',value:'</script><script>alert(1)</script>'}]);assert.ok(!escaped.includes('<script>alert(1)</script>'));new vm.Script(escaped.match(/<script>([\s\S]*?)<\/script>/)[1]);
});
test('Общая палитра: обе темы, повторный экспорт и исходные вычисления',()=>{assert.deepEqual(Object.keys(palettes.light),Object.keys(palettes.dark));assert.equal(validTheme('invalid'),'light');const themed=withHTMLTheme(source,'dark');assert.ok(themed.includes('<script>window.original=42</script>'));assert.ok(themed.indexOf('model-studio-theme-boot')<themed.indexOf('--ink:red'));assert.ok(themed.indexOf('--ink:red')<themed.indexOf(modelThemeCSS));const twice=withHTMLTheme(themed,'light');assert.equal((twice.match(/theme-boot:start/g)||[]).length,1);assert.equal((twice.match(/theme-style:start/g)||[]).length,1);assert.ok(twice.includes('let theme="light"'));for(const m of twice.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);});
test('Тема HTML-модели: доверенный родитель, перерисовка canvas и независимость от темы системы',()=>{const handlers={},documentHandlers={},dataset={},parent={postMessage:()=>{}};const win={matchMedia:q=>({media:q,matches:true}),addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),dispatchEvent:()=>{}};const runtime={window:win,parent,document:{documentElement:{dataset},addEventListener:(name,fn)=>documentHandlers[name]=fn},EventTarget,Event};const boot=withHTMLTheme(source,'light').match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInNewContext(boot,runtime);const dispatchMessage=event=>handlers.message.forEach(handler=>handler(event));const media=win.matchMedia('(prefers-color-scheme: dark)');assert.equal(media.matches,false);let paints=0;media.addEventListener('change',()=>paints++);dispatchMessage({source:{},data:{type:'model-studio-theme',theme:'dark'}});assert.equal(dataset.studioTheme,'light');dispatchMessage({source:parent,data:{type:'model-studio-theme',theme:'invalid'}});assert.equal(paints,0);dispatchMessage({source:parent,data:{type:'model-studio-theme',theme:'dark'}});assert.equal(dataset.studioTheme,'dark');assert.equal(media.matches,true);assert.equal(paints,1);assert.equal(win.matchMedia('(min-width: 800px)').matches,true);dispatchMessage({source:parent,data:{type:'model-studio-theme',theme:'light'}});assert.equal(media.matches,false);assert.equal(paints,2);});
test('Переключатель приложения: память темы и передача в модель без перезапуска',async()=>{const data=new Map(),messages=[],handlers={},select={value:''},frame={contentWindow:{postMessage:value=>messages.push(value)}};const root={dataset:{}};const runtime={validTheme,localStorage:{getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)},matchMedia:()=>({matches:true}),document:{documentElement:root,querySelector:()=>frame,querySelectorAll:()=>[select],addEventListener:(name,fn)=>handlers[name]=fn},window:{addEventListener:()=>{}}};const js=(await fs.readFile(new URL('../web/theme.js',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:function|const)\b)/g,'')+'\nglobalThis.apply=setAppTheme;globalThis.picker=themePicker;';vm.runInNewContext(js,runtime);assert.equal(root.dataset.theme,'dark');runtime.apply('light');assert.equal(root.dataset.theme,'light');assert.equal(data.get('model-studio-theme'),'light');assert.equal(select.value,'light');assert.equal(messages.at(-1).theme,'light');assert.ok(runtime.picker().includes('value="light" selected'));assert.ok(runtime.picker().includes('Тёмная'));});
