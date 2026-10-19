import test from 'node:test';
import assert from 'node:assert/strict';
import {mathTemplate,addMathObject} from '../lib/math-templates.js';
import {newBody,validateModel} from '../lib/model.js';
import {initialState,context,validatePhysics} from '../lib/engine.js';
import {lineIntersection,clipInfiniteLine} from '../lib/construction.js';
import {mathObjectGeometry} from '../lib/math-objects.js';
import {mathObjectsSVG} from '../web/math-drawing.js';
import {sceneTransform} from '../lib/camera.js';
import {renameReferences,removeBody} from '../lib/authoring.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function construction(){const m=mathTemplate();m.bodies=[['A',-2,-1],['B',2,1],['C',-2,1],['D',2,-1],['M',0,0],['I',0,0],['N',0,0]].map(([id,x,y])=>({...newBody(id,'point'),name:id,x,y}));m.geometry=[{id:'nested',type:'midpoint',target:'N',a:'M',b:'I'},{id:'cross',type:'intersection',target:'I',a:'A',b:'B',c:'C',d:'D'},{id:'middle',type:'midpoint',target:'M',a:'A',b:'B'}];return m;}
test('Midpoints and intersections resolve in dependency order, follow edits and leave camera and reference points unchanged',()=>{
 const m=construction(),original=structuredClone(m);let s=initialState(validatePhysics(validateModel(m)));near(s.bodies.M.x,0);near(s.bodies.I.x,0);near(s.bodies.I.y,0);assert.deepEqual(m,original);
 m.bodies[1].x=4;s=initialState(m);near(s.bodies.M.x,1);near(s.bodies.M.y,0);near(s.bodies.I.x,.4);near(s.bodies.I.y,-.2);near(s.bodies.N.x,.7);near(s.bodies.N.y,-.1);assert.deepEqual(m.scene,original.scene);
});
test('Line intersections reject parallel, coincident, degenerate and ill-conditioned cases and remain stable after translation',()=>{
 near(lineIntersection({x:0,y:0},{x:0,y:2},{x:-1,y:1},{x:3,y:1}).y,1);
 for(const [a,b,c,d]of [[{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}],[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}],[{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1+1e-12}]])assert.throws(()=>lineIntersection(a,b,c,d),/параллельны/);
 assert.throws(()=>lineIntersection({x:0,y:0},{x:0,y:0},{x:0,y:1},{x:1,y:0}),/несовпадающие/);
 const p=lineIntersection({x:1e6,y:1e6},{x:1e6+2,y:1e6+2},{x:1e6,y:1e6+2},{x:1e6+2,y:1e6});near(p.x,1e6+1);near(p.y,1e6+1);
});
test('New construction validation covers c/d cycles, moving inputs and out-of-range intersections',()=>{
 const m=construction();m.geometry[1].d='N';assert.throws(()=>validateModel(m),/Цикл/);m.geometry[1].d='D';m.bodies[0].motion='force';assert.throws(()=>validateModel(m),/неподвижных/);m.bodies[0].motion='fixed';m.geometry[1].d='missing';assert.throws(()=>validateModel(m),/неподвижных/);
 assert.throws(()=>lineIntersection({x:0,y:0},{x:1,y:0},{x:0,y:100},{x:1,y:100+1e-7}),/диапазон/);
});
test('Renaming preserves all four intersection references and angle formulas; removal cascades only through dependent points',()=>{
 const m=construction();const arc=addMathObject(m,'arc','arc',()=>{});arc.startAngle='A_x';renameReferences(m,'A','origin',true);m.bodies[0].id='origin';renameReferences(m,'D','last',true);m.bodies[3].id='last';assert.equal(m.geometry[1].a,'origin');assert.equal(m.geometry[1].d,'last');assert.equal(arc.startAngle,'origin_x');validatePhysics(validateModel(m));removeBody(m,'last');assert.deepEqual(m.bodies.map(b=>b.id),['origin','B','C','M']);assert.ok(!m.geometry.some(g=>g.target==='I'||g.target==='N'));validatePhysics(validateModel(m));
});
test('Arcs use signed angles in degrees and exact lengths; full circles split into valid SVG arcs',()=>{
 const m=mathTemplate('geometry'),arc=addMathObject(m,'arc','arc',()=>{});arc.radius='2';arc.startAngle='45';arc.sweepAngle='-90';arc.fill=true;let state=initialState(m),values=context(m,state),g=mathObjectGeometry(arc,state,values);near(g.length,Math.PI);near(g.area,Math.PI);assert.equal(g.sweepAngle,-90);
 const render=()=>mathObjectsSVG(m,state,values,sceneTransform(m.scene),null,false,String,String);let svg=render();assert.match(svg,/α = -90°/);assert.match(svg,/; S =/);assert.match(svg,/ 0 0 1 /);arc.sweepAngle='360';svg=render();const path=svg.match(/data-math-object="arc"[^>]*><path d="([^"]+)"/)[1];assert.equal((path.match(/A/g)??[]).length,2);assert.ok(!/NaN|Infinity/.test(path));
 for(const angle of ['0','361','-361']){arc.sweepAngle=angle;assert.throws(()=>validatePhysics(validateModel(m)),/угол дуги/);}arc.sweepAngle='90';arc.startAngle='window.alert(1)';assert.throws(()=>validateModel(m),/Дуга/);
});
test('Infinite lines clip to the same fixed world frame for horizontal, vertical and diagonal directions',()=>{
 const bounds={minX:-3,maxX:3,minY:-2,maxY:2};assert.deepEqual(clipInfiniteLine({x:0,y:1},{x:1,y:1},bounds),[{x:-3,y:1},{x:3,y:1}]);assert.deepEqual(clipInfiniteLine({x:1,y:0},{x:1,y:1},bounds),[{x:1,y:-2},{x:1,y:2}]);assert.equal(clipInfiniteLine({x:0,y:3},{x:1,y:3},bounds),null);const points=clipInfiniteLine({x:0,y:0},{x:1,y:1},bounds);near(points[0].x,-2);near(points[1].y,2);
 const m=mathTemplate('geometry');addMathObject(m,'line','line',()=>{});const s=initialState(m),svg=mathObjectsSVG(m,s,context(m,s),sceneTransform(m.scene),null,false,String,String);assert.match(svg,/data-math-object="line"/);assert.doesNotMatch(svg,/NaN|undefined/);
});
