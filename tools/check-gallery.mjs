import {examples,exampleFolders} from '../lib/public-gallery.mjs';
import {validateModel} from '../lib/model.js';
import {validatePhysics,initialState,step,context} from '../lib/engine.js';
import vm from 'node:vm';
let steps=0;
for(const m of examples){const spec=validatePhysics(validateModel(m.spec));if(!exampleFolders.some(f=>f.id===m.folderId))throw Error('Missing folder: '+m.id);if(spec.kind==='html'){for(const script of spec.html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);if(/<script[^>]*\bsrc=|<link[^>]*\bhref=/.test(spec.html))throw Error('External resource in '+m.id);}else{let state=initialState(spec);while(state.t<spec.duration-1e-9){state=step(spec,state,Math.min(spec.dt,spec.duration-state.t));steps++;}for(const [key,value] of Object.entries(context(spec,state)))if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite '+m.id+':'+key);}}
console.log(JSON.stringify({models:examples.length,physics:examples.filter(m=>m.spec.subject==='physics').length,math:examples.filter(m=>m.spec.subject==='math').length,native:examples.filter(m=>m.spec.kind!=='html').length,html:examples.filter(m=>m.spec.kind==='html').length,folders:exampleFolders.length,nativeSteps:steps,errors:0},null,2));
