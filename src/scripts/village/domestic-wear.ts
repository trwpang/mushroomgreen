import * as T from 'three';
import type {InteriorPlan} from './interior-plans';

/** Room-local signs of use. Kept separate from the exterior weather finish. */
export function domesticWear(material:T.MeshStandardMaterial,plan:InteriorPlan,floor:number,base:number,kind:'wood'|'plaster'|'metal'|'cloth'|'ceramic'){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey(),hearth=plan.floors[floor].items.find(p=>p.kind==='hearth');
 material.userData.domesticWear=kind;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.dwHearth={value:new T.Vector2(hearth?.x??-100,hearth?.z??-100)};
  shader.uniforms.dwBase={value:base};
  const table=plan.floors[floor].items.find(p=>p.kind==='table');
  shader.uniforms.dwTable={value:new T.Vector4(table?.x??-100,table?.z??-100,table?.w??1,table?.d??1)};
  shader.vertexShader='varying vec3 domesticPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndomesticPoint=position;');
  shader.fragmentShader=`varying vec3 domesticPoint;uniform vec2 dwHearth;uniform float dwBase;uniform vec4 dwTable;
   float dwHash(vec2 p){return fract(sin(dot(p,vec2(73.13,219.7)))*43758.5453);}
   float dwNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(dwHash(i),dwHash(i+vec2(1,0)),f.x),mix(dwHash(i+vec2(0,1)),dwHash(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 dwP=domesticPoint;float dwY=max(0.,dwP.y-dwBase);
   float dwPatch=dwNoise(dwP.xz*3.7+dwP.y*.63);
   float dwSmoke=exp(-length(dwP.xz-dwHearth)*.85)*smoothstep(.6,2.3,dwY);
   float dwFoot=(1.-smoothstep(.05,.42,dwY))*(.4+.6*dwPatch);
   float dwUse=0.;
   ${kind==='plaster'?`dwUse=dwSmoke*.38+dwFoot*.20;diffuseColor.rgb*=1.-dwUse;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.89,.86,.78),smoothstep(.38,.73,dwPatch)*.17);`:''}
   ${kind==='wood'?`float dwGrain=dwNoise(vec2(dwP.x*89.,dwP.z*3.2+dwP.y));
    float dwScratch=smoothstep(.78,.9,dwGrain)*(1.-smoothstep(.35,1.2,length(fwidth(dwP.xz*vec2(89.,3.2)))));
    dwUse=dwPatch*.12+dwFoot*.2+dwSmoke*.13;
    diffuseColor.rgb*=1.-dwUse;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.18,1.15,1.08),dwScratch*.32);
    diffuseColor.rgb*=1.-smoothstep(.66,.85,dwNoise(dwP.xz*11.))*dwPatch*.12;
    vec2 dwLocal=dwP.xz-dwTable.xy;
    float dwTop=(1.-smoothstep(.006,.018,abs(dwY-.8125)))*(1.-step(dwTable.z*.5,abs(dwLocal.x)))*(1.-step(dwTable.w*.5,abs(dwLocal.y)));
    float dwRing=abs(length((dwLocal-vec2(dwTable.z*.32,-dwTable.w*.23))*vec2(1.,1.08))-.042);
    float dwRingAA=max(fwidth(dwRing),.0005);
    float dwMark=(1.-smoothstep(.001,.004+dwRingAA,dwRing))*(.45+.55*dwNoise(dwLocal*70.));
    diffuseColor.rgb*=1.-dwMark*dwTop*.24;
    float dwScrub=(1.-smoothstep(.15,.6,length(dwLocal*vec2(.9,1.4))))*dwTop;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.13,1.10,1.06),dwScrub*.65);`:''}
   ${kind==='metal'?`dwUse=.10+dwPatch*.17+dwSmoke*.12;diffuseColor.rgb*=1.-dwUse;`:''}
   ${kind==='cloth'?`dwUse=dwPatch*.13+dwFoot*.12+dwSmoke*.08;diffuseColor.rgb*=1.-dwUse;`:''}
   ${kind==='ceramic'?`dwUse=dwPatch*.055+dwFoot*.04;diffuseColor.rgb*=1.-dwUse;`:''}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+dwUse*.2,.28,1.);`);
 };
 material.customProgramCacheKey=()=>key+'|domestic-wear-v1-'+kind+'-'+plan.number+'-'+floor;
 material.needsUpdate=true;return material;
}
