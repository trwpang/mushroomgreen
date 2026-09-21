import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4} from 'three';
import {writeFile} from 'node:fs/promises';
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('assets/chainmaker/tripo-v2/source.glb');
const skin=doc.getRoot().listSkins()[0],bind=skin.getInverseBindMatrices();
// Provider inverse binds use a quarter-turn different from its mesh coordinates.
// Verified against mesh wrist, fingertip and shoulder cross-sections, not assumed from names.
const rotate=new Matrix4().makeRotationY(-Math.PI/2),scale=1.72/.9796143770217896;
const bones=skin.listJoints().map((node,i)=>{
 const matrix=new Matrix4().fromArray(bind.getElement(i,[])).invert().premultiply(rotate);
 const p=matrix.elements.slice(12,15).map(x=>x*scale);
 return {name:node.getName(),parent:node.getParentNode()?.getName(),head:[p[0],-p[2],p[1]]};
});
await writeFile('artifacts/chainmaker/tripo-v2/recovered-bind.json',JSON.stringify(bones,null,2));
