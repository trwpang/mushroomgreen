import assert from 'node:assert/strict';
import * as T from 'three';
import {refineSurface,refineObject,cloneSurface,weatherArchitecture,classifySurface} from '../../src/scripts/rendering/surfaces';

const material=new T.MeshStandardMaterial();material.name='Hand-fired brick 00';
material.userData.surfaceDatum=18;
material.onBeforeCompile=shader=>{shader.uniforms.originalDetail={value:7};};
refineSurface(material,'brick');
const compile=(m:T.Material)=>{
 const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};
 m.onBeforeCompile(shader as any,{} as T.WebGLRenderer);return shader as any;
};
const original=compile(material);
assert.equal(original.uniforms.originalDetail.value,7,'Existing shader extension is retained');
assert.equal(original.uniforms.surfaceDatum.value,18);
const clone=cloneSurface(material);clone.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),20)];clone.userData.surfaceDatum=21;
refineSurface(clone,'brick');
const cutaway=compile(clone);
assert.equal(cutaway.uniforms.surfaceDatum.value,21,'Cutaway reads its own material uniforms');
assert.equal(compile(material).uniforms.surfaceDatum.value,18,'Cloning does not change source uniforms');
assert.equal((cutaway.fragmentShader.match(/varying vec3 surfacePoint/g)||[]).length,1,'Cloned surface is not patched twice');
assert.equal(clone.customProgramCacheKey(),material.customProgramCacheKey());
// Reused forge instances need separate ground levels without mutating the asset.
const source=new T.MeshStandardMaterial();source.name='Soot-dark brick 00';
const a=new T.Group(),b=new T.Group(),g=new T.BoxGeometry();a.add(new T.Mesh(g,source));b.add(new T.Mesh(g,source));
weatherArchitecture(a,10);weatherArchitecture(b,24);refineObject(a);refineObject(b);
assert.equal(compile((a.children[0] as T.Mesh).material as T.Material).uniforms.surfaceDatum.value,10);
assert.equal(compile((b.children[0] as T.Mesh).material as T.Material).uniforms.surfaceDatum.value,24);
assert.equal(source.userData.surfaceDatum,undefined);
for(const name of ['Quench water','Weathered skin','Eyes'])assert.equal(classifySurface(name),undefined);
assert.equal(classifySurface('Live embers'),'ember');
assert.equal(classifySurface('Small dark glass'),'glass');
assert.equal(classifySurface('Smoke worn apron'),'leather');
console.log('Surface checks passed: composed shaders, independent forge datums, cutaway clones, protected emissive/skin/water materials.');

// Building repairs must follow translated/rotated/scaled instances without touching shared assets.
const {ageBuilding}=await import('../../src/scripts/village/building-age');
const inherited=new T.MeshStandardMaterial();inherited.name='Hand-fired brick';
inherited.onBeforeCompile=s=>{s.uniforms.retained={value:11};};
const buildings=[new T.Group(),new T.Group()];
for(let i=0;i<buildings.length;i++){
 const root=buildings[i];root.position.set(i*15,7+i,-30);root.rotation.y=.73*i;root.scale.set(1+i*.2,1.1,1.3);
 const mesh=new T.Mesh(new T.BoxGeometry(),inherited);mesh.position.set(1,.5,-.3);root.add(mesh);
 const glazing=new T.MeshStandardMaterial({transparent:true});glazing.name='Small dark glass';root.add(new T.Mesh(g,glazing));
 ageBuilding(root,22+i);
 assert.strictEqual((root.children[1] as T.Mesh).material,glazing,'Keep windows out of building repairs');
 const mat=mesh.material,shader=compile(mat);
 assert.equal(shader.uniforms.retained.value,11,'Retain existing authored surface detail');
 const p=new T.Vector3(.1,.2,.3).applyMatrix4(mesh.matrixWorld).applyMatrix4(shader.uniforms.ageInverse.value);
 assert(p.distanceTo(new T.Vector3(1.1,.7,0))<1e-6,'Repair coordinates must remain building-local');
 assert.equal(shader.uniforms.ageProfile.value.x,(22+i)*.731);
 assert.notStrictEqual(mat,inherited);
}
assert.equal(inherited.userData.buildingAge,undefined,'Do not mutate the shared source material');
const workRoot=new T.Group(),workFloor=new T.Mesh(g,inherited);workFloor.name='Interior_brick_floor';workRoot.add(workFloor);ageBuilding(workRoot,5,true);
assert.strictEqual(workFloor.material,inherited,'Industrial floors must keep their dedicated scale and ash finish');
console.log('Building-age checks passed: instance coordinates, inherited shaders, shared-source isolation and protected workshop floors/glass.');
