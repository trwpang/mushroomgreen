import assert from 'node:assert/strict';
import * as T from 'three';
import {panDestination,zoomDestination} from '../../src/scripts/village/navigation';
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
