import * as T from 'three';
import {bindMaterialAtlas} from './worked-materials';

export type TextureDetail='fired-brick'|'lime-mortar'|'split-slate'|'broadleaf-bark'|'cast-iron'|'dull-tin'|'salt-glaze'|'end-grain';
// Mean linear colour preserves the established household and landscape palette.
export const textureDetails:Record<TextureDetail,{atlas:string;half:number;mean:[number,number,number];metres:number;bump:number;rough:number;uv?:boolean}>={
 'fired-brick':{atlas:'brick-mortar',half:0,mean:[.2352,.0906,.0501],metres:.32,bump:.0009,rough:.08},
 'lime-mortar':{atlas:'brick-mortar',half:1,mean:[.4086,.3194,.2231],metres:.23,bump:.0006,rough:.06},
 'split-slate':{atlas:'slate-bark',half:0,mean:[.1094,.1155,.1219],metres:.52,bump:.0008,rough:.08},
 'broadleaf-bark':{atlas:'slate-bark',half:1,mean:[.1307,.1119,.0911],metres:1,bump:.005,rough:.08,uv:true},
 'cast-iron':{atlas:'iron-tin',half:0,mean:[.0554,.0518,.0489],metres:.34,bump:.00015,rough:.15},
 'dull-tin':{atlas:'iron-tin',half:1,mean:[.2404,.2488,.2450],metres:.50,bump:.00003,rough:.06,uv:true},
 'salt-glaze':{atlas:'pottery-endgrain',half:0,mean:[.1701,.0754,.0276],metres:.27,bump:.000018,rough:.04,uv:true},
 'end-grain':{atlas:'pottery-endgrain',half:1,mean:[.2354,.1572,.0947],metres:1,bump:.00006,rough:.06,uv:true},
};

/** Add a scoped material treatment; this does not change shared geometry or surface ownership. */
export function textureDetail<M extends T.MeshStandardMaterial>(material:M,kind:TextureDetail):M{
 if(material.userData.textureDetail===kind)return material;
 const d=textureDetails[kind],previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.userData.textureDetail=kind;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  bindMaterialAtlas(this,shader,'detailAtlas','detailReady',`/surface-textures/${d.atlas}-v1.webp`);
  shader.vertexShader='varying vec3 detailPoint;varying vec3 detailNormal;varying vec2 detailUV;\n'+shader.vertexShader;
  if(kind==='broadleaf-bark')shader.vertexShader='attribute float barkCoverage;varying float detailCoverage;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 detailWorld=vec4(transformed,1.);
   #ifdef USE_BATCHING
    detailWorld=batchingMatrix*detailWorld;
   #endif
   #ifdef USE_INSTANCING
    detailWorld=instanceMatrix*detailWorld;
   #endif
   detailPoint=(modelMatrix*detailWorld).xyz;
   detailNormal=inverseTransformDirection(transformedNormal,viewMatrix);detailUV=uv;
   ${kind==='broadleaf-bark'?'detailCoverage=barkCoverage;':''}
  `);
  shader.fragmentShader='varying vec3 detailPoint;varying vec3 detailNormal;varying vec2 detailUV;uniform sampler2D detailAtlas;uniform float detailReady;\n'+shader.fragmentShader;
  if(kind==='broadleaf-bark')shader.fragmentShader='varying float detailCoverage;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 dtN=abs(normalize(detailNormal));
   vec2 dtPlane=dtN.y>max(dtN.x,dtN.z)?detailPoint.xz:dtN.x>dtN.z?detailPoint.zy:detailPoint.xy;
   vec2 dtCoord=${d.uv?(kind==='broadleaf-bark'?'detailUV*vec2(.96,2.7)':'clamp(detailUV,0.,1.)'):`dtPlane/${d.metres.toFixed(3)}`};
   dtCoord=1.-abs(mod(dtCoord,2.)-1.);
   ${kind==='end-grain'?'dtCoord=vec2(.10,.147)+abs(dtCoord-.5)*vec2(1.65,1.62);':''}
   vec2 dtUV=vec2(${(.009+d.half*.5).toFixed(3)},.018)+dtCoord*vec2(.482,.964);
   vec3 dtSample=texture2D(detailAtlas,dtUV).rgb;
   vec3 dtRatio=clamp(dtSample/vec3(${d.mean.join(',')}),vec3(.35),vec3(1.9));
   float dtNear=1.-smoothstep(18.,65.,length(vViewPosition));
   float dtAmount=detailReady*dtNear${kind==='broadleaf-bark'?'*detailCoverage':''};
   diffuseColor.rgb*=mix(vec3(1.),dtRatio,dtAmount*${kind==='broadleaf-bark'?'.95':kind==='salt-glaze'||kind==='dull-tin'?'.55':'.82'});
   float dtValue=dot(dtRatio,vec3(.2126,.7152,.0722));
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+(dtValue-1.)*${d.rough}*dtAmount,.20,1.);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float dtHeight=(dtValue-1.)*${d.bump.toFixed(6)}*dtAmount;
   vec3 dtDx=dFdx(-vViewPosition),dtDy=dFdy(-vViewPosition),dtR1=cross(dtDy,normal),dtR2=cross(normal,dtDx);
   float dtDet=dot(dtDx,dtR1);vec3 dtGrad=sign(dtDet)*(dFdx(dtHeight)*dtR1+dFdy(dtHeight)*dtR2);
   normal=normalize(max(abs(dtDet),1e-9)*normal-dtGrad);
  `);
 };
 material.customProgramCacheKey=()=>key+'|texture-detail-v1-'+kind;
 material.needsUpdate=true;return material;
}

/** Existing architectural names select material types, not all pale or dark meshes. */
export function detailArchitecture(root:T.Object3D){
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!(m instanceof T.MeshStandardMaterial))continue;
   if(/brick/i.test(m.name)&&!/^Wall brick$/.test(m.name))textureDetail(m,'fired-brick');
   else if(/mortar/i.test(m.name))textureDetail(m,'lime-mortar');
   else if(/slate/i.test(m.name))textureDetail(m,'split-slate');
  }
 });
}
