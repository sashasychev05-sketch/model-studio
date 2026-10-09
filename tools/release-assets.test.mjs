import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {releaseAssets} from './release-assets.mjs';
test('Release publication rejects wrong versions, damaged files and unexpected download paths',async()=>{
 const folder=path.resolve('work','release-validation-'+crypto.randomUUID());await fs.mkdir(folder,{recursive:true});
 const name='ModelStudio-Setup-2.3.1-x64.exe',bytes=Buffer.from('test installer'),sha512=createHash('sha512').update(bytes).digest('base64');
 const manifest={version:'2.3.1',path:name,sha512,files:[{url:name,sha512,size:bytes.length}]};
 await fs.writeFile(path.join(folder,name),bytes);await fs.writeFile(path.join(folder,name+'.blockmap'),'map');
 const write=value=>fs.writeFile(path.join(folder,'latest.yml'),JSON.stringify(value));await write(manifest);
 assert.equal((await releaseAssets(folder,'2.3.1')).length,3);
 await assert.rejects(releaseAssets(folder,'2.4.0'),/match release/);
 await write({...manifest,files:[{...manifest.files[0],url:'https://example.com/installer.exe'}]});await assert.rejects(releaseAssets(folder,'2.3.1'),/match release/);
 await write(manifest);await fs.writeFile(path.join(folder,name),'damaged');await assert.rejects(releaseAssets(folder,'2.3.1'),/checksum/);
});
