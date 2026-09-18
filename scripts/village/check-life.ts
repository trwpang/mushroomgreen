import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {makeHomes,prepareGround,localPoint,nearestRoad,nearestSegment,chainshopReplacesHouse,type Point} from '../../src/scripts/village/layout';
import {addVillageLife,lifePlacementIssue,planVillageLife} from '../../src/scripts/village/village-life';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const paths=homes.filter(h=>h.number!==chainshopReplacesHouse).map(h=>{const d=[4.6,4.8,4.5][h.style]*h.sz;const front=localPoint(h,0,d/2+.3),road=nearestRoad(front);let points:Point[]=[front,road];for(const other of homes){if(other===h)continue;const q=nearestSegment([other.x,other.z],front,road);if(Math.hypot(q[0]-other.x,q[1]-other.z)<Math.max(other.width,other.depth)*.45){points=[front,[other.x-Math.max(other.width,other.depth)*.7,other.z],road];break;}}return points;});
const scene=new T.Scene(),life=addVillageLife(scene,homes,paths);
assert.equal(life.stats.hens,9,'Three modest groups of three hens');assert.equal(life.stats.cats,1,'One workshop cat');assert.equal(life.stats.henYards,3);
assert.deepEqual(life.placements,planVillageLife(homes,paths),'Placements must remain deterministic');
for(const a of life.placements){assert.equal(lifePlacementIssue(a.p,homes,paths),null,`Unsafe placement ${JSON.stringify(a)}`);for(const b of life.placements){if(a===b)continue;assert(Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])>.55,'Animal footprints overlap');}}
const pose=()=>{const values:number[]=[];scene.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return values;};
life.update(4);const still=pose();life.update(4);assert.deepEqual(pose(),still,'Paused/shared clock must produce identical poses');life.update(4.5);assert.notDeepEqual(pose(),still,'Motion must advance with shared time');life.update(4);assert.deepEqual(pose(),still,'Seeking must restore the same pose');
let meshes=0,triangles=0;scene.traverse(o=>{if(o instanceof T.Mesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));}});
assert(meshes<100,'Small wildlife pass must stay within its draw budget');assert(triangles<120000);
const report={...life.stats,meshes,triangles,placements:life.placements,clearOfWorkingAreas:true,sharedClockDeterministic:true};writeFileSync('artifacts/village/life-validation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
