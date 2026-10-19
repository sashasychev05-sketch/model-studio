import {esc} from './scene.js';
import {newBody,validateModel} from '/lib/model.js';
import {initialState,validatePhysics} from '/lib/engine.js';

export function constructedPointDialog(S,h,type){
 const m=S.draft,needed=type==='midpoint'?2:4;
 if(m.bodies.filter(b=>b.motion==='fixed').length<needed)throw new Error(`Сначала добавьте ${needed===2?'две':'четыре'} неподвижные точки`);
 const points=m.bodies.filter(b=>b.motion==='fixed'),pick=(key,label,index)=>`<label class="field"><span>${label}</span><select name="${key}" aria-label="${label}">${points.map((b,i)=>`<option value="${esc(b.id)}" ${i===index?'selected':''}>${esc(b.name)} · ${esc(b.id)}</option>`).join('')}</select></label>`;
 h.dialog(type==='midpoint'?'Середина отрезка':'Пересечение прямых',pick('a',type==='midpoint'?'Первая точка':'Первая прямая · точка A',0)+pick('b',type==='midpoint'?'Вторая точка':'Первая прямая · точка B',1)+(type==='intersection'?pick('c','Вторая прямая · точка C',2)+pick('d','Вторая прямая · точка D',3):'')+'<p class="hint">Новая точка вычисляется по исходным точкам и не перетаскивается отдельно. Для пересечения используются бесконечные прямые; при параллельных или совпадающих прямых единственного пересечения нет.</p>','Построить точку',async data=>{
  const next=structuredClone(S.draft);if(next.bodies.length>=60||(next.geometry??[]).length>=40)throw new Error('Достигнут предел: 60 объектов или 40 геометрических зависимостей');
  const id=h.unique('P',next.bodies),point={...newBody(id,'point'),name:id,motion:'fixed',trail:false},g={id:'construction_'+crypto.randomUUID().replaceAll('-',''),type,target:id,a:data.get('a'),b:data.get('b'),...(type==='intersection'?{c:data.get('c'),d:data.get('d')}:{})};next.bodies.push(point);next.geometry??=[];next.geometry.push(g);validatePhysics(validateModel(next));const position=initialState(next).bodies[id];point.x=position.x;point.y=position.y;
  h.pushUndo();S.draft=next;S.selection=id;S.tab='object';h.changed();h.render();
 });
}
