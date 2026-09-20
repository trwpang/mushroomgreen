import * as T from 'three';
/** Pan along the ground in the camera's screen directions, preserving its view angle. */
export function panDestination(camera:T.PerspectiveCamera,position:T.Vector3,target:T.Vector3,dx:number,dy:number,inside=false){
 const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();
 const forward=new T.Vector3(0,1,0).cross(right);
 const step=inside?.16:T.MathUtils.clamp(position.distanceTo(target)*Math.tan(T.MathUtils.degToRad(camera.fov/2))*.30,.35,80);
 const offset=right.multiplyScalar(dx*step).addScaledVector(forward,dy*step);
 return {position:position.clone().add(offset),target:target.clone().add(offset)};
}
export function zoomDestination(position:T.Vector3,target:T.Vector3,factor:number,min:number,max:number){
 const offset=position.clone().sub(target);const distance=T.MathUtils.clamp(offset.length()*factor,min,max);
 return target.clone().add(offset.setLength(distance));
}

/** Outside: orbit the subject. Inside: turn the view without moving the eye. */
export function turnDestination(position:T.Vector3,target:T.Vector3,yaw:number,pitch:number,inside=false){
 const direction=inside?target.clone().sub(position):position.clone().sub(target);
 const sphere=new T.Spherical().setFromVector3(direction);
 sphere.theta-=yaw;sphere.phi=T.MathUtils.clamp(sphere.phi+(inside?-pitch:pitch),inside?.12:.04,inside?Math.PI-.12:Math.PI*.48);
 direction.setFromSpherical(sphere);
 return inside?{position:position.clone(),target:position.clone().add(direction)}:{position:target.clone().add(direction),target:target.clone()};
}
export interface RoomBounds {x:number;z:number;angle:number;width:number;depth:number;floor:number;ceiling:number;}
/** Keep the eye inside the shell; translate the look target by the same correction. */
export function containRoom(position:T.Vector3,target:T.Vector3,room:RoomBounds){
 const c=Math.cos(room.angle),s=Math.sin(room.angle),dx=position.x-room.x,dz=position.z-room.z;
 const x=T.MathUtils.clamp(dx*c-dz*s,-room.width/2+.32,room.width/2-.32);
 const z=T.MathUtils.clamp(dx*s+dz*c,-room.depth/2+.32,room.depth/2-.32);
 const eye=new T.Vector3(room.x+x*c+z*s,T.MathUtils.clamp(position.y,room.floor+.65,room.ceiling-.28),room.z-x*s+z*c);
 return {position:eye,target:target.clone().add(eye.clone().sub(position))};
}
