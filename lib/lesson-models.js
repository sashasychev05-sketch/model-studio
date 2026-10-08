import {emptyModel} from './model.js';
import {paletteCSS} from './theme.js';
import {lessonFormulaCards,lessonFormulaCSS} from './lesson-formulas.js';
import {advanceLessonAnimation} from './lesson-animation.js';

// Pure calculations and fixed SVG coordinates are shared by the documents and tests.
// No viewport is fitted to a current object or to a current graph.
export function lessonDefinitions(){
 const n=(x,d=2)=>(Math.abs(Number(x))<1e-10?0:Number(x)).toLocaleString('ru-RU',{maximumFractionDigits:d});
 const rad=d=>d*Math.PI/180;
 const text=(x,y,s,c='ink',anchor='middle')=>`<text x="${x}" y="${y}" fill="var(--studio-${c})" text-anchor="${anchor}">${s}</text>`;
 const line=(x,y,X,Y,c='muted',dash=false)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="var(--studio-${c})" stroke-width="2"${dash?' stroke-dasharray="6 5"':''}/>`;
 const poly=(pts,c='blue',id='')=>`<polygon ${id?`id="${id}"`:''} points="${pts.map(p=>p.join(',')).join(' ')}" fill="var(--studio-${c})" fill-opacity=".13" stroke="var(--studio-${c})" stroke-width="2"/>`;
 const box=(x,y,w,h,c='blue')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="var(--studio-${c})" fill-opacity=".2" stroke="var(--studio-${c})" stroke-width="2"/>`;
 const dot=(x,y,c='orange')=>`<circle cx="${x}" cy="${y}" r="5" fill="var(--studio-${c})"/>`;
 const arrow=(x,y,X,Y,c='orange')=>{const a=Math.atan2(Y-y,X-x);return line(x,y,X,Y,c)+line(X,Y,X-10*Math.cos(a-.4),Y-10*Math.sin(a-.4),c)+line(X,Y,X-10*Math.cos(a+.4),Y-10*Math.sin(a+.4),c);};
 const ruler=(x,y,unit,caption)=>line(x,y,x+unit,y)+line(x,y-5,x,y+5)+line(x+unit,y-5,x+unit,y+5)+text(x+unit/2,y+25,caption,'muted');
 const series=(fun,x0,x1,X,Y,c='blue',steps=160)=>`<polyline fill="none" stroke="var(--studio-${c})" stroke-width="3" points="${Array.from({length:steps+1},(_,i)=>{const x=x0+(x1-x0)*i/steps;return `${X(x)},${Y(fun(x))}`;}).join(' ')}"/>`;
 const axes=(X,Y,x0,x1,y0,y1,xt,yt)=>{
  let s='';for(let x=x0;x<=x1+1e-8;x+=xt)s+=line(X(x),Y(y0),X(x),Y(y1),'line')+text(X(x),Y(y0)+23,n(x),'muted');
  for(let y=y0;y<=y1+1e-8;y+=yt)s+=line(X(x0),Y(y),X(x1),Y(y),'line')+text(X(x0)-12,Y(y)+5,n(y),'muted','end');
  return s+line(X(x0),Y(0),X(x1),Y(0))+line(X(0),Y(y0),X(0),Y(y1));
 };
 const p=(id,label,min,max,step,value,unit='')=>({id,label,min,max,step,value,unit});
 const quadratic=(a,b,c)=>{if(a===0)return {kind:b===0?'constant':'linear',D:null,vertex:null,roots:b!==0?[-c/b]:c===0?null:[]};const D=b*b-4*a*c,vertex={x:-b/(2*a),y:-D/(4*a)};return {kind:'quadratic',D,vertex,roots:D<0?[]:D===0?[vertex.x]:[(-b-Math.sqrt(D))/(2*a),(-b+Math.sqrt(D))/(2*a)].sort((x,y)=>x-y)};};
 const curve=(fun,state,reference=false)=>{const X=x=>400+x*36,Y=y=>240-y*36;return axes(X,Y,-5,5,-5,5,1,1)+`<defs><clipPath id="plot-clip"><rect x="220" y="60" width="360" height="360"/></clipPath></defs><g clip-path="url(#plot-clip)">`+(reference?`<g opacity=".5" stroke-dasharray="5 5">${series(x=>x*x,-5,5,X,Y,'muted')}</g>`:'')+series(fun,-5,5,X,Y)+(state.vertex?dot(X(state.vertex.x),Y(state.vertex.y),'purple'):'')+(state.roots??[]).map(x=>dot(X(x),Y(0))).join('')+'</g>'+text(590,435,'x','muted')+text(400,40,'y','muted');};
 const physics='https://openstax.org/books/college-physics-2e/pages/';
 const math='https://openstax.org/books/algebra-and-trigonometry-2e/pages/';
 return [
  {key:'newton',title:'Второй закон Ньютона: сила, масса, движение',subject:'physics',topic:'Динамика',grade:'10',
   description:'Сравните разгон двух тел: сила одинакова, массы могут различаться.',
   parameters:[p('force','Равнодействующая F',-6,6,.25,3,'Н'),p('mass','Масса второго тела',1,6,.25,3,'кг'),p('time','Время',0,3,.05,1,'с')],
   animation:{parameter:'time',rate:1,mode:'once',step:.1,label:'Движение тел'},
   formula:'a = F / m; v = at; x = at² / 2',question:'Как изменить силу, чтобы тело массой 3 кг разгонялось так же, как тело массой 1 кг?',
   assumption:'Два тела стартуют из покоя. Постоянная горизонтальная равнодействующая; сопротивления нет. Вертикальные силы уравновешены. Размеры значков тел условны.',
   scale:'Обе дорожки используют одну шкалу −30…30 м. Линейка показывает 10 м.',source:physics+'4-3-newtons-second-law-of-motion-concept-of-a-system',
   calculate:v=>({a1:v.force,a2:v.force/v.mass,x1:v.force*v.time*v.time/2,x2:v.force/v.mass*v.time*v.time/2,v1:v.force*v.time,v2:v.force/v.mass*v.time}),
   draw:(v,s)=>{const X=x=>400+10*x;let out='';for(const [y,m,x,c]of [[170,1,s.x1,'blue'],[310,v.mass,s.x2,'orange']]){out+=line(100,y+27,700,y+27)+box(X(x)-18,y-14,36,28,c)+text(70,y-45,`m = ${n(m)} кг`,'ink','start');for(let k=-30;k<=30;k+=10)out+=line(X(k),y+22,X(k),y+32)+text(X(k),y+55,k,'muted');}return text(400,45,'Одинаковая сила • одинаковое время')+out+text(710,230,'x, м','muted')+ruler(100,425,100,'10 м');},
   readout:(v,s)=>[['Ускорение · 1 кг',n(s.a1)+' м/с²'],['Ускорение · '+n(v.mass)+' кг',n(s.a2)+' м/с²'],['Путь от старта · 1 кг',n(Math.abs(s.x1))+' м'],['Путь от старта · второе тело',n(Math.abs(s.x2))+' м']]},
  {key:'hooke',title:'Закон Гука: пружина и запас энергии',subject:'physics',topic:'Колебания и волны',grade:'all',
   description:'Почему сила линейна по удлинению, а запас энергии растёт как квадрат?',
   parameters:[p('stiffness','Жёсткость k',20,100,5,50,'Н/м'),p('extension','Начальная деформация x₀',-.5,.5,.01,.2,'м'),p('mass','Масса тела m',.5,3,.1,1,'кг'),p('time','Время',0,6,.01,0,'с')],
   animation:{parameter:'time',rate:1,mode:'once',step:.02,label:'Колебания пружины'},
   formula:'Fупр = −kx; Eп = kx² / 2',question:'Увеличьте деформацию вдвое. Во сколько раз изменятся модуль силы и энергия?',
   assumption:'Идеальная горизонтальная пружина в области закона Гука. Тело отпускают из покоя при деформации x₀. Трения нет. x = x₀ cos(√(k/m)t). Нулевая потенциальная энергия при x = 0; полная энергия сохраняется.',
   scale:'Линейка показывает 0,5 м. График E(x): x от −0,5 до 0,5 м; E от 0 до 15 Дж.',source:physics+'16-1-hookes-law-stress-and-strain-revisited',
   calculate:v=>{const omega=Math.sqrt(v.stiffness/v.mass),extension=v.extension*Math.cos(omega*v.time),speed=-v.extension*omega*Math.sin(omega*v.time),energy=v.stiffness*extension**2/2,kinetic=v.mass*speed**2/2;return {extension,speed,force:-v.stiffness*extension,energy,kinetic,total:energy+kinetic,period:2*Math.PI/omega};},
   draw:(v,s)=>{const end=230+200*s.extension,X=x=>430+(x+.5)*320,Y=e=>370-e/15*260;const spring=Array.from({length:17},(_,i)=>[80+(end-80)*i/16,180+(i===0||i===16?0:i%2?15:-15)]);return text(170,50,'Сила возвращает к x = 0')+line(65,130,65,240)+`<polyline points="${spring.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--studio-blue)" stroke-width="3"/>`+box(end-15,157,30,46)+line(230,135,230,260,'muted',true)+text(230,287,'x = 0','muted')+(Math.abs(s.force)>1e-8?arrow(end,235,end+s.force*1.5,235):'')+ruler(100,340,100,'0,5 м')+axes(X,Y,-.5,.5,0,15,.25,5)+series(x=>v.stiffness*x*x/2,-.5,.5,X,Y)+dot(X(s.extension),Y(s.energy))+text(600,65,'Потенциальная энергия, Дж')+text(730,425,'Деформация x, м','muted');},
   readout:(v,s)=>[['Текущая деформация',n(s.extension,3)+' м'],['Сила со знаком',n(s.force)+' Н'],['Потенциальная энергия',n(s.energy)+' Дж'],['Кинетическая энергия',n(s.kinetic)+' Дж'],['Полная энергия',n(s.total)+' Дж'],['Период',n(s.period,3)+' с']]},
  {key:'lever',title:'Рычаг: сила и плечо',subject:'physics',topic:'Статика',grade:'8',
   description:'Исследуйте баланс моментов без искажения длины плеч.',
   parameters:[p('leftForce','Сила слева',5,40,1,20,'Н'),p('leftArm','Плечо слева',.5,3,.1,1.5,'м'),p('rightForce','Сила справа',5,40,1,15,'Н'),p('rightArm','Плечо справа',.5,3,.1,2,'м')],
   formula:'M = Fl; равновесие: F₁l₁ = F₂l₂',question:'Уменьшите правое плечо вдвое. Какая сила справа восстановит равновесие?',
   assumption:'Невесомый жёсткий рычаг, идеальная опора; силы вертикальны. Показано заданное горизонтальное положение и направление результирующего момента, а не анимация вращения.',
   scale:'Линейка показывает 1 м. Плечи нарисованы в одном масштабе; длина стрелок пропорциональна силе.',source:physics+'9-2-the-second-condition-for-equilibrium',
   calculate:v=>({left:v.leftForce*v.leftArm,right:v.rightForce*v.rightArm,delta:v.leftForce*v.leftArm-v.rightForce*v.rightArm}),
   draw:(v,s)=>{const L=400-90*v.leftArm,R=400+90*v.rightArm;return line(L,190,R,190,'blue')+poly([[400,198],[380,238],[420,238]],'muted')+arrow(L,190,L,190+3*v.leftForce,'blue')+arrow(R,190,R,190+3*v.rightForce,'orange')+text(L,160,n(v.leftForce)+' Н','blue')+text(R,160,n(v.rightForce)+' Н','orange')+text((L+400)/2,135,n(v.leftArm)+' м')+text((R+400)/2,135,n(v.rightArm)+' м')+text(400,365,Math.abs(s.delta)<1e-8?'Моменты равны: равновесие':s.delta>0?'Результирующий момент: против часовой стрелки':'Результирующий момент: по часовой стрелке')+ruler(100,420,90,'1 м');},
   readout:(v,s)=>[['Момент слева',n(s.left)+' Н·м'],['Момент справа',n(s.right)+' Н·м'],['Разность моментов',n(s.delta)+' Н·м']]},
  {key:'archimedes',title:'Закон Архимеда: погружение и плотность',subject:'physics',topic:'Гидростатика',grade:'8',
   description:'Меняйте погружение и плотности: когда тело всплывает, а когда тонет?',
   parameters:[p('bodyDensity','Плотность тела',400,1600,25,800,'кг/м³'),p('fluidDensity','Плотность жидкости',700,1300,25,1000,'кг/м³'),p('submerged','Погружённая доля объёма',0,100,1,80,'%')],
   formula:'FА = ρжgVпогр; Fтяж = ρтgV; Vпогр / V = ρт / ρж при плавании',question:'Найдите погружение, при котором тело покоится. Что произойдёт, если плотность тела выше плотности жидкости?',
   assumption:'Прямоугольный брусок объёмом 1 л, несжимаемая жидкость, g = 9,81 м/с². Положение задаёт ползунок: модель показывает силы в этом положении. Дно не рассматривается; сопротивление движению не рассчитывается.',
   scale:'Размеры бруска условны. Обе стрелки используют одинаковый масштаб силы.',source:physics+'11-7-archimedes-principle',
   calculate:v=>({buoyancy:v.fluidDensity*9.81*.001*v.submerged/100,gravity:v.bodyDensity*9.81*.001,fraction:v.bodyDensity/v.fluidDensity}),
   draw:(v,s)=>{const top=210-140*(1-v.submerged/100),cx=240;return box(80,210,320,205,'water')+line(80,210,400,210,'blue')+box(cx-45,top,90,140,'purple')+text(240,50,'Объём тела: 1 л')+text(465,190,'Поверхность жидкости','muted','start')+arrow(cx-15,top+70,cx-15,top+70-5*s.buoyancy,'blue')+arrow(cx+15,top+70,cx+15,top+70+5*s.gravity,'orange')+text(540,255,'↑ Сила Архимеда','blue')+text(540,300,'↓ Сила тяжести','orange')+text(400,455,s.fraction<=1?'Для равновесия погрузите '+n(100*s.fraction)+' % объёма':'Полного погружения недостаточно: тело тонет');},
   readout:(v,s)=>[['Сила Архимеда',n(s.buoyancy)+' Н'],['Сила тяжести',n(s.gravity)+' Н'],['Результат',Math.abs(s.buoyancy-s.gravity)<1e-7?'Равновесие':s.buoyancy>s.gravity?'Всплывает':'Опускается']]},
  {key:'ohm',title:'Закон Ома и нагрев резистора',subject:'physics',topic:'Электричество',grade:'8',
   description:'Ток растёт линейно с напряжением; мощность — квадратично.',
   parameters:[p('voltage','Напряжение U',0,12,.25,6,'В'),p('resistance','Сопротивление R',5,40,1,10,'Ом'),p('time','Время нагрева',0,60,.05,10,'с')],
   animation:{parameter:'time',rate:1,mode:'once',step:1,label:'Ток и выделение теплоты'},
   formula:'I = U/R; P = UI = U²/R; Q = Pt',question:'При постоянном сопротивлении увеличьте напряжение вдвое. Как изменятся ток и выделившаяся теплота?',
   assumption:'Идеальный источник постоянного напряжения, постоянное сопротивление. Q — выделившаяся теплота, не температура: теплоёмкость и охлаждение не моделируются. Движущиеся точки условно обозначают направление тока, а не скорость электронов.',
   scale:'Электрическая схема условная. График: U от 0 до 12 В, I от 0 до 2,5 А; пределы постоянны.',source:physics+'20-4-electric-power-and-energy',
   calculate:v=>({current:v.voltage/v.resistance,power:v.voltage**2/v.resistance,heat:v.voltage**2/v.resistance*v.time}),
   draw:(v,s)=>{const X=u=>435+u/12*305,Y=i=>370-i/2.5*250,path=[[90,205],[90,160],[350,160],[350,340],[90,340],[90,235]],lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1])),total=lengths.reduce((a,b)=>a+b,0);let charges='';if(s.current>0)for(let j=0;j<9;j++){let distance=(j*total/9+v.time*s.current*90)%total,i=0;while(distance>lengths[i]&&i<lengths.length-1)distance-=lengths[i++];const f=distance/lengths[i];charges+=dot(path[i][0]+f*(path[i+1][0]-path[i][0]),path[i][1]+f*(path[i+1][1]-path[i][1]),'blue');}return line(90,160,175,160)+box(175,140,100,40)+line(275,160,350,160)+line(350,160,350,340)+line(350,340,90,340)+line(90,340,90,235)+line(90,160,90,205)+line(65,205,115,205,'blue')+line(77,235,103,235,'blue')+charges+text(225,115,n(v.resistance)+' Ом')+text(160,240,n(v.voltage)+' В')+text(210,405,'Точки условно показывают ток','muted')+axes(X,Y,0,12,0,2.5,3,.5)+series(u=>u/v.resistance,0,12,X,Y)+dot(X(v.voltage),Y(s.current))+text(585,65,'Ток I, А')+text(740,420,'Напряжение U, В','muted');},
   readout:(v,s)=>[['Сила тока',n(s.current)+' А'],['Мощность',n(s.power)+' Вт'],['Выделившаяся теплота',n(s.heat)+' Дж']]},
  {key:'heat',title:'Тепловой баланс: смешивание воды',subject:'physics',topic:'Тепловые явления',grade:'8',
   description:'Почему температура смеси не всегда равна среднему арифметическому?',
   parameters:[p('mass1','Масса первой порции',.1,1,.05,.3,'кг'),p('temp1','Температура первой порции',0,90,1,20,'°C'),p('mass2','Масса второй порции',.1,1,.05,.6,'кг'),p('temp2','Температура второй порции',0,90,1,80,'°C')],
   formula:'T = (m₁T₁ + m₂T₂)/(m₁ + m₂); Q₁ + Q₂ = 0',question:'Смешайте 300 г воды при 20 °C и 600 г при 80 °C. Почему результат ближе к 80 °C?',
   assumption:'Вода: c = 4200 Дж/(кг·°C), одинаковое c у обеих порций. Теплопотерь, теплоёмкости сосуда и фазовых переходов нет. Показано конечное равновесие, скорость смешивания не вычисляется.',
   scale:'У всех термометров одинаковая шкала 0–100 °C. Высота воды пропорциональна массе.',source:physics+'14-2-temperature-change-and-heat-capacity',
   calculate:v=>{const temperature=(v.mass1*v.temp1+v.mass2*v.temp2)/(v.mass1+v.mass2);return {temperature,q1:4200*v.mass1*(temperature-v.temp1),q2:4200*v.mass2*(temperature-v.temp2)};},
   draw:(v,s)=>{let out='';for(const [x,t,m,c,title]of [[130,v.temp1,v.mass1,'blue','Первая порция'],[370,v.temp2,v.mass2,'orange','Вторая порция'],[650,s.temperature,v.mass1+v.mass2,'green','Смесь']]){out+=text(x,55,title)+box(x-65,390-m*100,80,m*100,c)+line(x+40,390,x+40,140)+box(x+35,390-t*2.5,10,t*2.5,c)+text(x,435,n(t)+' °C')+text(x-25,370-m*100,n(m)+' кг','muted');for(let k=0;k<=100;k+=20)out+=line(x+37,390-k*2.5,x+48,390-k*2.5)+text(x+56,395-k*2.5,k,'muted','start');}return out;},
   readout:(v,s)=>[['Температура смеси',n(s.temperature)+' °C'],['Теплота первой порции',n(s.q1)+' Дж'],['Теплота второй порции',n(s.q2)+' Дж']]},
  {key:'pythagoras',title:'Теорема Пифагора: квадраты на сторонах',subject:'math',topic:'Геометрия',grade:'8',
   description:'Площади квадратов на катетах складываются в площадь квадрата на гипотенузе.',
   parameters:[p('a','Катет a',1,6,.1,3,'см'),p('b','Катет b',1,6,.1,4,'см')],
   formula:'c² = a² + b²; c = √(a² + b²)',question:'Получите треугольник 3–4–5. Сохранится ли сумма площадей для катетов 2 и 5?',
   assumption:'Треугольник прямоугольный. Квадраты построены снаружи на всех трёх сторонах. Масштаб един для треугольника и квадратов.',
   scale:'Линейка показывает 1 см. Масштаб общий для всех сторон и квадратов; автоматического увеличения нет.',source:math+'7-2-right-triangle-trigonometry',
   calculate:v=>({c:Math.hypot(v.a,v.b),a2:v.a*v.a,b2:v.b*v.b,c2:v.a*v.a+v.b*v.b}),
   draw:(v,s)=>{const a=22*v.a,b=22*v.b,A=[270,330],B=[270+a,330],C=[270,330-b];return poly([A,B,C],'ink','triangle')+poly([A,B,[270+a,330+a],[270,330+a]],'blue')+poly([A,C,[270-b,330-b],[270-b,330]],'orange')+poly([B,C,[270+b,330-b-a],[270+a+b,330-a]],'green')+text(650,150,'a² = '+n(s.a2)+' см²','blue')+text(650,205,'b² = '+n(s.b2)+' см²','orange')+text(650,260,'c² = '+n(s.c2)+' см²','green')+line(270,317,283,317)+line(283,317,283,330)+text(270+a/2,305,'a = '+n(v.a))+text(270-b-12,330-b/2,'b = '+n(v.b),'ink','end')+ruler(610,420,22,'1 см');},
   readout:(v,s)=>[['Гипотенуза c',n(s.c)+' см'],['a² + b²',n(s.a2)+' + '+n(s.b2)+' = '+n(s.c2)+' см²'],['c²',n(s.c*s.c)+' см²']]},
  {key:'circle',title:'Единичная окружность: синус и косинус',subject:'math',topic:'Тригонометрия',grade:'10',
   description:'Точка движется по окружности; радиус остаётся одним и тем же.',
   parameters:[p('angle','Угол α',0,360,1,45,'°')],
   animation:{parameter:'angle',rate:30,mode:'once',step:5,label:'Обход окружности'},
   formula:'x = cos α; y = sin α; cos²α + sin²α = 1',question:'Почему при 135° косинус отрицателен, а синус положителен? Найдите углы с одинаковым синусом.',
   assumption:'Радиус окружности равен 1. Угол отсчитывается против часовой стрелки от положительной полуоси x. Проекции подписаны со знаком.',
   scale:'Линейка показывает единицу длины. Радиус и начало координат постоянны для всех углов.',source:math+'7-3-unit-circle',
   calculate:v=>({x:Math.cos(rad(v.angle)),y:Math.sin(rad(v.angle))}),
   draw:(v,s)=>{const X=x=>270+150*x,Y=y=>250-150*y,P=[X(s.x),Y(s.y)];return line(70,250,475,250)+line(270,65,270,435)+`<circle id="unit-circle" cx="270" cy="250" r="150" fill="none" stroke="var(--studio-line)" stroke-width="2"/>`+line(270,250,...P,'purple')+`<g id="cosine-guide">${line(...P,P[0],250,'blue',true)}</g><g id="sine-guide">${line(...P,270,P[1],'orange',true)}</g>`+line(270,250,P[0],250,'blue')+line(270,250,270,P[1],'orange')+dot(...P,'purple')+text(490,250,'x','muted')+text(270,50,'y','muted')+text(435,275,'1','muted')+text(100,275,'−1','muted')+text(250,95,'1','muted')+text(250,410,'−1','muted')+text(600,180,'cos α = '+n(s.x,3),'blue')+text(600,235,'sin α = '+n(s.y,3),'orange')+text(600,310,'Радиус = 1','purple')+text(600,355,'α = '+n(v.angle)+'°')+ruler(565,415,150,'1');},
   readout:(v,s)=>[['cos α',n(s.x,4)],['sin α',n(s.y,4)],['cos²α + sin²α',n(s.x*s.x+s.y*s.y,6)]]},
  {key:'quadratic',title:'Парабола: коэффициенты a, b, c и корни',subject:'math',topic:'Функции и графики',grade:'all',
   description:'Меняйте a, b и c независимо: наблюдайте вершину, дискриминант и корни.',
   parameters:[p('a','Коэффициент a',-2,2,.25,1),p('b','Коэффициент b',-5,5,.25,0),p('c','Коэффициент c',-5,5,.25,-1)],
   formula:'y = ax² + bx + c; D = b² − 4ac; x₁,₂ = (−b ± √D)/(2a)',question:'Как меняются корни при изменении c? Подберите a, b, c, чтобы получить один корень. Что происходит при a = 0?',
   assumption:'Пределы обеих осей постоянны; часть графика вне окна обрезается. При a = 0 получается линейная или постоянная функция; формулы вершины параболы и квадратных корней тогда не применяются.',
   scale:'Оси от −5 до 5, масштаб по x и y одинаковый. Увеличения при изменении коэффициентов нет.',source:math+'5-1-quadratic-functions',
   calculate:v=>quadratic(v.a,v.b,v.c),
   draw:(v,s)=>curve(x=>v.a*x*x+v.b*x+v.c,s)+text(650,125,s.vertex?'Вершина: ('+n(s.vertex.x)+'; '+n(s.vertex.y)+')':s.kind==='linear'?'Линейная функция':'Постоянная функция','purple')+text(650,175,'a = '+n(v.a))+text(650,210,'b = '+n(v.b))+text(650,245,'c = '+n(v.c))+text(650,290,s.D===null?'D не применяется':'D = '+n(s.D)),
   readout:(v,s)=>[['Тип графика',s.kind==='quadratic'?(v.a>0?'Ветви вверх':'Ветви вниз'):s.kind==='linear'?'Прямая':'Горизонтальная прямая'],['Вершина',s.vertex?'('+n(s.vertex.x)+'; '+n(s.vertex.y)+')':'Нет вершины параболы'],['Действительные корни',s.roots===null?'Любое x':s.roots.length?s.roots.map(x=>n(x)).join('; '):'Нет корней'],['Дискриминант',s.D===null?'Не применяется':n(s.D)]]},
  {key:'quadratic-shift',title:'Парабола: сдвиги по осям',subject:'math',topic:'Функции и графики',grade:'all',
   description:'Двигайте параболу y = x², сохраняя её форму. Пунктир показывает исходный график.',
   parameters:[p('h','Сдвиг по горизонтали h',-3,3,.05,0),p('k','Сдвиг по вертикали k',-4,4,.05,0)],
   animation:{parameter:'h',rate:.5,mode:'bounce',step:.25,label:'Горизонтальный сдвиг'},
   formula:'y = (x − h)² + k; вершина (h; k)',question:'Почему положительное h сдвигает график вправо, хотя в скобках стоит минус? Что меняется при изменении только k?',
   assumption:'Коэффициент при квадрате всегда равен 1: меняется только положение, форма сохраняется. Серый пунктир — y = x². Границы обеих осей постоянны, части графика вне окна обрезаются. Анимация показывает изменение h, а не движение физического тела.',
   scale:'Оси от −5 до 5, масштаб по x и y одинаковый. Увеличения при сдвиге нет.',source:math+'5-1-quadratic-functions',
   calculate:v=>quadratic(1,-2*v.h,v.h*v.h+v.k),
   draw:(v,s)=>curve(x=>(x-v.h)**2+v.k,s,true)+text(650,125,'Вершина: ('+n(v.h)+'; '+n(v.k)+')','purple')+text(650,180,'h = '+n(v.h))+text(650,220,'k = '+n(v.k))+text(650,300,'Пунктир: y = x²','muted'),
   readout:(v,s)=>[['Вершина','('+n(v.h)+'; '+n(v.k)+')'],['Горизонтальный сдвиг',v.h===0?'Без сдвига':n(Math.abs(v.h))+(v.h>0?' вправо':' влево')],['Вертикальный сдвиг',v.k===0?'Без сдвига':n(Math.abs(v.k))+(v.k>0?' вверх':' вниз')],['Форма','Та же, что у y = x²']]},
  {key:'similarity',title:'Подобие: длины, площадь и квадрат масштаба',subject:'math',topic:'Геометрия',grade:'8',
   description:'Удвоение сторон увеличивает площадь в четыре раза.',
   parameters:[p('factor','Коэффициент подобия k',.5,3,.05,1.5)],
   formula:'a₂ = ka₁; P₂ = kP₁; S₂ = k²S₁',question:'Какой коэффициент подобия увеличит площадь в два раза? А в девять раз?',
   assumption:'Подобные прямоугольные треугольники с катетами 4 и 3 см у исходного треугольника. Оба рисуются в одной системе масштаба, без независимой подгонки.',
   scale:'Линейка показывает 1 см для обеих фигур. Изменение k действительно меняет длины.',source:'https://mathworld.wolfram.com/SimilarTriangles.html',
   calculate:v=>({a:4*v.factor,b:3*v.factor,c:5*v.factor,perimeter:12*v.factor,area:6*v.factor*v.factor}),
   draw:(v,s)=>poly([[110,360],[230,360],[110,270]],'blue','original-triangle')+poly([[410,360],[410+120*v.factor,360],[410,360-90*v.factor]],'orange','scaled-triangle')+text(170,220,'Исходный треугольник','blue')+text(555,80,'Подобный треугольник','orange')+text(170,390,'4 см')+text(88,315,'3 см','ink','end')+text(410+60*v.factor,390,n(s.a)+' см')+text(392,360-45*v.factor,n(s.b)+' см','ink','end')+text(170,420,'S₁ = 6 см²','blue')+text(555,420,'S₂ = '+n(s.area)+' см²','orange')+ruler(70,65,30,'1 см'),
   readout:(v,s)=>[['Коэффициент длин',n(v.factor)],['Периметр второго',n(s.perimeter)+' см'],['Площадь второго',n(s.area)+' см²'],['Отношение площадей',n(v.factor*v.factor)]]}
 ];
}

