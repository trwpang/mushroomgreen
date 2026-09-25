import * as T from 'three';
/**
 * Once a static geometry or texture is on the GPU, its JavaScript copy is dead weight: three.js
 * only reads it again if the object is edited. The village never edits these after it has loaded,
 * so the copies are dropped (three.js's documented `onUpload` pattern for geometry; closing the
 * decoded image or shrinking the drawn canvas for textures). Pixels on screen are unchanged.
 *
 * Kept: skinned meshes (the chainmaker), dynamic buffers (laundry), instanced attributes, anything
 * under a fire or the rain, picking targets, and objects added later (interiors build their own).
 */
function dropArray(this:T.BufferAttribute){(this as unknown as {array:unknown}).array=null;}
// Some buffers reach the GPU before the release pass (the reflection capture renders the scene
// early), so onUpload would never fire for them. three.js calls this prototype hook on every upload;
// it records the upload so those copies can be dropped straight away.
const UPLOADED=Symbol('uploaded'),RELEASING=Symbol('releasing');
function markUploaded(this:object){(this as Record<symbol,boolean>)[UPLOADED]=true;}
T.BufferAttribute.prototype.onUploadCallback=markUploaded;T.InterleavedBuffer.prototype.onUploadCallback=markUploaded;
export function releaseGeometryAfterUpload(root:T.Object3D,exclude:Set<T.Object3D>=new Set()){
 let geometries=0,bytes=0;const targets:[T.Object3D,T.BufferGeometry][]=[];
 root.traverse(o=>{
  if(!(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points)||o instanceof T.SkinnedMesh||exclude.has(o))return;
  for(let q:T.Object3D|null=o;q;q=q.parent)if(/\b(fire|smoke|rain)\b/i.test(q.name))return;
  const g=o.geometry as T.BufferGeometry;if(g&&!g.userData.cpuReleased)targets.push([o,g]);
 });
 // Bounds first, for every geometry: chunked instances share vertex buffers between geometries, so
 // a buffer dropped for one would otherwise be gone before the next computes its bounds.
 // Culling and cutaways read only these bounds, never the vertices.
 for(const [o,g] of targets){if(!g.boundingSphere)g.computeBoundingSphere();if(!g.boundingBox)g.computeBoundingBox();if(o instanceof T.InstancedMesh&&!o.boundingSphere)o.computeBoundingSphere();}
 for(const [,g] of targets){
  if(g.userData.cpuReleased)continue;
  for(const a of [...Object.values(g.attributes),g.index]){
   if(!a||(a as T.InstancedBufferAttribute).isInstancedBufferAttribute)continue;
   // Interleaved glTF attributes share one buffer; that buffer is what reaches the GPU.
   const attribute=((a as T.InterleavedBufferAttribute).isInterleavedBufferAttribute?(a as T.InterleavedBufferAttribute).data:a) as T.BufferAttribute;
   if(attribute.usage===T.DynamicDrawUsage||!attribute.array||(attribute as unknown as Record<symbol,boolean>)[RELEASING])continue;(attribute as unknown as Record<symbol,boolean>)[RELEASING]=true;
   bytes+=attribute.array.byteLength;if((attribute as unknown as Record<symbol,boolean>)[UPLOADED])dropArray.call(attribute);else attribute.onUpload(dropArray);
  }
  g.userData.cpuReleased=true;geometries++;
 }
 return {geometries,megabytes:Math.round(bytes/1048576)};
}
/** Textures whose current version is already on the GPU: close decoded bitmaps, shrink canvases. */
export function releaseTextureImages(root:T.Object3D,renderer:T.WebGLRenderer){
 let count=0,bytes=0;const seen=new Set<T.Texture>();
 root.traverse(o=>{
  const materials=(o as T.Mesh).material?(Array.isArray((o as T.Mesh).material)?(o as T.Mesh).material as T.Material[]:[(o as T.Mesh).material as T.Material]):[];
  for(const m of materials)for(const key in m){const t=(m as unknown as Record<string,unknown>)[key];
   if(!(t instanceof T.Texture)||seen.has(t)||t instanceof T.DataTexture||t instanceof T.CubeTexture)continue;seen.add(t);
   const image=t.image as {width?:number;height?:number;close?:()=>void}|null;if(!image||!image.width||image.width*image.height!<256*256)continue;
   const state=(renderer.properties.get(t) as {__version?:number}).__version;if(state!==t.version)continue;
   if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap){bytes+=image.width*image.height*4;image.close();count++;}
   else if(typeof HTMLCanvasElement!=='undefined'&&image instanceof HTMLCanvasElement){bytes+=image.width*image.height*4;image.width=image.height=1;count++;}
  }
 });
 return {textures:count,megabytes:Math.round(bytes/1048576)};
}
