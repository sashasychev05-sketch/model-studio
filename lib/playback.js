// Shared by the editor and embedded HTML models. Keep this function self-contained:
// its source is embedded into standalone documents.
export function installSpeedInput(doc){
 const select=doc.getElementById?.('speed');
 if(!select||select.tagName!=='SELECT'||select.parentElement.querySelector('[data-custom-speed]'))return;
 const label=doc.createElement('label');label.className='custom-speed';label.textContent='Скорость × ';
 const input=doc.createElement('input');input.type='number';input.min='0.01';input.max='20';input.step='any';input.value=select.value||'1';input.setAttribute('aria-label','Скорость моделирования вручную');input.dataset.customSpeed='';label.append(input);select.after(label);
 select.addEventListener('change',()=>{input.value=select.value;input.setCustomValidity('');});
 input.addEventListener('input',()=>{input.setCustomValidity('');applySpeed(false);});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();input.dispatchEvent(new Event('change',{bubbles:true}));}});
 function applySpeed(report){
  const speed=Number(input.value);
  if(!Number.isFinite(speed)||speed<.01||speed>20){if(report){input.setCustomValidity('Введите скорость от 0,01 до 20.');input.reportValidity();}return;}
  let option=[...select.options].find(option=>Number(option.value)===speed);
  if(!option){option=select.querySelector('[data-custom-option]')||doc.createElement('option');option.dataset.customOption='';option.value=String(speed);option.textContent=String(speed).replace('.',',')+'×';select.append(option);}
  select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));
 }
 input.addEventListener('change',()=>applySpeed(true));
}
