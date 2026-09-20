import * as T from 'three';
import {bindMaterialAtlas,domesticAtlas} from './worked-materials';
import type {InteriorPlan} from './interior-plans';

/** Material loss, ground-in work dust and foot polish. Shared by room floors, never ceilings or furniture. */
export function wearFloor(material:T.MeshStandardMaterial,plan:InteriorPlan,floor:number,kind:'clay'|'stone'|'wood'){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 const destinations=plan.floors[floor].items.filter(a=>['prep','hearth','table','washstand','bed','sewingtable'].includes(a.kind)).slice(0,6);
 const routes=destinations.map(a=>new T.Vector4(0,plan.depth/2-.4,a.x,a.z+(a.z<0?a.d/2+.35:-a.d/2-.35)));
 while(routes.length<6)routes.push(new T.Vector4(0,0,0,0));
 material.userData.floorWear={kind,routes:destinations.length,finish:'scrubbed wear, old cracks, edge deposits and hearth dust'};
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.floorRoutes={value:routes};
  if(kind==='clay')bindMaterialAtlas(this,shader,'fwAtlas','fwAtlasReady',domesticAtlas());
  const hearth=plan.floors[floor].items.find(a=>a.kind==='hearth');
  shader.uniforms.floorHearth={value:new T.Vector2(hearth?.x??-100,hearth?.z??-100)};
  shader.uniforms.floorOrigin={value:new T.Vector2(plan.width/2-.10,plan.depth/2-.10)};
  shader.vertexShader='varying vec3 wornFloorPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwornFloorPoint=position;');
  shader.fragmentShader=`varying vec3 wornFloorPoint;uniform vec4 floorRoutes[6];uniform vec2 floorOrigin;uniform vec2 floorHearth;uniform sampler2D fwAtlas;uniform float fwAtlasReady;
   float fwHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float fwNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fwHash(i),fwHash(i+vec2(1,0)),f.x),mix(fwHash(i+vec2(0,1)),fwHash(i+vec2(1,1)),f.x),f.y);}
   float fwSegment(vec2 p,vec4 route){vec2 v=route.zw-route.xy;float t=clamp(dot(p-route.xy,v)/max(dot(v,v),.001),0.,1.);return length(p-route.xy-v*t);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 fwP=wornFloorPoint.xz;
   float fwBroad=fwNoise(fwP*4.3+${(plan.number*.71).toFixed(2)})-.5;
   float fwMottle=fwNoise(fwP*23.7)-.5;
   float fwFilter=1.-smoothstep(.35,1.3,length(fwidth(fwP*170.)));
   float fwGrain=(fwNoise(fwP*170.)-.5)*fwFilter;
   float fwPath=10.;for(int i=0;i<6;i++){fwPath=min(fwPath,fwSegment(fwP,floorRoutes[i]));}
   float fwPolish=1.-smoothstep(.12,.63+fwBroad*.26,fwPath);
   vec2 fwCell=fract((fwP+floorOrigin)/.2286);vec2 fwSide=min(fwCell,1.-fwCell)*.2286;
   float fwEdge=1.-smoothstep(.002,.009+fwMottle*.006,min(fwSide.x,fwSide.y));
   diffuseColor.rgb*=1.+fwBroad*${kind==='clay'?'.12':'.38'}+fwMottle*${kind==='clay'?'.10':'.35'}+fwGrain*.08;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.07,1.08,1.08),fwPolish*.45);
   float fwWall=min(floorOrigin.x-abs(fwP.x),floorOrigin.y-abs(fwP.y));
   float fwDeposit=(1.-smoothstep(.035,.32+fwBroad*.18,fwWall))*(.5+fwMottle);
   float fwSoot=exp(-length(fwP-floorHearth)*1.6)*(.6+fwBroad);
   float fwScuff=smoothstep(.08,.32,fwBroad+fwMottle*.3)*fwPolish;
   diffuseColor.rgb*=1.-fwDeposit*.28-fwSoot*.28-fwScuff*.12;
   vec2 fwIndex=floor((fwP+floorOrigin)/.2286);
   float fwRelief=0.;
   ${kind==='clay'?`// Random inset crops keep the two atlas panels and their mip borders separate.
   vec2 fwCrop=fwCell;
   if(fwHash(fwIndex+19.)>.5)fwCrop=fwCrop.yx;
   if(fwHash(fwIndex+27.)>.5)fwCrop.x=1.-fwCrop.x;
   if(fwHash(fwIndex+31.)>.5)fwCrop.y=1.-fwCrop.y;
   vec2 fwCropOffset=vec2(fwHash(fwIndex+43.),fwHash(fwIndex+59.))*.38;
   vec2 fwUV=vec2(.008, .016)+(fwCropOffset+fwCrop*.57)*vec2(.48,.96);
   vec3 fwClay=texture2D(fwAtlas,fwUV).rgb;
   float fwMineral=dot(fwClay,vec3(.2126,.7152,.0722));
   diffuseColor.rgb*=mix(vec3(1.),clamp(fwClay/vec3(.22,.105,.063),vec3(.48),vec3(1.85)),fwAtlasReady*.82);
   fwRelief=(fwMineral-.14)*.006*fwAtlasReady;
   `:''}
   float fwOld=step(.92,fwHash(fwIndex));
   vec2 fwFracture=fwHash(fwIndex+7.)>.5?fwCell.yx:fwCell;
   if(fwHash(fwIndex+13.)>.5)fwFracture.x=1.-fwFracture.x;
   float fwLine=abs(fwFracture.x-(.23+fwFracture.y*.47+sin(fwFracture.y*13.+fwHash(fwIndex)*6.)*.035))*.2286;
   float fwAA=max(fwidth(fwLine),.00035);
   float fwCrack=(1.-smoothstep(.00035,.0009+fwAA,fwLine))*fwOld;
   ${kind==='clay'?'diffuseColor.rgb*=1.+fwEdge*.13;diffuseColor.rgb*=1.-fwCrack*.36;':''}

  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor-fwPolish*.22+fwMottle*.10,.60,.98);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float fwHeight=(fwRelief+fwMottle*${kind==='clay'?'.0008':'.0028'}+fwGrain*${kind==='clay'?'.0004':'.0012'})*(1.-fwPolish*.65)${kind==='clay'?'-fwEdge*.0012-fwCrack*.0007':''};
   vec3 fwDx=dFdx(-vViewPosition),fwDy=dFdy(-vViewPosition),fwR1=cross(fwDy,normal),fwR2=cross(normal,fwDx);
   float fwDet=dot(fwDx,fwR1);vec3 fwGrad=sign(fwDet)*(dFdx(fwHeight)*fwR1+dFdy(fwHeight)*fwR2);
   normal=normalize(max(abs(fwDet),1e-9)*normal-fwGrad);
  `);
 };
 material.customProgramCacheKey=()=>previousKey+'|worked-floor-wear-v3-'+kind+'-'+plan.number;
 material.needsUpdate=true;return material;
}
