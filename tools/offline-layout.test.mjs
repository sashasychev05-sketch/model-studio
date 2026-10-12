import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {frameSizeListener,withFrameSizing} from '../lib/offline-layout.js';
test('Offline frame sizing accepts only bounded dimensions from the exact lesson frame',()=>{
 const frame={contentWindow:{},style:{}},listeners={},runtime={document:{querySelector:()=>frame},window:{addEventListener:(name,handler)=>listeners[name]=handler}};
 vm.runInNewContext(frameSizeListener(),runtime);
 const send=(height,source=frame.contentWindow)=>listeners.message({source,data:{type:'model-studio-frame-size',height}});
 for(const height of [null,'900',-1,0,Infinity,NaN,100001])send(height);
 send(900,{});assert.equal(frame.style.height,undefined);
 send(726.2);assert.equal(frame.style.height,'727px');send(320);assert.equal(frame.style.height,'320px');
});
test('Sizing instrumentation preserves author scripts without reading parent DOM',()=>{
 const original='<html><head><title>Опыт</title></head><body><script>window.answer=42;</script></body></html>';
 const sized=withFrameSizing(original);
 assert.ok(sized.includes('<script>window.answer=42;</script>'));assert.ok(sized.includes('new ResizeObserver'));
 assert.ok(!sized.includes('parent.document'));assert.ok(!sized.includes('allow-same-origin'));
 assert.ok(withFrameSizing('<html><body>Без head</body></html>').includes('data-model-studio-layout'));
});
