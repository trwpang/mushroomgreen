import * as T from 'three';
import type {InteriorPlan} from './interior-plans';

/** Clean material loss and foot polish. Shared by room floors, never ceilings or furniture. */
export function wearFloor(material:T.MeshStandardMaterial,plan:InteriorPlan,floor:number,kind:'clay'|'stone'|'wood'){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 const destinations=plan.floors[floor].items.filter(a=>['prep','hearth','table','washstand','bed','sewingtable'].includes(a.kind)).slice(0,6);
 const routes=destinations.map(a=>new T.Vector4(0,plan.depth/2-.4,a.x,a.z+(a.z<0?a.d/2+.35:-a.d/2-.35)));
 while(routes.length<6)routes.push(new T.Vector4(0,0,0,0));
 material.userData.floorWear={kind,routes:destinations.length,finish:'worn clean; no dirt layer'};
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.uniforms.floorRoutes={value:routes};
  shader.uniforms.floorOrigin={value:new T.Vector2(plan.width/2-.10,plan.depth/2-.10)};
  shader.vertexShader='varying vec3 wornFloorPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwornFloorPoint=position;');
  shader.fragmentShader=`varying vec3 wornFloorPoint;uniform vec4 floorRoutes[6];uniform vec2 floorOrigin;
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
   diffuseColor.rgb*=1.+fwBroad*.20+fwMottle*.24+fwGrain*.07;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.07,1.08,1.08),fwPolish*.45);
   ${kind==='clay'?'diffuseColor.rgb*=1.+fwEdge*.085;':''}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor-fwPolish*.22+fwMottle*.10,.60,.98);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float fwHeight=(fwMottle*.0015+fwGrain*.0008)*(1.-fwPolish*.65)${kind==='clay'?'-fwEdge*.0006':''};
   vec3 fwDx=dFdx(-vViewPosition),fwDy=dFdy(-vViewPosition),fwR1=cross(fwDy,normal),fwR2=cross(normal,fwDx);
   float fwDet=dot(fwDx,fwR1);vec3 fwGrad=sign(fwDet)*(dFdx(fwHeight)*fwR1+dFdy(fwHeight)*fwR2);
   normal=normalize(max(abs(fwDet),1e-9)*normal-fwGrad);
  `);
 };
 material.customProgramCacheKey=()=>previousKey+'|clean-floor-wear-v1-'+kind+'-'+plan.number;
 material.needsUpdate=true;return material;
}
