import {calculationReports} from '../lib/calculations.js';
import {esc,fmt} from './data/format.js';
import {mathObjectGeometry} from '../lib/math-objects.js';
import {isSpatialObject} from '../lib/spatial-catalog.js';
import {spatialMetrics} from '../lib/spatial.js';
export function calculationCards(model,c){
 return calculationReports(model,c).map(report=>`<section class="calculation-card" data-calculation-result="${esc(report.id)}"><h3>${esc(report.name)}</h3>${report.message?`<p class="calculation-message">${esc(report.message)}</p>`:''}<div class="calculation-values">${report.values.filter(value=>!(value.key==='count'&&report.status==='many')).map(value=>`<div><span>${esc(value.label)}</span><strong>${fmt(value.value)} <small>${esc(value.unit)}</small></strong></div>`).join('')}</div></section>`).join('');
}
export function geometryCards(model,state,c){
 return (model.mathObjects??[]).filter(item=>item.type!=='function'&&item.visible!==false).map(item=>{
  try{const spatial=isSpatialObject(item),v=spatial?spatialMetrics(item,model):mathObjectGeometry(item,state,c),values=[];
   const add=(label,value,unit='')=>{if(Number.isFinite(value))values.push({label,value,unit});};
   if(v.volume!==undefined)add('Объём',v.volume,'куб. ед.');
   if(v.area!==undefined&&v.area!==null)add(spatial?'Полная площадь поверхности':item.type==='arc'?'Площадь сектора':'Площадь',v.area,'кв. ед.');
   if(v.perimeter!==undefined)add('Периметр',v.perimeter,'ед.');
   if(v.length!==undefined&&item.type!=='line')add(item.type==='circle'?'Длина окружности':item.type==='arc'?'Длина дуги':'Длина',v.length,'ед.');
   if(!values.length&&!v.selfIntersecting)return '';
   return `<section class="calculation-card" data-geometry-result="${esc(item.id)}"><h3>${esc(item.name)}</h3>${v.selfIntersecting?'<p class="calculation-message">Площадь не определена: контур пересекает себя.</p>':''}<div class="calculation-values">${values.map(v=>`<div><span>${esc(v.label)}</span><strong>${fmt(v.value)} <small>${esc(v.unit)}</small></strong></div>`).join('')}</div></section>`;
  }catch(error){return `<section class="calculation-card"><h3>${esc(item.name)}</h3><p class="calculation-message">${esc(error.message)}</p></section>`;}
 }).join('');
}
