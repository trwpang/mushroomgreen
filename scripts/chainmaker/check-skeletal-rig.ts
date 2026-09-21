import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import * as T from 'three';
import {createSkeletalChainmakerRig} from '../../src/scripts/chainmaker/skeletal-rig';
import {PERIOD,LINK} from '../../src/scripts/chainmaker/rig';
const bytes=await readFile('public/chainmaker-v2/chainmaker.glb');
// Geometry and skin validation need no browser image decoder. Keep binary data identical.
const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
for(const m of json.meshes)for(const p of m.primitives)delete p.material;
delete json.materials;delete json.textures;delete json.images;
const data=Buffer.from(JSON.stringify(json)),padding=(4-data.length%4)%4,j=Buffer.concat([data,Buffer.alloc(padding,32)]),binary=bytes.subarray(20+length);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+j.length+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);
const cleaned=Buffer.concat([header,j,binary]);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let maxWristError=0,maxVertex=0;
for(const floor of [0,.125]){
 const gltf=await loader.parseAsync(cleaned.buffer.slice(cleaned.byteOffset,cleaned.byteOffset+cleaned.byteLength),'');
 const root=gltf.scene,parent=new T.Group();parent.position.set(12,7,-9);parent.rotation.y=.73;parent.add(root);parent.updateMatrixWorld(true);const rig=createSkeletalChainmakerRig(root,floor);root.position.y=floor;
 const getBone=(name:string)=>{let found:T.Bone;root.traverse(o=>{if(o instanceof T.Bone&&o.name.replace(/[^a-z0-9]/gi,'')==='mixamorig'+name)found=o;});return found!;};
 for(let i=0;i<=140;i++){
  const p=rig.update(i/140*PERIOD);
  if(i===0&&floor===0&&process.argv.includes('--grips'))for(const [k,side]of ['Right','Left'].entries()){const a=p.arms[k];for(const digit of ['Thumb','Index','Middle','Ring','Pinky']){const b=getBone(side+'Hand'+digit+'3'),tip=root.worldToLocal(b.localToWorld(new T.Vector3(0,.022,0))).sub(a.grip);console.log(side,digit,[tip.dot(a.tool.x),tip.dot(a.tool.y),tip.dot(a.tool.z)]);}}
  for(const [k,name] of ['RightHand','LeftHand'].entries()){
   const actual=root.worldToLocal(getBone(name).getWorldPosition(new T.Vector3()));
   const arm=p.arms[k];
   const thumb=getBone(name.replace('Hand','HandThumb3'));
   const pad=root.worldToLocal(thumb.localToWorld(new T.Vector3(0,.022,0))).sub(arm.grip);
   assert.ok(Math.abs(pad.dot(arm.tool.y))<.012,'Thumb pad must close beside the handle');
   assert.ok(Math.abs(pad.dot(arm.tool.z))<.03,'Thumb pad must oppose the fingers near the shaft');
   const error=actual.distanceTo(p.arms[k].wrist);maxWristError=Math.max(maxWristError,error);assert.ok(error<.003,'Wrist must reach its tool grip');
  }
  if(i%20===0)root.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;o.skeleton.update();const pos=o.geometry.getAttribute('position');for(let v=0;v<pos.count;v+=11){const p=o.getVertexPosition(v,new T.Vector3());assert.ok(p.toArray().every(Number.isFinite),'Finite deformed vertices');maxVertex=Math.max(maxVertex,p.length());assert.ok(p.length()<3,'No exploding skin');}});
  assert.ok(p.hammerFace.y+floor>=LINK.y+.007-1e-6,'Hammer must not enter the anvil');
 }
}
console.log(JSON.stringify({frames:282,floors:[0,.125],maxWristError,maxVertex,finiteSkin:true},null,2));
