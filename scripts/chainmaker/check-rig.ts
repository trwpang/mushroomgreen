import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {poseAt,LINK,PERIOD} from '../../src/scripts/chainmaker/rig';
const samples=560;
for(let i=0;i<=samples;i++){
 const p=poseAt(i/samples*PERIOD);
 for(const a of p.arms){
  assert.ok(Math.abs(a.shoulder.distanceTo(a.elbow)-.30)<1e-7,'Upper arm must retain its length');
  assert.ok(Math.abs(a.elbow.distanceTo(a.wrist)-.285)<1e-7,'Forearm must retain its length');
  assert.ok([...a.wrist,...a.elbow].every(Number.isFinite));
 }
 assert.ok(p.hammerFace.y>=LINK.y+.007-1e-6,'Hammer penetrates hot link');
 const tip=p.tongGrip.clone().addScaledVector(p.tongs.x,.43);
 assert.ok(tip.distanceTo(LINK.clone().add(new Vector3(-.037,0,0)))<1e-7,'Tongs drift away from link');
}
const strike=poseAt(PERIOD*.68),raised=poseAt(PERIOD*.45);
assert.ok(Math.abs(LINK.y-.007-1.055)<1e-7,'Link must rest on actual forge anvil face');
assert.ok(strike.hammerFace.distanceTo(LINK.clone().add(new Vector3(0,.007,0)))<1e-7,'Hammer face must touch actual link surface');
assert.ok(raised.hammerFace.y-strike.hammerFace.y>.30,'Hammer needs readable lift');
assert.deepEqual(poseAt(1.9),poseAt(1.9),'Paused frame is deterministic');
for(const t of [.0,.2,1.0,1.9]){
 const a=poseAt(t),b=poseAt(t+PERIOD);assert.ok(a.grip.distanceTo(b.grip)<1e-9,'Loop jumps');
}
console.log(JSON.stringify({samples,reachableArms:true,constantLimbLengths:true,anvilContact:true,tongContact:true,hammerContact:true,pausedDeterministic:true,continuousLoop:true},null,2));
