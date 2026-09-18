import assert from 'node:assert/strict';
import { readFileSync,existsSync,writeFileSync } from 'node:fs';
import {prepareGround,streamSurface,makeHomes,project,origin,roads,brooks,localPoint,nearestSegment,chainshopLocation,chainshopPosition,chainshopReplacesHouse,ground,baseGround,streamWidth,streamDistance} from '../../src/scripts/village/layout';
const rows=JSON.parse(readFileSync('dist/households.json','utf8'));
const homes=makeHomes(rows);prepareGround(homes);
assert.equal(homes.length,59);assert.equal(new Set(homes.map(h=>h.number)).size,59);
assert.deepEqual(project(origin),[0,-0]);
assert(project([origin[0]+.001,origin[1]])[1]<0,'North must be negative Z');
assert(project([origin[0],origin[1]+.001])[0]>0,'East must be positive X');
assert.deepEqual(nearestSegment([4,5],[0,0],[10,0]),[4,0]);
assert.deepEqual(nearestSegment([20,5],[0,0],[10,0]),[10,0]);
assert.deepEqual(nearestSegment([1,1],[2,2],[2,2]),[2,2]);
for(const h of homes){
assert([h.x,h.z,h.angle,h.sx,h.sz,h.height].every(Number.isFinite));
assert(h.width>0&&h.depth>0);assert(Math.pow(h.x/210,2)+Math.pow((h.z+60)/240,2)<.97,'House outside scene '+h.number);
assert(existsSync(`dist/households/${h.slug}/index.html`),'Missing household record '+h.number);
const p=localPoint(h,3,4);assert(Math.abs(Math.hypot(p[0]-h.x,p[1]-h.z)-5)<1e-8,'Rotation must preserve metres');
}
assert.deepEqual(chainshopLocation,[52.4754217,-2.0931022]);
assert.deepEqual(chainshopPosition,project(chainshopLocation));
assert.equal(chainshopReplacesHouse,5);
assert(homes.some(h=>h.number===chainshopReplacesHouse),'Keep the historical household record');
let checked=0;for(const line of brooks)for(const p of line){if(Math.abs(p[0])<190&&Math.abs(p[1]+60)<220){assert(streamDistance(...p)<1e-8);assert(streamSurface(...p)-ground(...p)>.40);assert(streamWidth(...p)>1.9);checked++;}}assert(checked>20);
assert(Math.abs(baseGround(0,0)+82-100.2)<1.5,'Smoothed Henry elevation must match survey');
assert(Math.abs(baseGround(...chainshopPosition)+82-100)<1.5,'Forge elevation must match survey');
assert(baseGround(0,0)-baseGround(-80,0)>9,'Keep the measured valley relief');
for(const h of homes.filter(h=>h.number!==chainshopReplacesHouse))for(const [x,z] of [[-2,-1],[2,1]]){const p=localPoint(h,x,z);assert(Math.abs(ground(...p)-(h.height+.1))<.15,'House needs level ground '+h.number);}
for(const line of brooks){let previous=Infinity;for(const p of line){const y=streamSurface(...p);if(Math.abs(p[0])<200&&Math.abs(p[1]+60)<225)assert(y<=previous+.12,'Stream must flow downhill');previous=y;}}
assert.equal(roads.length,6);assert.equal(brooks.length,2);
const result={households:59,uniqueHouseholdIds:true,allRecordsResolve:true,projectionOrientation:true,finiteTransforms:true,allHomesInsideTerrain:true,distancePreserved:true,roads:6,brooks:2,modernForgePin:true,householdRecordRetained:true,streamBedsBelowWater:true,streamSamplesChecked:checked};
writeFileSync('artifacts/village/layout-validation.json',JSON.stringify(result,null,2)+'\n');console.log(result);
