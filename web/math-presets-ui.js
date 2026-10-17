import {mathPresets,mathPresetById} from '/lib/math-preset-catalog.js';
import {addMathPreset} from '/lib/math-presets.js';
import {validateModel} from '/lib/model.js';
import {validatePhysics} from '/lib/engine.js';
import {esc} from './scene.js';

export function presetOptions(group){return mathPresets.filter(p=>!group||p.group===group).map(p=>`<option value="${p.id}">${esc(p.label)}</option>`).join('');}
export function presetParameterFields(m,item,field){
 const preset=item.preset,def=mathPresetById(preset?.kind);if(!def)return '';
 const origin=m.bodies.findIndex(b=>b.id===preset.origin);
 return `<p class="hint">${esc(def.description)} Настройте числа или двигайте ползунки под сценой.</p>`+def.fields.map(f=>{const i=m.parameters.findIndex(p=>p.id===preset.parameters[f.key]);return i<0?'':field(f.label+(f.unit?' ('+f.unit+')':''),'parameters.'+i+'.value',m.parameters[i].value,'number',`min="${m.parameters[i].min}" max="${m.parameters[i].max}"`);}).join('')+(def.id==='regular-polygon'?`<p class="hint">Сторон: ${preset.sides}. Другой многоугольник можно добавить из шаблона.</p>`:'')+(origin>=0?'<div class="field-row">'+field('Положение по x','bodies.'+origin+'.x',m.bodies[origin].x,'number')+field('Положение по y','bodies.'+origin+'.y',m.bodies[origin].y,'number')+'</div>':'');
}
export function mathPresetDialog(S,h,group='geometry'){
 const start=group==='functions'?'linear':'trapezoid',fields=kind=>{const def=mathPresetById(kind);return `<p class="hint">${esc(def.description)}</p>`+(def.sides?`<label class="field"><span>Число сторон</span><input name="sides" type="number" min="3" max="12" step="1" value="6" required></label>`:'')+def.fields.map(f=>`<label class="field"><span>${esc(f.label)}${f.unit?' ('+f.unit+')':''}</span><input name="${f.key}" type="number" step="any" min="${f.min}" max="${f.max}" value="${f.value}" required></label>`).join('');};
 h.dialog(group==='functions'?'График без ввода формулы':'Готовая геометрическая фигура',`<p class="dialog-lead">Выберите шаблон и задайте числа. Для каждого размера появится свой ползунок.</p><label class="field"><span>Шаблон</span><select name="preset" aria-label="Шаблон">${presetOptions(group)}</select></label><div id="preset-fields">${fields(start)}</div>`,'Добавить на плоскость',async data=>{
  const kind=data.get('preset'),def=mathPresetById(kind),values=Object.fromEntries(def.fields.map(f=>[f.key,Number(data.get(f.key))])),next=structuredClone(S.draft),item=addMathPreset(next,kind,{values,sides:Number(data.get('sides')??6)});validatePhysics(validateModel(next));h.pushUndo();S.draft=next;S.selection=item.id;S.tab='mathObjects';h.changed();h.render();
 });
 const select=document.querySelector('#dialog [name=preset]');select.value=start;select.addEventListener('change',()=>{document.querySelector('#preset-fields').innerHTML=fields(select.value);});
}
