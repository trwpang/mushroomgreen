import * as T from 'three';
/**
 * Occasional light showers. The schedule is a pure function of the shared clock, so a paused or
 * captured frame is deterministic: each 7-minute window has about an even chance of one shower of
 * 70–150 s, easing in and out over ~15 s; the first two minutes of a visit are always dry.
 * ?rain=1 forces a steady shower (for review); ?rain=0 turns weather off.
 *
 * Rain is a camera-following volume of thin streaks animated entirely in the vertex shader: the
 * volume wraps in world space, so drops fall past the viewer rather than moving with them.
 * `wetness` lags the rain (wets in ~30 s, dries over ~2 min) for ground darkening and sheen.
 */
export const wetness={value:0};
const WINDOW=420;
function hash(n:number){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);}
export function rainAt(time:number){
 const k=Math.floor(time/WINDOW);let amount=0;
 for(const w of [k-1,k]){if(w<0||hash(w*3.1)>.5)continue;
  const start=w*WINDOW+(w===0?120:0)+hash(w*7.7)*(WINDOW*.45),length=70+hash(w*5.3)*80,t=time-start;
  if(t<0||t>length)continue;
  amount=Math.max(amount,Math.min(1,t/15,(length-t)/15)*(.55+.45*hash(w*9.1)));}
 return amount;
}
export function createWeather(scene:T.Scene){
 const mode=new URLSearchParams(location.search).get('rain');
 const COUNT=10000,BOX=44,HEIGHT=26;
 const seeds=new Float32Array(COUNT*3);let s=91;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 for(let i=0;i<COUNT*3;i++)seeds[i]=rand();
 // One thin vertical quad per streak; the vertex shader places, animates and faces it.
 const base=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();
 geometry.index=base.index;geometry.setAttribute('position',base.getAttribute('position'));geometry.setAttribute('uv',base.getAttribute('uv'));
 geometry.setAttribute('seed',new T.InstancedBufferAttribute(seeds,3));geometry.instanceCount=COUNT;
 // Fog-aware ShaderMaterials must carry three's fog uniforms.
 const uniforms={...T.UniformsUtils.clone(T.UniformsLib.fog),rainTime:{value:0},rainAmount:{value:0},rainCamera:{value:new T.Vector3()},rainColour:{value:new T.Color('#b4bcc0')}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,fog:true,
  vertexShader:`attribute vec3 seed;uniform float rainTime,rainAmount;uniform vec3 rainCamera;varying float rainAlpha;varying vec2 rainUv;
   #include <fog_pars_vertex>
   void main(){
    float speed=8.5+seed.z*2.5,box=${BOX.toFixed(1)},height=${HEIGHT.toFixed(1)};
    vec3 wind=vec3(1.1,0.,.45);
    // World-space wrap around the camera: drops fall past the viewer.
    vec3 p;p.xz=rainCamera.xz+mod(seed.xy*box-rainCamera.xz+box*.5,box)-box*.5;
    float fall=mod(seed.z*height-rainTime*speed,height);p.y=rainCamera.y-height*.45+fall;
    p.xz+=wind.xz*(fall/speed)*.9;
    // Fewer drops in a light shower: each streak has its own threshold.
    float present=step(seed.x*.9+seed.y*.1,rainAmount);
    vec3 toCam=normalize(vec3(rainCamera.x-p.x,0.,rainCamera.z-p.z)+1e-4),side=normalize(cross(vec3(0.,1.,0.),toCam));
    vec3 slant=normalize(vec3(-wind.x/speed,-1.,-wind.z/speed));
    float len=.38+seed.y*.28;
    vec3 world=p+side*position.x*.011+(-slant)*position.y*len;
    vec4 mv=viewMatrix*vec4(world,1.);
    float d=length(mv.xyz);
    rainAlpha=present*smoothstep(2.,5.,d)*(1.-smoothstep(14.,26.,d))*(.17+.1*seed.x);
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
 const streaks=new T.Mesh(geometry,material);streaks.frustumCulled=false;streaks.renderOrder=3;streaks.name='Rain';streaks.visible=false;scene.add(streaks);
 let amount=0;
 return {
  get amount(){return amount;},
  /** `time` is the shared clock; `shelter` hides the streaks (interiors, cutaways). */
  update(time:number,dt:number,camera:T.Camera,shelter:boolean){
   amount=mode==='0'?0:mode==='1'?.85:rainAt(time);
   wetness.value+=(amount-wetness.value)*Math.min(1,dt/(amount>wetness.value?30:120));
   uniforms.rainAmount.value=amount;uniforms.rainTime.value=time;uniforms.rainCamera.value.copy(camera.position);
   streaks.visible=amount>.01&&!shelter;
  },
 };
}
