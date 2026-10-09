const {contextBridge,ipcRenderer}=require('electron');
// No paths, feed URLs or installation commands are accepted from a renderer.
contextBridge.exposeInMainWorld('modelStudio',Object.freeze({
 checkForUpdates:()=>ipcRenderer.invoke('model-studio:check-updates'),
 updateStatus:()=>ipcRenderer.invoke('model-studio:update-status'),
 onUpdateStatus:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const listener=(_event,status)=>callback(status);
  ipcRenderer.on('model-studio:update-status',listener);
  return ()=>ipcRenderer.removeListener('model-studio:update-status',listener);
 }
}));
