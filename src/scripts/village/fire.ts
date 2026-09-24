import * as T from 'three';
import {requestLight,lightPoolInstalled,type PooledLight} from './light-pool';

// Coal fires for the forge hearths and cottage grates. WebGL only, no simulation textures:
//  1. Fuel bed: lumpy coal whose heat field (slow fbm) separates dark coal, pale ash and hot cracks.
//  2. Flames: short tongues on crossed sheets; a rising, curling noise field shapes each tongue and
//     keeps it inside the hearth footprint.
//  3. Sparks: a fixed pool that rises, drifts and fades, drawn as one points call.
//  4. Smoke: soft wisps drawn toward the hood throat (forges) or the flue (cottages).
//  5. Firelight: one pooled point light whose flicker follows the same heat signal.
// Everything shares one time uniform; flames, sparks and smoke sit on layer 1 (out of the AO pass).

export const fireTime={value:0};

const NOISE=`
float fHash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float fNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(fHash(i),fHash(i+vec3(1,0,0)),f.x),mix(fHash(i+vec3(0,1,0)),fHash(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(fHash(i+vec3(0,0,1)),fHash(i+vec3(1,0,1)),f.x),mix(fHash(i+vec3(0,1,1)),fHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fFbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*fNoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}
`;

const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

let flameMaterial:T.ShaderMaterial|null=null,sparkMaterial:T.ShaderMaterial|null=null,smokeMaterial:T.ShaderMaterial|null=null;

