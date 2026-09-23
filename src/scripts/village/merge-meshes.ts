import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Lossless draw-call reduction: merge every mesh under `root` that shares a material, shadow flags and
 * a naming category into one mesh, with transforms baked relative to `root`.
 *
 * `category` keeps meshes apart whose names drive later per-house treatment (joinery colour, bare
 * chimneys). The merged mesh takes a representative name from its category so those rules still match.
 * Quantised (Meshopt) attributes are decoded to Float32 before transforms are applied.
 */
export function mergeByMaterial(root:T.Object3D,category:(mesh:T.Mesh)=>string=()=>''){
 root.updateMatrixWorld(true);
 const inverse=root.matrixWorld.clone().invert(),groups=new Map<string,{meshes:T.Mesh[];material:T.Material;name:string}>();
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||Array.isArray(o.material)||o.morphTargetInfluences)return;
  const g=o.geometry,signature=Object.keys(g.attributes).sort().join(',')+(g.index?'|i':'');
  const key=[o.material.uuid,category(o),o.castShadow,o.receiveShadow,o.renderOrder,o.visible,signature].join('/');
  const entry=groups.get(key)??{meshes:[],material:o.material,name:category(o)||o.name};
  entry.meshes.push(o);groups.set(key,entry);
 });
 const merged:T.Mesh[]=[];let before=0;
 for(const {meshes,material,name} of groups.values()){
  before+=meshes.length;
  if(meshes.length===1&&meshes[0].parent===root){merged.push(meshes[0]);continue;}
  const parts=meshes.map(mesh=>{
   const g=new T.BufferGeometry();
   for(const [key,attribute] of Object.entries(mesh.geometry.attributes)){
    const a=attribute as T.BufferAttribute|T.InterleavedBufferAttribute,out=new Float32Array(a.count*a.itemSize);
    for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)out[i*a.itemSize+k]=a.getComponent(i,k);
    g.setAttribute(key,new T.BufferAttribute(out,a.itemSize));
   }
   if(mesh.geometry.index)g.setIndex(mesh.geometry.index.clone());
   g.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
   return g;
  });
  const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());
  if(!geometry)throw Error('Could not merge '+name);
  geometry.computeBoundingSphere();geometry.computeBoundingBox();
  const mesh=new T.Mesh(geometry,material);mesh.name=name;
  const first=meshes[0];mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.visible=first.visible;
  merged.push(mesh);
 }
 // Replace the subtree with the merged meshes; non-mesh children (lights, helpers) are kept.
 const keep:T.Object3D[]=[];root.traverse(o=>{if(o!==root&&!(o instanceof T.Mesh)&&!(o instanceof T.Group)&&o.type!=='Object3D')keep.push(o);});
 for(const child of [...root.children])root.remove(child);
 root.add(...merged,...keep);
 return {before,after:merged.length};
}
