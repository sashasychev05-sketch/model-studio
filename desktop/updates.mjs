// This controller never installs on normal exit and never closes dirty windows.
// Network/download integrity and optional Authenticode verification are provided
// by electron-updater; the feed is built into app-update.yml by the packager.
export function trustedUpdateSender(event,window,origin){
 if(!window||window.isDestroyed()||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)return false;
 try{const url=new URL(event.senderFrame.url);return url.origin===origin&&url.pathname==='/';}catch{return false;}
}

export function createUpdateController({version,supported,getUpdater,ask,notify,closeForInstall,install,progress}){
 let updater,busy=false,ready=false,state={state:'idle',currentVersion:version,supported};
 const publish=patch=>{state={...state,...patch};notify({...state});};
 const get=()=>({...state});
 async function initialize(){
  if(updater)return updater;
  updater=await getUpdater();
  updater.autoDownload=false;updater.autoInstallOnAppQuit=false;
  updater.allowPrerelease=false;updater.allowDowngrade=false;updater.disableWebInstaller=true;
  updater.on('error',()=>{}); // check/download promises are handled below, including cached-file failures.
  updater.on('download-progress',p=>{const percent=Math.max(0,Math.min(100,Number(p.percent)||0));publish({state:'downloading',percent});progress(percent/100);});
  return updater;
 }
 async function offerInstall(){
  const choice=await ask({type:'question',title:'Обновление готово',message:`Установить Модельную ${state.version}?`,detail:'Приложение закроется и откроется после установки. Сохранённые модели и анализ останутся на этом компьютере. Если есть несохранённые изменения, сначала сохраните их.',buttons:['Продолжить работу','Установить и перезапустить'],defaultId:0,cancelId:0});
  if(choice!==1)return;
  if(!await closeForInstall()){publish({state:'ready'});return;}
  publish({state:'installing'});install(updater);
 }
 async function check({interactive=true}={}){
  if(busy)return get();
  busy=true;
  try{
   if(!supported){
    publish({state:'unsupported'});
    if(interactive)await ask({type:'info',title:'Обновления Модельной',message:'Обновления доступны в установленной Windows-версии.',detail:'Для первого перехода с ZIP-сборки установите Модельную через ModelStudio-Setup. Библиотека будет сохранена.',buttons:['Понятно']});
    return get();
   }
   if(ready){if(interactive)await offerInstall();return get();}
   const engine=await initialize();publish({state:'checking',percent:0});
   const result=await engine.checkForUpdates();
   const info=result?.updateInfo;
   // Stable releases only; the updater also performs full semver comparison.
   const parts=String(info?.version??'').match(/^(\d+)\.(\d+)\.(\d+)$/);
   const current=version.split('.').map(Number);
   const next=parts?.slice(1).map(Number);
   const newer=next&&next.some((n,i)=>n>current[i]&&next.slice(0,i).every((p,k)=>p===current[k]));
   if(!newer){
    publish({state:'current',version});
    if(interactive)await ask({type:'info',title:'Обновления Модельной',message:`Установлена актуальная версия ${version}.`,buttons:['Понятно']});
    return get();
   }
   publish({state:'available',version:info.version});
   if(!interactive)return get();
   const choice=await ask({type:'question',title:'Доступно обновление',message:`Скачать Модельную ${info.version}?`,detail:'Обновление загружается из выпусков проекта на GitHub. Установка потребует отдельного подтверждения.',buttons:['Позже','Скачать'],defaultId:0,cancelId:0});
   if(choice!==1)return get();
   publish({state:'downloading',percent:0});progress(0);
   await engine.downloadUpdate();
   ready=true;publish({state:'ready',percent:100});progress(-1);
   await offerInstall();return get();
  }catch(error){
   progress(-1);ready=false;
   const unpublished=['ERR_UPDATER_NO_PUBLISHED_VERSIONS','ERR_UPDATER_LATEST_VERSION_NOT_FOUND'].includes(error.code);
   const integrity=['ERR_UPDATER_INVALID_SIGNATURE','ERR_CHECKSUM_MISMATCH','ERR_UPDATER_CHECKSUM_MISMATCH'].includes(error.code);
   const message=unpublished?'Выпусков для обновления пока нет.':integrity?'Файл обновления не прошёл проверку. Установка отменена.':'Не удалось проверить или скачать обновление. Проверьте подключение к интернету и повторите попытку.';
   publish({state:'error',message});
   if(interactive)await ask({type:'warning',title:'Обновления Модельной',message,buttons:['Понятно']});
   return get();
  }finally{busy=false;}
 }
 return {get,check};
}