function getFlameMaterial(){
 return flameMaterial??=new T.ShaderMaterial({
  uniforms:{time:fireTime},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:`attribute vec2 flameSeed;varying vec2 vUv;varying vec2 vSeed;varying float vFade;
   void main(){vUv=uv;vSeed=flameSeed;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.);
    // Fade sheets seen edge-on so the crossed planes never read as flat cards.
    vec3 n=normalize(mat3(modelMatrix*instanceMatrix)*vec3(0.,0.,1.));vec3 view=normalize(cameraPosition-world.xyz);
    vFade=smoothstep(.08,.45,abs(dot(n,view)));gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`uniform float time;varying vec2 vUv;varying vec2 vSeed;varying float vFade;${NOISE}
   void main(){
    float t=time*(1.6+vSeed.y*.6)+vSeed.x*17.;
    vec2 p=vUv;
    // Rising, curling distortion: the tongue sways more toward its tip.
    float sway=(fFbm(vec3(p.y*2.2-t*.9,vSeed.x*9.,t*.25))-.5)*.55*p.y;
    float x=(p.x-.5-sway)*2.;
    float body=fFbm(vec3(x*2.1,p.y*3.4-t*2.4,vSeed.x*5.+t*.3));
    // Tongue silhouette: broad at the bed, torn and tapering above.
    float width=mix(.95,.08,pow(p.y,.8))*(.75+body*.55);
    float shape=smoothstep(width,width*.35,abs(x))*smoothstep(0.,.08,p.y)*(1.-smoothstep(.55+body*.4,1.,p.y));
    float heat=clamp(shape*(1.25-p.y*.9)+body*.15*shape,0.,1.);
    vec3 colour=mix(vec3(.55,.08,.01),vec3(1.,.42,.06),smoothstep(.1,.55,heat));
    colour=mix(colour,vec3(1.,.66,.26),smoothstep(.62,.95,heat));
    float alpha=shape*vFade;
    gl_FragColor=vec4(colour*alpha*1.05,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
 });
}

function getSparkMaterial(){
 return sparkMaterial??=new T.ShaderMaterial({
  uniforms:{time:fireTime,scale:{value:320}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:`attribute vec4 spark;uniform float time;uniform float scale;varying float vLife;
   void main(){float life=fract(time*spark.w+spark.x);vLife=life;
    vec3 p=position+vec3(sin(time*2.+spark.y*9.)*.05*life+spark.y*.12*life,life*life*.9*spark.z+life*.25,cos(time*1.7+spark.x*7.)*.05*life);
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=scale*.012*(1.-life*.6)/-mv.z;}`,
  fragmentShader:`varying float vLife;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;
   float a=(1.-smoothstep(.1,.5,d))*(1.-smoothstep(.55,1.,vLife))*step(.04,vLife);
   gl_FragColor=vec4(vec3(1.,.55,.18)*a*2.,a);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`,
 });
}

let smokeTexture:T.CanvasTexture|null=null;
export function softSmokeTexture(){
 if(smokeTexture)return smokeTexture;
 // Node validation builds rooms without a DOM; a blank texture keeps the geometry checks working.
 if(typeof document==='undefined')return smokeTexture=new T.CanvasTexture({width:1,height:1} as unknown as HTMLCanvasElement);
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;const rnd=seeded(4401);
 for(let i=0;i<26;i++){const x=64+(rnd()-.5)*48,y=64+(rnd()-.5)*48,r=14+rnd()*30,grad=g.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,'rgba(255,255,255,.16)');grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);}
 // Fade the square's edges so no billboard corner is ever visible.
 const img=g.getImageData?.(0,0,128,128);if(img?.data)for(let y=0;y<128;y++)for(let x=0;x<128;x++){const d=Math.hypot(x-63.5,y-63.5)/64;img.data[(y*128+x)*4+3]*=Math.max(0,1-d*d);}
 if(img?.data)g.putImageData(img,0,0);smokeTexture=new T.CanvasTexture(c);return smokeTexture;
}
function getSmokeMaterial(){
 return smokeMaterial??=new T.ShaderMaterial({
  uniforms:{time:fireTime,map:{value:softSmokeTexture()},...T.UniformsLib.fog},transparent:true,depthWrite:false,fog:true,
  vertexShader:`attribute vec4 puff;attribute vec3 target;uniform float time;varying vec2 vUv;varying float vAlpha;varying float vLife;
   #include <fog_pars_vertex>
   void main(){vUv=uv;float life=fract(time*puff.w+puff.x);vLife=life;
    // Rise from the fuel bed, drawn toward the hood/flue throat, spreading as it goes.
    vec3 start=vec3(puff.y,0.,puff.z)*.4;vec3 p=mix(start,target,smoothstep(0.,1.,life))+vec3(sin(time*.7+puff.x*20.)*.04,0.,cos(time*.5+puff.x*13.)*.04)*life;
    float size=mix(.12,.42,life);vAlpha=smoothstep(0.,.2,life)*(1.-smoothstep(.55,1.,life));
    vec4 mvPosition=modelViewMatrix*vec4(p,1.);float a=puff.x*6.28+time*.2;mvPosition.xy+=mat2(cos(a),-sin(a),sin(a),cos(a))*(position.xy*size);
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
   }`,
  fragmentShader:`uniform sampler2D map;varying vec2 vUv;varying float vAlpha;varying float vLife;
   #include <fog_pars_fragment>
   void main(){float a=texture2D(map,vUv).a*vAlpha*.55;vec3 c=mix(vec3(.42,.36,.30),vec3(.55,.53,.5),vLife);gl_FragColor=vec4(c,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`,
 });
}

/** Crossed flame sheet: three vertical 1×1 quads at 60°, origin at the base centre. */
let sheet:T.BufferGeometry|null=null;
function flameSheet(){
 if(sheet)return sheet;
 const parts:number[]=[],uv:number[]=[],index:number[]=[];
 for(let k=0;k<3;k++){const a=k*Math.PI/3,c=Math.cos(a)*.5,s=Math.sin(a)*.5,b=parts.length/3;
  parts.push(-c,0,-s,c,0,s,c,1,s,-c,1,-s);uv.push(0,0,1,0,1,1,0,1);index.push(b,b+1,b+2,b,b+2,b+3);}
 sheet=new T.BufferGeometry();sheet.setAttribute('position',new T.Float32BufferAttribute(parts,3));sheet.setAttribute('uv',new T.Float32BufferAttribute(uv,2));sheet.setIndex(index);
 return sheet;
}

function fuelBed(width:number,depth:number,seed:number){
 const rnd=seeded(seed),g=new T.PlaneGeometry(width,depth,26,20);g.rotateX(-Math.PI/2);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=Math.min(1,Math.min(width/2-Math.abs(x),depth/2-Math.abs(z))/(Math.min(width,depth)*.25));
  const lumps=Math.abs(Math.sin(x*61+rnd()*.3)*Math.sin(z*57+seed))*.022+rnd()*.012;p.setY(i,(lumps+.012)*Math.max(.15,edge));}
 g.computeVertexNormals();return g;
}

function fuelMaterial(heatScale:number){
 const m=new T.MeshStandardMaterial({color:'#1c1a17',roughness:.95,emissive:'#ffffff',emissiveIntensity:1});
 m.onBeforeCompile=shader=>{
  shader.uniforms.fireTime=fireTime;shader.uniforms.fireHeat={value:heatScale};
  shader.vertexShader='varying vec3 fuelPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfuelPoint=position;');
  shader.fragmentShader='uniform float fireTime;uniform float fireHeat;varying vec3 fuelPoint;\n'+NOISE+shader.fragmentShader
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec2 fp=fuelPoint.xz*28.;
    float cell=fFbm(vec3(fp,0.)),crack=1.-smoothstep(.02,.09,abs(fFbm(vec3(fp*1.7,3.))-.5));
    float heat=fFbm(vec3(fuelPoint.xz*6.,fireTime*.18))*1.25-.18;
    float centre=1.-smoothstep(.25,1.,length(fuelPoint.xz/vec2(.3,.22)));
    heat=clamp(heat*(.45+.75*centre)*fireHeat,0.,1.);
    float ash=smoothstep(.55,.8,cell)*(1.-heat);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.46,.44,.41),ash*.8);
    float glow=heat*(.35+.65*crack)*(1.-ash)+heat*heat*.45;
    float flick=.85+.15*fNoise(vec3(fuelPoint.xz*9.,fireTime*2.3));`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    totalEmissiveRadiance=mix(vec3(0.),mix(vec3(.9,.16,.02),vec3(1.,.55,.14),smoothstep(.45,.95,glow)),glow)*2.4*flick;`);
 };
 m.customProgramCacheKey=()=>'fuel-bed-v1';return m;
}

