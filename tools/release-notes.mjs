export function releaseNotes(markdown,version){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version');
 const sections=markdown.split(/^## /m).slice(1);
 const section=sections.find(text=>text.startsWith(version+' — '));
 if(!section||/черновик|draft/i.test(section.split('\n',1)[0]))throw Error('Missing stable release notes for '+version);
 const body=section.slice(section.indexOf('\n')+1).trim();
 if(!body)throw Error('Empty release notes for '+version);
 return body;
}
