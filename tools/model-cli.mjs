import fs from 'node:fs/promises';
const [command,...args]=process.argv.slice(2),origin=process.env.MODEL_STUDIO_URL??'http://127.0.0.1:4189';
async function api(a){const r=await fetch(origin+'/api/library',a?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)}:{});const v=await r.json();if(!r.ok)throw new Error(v.error);return a?v.result:v;}
if(command==='list'){const l=await api();console.log(JSON.stringify({folders:l.folders,models:l.models.map(m=>({id:m.id,title:m.spec.title,revision:m.revision,folderId:m.folderId,archived:m.archived}))},null,2));}
else if(command==='get'){const l=await api(),m=l.models.find(m=>m.id===args[0]);if(!m)throw new Error('Model not found');if(args[1])await fs.writeFile(args[1],JSON.stringify(m,null,2));else console.log(JSON.stringify(m,null,2));}
else if(command==='save'){const input=JSON.parse(await fs.readFile(args[0],'utf8'));const result=await api({action:'save',spec:input.spec??input,id:input.id,expectedRevision:input.revision,folderId:input.folderId??null});console.log(JSON.stringify({id:result.id,title:result.spec.title,revision:result.revision},null,2));}
else if(command==='folder'){console.log(JSON.stringify(await api({action:'createFolder',name:args[0],parentId:args[1]??null}),null,2));}
else console.log('Usage: node tools/model-cli.mjs list | get ID [FILE] | save FILE | folder NAME [PARENT_ID]');
