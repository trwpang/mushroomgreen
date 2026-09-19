import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {interiorCatalogue,type InteriorObjectId} from '../../src/scripts/village/interior-catalogue';
import {interiorObject} from '../../src/scripts/village/interior-objects';
import {planDressing,objectBounds} from '../../src/scripts/village/interior-dressing';
import {makeHomes} from '../../src/scripts/village/layout';
import {planInterior,seeded} from '../../src/scripts/village/interior-plans';
const stats:Record<string,unknown>={},hashes=new Set<string>(),counts=Object.fromEntries(interiorCatalogue.map(([id])=>[id,0])) as Record<InteriorObjectId,number>;
assert.equal(interiorCatalogue.length,100);assert.equal(new Set(interiorCatalogue.map(a=>a[0])).size,100);
for(const [id]of interiorCatalogue){const asset=interiorObject(id),size=asset.bounds.getSize(new T.Vector3());let triangles=0;const hash=createHash('sha256');
 assert(asset.parts.length>0);assert(Math.abs(asset.bounds.min.y)<1e-6);assert(Math.min(size.x,size.y,size.z)>0);assert(Math.max(size.x,size.y,size.z)<2.1);
 for(const p of asset.parts){for(const key of ['position','normal','uv']){const a=p.geometry.getAttribute(key);assert(a&&[...a.array].every(Number.isFinite),`${id}: invalid ${key}`);}triangles+=p.geometry.getAttribute('position').count/3;hash.update(new Uint8Array(p.geometry.getAttribute('position').array.buffer));}
 assert(triangles<16000,`${id}: too complex`);const digest=hash.digest('hex');assert(!hashes.has(digest),`${id}: duplicate geometry`);hashes.add(digest);stats[id]={triangles,dimensions:size.toArray(),materials:asset.parts.length,sha256:digest};
}
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8'))).filter(h=>h.number!==5),plans=[];let instances=0;
for(const home of homes){const plan=planInterior(home),rng=seeded(home.number*971+1865);rng();rng();rng();const sy=home.number===22?1:.9+rng()*.21;
 for(let floor=0;floor<plan.floors.length;floor++){const placements=planDressing(home,plan,floor,sy);assert.deepEqual(placements,planDressing(home,plan,floor,sy));
  const finish=!floor&&(home.number%3!==0||home.number===22)?(home.number%7===0?'flagstones':'quarry-tiles'):'board-ceiling';counts[finish]++;counts['board-ceiling']++;if(plan.floors[floor].items.some(a=>a.kind==='table')&&home.number%3!==0)counts['rag-rug']++;
  for(const p of placements){counts[p.id]++;instances++;const b=objectBounds(p);assert(b.min.y>=-1e-5);if(p.role==='floor'||p.role==='core')assert(Math.abs(b.min.y)<1e-5,`${home.number}/${p.id}: floor object must touch the room floor`);assert(b.min.x>=-plan.width/2-.001&&b.max.x<=plan.width/2+.001,`${home.number}/${p.id}: outside side wall`);assert(b.min.z>=-plan.depth/2-.001&&b.max.z<=plan.depth/2+.001,`${home.number}/${p.id}: outside end wall`);assert(p.anchor,'Every object needs a support or use anchor');}
  if(!floor){assert(placements.some(p=>p.id.endsWith('range')||p.id==='hob-stove'));assert(placements.some(p=>p.id.endsWith('table')));assert(placements.some(p=>['dresser','drawers','food-cupboard'].includes(p.id)));}
  for(const p of placements.filter(p=>p.role==='surface')){
   const support=placements.find(q=>q.anchor===p.anchor&&(q.role==='core'||q.id==='plate-rack'));
   if(!support)continue; // The existing masonry mantel is checked by the interior builder.
   const group=new T.Group();group.position.set(support.x,support.y,support.z);group.rotation.y=support.angle;group.scale.set(support.sx,support.sy,support.sz);
   const material=new T.MeshBasicMaterial({side:T.DoubleSide});for(const part of interiorObject(support.id).parts)group.add(new T.Mesh(part.geometry,material));group.updateMatrixWorld(true);
   const b=objectBounds(p),center=b.getCenter(new T.Vector3());let contact=false;
   for(const [dx,dz]of [[0,0],[.005,0],[-.005,0],[0,.005],[0,-.005]]){const cast=new T.Raycaster(new T.Vector3(center.x+dx,b.min.y+.015,center.z+dz),new T.Vector3(0,-1,0),0,.04),hit=cast.intersectObject(group,true)[0];if(hit&&Math.abs(hit.point.y-b.min.y)<.006)contact=true;}
   material.dispose();assert(contact,`${home.number}/${floor}/${p.id}: must touch its supporting furniture`);
  }
  assert(placements.filter(p=>p.role==='surface').every(p=>p.anchor.startsWith('rear-wall')||placements.some(a=>a.role==='core'&&a.anchor===p.anchor)||p.anchor.endsWith('-mantel')));
  plans.push({home:home.number,floor,finish,placements});
 }
 assert(plans.filter(p=>p.home===home.number).some(p=>p.placements.some(a=>a.id.endsWith('-bed'))),'Every house needs a bed');
}
const missing=Object.entries(counts).filter(([,count])=>!count).map(([id])=>id);
mkdirSync('artifacts/village/interior-objects',{recursive:true});writeFileSync('artifacts/village/interior-objects/validation.json',JSON.stringify({models:100,homes:homes.length,floors:plans.length,instances,counts,missing,stats,plans},null,2)+'\n');
console.log(JSON.stringify({models:100,homes:homes.length,floors:plans.length,instances,missing,counts},null,2));
assert.deepEqual(missing,[],'Every catalogue object must appear in the village');
