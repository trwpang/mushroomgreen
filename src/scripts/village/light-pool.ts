import * as T from 'three';

// Three.js compiles a separate shader for every scene light count. Streamed rooms used to add and remove
// their own hearth and lamp point lights, so panning past cottages recompiled every visible material
// (hundreds of programs, multi-second stalls). Rooms now *request* a light; a fixed pool of point lights
// serves the nearest visible requests. The light count never changes, so nothing recompiles.

type Request={anchor:T.Object3D;color:T.Color;intensity:number;distance:number;decay:number};
const requests=new Set<Request>();
let pool:T.PointLight[]=[];
const world=new T.Vector3();

export function installLightPool(scene:T.Scene,count=6){
 pool=Array.from({length:count},(_,i)=>{const light=new T.PointLight('#ffffff',0,1,2);light.name='Pooled room light '+i;scene.add(light);return light;});
}

/** Ask for a small point light at `anchor`. Returns a handle whose intensity can be animated. */
export function requestLight(anchor:T.Object3D,color:T.ColorRepresentation,intensity:number,distance:number,decay=2){
 const request:Request={anchor,color:new T.Color(color),intensity,distance,decay};requests.add(request);
 return {get intensity(){return request.intensity;},set intensity(v:number){request.intensity=v;},release(){requests.delete(request);}};
}
export type PooledLight=ReturnType<typeof requestLight>;

function shown(o:T.Object3D|null){for(let x=o;x;x=x.parent)if(!x.visible)return false;return true;}

/** Assign pool lights to the nearest visible requests. Call once per frame before rendering. */
export function updateLightPool(camera:T.Camera){
 // With no pool installed (isolated studies), requests keep their own real lights via the fallback below.
 if(!pool.length)return;
 const live:{r:Request;d:number;p:T.Vector3}[]=[];
 for(const r of requests){if(!r.anchor.parent||!shown(r.anchor))continue;const p=r.anchor.getWorldPosition(world.clone());live.push({r,d:p.distanceToSquared(camera.position),p});}
 live.sort((a,b)=>a.d-b.d);
 pool.forEach((light,i)=>{const e=live[i];
  if(!e){light.intensity=0;return;}
  light.position.copy(e.p);light.color.copy(e.r.color);light.intensity=e.r.intensity;light.distance=e.r.distance;light.decay=e.r.decay;});
}
export function lightPoolInstalled(){return pool.length>0;}
