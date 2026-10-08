// Report module-load failures instead of leaving an indefinite loading screen.
import('./app.js').catch(error=>{
 const root=document.querySelector('#app');
 const box=document.createElement('section');box.className='load-error';
 const title=document.createElement('h1');title.textContent='Не удалось загрузить приложение';
 const message=document.createElement('p');message.textContent='Перезапустите локальный сервер и обновите страницу. Убедитесь, что архив распакован полностью и браузер поддерживает JavaScript-модули.';
 const detail=document.createElement('p');detail.textContent=String(error.message).slice(0,300);
 const retry=document.createElement('button');retry.className='btn primary';retry.textContent='Повторить загрузку';retry.onclick=()=>location.reload();
 box.append(title,message,detail,retry);root.replaceChildren(box);
});
