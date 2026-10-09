import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initialize,listLibrary,getModel,operation,AppError,getWorkspace,saveWorkspace,exportBackup,previewBackup,restoreBackup} from './lib/storage.mjs';
import {BACKUP_LIMITS} from './lib/library-backup.mjs';
import {mcp} from './lib/mcp.mjs';
import {validateModel} from './lib/model.js';
import {withHTMLTheme} from './lib/theme.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const previews=new Map();
function sendHTML(res,html,initialControls=[]){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'; sandbox allow-scripts"});res.end(withHTMLTheme(html,'light',initialControls));}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req,limit=16*1024*1024){const parts=[];let bytes=0;for await(const part of req){bytes+=part.length;if(bytes>limit)throw new AppError('Файл слишком большой',413);parts.push(part);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
export async function startServer({port=Number(process.env.MODEL_STUDIO_PORT??4189)}={}){
await initialize();
const server=http.createServer(async(req,res)=>{try{const host=req.headers.host??'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return json(res,403,{error:'Only local access is supported'});const url=new URL(req.url,'http://'+host);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');if(req.method==='POST'){if(req.headers.origin&&req.headers.origin!==url.origin)return json(res,403,{error:'Недопустимый источник'});if(req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Недопустимый источник'});}
 if(url.pathname==='/api/health')return json(res,200,{app:'model-studio',version:2,release:'2.4.0'});
 if(url.pathname==='/api/analysis'&&req.method==='GET')return json(res,200,await getWorkspace());
 if(url.pathname==='/api/analysis'&&req.method==='POST')return json(res,200,await saveWorkspace(await body(req)));
 if(url.pathname==='/api/backup'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="model-studio-backup.json"');return json(res,200,await exportBackup());}
 if(url.pathname==='/api/backup/preview'&&req.method==='POST')return json(res,200,await previewBackup(await body(req,BACKUP_LIMITS.bytes)));
 if(url.pathname==='/api/backup/restore'&&req.method==='POST'){const request=await body(req,BACKUP_LIMITS.bytes);return json(res,200,await restoreBackup(request.backup,request.expectedState));}
 if(url.pathname.startsWith('/api/html/')&&req.method==='GET'){const model=await getModel(url.pathname.slice('/api/html/'.length));if(model.spec.kind!=='html')throw new AppError('Это не HTML-модель',404);return sendHTML(res,model.spec.html,model.spec.initialControls);}
 if(url.pathname==='/api/html-preview'&&req.method==='POST'){const spec=validateModel((await body(req)).spec);if(spec.kind!=='html')throw new AppError('Нужна HTML-модель');for(const [id,p]of previews)if(p.expires<Date.now())previews.delete(id);if(previews.size>=20)previews.delete(previews.keys().next().value);const token=crypto.randomUUID();previews.set(token,{html:spec.html,initialControls:spec.initialControls,expires:Date.now()+3600000});return json(res,200,{url:'/api/html-preview/'+token});}
 if(url.pathname.startsWith('/api/html-preview/')&&req.method==='GET'){const p=previews.get(url.pathname.slice('/api/html-preview/'.length));if(!p||p.expires<Date.now())throw new AppError('Обновите предпросмотр модели',404);return sendHTML(res,p.html,p.initialControls);}
 if(url.pathname==='/api/library'&&req.method==='GET')return json(res,200,await listLibrary());
 if(url.pathname==='/api/library'&&req.method==='POST')return json(res,200,{result:await operation(await body(req))});
 if(url.pathname==='/mcp'&&req.method==='POST'){const value=await mcp(await body(req));if(value===null){res.writeHead(202);return res.end();}return json(res,200,value);}
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 const requested=url.pathname==='/'?'/index.html':url.pathname;
 let file;if(requested.startsWith('/lib/')||requested.startsWith('/web/vendor/'))file=path.join(root,requested);else file=path.join(root,'web',requested);
 if(!file.startsWith(root+path.sep)||requested.includes('..'))return json(res,403,{error:'Forbidden'});
 const ext=path.extname(file),type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'}[ext];if(!type)return json(res,404,{error:'Not found'});
 const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});res.end(content);
 }catch(e){if(e.code==='ENOENT')return json(res,404,{error:'Not found'});console.error(e.message);json(res,e instanceof AppError?e.status:400,{error:e.message??'Не удалось выполнить действие'});}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const server=await startServer();console.log(`Модельная: http://127.0.0.1:${server.address().port}/`);}
 catch(error){console.error(error.message);process.exitCode=1;}
}
