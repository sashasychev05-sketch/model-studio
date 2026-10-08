export const topicGroups=[{subject:'physics',label:'Физика',topics:['Кинематика','Динамика','Статика','Гидростатика','Гравитация','Работа и энергия','Импульс и столкновения','Колебания и волны','Электромагнитные волны','Тепловые явления','Электричество','Магнитные поля','Оптика']},{subject:'math',label:'Математика',topics:['Геометрия','Алгебра','Тригонометрия','Функции и графики','Математический анализ','Линейная алгебра','Комплексные числа','Вероятность','Статистика','Динамические системы']}];
export const standardTopics=topicGroups.flatMap(group=>group.topics);
export function modelTopic(spec){if(spec.topic?.trim())return spec.topic.trim();const text=`${spec.title} ${spec.lesson} ${spec.description}`.toLowerCase(),preview=spec.previewTheme;
 if(['trapezoid','rectangle'].includes(preview)||/трапец|прямоуголь|геометр/.test(text))return 'Геометрия';
 if(['glass','cloth','boiling','humidity'].includes(preview)||/конденсац|испарен|нагрев|кипен|влажност|теплов/.test(text))return 'Тепловые явления';
 if(preview==='collision'||/импульс|столкнов|упругих уда/.test(text))return 'Импульс и столкновения';
 if(preview==='slope'||/работа и энерг/.test(text))return 'Работа и энергия';
 if(['force','belt'].includes(preview)||/сил[аы] |трени|конвейер/.test(text))return 'Динамика';
 if(/пружин|колебан|волн/.test(text))return 'Колебания и волны';
 if(/ома|электр|ток|напряжени/.test(text))return 'Электричество';
 if(/свет|линз|оптик/.test(text))return 'Оптика';
 if(/парабол|функци|график/.test(text)&&spec.subject==='math')return 'Функции и графики';
 if(/алгебр|уравнен/.test(text)&&spec.subject==='math')return 'Алгебра';
 if(/вероятност/.test(text))return 'Вероятность';
 if(/брос|движени|скорост|кинемат/.test(text)&&spec.subject==='physics')return 'Кинематика';
 return 'Без темы';
}
export function folderPath(folders,id){const path=[],seen=new Set();while(id&&!seen.has(id)){seen.add(id);const folder=folders.find(item=>item.id===id);if(!folder)break;path.unshift(folder);id=folder.parentId;}return path;}
export function folderDefaults(folders,id){const names=folderPath(folders,id).map(f=>f.name),text=names.join(' ');return {grade:/8\s*класс/.test(text)?'8':/10\s*класс/.test(text)?'10':'all',subject:/математ|геометр|алгебр|функци/i.test(text)?'math':'physics',topic:[...names].reverse().find(name=>standardTopics.includes(name))??''};}
export function catalogModels(library,filters){const {folder='all',grade='all',subject='all',topic='all',search='',sort='recent'}=filters;const descendant=new Set([folder]);let progress=true;while(progress){progress=false;for(const f of library.folders)if(descendant.has(f.parentId)&&!descendant.has(f.id)){descendant.add(f.id);progress=true;}}
 const query=search.trim().toLocaleLowerCase('ru');const models=library.models.filter(model=>(subject==='all'||model.spec.subject===subject)&&(folder==='trash'?!!model.archived:!model.archived)&&(folder==='all'||folder==='trash'||descendant.has(model.folderId))&&(grade==='all'||model.spec.grade===grade||model.spec.grade==='all')&&(topic==='all'||modelTopic(model.spec)===topic)&&`${model.spec.title} ${model.spec.description} ${model.spec.lesson} ${modelTopic(model.spec)} ${folderPath(library.folders,model.folderId).map(f=>f.name).join(' ')}`.toLocaleLowerCase('ru').includes(query));
 const title=(a,b)=>a.spec.title.localeCompare(b.spec.title,'ru',{numeric:true});return models.sort(sort==='title'?title:sort==='topic'?(a,b)=>modelTopic(a.spec).localeCompare(modelTopic(b.spec),'ru')||title(a,b):(a,b)=>(b.updatedAt??'').localeCompare(a.updatedAt??'')||title(a,b));
}
