
const cache=new Map            ();
const functions                                                                  ={sin:{fn:Math.sin,min:1,max:1},cos:{fn:Math.cos,min:1,max:1},tan:{fn:Math.tan,min:1,max:1},sqrt:{fn:Math.sqrt,min:1,max:1},abs:{fn:Math.abs,min:1,max:1},min:{fn:Math.min,min:2,max:8},max:{fn:Math.max,min:2,max:8},pow:{fn:Math.pow,min:2,max:2},exp:{fn:Math.exp,min:1,max:1},log:{fn:Math.log,min:1,max:1},floor:{fn:Math.floor,min:1,max:1},ceil:{fn:Math.ceil,min:1,max:1}};
export function parse(source       )     {
 if(cache.has(source))return cache.get(source) ;
 if(!source||source.length>500)throw new Error('Формула должна содержать от 1 до 500 символов');
 const tokens         =[];const re=/\s*(?:(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z][A-Za-z0-9_]*)|([+\-*/^(),]))/y;
 let pos=0;while(pos<source.length){if(!source.slice(pos).trim())break;re.lastIndex=pos;const match=re.exec(source);if(!match)throw new Error(`Неизвестный символ около «${source.slice(pos,pos+12)}»`);tokens.push(match[1]??match[2]??match[3]);pos=re.lastIndex;if(tokens.length>240)throw new Error('Слишком сложная формула');}
 let i=0;const precedence                      ={'+':1,'-':1,'*':2,'/':2,'^':4};
 function expr(min=0,depth=0)    {if(depth>35)throw new Error('Слишком много вложенных скобок');const tok=tokens[i++];let left    ;
 if(tok==='+'||tok==='-')left={kind:'unary',op:tok,a:expr(3,depth+1)};
 else if(tok==='('){left=expr(0,depth+1);if(tokens[i++]!==')')throw new Error('Не хватает закрывающей скобки');}
 else if(tok&&/^\d|^\./.test(tok))left={kind:'num',value:Number(tok)};
 else if(tok&&/^[A-Za-z]/.test(tok)){if(tokens[i]==='('){if(!functions[tok])throw new Error(`Функция «${tok}» не поддерживается`);i++;const args      =[];if(tokens[i]!==')')while(true){args.push(expr(0,depth+1));if(tokens[i]!==',')break;i++;}if(tokens[i++]!==')')throw new Error('Проверьте скобки функции');const f=functions[tok];if(args.length<f.min||args.length>f.max)throw new Error(`Проверьте число аргументов ${tok}`);left={kind:'call',name:tok,args};}else left={kind:'var',name:tok};}
 else throw new Error('Ожидалось число, величина или скобка');
 while(i<tokens.length){const op=tokens[i],p=precedence[op];if(p===undefined||p<min)break;i++;left={kind:'binary',op,a:left,b:expr(op==='^'?p:p+1,depth+1)};}return left;}
 const ast=expr();if(i!==tokens.length)throw new Error(`Лишний символ «${tokens[i]}»`);if(cache.size>300)cache.clear();cache.set(source,ast);return ast;
}
export function dependencies(source       )         {const out=new Set        ();function visit(a    ){if(a.kind==='var')out.add(a.name);else if(a.kind==='binary'){visit(a.a);visit(a.b);}else if(a.kind==='unary')visit(a.a);else if(a.kind==='call')a.args.forEach(visit);}visit(parse(source));return [...out];}
export function evaluate(source       ,context                      )        {
 let budget=1000;function run(a    )        {if(--budget<0)throw new Error('Слишком сложный расчёт');let v       ;
 if(a.kind==='num')v=a.value;else if(a.kind==='var'){if(a.name==='pi')v=Math.PI;else if(a.name==='e')v=Math.E;else if(Object.hasOwn(context,a.name))v=context[a.name];else throw new Error(`Величина «${a.name}» не определена`);}
 else if(a.kind==='unary')v=(a.op==='-'?-1:1)*run(a.a);
 else if(a.kind==='call')v=functions[a.name].fn(...a.args.map(run));
 else{const x=run(a.a),y=run(a.b);switch(a.op){case '+':v=x+y;break;case '-':v=x-y;break;case '*':v=x*y;break;case '/':if(y===0)throw new Error('Деление на ноль');v=x/y;break;default:v=x**y;}}
 if(!Number.isFinite(v)||Math.abs(v)>1e100)throw new Error('Результат вне допустимого диапазона');return v;}
 return run(parse(source));
}
