import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import * as T from 'three';
import {createPropKit,propNames} from '../../src/scripts/village/working-props';
import {addWorkingProps,planWorkingProps,propGroundIssue} from '../../src/scripts/village/prop-placement';
import {makeHomes,prepareGround,localPoint,nearestRoad,nearestSegment,chainshopReplacesHouse,type Point} from '../../src/scripts/village/layout';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const paths=homes.filter(h=>h.number!==chainshopReplacesHouse).map(h=>{const d=[4.6,4.8,4.5][h.style]*h.sz;const front=localPoint(h,0,d/2+.3),road=nearestRoad(front);let points:Point[]=[front,road];for(const other of homes){if(other===h)continue;const q=nearestSegment([other.x,other.z],front,road);if(Math.hypot(q[0]-other.x,q[1]-other.z)<Math.max(other.width,other.depth)*.45){points=[front,[other.x-Math.max(other.width,other.depth)*.7,other.z],road];break;}}return points;});
const kit=createPropKit(),stats:Record<string,unknown>={};
for(const [kind,obj] of Object.entries(kit.models)){let triangles=0;obj.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const attribute of ['position','normal','uv','color'])assert(Array.from(g.attributes[attribute].array).every(Number.isFinite),kind+' invalid '+attribute);}});const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3());assert(size.x>.1&&size.y>.2&&size.z>.025);assert(b.min.y>-.10,kind+' below ground');assert(triangles<15000,kind+' exceeds mesh budget');stats[kind]={triangles,size:size.toArray(),draws:obj.children.length};}
assert.equal(Object.keys(stats).length,10);
const planned=planWorkingProps(homes,kit.models,paths);assert.deepEqual(planned,planWorkingProps(homes,kit.models,paths));
for(const p of planned)assert.equal(propGroundIssue(p.p,homes,paths),null,JSON.stringify(p));
for(const kind of Object.keys(propNames))assert(planned.some(p=>p.kind===kind),'Missing '+kind);
const scene=new T.Scene(),live=addWorkingProps(scene,homes,undefined,paths);let tris=0;live.root.traverse(o=>{if(o instanceof T.Mesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});assert(live.root.children.length<=5);assert(tris<180000);
const report={models:stats,placements:live.placements,counts:live.counts,triangles:tris,draws:live.root.children.length};mkdirSync('artifacts/village/props',{recursive:true});writeFileSync('artifacts/village/props/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({models:stats,counts:live.counts,triangles:tris,draws:live.root.children.length},null,2));
