import * as T from 'three';
import {createInteriors} from './interiors';
import {planInterior} from './interior-plans';
import type {Home} from './layout';

type Rooms=ReturnType<typeof createInteriors>[];
/** Camera-based room streaming: the orbit target may be on the far side of a house. */
export function roomCandidates(homes:Home[],camera:T.Vector3){
 return homes.filter(h=>h.number!==5).map(h=>{
  const dx=camera.x-h.x,dz=camera.z-h.z,c=Math.cos(h.angle),s=Math.sin(h.angle);
  const x=dx*c-dz*s,z=dx*s+dz*c;
  const width=[6.4,7.2,9.2][h.style]*h.sx,depth=[4.6,4.8,4.5][h.style]*h.sz;
  const distance=Math.hypot(Math.max(0,Math.abs(x)-width/2),Math.max(0,Math.abs(z)-depth/2));
  return {home:h,distance,inside:Math.abs(x)<width/2&&Math.abs(z)<depth/2};
 }).filter(a=>a.distance<14&&camera.y<a.home.height+(a.home.style===1?8:6)&&camera.y>a.home.height-2)
 .sort((a,b)=>a.distance-b.distance).slice(0,4);
}
export function inhabitHouses(scene:T.Scene,homes:Home[]){
 const root=new T.Group();root.name='Village furnished rooms';scene.add(root);
 const cache=new Map<number,{group:T.Group;rooms:Rooms;used:number}>();let tick=0;
 function update(camera:T.Vector3,time:number,inspecting:boolean){
  root.visible=!inspecting;if(inspecting)return false;
  const candidates=roomCandidates(homes,camera),wanted=new Set(candidates.map(a=>a.home.number));
  let changed=false;tick++;
  for(const [number,entry]of cache){const visible=wanted.has(number);if(entry.group.visible!==visible)changed=true;entry.group.visible=visible;}
  // Build at most one cottage per frame. Rooms closest to the camera take priority.
  const missing=candidates.find(a=>!cache.has(a.home.number));
  if(missing){
   const h=missing.home,group=new T.Group();group.name=`House ${h.number} furnished floors`;root.add(group);
   const rooms=planInterior(h).floors.map((_,floor)=>{const room=createInteriors(group,true);room.show(h,floor);return room;});
   cache.set(h.number,{group,rooms,used:tick});changed=true;
  }
  for(const n of wanted){const e=cache.get(n);if(e){e.used=tick;e.rooms.forEach(r=>r.update(time));}}
  // Keep a small warm cache to avoid rebuilding during short camera reversals.
  while(cache.size>8){const oldest=[...cache].filter(([n])=>!wanted.has(n)).sort((a,b)=>a[1].used-b[1].used)[0];if(!oldest)break;
   oldest[1].rooms.forEach(r=>r.hide());root.remove(oldest[1].group);cache.delete(oldest[0]);changed=true;
  }
  return changed;
 }
 return {update,get loaded(){return [...cache.values()].filter(e=>e.group.visible).length;},
  get floors(){return [...cache.values()].filter(e=>e.group.visible).reduce((n,e)=>n+e.rooms.length,0);},
  dispose(){for(const e of cache.values())e.rooms.forEach(r=>r.hide());cache.clear();scene.remove(root);}};
}
