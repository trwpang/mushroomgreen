import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { baseGround,streamSurface, brooks, type Point } from './layout';

/** A local planar reflection, with metre-based flow coordinates along the channel. */
export function brookWater(scene:T.Scene) {
  const time={value:0}, reflectionMatrix={value:new T.Matrix4()}, reflectionStrength={value:0};
  const mirror=new Reflector(new T.PlaneGeometry(1,1),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.003});
  mirror.rotation.x=-Math.PI/2;
  const material=new T.MeshStandardMaterial({color:'#26382d',roughness:.19,metalness:.12,transparent:true,opacity:.94,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{brookTime:time,brookReflection:{value:mirror.getRenderTarget().texture},brookMatrix:reflectionMatrix,brookReflectionStrength:reflectionStrength});
    shader.vertexShader=`attribute vec2 flowTangent; varying vec2 brookUv; varying vec2 brookTangent; varying vec4 brookProjected; uniform mat4 brookMatrix;\n`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      brookUv=uv; brookTangent=flowTangent; brookProjected=brookMatrix*modelMatrix*vec4(position,1.0);`);
    shader.fragmentShader=`uniform float brookTime; uniform sampler2D brookReflection; uniform float brookReflectionStrength;
      varying vec2 brookUv; varying vec2 brookTangent; varying vec4 brookProjected;
      vec2 brookWaves(){
        float downstream=brookUv.y-brookTime*.72;
        float eddy=sin(brookUv.y*1.7+sin(brookUv.x*11.)-brookTime*.4)*.6;
        return vec2(sin(downstream*10.0+sin(brookUv.x*19.0)+eddy)* .065 + sin(downstream*24.0+brookUv.x*31.0)*.018,
          cos(brookUv.x*28.0+downstream*5.0)*.045);
      }\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec2 wave=brookWaves(); vec2 along=normalize(brookTangent); vec2 across=vec2(-along.y,along.x);
      vec2 slope=along*wave.x+across*wave.y;
      normal=normalize(mat3(viewMatrix)*vec3(slope.x,1.0,slope.y));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float bank=abs(brookUv.x-.5)*2.0;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.145,.095),smoothstep(.55,1.0,bank));
      float sediment=.5+.5*sin(brookUv.y*3.1+sin(brookUv.x*17.));
      diffuseColor.rgb*=.92+sediment*.16;
      diffuseColor.a*=1.0-smoothstep(.84+sediment*.035,1.0,bank);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 reflectionUv=brookProjected.xy/brookProjected.w+brookWaves()*.024;
      vec2 reflectionSafe=clamp(reflectionUv,.004,.996);
      vec3 reflected=texture2D(brookReflection,reflectionSafe).rgb*.60;
      reflected+=texture2D(brookReflection,reflectionSafe+vec2(.0014,0.)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe-vec2(.0014,0.)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe+vec2(0.,.0014)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe-vec2(0.,.0014)).rgb*.10;
      float fresnel=.24+.38*pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);
      float valid=step(0.0,reflectionUv.x)*step(reflectionUv.x,1.0)*step(0.0,reflectionUv.y)*step(reflectionUv.y,1.0);
      outgoingLight=mix(outgoingLight,reflected*.43,fresnel*brookReflectionStrength*valid);
      // Broken glints travel downstream; they do not scroll sideways across bends.
      float phase=brookUv.y-brookTime*.72;
      float threads=pow(max(0.0,sin(brookUv.x*63.0+sin(phase*1.8)*1.65+sin(phase*4.7)*.5)),22.0);
      float flecks=pow(max(0.0,sin(phase*6.0+brookUv.x*18.0)),12.0);
      outgoingLight+=vec3(.13,.15,.12)*threads*flecks*(1.0-smoothstep(.5,1.0,abs(brookUv.x-.5)*2.0));
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'brook-flow-reflection-v3';
  let last=-Infinity;
  const hidden:T.Object3D[]=[];
  return {material,time,
    reflect(renderer:T.WebGLRenderer,camera:T.Camera,target:T.Vector3,meshes:T.Mesh[],force=false) {
      const near=brooks.flat().reduce((a,b)=>Math.hypot(b[0]-target.x,b[1]-target.z)<Math.hypot(a[0]-target.x,a[1]-target.z)?b:a,brooks[0][0]);
      const distance=camera.position.distanceTo(new T.Vector3(near[0],streamSurface(...near),near[1]));
      reflectionStrength.value=1-T.MathUtils.smoothstep(distance,65,130);
      if(!reflectionStrength.value||(!force&&performance.now()-last<90))return;
      last=performance.now();
      mirror.position.set(near[0],streamSurface(...near),near[1]);mirror.updateMatrixWorld(true);
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
