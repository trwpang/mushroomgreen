import * as T from 'three';
/**
 * Three.js culls an InstancedMesh as a whole, so a set spread over the village (grass tufts,
 * ferns, far-country trees) is drawn in full even when almost all of it is off screen.
 * Splitting static sets into grid chunks, each with its own bounding sphere, lets frustum
 * culling skip the parts behind and beside the camera. Nothing changes on screen: each chunk
 * shares the original geometry and material and keeps its instances' matrices and colours.
 * Instanced per-instance attributes on the geometry are sliced per chunk.
 */
export function chunkInstances(root:T.Object3D,options:{cell?:number;minTriangles?:number;exclude?:Set<T.Object3D>}={}){
 // Only heavy sets are worth splitting; every chunk is an extra draw call in each pass.
 const cell=options.cell??110,minTriangles=options.minTriangles??150000,exclude=options.exclude??new Set();
 const targets:T.InstancedMesh[]=[];
 root.traverse(o=>{if(!(o instanceof T.InstancedMesh)||exclude.has(o)||!o.parent)return;const g=o.geometry,tris=(g.index?g.index.count:g.attributes.position.count)/3*o.count;if(tris>=minTriangles)targets.push(o);});
 let split=0,chunks=0;const m=new T.Matrix4(),p=new T.Vector3();
 for(const mesh of targets){
  if(!mesh.boundingSphere)mesh.computeBoundingSphere();
  if(mesh.boundingSphere!.radius<cell*.75)continue;
  const groups=new Map<string,number[]>();
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);p.setFromMatrixPosition(m);const key=Math.floor(p.x/cell)+':'+Math.floor(p.z/cell);const g=groups.get(key);if(g)g.push(i);else groups.set(key,[i]);}
  if(groups.size<2)continue;
  const instanced=Object.entries(mesh.geometry.attributes).filter(([,a])=>(a as T.InstancedBufferAttribute).isInstancedBufferAttribute) as [string,T.InstancedBufferAttribute][];
  const parent=mesh.parent!,index=parent.children.indexOf(mesh);
  const made:T.InstancedMesh[]=[];
  for(const ids of groups.values()){
   let geometry=mesh.geometry;
   if(instanced.length){
    geometry=new T.BufferGeometry();geometry.setIndex(mesh.geometry.index);
    for(const [name,a] of Object.entries(mesh.geometry.attributes))if(!(a as T.InstancedBufferAttribute).isInstancedBufferAttribute)geometry.setAttribute(name,a);
    for(const [name,a] of instanced){const size=a.itemSize,array=new (a.array.constructor as Float32ArrayConstructor)(ids.length*size);ids.forEach((id,k)=>{for(let c=0;c<size;c++)array[k*size+c]=a.array[id*size+c];});geometry.setAttribute(name,new T.InstancedBufferAttribute(array,size,a.normalized));}
    geometry.groups=mesh.geometry.groups;geometry.boundingSphere=mesh.geometry.boundingSphere;geometry.boundingBox=mesh.geometry.boundingBox;
   }
   const chunk=new T.InstancedMesh(geometry,mesh.material,ids.length);
   ids.forEach((id,k)=>{mesh.getMatrixAt(id,m);chunk.setMatrixAt(k,m);});
   if(mesh.instanceColor){const c=new T.Color();ids.forEach((id,k)=>{mesh.getColorAt(id,c);chunk.setColorAt(k,c);});}
   chunk.name=mesh.name;chunk.castShadow=mesh.castShadow;chunk.receiveShadow=mesh.receiveShadow;chunk.layers.mask=mesh.layers.mask;chunk.renderOrder=mesh.renderOrder;chunk.visible=mesh.visible;
   chunk.frustumCulled=true;chunk.customDepthMaterial=mesh.customDepthMaterial;chunk.customDistanceMaterial=mesh.customDistanceMaterial;chunk.userData={...mesh.userData,chunkOf:mesh.name};
   chunk.matrix.copy(mesh.matrix);chunk.matrix.decompose(chunk.position,chunk.quaternion,chunk.scale);chunk.matrixAutoUpdate=mesh.matrixAutoUpdate;
   chunk.computeBoundingSphere();made.push(chunk);
  }
  parent.remove(mesh);parent.children.splice(index,0,...made);made.forEach(c=>{c.parent=parent;c.dispatchEvent({type:'added'});});
  split++;chunks+=made.length;
 }
 return {split,chunks};
}
