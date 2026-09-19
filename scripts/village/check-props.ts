import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import * as T from 'three';
import {createPropKit,propNames} from '../../src/scripts/village/working-props';
import {addWorkingProps,planWorkingProps,propGroundIssue} from '../../src/scripts/village/prop-placement';
import {makeHomes,prepareGround,ground,localPoint,nearestRoad,nearestSegment,chainshopReplacesHouse,type Point} from '../../src/scripts/village/layout';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const paths=homes.filter(h=>h.number!==chainshopReplacesHouse).map(h=>{const d=[4.6,4.8,4.5][h.style]*h.sz;const front=localPoint(h,0,d/2+.3),road=nearestRoad(front);let points:Point[]=[front,road];for(const other of homes){if(other===h)continue;const q=nearestSegment([other.x,other.z],front,road);if(Math.hypot(q[0]-other.x,q[1]-other.z)<Math.max(other.width,other.depth)*.45){points=[front,[other.x-Math.max(other.width,other.depth)*.7,other.z],road];break;}}return points;});
const kit=createPropKit(),stats:Record<string,unknown>={};
for(const [kind,obj] of Object.entries(kit.models)){let triangles=0;obj.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const attribute of ['position','normal','uv','color'])assert(Array.from(g.attributes[attribute].array).every(Number.isFinite),kind+' invalid '+attribute);}});const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3());assert(size.x>.1&&size.y>.2&&size.z>.025);assert(b.min.y>-.10,kind+' below ground');assert(triangles<15000,kind+' exceeds mesh budget');stats[kind]={triangles,size:size.toArray(),draws:obj.children.length};}
assert.equal(Object.keys(stats).length,20);
const textured=createPropKit(new T.MeshStandardMaterial({map:new T.Texture()}));
for(const kind of Object.keys(propNames) as (keyof typeof propNames)[]){assert.deepEqual(new T.Box3().setFromObject(kit.models[kind]),new T.Box3().setFromObject(textured.models[kind]),kind+' changes shape with atlas');}
const planned=planWorkingProps(homes,kit.models,paths);assert.deepEqual(planned,planWorkingProps(homes,kit.models,paths));
for(const p of planned)assert.equal(propGroundIssue(p.p,homes,paths),null,JSON.stringify(p));
for(const kind of Object.keys(propNames))assert(planned.some(p=>p.kind===kind),'Missing '+kind);
// Regression: each placed broom must touch the terrain and have a second support.
for(const p of planned.filter(p=>p.kind==='broom')){
 assert(p.support,'Broom has no support');assert(Math.abs(p.tilt??0)>.3,'Broom stands upright');
 const matrix=new T.Matrix4().compose(new T.Vector3(p.p[0],ground(...p.p)+(p.lift??0)+.008,p.p[1]),new T.Quaternion().setFromEuler(new T.Euler(p.tilt??0,p.angle,0,'YXZ')),new T.Vector3(1,1,1));
 const support=planned.find(q=>q.kind==='barrel'&&q.group===p.support);let clearance=Infinity,tipClearance=Infinity,contact=Infinity;
 kit.models.broom.traverse(o=>{if(o instanceof T.Mesh){const points=o.geometry.attributes.position;for(let i=0;i<points.count;i++){
  const v=new T.Vector3().fromBufferAttribute(points,i).applyMatrix4(matrix),gap=v.y-ground(v.x,v.z);clearance=Math.min(clearance,gap);if(points.getY(i)>1.35)tipClearance=Math.min(tipClearance,gap);
  if(support&&points.getY(i)>.5){const y=v.y-ground(...support.p)-.008-.12;if(y>.1&&y<.88){const radius=.29+Math.sin(y/.88*Math.PI)*.047+.014;contact=Math.min(contact,Math.abs(Math.hypot(v.x-support.p[0],v.z-support.p[1])-radius));}}
 }}});
 if(support)for(let i=0;i<=40;i++){const t=i/40,v=new T.Vector3(.10*t,.34+1.15*t,.035*t).applyMatrix4(matrix),y=v.y-ground(...support.p)-.008-.12;if(y>.1&&y<.88){const radius=.29+Math.sin(y/.88*Math.PI)*.047+.014;contact=Math.min(contact,Math.abs(Math.hypot(v.x-support.p[0],v.z-support.p[1])-radius-.02));}}
 assert(clearance>-.006&&clearance<.01,'Broom floats or sinks: '+p.home+' '+clearance);
 if(p.support==='ground')assert(Math.abs(tipClearance)<.025,'Broom handle does not rest on ground: '+p.home);
 else {assert(support,'Missing support barrel');assert(contact<.04,'Broom does not touch its barrel: '+p.home+' '+contact);}
}

assert(planned.length>=100,'Insufficient yard distribution');assert(new Set(planned.map(p=>p.home)).size>=35,'Insufficient household coverage');
const scene=new T.Scene(),live=addWorkingProps(scene,homes,undefined,paths);let tris=0;live.root.traverse(o=>{if(o instanceof T.Mesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});assert(live.root.children.length<=6);assert(tris<1000000);
const report={models:stats,placements:live.placements,counts:live.counts,triangles:tris,draws:live.root.children.length};mkdirSync('artifacts/village/props-round-2',{recursive:true});writeFileSync('artifacts/village/props-round-2/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({models:stats,counts:live.counts,triangles:tris,draws:live.root.children.length},null,2));
