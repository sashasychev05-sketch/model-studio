import {dependencies} from './expression.js';
import {isSpatialObject} from './spatial-catalog.js';
import {spatialParameterIds} from './spatial.js';
const bodyKeys=['fx','fy','xFormula','yFormula'],fieldKeys=['gx','gy','ex','ey','bz','drag','b0','bxGradient','byGradient','originX','originY','fx','fy'],linkKeys=['stiffness','damping','tension'];
const symbols=['x','y','vx','vy','m','q','R','gravity'],relSymbols=['gamma','beta','tau','px','py','Ek','energy'];
const point=id=>({id,name:id,shape:'point',color:'#4f56e8',x:0,y:0,vx:0,vy:0,mass:1,size:.2,charge:0,fieldEnabled:false,gravityEnabled:false,motion:'fixed',fx:'0',fy:'0',xFormula:'x0',yFormula:'y0',trail:false,vector:false});
function base(){return {version:1,title:'Заготовка',description:'',notes:'',lesson:'',topic:'',subject:'physics',grade:'all',duration:15,dt:.01,scene:{minX:-6,maxX:6,minY:-4,maxY:4,grid:true},bodies:[],parameters:[],connections:[],fields:[],quantities:[],graphs:[]};}
export function validateComponentVariants(m,validate){
 if(m.componentVariants===undefined)return;if(!Array.isArray(m.componentVariants)||m.componentVariants.length>24)throw new Error('Можно сохранить до 24 заготовок в модели');const ids=new Set();
 for(const v of m.componentVariants){if(!v||typeof v.id!=='string'||!/^variant\d+$/.test(v.id)||ids.has(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!['body','field','connection','spatial'].includes(v.kind))throw new Error('Проверьте заготовки компонентов');ids.add(v.id);if(!v.spec||v.spec.kind==='html'||v.spec.componentVariants!==undefined)throw new Error('Заготовка должна содержать свойства компонента');if(v.spec.analysis!==undefined||v.spec.assignment!==undefined||(v.spec.calculations??[]).length||(v.spec.scenarios??[]).length||(v.spec.invariants??[]).length)throw new Error('Заготовка содержит только компонент и его параметры');v.spec=validate(v.spec);const list=v.kind==='body'?'bodies':v.kind==='field'?'fields':v.kind==='spatial'?'mathObjects':'connections';if(v.spec[list].length!==1||v.spec.quantities.length||v.spec.graphs.length||(v.spec.geometry??[]).length||(v.kind!=='spatial'&&(v.spec.mathObjects??[]).length))throw new Error('Заготовка содержит один компонент и его параметры');if(v.kind==='spatial'&&(v.spec.bodies.length||v.spec.fields.length||v.spec.connections.length||!isSpatialObject(v.spec.mathObjects[0])))throw new Error('Проверьте 3D-заготовку');if(v.kind==='body'&&(v.spec.fields.length||v.spec.connections.length)||v.kind==='field'&&(v.spec.connections.length||v.spec.bodies.length!==1)||v.kind==='connection'&&(v.spec.fields.length||v.spec.bodies.length!==2))throw new Error('Проверьте состав заготовки');}
}
export function captureComponentVariant(m,kind,id,name){
 const list={body:'bodies',field:'fields',connection:'connections',spatial:'mathObjects'}[kind],source=m[list]?.find(o=>o.id===id);if(!source)throw new Error('Сначала выберите компонент');if((m.componentVariants??[]).length>=24)throw new Error('В модели уже 24 заготовки');if(!name?.trim()||name.trim().length>80)throw new Error('Введите название заготовки до 80 символов');
 const item=structuredClone(source),keys=kind==='body'?bodyKeys:kind==='field'?fieldKeys:linkKeys,expressions=(kind==='spatial'?Object.values(item.dimensions??{}):keys.map(k=>item[k])).filter(v=>typeof v==='string');if(kind==='body'&&item.dynamicLabel)expressions.push(item.dynamicLabel.expression);
 const activeSymbols=[...symbols,...(m.physics?.mode==='relativistic'?relSymbols:[])],local=kind==='connection'?['r','vr','L','dx','dy']:kind==='body'||item.type==='custom-force'?['x','y','vx','vy','m','x0','y0','vx0','vy0']:[],allowed=new Set(['t','pi','e',...(m.physics?.mode==='relativistic'?['c_light']:[]),...local,...(kind==='body'?activeSymbols.map(k=>source.id+'_'+k):[])]),used=new Set();
 for(const expr of expressions)for(const key of dependencies(expr)){
  if(allowed.has(key))continue;
  if(m.parameters.some(p=>p.id===key))used.add(key);
  else throw new Error('Для повторного использования замените внешнюю величину «'+key+'» параметром.');
 }
 if(kind==='spatial')for(const id of spatialParameterIds(item))used.add(id);
 for(const p of m.parameters)if(kind==='body'&&p.binding?.body===source.id||kind==='connection'&&p.binding?.connection===source.id)used.add(p.id);
 const spec=base();spec.title=name.trim();spec.parameters=m.parameters.filter(p=>used.has(p.id)).map(p=>{const out=structuredClone(p);if(!(kind==='body'&&out.binding?.body===source.id||kind==='connection'&&out.binding?.connection===source.id))delete out.binding;else delete out.binding.reposition;return out;});if(kind==='spatial'){spec.subject='math';spec.scene.dimension=3;spec.mathObjects=[item];}
 else if(kind==='body'){spec.bodies=[item];if(m.physics)spec.physics=structuredClone(m.physics);}
 else if(kind==='field'){spec.bodies=[{...point('variant_A'),motion:'force'}];item.all=true;item.targets=[];spec.fields=[item];}
 else{spec.bodies=[point('variant_A'),{...point('variant_B'),x:item.length}];item.a='variant_A';item.b='variant_B';spec.connections=[item];}
 let n=1;while(m.componentVariants?.some(v=>v.id==='variant'+n))n++;return {id:'variant'+n,name:name.trim(),kind,spec};
}
export function applyComponentVariant(m,v,{a,b}={}){
 const next=structuredClone(m),used=new Set([...next.parameters,...next.bodies,...next.quantities,...next.fields,...next.connections,...(next.mathObjects??[])].map(o=>o.id)),unique=prefix=>{let n=1;while(used.has(prefix+n))n++;const id=prefix+n;used.add(id);return id;},mapping=new Map();
 if(next.parameters.length+v.spec.parameters.length>24)throw new Error('Для заготовки не хватает места: максимум 24 параметра');
 for(const p of v.spec.parameters){const id=unique('p');mapping.set(p.id,id);next.parameters.push({...structuredClone(p),id});}
 const list={body:'bodies',field:'fields',connection:'connections',spatial:'mathObjects'}[v.kind],limit={body:60,field:12,connection:80,spatial:40}[v.kind];if(v.kind==='spatial'){if(next.subject!=='math'||next.kind==='html')throw new Error('3D-заготовку добавляют в математическую модель');next.mathObjects??=[];if(v.spec.mathObjects[0].type==='solid'&&next.mathObjects.filter(o=>o.type==='solid').length>=16)throw new Error('Можно добавить до 16 объёмных тел');}
 if(!list||next[list].length>=limit)throw new Error('Достигнут предел компонентов этого типа');
 const source=v.spec[list][0],item=structuredClone(source);item.id=unique(v.kind==='body'?'b':v.kind==='field'?'field':v.kind==='spatial'?'space':'c');item.name=v.name;
 if(v.kind==='body')for(const suffix of [...symbols,...(v.spec.physics?.mode==='relativistic'?relSymbols:[])])mapping.set(source.id+'_'+suffix,item.id+'_'+suffix);
 const replace=expr=>expr.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g,id=>mapping.get(id)??id);for(const key of v.kind==='body'?bodyKeys:v.kind==='field'?fieldKeys:linkKeys)if(typeof item[key]==='string')item[key]=replace(item[key]);if(item.dimensions)for(const key of Object.keys(item.dimensions))item.dimensions[key]=replace(item.dimensions[key]);if(item.dynamicLabel)item.dynamicLabel.expression=replace(item.dynamicLabel.expression);
 for(const p of next.parameters.slice(m.parameters.length)){if(p.binding?.body===source.id&&v.kind==='body')p.binding.body=item.id;if(p.binding?.connection===source.id&&v.kind==='connection')p.binding.connection=item.id;}
 if(v.kind==='body'){item.x+=item.x<9999999?.6:-.6;for(const p of next.parameters)if(p.binding?.body===item.id&&p.binding.property==='x'){p.value=item.x;p.min=Math.min(p.min,item.x);p.max=Math.max(p.max,item.x);}}
 if(v.kind==='field'){item.all=true;item.targets=[];}if(v.kind==='connection'){if(!next.bodies.some(o=>o.id===a)||!next.bodies.some(o=>o.id===b)||a===b)throw new Error('Выберите два разных конца связи');item.a=a;item.b=b;}
 if(v.kind==='spatial'){const points=item.position?[item.position]:[item.a3,item.b3],dx=Math.max(...points.map(p=>p.x))<=9999?1:Math.min(...points.map(p=>p.x))>=-9999?-1:0;for(const p of points)p.x+=dx;next.scene.dimension=3;}
 next[list].push(item);Object.assign(m,next);return item;
}
export function importComponentVariants(m,input,validate){
 if(input?.format!=='model-studio-component-variants'||input.version!==1||!Array.isArray(input.variants))throw new Error('Выберите JSON с заготовками Модельной');const next=structuredClone(m);next.componentVariants??=[];if(next.componentVariants.length+input.variants.length>24)throw new Error('После импорта должно быть не больше 24 заготовок');
 for(const v of input.variants){let n=1;while(next.componentVariants.some(o=>o.id==='variant'+n))n++;next.componentVariants.push({...structuredClone(v),id:'variant'+n});}validateComponentVariants(next,validate);Object.assign(m,next);
}
