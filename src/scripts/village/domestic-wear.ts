import * as T from 'three';
import {bindMaterialAtlas,domesticAtlas} from './worked-materials';
import type {InteriorPlan} from './interior-plans';

/** Room-local signs of use. Kept separate from the exterior weather finish. */
export function domesticWear(material:T.MeshStandardMaterial,plan:InteriorPlan,floor:number,base:number,kind:'wood'|'plaster'|'brick'|'metal'|'cloth'|'ceramic'){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey(),hearth=plan.floors[floor].items.find(p=>p.kind==='hearth');
 material.userData.domesticWear=kind;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.dwHearth={value:new T.Vector2(hearth?.x??-100,hearth?.z??-100)};
  shader.uniforms.dwBase={value:base};
  const bed=plan.floors[floor].items.find(p=>p.kind==='bed');
  shader.uniforms.dwBed={value:new T.Vector2(bed?.x??100,bed?.z??100)};
  shader.uniforms.dwEntry={value:new T.Vector2(0,plan.depth/2)};
  if(kind==='plaster'||kind==='cloth')bindMaterialAtlas(this,shader,'dwSoftAtlas','dwSoftReady',domesticAtlas('lime-linen'));
  if(kind==='wood')bindMaterialAtlas(this,shader,'dwAtlas','dwAtlasReady',domesticAtlas());
  const table=plan.floors[floor].items.find(p=>p.kind==='table');
  shader.uniforms.dwTable={value:new T.Vector4(table?.x??-100,table?.z??-100,table?.w??1,table?.d??1)};
  shader.uniforms.dwTableAngle={value:table?.angle??0};
  shader.vertexShader='varying vec3 domesticNormal;varying vec2 domesticUV;varying vec3 domesticPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndomesticPoint=position;domesticNormal=normal;domesticUV=uv;');
  shader.fragmentShader=`varying vec3 domesticNormal;varying vec2 domesticUV;varying vec3 domesticPoint;uniform sampler2D dwSoftAtlas;uniform float dwSoftReady;uniform vec2 dwHearth;uniform float dwBase;uniform vec2 dwBed;uniform vec2 dwEntry;uniform vec4 dwTable;uniform float dwTableAngle;uniform sampler2D dwAtlas;uniform float dwAtlasReady;
   vec2 dwMirror(vec2 p){return 1.-abs(mod(p,2.)-1.);}
   float dwHash(vec2 p){return fract(sin(dot(p,vec2(73.13,219.7)))*43758.5453);}
   float dwNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(dwHash(i),dwHash(i+vec2(1,0)),f.x),mix(dwHash(i+vec2(0,1)),dwHash(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 dwP=domesticPoint;float dwY=max(0.,dwP.y-dwBase);
   float dwPatch=dwNoise(dwP.xz*3.7+dwP.y*.63);
   float dwSmoke=exp(-length(dwP.xz-dwHearth)*.85)*smoothstep(.6,2.3,dwY);
   float dwTransfer=exp(-length(dwP.xz-dwEntry)*1.25);
   float dwKept=exp(-length(dwP.xz-dwBed)*1.3);
   float dwFoot=(1.-smoothstep(.05,.42,dwY))*(.4+.6*dwPatch)*(.28+.72*dwTransfer)*(1.-dwKept*.70);
   float dwUse=0.;float dwRelief=0.;
   ${kind==='plaster'?`vec3 dwN=abs(domesticNormal);
    vec2 dwPlane=dwN.x>dwN.z?dwP.zy:dwP.xy;
    vec2 dwWallUV=vec2(.009,.018)+dwMirror(dwPlane*.57+${(plan.number*.137).toFixed(3)})*vec2(.482,.964);
    vec3 dwLime=texture2D(dwSoftAtlas,dwWallUV).rgb;
    float dwLimeValue=dot(dwLime,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuse*dwLime*.98,dwSoftReady*.88);
    dwRelief=(dwLimeValue-.55)*.0025*dwSoftReady;
    dwUse=dwSmoke*.40+dwFoot*.19;
    diffuseColor.rgb*=1.-dwUse;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.87,.84,.77),smoothstep(.38,.73,dwPatch)*.12);`:''}
   ${kind==='brick'?`dwUse=dwSmoke*.40+dwFoot*.19;diffuseColor.rgb*=1.-dwUse;`:''}
   ${kind==='wood'?`float dwGrain=dwNoise(vec2(dwP.x*89.,dwP.z*3.2+dwP.y));
    float dwScratch=smoothstep(.78,.9,dwGrain)*(1.-smoothstep(.35,1.2,length(fwidth(dwP.xz*vec2(89.,3.2)))));
    dwUse=dwPatch*.12+dwFoot*.2+dwSmoke*.13;
    diffuseColor.rgb*=1.-dwUse;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.18,1.15,1.08),dwScratch*.32);
    diffuseColor.rgb*=1.-smoothstep(.66,.85,dwNoise(dwP.xz*11.))*dwPatch*.12;
    vec2 dwWorldLocal=dwP.xz-dwTable.xy;
    float dwCos=cos(dwTableAngle),dwSin=sin(dwTableAngle);
    vec2 dwLocal=vec2(dwWorldLocal.x*dwCos-dwWorldLocal.y*dwSin,dwWorldLocal.x*dwSin+dwWorldLocal.y*dwCos);
    vec2 dwSize=abs(dwSin)>.5?dwTable.wz:dwTable.zw;
    float dwTop=(1.-smoothstep(.006,.018,abs(dwY-.8125)))*(1.-step(dwSize.x*.5,abs(dwLocal.x)))*(1.-step(dwSize.y*.5,abs(dwLocal.y)));
    // Continuous long grain, with a different cut from the oak panel for each plank.
    vec2 dwUnit=clamp(dwLocal/dwSize+.5,0.,1.);
    float dwPlank=dwUnit.x<.19?0.:dwUnit.x<.405?1.:dwUnit.x<.59?2.:dwUnit.x<.795?3.:4.;
    float dwStart=dwPlank<.5?0.:dwPlank<1.5?.19:dwPlank<2.5?.405:dwPlank<3.5?.59:.795;
    float dwWidth=dwPlank<.5?.19:dwPlank<1.5?.215:dwPlank<2.5?.185:.205;
    float dwBoardU=(dwUnit.x-dwStart)/dwWidth;
    float dwCut=dwHash(vec2(dwPlank,${plan.number.toFixed(1)}));
    vec2 dwUV=vec2(.51+(.06+dwCut*.49+dwBoardU*.32)*.48,.025+dwUnit.y*.94);
    vec3 dwOak=texture2D(dwAtlas,dwUV).rgb;
    float dwOakValue=dot(dwOak,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=mix(diffuseColor.rgb,dwOak*vec3(.97,.81,.64)*(1.-dwSmoke*.13),dwTop*dwAtlasReady*.86);
    dwRelief=(dwOakValue-.14)*.003*dwTop*dwAtlasReady;
    float dwRing=abs(length((dwLocal-vec2(dwSize.x*.32,-dwSize.y*.23))*vec2(1.,1.08))-.042);
    float dwRingAA=max(fwidth(dwRing),.0005);
    float dwMark=(1.-smoothstep(.001,.004+dwRingAA,dwRing))*(.45+.55*dwNoise(dwLocal*70.));
    diffuseColor.rgb*=1.-dwMark*dwTop*.24;
    float dwScrub=(1.-smoothstep(.15,.6,length(dwLocal*vec2(.9,1.4))))*dwTop;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.13,1.10,1.06),dwScrub*.65);`:''}
   ${kind==='metal'?`dwUse=.10+dwPatch*.17+dwSmoke*.12;diffuseColor.rgb*=1.-dwUse;`:''}
   ${kind==='cloth'?`vec2 dwClothUV=vec2(.51,.02)+dwMirror(domesticUV*2.7)*vec2(.48,.96);
    vec3 dwThread=texture2D(dwSoftAtlas,dwClothUV).rgb;
    float dwThreadValue=dot(dwThread,vec3(.2126,.7152,.0722));
    diffuseColor.rgb*=mix(vec3(1.),clamp(dwThread/vec3(.38,.35,.30),vec3(.55),vec3(1.65)),dwSoftReady*.72);
    dwRelief=(dwThreadValue-.35)*.0012*dwSoftReady;
    dwUse=(dwPatch*.09+dwFoot*.11+dwSmoke*.08)*(1.-dwKept*.65);diffuseColor.rgb*=1.-dwUse;`:''}
   ${kind==='ceramic'?`dwUse=dwPatch*.055+dwFoot*.04;diffuseColor.rgb*=1.-dwUse;`:''}
  `);
  if(['wood','plaster','cloth'].includes(kind))shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 dwDx=dFdx(-vViewPosition),dwDy=dFdy(-vViewPosition),dwR1=cross(dwDy,normal),dwR2=cross(normal,dwDx);
   float dwDet=dot(dwDx,dwR1);vec3 dwGrad=sign(dwDet)*(dFdx(dwRelief)*dwR1+dFdy(dwRelief)*dwR2);
   normal=normalize(max(abs(dwDet),1e-9)*normal-dwGrad);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+dwUse*.2,.28,1.);`);
 };
 material.customProgramCacheKey=()=>key+'|domestic-wear-v4-'+kind+'-'+plan.number+'-'+floor;
 material.needsUpdate=true;return material;
}
