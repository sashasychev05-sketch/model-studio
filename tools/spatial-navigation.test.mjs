import test from 'node:test';
import assert from 'node:assert/strict';
import {installSpatialNavigation} from '../web/spatial-navigation.js';
import {defaultSpatialView} from '../lib/spatial.js';

function harness(t){
 const original={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame},frames=new Map();let frameId=0,open=0,selected=0;
 globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const m={scene:{dimension:3,view3d:defaultSpatialView()}},element={getBoundingClientRect:()=>({width:800,height:450}),focus:()=>{}},stop=installSpatialNavigation(element,{getModel:()=>m,onSpatialViewChange:v=>m.scene.view3d=v,onGestureStart:()=>open++,onGestureEnd:()=>open--,onSelect:()=>selected++});
 t.after(()=>{stop();for(const [key,value]of Object.entries(original))if(value===undefined)delete globalThis[key];else globalThis[key]=value;});
 const event=extra=>({button:0,pointerId:1,clientX:0,clientY:0,target:element,preventDefault:()=>{},...extra});
 return {m,element,frames,event,open:()=>open,selected:()=>selected};
}
test('Wheel followed by a keyboard turn or reset keeps both actions in order and closes Undo gestures',t=>{
 const h=harness(t),{element:eventTarget,event,m}=h;eventTarget.onwheel(event({deltaY:-100}));assert.equal(m.scene.view3d.zoom,1);eventTarget.onkeydown(event({key:'ArrowRight'}));assert.ok(Math.abs(m.scene.view3d.zoom-Math.exp(.2))<1e-12);assert.equal(m.scene.view3d.yaw,55);assert.equal(h.frames.size,0);assert.equal(h.open(),0);
 eventTarget.onwheel(event({deltaY:-100}));eventTarget.onkeydown(event({key:'Home'}));assert.deepEqual(m.scene.view3d,defaultSpatialView());assert.equal(h.frames.size,0);assert.equal(h.open(),0);
});
test('Long rotations remain bounded and cancelling a pointer never selects the object',t=>{
 const h=harness(t),{m,element,event}=h;m.scene.view3d.yaw=35999;element.onkeydown(event({key:'ArrowRight'}));assert.equal(m.scene.view3d.yaw,9);
 const target={closest:()=>({dataset:{spatialObject:'space1'}})};element.onpointerdown(event({target}));element.onpointercancel(event({target}));assert.equal(h.selected(),0);
 m.scene.view3d.yaw=-35999;element.onpointerdown(event({target}));element.onpointermove(event({clientX:-800}));element.onlostpointercapture(event());assert.ok(m.scene.view3d.yaw>=-180&&m.scene.view3d.yaw<180);assert.equal(h.open(),0);assert.equal(h.selected(),0);
 element.onpointerdown(event({target}));element.onpointerup(event({target}));assert.equal(h.selected(),1);
});
