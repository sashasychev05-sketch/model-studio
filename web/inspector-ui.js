import {esc} from './scene.js';
import {objectKinds} from '/lib/components.js';

// UI state only: expanding a section never changes a saved physical model.
const inspectorSections=new Map();
export function propertySection(scope,id,title,content,{open=true,note=''}={}){
 const key=scope+':'+id,expanded=inspectorSections.get(key)??open;
 return `<details class="property-section" data-property-section="${esc(key)}" ${expanded?'open':''}><summary>${esc(title)}</summary><div class="property-section-content">${note?`<p class="hint section-note">${esc(note)}</p>`:''}${content}</div></details>`;
}
export function bindInspectorSections(root){
 for(const section of root.querySelectorAll('[data-property-section]'))section.addEventListener('toggle',()=>{
  if(section.isConnected)inspectorSections.set(section.dataset.propertySection,section.open);
 });
}
export function bodyInspector(m,b,scope,{field,select,check,button}){
 const group=(id,title,content,options)=>propertySection(scope,id,title,content,options);
 const row=content=>`<div class="field-row">${content}</div>`;
 const hint=text=>`<p class="hint">${text}</p>`;
 const geometric=(m.geometry??[]).findIndex(g=>g.target===b.id);
 const motion=geometric>=0?hint('Неподвижная точка геометрической конструкции. Её положение задаёт ограничение.'):select('Способ движения','body.motion',b.motion,[['fixed','Неподвижный'],['force','По действию сил'],['formula','По своим формулам']]);
 const position=geometric>=0?hint('Координаты вычисляются построением. Меняйте угол или длину в ограничении; исходные x/y этой точки не используются.')+button('teach-edit-geometry:'+geometric,'Изменить построение','quiet'):row(field('Координата x, м','body.x',b.x,'number')+field('Координата y, м','body.y',b.y,'number'));
 const velocity=row(field('Скорость vₓ, м/с','body.vx',b.vx,'number')+field('Скорость vᵧ, м/с','body.vy',b.vy,'number'));
 const links=(m.connections??[]).filter(c=>c.enabled&&[c.a,c.b].includes(b.id)).map(c=>c.name);
 const fields=(m.fields??[]).filter(f=>f.enabled&&((f.all??!f.targets.length)||f.targets.includes(b.id))).map(f=>f.name);
 const acting=[...links,...fields];
 let behavior=b.motion==='force'?hint('Поля и связи добавляют силы автоматически. Масса и заряд находятся в разделе «Физические характеристики».'):
  b.motion==='fixed'?hint('Положение постоянно, скорость равна нулю. Масса не влияет на движение неподвижной опоры. Масса и заряд могут создавать поля.'):
  hint('Положение задаётся формулами, а силы не меняют движение. x, y и скорости ниже доступны как начальные значения x0, y0, vx0, vy0.');
 if(b.motion==='force'&&acting.length)behavior+=`<div class="acting-list"><span>Связи и внешние поля</span>${acting.map(name=>`<b>${esc(name)}</b>`).join('')}</div>`;
 const physics=field('Масса m, кг','body.mass',b.mass,'number','min="0.000001"')+field('Заряд q, Кл','body.charge',b.charge??0,'number')+
  check('Создавать гравитационное поле','body.gravityEnabled',b.gravityEnabled===true)+hint('Масса с галочкой притягивает другие тела. Без неё тело действует как пробная масса. Допустима запись 5.972e24 для массы Земли.')+
  (b.motion==='fixed'?field('Радиус однородного шара R, м','body.gravityRadius',b.gravityRadius??0,'number','min="0"')+hint('R = 0: точечный источник. R > 0: однородный шар; внутри g ∝ r, в центре g = 0. Размер шара показывается на сцене в масштабе.'):hint('Движущийся источник рассчитывается как точка. Однородный шар доступен для неподвижного объекта.'))+
  (b.shape==='charge'||(b.charge??0)!==0?check('Создавать электрическое поле','body.fieldEnabled',b.fieldEnabled!==false)+hint('1e-6 Кл = 1 мкКл. Без галочки частица реагирует на другие поля, но сама не создаёт поле.'):'');
 const geometry=select('Вид объекта','body.shape',b.shape,objectKinds)+field('Цвет','body.color',b.color,'color')+
  (['rect','triangle','platform','arrow'].includes(b.shape)?row(field('Ширина, м','body.width',b.width??b.size*2,'number','min="0.02"')+field('Высота, м','body.height',b.height??b.size*1.4,'number','min="0.02"')):field(b.shape==='text'?'Размер подписи, м':'Радиус рисунка, м','body.size',b.size,'number','min="0.02"'))+
  field('Угол рисунка, °','body.angle',b.angle??0,'number')+check('Показывать траекторию','body.trail',b.trail)+check('Показывать вектор скорости','body.vector',b.vector)+hint('Подпись можно перетаскивать отдельно от объекта.')+button('teach-label-reset','Вернуть подпись на место','quiet');
 let formulas='';
 if(b.motion==='force')formulas=group('forces','Дополнительные силы',field('Сила Fₓ, Н','body.fx',b.fx)+field('Сила Fᵧ, Н','body.fy',b.fy)+hint('Добавляются к полям и связям. Например: <code>-k*x</code>, <code>-m*g</code>. Не добавляйте тяжесть второй раз, если уже есть поле тяжести.'),{open:b.fx!=='0'||b.fy!=='0'});
 if(b.motion==='formula')formulas=group('formulas','Формулы движения',field('Координата x(t), м','body.xFormula',b.xFormula)+field('Координата y(t), м','body.yFormula',b.yFormula)+hint('Используйте <code>t</code>, параметры и начальные условия. Пример: <code>x0+vx0*t</code>.'));
 return `<div class="selected-object-name">${esc(b.name)}</div>`+field('Название','body.name',b.name)+
  group('motion','Движение',motion+behavior)+
  group('initial',b.motion==='fixed'?'Положение':'Начальные условия',position+(b.motion==='fixed'?'':velocity))+
  group('physics','Физические характеристики',physics)+formulas+
  group('appearance','Внешний вид и отображение',geometry,{open:false,note:'Объект рассчитывается как материальная точка. Размеры и угол меняют рисунок. Радиус гравитационного шара задаётся отдельно в физических характеристиках; столкновения и вращение не рассчитываются.'})+
  group('identifier','Имя для формул',field('Идентификатор','body.id',b.id)+hint(`Радиус источника: <code>${esc(b.id)}_R</code>; его поле включено (0 или 1): <code>${esc(b.id)}_gravity</code>. Координаты и скорость: <code>${esc(b.id)}_x</code>, <code>${esc(b.id)}_y</code>, <code>${esc(b.id)}_vx</code>, <code>${esc(b.id)}_vy</code>.`),{open:false})+
  `<div class="inspector-footer">${button('duplicate-body','Копия','quiet','copy')}${button('delete-body','Удалить','danger','trash')}</div>`;
}
