import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { baseGround,streamSurface, brooks, type Point } from './layout';
import {createBrookSpectrum,computeBrookSurface,cascadeHeightRms,FFT_SIZE,CASCADE_LENGTHS} from './brook-fft';

/** Three FFT cascades as repeating half-float textures, refreshed by a worker (synchronously
 * when workers are unavailable, e.g. in Node checks). Buffers are swapped, never copied. */
function brookCascades(){
  const N=FFT_SIZE,spec=createBrookSpectrum(),size=N*N*4;
  const textures=CASCADE_LENGTHS.map(()=>{const t=new T.DataTexture(new Uint16Array(size),N,N,T.RGBAFormat,T.HalfFloatType);
    t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;return t;});
  const data=()=>textures.map(t=>t.image.data as Uint16Array);
  computeBrookSurface(spec,0,data());textures.forEach(t=>t.needsUpdate=true);
  let worker:Worker|null=null,spare:ArrayBuffer[]|null=textures.map(()=>new Uint16Array(size).buffer),requested=-1,lastSync=-Infinity;
  if(typeof Worker!=='undefined')try{
    worker=new Worker(new URL('./brook-fft-worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=(event:MessageEvent<{t:number;buffers:ArrayBuffer[]}>)=>{
      const old=data();event.data.buffers.forEach((b,i)=>{textures[i].image.data=new Uint16Array(b);textures[i].needsUpdate=true;});
      spare=old.map(a=>a.buffer as ArrayBuffer);
    };
    worker.onerror=()=>{worker?.terminate();worker=null;};
  }catch{worker=null;}
  return {textures,heights:cascadeHeightRms(spec),
    step(time:number){
      if(time===requested)return;
      if(worker){if(!spare)return;const buffers=spare;spare=null;requested=time;worker.postMessage({t:time,buffers},buffers);return;}
      if(performance.now()-lastSync<30)return;lastSync=performance.now();requested=time;
      computeBrookSurface(spec,time,data());textures.forEach(t=>t.needsUpdate=true);
    }};
}

const brookCommon=`
  uniform float brookTime; uniform sampler2D fftA,fftB,fftC; uniform vec3 fftL;
  float bHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
  float bNoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(bHash(i),bHash(i+vec2(1,0)),u.x),mix(bHash(i+vec2(0,1)),bHash(i+vec2(1,1)),u.x),u.y);}
  float bFbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*bNoise(p);p=p*2.07+vec2(3.1,1.7);a*=.5;}return v;}
  // Two-phase flow-map advection: two copies travel with the local current half a cycle apart and
  // cross-fade, each reset hidden at zero weight and re-seeded with a fresh offset every cycle.
  const float FLOW_PERIOD=1.7;
  vec4 flowTap(sampler2D tex,float L,vec2 p,vec2 flow,float seed){
    float c=brookTime/FLOW_PERIOD+seed,ph0=fract(c),ph1=fract(c+.5),blend=abs(1.-2.*ph0);
    vec2 j0=fract(vec2(.6180,.3819)*floor(c)),j1=fract(vec2(.7548,.5698)*floor(c+.5));
    vec4 a=texture2D(tex,(p-flow*ph0*FLOW_PERIOD)/L+j0),b=texture2D(tex,(p-flow*ph1*FLOW_PERIOD)/L+j1);
    return mix(a,b,blend);
  }
  float flowFoam(vec2 p,vec2 flow){
    float c=brookTime/FLOW_PERIOD+.37,ph0=fract(c),ph1=fract(c+.5),blend=abs(1.-2.*ph0);
    vec2 s=vec2(4.2,2.6);
    float a=bFbm((p-flow*ph0*FLOW_PERIOD)*s+fract(vec2(.618,.382)*floor(c))*17.);
    float b=bFbm((p-flow*ph1*FLOW_PERIOD)*s+fract(vec2(.755,.570)*floor(c+.5))*17.);
    return mix(a,b,blend);
  }
`;

/** A local planar reflection over an FFT-cascade surface advected by a baked current. */
export function brookWater(scene:T.Scene) {
  const time={value:0}, reflectionMatrix={value:new T.Matrix4()}, reflectionStrength={value:0}, mirrorY={value:0};
  const cascades=brookCascades();
  const mirror=new Reflector(new T.PlaneGeometry(1,1),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.003});
  mirror.rotation.x=-Math.PI/2;
  const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.08,metalness:0,transparent:true,opacity:1,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{brookMirrorY:mirrorY,brookTime:time,brookReflection:{value:mirror.getRenderTarget().texture},brookMatrix:reflectionMatrix,brookReflectionStrength:reflectionStrength,
      fftA:{value:cascades.textures[0]},fftB:{value:cascades.textures[1]},fftC:{value:cascades.textures[2]},fftL:{value:new T.Vector3(...CASCADE_LENGTHS)}});
    shader.vertexShader=`attribute vec2 flowTangent; attribute vec2 channel; attribute vec2 flowVel; attribute vec4 stir;
      varying vec2 brookUv; varying vec2 brookTangent; varying vec4 brookProjected; varying vec2 vChannel; varying vec2 vFlow; varying vec4 vStir;
      uniform mat4 brookMatrix; uniform float brookMirrorY;\n`+brookCommon+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      brookUv=uv; brookTangent=flowTangent; vChannel=channel; vFlow=flowVel; vStir=stir;
      // Only the longest cascade is resolved by the mesh; it lifts the surface by millimetres to
      // centimetres, more where the water is broken.
      transformed.y+=flowTap(fftC,fftL.z,channel,flowVel,.0).x*(.6+1.6*stir.x);
      // One mirror serves the whole brook, but the water falls along it. Rendering the world mirrored
      // about the local surface equals rendering it about the mirror plane with the point moved to
      // 2·mirror − y, so the reflected bank stays seated on the waterline everywhere.
      vec4 brookWorld=modelMatrix*vec4(transformed,1.0);brookWorld.y=2.*brookMirrorY-brookWorld.y;
      brookProjected=brookMatrix*brookWorld;`);
    shader.fragmentShader=`uniform sampler2D brookReflection; uniform float brookReflectionStrength;
      varying vec2 brookUv; varying vec2 brookTangent; varying vec4 brookProjected; varying vec2 vChannel; varying vec2 vFlow; varying vec4 vStir;
      `+brookCommon+`
      vec3 brookSurface; // xy: slope (across, along), z: curvature
      void brookSample(){
        float speed=length(vFlow),turb=vStir.x;
        // Rougher where the water runs fast or is broken; a slow broad swell of amplitude keeps
        // neighbouring reaches from reading alike.
        float gain=(.2+1.15*turb)*(.5+.8*clamp(speed/.6,0.,1.))*(.7+.6*bNoise(vChannel*vec2(.31,.17)+vec2(0.,-brookTime*.04)));
        float fw=length(fwidth(vChannel));
        vec4 a=flowTap(fftA,fftL.x,vChannel,vFlow,.0),b=flowTap(fftB,fftL.y,vChannel,vFlow,.33),c=flowTap(fftC,fftL.z,vChannel,vFlow,.67);
        // Each band fades once its texels are smaller than a pixel footprint: no distant sparkle.
        // Short waves belong to fast or broken water; sheltered water keeps only the longer swell.
        float la=(smoothstep(.15,.55,speed)*.7+turb)*(1.-smoothstep(fftL.x/64.*.7,fftL.x/64.*5.,fw)),lb=1.-smoothstep(fftL.y/64.*.7,fftL.y/64.*5.,fw),lc=1.-smoothstep(fftL.z/64.*.7,fftL.z/64.*5.,fw);
        brookSurface=vec3(a.yz*la+b.yz*lb+c.yz*lc,a.w*la+b.w*lb*.5+c.w*lc*.25)*gain;
      }
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec2 along=normalize(brookTangent),across=vec2(-along.y,along.x);
      float bankFade=smoothstep(1.,.8,abs(brookUv.x-.5)*2.);
      vec2 grad=(across*brookSurface.x+along*brookSurface.y)*(.35+.65*bankFade);
      normal=normalize(mat3(viewMatrix)*normalize(vec3(-grad.x,1.,-grad.y)));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      brookSample(); // colour runs before the normal chunk; foam needs the curvature
      // Depth from the channel profile: clear, tea-brown shallows at the margins; deep peaty green mid-stream.
      float bank=abs(brookUv.x-.5)*2.0;
      float depth=(1.-bank*bank)*(.75+.25*bFbm(vec2(brookUv.x*4.,brookUv.y*.35)));
      vec3 shallow=vec3(.33,.27,.17),deep=vec3(.075,.105,.08);
      diffuseColor.rgb=mix(shallow,deep,smoothstep(.1,.85,depth));
      // The shoreline is where the bank climbs through the surface: fade on true water depth,
      // broken slightly so the edge never reads as a ruled line.
      float shore=smoothstep(.0,.07,vStir.w+(bNoise(vChannel*vec2(2.3,1.1))-.5)*.035);
      diffuseColor.a=mix(.28,.93,smoothstep(.05,.7,depth))*shore;
      // Foam only where the flow field puts it (stone waterlines, wake shear layers, slack margins),
      // as advected clumps; crests of the fine ripples add flecks inside those areas.
      float foamField=vStir.y*(.75+.25*smoothstep(.2,.8,vStir.x));
      float foamNoise=flowFoam(vChannel,vFlow)+clamp(-brookSurface.z*.004,0.,.25);
      float brookFoam=smoothstep(.98-foamField*.7,1.2-foamField*.7,foamNoise)*smoothstep(.02,.16,foamField)*.85;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.7,.71,.66),brookFoam);
      diffuseColor.a=mix(diffuseColor.a,.96*shore,brookFoam);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      // Broken water scatters: rougher with turbulence, so glints spread rather than chip white.
      roughnessFactor=mix(.05,.14,bank)+vStir.x*.24+clamp(length(fwidth(vChannel))*.5,0.,.2);
      roughnessFactor=mix(roughnessFactor,.75,brookFoam);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 reflectionUv=brookProjected.xy/brookProjected.w+grad*.045;
      vec2 reflectionSafe=clamp(reflectionUv,.004,.996);
      vec3 reflected=texture2D(brookReflection,reflectionSafe).rgb*.60;
      reflected+=texture2D(brookReflection,reflectionSafe+vec2(.0014,0.)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe-vec2(.0014,0.)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe+vec2(0.,.0014)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe-vec2(0.,.0014)).rgb*.10;
      float facing=abs(dot(normal,normalize(vViewPosition)));
      float fresnel=.03+.97*pow(1.0-facing,5.0);
      float valid=step(0.0,reflectionUv.x)*step(reflectionUv.x,1.0)*step(0.0,reflectionUv.y)*step(reflectionUv.y,1.0);
      // Fresnel splits reflection from transmission; looking down, most light comes from the bed.
      float strength=clamp(.06+fresnel*1.15,0.,1.)*brookReflectionStrength*valid*(1.-brookFoam)*shore;
      outgoingLight=mix(outgoingLight,reflected*.52,strength);
      // Reflection makes the water opaque at grazing angles; shallows stay clear when looked into.
      diffuseColor.a=mix(diffuseColor.a,1.,fresnel*.8*(1.-brookFoam))*shore;
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'brook-fft-flow-v5';
  let last=-Infinity;
  const hidden:T.Object3D[]=[];
  return {material,time,step:(t:number)=>cascades.step(t),
    reflect(renderer:T.WebGLRenderer,camera:T.Camera,target:T.Vector3,meshes:T.Mesh[],force=false) {
      const near=brooks.flat().reduce((a,b)=>Math.hypot(b[0]-target.x,b[1]-target.z)<Math.hypot(a[0]-target.x,a[1]-target.z)?b:a,brooks[0][0]);
      const distance=camera.position.distanceTo(new T.Vector3(near[0],streamSurface(...near),near[1]));
      reflectionStrength.value=1-T.MathUtils.smoothstep(distance,65,130);
      if(!reflectionStrength.value||(!force&&performance.now()-last<90))return;
      last=performance.now();
      // The mirror sits at the lowest water within reach: every local surface is then at or above it,
      // so its clip plane never removes the foot of a bank that the offset lookup needs.
      let low=streamSurface(...near);for(const q of brooks.flat())if(Math.hypot(q[0]-target.x,q[1]-target.z)<70)low=Math.min(low,streamSurface(...q));
      mirror.position.set(near[0],low,near[1]);mirror.updateMatrixWorld(true);mirrorY.value=low;
      hidden.length=0;
      scene.traverse(o=>{if(o.visible&&(meshes.includes(o as T.Mesh)||(o as T.Object3D & {isReflector?:boolean}).isReflector)){hidden.push(o);o.visible=false;}});
      try {mirror.onBeforeRender(renderer,scene,camera,mirror.geometry,mirror.material as T.ShaderMaterial,null as any);
        reflectionMatrix.value.copy((mirror.material as T.ShaderMaterial).uniforms.textureMatrix.value).multiply(new T.Matrix4().copy(mirror.matrixWorld).invert());
      } finally {for(const o of hidden)o.visible=true;}
    }
  };
}

// Source lines are digitised in different directions. Use their overall fall as
// an artistic flow direction; this is not a surveyed hydraulic model.
export function downstreamLine(line:Point[]):Point[]{
  return baseGround(...line[0])>=baseGround(...line[line.length-1])?line:[...line].reverse();
}
