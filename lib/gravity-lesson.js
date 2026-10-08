import {emptyModel,newBody} from './model.js';
export function gravityLesson(){
 return {...emptyModel(),title:'Массивный шар: гравитация снаружи и внутри',sourceName:'gravity-lessons/v1/uniform-sphere',topic:'Гравитация',lesson:'Теорема о сферических слоях',grade:'10',duration:30,dt:.01,
 description:'Пробная частица проходит через центр однородного шара. Поле внутри растёт с расстоянием, снаружи убывает как 1/r².',
 scene:{minX:-350,maxX:350,minY:-200,maxY:200,grid:true,fieldLayers:{electric:false,gravity:true,magnetic:false}},
 bodies:[{...newBody('sphere'),name:'Однородный шар',mass:6e15,x:0,y:0,size:5,gravityRadius:100,gravityEnabled:true,color:'#23a08c'},
 {...newBody('probe'),name:'Пробная частица',x:250,y:0,mass:1,size:6,motion:'force',trail:true,vector:true}],
 quantities:[{id:'r',label:'Расстояние до центра',expression:'sqrt((probe_x-sphere_x)^2+(probe_y-sphere_y)^2)',unit:'м'},
 {id:'g',label:'Модуль g',expression:'sphere_gravity*6.67430e-11*sphere_m*r/max(r,sphere_R)^3',unit:'м/с²'},
 {id:'potential',label:'Потенциальная энергия',expression:'probe_m*sphere_gravity*(-6.67430e-11*sphere_m/max(r,sphere_R)+6.67430e-11*sphere_m*(min(r,sphere_R)^2-sphere_R^2)/(2*max(sphere_R,1e-30)^3))',unit:'Дж'},
 {id:'energy',label:'Полная энергия',expression:'kinetic+potential',unit:'Дж'},
 {id:'kinetic',label:'Кинетическая энергия',expression:'probe_m*(probe_vx^2+probe_vy^2)/2',unit:'Дж'}],
 graphs:[{id:'position',label:'Положение частицы',expression:'probe_x',unit:'м',autoScale:false,minY:-300,maxY:300},
 {id:'acceleration',label:'Модуль g',expression:'g',unit:'м/с²',autoScale:false,minY:0,maxY:45}],
 notes:'Неподвижный однородный шар: M = 6·10¹⁵ кг, R = 100 м. Его граница нарисована в физическом масштабе. Вне шара g = GM/r², внутри g = GMr/R³, в центре g = 0. Потенциал снаружи −GM/r, внутри −GM(3R²−r²)/(2R³).\nЧастица — пробная материальная точка. Проход сквозь шар означает идеальный туннель без сопротивления и столкновений; это не симуляция удара в планету. Поле можно выключить под сценой. Изменение источника начинает новый опыт с t = 0.\nВеличины g и энергия учитывают массу, радиус, положение и переключатель источника. Источник удерживается внешней опорой, поэтому импульс пары не сохраняется. Для двух свободных источников используйте точечную модель с радиусом 0.'};
}
