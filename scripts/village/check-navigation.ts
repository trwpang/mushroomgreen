import {readFileSync} from 'node:fs';
import {makeHomes} from '../../src/scripts/village/layout';
import {roomDimensions} from '../../src/scripts/village/interior-plans';
import assert from 'node:assert/strict';
import {northRotation} from '../../src/scripts/village/compass';
import * as T from 'three';
import {panDestination,zoomDestination,turnDestination,containRoom} from '../../src/scripts/village/navigation';
for(const azimuth of [0,.8,Math.PI,4.2])for(const height of [2,30,650]){
 const camera=new T.PerspectiveCamera(42,1.6,.1,1800),target=new T.Vector3(3,0,-5);
 camera.position.set(Math.sin(azimuth)*30,height,Math.cos(azimuth)*30);camera.lookAt(target);camera.updateMatrixWorld();
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const next=panDestination(camera,camera.position,target,dx,dy);
  assert(next.position.clone().sub(next.target).distanceTo(camera.position.clone().sub(target))<1e-9,'Pan changes orientation or zoom');
  assert.equal(next.target.y,target.y,'Directional pan must follow the ground plane');
  const opposite=panDestination(camera,next.position,next.target,-dx,-dy);assert(opposite.position.distanceTo(camera.position)<1e-9);
 }
 const z=zoomDestination(camera.position,target,.75,.35,1800);
 assert(Math.abs(z.distanceTo(target)-camera.position.distanceTo(target)*.75)<1e-8);
 assert(z.clone().sub(target).normalize().distanceTo(camera.position.clone().sub(target).normalize())<1e-8);
 assert(Math.abs(zoomDestination(camera.position,target,.00001,9,1800).distanceTo(target)-9)<1e-8);
}
console.log('Camera-relative pan preserves angle and distance; zoom preserves heading and clamps to limits.');

for(const angle of [0,.8,2.5]){
 const room={x:7,z:-3,angle,width:5,depth:4,floor:2,ceiling:4.3};
 let position=new T.Vector3(7,3.65,-3),target=new T.Vector3(8,3.65,-4);
 const camera=new T.PerspectiveCamera(68,1,.04,1800);camera.position.copy(position);camera.lookAt(target);
 const pan=panDestination(camera,position,target,1,0,true);
 assert(Math.abs(pan.position.distanceTo(position)-.16)<1e-8,'Indoor step must be 16 cm');
 for(let i=0;i<100;i++){
  const turned=turnDestination(position,target,.2,.3,true);
  assert(turned.position.distanceTo(position)<1e-9,'Indoor turning must never orbit the eye out of the room');
  assert(Math.abs(turned.position.distanceTo(turned.target)-position.distanceTo(target))<1e-8);
  target=turned.target;
  const far=position.clone().add(new T.Vector3(1,.3,1));const bounded=containRoom(far,target.clone().add(new T.Vector3(1,.3,1)),room);
  assert(bounded.target.clone().sub(bounded.position).distanceTo(target.clone().sub(position))<1e-8,'Wall limit must preserve heading');
  position=bounded.position;target=bounded.target;
  const dx=position.x-room.x,dz=position.z-room.z,c=Math.cos(angle),s=Math.sin(angle);
  assert(Math.abs(dx*c-dz*s)<=room.width/2-.32+1e-8&&Math.abs(dx*s+dz*c)<=room.depth/2-.32+1e-8);
  assert(position.y>=room.floor+.65&&position.y<=room.ceiling-.28);
 }
}
console.log('Indoor turning fixes the eye; 16 cm steps and rotated room bounds preserve heading under repeated input.');

// Floor buttons must place the camera within the same scaled floor as the room mesh.
for(const home of makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')))){
 const lower=roomDimensions(home),upper=roomDimensions(home,1);
 if(home.style===1){
  assert(Math.abs(upper.base-lower.base-lower.levelHeight)<1e-9);
  assert(upper.base>lower.base+lower.height,'Upstairs camera must clear the downstairs ceiling');
 }else assert.equal(upper.level,0,'Single-level homes must not expose an invented camera floor');
 const room={x:home.x,z:home.z,angle:home.angle,width:5,depth:4,floor:home.height+upper.base,ceiling:home.height+upper.base+upper.height};
 const eye=new T.Vector3(home.x,room.floor+1.53,home.z),target=eye.clone().add(new T.Vector3(1,-.4,-1));
 assert(containRoom(eye,target,room).position.distanceTo(eye)<1e-9,'Floor entry must not be clamped to another level');
}
console.log('Floor navigation matches the scaled room geometry for every home.');

// North must stay meaningful during orbit, indoor turning, and top-down views.
for(const [azimuth,expected]of [[0,0],[Math.PI/2,90],[Math.PI,180],[-Math.PI/2,-90]])for(const height of [0,30,650]){
 const camera=new T.PerspectiveCamera();camera.position.set(Math.sin(azimuth)*20,height,Math.cos(azimuth)*20);camera.lookAt(0,0,0);
 const angle=northRotation(camera.quaternion),difference=((angle-expected+540)%360)-180;
 assert(Math.abs(difference)<1e-8,'Compass north must agree with geographic axes');
}
const overhead=new T.PerspectiveCamera();overhead.position.set(0,100,0);overhead.lookAt(0,0,0);assert(Number.isFinite(northRotation(overhead.quaternion)));
console.log('Compass follows all four headings, indoor height and overhead views.');