export function lessonRuntime(key){
 const definition=lessonDefinitions().find(item=>item.key===key),$=id=>document.getElementById(id);
 const animation=definition.animation,parameter=animation?definition.parameters.find(p=>p.id===animation.parameter):null;
 let running=false,position=0,direction=1,last=null,frameId=0,formulaSignature=null;
 function values(){return Object.fromEntries(definition.parameters.map(p=>[p.id,Number($(p.id).value)]));}
 function render(){const v=values(),s=definition.calculate(v);$('scene-content').innerHTML=definition.draw(v,s);$('scene').setAttribute('aria-label',definition.title+'. '+definition.readout(v,s).map(([label,value])=>label+': '+value).join('. '));
  $('readouts').replaceChildren(...definition.readout(v,s).map(([label,value])=>{const el=document.createElement('div'),name=document.createElement('span'),out=document.createElement('strong');name.textContent=label;out.textContent=value;el.append(name,out);return el;}));
  for(const p of definition.parameters)$('out-'+p.id).textContent=v[p.id].toLocaleString('ru-RU',{maximumFractionDigits:2})+(p.unit?' '+p.unit:'');
  const signature=key==='quadratic'?JSON.stringify([v.a,v.b,v.c]):key==='quadratic-shift'?JSON.stringify([v.h,v.k]):key;
  if(signature!==formulaSignature){$('formulas').innerHTML=definition.formulas?'<h2>Формулы и смысл</h2><div class="formula-grid">'+definition.formulas.map(f=>'<article class="formula-card"><h3>'+f.label+'</h3><div class="formula-math"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block">'+f.math+'</math></div><p>'+f.description+'</p></article>').join('')+'</div>':lessonFormulaCards(key,v,s);formulaSignature=signature;}
 }
 function notify(){if(parent!==window)parent.postMessage({type:'model-studio-controls-changed',phase:'change',controls:[...definition.parameters.map(p=>({id:p.id,type:'range',value:String($(p.id).value)})),...(animation?[{id:'speed',type:'select',value:String($('speed').value)}]:[])]},'*');}
 function stop(){running=false;last=null;if(frameId)cancelAnimationFrame(frameId);frameId=0;$('readouts').setAttribute('aria-live','polite');if(animation){$('play').textContent='Запустить';$('play').setAttribute('aria-pressed','false');}}
 function applyPosition(){const value=Math.min(parameter.max,Math.max(parameter.min,parameter.min+Math.round((position-parameter.min)/parameter.step)*parameter.step));$(parameter.id).value=value;render();}
 function frame(timestamp){if(!running)return;const elapsed=last===null?0:Math.min(.1,Math.max(0,(timestamp-last)/1000));last=timestamp;const next=advanceLessonAnimation(position,direction,elapsed,animation.rate*Number($('speed').value),parameter.min,parameter.max,animation.mode);position=next.position;direction=next.direction;applyPosition();if(next.finished){stop();notify();}else frameId=requestAnimationFrame(frame);}
 for(const p of definition.parameters)$(p.id).addEventListener('input',()=>{stop();render();});
 if(animation){
  $('play').onclick=event=>{if(running){stop();if(event.isTrusted)notify();return;}position=Number($(parameter.id).value);direction=1;if(position>=parameter.max&&animation.mode==='once')position=parameter.min;running=true;last=null;$('readouts').setAttribute('aria-live','off');$('play').textContent='Пауза';$('play').setAttribute('aria-pressed','true');applyPosition();frameId=requestAnimationFrame(frame);if(event.isTrusted)notify();};
  $('step').onclick=event=>{stop();position=Number($(parameter.id).value);const next=advanceLessonAnimation(position,direction,animation.step/animation.rate,animation.rate,parameter.min,parameter.max,animation.mode);position=next.position;direction=next.direction;applyPosition();if(event.isTrusted)notify();};
  $('speed').addEventListener('change',()=>{last=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();notify();}});
 }
 $('reset').onclick=event=>{stop();direction=1;for(const p of definition.parameters)$(p.id).value=p.value;render();if(event.isTrusted)notify();};
 render();
}

