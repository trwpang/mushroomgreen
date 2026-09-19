import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeHomes,localPoint} from '../../src/scripts/village/layout';
import {planInterior,seeded} from '../../src/scripts/village/interior-plans';
import {createInteriors} from '../../src/scripts/village/interiors';
import {roomCandidates,inhabitHouses} from '../../src/scripts/village/inhabited-houses';
// Geometry tests do not need raster pixels. Preserve all builder RNG calls with a no-op canvas.
const gradient={addColorStop(){}};
const context=new Proxy({},{get:(_,key)=>key==='createRadialGradient'||key==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
(globalThis as any).document={createElement:()=>({width:256,height:256,getContext:()=>context})};
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8'))).filter(h=>h.number!==5);
let floors=0;
for(const h of homes){
 const scene=new T.Scene(),plan=planInterior(h),rng=seeded(h.number*971+1865);rng();rng();rng();const sy=h.number===22?1:.9+rng()*.21;
 const center=new T.Vector3(h.x,h.height+1.6,h.z);
 assert(roomCandidates(homes,center).some(a=>a.home.number===h.number),'Camera inside must load that house');
 for(let f=0;f<plan.floors.length;f++){
  const controller=createInteriors(scene,true),v=controller.show(h,f);scene.updateMatrixWorld(true);
  const lime=v.group.children.filter(o=>o instanceof T.Mesh&&(o.material as T.Material).userData.surfaceKind==='plaster');
  const timber=v.group.children.filter(o=>o instanceof T.Mesh&&(o.material as T.Material).userData.surfaceKind==='wood');
  const base=.12+f*2.225*sy;
  function ray(x:number,y:number,z:number,dx:number,dy:number,dz:number){
   const origin=new T.Vector3(x,y,z).applyMatrix4(v.group.matrixWorld);
   const direction=new T.Vector3(dx,dy,dz).transformDirection(v.group.matrixWorld);
   return new T.Raycaster(origin,direction,0,1).intersectObjects(lime,false);
  }
  for(const side of [-1,1]){
   // A wall must enclose each gable; both street and rear windows must stay open.
   assert(ray(side*(plan.width/2-.3),base+.7,plan.depth*.20,side,0,0).length>0);
   for(const wx of [-plan.width*.32,plan.width*.32])assert.equal(ray(wx,(f?3.45:1.30)*sy,side*(plan.depth/2-.3),0,0,side).length,0,'Window lining obstructs glazing');
   // Test real mesh faces: a flush frame/wall overlap flickers as the camera settles.
   const low=(f?1.225:1.30)*sy-.45*sy,high=low+.9*sy;
   for(const wx of [-plan.width*.32,plan.width*.32])for(const y of [low-.015,high+.015]){
    const origin=new T.Vector3(wx,y+f*2.225*sy,side*(plan.depth/2-.4)).applyMatrix4(v.group.matrixWorld);
    const direction=new T.Vector3(0,0,side).transformDirection(v.group.matrixWorld);
    const cast=new T.Raycaster(origin,direction,0,1),woodHit=cast.intersectObjects(timber,false)[0],wallHit=cast.intersectObjects(lime,false)[0];
    assert(woodHit&&wallHit,'Window border must cover its plaster edge');
    assert(wallHit.distance-woodHit.distance>.02,`House ${h.number}, floor ${f}: window timber must stand clear of plaster`);
   }
  }
  if(!f)assert.equal(ray(0,.85,plan.depth/2-.3,0,0,1).length,0,'Front door route is blocked');
  assert(!v.group.children.some(o=>o instanceof T.HemisphereLight),'Embedded rooms must not add global ambient lights');
  controller.hide();assert.equal(scene.children.length,0);floors++;
 }
}
assert.equal(floors,74);
assert.equal(roomCandidates(homes,new T.Vector3(0,655,0)).length,0);
const scene=new T.Scene(),stream=inhabitHouses(scene,homes);
for(const h of homes){for(let i=0;i<4;i++)stream.update(new T.Vector3(h.x,h.height+1.6,h.z),4,false);assert(stream.loaded<=4);assert((scene.children[0] as T.Group).children.length<=8);}
stream.update(new T.Vector3(),4,true);assert.equal(scene.children[0].visible,false);
stream.dispose();assert.equal(scene.children.length,0);
console.log('58 village homes / 74 floors: open windows and door routes, enclosed gables, camera-based streaming, overview culling and bounded cache passed.');
