import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {releaseAssets} from './release-assets.mjs';
import {releaseNotes} from './release-notes.mjs';
import {APP_VERSION,RELEASE_CHANNEL} from '../lib/app-info.js';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
const repository='sashasychev05-sketch/model-studio',tag='v'+pkg.version;
if(process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_REF!=='refs/tags/'+tag||!process.env.GITHUB_TOKEN||!process.env.GITHUB_SHA)throw new Error('Publishing requires the matching version tag and GitHub Actions token');
if(APP_VERSION!==pkg.version||RELEASE_CHANNEL!=='stable')throw new Error('Publishing requires matching stable application metadata');
const body=releaseNotes(await fs.readFile('docs/RELEASE.md','utf8'),pkg.version);
const artifacts=await releaseAssets(path.resolve('dist/release'),pkg.version);
const headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
async function api(endpoint,options={}){
 const response=await fetch('https://api.github.com/repos/'+repository+endpoint,{...options,headers:{...headers,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(60000)});
 if(response.status===404)return null;
 if(!response.ok)throw new Error('GitHub release API returned '+response.status);
 return response.status===204?null:response.json();
}
const latest=await api('/releases/latest');
if(latest){
 const current=String(latest.tag_name).replace(/^v/,'').split('.').map(Number),next=pkg.version.split('.').map(Number);
 if(current.some((n,i)=>n>next[i]&&current.slice(0,i).every((p,k)=>p===next[k])))throw new Error('Refusing to replace the update channel with an older release');
}
let release=await api('/releases/tags/'+tag);
if(release&&!release.draft){console.log('Release already published: '+release.html_url);process.exit(0);}
if(release&&release.target_commitish!==process.env.GITHUB_SHA)throw new Error('Existing draft targets a different commit');
if(!release)release=await api('/releases',{method:'POST',body:JSON.stringify({tag_name:tag,target_commitish:process.env.GITHUB_SHA,name:'Модельная '+pkg.version,draft:true,prerelease:false,body})});
for(const asset of artifacts){
 const existing=release.assets?.find(a=>a.name===asset.name);
 if(existing){if(existing.digest!=='sha256:'+createHash('sha256').update(asset.bytes).digest('hex'))throw new Error('Draft already contains a different or unverifiable asset: '+asset.name);continue;}
 const response=await fetch(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(asset.name),{method:'POST',headers:{...headers,'Content-Type':asset.type},body:asset.bytes,signal:AbortSignal.timeout(300000)});
 if(!response.ok)throw new Error('GitHub asset upload returned '+response.status+' for '+asset.name);
 console.log('Uploaded '+asset.name);
}
const published=await api('/releases/'+release.id,{method:'PATCH',body:JSON.stringify({draft:false,make_latest:'true'})});
console.log('Published '+published.html_url);
