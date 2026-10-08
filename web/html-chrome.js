// Refresh editor controls without replacing the iframe and resetting its experiment.
export function refreshHTMLChrome(shell,fresh){
 shell.classList.toggle('present',fresh.querySelector('.html-editor').classList.contains('present'));
 shell.querySelector('#teaching-kit')?.replaceWith(fresh.querySelector('#teaching-kit'));
 shell.querySelector('.editor-header').replaceWith(fresh.querySelector('.editor-header'));
 for(const [selector,parent] of [['.html-tabs','.html-workspace'],['.inspector','.html-main']]){
  const current=shell.querySelector(selector),next=fresh.querySelector(selector);
  if(current&&next)current.replaceWith(next);
  else if(current)current.remove();
  else if(next){const container=shell.querySelector(parent);if(selector==='.html-tabs')container.prepend(next);else container.append(next);}
 }
}
