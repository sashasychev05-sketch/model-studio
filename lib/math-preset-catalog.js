const dimension=(key,label,value,min=.4,max=7)=>({key,label,value,min,max,unit:''});
const angle=(key,label,value,min=15,max=165)=>({key,label,value,min,max,unit:'°'});
const shape=(id,label,fields,points,description)=>({id,label,group:'geometry',fields,points,description});
const graph=(id,label,expression,description,fields)=>({id,label,group:'functions',expression,description,fields:fields??[dimension('a','Множитель',1,-3,3),dimension('h','Сдвиг по x',0,-3,3),dimension('k','Сдвиг по y',0,-3,3)]});
const base=()=>dimension('base','Основание',4),height=()=>dimension('height','Высота',3),side=()=>dimension('side','Сторона',3),tilt=()=>angle('angle','Угол при основании',65);
export const mathPresets=[
 shape('triangle','Треугольник',[base(),height(),dimension('shift','Сдвиг вершины',0,-3,3)],[['-base/2','-height/2'],['base/2','-height/2'],['shift','height/2']],'Основание, высота и положение вершины.'),
 shape('right-triangle','Прямоугольный треугольник',[dimension('width','Горизонтальный катет',4),dimension('height','Вертикальный катет',3)],[['-width/2','-height/2'],['width/2','-height/2'],['-width/2','height/2']],'Катеты остаются перпендикулярными.'),
 shape('isosceles-triangle','Равнобедренный треугольник',[base(),height()],[['-base/2','-height/2'],['base/2','-height/2'],['0','height/2']],'Боковые стороны всегда равны.'),
 shape('equilateral-triangle','Равносторонний треугольник',[side()],[['-side/2','-side*sqrt(3)/6'],['side/2','-side*sqrt(3)/6'],['0','side*sqrt(3)/3']],'Три равные стороны и углы по 60°.'),
 shape('square','Квадрат',[side()],[['-side/2','-side/2'],['side/2','-side/2'],['side/2','side/2'],['-side/2','side/2']],'Равные стороны и прямые углы.'),
 shape('rectangle','Прямоугольник',[dimension('width','Ширина',5),height()],[['-width/2','-height/2'],['width/2','-height/2'],['width/2','height/2'],['-width/2','height/2']],'Ширина и высота меняются независимо.'),
 shape('parallelogram','Параллелограмм',[base(),side(),tilt()],[['(-base-side*cos(angle*pi/180))/2','-side*sin(angle*pi/180)/2'],['(base-side*cos(angle*pi/180))/2','-side*sin(angle*pi/180)/2'],['(base+side*cos(angle*pi/180))/2','side*sin(angle*pi/180)/2'],['(-base+side*cos(angle*pi/180))/2','side*sin(angle*pi/180)/2']],'Противоположные стороны остаются параллельными.'),
 shape('rhombus','Ромб',[side(),tilt()],[['(-side-side*cos(angle*pi/180))/2','-side*sin(angle*pi/180)/2'],['(side-side*cos(angle*pi/180))/2','-side*sin(angle*pi/180)/2'],['(side+side*cos(angle*pi/180))/2','side*sin(angle*pi/180)/2'],['(-side+side*cos(angle*pi/180))/2','side*sin(angle*pi/180)/2']],'Все стороны равны; угол меняет площадь.'),
 shape('trapezoid','Трапеция',[dimension('bottom','Нижнее основание',5),dimension('top','Верхнее основание',3),height(),dimension('shift','Сдвиг верхнего основания',.7,-3,3)],[['-bottom/2','-height/2'],['bottom/2','-height/2'],['shift+top/2','height/2'],['shift-top/2','height/2']],'Основания всегда параллельны. При равных основаниях получается параллелограмм.'),
 shape('isosceles-trapezoid','Равнобедренная трапеция',[dimension('bottom','Нижнее основание',5),dimension('top','Верхнее основание',3),height()],[['-bottom/2','-height/2'],['bottom/2','-height/2'],['top/2','height/2'],['-top/2','height/2']],'Боковые стороны равны. При равных основаниях получается прямоугольник.'),
 shape('kite','Дельтоид',[dimension('width','Ширина',4),dimension('upper','Верхняя высота',3,.4,4),dimension('lower','Нижняя высота',1.5,.4,4)],[['0','upper'],['-width/2','0'],['0','-lower'],['width/2','0']],'Две пары равных соседних сторон.'),
 {...shape('regular-polygon','Правильный многоугольник',[dimension('radius','Радиус описанной окружности',2.5,.4,4),angle('rotation','Поворот',0,-180,180)],[],'От 3 до 12 равных сторон. Число сторон выбирается при добавлении.'),sides:6},
 {...shape('circle-preset','Окружность',[dimension('radius','Радиус',2,.4,4)],[],'Окружность с регулируемым радиусом.'),type:'circle'},
 {...shape('sector','Круговой сектор',[dimension('radius','Радиус',2,.4,4),angle('start','Начальный угол',0,-180,180),angle('sweep','Угол сектора',90,5,355)],[],'Угол, длина дуги и площадь сектора.'),type:'arc'},
 graph('linear','Линейная функция','a*(x-h)+k','Наклон и сдвиги прямой.'),
 graph('quadratic','Парабола','a*(x-h)^2+k','Растяжение, направление ветвей и вершина.'),
 graph('cubic','Кубическая функция','a*(x-h)^3+k','Множитель и сдвиги кубической параболы.'),
 graph('sine','Синусоида','a*sin(w*(x-h))+k','Амплитуда, частота и сдвиги; аргумент в радианах.',[dimension('a','Амплитуда',1,-3,3),dimension('w','Угловая частота',1,.2,4),dimension('h','Сдвиг по x',0,-3,3),dimension('k','Сдвиг по y',0,-3,3)]),
 graph('cosine','Косинусоида','a*cos(w*(x-h))+k','Амплитуда, частота и сдвиги; аргумент в радианах.',[dimension('a','Амплитуда',1,-3,3),dimension('w','Угловая частота',1,.2,4),dimension('h','Сдвиг по x',0,-3,3),dimension('k','Сдвиг по y',0,-3,3)]),
 graph('absolute','Модуль','a*abs(x-h)+k','График с вершиной и двумя лучами.'),
 graph('reciprocal','Гипербола','a/(x-h)+k','Две ветви и разрыв в точке x = сдвиг по x.'),
 graph('square-root','Квадратный корень','a*sqrt(x-h)+k','График определён справа от начала подкоренного выражения.'),
 graph('exponential','Показательная функция','a*exp(x-h)+k','Экспонента, масштаб и сдвиги.'),
];
export const mathPresetById=id=>mathPresets.find(p=>p.id===id);
export function validateMathPreset(item,m){
 if(item.preset===undefined)return;
 const p=item.preset,def=mathPresetById(p?.kind),fail=()=>{throw new Error('Проверьте настройки готового шаблона');};
 if(!def||!p.parameters||typeof p.parameters!=='object'||Array.isArray(p.parameters)||Object.keys(p.parameters).length!==def.fields.length)fail();
 if(item.type!==(def.group==='functions'?'function':def.type??'polygon'))fail();
 for(const f of def.fields){const param=m.parameters.find(q=>q.id===p.parameters[f.key]);if(!param||param.min<f.min||param.max>f.max)fail();}
 if(def.group==='geometry'&&!m.bodies.some(b=>b.id===p.origin))fail();
 if(def.id==='regular-polygon'&&(!Number.isInteger(p.sides)||p.sides<3||p.sides>12||item.points.length!==p.sides))fail();
}
