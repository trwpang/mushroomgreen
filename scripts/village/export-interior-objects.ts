import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {validateBytes} from 'gltf-validator';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {interiorCatalogue} from '../../src/scripts/village/interior-catalogue';
import {interiorObject,type ObjectMaterial} from '../../src/scripts/village/interior-objects';
const colours:Record<ObjectMaterial,string>={oak:'#826449',darkwood:'#4e3926',iron:'#292b28',steel:'#93978e',copper:'#b3844a',cream:'#dfd5b9',blue:'#344d73',clay:'#865033',cloth:'#69785f',green:'#535d3d',coal:'#24241d',glass:'#789186',lampglass:'#d9e0d3',paper:'#d1c7ab',linen:'#d0c7ae',tile:'#755038',stone:'#807b69'};
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('Objects of home');
const materials=Object.fromEntries(Object.entries(colours).map(([key,colour])=>{const c=new T.Color(colour);return [key,doc.createMaterial(key).setBaseColorFactor([c.r,c.g,c.b,1]).setRoughnessFactor(['steel','copper','cream','blue','glass'].includes(key)?.40:.95).setMetallicFactor(['iron','steel','copper'].includes(key)?.55:0).setDoubleSided(key==='cloth'||key==='lampglass').setAlphaMode(key==='lampglass'?'BLEND':'OPAQUE').setBaseColorFactor([c.r,c.g,c.b,key==='lampglass'?.20:1])];}));
for(const [index,[id,name]]of interiorCatalogue.entries()){
 const model=interiorObject(id),node=doc.createNode(id).setTranslation([(index%10-4.5)*2.5,0,(Math.floor(index/10)-4.5)*2.5]).setExtras({title:name,id,units:'metres',origin:'bottom centre',supportSurfaces:model.surfaces});
 const mesh=doc.createMesh(name);
 for(const part of model.parts){const primitive=doc.createPrimitive().setMaterial(materials[part.material]);
  for(const [from,to,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2'],['color','COLOR_0','VEC3']] as const){const attribute=part.geometry.getAttribute(from);if(attribute)primitive.setAttribute(to,doc.createAccessor().setBuffer(buffer).setType(type).setArray(new Float32Array(attribute.array)));}mesh.addPrimitive(primitive);
 }
 node.setMesh(mesh);scene.addChild(node);
}
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await doc.transform(dedup(),weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const bytes=await io.writeBinary(doc),report=await validateBytes(bytes,{maxIssues:100}),decoded=await io.readBinary(bytes);
assert.equal(report.issues.numErrors,0);assert(bytes.length<6_000_000);assert.equal(decoded.getRoot().listScenes()[0].listChildren().length,interiorCatalogue.length);
let triangles=0;for(const mesh of decoded.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){const p=primitive.getAttribute('POSITION')!;assert([...p.getArray()!].every(Number.isFinite));const i=primitive.getIndices();if(i)assert([...i.getArray()!].every(n=>n<p.getCount()));triangles+=(i?.getCount()??p.getCount())/3;}
assert(triangles<180_000);
const sourceFiles=['src/scripts/village/interior-catalogue.ts','src/scripts/village/interior-objects.ts'];const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const manifest={models:interiorCatalogue.length,bytes:bytes.length,triangles,sha256:createHash('sha256').update(bytes).digest('hex'),compression:'EXT_meshopt_compression',validationErrors:0,sourceHashes,provenance:'Original project geometry, inspired by the documented museum references. No source photograph pixels included.',usage:'Same terms as this repository; no new third-party asset licence.',appearance:'Portable PBR colours. The village adds its shared procedural surface finishes and household palettes.',layout:'Named objects arranged on a 2.5 metre grid for Blender inspection.',items:interiorCatalogue.map(([id,name,support])=>({id,name,support,dimensions:interiorObject(id).bounds.getSize(new T.Vector3()).toArray()}))};
await mkdir('public/interior-objects',{recursive:true});await mkdir('artifacts/village/interior-objects',{recursive:true});
await writeFile('artifacts/village/interior-objects/gltf-validation.json',JSON.stringify(report,null,2)+'\n');
await writeFile('public/interior-objects/catalogue.glb.tmp',bytes);await rename('public/interior-objects/catalogue.glb.tmp','public/interior-objects/catalogue.glb');await writeFile('public/interior-objects/asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({models:interiorCatalogue.length,triangles,bytes:bytes.length,validationErrors:0}));
