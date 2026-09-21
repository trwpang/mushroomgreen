// Build a static inspection copy. Do not use the damaged source skin in the village.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,textureCompress,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {validateBytes} from 'gltf-validator';
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=await io.read('assets/chainmaker/tripo-v2/source.glb');
const root=doc.getRoot(),scene=root.getDefaultScene(),mesh=root.listMeshes()[0];
for(const n of [...root.listNodes()])n.dispose();
scene.addChild(doc.createNode('Chainmaker inspection mesh').setMesh(mesh));
const p=mesh.listPrimitives()[0],pos=p.getAttribute('POSITION');
const scale=1.72/(pos.getMax([])[1]-pos.getMin([])[1]);
for(let i=0;i<pos.getCount();i++)pos.setElement(i,pos.getElement(i,[]).map(v=>v*scale));
p.setAttribute('JOINTS_0',null).setAttribute('WEIGHTS_0',null);
for(const m of root.listMaterials())m.setName('Tripo authored clothing and skin').setMetallicFactor(0).setRoughnessFactor(.88);
await doc.transform(prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:92}));
// Uncompressed geometry is also retained for Blender import.
await io.write('assets/chainmaker/tripo-v2/static-preview.glb',doc);
await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high'}));
const bytes=await io.writeBinary(doc),validation=await validateBytes(bytes);
if(validation.issues.numErrors)throw new Error(JSON.stringify(validation.issues));
await writeFile('assets/chainmaker/tripo-v2/static-preview-compressed.glb',bytes);
await writeFile('artifacts/chainmaker/tripo-v2/static-preview-validation.json',JSON.stringify({bytes:bytes.length,heightMetres:1.72,triangles:99999,validation:validation.issues,note:'Static inspection copy; source rig deliberately excluded because it is invalid.'},null,2));
console.log({bytes:bytes.length,heightMetres:1.72,validationErrors:validation.issues.numErrors});
