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
// Objects have a purpose and a nearby partner, rather than only a free footprint.
for(const p of planned){
 assert(p.station,'Object has no working area: '+p.kind);
 const peers=planned.filter(q=>q!==p&&q.home===p.home&&q.group===p.group),near=(kind:string,d:number)=>peers.some(q=>q.kind===kind&&Math.hypot(q.p[0]-p.p[0],q.p[1]-p.p[1])<d);
 if(p.kind==='block')assert(near('woodpile',2),'Axe has no nearby firewood');
 if(p.kind==='basket')assert(near('tub',1.5)||near('sacks',1.5),'Basket is stranded');
 if(p.kind==='washboard')assert(near('tub',.4),'Washboard has no tub');
 if(p.kind==='sacks')assert(p.wallSide&&near('basket',1.5),'Sacks are outside a storage group');
 if(p.kind==='tools')assert.equal(p.support,'wall','Rack must stand against a property');
 if(p.kind==='hayfork'||p.kind==='wheelbarrow')assert(near('tools',2.6),'Garden equipment has no working area');
 if(p.kind==='handcart')assert(near('churn',3),'Delivery cart has no load beside it');
 if(p.kind==='trestles')assert(near('woodpile',2),'Sawing station has no timber');
 if(p.kind==='scuttle')assert.equal(p.support,'coal bunker');
 if(p.kind==='bucket')assert(near('tub',1.5)||near('pump',1.5)||near('barrel',1.5),'Bucket has no water task');
 if(p.kind==='tools'){
  const h=homes.find(h=>h.number===p.home)!,face=[6.4,7.2,9.2][h.style]*h.sx/2+.1375*h.sx;
  const world=new T.Matrix4().compose(new T.Vector3(p.p[0],0,p.p[1]),new T.Quaternion().setFromEuler(new T.Euler(0,p.angle,0)),new T.Vector3(1,1,1));let gap=Infinity;
  kit.models.tools.traverse(o=>{if(o instanceof T.Mesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(world),x=(v.x-h.x)*Math.cos(h.angle)-(v.z-h.z)*Math.sin(h.angle);gap=Math.min(gap,p.wallSide!*x-face);}}});
  assert(gap>=0&&gap<.06,'Rack is not against brickwork');
 }
}
// Regression: the complete broom clears the wall and touches both wall and ground.
for(const p of planned.filter(p=>p.kind==='broom')){
 assert.equal(p.support,'wall');assert(p.wallSide);assert(Math.abs(p.tilt??0)>.3);
 const h=homes.find(h=>h.number===p.home)!,face=[6.4,7.2,9.2][h.style]*h.sx/2+.1375*h.sx;
 const matrix=new T.Matrix4().compose(new T.Vector3(p.p[0],ground(...p.p)+(p.lift??0)+.008,p.p[1]),new T.Quaternion().setFromEuler(new T.Euler(p.tilt??0,p.angle,0,'YXZ')),new T.Vector3(1,1,1));
 let clearance=Infinity,wallGap=Infinity,brushGap=Infinity;
 kit.models.broom.traverse(o=>{if(o instanceof T.Mesh){const points=o.geometry.attributes.position;for(let i=0;i<points.count;i++){
  const v=new T.Vector3().fromBufferAttribute(points,i).applyMatrix4(matrix),gap=v.y-ground(v.x,v.z);clearance=Math.min(clearance,gap);if(points.getY(i)<.3)brushGap=Math.min(brushGap,gap);
  const dx=v.x-h.x,dz=v.z-h.z,x=dx*Math.cos(h.angle)-dz*Math.sin(h.angle);wallGap=Math.min(wallGap,p.wallSide!*x-face);
 }}});
 assert(clearance>-.001&&clearance<.01,'Broom floats or sinks: '+p.home);
 assert(brushGap<.01,'Bristles do not touch ground: '+p.home);
 assert(wallGap>=0&&wallGap<.01,'Broom does not rest against its wall: '+p.home+' '+wallGap);
}
assert(planned.length>=100,'Insufficient yard distribution');assert(new Set(planned.map(p=>p.home)).size>=35,'Insufficient household coverage');
const scene=new T.Scene(),live=addWorkingProps(scene,homes,undefined,paths);let tris=0;live.root.traverse(o=>{if(o instanceof T.Mesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});assert(live.root.children.length<=6);assert(tris<1000000);
const report={models:stats,placements:live.placements,counts:live.counts,triangles:tris,draws:live.root.children.length};mkdirSync('artifacts/village/props-logic',{recursive:true});writeFileSync('artifacts/village/props-logic/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({models:stats,counts:live.counts,triangles:tris,draws:live.root.children.length},null,2));
