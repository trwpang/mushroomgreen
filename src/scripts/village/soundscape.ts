import * as T from 'three';
import {WORK_PERIOD,WORK_STRIKES} from '../chainmaker/work-cycle';
/**
 * A small, fully synthesised soundscape (Web Audio; no recordings to license or download):
 *  - the brook: a filtered-noise flow bed plus Minnaert bubble "plinks", placed at the nearest
 *    point of the water and fading out beyond ~45 m;
 *  - birdsong: occasional phrases (blackbird, robin, chaffinch, wood pigeon) from the trees
 *    round the listener, more of them under canopy, few at dusk;
 *  - the chainshop: an iron-on-anvil clang on each of the chainmaker's blows, placed at the anvil.
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
 let brookPanner:PannerNode,brookGain:GainNode,brookBubbles:GainNode,noise:AudioBuffer,nextBubble=0,nextBird=0,lastTime=0,dusk=false,paused=false;
 const brookPoints=opts.brooks.flatMap(line=>{const out:Point[]=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));for(let j=0;j<n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}return out;});
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
  brookPanner=panner(4,200);brookGain=ctx.createGain();brookGain.gain.value=0;brookPanner.connect(brookGain).connect(master);
  // Flow bed: a low rush and a brighter hiss, each breathing slowly at its own rate.
  for(const [type,freq,q,level,rate] of [['lowpass',520,.7,.9,.11],['bandpass',2300,.6,.32,.17]] as const){
   const src=ctx.createBufferSource();src.buffer=noise;src.loop=true;src.playbackRate.value=type==='lowpass'?.93:1.07;
   const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=level;
   const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=rate;depth.gain.value=level*.35;lfo.connect(depth).connect(g.gain);lfo.start();
   src.connect(f).connect(g).connect(brookPanner);src.start();
  }
  brookBubbles=ctx.createGain();brookBubbles.gain.value=.5;brookBubbles.connect(brookPanner);
  nextBubble=nextBird=ctx.currentTime+.5;
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)void ctx.suspend();else if(enabled)void ctx.resume();});
 }
 const gesture=()=>{if(enabled){start();void ctx?.resume();}};
 addEventListener('pointerdown',gesture,{passive:true});addEventListener('keydown',gesture);

 // A single bubble: a sine whose pitch rises as it resonates (Minnaert), dying in tens of ms.
 function bubble(at:number){
  const f=380+rand()**2*1500,dur=.02+rand()*.06,o=ctx!.createOscillator(),g=ctx!.createGain();
  o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(f*(1.25+rand()*.6),at+dur);
  g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.05+rand()*.08,at+.003);g.gain.exponentialRampToValueAtTime(.0005,at+dur);
  o.connect(g).connect(brookBubbles);o.start(at);o.stop(at+dur+.02);
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
 function clang(at:number,position:T.Vector3,distance:number){
  const p=clangPanner(),g=ctx!.createGain(),air=ctx!.createBiquadFilter();air.type='lowpass';air.frequency.value=Math.max(1800,14000-distance*220);
  place(p,position.x,position.y,position.z,at,false);g.gain.value=1;p.connect(air).connect(g).connect(master);
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
  let best=brookPoints[0],d=Infinity;for(const q of brookPoints){const e=(q[0]-cp.x)**2+(q[1]-cp.z)**2;if(e<d){d=e;best=q;}}
  const brookDistance=Math.sqrt(d),near=Math.max(0,1-Math.max(0,brookDistance-18)/28);
  place(brookPanner,best[0],opts.surface(best[0],best[1])+.1,best[1],now);brookGain.gain.setTargetAtTime(.62*near,now,.3);
  if(near>0&&!paused)while(nextBubble<now+.12){nextBubble=Math.max(nextBubble,now)+(.03+rand()*.11);bubble(nextBubble);}else nextBubble=now;
  // Birds: more under trees, few at dusk; one phrase at a time or so.
  if(!paused&&nextBird<now){const cover=opts.canopyAt(cp.x,cp.z);sing(now+.05);nextBird=now+(dusk?14:3)+rand()*(dusk?20:7)*(1.3-cover*.6);}
  // Hammer blows, from the shared clock (so they stop with the worker when paused).
  if(!paused&&time>previous&&time-previous<.5){
   const a=((previous%WORK_PERIOD)+WORK_PERIOD)%WORK_PERIOD,b=a+(time-previous);
   const anvil=opts.anvil(),distance=anvil.distanceTo(cp);
   if(distance<120)for(const s of WORK_STRIKES)for(const k of [s,s+WORK_PERIOD])if(k>a&&k<=b)clang(now+.01,anvil,distance);
  }
 }
 return {
  update,
  setDusk(value:boolean){dusk=value;},
  setPaused(value:boolean){paused=value;},
  get enabled(){return enabled;},
  toggle(){enabled=!enabled;try{localStorage.setItem('mg-sound',enabled?'on':'off');}catch{/* ignore */}if(enabled){start();void ctx?.resume();}return enabled;},
 };
}
