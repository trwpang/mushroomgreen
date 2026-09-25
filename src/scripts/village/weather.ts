import * as T from 'three';
/**
 * Rain, decided once per visit and steady for its whole length. Currently OFF for visitors (pending
 * rain sound and on-screen controls); ?rain=1 turns it on for development.
 *
 * Rain is a camera-following volume of thin streaks animated entirely in the vertex shader: the
 * volume wraps in world space, so drops fall past the viewer rather than moving with them.
 * `wetness` is set with the visit: wet ground, paths with a sheen.
 */
export const wetness={value:0};
export function createWeather(scene:T.Scene){
 const query=new URLSearchParams(location.search),mode=query.get('rain');
 // Rain is off for visitors until its sound and controls are reworked; ?rain=1 still shows it for
 // development. (Was: about one visit in four.)
 const raining=mode==='1',amount=raining?.85:0;
 wetness.value=amount;
 const COUNT=10000,BOX=44,HEIGHT=26;
 const seeds=new Float32Array(COUNT*3);let s=91;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 for(let i=0;i<COUNT*3;i++)seeds[i]=rand();
 // One thin vertical quad per streak; the vertex shader places, animates and faces it.
 const base=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();
 geometry.index=base.index;geometry.setAttribute('position',base.getAttribute('position'));geometry.setAttribute('uv',base.getAttribute('uv'));
 geometry.setAttribute('seed',new T.InstancedBufferAttribute(seeds,3));geometry.instanceCount=COUNT;
 // Fog-aware ShaderMaterials must carry three's fog uniforms.
 const uniforms={...T.UniformsUtils.clone(T.UniformsLib.fog),rainTime:{value:0},rainFade:{value:1},rainCamera:{value:new T.Vector3()},rainColour:{value:new T.Color('#b4bcc0')}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,fog:true,
  vertexShader:`attribute vec3 seed;uniform float rainTime,rainFade;uniform vec3 rainCamera;varying float rainAlpha;varying vec2 rainUv;
   #include <fog_pars_vertex>
   void main(){
    // Speed must not correlate with the start height (seed.z), or drops fall into bands that sweep
    // through the view as bursts. It gets its own hash.
    float speed=8.5+fract(sin(dot(seed,vec3(12.9898,78.233,37.719)))*43758.5453)*2.5,box=${BOX.toFixed(1)},height=${HEIGHT.toFixed(1)};
    vec3 wind=vec3(1.1,0.,.45);
    // World-space wrap around the camera: drops fall past the viewer.
    vec3 p;p.xz=rainCamera.xz+mod(seed.xy*box-rainCamera.xz+box*.5,box)-box*.5;
    float fall=mod(seed.z*height-rainTime*speed,height);p.y=rainCamera.y-height*.45+fall;
    p.xz+=wind.xz*(fall/speed)*.9;
    vec3 toCam=normalize(vec3(rainCamera.x-p.x,0.,rainCamera.z-p.z)+1e-4),side=normalize(cross(vec3(0.,1.,0.),toCam));
    vec3 slant=normalize(vec3(-wind.x/speed,-1.,-wind.z/speed));
    float len=.38+seed.y*.28;
    vec3 world=p+side*position.x*.011+(-slant)*position.y*len;
    vec4 mv=viewMatrix*vec4(world,1.);
    float d=length(mv.xyz);
    rainAlpha=rainFade*smoothstep(2.,5.,d)*(1.-smoothstep(14.,26.,d))*(.17+.1*seed.x);
    rainUv=uv;
    gl_Position=projectionMatrix*mv;
    vec4 mvPosition=mv;
    #include <fog_vertex>
   }`,
  fragmentShader:`uniform vec3 rainColour;varying float rainAlpha;varying vec2 rainUv;
   #include <fog_pars_fragment>
   void main(){
    float edge=1.-abs(rainUv.x-.5)*2.,along=smoothstep(0.,.35,rainUv.y)*smoothstep(1.,.6,rainUv.y);
    gl_FragColor=vec4(rainColour,rainAlpha*edge*along);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`});
 // Visible from the start when raining, so the load-time shader warm-up compiles it (no stall).
 const streaks=new T.Mesh(geometry,material);streaks.frustumCulled=false;streaks.renderOrder=3;streaks.name='Rain';streaks.visible=raining;scene.add(streaks);
 const forward=new T.Vector3(),smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
 return {
  amount,
  /** `time` is the shared clock; `shelter` hides the streaks (interiors, cutaways). */
  update(time:number,camera:T.Camera,shelter:boolean){
   // Streaks read only from near the ground: from high above, or looking straight down, they would be
   // seen end-on and smear into white hatching, so they fade out with height and downward tilt.
   camera.getWorldDirection(forward);
   const fade=(1-smooth(70,150,camera.position.y))*(1-smooth(.72,.92,-forward.y));
   uniforms.rainTime.value=time;uniforms.rainCamera.value.copy(camera.position);uniforms.rainFade.value=fade;
   streaks.visible=raining&&!shelter&&fade>.01;
  },
 };
}
