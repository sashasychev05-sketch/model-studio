export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=(value,digits=4)=>Number.isFinite(value)?(value!==0&&(Math.abs(value)<1e-5||Math.abs(value)>1e9)?value.toExponential(digits).replace('.',','):value.toLocaleString('ru-RU',{maximumFractionDigits:digits})):'—';
