const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>String(value??'').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
const matches=(text,query)=>normalize(query).split(/\s+/).every(word=>normalize(text).includes(word));
const button=(action,label,extra='')=>`<button type="button" data-a="${escape(action)}" ${extra}>${label}</button>`;
const symbols={search:'⌕',add:'＋',tabs:'▤',view:'◫',visible:'◉',hidden:'○',locked:'▣',unlocked:'◇'};
const kindLabels={all:'Все',bodies:'Тела и точки',mathObjects:'Фигуры',connections:'Связи',fields:'Поля'};

export function initInterfaceWorkspace(S,h){
 const doc=h.document,storage=h.storage;
 // The lightweight Node DOM fixture does not provide a browser layout.
 if(!doc.getElementById)return {mount(){},update(){},enhanceDialog(){},action:async()=>false};
 let preferences={density:'comfortable'};try{const saved=JSON.parse(storage?.getItem('model-studio-interface-v1')||'{}');if(saved.density==='compact')preferences.density='compact';}catch{}
 const filters=new Map();let focus=false,commands=[],headerObserver=null;
 const native=()=>S.view==='editor'&&S.draft?.kind!=='html',editable=()=>native()&&!S.present;
 const currentFilter=()=>{const id=S.workspaceTabId??'draft';if(!filters.has(id))filters.set(id,{query:'',kind:'all'});return filters.get(id);};
 const execute=async name=>{try{await h.action(name);}catch(error){h.toast(error.message,true);}};
 const selectItem=async item=>{h.closeDialog();if(item.model)h.openModel(item.model,true);else await execute(item.action);};
 const iconButton=(action,label,symbol,pressed)=>button(action,symbol,`class="ui-icon" aria-label="${escape(label)}" title="${escape(label)}"${pressed===undefined?'':` aria-pressed="${pressed}"`}`);
 function paintPreferences(){doc.documentElement.dataset.density=preferences.density;doc.body.classList.toggle('ui-focus',focus&&native()&&!S.present&&S.tab!=='data');doc.querySelectorAll('[data-a="ui-focus"]').forEach(b=>b.setAttribute('aria-pressed',String(focus)));measureHeader();}
 function measureHeader(){const header=doc.querySelector('#app .editor-header'),shell=doc.querySelector('#app .editor-shell');if(header&&shell)shell.style.setProperty('--editor-header-height',(header.getBoundingClientRect().height+(doc.querySelector('#model-tabs:not([hidden])')?.getBoundingClientRect().height??0))+'px');}
 function commandItems(mode){
  if(mode==='tabs')return h.tabs.keys().map(id=>{const tab=h.tabs.get(id);return {label:tab.draft.title,detail:h.tabs.isUnsaved(tab)?'Есть несохранённая работа':'Сохранено',action:'model-tab:'+id};});
  const items=[{label:'Новая модель',detail:'Выбрать шаблон или пустую сцену',action:'new-model'},{label:'Новые возможности',detail:'Готовые демонстрации',action:'workspace-demos'},{label:'Анализ данных',detail:'Таблицы, статистика и сравнение',action:'standalone-analysis'},{label:'Настройки приложения',detail:'Оформление и библиотека',action:'app-settings'},{label:'Рабочий вид',detail:'Плотность, фокус и клавиатура',action:'ui-layout'}];
  if(native())items.unshift(...(S.present?[]:[{label:'Добавить на сцену',detail:'Объекты, фигуры, поля и связи',action:'ui-add'},{label:'Сохранить модель',detail:'Ctrl+S',action:'save'},{label:'Мои заготовки',detail:'Свои варианты компонентов',action:'variants'}]),...(editable()&&S.tab!=='data'?[{label:'Режим фокуса',detail:'Сцена на всю рабочую область · F8',action:'ui-focus'}]:[]),{label:'Экспорт модели',detail:'JSON, HTML или изображение',action:'export'});
  if(S.view==='editor')items.push({label:'Открытые модели',detail:'Обзор вкладок',action:'ui-tabs'},{label:S.present?'Открыть редактор':'Показ на уроке',detail:'Переключить рабочий режим',action:'present'});
  if(mode==='add')return [{label:'Тело или точка',detail:'Начальное положение и поведение',action:'add-body'},{label:'Геометрическая фигура',detail:'Готовые размеры без формул',action:'math-preset:geometry'},{label:'График функции',detail:'Готовые функции и ползунки',action:'math-preset:functions'},...(S.draft.subject==='math'?[{label:'Объёмная фигура',detail:'Тела, точки и векторы в 3D',action:'spatial-palette'}]:[{label:'Поле',detail:'Внешнее воздействие на тела',action:'add-field'},{label:'Связь',detail:'Выберите два конца',action:'add-connection'}]),{label:'Математическое построение',detail:'Линии, векторы, окружности и кривые',action:'add-math'},{label:'Ползунок свойства',detail:'Связать число со свойством объекта',action:'teach-slider'},{label:'Измерение',detail:'Расстояния, углы и показания',action:'teach-measure'},{label:'Мои заготовки',detail:'Добавить сохранённый компонент',action:'variants'}];
  return [...items,...S.library.models.filter(m=>!m.archived).map(m=>({label:m.spec.title,detail:'Модель · '+(m.spec.topic||m.spec.description||'Открыть из каталога'),model:m.id}))];
 }
 function palette(mode='commands'){
  commands=commandItems(mode);h.dialog(mode==='tabs'?'Открытые модели':mode==='add'?'Добавить на сцену':'Быстрый поиск',`<label class="ui-search"><span>${mode==='tabs'?'Найти вкладку':mode==='add'?'Что добавить':'Модель или действие'}</span><input id="ui-command-search" type="search" role="combobox" aria-expanded="true" aria-autocomplete="list" autocomplete="off" placeholder="Начните вводить название…" aria-controls="ui-command-results"></label><div id="ui-command-results" class="ui-command-results" role="listbox" aria-label="Результаты поиска"></div><p class="ui-key-hint">↑ ↓ — выбор · Enter — открыть · Esc — закрыть</p>`);
  doc.getElementById('dialog').classList.add('ui-command-dialog');paintCommands('');doc.getElementById('ui-command-search').focus();
 }
 function paintCommands(query){
  const rows=commands.map((item,index)=>({...item,index})).filter(item=>matches(item.label+' '+item.detail,query)).slice(0,80),root=doc.getElementById('ui-command-results');if(!root)return;
  root.innerHTML=rows.length?rows.map((item,i)=>button('ui-execute:'+item.index,`<span><strong>${escape(item.label)}</strong><small>${escape(item.detail)}</small></span><span aria-hidden="true">↵</span>`,`class="ui-command ${i===0?'current':''}" id="ui-command-row-${item.index}" role="option" aria-selected="${i===0}" tabindex="-1"`)).join(''):'<p class="ui-empty">Ничего не найдено. Попробуйте другое название.</p>';const input=doc.getElementById('ui-command-search');if(rows.length)input?.setAttribute('aria-activedescendant','ui-command-row-'+rows[0].index);else input?.removeAttribute('aria-activedescendant');
 }
 function enhanceDialog(){
  const dialog=doc.getElementById('dialog'),select=dialog?.querySelector('select[name="kind"]');if(!select||dialog.querySelector('.ui-template-picker'))return;
  dialog.classList.add('ui-create-dialog');const entries=[...select.options].map(option=>{const id=option.value,group=option.parentElement.label??'',category=id.startsWith('demo:')?'demos':id.startsWith('3d-')||id==='space3d'?'3d':['native','relativistic'].includes(id)?'physics':id==='html'?'html':group.includes('Графики')||id==='function'?'functions':'geometry';return {id,label:option.textContent.replace(/^(Математика|Физика|3D) · /,''),category,description:category==='3d'?'Размеры, поворот, прозрачность и измерения':category==='functions'?'Настраиваемые параметры и график':category==='physics'?'Тела, силы, связи и измерения':category==='demos'?'Готовый редактируемый опыт':category==='html'?'Импорт и редактирование HTML':'Геометрия с числовыми размерами'};});
  const picker=doc.createElement('section');picker.className='ui-template-picker';picker.innerHTML='<div class="ui-template-heading"><h3>С чего начнём?</h3><label class="ui-template-search"><input type="search" aria-label="Поиск шаблонов" placeholder="Куб, трапеция, часы…"></label></div><div class="ui-template-categories" aria-label="Категории шаблонов">'+[['all','Все'],['physics','Физика'],['geometry','Геометрия'],['functions','Функции'],['3d','3D'],['demos','Примеры'],['html','HTML']].map(([id,label])=>button('ui-template-category:'+id,escape(label),`aria-pressed="${id==='all'}"`)).join('')+'</div><div class="ui-template-grid"></div><p class="ui-template-selection" role="status"></p>';
  select.closest('label').before(picker);let category='all';
  const paint=()=>{const query=picker.querySelector('input').value,rows=entries.filter(item=>(category==='all'||item.category===category)&&matches(item.label+' '+item.description,query));picker.querySelector('.ui-template-grid').innerHTML=rows.map(item=>button('ui-template:'+item.id,`<span class="ui-template-mark" aria-hidden="true">${item.category==='3d'?'◇':item.category==='functions'?'ƒ':item.category==='physics'?'↗':item.category==='demos'?'▶':item.category==='html'?'↔':'△'}</span><span><strong>${escape(item.label)}</strong><small>${escape(item.description)}</small></span>`,`class="ui-template-card" aria-pressed="${item.id===select.value}"`)).join('')||'<p class="ui-empty">Шаблоны не найдены. Измените категорию или запрос.</p>';picker.querySelector('.ui-template-selection').textContent='Выбрано: '+(entries.find(item=>item.id===select.value)?.label??'');};
  picker.addEventListener('input',paint);select.addEventListener('change',paint);picker.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;const name=target.dataset.a;if(name.startsWith('ui-template-category:')){category=name.slice(21);picker.querySelectorAll('.ui-template-categories button').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));paint();}else if(name.startsWith('ui-template:')){select.value=name.slice(12);select.dispatchEvent(new Event('change',{bubbles:true}));} });paint();
 }
 function filterObjects(){
  if(!native())return;const filter=currentFilter(),rows=[...doc.querySelectorAll('.ui-object-row')];let count=0;
  for(const row of rows){const visible=(filter.kind==='all'||filter.kind===row.dataset.kind)&&matches(row.dataset.search,filter.query);row.hidden=!visible;if(visible)count++;}
  const counter=doc.getElementById('ui-object-count');if(counter)counter.textContent=`${count} из ${rows.length}`;const empty=doc.getElementById('ui-object-empty');if(empty)empty.hidden=count!==0||rows.length===0;
 }
 function mountObjects(){
  const panel=doc.querySelector('.object-panel');if(!panel)return;const filter=currentFilter();
  if(!panel.querySelector('.ui-object-search')){const search=doc.createElement('div');search.className='ui-object-search';search.innerHTML=`<label><span class="sr-only">Поиск в составе модели</span><input id="ui-object-search" type="search" value="${escape(filter.query)}" placeholder="Найти объект…" aria-label="Поиск в составе модели"></label><div class="ui-object-filter"><select id="ui-object-kind" aria-label="Тип объектов">${Object.entries(kindLabels).map(([id,label])=>`<option value="${id}" ${filter.kind===id?'selected':''}>${label}</option>`).join('')}</select><span id="ui-object-count" role="status"></span></div><p id="ui-object-empty" class="ui-empty" hidden>Ничего не найдено. ${button('ui-clear-objects','Сбросить поиск')}</p>`;panel.querySelector('.panel-heading').after(search);}
  for(const node of panel.querySelectorAll('[data-select-body],[data-select-math],[data-select-component]')){
   if(node.parentElement.classList.contains('ui-object-row'))continue;let kind,id;if(node.dataset.selectBody){kind='bodies';id=node.dataset.selectBody;}else if(node.dataset.selectMath){kind='mathObjects';id=node.dataset.selectMath;}else [kind,id]=node.dataset.selectComponent.split(':');const item=S.draft[kind]?.find(o=>o.id===id);if(!item)continue;
   const row=doc.createElement('div');row.className='ui-object-row';row.dataset.kind=kind;row.dataset.search=item.name+' '+item.id;node.before(row);row.append(node);const visible=kind==='bodies'||kind==='mathObjects'?item.visible!==false:item.show!==false,actions=doc.createElement('span');actions.className='ui-object-actions';actions.innerHTML=iconButton('ui-visibility:'+kind+':'+id,(visible?'Скрыть':'Показать')+' «'+item.name+'» на сцене',visible?symbols.visible:symbols.hidden,visible)+(kind==='bodies'?iconButton('ui-lock:'+id,(item.dragLocked?'Разрешить':'Запретить')+' перетаскивание «'+item.name+'»',item.dragLocked?symbols.locked:symbols.unlocked,!!item.dragLocked):'');row.append(actions);
  }
  filterObjects();
 }
 function mountInspector(){
  const pane=doc.querySelector('.inspector');if(!pane||pane.querySelector('.ui-inspector-context'))return;
  const list={object:'bodies',mathObjects:'mathObjects',connections:'connections',fields:'fields'}[S.tab],item=S.draft[list]?.find(o=>o.id===S.selection),context=doc.createElement('div');context.className='ui-inspector-context';
  context.innerHTML=(item?`<span class="ui-context-kind">${escape(kindLabels[list])}</span><strong>${escape(item.name)}</strong>`:'<strong>Настройка модели</strong>')+(pane.querySelector('details.property-section')?'<div class="ui-section-actions">'+button('ui-sections:open','Развернуть всё')+button('ui-sections:close','Свернуть всё')+'</div>':'');pane.querySelector('.panel-heading').after(context);
 }
 function mountParameters(){
  for(const range of doc.querySelectorAll('#live-controls [data-live]')){const param=S.draft.parameters.find(p=>p.id===range.dataset.live);if(!param||range.parentElement.querySelector('[data-live-number]'))continue;
   const controls=doc.createElement('span');controls.className='ui-param-value';controls.innerHTML=`<input type="text" inputmode="decimal" data-live-number="${param.id}" value="${escape(param.value)}" aria-label="Точное значение: ${escape(param.label)}"><span>${escape(param.unit)}</span>${button('ui-param-reset:'+param.id,'↶',`class="ui-icon" aria-label="Вернуть сохранённое значение: ${escape(param.label)}" title="Вернуть сохранённое значение"`)}`;range.after(controls);
  }
 }
 function update(){
  if(!native())return;for(const input of doc.querySelectorAll('[data-live-number]')){const p=S.draft.parameters.find(p=>p.id===input.dataset.liveNumber);if(p&&doc.activeElement!==input)input.value=p.value;const reset=input.parentElement.querySelector('button'),saved=S.record?.spec.parameters.find(o=>o.id===p?.id);if(reset)reset.disabled=!saved||saved.value===p.value;}
  const state=doc.getElementById('ui-workspace-state');if(state){const label=S.draft.scene.dimension===3?'3D · математика':S.draft.physics?.mode==='relativistic'?'СТО · физика':S.draft.subject==='math'?'2D · математика':S.running?'Расчёт идёт':'Физическая модель';if(state.textContent!==label)state.textContent=label;}
  const progress=doc.getElementById('ui-time-progress');if(progress){progress.max=S.draft.duration;progress.value=S.sim?.t??0;progress.setAttribute('aria-valuetext',h.fmt(S.sim?.t??0)+' из '+h.fmt(S.draft.duration)+' с');}
 }
 function mount(){
  const header=doc.querySelector('#app .editor-actions')??doc.querySelector('#app .catalog-top>div');
  if(header&&!header.querySelector('.ui-header-tools')){const tools=doc.createElement('div');tools.className='ui-header-tools';tools.innerHTML=button('ui-search',symbols.search+' <span>Поиск</span><kbd>Ctrl K</kbd>','class="ui-command-trigger" aria-label="Быстрый поиск моделей и действий" title="Быстрый поиск · Ctrl+K"')+iconButton('ui-layout','Рабочий вид',symbols.view);header.prepend(tools);}
  const nav=doc.querySelector('#model-tabs [role=tablist]');if(nav&&!nav.querySelector('[data-a="ui-tabs"]'))nav.appendChild(Object.assign(doc.createElement('span'),{className:'ui-tab-overview',innerHTML:iconButton('ui-tabs','Обзор открытых моделей',symbols.tabs)}));
  if(native())mountParameters();
  if(editable()){
   mountObjects();mountInspector();const pane=doc.querySelector('.stage-heading');if(pane&&!doc.getElementById('ui-workspace-state')){pane.querySelector('span').innerHTML='<span id="ui-workspace-state"></span>';pane.insertAdjacentHTML('afterend','<div class="ui-scene-quick">'+button('ui-add','＋ Добавить на сцену','class="btn quiet"')+button('ui-focus','Режим фокуса','class="text-btn" aria-pressed="false" title="Режим фокуса · F8"')+'</div>');}
   const transport=doc.querySelector('.transport');if(transport&&!doc.getElementById('ui-time-progress')&&S.draft.scene.dimension!==3)transport.insertAdjacentHTML('beforeend','<progress id="ui-time-progress" aria-label="Ход опыта"></progress>');
  }
  paintPreferences();update();headerObserver?.disconnect();const editorHeader=doc.querySelector('#app .editor-header');if(editorHeader&&globalThis.ResizeObserver){headerObserver=new ResizeObserver(measureHeader);headerObserver.observe(editorHeader);}
 }
 function setParameter(id,value){
  const p=S.draft.parameters.find(o=>o.id===id);if(!p)return;const number=typeof value==='number'?value:Number(String(value).trim().replace(',','.'));
  if(String(value).trim()===''||!Number.isFinite(number)||number<p.min||number>p.max)throw new Error('Введите число от '+h.fmt(p.min)+' до '+h.fmt(p.max)+'.');
  const candidate=structuredClone(S.draft);candidate.parameters.find(o=>o.id===id).value=number;h.validate(candidate);
  const range=[...doc.querySelectorAll('#live-controls [data-live]')].find(node=>node.dataset.live===id);if(!range)return;range.value=number;range.dispatchEvent(new Event('input',{bubbles:true}));range.dispatchEvent(new Event('change',{bubbles:true}));update();
 }
 async function action(name){
  if(!name.startsWith('ui-'))return false;
  if(name==='ui-search'){palette();return true;}if(name==='ui-tabs'){palette('tabs');return true;}if(name==='ui-add'){if(editable())palette('add');return true;}
  if(name.startsWith('ui-execute:')){const item=commands[Number(name.slice(11))];if(item)await selectItem(item);return true;}
  if(name==='ui-focus'){if(editable()&&S.tab!=='data'){focus=!focus;h.closeDialog();paintPreferences();doc.querySelector('#scene')?.focus({preventScroll:true});}return true;}
  if(name==='ui-layout'){h.dialog('Рабочий вид',`<div class="ui-view-options"><section><h3>Плотность интерфейса</h3><p>Выберите удобный размер списков и промежутков.</p><div>${[['comfortable','Обычный'],['compact','Компактный']].map(([id,label])=>button('ui-density:'+id,label,`class="btn quiet" aria-pressed="${preferences.density===id}"`)).join('')}</div></section>${editable()&&S.tab!=='data'?'<section><h3>Сосредоточиться на сцене</h3><p>Боковые панели можно временно убрать. Время опыта и введённые значения сохраняются.</p>'+button('ui-focus',focus?'Вернуться к панелям':'Включить режим фокуса','class="btn quiet"')+'</section>':''}<section><h3>Быстрые клавиши</h3><dl class="ui-shortcuts"><dt>Ctrl + K</dt><dd>Поиск моделей и действий</dd><dt>Ctrl + Page Up / Down</dt><dd>Предыдущая / следующая модель</dd><dt>F8</dt><dd>Фокус на сцене</dd><dt>Ctrl + S</dt><dd>Сохранить</dd><dt>Ctrl + Z / Y</dt><dd>Отмена / повтор</dd></dl><p>Стрелки в поиске выбирают действие. В текстовых полях отмена относится к тексту.</p></section></div>`);return true;}
  if(name.startsWith('ui-density:')){preferences.density=name.slice(11)==='compact'?'compact':'comfortable';try{storage?.setItem('model-studio-interface-v1',JSON.stringify(preferences));}catch{}paintPreferences();doc.querySelectorAll('[data-a^="ui-density:"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.a==='ui-density:'+preferences.density)));return true;}
  if(name==='ui-clear-objects'){Object.assign(currentFilter(),{query:'',kind:'all'});doc.getElementById('ui-object-search').value='';doc.getElementById('ui-object-kind').value='all';filterObjects();return true;}
  if(name.startsWith('ui-visibility:')){if(!editable())return true;const [,kind,id]=name.split(':'),item=S.draft[kind]?.find(o=>o.id===id);if(item){h.pushUndo();const key=['bodies','mathObjects'].includes(kind)?'visible':'show';item[key]=item[key]===false;h.changed({displayOnly:true});h.render();}return true;}
  if(name.startsWith('ui-lock:')){if(!editable())return true;const body=S.draft.bodies.find(o=>o.id===name.slice(8));if(body){h.pushUndo();body.dragLocked=!body.dragLocked;h.changed({displayOnly:true});h.render();}return true;}
  if(name.startsWith('ui-sections:')){doc.querySelectorAll('.inspector details.property-section').forEach(section=>section.open=name==='ui-sections:open');return true;}
  if(name.startsWith('ui-param-reset:')){const id=name.slice(15),saved=S.record?.spec.parameters.find(p=>p.id===id);if(saved)setParameter(id,saved.value);return true;}
  return true;
 }
 doc.addEventListener('input',event=>{if(event.target.id==='ui-command-search')paintCommands(event.target.value);if(event.target.id==='ui-object-search'){currentFilter().query=event.target.value;filterObjects();}});
 doc.addEventListener('change',event=>{const target=event.target;if(target.id==='ui-object-kind'){currentFilter().kind=target.value;filterObjects();}if(target.dataset?.liveNumber){try{setParameter(target.dataset.liveNumber,target.value);}catch(error){h.toast(error.message,true);target.value=S.draft.parameters.find(p=>p.id===target.dataset.liveNumber)?.value??'';}}});
 doc.addEventListener('keydown',event=>{
  const dialog=doc.getElementById('dialog'),input=doc.getElementById('ui-command-search');
  if(input&&dialog&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();h.closeDialog();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(!dialog)execute('ui-search');return;}
  if(input&&(event.target===input||event.target.closest?.('#ui-command-results'))&&['ArrowDown','ArrowUp','Enter'].includes(event.key)){const rows=[...doc.querySelectorAll('#ui-command-results button')];if(!rows.length){event.preventDefault();return;}event.preventDefault();const active=rows.findIndex(b=>b.classList.contains('current')),index=(active+(event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0)+rows.length)%rows.length;rows.forEach((row,i)=>{row.classList.toggle('current',i===index);row.setAttribute('aria-selected',String(i===index));});input.setAttribute('aria-activedescendant',rows[index].id);rows[index].scrollIntoView({block:'nearest'});if(event.key==='Enter')execute(rows[index].dataset.a);return;}
  if(dialog)return;if(event.key==='F8'&&editable()&&S.tab!=='data'){event.preventDefault();execute('ui-focus');}
  if((event.ctrlKey||event.metaKey)&&['PageUp','PageDown'].includes(event.key)&&S.view==='editor'){const ids=h.tabs.keys(),at=ids.indexOf(S.workspaceTabId);if(ids.length>1){event.preventDefault();execute('model-tab:'+ids[(at+(event.key==='PageDown'?1:-1)+ids.length)%ids.length]);}}
  if(event.key==='Enter'&&event.target.dataset?.liveNumber){event.preventDefault();event.target.blur();}
 });
 return {mount,update,enhanceDialog,action};
}
