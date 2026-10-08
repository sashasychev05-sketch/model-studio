import fs from 'node:fs/promises';
const root=new URL('../gallery/',import.meta.url);
const catalog=JSON.parse(await fs.readFile(new URL('catalog.json',root),'utf8'));
export const exampleFolders=catalog.folders;
export const examples=await Promise.all(catalog.models.map(async ({id})=>{
 if(!/^gallery_\w+$/.test(id))throw Error('Некорректный идентификатор примера');
 return JSON.parse(await fs.readFile(new URL(id+'.json',root),'utf8'));
}));
