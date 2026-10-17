import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialModel,addSpatialObject,duplicateSpatialObject} from '../lib/spatial-authoring.js';
import {solidKinds} from '../lib/spatial-catalog.js';
import {spatialMetrics,solidMesh,spatialProjection,namedSpatialView,zoomSpatialView} from '../lib/spatial.js';
import {validateModel} from '../lib/model.js';
import {validatePhysics,initialState} from '../lib/engine.js';
import {renameReferences} from '../lib/authoring.js';
import {removeMathObject} from '../lib/math-presets.js';
import {spatialSceneSVG} from '../web/spatial-drawing.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function meshVolume(mesh){let total=0;for(const face of mesh.faces)for(let i=1;i<face.length-1;i++){const a=mesh.vertices[face[0]],b=mesh.vertices[face[i]],c=mesh.vertices[face[i+1]];total+=(a.x*(b.y*c.z-b.z*c.y)-a.y*(b.x*c.z-b.z*c.x)+a.z*(b.x*c.y-b.y*c.x))/6;}return total;}
test('All ten solid families and every dimension endpoint validate with finite bounded meshes and a fixed camera',()=>{
 for(const def of solidKinds){const m=spatialModel(def.id),scene=structuredClone(m.scene);validatePhysics(validateModel(m));for(const p of m.parameters)for(const value of [p.min,p.max]){const saved=p.value;p.value=value;validatePhysics(validateModel(m));const item=m.mathObjects[0],mesh=solidMesh(item,m),v=spatialMetrics(item,m);assert.ok(v.volume>0&&v.area>0);assert.ok(mesh.vertices.length<1000&&mesh.faces.length<1000);for(const face of mesh.faces)for(const i of face)assert.ok(Number.isInteger(i)&&i>=0&&i<mesh.vertices.length);for(const point of mesh.vertices)assert.ok(Object.values(point).every(Number.isFinite));assert.ok(meshVolume(mesh)>0,def.id);assert.deepEqual(m.scene,scene);p.value=saved;}}
});
test('Volumes and complete surface areas agree with analytical formulas; polyhedron meshes preserve volume',()=>{
 const pi=Math.PI,expected={cube:[27,54],box:[24,52],sphere:[32*pi/3,16*pi],cylinder:[6.75*pi,13.5*pi],cone:[16*pi/3,2*pi*(2+Math.sqrt(20))],'square-pyramid':[12,9+6*Math.sqrt(18.25)],'triangular-prism':[9*Math.sqrt(3),4.5*Math.sqrt(3)+36],torus:[2*pi*pi*2.5*.7**2,4*pi*pi*2.5*.7]};
 for(const [kind,[volume,area]]of Object.entries(expected)){const m=spatialModel(kind),item=m.mathObjects[0],v=spatialMetrics(item,m);near(v.volume,volume);near(v.area,area);if(['cube','box','square-pyramid','triangular-prism'].includes(kind))near(meshVolume(solidMesh(item,m)),volume);}
 for(const kind of ['regular-prism','regular-pyramid'])for(const sides of [3,4,5,12]){const m=spatialModel();addSpatialObject(m,kind,{sides});const item=m.mathObjects[0],v=spatialMetrics(item,m);near(meshVolume(solidMesh(item,m)),v.volume);}
});
test('Coordinates, rotations and orthographic camera preserve distances and analytical measures',()=>{
 const m=spatialModel('box'),item=m.mathObjects[0],original=spatialMetrics(item,m);item.position={x:4,y:-3,z:7};item.rotation={x:30,y:65,z:-25};const mesh=solidMesh(item,m);near(meshVolume(mesh),original.volume);near(Math.hypot(mesh.vertices[1].x-mesh.vertices[0].x,mesh.vertices[1].y-mesh.vertices[0].y,mesh.vertices[1].z-mesh.vertices[0].z),4);
 const model=structuredClone(m);for(const view of ['front','top','side','iso']){m.scene.view3d=namedSpatialView(m.scene,view);const tr=spatialProjection(m.scene),a=tr.project({x:0,y:0,z:0}),b=tr.project({x:1,y:2,z:3});near(((a.x-b.x)/tr.scale)**2+((a.y-b.y)/tr.scale)**2+(a.depth-b.depth)**2,14);assert.deepEqual(spatialMetrics(item,m),original);if(view==='iso'){const lengths=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}].map(p=>{const q=tr.project(p);return Math.hypot(q.x-a.x,q.y-a.y);});near(lengths[0],lengths[1]);near(lengths[1],lengths[2]);}}
 assert.deepEqual(m.mathObjects,model.mathObjects);assert.equal(zoomSpatialView(m.scene,1e30).zoom,10);assert.equal(zoomSpatialView(m.scene,0).zoom,.1);
});
test('Three-dimensional points, segments and vectors include z in their distances and JSON round trip',()=>{
 const m=spatialModel(),point=addSpatialObject(m,'point3d'),segment=addSpatialObject(m,'segment3d'),vector=addSpatialObject(m,'vector3d');point.position.z=5;near(spatialMetrics(segment,m).length,Math.sqrt(26));near(spatialMetrics(vector,m).length,Math.sqrt(26));vector.b3={...vector.a3};near(spatialMetrics(vector,m).length,0);validatePhysics(validateModel(m));assert.deepEqual(initialState(m),initialState(JSON.parse(JSON.stringify(m))));
});
test('Copies have independent dimensions, coordinates and rotations; rename and deletion preserve external use',()=>{
 const m=spatialModel('cube');let item=m.mathObjects[0];item.position.z=3;item.rotation.x=25;const copy=duplicateSpatialObject(m,item);item=m.mathObjects.find(o=>o.id===item.id);assert.notEqual(copy.dimensions.side,item.dimensions.side);m.parameters.find(p=>p.id===copy.dimensions.side).value=4;near(spatialMetrics(item,m).volume,27);near(spatialMetrics(copy,m).volume,64);copy.position.z=7;near(item.position.z,3);copy.rotation.x=90;near(item.rotation.x,25);
 const id=item.dimensions.side;renameReferences(m,id,'edge');m.parameters.find(p=>p.id===id).id='edge';assert.equal(item.dimensions.side,'edge');validatePhysics(validateModel(m));removeMathObject(m,copy.id);assert.equal(m.parameters.length,1);m.quantities.push({id:'edgeNow',label:'Ребро',unit:'',expression:'edge'});removeMathObject(m,item.id);assert.equal(m.parameters.length,1);validatePhysics(validateModel(m));
});
test('Invalid 3D data, unsafe dimensions, intersecting tori and scene limits fail without partial changes',()=>{
 const m=spatialModel('torus'),item=m.mathObjects[0];item.dimensions.radius='window.alert(1)';assert.throws(()=>validateModel(m));item.dimensions.radius='0.2';assert.throws(()=>validatePhysics(validateModel(m)),/Большой радиус/);item.dimensions.radius='2';item.position.z=Infinity;assert.throws(()=>validateModel(m),/Координаты/);item.position.z=0;m.scene.view3d={yaw:0,pitch:100,zoom:1,x:0,y:0};assert.throws(()=>validateModel(m),/вид/);delete m.scene.view3d;
 for(const [kind,options]of [['regular-prism',{sides:2}],['regular-pyramid',{sides:3.5}],['cube',{values:{side:-1}}]]){const before=structuredClone(m);assert.throws(()=>addSpatialObject(m,kind,options));assert.deepEqual(m,before);}
 const full=spatialModel();for(let i=0;i<16;i++)addSpatialObject(full,'cube');const before=structuredClone(full);assert.throws(()=>addSpatialObject(full,'cube'),/16/);assert.deepEqual(full,before);const physics=spatialModel('cube');physics.subject='physics';assert.throws(()=>validateModel(physics),/математ/);
});
test('Spatial SVG escapes titles, obeys visibility, supports wireframes and includes actual z coordinates',()=>{
 const m=spatialModel('cube'),item=m.mathObjects[0];item.name='<img src=x>';let svg=spatialSceneSVG(m,item.id,false,esc,String);assert.ok(svg.includes('&lt;img'));assert.ok(!svg.includes('<img'));assert.ok(svg.includes('V = 27; S = 54'));assert.ok(!/NaN|Infinity/.test(svg));item.wireframe=true;svg=spatialSceneSVG(m,item.id,false,esc,String);assert.ok(!svg.includes('<polygon'));item.visible=false;svg=spatialSceneSVG(m,item.id,false,esc,String);assert.ok(!svg.includes('data-spatial-object="'+item.id+'"'));const p=addSpatialObject(m,'point3d');p.position={x:1,y:2,z:7};svg=spatialSceneSVG(m,null,false,esc,String);assert.ok(svg.includes('(1; 2; 7)'));
});
