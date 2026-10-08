import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {examples,exampleFolders} from '../lib/public-gallery.mjs';
import {catalogModels} from '../lib/topics.js';
import {validateModel} from '../lib/model.js';
import {validatePhysics,initialState,context} from '../lib/engine.js';
test('Public library has exactly 20 valid models, balanced subjects and reachable generic folders',()=>{
 assert.equal(examples.length,20);assert.equal(new Set(examples.map(m=>m.id)).size,20);
 assert.equal(examples.filter(m=>m.spec.subject==='physics').length,10);assert.equal(examples.filter(m=>m.spec.subject==='math').length,10);
 for(const m of examples){validatePhysics(validateModel(m.spec));assert.ok(exampleFolders.some(f=>f.id===m.folderId));assert.match(m.spec.sourceName,/^public-gallery\/v1\//);assert.equal(m.spec.grade,'all');context(m.spec,initialState(m.spec));}
 for(const f of exampleFolders){const seen=new Set();let id=f.id;while(id){assert.ok(!seen.has(id));seen.add(id);const parent=exampleFolders.find(x=>x.id===id);assert.ok(parent);id=parent.parentId;}}
});
test('Subject filter combines with topics, folders, search and archive consistently',()=>{
 const library={models:examples.map(m=>({...m,archived:0})),folders:exampleFolders};
 assert.equal(catalogModels(library,{subject:'physics'}).length,10);assert.equal(catalogModels(library,{subject:'math'}).length,10);
 assert.equal(catalogModels(library,{subject:'math',folder:'gallery_physics'}).length,0);
 assert.equal(catalogModels(library,{subject:'physics',search:'волна'}).length,3);
 assert.equal(catalogModels(library,{subject:'math',topic:'Геометрия'}).length,2);
 const altered=structuredClone(library);altered.models.find(m=>m.id==='gallery_newton').archived=1;
 assert.equal(catalogModels(altered,{subject:'physics'}).length,9);assert.equal(catalogModels(altered,{subject:'physics',folder:'trash'}).length,1);
});
test('The actual twelve shipped HTML documents execute and remain finite after manual changes',()=>{
 for(const m of examples.filter(m=>m.spec.kind==='html')){
  const nodes=new Map();const element=()=>({value:'',innerHTML:'',textContent:'',listeners:{},addEventListener(k,fn){this.listeners[k]=fn},setAttribute(){},append(){},replaceChildren(){}});
  const controls=[];
  for(const match of m.spec.html.matchAll(/<input id="([^"]+)" type="range" min="([^"]+)" max="([^"]+)" step="([^"]+)" value="([^"]+)"/g)){const [,id,min,max,,value]=match;nodes.set(id,{...element(),value});nodes.set('out-'+id,element());controls.push({id,min,max,value});}
  assert.ok(controls.length>0,m.id);
  for(const id of ['scene-content','scene','readouts','formulas','play','step','speed','reset'])nodes.set(id,element());nodes.get('speed').value='1';
  const win={},runtime={window:win,parent:win,document:{hidden:false,getElementById:id=>nodes.get(id),createElement:element,addEventListener(){}},requestAnimationFrame(){return 1},cancelAnimationFrame(){}};
  vm.createContext(runtime);for(const match of m.spec.html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],runtime);
  const check=()=>{assert.ok(nodes.get('scene-content').innerHTML.length>20,m.id);assert.doesNotMatch(nodes.get('scene-content').innerHTML,/NaN|Infinity|undefined/,m.id);assert.ok(nodes.get('formulas').innerHTML.length>20,m.id)};
  check();for(const c of controls){for(const value of [c.min,c.max]){nodes.get(c.id).value=value;nodes.get(c.id).listeners.input();check();}nodes.get(c.id).value=c.value;nodes.get(c.id).listeners.input();}
  nodes.get('reset').onclick({isTrusted:false});check();
 }
});
test('Public payload and docs exclude student names, private paths and remote executable resources',async()=>{
 const personal=/[A-Z]:[\\/]Users[\\/]|@gmail\.com|password\s*[:=]|api[_-]?key\s*[:=]/i;
 for(const m of examples){assert.doesNotMatch(JSON.stringify(m),personal);if(m.spec.html)assert.doesNotMatch(m.spec.html,/<script[^>]*\bsrc=|<link[^>]*\bhref=|fetch\(|XMLHttpRequest/);}
 for(const file of ['../README.md','../AGENTS.md','../docs/GUIDE.md','../docs/MODELS.md','../docs/DEVELOPMENT.md'])assert.doesNotMatch(await fs.readFile(new URL(file,import.meta.url),'utf8'),personal,file);
});
