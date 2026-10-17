const length=(key,label,value,min=.3,max=6)=>({key,label,value,min,max,unit:''});
export const solidKinds=[
 {id:'cube',label:'Куб',fields:[length('side','Сторона',3)]},
 {id:'box',label:'Прямоугольный параллелепипед',fields:[length('width','Ширина',4),length('depth','Глубина',2),length('height','Высота',3)]},
 {id:'sphere',label:'Шар',fields:[length('radius','Радиус',2,.3,3)]},
 {id:'cylinder',label:'Цилиндр',fields:[length('radius','Радиус',1.5,.3,3),length('height','Высота',3)]},
 {id:'cone',label:'Конус',fields:[length('radius','Радиус основания',2,.3,3),length('height','Высота',4)]},
 {id:'square-pyramid',label:'Четырёхугольная пирамида',fields:[length('side','Сторона основания',3),length('height','Высота',4)]},
 {id:'triangular-prism',label:'Правильная треугольная призма',fields:[length('side','Сторона основания',3),length('height','Высота',4)]},
 {id:'regular-prism',label:'Правильная призма',sides:6,fields:[length('radius','Радиус описанной окружности',2,.3,3),length('height','Высота',3)]},
 {id:'regular-pyramid',label:'Правильная пирамида',sides:5,fields:[length('radius','Радиус описанной окружности',2,.3,3),length('height','Высота',4)]},
 {id:'torus',label:'Тор',fields:[length('radius','Большой радиус',2.5,1.5,4),length('tube','Радиус трубки',.7,.2,1)]},
];
export const solidKind=id=>solidKinds.find(k=>k.id===id);
export const spatialObjectKinds=[['solid','Объёмная фигура'],['point3d','Точка в пространстве'],['segment3d','Отрезок в пространстве'],['vector3d','Вектор в пространстве']];
export const isSpatialObject=item=>spatialObjectKinds.some(([type])=>item?.type===type);
