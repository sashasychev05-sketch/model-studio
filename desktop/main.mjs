import {app,BrowserWindow,Menu,dialog,ipcMain} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {createUpdateController,trustedUpdateSender} from './updates.mjs';
import {readLegacyDirectory} from './legacy.mjs';

app.setName('Модельная');
if(process.env.MODEL_STUDIO_PROFILE_DIR)app.setPath('userData',path.resolve(process.env.MODEL_STUDIO_PROFILE_DIR));
let server,mainWindow,origin,updates,installing=false;
let desktopSettings={checkUpdates:true},currentPort;
const saveDesktopSettings=async()=>{const temp=preferences+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify({port:currentPort,...desktopSettings}),'utf8');await fs.rename(temp,preferences);};
const profile=app.getPath('userData');
const preferences=path.join(profile,'desktop.json');
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const browserOptions={width:1360,height:900,minWidth:390,minHeight:560,title:'Модельная',backgroundColor:'#f6f8fc',show:false,autoHideMenuBar:false,webPreferences:{preload:path.join(here,'preload.cjs'),nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}};
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
 for(const event of ['enter-full-screen','leave-full-screen'])mainWindow.on(event,()=>mainWindow?.webContents.send('model-studio:fullscreen',event==='enter-full-screen'));
 mainWindow.webContents.on('before-input-event',(event,input)=>{
  if(input.type==='keyDown'&&(input.key==='F11'||(input.key==='Escape'&&mainWindow?.isFullScreen()))){event.preventDefault();mainWindow.setFullScreen(input.key==='F11'?!mainWindow.isFullScreen():false);}
 });
 mainWindow.on('closed',()=>{mainWindow=null;});
 await mainWindow.loadURL(origin+'/');
}

async function setupUpdates(){
 let installed=false;
 if(app.isPackaged&&process.platform==='win32'){
  try{await fs.access(path.join(path.dirname(process.execPath),'Uninstall ModelStudio.exe'));await fs.access(path.join(process.resourcesPath,'app-update.yml'));installed=true;}catch{}
 }
 updates=createUpdateController({
  version:app.getVersion(),supported:installed,
  getUpdater:async()=>{
   const {autoUpdater}=app.isPackaged?require('./updater-runtime.cjs'):require('electron-updater');
   autoUpdater.on('error',()=>{if(installing){installing=false;openWindow();dialog.showErrorBox('Не удалось установить обновление','Приложение открыто снова. Попробуйте установить обновление позже.');}});
   return autoUpdater;
  },
  ask:async options=>(await dialog.showMessageBox(mainWindow??undefined,options)).response,
  notify:status=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('model-studio:update-status',status);},
  progress:value=>mainWindow?.setProgressBar(value),
  closeForInstall:async()=>{
   // Run the same unsaved-work check as a normal close before starting an installer.
   if(mainWindow&&!mainWindow.isDestroyed()&&!await mainWindow.webContents.executeJavaScript("window.dispatchEvent(new Event('beforeunload',{cancelable:true}))")){
    await dialog.showMessageBox(mainWindow,{type:'info',title:'Сначала сохраните работу',message:'Есть несохранённые изменения.',detail:'Сохраните модель и анализ либо отмените свои правки, затем снова нажмите «Проверить обновления». Загруженный файл останется готовым к установке.',buttons:['Продолжить работу']});return false;
   }
   installing=true;
   for(const window of BrowserWindow.getAllWindows())window.destroy();
   return true;
  },
  install:engine=>engine.quitAndInstall(false,true)
 });
 for(const [channel,handler] of [['model-studio:check-updates',()=>updates.check()],['model-studio:update-status',()=>updates.get()]]){
  ipcMain.handle(channel,(event)=>{if(!trustedUpdateSender(event,mainWindow,origin))throw new Error('Недопустимый источник запроса обновления');return handler();});
 }
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Приложение',submenu:[{label:'Проверить обновления',click:()=>updates.check()},{type:'separator'},{label:'Выход',role:'quit'}]},{label:'Правка',submenu:[{role:'undo',label:'Отменить'},{role:'redo',label:'Повторить'},{type:'separator'},{role:'cut',label:'Вырезать'},{role:'copy',label:'Копировать'},{role:'paste',label:'Вставить'},{role:'selectAll',label:'Выделить всё'}]}]));
 if(installed&&desktopSettings.checkUpdates&&process.env.MODEL_STUDIO_DISABLE_UPDATE_CHECK!=='1')setTimeout(()=>{if(desktopSettings.checkUpdates)updates.check({interactive:false});},15000).unref();
}

function setupApplicationIPC(){
 const handlers={
  'model-studio:fullscreen-state':()=>mainWindow.isFullScreen(),
  'model-studio:toggle-fullscreen':()=>{const next=!mainWindow.isFullScreen();mainWindow.setFullScreen(next);return next;},
  'model-studio:desktop-preferences':()=>({...desktopSettings}),
  'model-studio:set-desktop-preferences':async value=>{
   if(!value||typeof value!=='object'||Object.keys(value).length!==1||typeof value.checkUpdates!=='boolean')throw Error('Некорректная настройка приложения');
   const previous=desktopSettings;desktopSettings={checkUpdates:value.checkUpdates};try{await saveDesktopSettings();}catch(error){desktopSettings=previous;throw error;}return {...desktopSettings};
  },
  'model-studio:choose-legacy-library':async()=>{
   const selection=await dialog.showOpenDialog(mainWindow,{title:'Выберите папку data прежней Модельной',properties:['openDirectory']});
   if(selection.canceled||selection.filePaths.length!==1)return null;
   return readLegacyDirectory(selection.filePaths[0]);
  }
 };
 for(const [channel,handler] of Object.entries(handlers))ipcMain.handle(channel,(event,value)=>{
  if(!trustedUpdateSender(event,mainWindow,origin))throw Error('Недопустимый источник запроса приложения');return handler(value);
 });
}

if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}else if(origin)openWindow();});
 app.on('window-all-closed',()=>{if(!installing)app.quit();});
 app.on('will-quit',()=>{server?.close();server?.closeAllConnections();});
 app.whenReady().then(async()=>{
 try{
  await fs.mkdir(profile,{recursive:true});
  process.env.MODEL_STUDIO_DATA_DIR=path.join(profile,'library');
  let port=4190;
  try{const saved=JSON.parse(await fs.readFile(preferences,'utf8'));if(Number.isInteger(saved.port)&&saved.port>1023&&saved.port<=65535)port=saved.port;if(typeof saved.checkUpdates==='boolean')desktopSettings.checkUpdates=saved.checkUpdates;}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  const {startServer}=await import('../server.mjs');
  try{server=await startServer({port});}catch(error){if(error.code!=='EADDRINUSE')throw error;server=await startServer({port:0});}
  port=server.address().port;origin='http://127.0.0.1:'+port;
  currentPort=port;await saveDesktopSettings();setupApplicationIPC();
  await setupUpdates();
  await openWindow();
 }catch(error){dialog.showErrorBox('Не удалось открыть Модельную',error.message);app.quit();}
 });
}
