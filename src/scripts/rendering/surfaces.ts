import * as T from 'three';

export type Surface = 'brick'|'plaster'|'stone'|'slate'|'wood'|'bark'|'iron'|'coal'|'cloth'|'leather'|'leaf'|'glass'|'ember'|'ceramic';
// Metre-scaled details supplement the authored colour/normal atlases. No extra
// meshes, UV seams, texture downloads, or per-frame material allocations.
const profiles:Record<Surface,{scale:[number,number,number];tone:number;bump:number;rough:number}>={
 brick:{scale:[62,62,62],tone:.15,bump:.0028,rough:.15},
 plaster:{scale:[38,38,38],tone:.10,bump:.0020,rough:.10},
 stone:{scale:[29,29,29],tone:.19,bump:.0038,rough:.20},
 slate:{scale:[48,17,48],tone:.14,bump:.0018,rough:.18},
 wood:{scale:[5,95,95],tone:.21,bump:.0026,rough:.17},
 bark:{scale:[42,2.5,42],tone:.34,bump:.010,rough:.12},
 iron:{scale:[85,85,85],tone:.13,bump:.0010,rough:.25},
 coal:{scale:[38,38,38],tone:.25,bump:.0024,rough:.29},
 cloth:{scale:[160,160,160],tone:.075,bump:.00045,rough:.055},
 leather:{scale:[90,90,90],tone:.11,bump:.0007,rough:.18},
 leaf:{scale:[18,18,18],tone:.22,bump:0,rough:.06},
 glass:{scale:[9,9,9],tone:.025,bump:.0008,rough:.13},
 ceramic:{scale:[55,55,55],tone:.055,bump:.0003,rough:.07},
 ember:{scale:[55,55,55],tone:.18,bump:.002,rough:.12},
};
const applied=new WeakSet<T.Material>();
export function classifySurface(name:string):Surface|undefined{
 if(/live embers/i.test(name))return 'ember';
 if(/water|skin|eyes|lips|hair|whisker|moss|soot$|crease/i.test(name))return;
 if(/glass/i.test(name))return 'glass';
 if(/leaf|meadow|seed|foliage|grass|reed/i.test(name))return 'leaf';
 if(/bark|trunk/i.test(name))return 'bark';
 if(/brick/i.test(name))return 'brick';
 if(/slate|roof tile/i.test(name))return 'slate';
 if(/mortar|lime|plaster/i.test(name))return 'plaster';
 if(/sandstone|stone|flag/i.test(name))return 'stone';
 if(/coal/i.test(name))return 'coal';
 if(/linen|wool|cloth|seam/i.test(name))return 'cloth';
 if(/apron|boot|leather/i.test(name))return 'leather';
 if(/iron|steel|hammer face/i.test(name))return 'iron';
 if(/oak|wood|timber|shaft|peg/i.test(name))return 'wood';
}
export function refineSurface<M extends T.MeshStandardMaterial>(material:M,kind:Surface):M{
 if(applied.has(material))return material;
 applied.add(material);material.userData.surfaceKind=kind;
 if(kind==='ember')material.color.set('#25231f');
 const p=profiles[kind],previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.surfaceDatum={value:Number(this.userData.surfaceDatum??-10000)};
  shader.vertexShader='varying vec3 surfacePoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 surfaceWorld=vec4(transformed,1.0);
   #ifdef USE_BATCHING
    surfaceWorld=batchingMatrix*surfaceWorld;
   #endif
   #ifdef USE_INSTANCING
    surfaceWorld=instanceMatrix*surfaceWorld;
   #endif
   surfacePoint=(modelMatrix*surfaceWorld).xyz;`);
  shader.fragmentShader=`varying vec3 surfacePoint; uniform float surfaceDatum;
   float surfaceHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float surfaceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float surfaceNear=1.-smoothstep(24.,90.,length(vViewPosition));
   vec3 surfaceCoord=surfacePoint*vec3(${p.scale.map(v=>v.toFixed(3)).join(',')});
   // Filter sub-pixel grain; it must not glitter during camera movement.
   float surfaceFilter=1.-smoothstep(.35,1.3,length(fwidth(surfaceCoord)));
   float surfaceFine=surfaceNoise(surfaceCoord)-.5;
   float surfaceAge=surfaceNoise(surfacePoint*2.7)-.5;
   diffuseColor.rgb*=1.+surfaceNear*${p.tone.toFixed(4)}*(surfaceAge+surfaceFine*surfaceFilter);
   ${kind==='wood'||kind==='bark'?'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.83,.88,.86),smoothstep(.02,.35,surfaceAge)*.42*surfaceNear);':''}
   ${kind==='brick'||kind==='plaster'?`float surfaceFoot=1.-smoothstep(.08,.70+surfaceAge*.5,surfacePoint.y-surfaceDatum);
    float surfaceRain=surfaceNoise(surfacePoint*vec3(8.,.28,8.));
    diffuseColor.rgb*=1.-surfaceFoot*.25;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.77,.83,.72),smoothstep(.53,.78,surfaceRain)*.24*surfaceNear);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.87,.91,.85),smoothstep(.10,.4,surfaceAge)*.28*surfaceNear);`:''}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+surfaceNear*(surfaceAge*.6+surfaceFine*surfaceFilter)*${p.rough.toFixed(4)},.08,1.);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float surfaceHeight=surfaceFine*surfaceFilter*surfaceNear*${p.bump.toFixed(6)};
   vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
   vec3 surfaceR1=cross(surfaceDy,normal),surfaceR2=cross(normal,surfaceDx);
   float surfaceDet=dot(surfaceDx,surfaceR1);
   vec3 surfaceGrad=sign(surfaceDet)*(dFdx(surfaceHeight)*surfaceR1+dFdy(surfaceHeight)*surfaceR2);
   normal=normalize(max(abs(surfaceDet),1e-9)*normal-surfaceGrad);
  `);
  if(kind==='ember')shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float heatCrack=smoothstep(.50,.72,surfaceNoise(surfacePoint*36.)+surfaceNoise(surfacePoint*103.)*.14);
   totalEmissiveRadiance*=.028+heatCrack*1.65;`);
  if(kind==='leaf')shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   // Restrained thin-leaf sky transmission preserves the dark canopy interior.
   outgoingLight+=diffuseColor.rgb*vec3(.13,.16,.085)*(.35+.65*abs(inverseTransformDirection(normal,viewMatrix).y));
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=>previousKey+'|surface-v1-'+kind;
 material.needsUpdate=true;return material;
}
export function refineObject(root:T.Object3D){
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!(m instanceof T.MeshStandardMaterial))continue;
   const kind=m.userData.surfaceKind as Surface|undefined??classifySurface(m.name);
   if(kind)refineSurface(m,kind);
   if(m.map)m.map.anisotropy=8;
  }
 });
}
/** Three's Material.clone omits shader callbacks; cutaway clipping must retain them. */
export function cloneSurface<M extends T.Material>(material:M):M{
 const clone=material.clone() as M;
 clone.onBeforeCompile=material.onBeforeCompile;
 clone.customProgramCacheKey=material.customProgramCacheKey;
 if(applied.has(material))applied.add(clone);
 return clone;
}

export function weatherArchitecture(root:T.Object3D,datum:number){
 const copies=new Map<T.Material,T.Material>();
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;
  const attach=(m:T.Material)=>{if(!(m instanceof T.MeshStandardMaterial)||!['brick','plaster'].includes(classifySurface(m.name)??''))return m;
   if(!copies.has(m)){const n=cloneSurface(m);n.userData.surfaceDatum=datum;copies.set(m,n);}return copies.get(m)!;};
  o.material=Array.isArray(o.material)?o.material.map(attach):attach(o.material);
 });
}
