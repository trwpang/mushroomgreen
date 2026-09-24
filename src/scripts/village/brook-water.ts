import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { baseGround,streamSurface, brooks, type Point } from './layout';

/** A local planar reflection, with metre-based flow coordinates along the channel. */
export function brookWater(scene:T.Scene) {
  const time={value:0}, reflectionMatrix={value:new T.Matrix4()}, reflectionStrength={value:0};
  const mirror=new Reflector(new T.PlaneGeometry(1,1),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.003});
  mirror.rotation.x=-Math.PI/2;
  const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.08,metalness:0,transparent:true,opacity:1,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{brookTime:time,brookReflection:{value:mirror.getRenderTarget().texture},brookMatrix:reflectionMatrix,brookReflectionStrength:reflectionStrength});
    shader.vertexShader=`attribute vec2 flowTangent; varying vec2 brookUv; varying vec2 brookTangent; varying vec4 brookProjected; uniform mat4 brookMatrix;\n`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      brookUv=uv; brookTangent=flowTangent; brookProjected=brookMatrix*modelMatrix*vec4(position,1.0);`);
    shader.fragmentShader=`uniform float brookTime; uniform sampler2D brookReflection; uniform float brookReflectionStrength;
      varying vec2 brookUv; varying vec2 brookTangent; varying vec4 brookProjected;
      float bHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float bNoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(bHash(i),bHash(i+vec2(1,0)),u.x),mix(bHash(i+vec2(0,1)),bHash(i+vec2(1,1)),u.x),u.y);}
      float bFbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*bNoise(p);p=p*2.07+vec2(3.1,1.7);a*=.5;}return v;}
      // Flow-map ripples: two noise layers advected downstream half a cycle apart and cross-faded,
      // so the pattern moves with the current without stretching. Returns a surface slope.
      vec2 brookSlope(vec2 uv,float t){
        vec2 q=vec2(uv.x*3.2,uv.y*1.15);
        float speed=.55+.35*(1.-abs(uv.x-.5)*2.);          // faster mid-channel
        float c0=fract(t*.35),c1=fract(t*.35+.5),w=abs(c0-.5)*2.;
        vec2 slope=vec2(0.);
        for(int k=0;k<2;k++){float c=k==0?c0:c1;vec2 p=q-vec2(0.,c*speed*2.4)+(k==0?vec2(0.):vec2(.37,.61));
          float e=.06,h=bFbm(p*2.2),hx=bFbm((p+vec2(e,0.))*2.2),hy=bFbm((p+vec2(0.,e))*2.2);
          float fine=bNoise(p*9.)-bNoise((p+vec2(.03,0.))*9.);
          vec2 g=vec2(hx-h,hy-h)/e*.09+vec2(fine,0.)*.12;slope+=g*(k==0?1.-w:w);}
        return slope;
      }
      vec2 brookWaves(){return brookSlope(brookUv,brookTime);}

`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec2 wave=brookWaves(); vec2 along=normalize(brookTangent); vec2 across=vec2(-along.y,along.x);
      float calm=smoothstep(.95,.55,abs(brookUv.x-.5)*2.);
      vec2 slope=(along*wave.y+across*wave.x)*(.35+.65*calm);
      normal=normalize(mat3(viewMatrix)*vec3(slope.x,1.0,slope.y));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      // Depth from the channel profile: clear, tea-brown shallows at the margins; deep peaty green mid-stream.
      float bank=abs(brookUv.x-.5)*2.0;
      float depth=(1.-bank*bank)*(.75+.25*bFbm(vec2(brookUv.x*4.,brookUv.y*.35)));
      vec3 shallow=vec3(.33,.27,.17),deep=vec3(.075,.105,.08);
      diffuseColor.rgb=mix(shallow,deep,smoothstep(.1,.85,depth));
      diffuseColor.a=mix(.28,.93,smoothstep(.05,.7,depth))*(1.0-smoothstep(.9,1.0,bank));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(.05,.14,bank);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 reflectionUv=brookProjected.xy/brookProjected.w+brookWaves()*.05;
      vec2 reflectionSafe=clamp(reflectionUv,.004,.996);
      vec3 reflected=texture2D(brookReflection,reflectionSafe).rgb*.60;
      reflected+=texture2D(brookReflection,reflectionSafe+vec2(.0014,0.)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe-vec2(.0014,0.)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe+vec2(0.,.0014)).rgb*.10;
      reflected+=texture2D(brookReflection,reflectionSafe-vec2(0.,.0014)).rgb*.10;
      float facing=abs(dot(normal,normalize(vViewPosition)));
      float fresnel=.03+.97*pow(1.0-facing,5.0);
      float valid=step(0.0,reflectionUv.x)*step(reflectionUv.x,1.0)*step(0.0,reflectionUv.y)*step(reflectionUv.y,1.0);
      float strength=clamp(.25+fresnel,0.,1.)*brookReflectionStrength*valid;
      outgoingLight=mix(outgoingLight,reflected*.52,strength);
      // Reflection makes the water opaque at grazing angles; shallows stay clear when looked into.
      diffuseColor.a=mix(diffuseColor.a,1.,fresnel*.8);
      // Churn where the current quickens: faint, broken foam flecks travelling downstream.
      float churn=smoothstep(.72,.9,bFbm(vec2(brookUv.x*6.,brookUv.y*1.8-brookTime*1.1)))*smoothstep(.2,.6,1.-bank);
      outgoingLight=mix(outgoingLight,vec3(.55,.56,.5),churn*.18);
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'brook-flow-reflection-v4';
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
