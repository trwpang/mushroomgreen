import * as T from 'three';
import {cloneSurface} from '../rendering/surfaces';

type Finish='masonry'|'roof'|'timber';
/** Repairs belong to a building, not the world grid. No decals or extra texture sheets. */
export function ageBuilding(root:T.Object3D,number:number,workshop=false){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),cache=new Map<T.Material,T.Material>();
 let treated=0;
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||workshop&&/^(Interior|Hearth|Hood|Anvil|Tongs|Cinders)/.test(o.name))return;
  const apply=(source:T.Material)=>{
   if(!(source instanceof T.MeshStandardMaterial)||source.transparent)return source;
   if(cache.has(source))return cache.get(source)!;
   const name=source.name;
   const kind:Finish|undefined=/brick|mortar|limewash|wall lime|store brick/i.test(name)?'masonry':/slate|roof tiles|store slate/i.test(name)?'roof':/oak|store wood|shed timber/i.test(name)?'timber':undefined;
   // Interior lime, tools, glass, food and furnishings keep their own treatments.
   if(!kind)return source;
   const m=cloneSurface(source),previous=m.onBeforeCompile,key=m.customProgramCacheKey();
   const isStore=/Store|shed/i.test(name),profile=new T.Vector4(number*.731,workshop?1:0,isStore?1:0,number%5/4);
   m.userData.buildingAge={kind,number,workshop,interpretation:true};
   m.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.ageInverse={value:inverse};shader.uniforms.ageProfile={value:profile};
    shader.vertexShader='uniform mat4 ageInverse;varying vec3 agePoint;varying vec3 ageNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
     agePoint=(ageInverse*modelMatrix*vec4(transformed,1.)).xyz;
     ageNormal=mat3(ageInverse*modelMatrix)*normal;
    `);
    shader.fragmentShader=`varying vec3 agePoint;varying vec3 ageNormal;uniform vec4 ageProfile;
     float agHash(vec2 p){return fract(sin(dot(p,vec2(171.13,319.71)))*43758.5453);}
     float agNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(agHash(i),agHash(i+vec2(1,0)),f.x),mix(agHash(i+vec2(0,1)),agHash(i+vec2(1,1)),f.x),f.y);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 agP=agePoint,agN=abs(normalize(ageNormal));
     vec2 agPlane=agN.y>max(agN.x,agN.z)?agP.xz:agN.x>agN.z?agP.zy:agP.xy;
     float agSeed=ageProfile.x;
     float agBroad=agNoise(agPlane*1.7+agSeed);
     float agFine=agNoise(agPlane*37.+agSeed);
     float agWear=0.;float agRelief=0.;
     ${kind==='masonry'?`
      // Small lime repair campaigns follow irregular edges, rather than raised rectangular patches.
      float agBand=1.-smoothstep(.15,.50,abs(agP.y-(.62+ageProfile.w*.36)));
      float agRepair=smoothstep(.56,.75,agBroad+agFine*.10)*agBand*(.23+ageProfile.z*.10);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,1.20,1.13),agRepair);
      float agJoint=1.-smoothstep(.055,.105,abs(fract(agP.y/.085)-.5));
      float agRepoint=agJoint*agRepair*.32;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.30,.263,.202),agRepoint);
      // Different rebuilding campaigns occupy coherent sections of each wall.
      // Courses stay intact; a toothed boundary follows the masonry bond.
      float agCourse=floor(agP.y/.085);
      float agSeam=(ageProfile.w-.5)*3.+(mod(agCourse,2.)-.5)*.13;
      float agPhase=smoothstep(agSeam-.04,agSeam+.04,agPlane.x);
      float agOldPatch=smoothstep(.47,.69,agNoise(agPlane*.48+agSeed*.37));
      vec3 agReused=mix(vec3(.88,.85,.80),vec3(1.13,1.07,.96),ageProfile.w);
      diffuseColor.rgb*=mix(vec3(1.),agReused,agPhase*agOldPatch*.72);
      // Pale repairs gather around older lower fabric without a uniform white band.
      float agLimeLoss=(1.-smoothstep(.24,1.22,agP.y))*smoothstep(.56,.76,agBroad);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.17,1.15,1.10),agLimeLoss*.23);
      float agSplash=(1.-smoothstep(.04,.42,agP.y))*(.4+.6*agBroad);
      float agRain=smoothstep(.60,.82,agNoise(vec2(agPlane.x*8.,agP.y*.28)+agSeed))*(.05+ageProfile.z*.06);
      agWear=agSplash*.12+agRain;
      diffuseColor.rgb*=1.-agWear;
      agRelief=(agFine-.5)*agRepair*.0018;
     `:kind==='roof'?`
      // Isolated salvaged slates and small repaired runs retain the roof's original course geometry.
      vec2 agTile=floor(vec2(agP.x/.26,agP.z/.18));float agPiece=agHash(agTile+agSeed);
      float agRepair=step(.90,agPiece)*(.2+.8*smoothstep(.43,.72,agBroad));
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.16,1.18,1.17),agRepair*.48);
      float agRun=smoothstep(.55,.80,agNoise(vec2(agP.x*9.,agP.z*.45)+agSeed));
      agWear=agRun*.12+ageProfile.y*.07;
      // Larger coherent runs of reused tiles distinguish roof repairs from noise.
      float agCampaign=smoothstep(.54,.73,agNoise(agPlane*.57+agSeed));
      diffuseColor.rgb*=mix(vec3(1.),vec3(1.10,1.055,.97),agCampaign*.6);
      diffuseColor.rgb*=1.-agWear;
     `:`
      // Weathered grain, exposed ends and rubbed fixings; no arbitrary holes in the shell.
      float agSplit=pow(agNoise(vec2(agPlane.x*66.,agPlane.y*1.9)+agSeed),12.);
      agSplit*=1.-smoothstep(.35,1.2,length(fwidth(agPlane*vec2(66.,1.9))));
      float agFoot=(1.-smoothstep(.06,.34,agP.y))*(.3+agBroad*.7);
      agWear=agSplit*.22+agFoot*.12;
      diffuseColor.rgb*=1.-agWear;
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.13,1.13,1.10),smoothstep(.58,.79,agBroad)*.23);
      agRelief=-agSplit*.0009;
     `}
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=clamp(roughnessFactor+agWear*.12,.32,1.);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     vec3 agDx=dFdx(-vViewPosition),agDy=dFdy(-vViewPosition),agR1=cross(agDy,normal),agR2=cross(normal,agDx);
     float agDet=dot(agDx,agR1);vec3 agGrad=sign(agDet)*(dFdx(agRelief)*agR1+dFdy(agRelief)*agR2);
     normal=normalize(max(abs(agDet),1e-9)*normal-agGrad);
    `);
   };
   m.customProgramCacheKey=()=>key+'|building-age-v2-'+kind;
   cache.set(source,m);treated++;return m;
  };
  o.material=Array.isArray(o.material)?o.material.map(apply):apply(o.material);
 });
 root.userData.agedMaterials=treated;
 return treated;
}
