import {app,BrowserWindow,Menu,dialog} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

app.setName('Модельная');
if(process.env.MODEL_STUDIO_PROFILE_DIR)app.setPath('userData',path.resolve(process.env.MODEL_STUDIO_PROFILE_DIR));
let server,mainWindow,origin;
const profile=app.getPath('userData');
const preferences=path.join(profile,'desktop.json');
const here=path.dirname(fileURLToPath(import.meta.url));
const browserOptions={width:1360,height:900,minWidth:390,minHeight:560,title:'Модельная',backgroundColor:'#f6f8fc',show:false,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}};
const internal=url=>{try{return new URL(url).origin===origin;}catch{return false;}};

function protectWindow(window){
 const contents=window.webContents;
 contents.on('will-navigate',(event,url)=>{if(!internal(url))event.preventDefault();});
 contents.on('will-attach-webview',event=>event.preventDefault());
 contents.setWindowOpenHandler(({url})=>{
  if(internal(url)&&['/guide.html','/models.html','/desktop.html'].includes(new URL(url).pathname)){
   const guide=new BrowserWindow({...browserOptions,width:1000,height:800});protectWindow(guide);guide.once('ready-to-show',()=>guide.show());guide.loadURL(url);
  }
  return {action:'deny'};
 });
 contents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 contents.session.setPermissionCheckHandler(()=>false);
 contents.on('will-prevent-unload',event=>{
  const choice=dialog.showMessageBoxSync(window,{type:'question',title:'Есть несохранённые изменения',message:'Закрыть окно без сохранения?',detail:'Чтобы сохранить работу, нажмите «Продолжить работу» и воспользуйтесь кнопкой сохранения или экспортом.',buttons:['Продолжить работу','Закрыть без сохранения'],defaultId:0,cancelId:0});
  if(choice===1)event.preventDefault();
 });
}

async function openWindow(){
 mainWindow=new BrowserWindow({...browserOptions,icon:path.join(here,'icon.ico')});
 protectWindow(mainWindow);mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.on('closed',()=>{mainWindow=null;});
 await mainWindow.loadURL(origin+'/');
}

if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}else if(origin)openWindow();});
 app.on('window-all-closed',()=>app.quit());
 app.on('will-quit',()=>{server?.close();server?.closeAllConnections();});
 app.whenReady().then(async()=>{
 try{
  await fs.mkdir(profile,{recursive:true});
  process.env.MODEL_STUDIO_DATA_DIR=path.join(profile,'library');
  let port=4190;
  try{const saved=JSON.parse(await fs.readFile(preferences,'utf8'));if(Number.isInteger(saved.port)&&saved.port>1023&&saved.port<=65535)port=saved.port;}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  const {startServer}=await import('../server.mjs');
  try{server=await startServer({port});}catch(error){if(error.code!=='EADDRINUSE')throw error;server=await startServer({port:0});}
  port=server.address().port;origin='http://127.0.0.1:'+port;
  await fs.writeFile(preferences,JSON.stringify({port}),'utf8');
  Menu.setApplicationMenu(null);
  await openWindow();
 }catch(error){dialog.showErrorBox('Не удалось открыть Модельную',error.message);app.quit();}
 });
}
