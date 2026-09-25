import * as T from 'three';
import {WORK_PERIOD,WORK_STRIKES} from '../chainmaker/work-cycle';
/**
 * A small soundscape (Web Audio): one licensed recording, the rest synthesised:
 *  - the brook: a licensed field recording, looped seamlessly, placed at the nearest point of
 *    the water and heard only close up (3D distance: full within ~10 m, silent by ~35 m);
 *  - birdsong: occasional phrases (blackbird, robin, chaffinch, wood pigeon) from the trees
 *    round the listener, more of them under canopy, few at dusk;
 *  - the chainshop: an iron-on-anvil clang on each of the chainmaker's blows, placed at the anvil
 *    and heard only in and right around the shop.
 * Browsers only allow audio after a user gesture, so the context starts on the first
 * pointer or key press when sound is enabled. Everything follows the shared clock: pausing
 * the scene fades the sound out.
 */
type Point=[number,number];
export type SoundscapeOptions={
 brooks:Point[][];surface:(x:number,z:number)=>number;canopyAt:(x:number,z:number)=>number;anvil:()=>T.Vector3;
};
export function createSoundscape(camera:T.Camera,opts:SoundscapeOptions){
 let ctx:AudioContext|null=null,master:GainNode,enabled=true,started=false;
 try{enabled=localStorage.getItem('mg-sound')!=='off';}catch{/* storage may be blocked */}
 let brookPanner:PannerNode,brookGain:GainNode,rainGain:GainNode|null=null,rain=0,noise:AudioBuffer,nextBird=0,lastTime=0,dusk=false,paused=false;
 const brookPoints=opts.brooks.flatMap(line=>{const out:Point[]=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));for(let j=0;j<n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}return out;});
 // Water surface heights, looked up once rather than every frame.
 const brookSurface=brookPoints.map(q=>opts.surface(q[0],q[1]));
 let seed=77;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

 // Moving sources glide; a new one-shot source must be placed at once, or it starts at the origin.
 function place(p:PannerNode,x:number,y:number,z:number,at:number,glide=true){if(p.positionX){if(glide){p.positionX.setTargetAtTime(x,at,.08);p.positionY.setTargetAtTime(y,at,.08);p.positionZ.setTargetAtTime(z,at,.08);}else{p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z;}}else p.setPosition(x,y,z);}
 function panner(ref:number,max:number){const p=ctx!.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=ref;p.maxDistance=max;p.rolloffFactor=1.1;return p;}
 function start(){
  if(started||!enabled)return;started=true;
  ctx=new AudioContext();master=ctx.createGain();master.gain.value=0;
  // A gentle limiter keeps a clang at arm's length from clipping.
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-9;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.2;master.connect(limiter).connect(ctx.destination);
  // Two seconds of soft pink noise, looped, drives the water bed.
  noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);{const d=noise.getChannelData(0);let b0=0,b1=0,b2=0;for(let i=0;i<d.length;i++){const w=rand()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;d[i]=(b0+b1+b2+w*.1848)*.22;}}
  brookPanner=panner(4,200);brookGain=ctx.createGain();brookGain.gain.value=0;brookGain.connect(master);const placed=ctx.createGain();brookPanner.connect(placed).connect(brookGain);
  // The brook is a licensed field recording (public/sounds/babbling-brook.mp3). Most of it is
  // placed at the nearest water for direction; a little stays as a stereo bed for width.
  const bed=ctx.createGain();bed.gain.value=.3;bed.connect(brookGain);
  const toPanner=ctx.createGain();toPanner.gain.value=.8;toPanner.connect(brookPanner);
  void fetch('/sounds/babbling-brook.mp3').then(r=>r.arrayBuffer()).then(data=>ctx!.decodeAudioData(data)).then(buffer=>{
   const src=ctx!.createBufferSource();src.buffer=seamless(buffer);src.loop=true;src.connect(toPanner);src.connect(bed);src.start();
  }).catch(error=>console.warn('Brook sound unavailable',error));
  // Rain: a soft, even hiss of drops on leaves and roofs with a low patter under it (not placed:
  // it falls all round the listener). Silent until a shower.
  rainGain=ctx.createGain();rainGain.gain.value=0;rainGain.connect(master);
  for(const [type,freq,q,level,rate] of [['highpass',1600,.5,.55,1.13],['bandpass',520,.8,.35,.87]] as const){
   const src=ctx.createBufferSource();src.buffer=noise;src.loop=true;src.playbackRate.value=rate;
   const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=level;
   src.connect(f).connect(g).connect(rainGain);src.start(0,rand()*1.5);
  }
  nextBird=ctx.currentTime+.5;
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)void ctx.suspend();else if(enabled)void ctx.resume();});
 }
 const gesture=()=>{if(enabled){start();void ctx?.resume();}};
 addEventListener('pointerdown',gesture,{passive:true});addEventListener('keydown',gesture);

 // Trim encoder padding and crossfade the tail into the head (equal power), so the loop has no seam.
 function seamless(buffer:AudioBuffer){
  const rate=buffer.sampleRate,trim=Math.round(rate*.08),fade=Math.round(rate*1.5),length=buffer.length-2*trim-fade;
  const out=ctx!.createBuffer(buffer.numberOfChannels,length,rate);
  for(let c=0;c<buffer.numberOfChannels;c++){const i=buffer.getChannelData(c),o=out.getChannelData(c);
   for(let k=0;k<length;k++)o[k]=i[trim+k];
   for(let k=0;k<fade;k++){const t=k/fade;o[k]=i[trim+k]*Math.sin(t*Math.PI/2)+i[trim+length+k]*Math.cos(t*Math.PI/2);}}
  return out;
 }
 // Birds: each phrase is a short sequence of notes shaped by pitch glides and vibrato.
 type Note={f0:number;f1:number;dur:number;gap:number;vib?:number;level?:number};
 const songs:(()=>Note[])[]=[
  // Blackbird: slow, fluting, mellow warble with a scratchy flourish.
  ()=>{const n:Note[]=[];const base=1400+rand()*500;for(let i=0;i<4+Math.floor(rand()*4);i++){const f=base*(.8+rand()*.7);n.push({f0:f,f1:f*(.85+rand()*.35),dur:.12+rand()*.18,gap:.03+rand()*.06,vib:6+rand()*8});}for(let i=0;i<3;i++)n.push({f0:3600+rand()*900,f1:2800+rand()*600,dur:.035,gap:.01,level:.35});return n;},
  // Robin: thin, high, liquid runs, rising and falling quickly.
  ()=>{const n:Note[]=[];for(let i=0;i<6+Math.floor(rand()*8);i++){const f=2600+rand()*3200;n.push({f0:f,f1:f*(.7+rand()*.7),dur:.05+rand()*.12,gap:.015+rand()*.05,vib:25+rand()*20,level:.55});}return n;},
  // Chaffinch: an accelerating, descending trill ending in a flourish.
  ()=>{const n:Note[]=[];let f=4600+rand()*400;for(let i=0;i<11;i++){n.push({f0:f,f1:f*.93,dur:.045-i*.0015,gap:.035-i*.0022,level:.5});f*=.965;}n.push({f0:2400,f1:4300,dur:.14,gap:0,level:.6});return n;},
  // Wood pigeon: soft, hooting five-note phrase, low and far.
  ()=>{const n:Note[]=[];const f=430+rand()*40;for(const [d,g] of [[.42,.15],[.32,.08],[.18,.06],[.42,.15],[.32,.3]])n.push({f0:f,f1:f*.92,dur:d,gap:g,vib:0,level:.8});return n;},
 ];
 function sing(at:number){
  // Somewhere in the trees 12–35 m from the listener (below a high camera, never above it).
  const {x,y,z}=camera.position,angle=rand()*Math.PI*2,dist=12+rand()*23,px=x+Math.cos(angle)*dist*.8,pz=z+Math.sin(angle)*dist*.8,py=Math.min(y-2,opts.surface(px,pz)+6+rand()*8);
  const kind=rand()<.12?3:Math.floor(rand()*3),notes=songs[kind](),p=panner(6,300),g=ctx!.createGain(),tone=ctx!.createBiquadFilter();
  tone.type=kind===3?'lowpass':'highpass';tone.frequency.value=kind===3?900:900;g.gain.value=kind===3?.26:.14;
  place(p,px,Math.max(py,y-dist*.6),pz,at,false);p.connect(g).connect(master);tone.connect(p);
  let t=at;
  for(const note of notes){
   const o=ctx!.createOscillator(),e=ctx!.createGain();o.type='sine';
   o.frequency.setValueAtTime(note.f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(60,note.f1),t+note.dur);
   if(note.vib){const v=ctx!.createOscillator(),vd=ctx!.createGain();v.frequency.value=note.vib;vd.gain.value=note.f0*.025;v.connect(vd).connect(o.frequency);v.start(t);v.stop(t+note.dur+.02);}
   const level=note.level??.7,attack=Math.min(.02,note.dur*.3);
   e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(level,t+attack);e.gain.setTargetAtTime(0,t+note.dur-attack,attack*.6);
   o.connect(e).connect(tone);o.start(t);o.stop(t+note.dur+.08);t+=note.dur+note.gap;
  }
 }
 // Iron on an anvil: a bright, inharmonic ring (bar and plate modes) over a short dull thud.
 // An anvil carries: full level within ~8 m, still clear across the yard.
 const clangPanner=()=>panner(8,250);
 function clang(at:number,position:T.Vector3,distance:number,level:number){
  const p=clangPanner(),g=ctx!.createGain(),air=ctx!.createBiquadFilter();air.type='lowpass';air.frequency.value=Math.max(1800,14000-distance*220);
  place(p,position.x,position.y,position.z,at,false);g.gain.value=level;p.connect(air).connect(g).connect(master);
  const f0=1180*(.985+rand()*.03);
  for(const [ratio,level,decay] of [[1,.5,.55],[2.76,.28,.32],[5.4,.16,.2],[8.93,.08,.12],[1.5,.12,.25]] as const){
   const o=ctx!.createOscillator(),e=ctx!.createGain();o.frequency.value=f0*ratio*(.995+rand()*.01);
   e.gain.setValueAtTime(level,at);e.gain.exponentialRampToValueAtTime(.0005,at+decay);o.connect(e).connect(p);o.start(at);o.stop(at+decay+.05);
  }
  const thud=ctx!.createBufferSource(),tf=ctx!.createBiquadFilter(),te=ctx!.createGain();thud.buffer=noise;tf.type='bandpass';tf.frequency.value=260;tf.Q.value=1.2;
  te.gain.setValueAtTime(.9,at);te.gain.exponentialRampToValueAtTime(.001,at+.09);thud.connect(tf).connect(te).connect(p);thud.start(at,rand()*1.5,.12);
 }

 const forward=new T.Vector3(),up=new T.Vector3();
 function update(time:number){
  const previous=lastTime;lastTime=time;
  if(!ctx||!started||ctx.state!=='running')return;
  const now=ctx.currentTime,l=ctx.listener,cp=camera.position;
  camera.getWorldDirection(forward);up.set(0,1,0).applyQuaternion(camera.quaternion);
  if(l.positionX){l.positionX.setTargetAtTime(cp.x,now,.05);l.positionY.setTargetAtTime(cp.y,now,.05);l.positionZ.setTargetAtTime(cp.z,now,.05);l.forwardX.setTargetAtTime(forward.x,now,.05);l.forwardY.setTargetAtTime(forward.y,now,.05);l.forwardZ.setTargetAtTime(forward.z,now,.05);l.upX.setTargetAtTime(up.x,now,.05);l.upY.setTargetAtTime(up.y,now,.05);l.upZ.setTargetAtTime(up.z,now,.05);}
  else{l.setPosition(cp.x,cp.y,cp.z);l.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);}
  master.gain.setTargetAtTime(enabled&&!paused?1:0,now,.25);
  // Brook: follow the nearest stretch of water; beyond ~45 m it falls silent and stops scheduling.
  // Nearest water in true 3D distance (height included): the brook is heard only close up, never
  // from high above it. Full within ~10 m, silent by ~35 m.
  let best=brookPoints[0],bestY=0,d=Infinity;for(let k=0;k<brookPoints.length;k++){const q=brookPoints[k],y=brookSurface[k],e=(q[0]-cp.x)**2+(y-cp.y)**2+(q[1]-cp.z)**2;if(e<d){d=e;best=q;bestY=y;}}
  const brookDistance=Math.sqrt(d),near=1-Math.min(1,Math.max(0,(brookDistance-10)/25));
  place(brookPanner,best[0],bestY+.1,best[1],now);brookGain.gain.setTargetAtTime(1.05*near,now,.3);
  rainGain?.gain.setTargetAtTime(rain*.42,now,.8);
  // Birds: more under trees, few at dusk, quiet in the rain.
  if(!paused&&nextBird<now){const cover=opts.canopyAt(cp.x,cp.z);if(rain<.5)sing(now+.05);nextBird=now+((dusk?14:3)+rand()*(dusk?20:7)*(1.3-cover*.6))*(1+rain*3);}
  // Hammer blows, from the shared clock (so they stop with the worker when paused).
  if(!paused&&time>previous&&time-previous<.5){
   const a=((previous%WORK_PERIOD)+WORK_PERIOD)%WORK_PERIOD,b=a+(time-previous);
   const anvil=opts.anvil(),distance=anvil.distanceTo(cp);
   // Heard in and right around the chainshop only: full within ~5 m, gone by ~18 m.
   const close=1-Math.min(1,Math.max(0,(distance-5)/13));
   if(close>0)for(const s of WORK_STRIKES)for(const k of [s,s+WORK_PERIOD])if(k>a&&k<=b)clang(now+.01,anvil,distance,close*close*(3-2*close));
  }
 }
 return {
  update,
  setDusk(value:boolean){dusk=value;},
  setPaused(value:boolean){paused=value;},
  setRain(value:number){rain=value;},
  get enabled(){return enabled;},
  toggle(){enabled=!enabled;try{localStorage.setItem('mg-sound',enabled?'on':'off');}catch{/* ignore */}if(enabled){start();void ctx?.resume();}return enabled;},
 };
}
