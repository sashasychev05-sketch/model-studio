import {emptyModel,newBody} from './model.js';
import {newConnection,newField} from './components.js';
import {spatialModel,addSpatialObject} from './spatial-authoring.js';
import {C_LIGHT} from './relativity.js';
import {captureComponentVariant} from './component-variants.js';
export const workspaceDemos=[
 {id:'relativity-clocks',title:'СТО · движущиеся часы',description:'Сравните собственное время покоящейся частицы и частицы со скоростью 0,6 c.'},
 {id:'relativity-acceleration',title:'СТО · предел скорости',description:'Постоянная сила увеличивает импульс; скорость остаётся меньше c.'},
 {id:'relativity-magnet',title:'СТО · частица в магнитном поле',description:'Энергия постоянна; радиус зависит от релятивистского импульса.'},
 {id:'custom-field',title:'Своё поле · упругая ловушка',description:'Две разные жёсткости и сопротивление задают поле силы в каждой точке.'},
 {id:'custom-link',title:'Своя связь · нелинейная пружина',description:'Сравните линейную и кубическую части силы; используйте заготовку повторно.'},
 {id:'transparent-solids',title:'3D · прозрачные тела и скрытые рёбра',description:'Полупрозрачные куб и тетраэдр: скрытые части рёбер показаны пунктиром.'},
];
const param=(id,label,value,min,max,unit='')=>({id,label,value,min,max,unit});
const quantity=(id,label,expression,unit='')=>({id,label,expression,unit});
export function workspaceDemo(id){
 const def=workspaceDemos.find(d=>d.id===id);if(!def)throw new Error('Демонстрация не найдена');let m=emptyModel();Object.assign(m,{title:def.title,description:def.description,subject:'physics',topic:id.startsWith('relativity')?'Специальная теория относительности':'Авторские законы',notes:def.description});
 if(id==='transparent-solids'){
  m=spatialModel('cube');m.title=def.title;m.description=def.description;m.notes='Измените непрозрачность в свойствах. Сплошные рёбра видимы; пунктирные закрыты поверхностью. Скрытые рёбра можно выключить. Измерения идеальных тел аналитические.';m.mathObjects[0].position.x=-2;m.mathObjects[0].opacity=.3;addSpatialObject(m,'tetrahedron');m.mathObjects[1].position.x=2;m.mathObjects[1].opacity=.5;return m;
 }
 if(id.startsWith('relativity')){
  m.physics={mode:'relativistic'};m.duration=.1;m.dt=.001;m.scene={minX:-1e7,maxX:1e7,minY:-6e6,maxY:6e6,grid:true};m.bodies=[{...newBody('particle','point'),name:'Частица',x:-9e6,y:0,mass:1,motion:'force',fieldEnabled:false,trail:true,vector:false}];
  m.notes+='\nПлоское пространство-время СТО; система лаборатории, единицы СИ, c = 299 792 458 м/с. Масса — масса покоя. Только внешние силы и поля; гравитация, излучение, взаимные поля и механические связи не рассчитываются.';
  if(id==='relativity-clocks'){
   m.bodies[0].vx=.6*C_LIGHT;m.bodies[0].name='Движущиеся часы';m.bodies.push({...newBody('reference','point'),name:'Покой',x:-8e6,y:-3e6,motion:'fixed',fieldEnabled:false,trail:false,vector:false});m.quantities=[quantity('speedRatio','Скорость / c','particle_beta'),quantity('properTime','Время движущихся часов','particle_tau','с'),quantity('labTime','Время лаборатории','t','с'),quantity('gammaNow','Фактор Лоренца','particle_gamma')];m.graphs=[{...quantity('movingClock','Движущиеся часы','particle_tau','с'),autoScale:false,minY:0,maxY:.1},{...quantity('restClock','Покоящиеся часы','reference_tau','с'),autoScale:false,minY:0,maxY:.1}];
  }else if(id==='relativity-acceleration'){
   m.parameters=[param('F','Постоянная сила',3e9,1e9,4e9,'Н')];m.bodies[0].fx='F';m.quantities=[quantity('betaNow','Скорость / c','particle_beta'),quantity('momentum','Импульс px','particle_px','кг·м/с'),quantity('kinetic','Кинетическая энергия','particle_Ek','Дж'),quantity('clock','Собственное время','particle_tau','с')];m.graphs=[{...quantity('speedGraph','Скорость / c','particle_beta'),autoScale:false,minY:0,maxY:1}];
  }else{
   Object.assign(m.bodies[0],{x:0,vx:.6*C_LIGHT,charge:1});m.fields=[{...newField('magnet','magnetic'),bz:'80'}];m.scene={minX:-4e6,maxX:4e6,minY:-7e6,maxY:1e6,grid:true};m.quantities=[quantity('betaNow','Скорость / c','particle_beta'),quantity('kinetic','Кинетическая энергия','particle_Ek','Дж'),quantity('clock','Собственное время','particle_tau','с')];m.graphs=[{...quantity('energyGraph','Кинетическая энергия','particle_Ek','Дж'),autoScale:true}];
  }return m;
 }
 m.scene={minX:-6,maxX:6,minY:-4,maxY:4,grid:true};m.duration=12;
 if(id==='custom-field'){
  m.bodies=[{...newBody('body','circle'),name:'Тело в ловушке',x:3,y:2,motion:'force',trail:true}];m.parameters=[param('kx','Жёсткость по x',2,.2,6,'Н/м'),param('ky','Жёсткость по y',5,.2,8,'Н/м'),param('d','Сопротивление',.15,0,.8,'Н·с/м')];m.fields=[{...newField('trap','custom-force'),name:'Упругая ловушка',fx:'-kx*x-d*vx',fy:'-ky*y-d*vy'}];m.notes+='\nПоле силы F(x,y,v,t) действует в положении каждого тела. Это заданное внешнее поле; карта потенциала для произвольного закона не строится.';m.componentVariants=[captureComponentVariant(m,'field','trap','Моя упругая ловушка')];
 }else{
  m.bodies=[{...newBody('anchor','anchor'),name:'Опора',x:0,y:0},{...newBody('body','circle'),name:'Груз',x:3.5,y:0,motion:'force'}];m.parameters=[param('k','Линейная жёсткость',4,1,10,'Н/м'),param('q','Кубическая часть',2,0,5,'Н/м³'),param('d','Сопротивление',0,0,1,'Н·с/м'),{...param('L0','Свободная длина',2,2,3,'м'),binding:{connection:'spring',property:'length'}}];m.connections=[{...newConnection('spring','anchor','body','custom',2),name:'Нелинейная пружина',tension:'k*(r-L)+q*(r-L)^3+d*vr'}];m.quantities=[quantity('mechanicalEnergy','Энергия исходной пружины','body_m*(body_vx^2+body_vy^2)/2+k*(sqrt((body_x-anchor_x)^2+(body_y-anchor_y)^2)-L0)^2/2+q*(sqrt((body_x-anchor_x)^2+(body_y-anchor_y)^2)-L0)^4/4','Дж')];m.notes+='\nr — расстояние, L — свободная длина, vr — скорость изменения расстояния. Положительная сила стягивает концы; силы равны и противоположны. Энергия сохраняется при d = 0 для исходного закона. При замене формулы силы скорректируйте или удалите измерение энергии.';m.componentVariants=[captureComponentVariant(m,'connection','spring','Моя нелинейная пружина')];
 }return m;
}
