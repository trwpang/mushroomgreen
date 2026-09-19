import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeHomes,prepareGround,localPoint,nearestRoad} from '../../src/scripts/village/layout';
import {planSpringFlowers,flowerClearance,addSpringFlowers} from '../../src/scripts/village/spring-flowers';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const paths=homes.filter(h=>h.number!==5).map(h=>{const p=localPoint(h,0,[4.6,4.8,4.5][h.style]*h.sz/2+.3);return [p,nearestRoad(p)];});
const trees:[number,number][]=[];for(let x=-10;x<32;x+=4)for(let z=0;z<46;z+=4)trees.push([x,z]);
const p=planSpringFlowers(homes,paths,trees);assert(p.bluebells.length>100);assert(p.daffodils.length>20);assert.deepEqual(p,planSpringFlowers(homes,paths,trees));
for(const f of [...p.bluebells,...p.daffodils])assert(flowerClearance(f.p,homes,paths,trees));
const scene=new T.Scene();addSpringFlowers(scene,homes,paths,trees);assert.equal(scene.children.length,2,'Two instanced flower draws');
for(const o of scene.children){const mesh=o as T.InstancedMesh;assert(mesh.count>0);for(const value of mesh.geometry.attributes.position.array)assert(Number.isFinite(value));assert(mesh.geometry.boundingSphere!.radius<.8,'Flowers stay at botanical scale');}
console.log({bluebells:p.bluebells.length,daffodils:p.daffodils.length,draws:scene.children.length,clearance:true,deterministic:true});
