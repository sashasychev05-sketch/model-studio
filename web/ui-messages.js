export function showDialogError(error,dialog=document.querySelector('#dialog')){
 if(!dialog?.open)return false;
 let target=dialog.querySelector('.dialog-error');
 if(!target){target=document.createElement('p');target.className='dialog-error';target.setAttribute('role','alert');dialog.querySelector('.dialog-content').append(target);}
 target.hidden=false;target.textContent=error?.message??String(error);return true;
}
export function clearDialogError(dialog){const target=dialog?.querySelector('.dialog-error');if(target){target.hidden=true;target.textContent='';}}
