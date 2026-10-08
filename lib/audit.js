import {validateModel} from './model.js';
import {validatePhysics,initialState,step,context} from './engine.js';
import {evaluate} from './expression.js';

// Bounded numerical checks. Conservation laws are assertions supplied by the author.
export async function auditModel(input,yieldWork=()=>Promise.resolve()){
 const report={checks:[],seconds:0,steps:0};const add=(status,title,detail)=>report.checks.push({status,title,detail});let m;
 try{m=validatePhysics(validateModel(input));add('pass','Формат и формулы','Модель проходит проверку сохранения.');}catch(e){add('fail','Формат и формулы',e.message);return report;}
 if(m.kind==='html'){add('info','Самостоятельный HTML','Расчёты выполняет сценарий урока. Численные проверки конструктора к нему не применяются.');return report;}
 let s=initialState(m),fine=initialState(m);const start=context(m,s),duration=Math.min(m.duration,2,m.dt*400),initial=(m.invariants??[]).map(q=>evaluate(q.expression,start)),maxDrift=initial.map(()=>0);let residual=0,maxStateError=0;
 try{while(s.t<duration-1e-10){const h=Math.min(m.dt,duration-s.t);s=step(m,s,h);fine=step(m,step(m,fine,h/2),h/2);const c=context(m,s);for(let i=0;i<initial.length;i++)maxDrift[i]=Math.max(maxDrift[i],Math.abs(evaluate(m.invariants[i].expression,c)-initial[i]));for(const b of m.bodies)for(const k of ['x','y','vx','vy'])maxStateError=Math.max(maxStateError,Math.abs(s.bodies[b.id][k]-fine.bodies[b.id][k])/Math.max(1,Math.abs(fine.bodies[b.id][k])));for(const link of m.connections??[])if(link.enabled&&['rope','rod'].includes(link.type)){const a=s.bodies[link.a],b=s.bodies[link.b],distance=Math.hypot(a.x-b.x,a.y-b.y);residual=Math.max(residual,link.type==='rope'?Math.max(0,distance-link.length):Math.abs(distance-link.length));}report.steps++;if(report.steps%20===0)await yieldWork();}report.seconds=s.t;add('pass','Расчёт опыта',report.steps+' шагов; проверен интервал '+s.t.toPrecision(3)+' с.');add(maxStateError<1e-4?'pass':'warn','Чувствительность к шагу','Максимальное нормированное расхождение dt и dt/2: '+maxStateError.toExponential(3)+'. Это оценка сходимости, а не доказательство точности.');if((m.connections??[]).some(l=>l.enabled&&['rope','rod'].includes(l.type)))add(residual<1e-6?'pass':'warn','Длины нитей и стержней','Максимальное нарушение: '+residual.toExponential(3)+' м.');for(let i=0;i<initial.length;i++){const q=m.invariants[i],limit=q.absolute+q.relative*Math.abs(initial[i]);add(maxDrift[i]<=limit?'pass':'warn',q.label,'Отклонение '+maxDrift[i].toExponential(3)+'; допуск '+limit.toExponential(3)+'. Сохранение величины заявлено автором.');}}
 catch(e){add('fail','Расчёт опыта',e.message);}
 if(!(m.invariants??[]).length)add('info','Законы сохранения','Добавьте формулу постоянной величины и допуск. Энергия и импульс сохраняются только при подходящих условиях системы.');
 if(m.bodies.some(b=>b.motion==='force'&&(b.fx!=='0'||b.fy!=='0')))add('info','Авторские силы','Размерности и физический смысл произвольных формул требуют проверки автора.');
 add('info','Допущения',m.notes||'Укажите допущения в пояснении к модели.');return report;
}