export type FireOptions={width:number;depth:number;flameHeight:number;tongues?:number;sparks?:number;smoke?:T.Vector3|null;light?:{intensity:number;distance:number;offset:T.Vector3}|null;heat?:number;seed?:number};
export function createFire(o:FireOptions){
 const rnd=seeded(o.seed??7),group=new T.Group();group.name='Coal fire';
 const bed=new T.Mesh(fuelBed(o.width,o.depth,o.seed??7),fuelMaterial(o.heat??1));bed.receiveShadow=true;group.add(bed);
 const count=o.tongues??7,flames=new T.InstancedMesh(flameSheet(),getFlameMaterial(),count),seeds=new Float32Array(count*2),d=new T.Object3D();
 for(let i=0;i<count;i++){const x=(rnd()-.5)*o.width*.6,z=(rnd()-.5)*o.depth*.55,h=o.flameHeight*(.55+rnd()*.6),w=Math.min(o.width,o.depth)*(.35+rnd()*.25);
  d.position.set(x,.01,z);d.rotation.set(0,rnd()*Math.PI,0);d.scale.set(w,h,w);d.updateMatrix();flames.setMatrixAt(i,d.matrix);seeds[i*2]=rnd();seeds[i*2+1]=rnd();}
 flames.geometry=flames.geometry.clone();flames.geometry.setAttribute('flameSeed',new T.InstancedBufferAttribute(seeds,2));
 flames.layers.set(1);flames.renderOrder=4;flames.frustumCulled=false;group.add(flames);
 const sparkCount=o.sparks??24;
 if(sparkCount){const pos=new Float32Array(sparkCount*3),data=new Float32Array(sparkCount*4);
  for(let i=0;i<sparkCount;i++){pos.set([(rnd()-.5)*o.width*.5,.03,(rnd()-.5)*o.depth*.5],i*3);data.set([rnd(),rnd()-.5,.6+rnd()*.8,.35+rnd()*.5],i*4);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('spark',new T.BufferAttribute(data,4));
  const sparks=new T.Points(g,getSparkMaterial());sparks.layers.set(1);sparks.frustumCulled=false;sparks.renderOrder=5;group.add(sparks);}
 if(o.smoke){const n=16,base=new T.PlaneGeometry(1,1),g=new T.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.getAttribute('position'));g.setAttribute('uv',base.getAttribute('uv'));
  const puff=new Float32Array(n*4),target=new Float32Array(n*3);for(let i=0;i<n;i++){puff.set([i/n+rnd()*.05,(rnd()-.5)*o.width,(rnd()-.5)*o.depth,.07+rnd()*.05],i*4);target.set([o.smoke.x+(rnd()-.5)*.1,o.smoke.y,o.smoke.z+(rnd()-.5)*.1],i*3);}
  g.setAttribute('puff',new T.InstancedBufferAttribute(puff,4));g.setAttribute('target',new T.InstancedBufferAttribute(target,3));g.instanceCount=n;
  const smoke=new T.Mesh(g,getSmokeMaterial());smoke.layers.set(1);smoke.frustumCulled=false;smoke.renderOrder=3;group.add(smoke);}
 // Firelight follows the fuel bed's slow heat plus a faster flicker.
 let light:PooledLight|T.PointLight|null=null;const base=o.light?.intensity??0,phase=rnd()*10;
 if(o.light){const anchor=new T.Object3D();anchor.position.copy(o.light.offset);group.add(anchor);
  if(lightPoolInstalled())light=requestLight(anchor,'#ff9a4a',base,o.light.distance);
  else{const p=new T.PointLight('#ff9a4a',base,o.light.distance,2);anchor.add(p);light=p;}}
 return {group,
  update(time:number){if(light)light.intensity=base*(.82+.1*Math.sin(time*7.3+phase)+.06*Math.sin(time*13.1+phase*2)+.05*Math.sin(time*2.1+phase));},
  dispose(){if(light&&'release' in light)light.release();bed.geometry.dispose();(bed.material as T.Material).dispose();flames.geometry.dispose();group.traverse(x=>{if(x instanceof T.Points||x instanceof T.Mesh&&x!==bed&&x!==flames)x.geometry.dispose();});}};
}
