import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Brook-bank detail: weathered stones with smooth normals, and soft-rush clumps.
// Everything here uses its own seeds; callers keep the landscape RNG untouched.

const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

function hash3(x:number,y:number,z:number,seed:number){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,2147483647)^Math.imul(seed,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function noise3(x:number,y:number,z:number,seed:number){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,s=(t:number)=>t*t*(3-2*t),u=s(fx),v=s(fy),w=s(fz);
 const l=(a:number,b:number,t:number)=>a+(b-a)*t,h=(a:number,b:number,c:number)=>hash3(ix+a,iy+b,iz+c,seed);
 return l(l(l(h(0,0,0),h(1,0,0),u),l(h(0,1,0),h(1,1,0),u),v),l(l(h(0,0,1),h(1,0,1),u),l(h(0,1,1),h(1,1,1),u),v),w);
}

/**
 * Four stone shapes: water-rounded cobbles and blockier, split sandstone.
 * Displacement is position-based (duplicate icosphere vertices stay welded), then merged
 * for smooth normals. Bottoms are flattened so stones bed into the bank rather than balance on it.
 */
export function stoneVariants(detail:number){
 return [0,1,2,3].map(variant=>{
  const g=new T.IcosahedronGeometry(1,detail),p=g.attributes.position,seed=41+variant*17;
  const split=variant>=2,planes=split?[new T.Vector3(.8,.3,.2),new T.Vector3(-.4,.5,-.9),new T.Vector3(.1,.2,1)].map(v=>v.normalize()):[];
  for(let i=0;i<p.count;i++){
   const v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i));
   let r=1+(noise3(v.x*1.6+9,v.y*1.6,v.z*1.6,seed)-.5)*.42+(noise3(v.x*4.1,v.y*4.1+3,v.z*4.1,seed+1)-.5)*.2+(noise3(v.x*9,v.y*9,v.z*9+5,seed+2)-.5)*.06;
   v.multiplyScalar(r);
   // Split stones carry a few flat bedding/joint faces with softened arrises.
   for(const n of planes){const d=v.dot(n),cut=.62+variant*.04;if(d>cut)v.addScaledVector(n,-(d-cut)*.85);}
   v.y*=split?.72:.6;
   if(v.y<-.18)v.y=-.18+(v.y+.18)*.25;
   p.setXYZ(i,v.x,v.y,v.z);
  }
  g.deleteAttribute('normal');g.deleteAttribute('uv');
  const merged=mergeVertices(g,1e-4);g.dispose();merged.computeVertexNormals();merged.computeBoundingSphere();
  return merged;
 });
}

/** Adds moss on exposed tops, a dark wet band low on the stone and a damp sheen. */
export function weatherStones(material:T.MeshStandardMaterial){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader='attribute vec2 stoneWeather;varying vec2 stoneState;varying float stoneTop;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   stoneState=stoneWeather;
   #ifdef USE_INSTANCING
    stoneTop=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal).y;
   #else
    stoneTop=normalize(mat3(modelMatrix)*objectNormal).y;
   #endif`);
  shader.fragmentShader='varying vec2 stoneState;varying float stoneTop;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float stoneMossNoise=fract(sin(dot(floor(stonePoint*14.),vec3(12.9898,78.233,31.17)))*43758.5453)*.35+sin(stonePoint.x*6.+stonePoint.z*5.)*.25+.5;
   float stoneMoss=stoneState.x*smoothstep(.35,.85,stoneTop+stoneMossNoise*.35-.18)*smoothstep(-.05,.25,stonePoint.y);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.085,.115,.04)*(.75+stoneMossNoise*.5),stoneMoss*.9);
   float stoneWet=stoneState.y*(1.-smoothstep(-.16,.12,stonePoint.y));
   diffuseColor.rgb*=1.-stoneWet*.42;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.86,.9,.8),stoneState.y*.3);`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.34,stoneWet*.9);
   roughnessFactor=mix(roughnessFactor,1.,stoneMoss);`);
 };
 const key=material.customProgramCacheKey();
 material.customProgramCacheKey=()=>key+'|stone-weather-v1';
 return material;
}

/**
 * Soft-rush clump: tapered, arching blades with dark bases and a few spent brown tips.
 * Normals lean upward so thin blades shade softly instead of flickering by side.
 */
export function rushGeometry(){
 const random=seeded(3141865),position:number[]=[],normal:number[]=[],color:number[]=[],index:number[]=[];
 const base=new T.Color('#3f4a26'),mid=new T.Color('#65723a'),tip=new T.Color('#8b9451'),dry=new T.Color('#a38d5c');
 for(let blade=0;blade<13;blade++){
  const a=blade*2.39996+random()*.4,r=random()*.07,height=.5+random()*.55,lean=.18+random()*.5,width=.011+random()*.006;
  const out=new T.Vector3(Math.cos(a),0,Math.sin(a)),side=new T.Vector3(-out.z,0,out.x),spent=random()<.22;
  const start=position.length/3,segments=5;
  for(let k=0;k<=segments;k++){
   const t=k/segments,w=width*(1-t*.88),bend=lean*t*t*height;
   const c=out.clone().multiplyScalar(r+bend).add(new T.Vector3(0,height*t*(1-.18*t*lean),0));
   for(const s of [-1,1]){const q=c.clone().addScaledVector(side,s*w);position.push(q.x,q.y,q.z);
    const n=out.clone().multiplyScalar(.35).add(new T.Vector3(0,1,0)).addScaledVector(side,s*.25).normalize();normal.push(n.x,n.y,n.z);
    const col=t<.5?base.clone().lerp(mid,t*2):mid.clone().lerp(spent&&t>.7?dry:tip,(t-.5)*2);col.multiplyScalar(.9+random()*.2);color.push(col.r,col.g,col.b);}
   if(k)index.push(start+(k-1)*2,start+(k-1)*2+1,start+k*2+1,start+(k-1)*2,start+k*2+1,start+k*2);
  }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
 g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(index);g.computeBoundingSphere();
 return g;
}

/** Tip-weighted sway for rushes, using the shared scene clock. */
export function swayRushes(material:T.MeshStandardMaterial,time:{value:number}){
 material.onBeforeCompile=shader=>{
  shader.uniforms.rushTime=time;
  shader.vertexShader='uniform float rushTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    float rushPhase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.53;
   #else
    float rushPhase=0.;
   #endif
   float rushBend=position.y*position.y;
   transformed.x+=sin(rushTime*1.6+rushPhase)*.05*rushBend;
   transformed.z+=cos(rushTime*1.3+rushPhase*1.7)*.035*rushBend;`);
 };
 material.customProgramCacheKey=()=>'rush-sway-v1';
 return material;
}

export {seeded as bankRandom};
