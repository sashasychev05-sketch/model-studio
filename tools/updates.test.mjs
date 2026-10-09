import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createUpdateController,trustedUpdateSender} from '../desktop/updates.mjs';

function fixture({next='2.4.0',choices=[],supported=true,clean=true,downloadError,checkError}={}){
 const engine=new EventEmitter(),asked=[],states=[];
 let checks=0,downloads=0,installs=0,closes=0;
 engine.checkForUpdates=async()=>{checks++;if(checkError)throw checkError;return {updateInfo:{version:next}};};
 engine.downloadUpdate=async()=>{downloads++;engine.emit('download-progress',{percent:42});if(downloadError)throw downloadError;return ['verified-installer.exe'];};
 const controller=createUpdateController({version:'2.3.1',supported,getUpdater:async()=>engine,
  ask:async message=>{asked.push(message);return choices.shift()??0;},notify:s=>states.push(s),progress:()=>{},
  closeForInstall:async()=>{closes++;return clean;},install:()=>{installs++;}});
 return {controller,engine,asked,states,counts:()=>({checks,downloads,installs,closes})};
}

test('Background update check never downloads, prompts or installs',async()=>{
 const f=fixture();await f.controller.check({interactive:false});
 assert.equal(f.controller.get().state,'available');assert.equal(f.asked.length,0);
 assert.deepEqual(f.counts(),{checks:1,downloads:0,installs:0,closes:0});
 assert.equal(f.engine.autoDownload,false);assert.equal(f.engine.autoInstallOnAppQuit,false);
 assert.equal(f.engine.allowDowngrade,false);assert.equal(f.engine.allowPrerelease,false);
});
test('Downloading and installation each require affirmative confirmation',async()=>{
 const decline=fixture();await decline.controller.check();assert.equal(decline.counts().downloads,0);
 const later=fixture({choices:[1,0,1]});await later.controller.check();
 assert.equal(later.controller.get().state,'ready');assert.equal(later.counts().installs,0);
 await later.controller.check();assert.deepEqual(later.counts(),{checks:1,downloads:1,installs:1,closes:1});
 assert.ok(later.states.some(s=>s.state==='downloading'&&s.percent===42));
});
test('Unsaved work prevents installation and retains a downloaded update',async()=>{
 const f=fixture({choices:[1,1],clean:false});await f.controller.check();
 assert.equal(f.controller.get().state,'ready');assert.equal(f.counts().installs,0);assert.equal(f.counts().closes,1);
});
test('Checksum/signature/download failures cannot start an installer',async()=>{
 for(const code of ['ERR_UPDATER_INVALID_SIGNATURE','ERR_CHECKSUM_MISMATCH','ECONNRESET']){
  const f=fixture({choices:[1,1],downloadError:Object.assign(new Error('failure'),{code})});
  await f.controller.check();assert.equal(f.controller.get().state,'error');
  assert.equal(f.counts().installs,0);assert.equal(f.counts().closes,0);
 }
});
test('Older/equal/prerelease versions cannot be offered as stable updates',async()=>{
 for(const next of ['2.3.1','2.3.0','2.2.99','1.99.99','2.4.0-beta.1','invalid']){
  const f=fixture({next,choices:[1,1]});await f.controller.check();
  assert.equal(f.controller.get().state,'current',next);assert.equal(f.counts().downloads,0);
 }
 const newer=fixture({next:'3.0.0'});await newer.controller.check({interactive:false});assert.equal(newer.controller.get().state,'available');
});
test('Offline/unpublished feeds report failure without affecting the library',async()=>{
 const f=fixture({checkError:Object.assign(new Error('404'),{code:'ERR_UPDATER_NO_PUBLISHED_VERSIONS'})});
 await f.controller.check();assert.match(f.controller.get().message,/Выпусков/);assert.equal(f.counts().downloads,0);
 const portable=fixture({supported:false});await portable.controller.check();
 assert.equal(portable.controller.get().state,'unsupported');assert.equal(portable.counts().checks,0);
});
test('Update requests only accept the catalog main frame in the main window',()=>{
 const mainFrame={url:'http://127.0.0.1:4190/'},webContents={mainFrame},window={webContents,isDestroyed:()=>false};
 const sender={sender:webContents,senderFrame:mainFrame};
 assert.equal(trustedUpdateSender(sender,window,'http://127.0.0.1:4190'),true);
 assert.equal(trustedUpdateSender({...sender,senderFrame:{url:mainFrame.url}},window,'http://127.0.0.1:4190'),false);
 assert.equal(trustedUpdateSender({...sender,sender:{}},window,'http://127.0.0.1:4190'),false);
 mainFrame.url='http://127.0.0.1:4190/desktop.html';assert.equal(trustedUpdateSender(sender,window,'http://127.0.0.1:4190'),false);
 mainFrame.url='https://example.com/';assert.equal(trustedUpdateSender(sender,window,'http://127.0.0.1:4190'),false);
});
test('Concurrent clicks cannot start duplicate downloads',async()=>{
 const f=fixture({choices:[1,0]});let finish;
 f.engine.checkForUpdates=()=>new Promise(resolve=>{finish=()=>resolve({updateInfo:{version:'2.4.0'}});});
 const first=f.controller.check();await new Promise(resolve=>setImmediate(resolve));
 await f.controller.check();finish();await first;assert.equal(f.counts().downloads,1);
});
