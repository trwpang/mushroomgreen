import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,simplify,getBounds,textureCompress,meshopt,unpartition} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {validateBytes} from 'gltf-validator';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source='assets/henry-statue/source.glb',height=.4572;
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(source),root=doc.getRoot(),scene=root.getDefaultScene()??root.listScenes()[0];
assert(scene,'Source must contain a scene');assert.equal(root.listSkins().length,0,'This keepsake must be static');
for(const a of root.listAnimations())a.dispose();
const count=()=>root.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
const originalTriangles=count();
await doc.transform(weld(),dedup());
if(count()>60000)await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:58000/count(),error:.002}));
const bounds=getBounds(scene);assert(bounds.max.every(Number.isFinite)&&bounds.min.every(Number.isFinite));
const scale=height/(bounds.max[1]-bounds.min[1]);assert(scale>0&&Number.isFinite(scale));
const normalized=doc.createNode('Henry Weaver commemorative statue').setScale([scale,scale,scale]).setTranslation([-(bounds.max[0]+bounds.min[0])*.5*scale,-bounds.min[1]*scale,-(bounds.max[2]+bounds.min[2])*.5*scale]);
for(const node of [...scene.listChildren()])normalized.addChild(node);scene.addChild(normalized);
// Keep the photographed bronze colour and sculpted normal detail. This is an ornament, not skin or cloth.
for(const m of root.listMaterials()){m.setMetallicFactor(.25);m.setRoughnessFactor(.62);m.setDoubleSided(false);}
await doc.transform(prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:92}),meshopt({encoder:MeshoptEncoder,level:'high'}),unpartition());
const bytes=await io.writeBinary(doc),validation=await validateBytes(bytes,{maxIssues:100});
assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));assert(bytes.length<2000000,'Statue download exceeds 2 MB');assert(count()<=60000,'Statue exceeds 60,000 triangles');
// Read the encoded result, so the receipt checks the actual browser asset and its normalized dimensions.
const decoded=await io.readBinary(bytes),finalBounds=getBounds(decoded.getRoot().getDefaultScene());
assert(Math.abs(finalBounds.max[1]-finalBounds.min[1]-height)<.001,'Height must be 18 inches');assert(Math.abs(finalBounds.min[1])<.001,'Plinth must rest at y=0');
const sourceHashes=Object.fromEntries(await Promise.all([source,'assets/henry-statue/reference.jpg','scripts/henry-statue/pack.mjs'].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const receipt={name:'Henry Weaver commemorative bronze keepsake',providerModelId:'50a02249-33c2-47e3-80f4-92d20eefb4c9',sourceHashes,originalTriangles,triangles:count(),heightMetres:height,bounds:finalBounds,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),validationErrors:0,compression:'EXT_meshopt_compression',provenance:'Tripo reconstruction of Tom’s photograph of his commissioned statue; unseen sides are generated interpretations. Modern easter egg, not a historical furnishing.'};
await mkdir('public/henry-statue',{recursive:true});await mkdir('artifacts/henry-statue',{recursive:true});
await writeFile('public/henry-statue/henry.glb',bytes);await writeFile('public/henry-statue/asset-manifest.json',JSON.stringify(receipt,null,2)+'\n');await writeFile('artifacts/henry-statue/validation.json',JSON.stringify(validation,null,2)+'\n');console.log(receipt);
