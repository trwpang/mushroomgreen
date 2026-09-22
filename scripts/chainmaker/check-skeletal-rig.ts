import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import * as T from 'three';
import {createSkeletalChainmakerRig} from '../../src/scripts/chainmaker/skeletal-rig';
import {LINK} from '../../src/scripts/chainmaker/rig';
import {WORK_PERIOD} from '../../src/scripts/chainmaker/work-cycle';
const PERIOD=WORK_PERIOD;
const bytes=await readFile('public/chainmaker-v2/chainmaker.glb');
// Geometry and skin validation need no browser image decoder. Keep binary data identical.
const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
for(const m of json.meshes)for(const p of m.primitives)delete p.material;
delete json.materials;delete json.textures;delete json.images;
const data=Buffer.from(JSON.stringify(json)),padding=(4-data.length%4)%4,j=Buffer.concat([data,Buffer.alloc(padding,32)]),binary=bytes.subarray(20+length);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+j.length+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);
const cleaned=Buffer.concat([header,j,binary]);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let maxWristError=0,maxVertex=0,maxWristBend=0,maxJointStep=0;
for(const floor of [0,.125]){
 const gltf=await loader.parseAsync(cleaned.buffer.slice(cleaned.byteOffset,cleaned.byteOffset+cleaned.byteLength),'');
 const root=gltf.scene,parent=new T.Group();parent.position.set(12,7,-9);parent.rotation.y=.73;parent.add(root);parent.updateMatrixWorld(true);const rig=createSkeletalChainmakerRig(root,floor);root.position.y=floor;
 const getBone=(name:string)=>{let found:T.Bone;root.traverse(o=>{if(o instanceof T.Bone&&o.name.replace(/[^a-z0-9]/gi,'')==='mixamorig'+name)found=o;});return found!;};
 const previous=new Map<string,T.Quaternion>();
 const footNames=['LeftFoot','RightFoot'];
 rig.update(0);
 for(const hand of rig.grips())for(const f of hand){
  if(f.name.includes('Thumb'))assert.ok(f.angle>=-.35&&f.angle<=1.25,'Thumb must not fold backwards to reach the handle');
  if(!f.name.includes('Thumb')&&f.name.endsWith('3'))assert.ok(f.angle<=1.35,'Fingertip must not curl into a hook');
 }
 const feet=footNames.map(name=>getBone(name).getWorldPosition(new T.Vector3()));
 const initialShoulder=getBone('LeftArm').getWorldPosition(new T.Vector3());let shoulderTravel=0;
 for(let i=0;i<=420;i++){
  const p=rig.update(i/420*PERIOD);
  footNames.forEach((name,k)=>assert.ok(getBone(name).getWorldPosition(new T.Vector3()).distanceTo(feet[k])<1e-6,'Working motion must not slide the feet'));
  shoulderTravel=Math.max(shoulderTravel,getBone('LeftArm').getWorldPosition(new T.Vector3()).distanceTo(initialShoulder));
  if(i===0&&floor===0&&process.argv.includes('--grips'))for(const [k,side]of ['Right','Left'].entries()){const a=p.arms[k];for(const digit of ['Thumb','Index','Middle','Ring','Pinky']){const b=getBone(side+'Hand'+digit+'3'),tip=root.worldToLocal(b.localToWorld(new T.Vector3(0,.022,0))).sub(a.grip);console.log(side,digit,[tip.dot(a.tool.x),tip.dot(a.tool.y),tip.dot(a.tool.z)]);}}
  for(const [k,name] of ['RightHand','LeftHand'].entries()){
   const actual=root.worldToLocal(getBone(name).getWorldPosition(new T.Vector3()));
   const arm=p.arms[k];
   const middle=root.worldToLocal(getBone(name+'Middle1').getWorldPosition(new T.Vector3()));
   const palm=middle.clone().sub(actual).normalize(),fore=actual.clone().sub(arm.elbow).normalize();
   const bend=T.MathUtils.radToDeg(palm.angleTo(fore));maxWristBend=Math.max(maxWristBend,bend);
   assert.ok(bend<22,`Wrist bend must stay below 22 degrees; got ${bend}`);
   for(const joint of [name,name.replace('Hand','ForeArm'),name.replace('Hand','Arm')]){
    const q=getBone(joint).quaternion.clone(),prior=previous.get(joint);
    if(prior){const step=T.MathUtils.radToDeg(q.angleTo(prior));maxJointStep=Math.max(maxJointStep,step);assert.ok(step<6,`No sudden arm rotation: ${joint} moved ${step} degrees in 10 ms`);}
    previous.set(joint,q);
   }

   const thumb=getBone(name.replace('Hand','HandThumb3'));
   const pad=root.worldToLocal(thumb.localToWorld(new T.Vector3(0,.022,0))).sub(arm.grip);
   assert.ok(Math.abs(pad.dot(arm.tool.y))<.012,'Thumb pad must close beside the handle');
   assert.ok(Math.abs(pad.dot(arm.tool.z))<.03,'Thumb pad must stay within the handle grip');
   const error=actual.distanceTo(p.arms[k].wrist);maxWristError=Math.max(maxWristError,error);assert.ok(error<.003,'Wrist must reach its tool grip');
  }
  if(i%20===0)root.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;o.skeleton.update();const pos=o.geometry.getAttribute('position');for(let v=0;v<pos.count;v+=11){const p=o.getVertexPosition(v,new T.Vector3());assert.ok(p.toArray().every(Number.isFinite),'Finite deformed vertices');maxVertex=Math.max(maxVertex,p.length());assert.ok(p.length()<3,'No exploding skin');}});
  assert.ok(p.hammerFace.y+floor>=LINK.y+.007-1e-6,'Hammer must not enter the anvil');
 }
 assert.ok(shoulderTravel>.003,'Shoulder must take part in the stroke');
 for(const time of [.736,1.608,2.596]){
  const p=rig.update(time);assert.ok(Math.abs(p.hammerFace.y+floor-LINK.y-.007)<1e-6,'All three blows must reach the link');
 }
}
console.log(JSON.stringify({frames:842,floors:[0,.125],maxWristError,maxVertex,maxWristBend,maxJointStep,finiteSkin:true},null,2));
