import assert from 'node:assert/strict';
import * as T from 'three';
import {serviceStore} from '../../src/scripts/village/outbuildings';
let triangles=0;
for(let n=1;n<=59;n++){
 const width=1.8+(n%13)/10,depth=1.05+(n%6)/11;
 const g=serviceStore(n,width,depth,1.45+(n%6)/10,18);g.updateMatrixWorld(true);
 assert.equal(g.children.length,4,'Material batching must remain bounded');
 g.traverse(o=>{if(!(o instanceof T.Mesh))return;
  const p=o.geometry.attributes.position;
  assert(Array.from(p.array).every(Number.isFinite));
  assert(o.geometry.attributes.color.count===p.count);
  triangles+=p.count/3;
 });
 const door=g.userData.door;
 assert(door.height>=1.7&&door.width>=.7);
 // Rays from the yard must meet door timber, not a solid masonry box.
 const towardDoor=new T.Raycaster(new T.Vector3(door.x,.95,-3),new T.Vector3(0,0,1));
 const hits=towardDoor.intersectObject(g,true);
 assert(hits.length>0);assert.match((hits[0].object as T.Mesh).material.name,/wood|iron/);
 // Both roof ends must be covered. The high end belongs against the cottage.
 const y=(z:number)=>new T.Raycaster(new T.Vector3(0,4,z),new T.Vector3(0,-1,0)).intersectObject(g,true)[0].point.y;
 assert(y(depth/2-.1)>y(-depth/2+.1)+.2,'Roof must drain away from the cottage');
 // All side-wall joints need solid backing: horizontal rays must never leak through.
 for(const side of [-1,1])for(const z of [-depth*.35,0,depth*.35]){
  const ray=new T.Raycaster(new T.Vector3(side*3,1.1,z),new T.Vector3(-side,0,0));
  assert(ray.intersectObject(g,true).length>0);
 }
 for(const o of g.children){const m=o as T.Mesh;m.geometry.dispose();(m.material as T.Material).dispose();}
}
assert(triangles<600000,'Keep the whole-village store detail within its triangle budget');
console.log(`59 store variants: door access, solid sides, roof drainage and four material batches verified; ${triangles} triangles.`);
