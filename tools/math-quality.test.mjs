import test from 'node:test';
import assert from 'node:assert/strict';
import {mathTemplate} from '../lib/math-templates.js';
import {newBody} from '../lib/model.js';
import {initialState} from '../lib/engine.js';
import {measure} from '../lib/measurements.js';
import {mathObjectGeometry} from '../lib/math-objects.js';

test('Mathematical rulers use coordinate units; physics rulers retain metres',()=>{
 const m=mathTemplate('geometry'),ruler={type:'distance',a:'A',b:'B'};
 assert.equal(measure(m,initialState(m),ruler).unit,'ед.');
 m.subject='physics';assert.equal(measure(m,initialState(m),ruler).unit,'м');
});
test('A crossed polygon reports an undefined area instead of a misleading zero',()=>{
 const m=mathTemplate();m.bodies=[['A',0,0],['B',2,2],['C',0,2],['D',2,0]].map(([id,x,y])=>({...newBody(id,'point'),x,y}));
 const item={type:'polygon',points:['A','B','C','D']};let g=mathObjectGeometry(item,initialState(m));
 assert.equal(g.area,null);assert.equal(g.selfIntersecting,true);assert.ok(g.perimeter>0);
 item.points=['A','D','B','C'];g=mathObjectGeometry(item,initialState(m));assert.equal(g.area,4);assert.equal(g.selfIntersecting,false);
});
