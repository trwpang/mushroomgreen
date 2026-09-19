import * as T from 'three';
/** Pan along the ground in the camera's screen directions, preserving its view angle. */
export function panDestination(camera:T.PerspectiveCamera,position:T.Vector3,target:T.Vector3,dx:number,dy:number){
 const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();
 const forward=new T.Vector3(0,1,0).cross(right);
 const step=T.MathUtils.clamp(position.distanceTo(target)*Math.tan(T.MathUtils.degToRad(camera.fov/2))*.30,.35,80);
 const offset=right.multiplyScalar(dx*step).addScaledVector(forward,dy*step);
 return {position:position.clone().add(offset),target:target.clone().add(offset)};
}
export function zoomDestination(position:T.Vector3,target:T.Vector3,factor:number,min:number,max:number){
 const offset=position.clone().sub(target);const distance=T.MathUtils.clamp(offset.length()*factor,min,max);
 return target.clone().add(offset.setLength(distance));
}
