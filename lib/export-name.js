export function fileName(title){
 let name=String(title??'').replace(/[\u0000-\u001f<>:"/\\|?*]/g,'_').trim().slice(0,80).replace(/[. ]+$/,'');
 if(!name)name='модель';
 if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='_'+name;
 return name;
}
export function timestamp(date=new Date()){
 const pad=(v,n=2)=>String(v).padStart(n,'0');
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(),3)}`;
}
export function analysisFileName(dataset,kind,extension){return fileName(String(dataset?.name||'Таблица').replace(/\.(csv|tsv|txt|json)$/i,''))+'-'+kind+'.'+extension;}
