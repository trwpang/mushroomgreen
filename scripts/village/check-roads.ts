import assert from 'node:assert/strict';
import {roadCrossing,addRoadCrossing} from '../../src/scripts/village/road-crossing';
import * as T from 'three';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {roads,villageRoads,outsideRoads,outsideJunction,laneLines,makeHomes,prepareGround,ground,baseGround,nearestRoad,nearestVillageRoad,nearestSegment,streamDistance,streamSurface,roundedLine,type Point} from '../../src/scripts/village/layout';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const inside=(p:Point)=>(p[0]/210)**2+((p[1]+60)/240)**2<.97;
assert.equal(roads.length,6,'Retain the six source village lanes');
assert.equal(outsideRoads.length,2);
assert.deepEqual(villageRoads[4][0],outsideJunction);
for(let i=0;i<roads.length;i++)if(i!==4)assert.deepEqual(villageRoads[i],roads[i]);
assert.deepEqual(villageRoads[4].slice(1),roads[4].slice(1),'Only trim the eastern stub');
let samples=0,minHouseClearance=Infinity,minStreamClearance=Infinity;
for(const route of outsideRoads){
 assert.deepEqual(route[0],outsideJunction,'Both continuations meet the connecting lane');
 assert(inside(route[0])&&!inside(route.at(-1)!),'Each continuation crosses the terrain edge');
 let exits=0,previous=true;
 const line=roundedLine(route);
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
  for(let j=0;j<=n;j++){
   const p:Point=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n];
   const isInside=inside(p);if(previous&&!isInside)exits++;previous=isInside;
   assert(p.every(Number.isFinite));
   if(!isInside)continue;
   const q=nearestRoad(p);assert(Math.hypot(q[0]-p[0],q[1]-p[1])<1e-7,'Terrain/vegetation share the rendered road');
   const dx=p[0]-roadCrossing.centre[0],dz=p[1]-roadCrossing.centre[1],along=dx*roadCrossing.direction[0]+dz*roadCrossing.direction[1],across=-dx*roadCrossing.direction[1]+dz*roadCrossing.direction[0];
   const bridge=Math.abs(along)<=roadCrossing.halfLength&&Math.abs(across)<roadCrossing.halfWidth;
   if(!bridge)assert(Math.abs(ground(...p)-(baseGround(...p)-.15))<.03,'New road is recessed into surveyed ground');
   else assert(roadCrossing.height(along)>streamSurface(...p)+1,'Bridge deck clears the stream');
   const water=streamDistance(...p);minStreamClearance=Math.min(water,minStreamClearance);assert(water>5||bridge,'All water crossings must have a supported deck');
   for(const h of homes){const clearance=Math.hypot(h.x-p[0],h.z-p[1])-Math.max(h.width,h.depth)*.5;minHouseClearance=Math.min(clearance,minHouseClearance);assert(clearance>5,'Road must clear house '+h.number);}
   samples++;
  }
 }
 assert.equal(exits,1,'No island of detached road or dead end within the scene');
}
// Household orientation continues to use the original six-road source network.
for(const h of homes){
 let best:Point=roads[0][0],distance=Infinity;
 for(const line of roads.map(roundedLine))for(let i=1;i<line.length;i++){const q=nearestSegment([h.x,h.z],line[i-1],line[i]);const d=Math.hypot(q[0]-h.x,q[1]-h.z);if(d<distance){best=q;distance=d;}}
 assert.deepEqual(nearestVillageRoad([h.x,h.z]),best);
}
const bridgeRoot=addRoadCrossing(new T.Scene(),new T.Texture());bridgeRoot.updateMatrixWorld(true);
const deck=bridgeRoot.getObjectByName('Continuous dirt and ruts across bridge') as T.Mesh;
const normals=deck.geometry.getAttribute('normal');for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.9,'Deck faces must point up');
const ray=new T.Raycaster();
const centre=roadCrossing.centre;ray.set(new T.Vector3(centre[0],roadCrossing.height(0)+3,centre[1]),new T.Vector3(0,-1,0));
assert(ray.intersectObject(deck).length>0,'The deck must be solid over the stream');
const below=roadCrossing.point(0,8);ray.set(new T.Vector3(below[0],roadCrossing.water+1,below[1]),new T.Vector3(roadCrossing.direction[1],0,-roadCrossing.direction[0]));ray.far=16;
assert.equal(ray.intersectObject(bridgeRoot,true).length,0,'Leave the arch open for flowing water');
let triangles=0,drawCalls=0;bridgeRoot.traverse(o=>{if(o instanceof T.Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o instanceof T.InstancedMesh?o.count:1);drawCalls++;}});
assert(triangles<30000&&drawCalls<=4,'Keep the crossing inexpensive to render');
const result={source:'NLS layer 257 visual trace, northern continuation checked against saved OSM',sourceVillageLanes:roads.length,renderedRoutes:laneLines.length,edgeExits:2,connectedJunction:true,householdSourceNetworkPreserved:true,interiorRoadSamples:samples,minHouseClearance,minStreamClearance:Number.isFinite(minStreamClearance)?minStreamClearance:'outside brook query area',supportedBrookCrossings:1,bridgeTriangles:triangles,bridgeDrawCalls:drawCalls,openArch:true,newTextures:0};
mkdirSync('artifacts/village/outside-road',{recursive:true});writeFileSync('artifacts/village/outside-road/validation.json',JSON.stringify(result,null,2)+'\n');console.log(result);
