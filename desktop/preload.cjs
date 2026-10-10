const {contextBridge,ipcRenderer}=require('electron');
// No paths, feed URLs or installation commands are accepted from a renderer.
contextBridge.exposeInMainWorld('modelStudio',Object.freeze({
 applicationInfo:()=>ipcRenderer.invoke('model-studio:application-info'),
 revealExport:id=>ipcRenderer.invoke('model-studio:reveal-export',id),
 onExportReady:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const listener=(_event,value)=>callback(value);ipcRenderer.on('model-studio:export-ready',listener);
  return ()=>ipcRenderer.removeListener('model-studio:export-ready',listener);
 },
 chooseLegacyLibrary:()=>ipcRenderer.invoke('model-studio:choose-legacy-library'),
 toggleFullscreen:()=>ipcRenderer.invoke('model-studio:toggle-fullscreen'),
 fullscreenState:()=>ipcRenderer.invoke('model-studio:fullscreen-state'),
 desktopPreferences:()=>ipcRenderer.invoke('model-studio:desktop-preferences'),
 setDesktopPreferences:value=>ipcRenderer.invoke('model-studio:set-desktop-preferences',value),
 onFullscreen:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const listener=(_event,value)=>callback(value);ipcRenderer.on('model-studio:fullscreen',listener);
  return ()=>ipcRenderer.removeListener('model-studio:fullscreen',listener);
 },
 checkForUpdates:()=>ipcRenderer.invoke('model-studio:check-updates'),
 updateStatus:()=>ipcRenderer.invoke('model-studio:update-status'),
 onUpdateStatus:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const listener=(_event,status)=>callback(status);
  ipcRenderer.on('model-studio:update-status',listener);
  return ()=>ipcRenderer.removeListener('model-studio:update-status',listener);
 }
}));