export function lessonSpec(definition,factory=lessonDefinitions){
 const d=definition,escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const controls=d.parameters.map(p=>`<label class="control" for="${p.id}"><span>${escape(p.label)}<output id="out-${p.id}" for="${p.id}"></output></span><input id="${p.id}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}"></label>`).join('');
 const animationControls=d.animation?`<div class="animation-controls"><div class="animation-caption">${escape(d.animation.label)}</div><button id="play" type="button" aria-pressed="false">Запустить</button><button id="step" type="button">Шаг вперёд</button><label for="speed">Скорость показа</label><select id="speed"><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>`:'';
 const html=`<!doctype html><html lang="ru" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(d.title)}</title><style>
${paletteCSS()}
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:var(--studio-bg);color:var(--studio-ink);font:16px/1.5 system-ui,sans-serif}main{max-width:1050px;margin:auto;padding:24px}h1{font-size:26px;line-height:1.25;margin:0 0 12px}p{margin:0 0 14px}.eyebrow{font-size:13px;color:var(--studio-muted);margin-bottom:10px}.stage{overflow-x:auto;border:1px solid var(--studio-line);border-radius:14px;background:var(--studio-plot)}svg{display:block;width:100%;min-width:600px;aspect-ratio:5/3}svg text{font:16px system-ui,sans-serif}.scale{font-size:13px;color:var(--studio-muted);margin:8px 0 18px}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:18px;border:1px solid var(--studio-line);border-radius:12px}.control{min-width:0}.control>span{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.control output{color:var(--studio-accent);font-variant-numeric:tabular-nums}input[type=range]{width:100%;height:32px;accent-color:var(--studio-accent)}button{font:inherit;background:var(--studio-surface);color:var(--studio-ink);border:1px solid var(--studio-line);border-radius:9px;padding:9px 14px;cursor:pointer}button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--studio-accent);outline-offset:3px}.actions{margin-top:12px}.readouts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.readouts div{padding:12px;border-radius:10px;background:var(--studio-soft)}.readouts span,.readouts strong{display:block}.readouts span{font-size:13px;color:var(--studio-muted)}.readouts strong{font-weight:600;font-variant-numeric:tabular-nums}.formula{padding:14px 18px;border-radius:10px;background:var(--studio-soft);font-size:18px}.question{border-left:3px solid var(--studio-green);padding:10px 16px;margin:16px 0}details{margin-top:16px;color:var(--studio-muted)}summary{cursor:pointer}details p{margin-top:10px}.lab{display:block}.mobile-hint{display:none}@media(min-width:1100px){.lab{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px;align-items:start}.lab .controls{grid-template-columns:1fr}.lab-controls{position:sticky;top:18px}}@media(max-width:650px){main{padding:14px}h1{font-size:23px}.controls,.readouts{grid-template-columns:1fr}.mobile-hint{display:block;font-size:13px;color:var(--studio-muted)}}
${lessonFormulaCSS}
.animation-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px;margin-top:14px;border:1px solid var(--studio-line);border-radius:12px;background:var(--studio-surface)}.animation-caption{flex-basis:100%;font-size:14px;color:var(--studio-muted)}.animation-controls select{font:inherit;color:var(--studio-ink);background:var(--studio-surface);border:1px solid var(--studio-line);border-radius:8px;padding:8px}.animation-controls label{font-size:13px}.animation-controls #play{background:var(--studio-accent);color:var(--studio-onAccent);border-color:var(--studio-accent)}
</style></head><body><main><div class="eyebrow">${d.subject==='math'?'Математика':'Физика'} · ${escape(d.topic)} · ${d.grade==='all'?'8–10 классы':d.grade+' класс'}</div><h1>${escape(d.title)}</h1><p>${escape(d.description)}</p><div class="lab"><div class="lab-scene"><div class="stage"><svg id="scene" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escape(d.title)}"><g id="scene-content"></g></svg></div><p class="mobile-hint">Схему можно прокручивать по горизонтали.</p><p class="scale">${escape(d.scale)}</p></div><div class="lab-controls"><div class="controls">${controls}</div>${animationControls}<div class="actions"><button id="reset" type="button">Исходные параметры</button></div></div></div><div id="readouts" class="readouts" aria-live="polite"></div><section id="formulas" class="formula-section" aria-label="Формулы и смысл"></section><div class="question"><strong>Попробуйте объяснить</strong><p>${escape(d.question)}</p></div><details><summary>Условия и границы модели</summary><p>${escape(d.assumption)}</p><p>Формулы сверены с ${d.source.includes('mathworld')?'Wolfram MathWorld':'OpenStax'}. Раздел: ${escape(d.source)}</p></details></main><script>${lessonFormulaCards.toString()}
${advanceLessonAnimation.toString()}
${factory.toString().replace(/^function\s+\w+/, 'function lessonDefinitions')}
(${lessonRuntime.toString()})(${JSON.stringify(d.key)});
</script></body></html>`;
 return {...emptyModel(),kind:'html',title:d.title,description:d.description,subject:d.subject,grade:d.grade,topic:d.topic,lesson:'Базовые законы и соотношения',notes:d.assumption+'\n'+d.scale+'\nВопрос: '+d.question+'\nИсточник для проверки формул: '+d.source,sourceName:(d.family==='enrichment'?'enrichment/v1/':'lesson-models/v1/')+d.key,previewTheme:'html',html};
}
