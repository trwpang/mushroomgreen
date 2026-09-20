import * as T from 'three';
import {cloneSurface} from '../rendering/surfaces';
import {bindMaterialAtlas,domesticAtlas} from './worked-materials';

/** Deposits follow the three authored hearths and anvils, in workshop-local metres. */
export function wearWorkshop(root:T.Group){
 root.updateMatrixWorld(true);
 const inverse=root.matrixWorld.clone().invert();
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||! /^(Interior|Hearth|Hood|Anvil|Tongs)/.test(o.name))return;
  const plaster=/^Interior_lime/.test(o.name),floor=/^Interior/.test(o.name)&&!plaster;
  const face=/^Anvil_face/.test(o.name),hood=/^Hood/.test(o.name);
  const apply=(source:T.Material)=>{
   if(!(source instanceof T.MeshStandardMaterial))return source;
   const m=cloneSurface(source),previous=m.onBeforeCompile,key=m.customProgramCacheKey();
   m.userData.workshopWear={plaster,floor,face,hood};
   m.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.shopInverse={value:inverse};
    if(plaster)bindMaterialAtlas(this,shader,'shopAtlas','shopAtlasReady',domesticAtlas('lime-linen'));
    shader.vertexShader='uniform mat4 shopInverse;varying vec3 shopPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nshopPoint=(shopInverse*modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`varying vec3 shopPoint;uniform sampler2D shopAtlas;uniform float shopAtlasReady;
     float shopHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
     float shopNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(shopHash(i),shopHash(i+vec2(1,0)),f.x),mix(shopHash(i+vec2(0,1)),shopHash(i+vec2(1,1)),f.x),f.y);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 swP=shopPoint;
     float swStation=min(abs(swP.x),min(abs(swP.x-3.),abs(swP.x+3.)));
     float swHearth=length(vec2(swStation,swP.z-1.6));
     float swAnvil=length(vec2(swStation,swP.z-.72));
     float swPatch=shopNoise(swP.xz*5.7+swP.y*.3);
     float swSoot=exp(-swHearth*.95)*smoothstep(.3,2.35,swP.y)*(.72+.28*swPatch);
     float swDust=exp(-swHearth*1.05)*(1.-smoothstep(.10,.35,swP.y));
     ${plaster?`vec2 swWall=abs(swP.x)>4.2?swP.zy:swP.xy;
      vec2 swUV=vec2(.009,.018)+(1.-abs(mod(swWall*.58,2.)-1.))*vec2(.482,.964);
      vec3 swLime=texture2D(shopAtlas,swUV).rgb;
      diffuseColor.rgb*=mix(vec3(1.),clamp(swLime/vec3(.62,.58,.51),vec3(.45),vec3(1.55)),shopAtlasReady*.8);
      diffuseColor.rgb*=1.-swSoot*.62;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.040,.033,.026),swSoot*.26);`:''}
     ${floor?`// Millimetre-scale dark oxide flakes gather under the anvils; the aisle remains swept.
      vec2 swCell=fract(swP.xz*130.)-.5;
      float swSpeck=(1.-smoothstep(.08,.19,length(swCell*vec2(1.,1.8))))*step(.65,shopHash(floor(swP.xz*130.)));
      swSpeck*=1.-smoothstep(.35,1.2,length(fwidth(swP.xz*130.)));
      float swScale=exp(-swAnvil*1.65)*(.4+.6*swPatch);
      diffuseColor.rgb*=1.-swScale*.48-swSpeck*swScale*.62;
      float swWorkStrip=exp(-pow((swP.z-.60)/.66,2.))*(.55+.45*swPatch);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.047,.040,.029),swWorkStrip*.32);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.143,.117),swDust*.36);`:''}
     ${hood?'diffuseColor.rgb*=.52+swPatch*.15;':!floor&&!plaster&&!face?'diffuseColor.rgb*=.79+swPatch*.12;':''}
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=${face?'clamp(roughnessFactor-.12,.36,.7)':'clamp(roughnessFactor+.10,.65,1.)'};
    `);
   };
   m.customProgramCacheKey=()=>key+'|workshop-use-v1-'+[plaster,floor,face,hood].join('-');
   return m;
  };
  o.material=Array.isArray(o.material)?o.material.map(apply):apply(o.material);
 });
}
