import {refineObject} from '../rendering/surfaces';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {centralWorkstation} from '../village/workshop';
import {createChainmakerRig,LINK,PERIOD} from './rig';
import {createSkeletalChainmakerRig} from './skeletal-rig';
import {WORK_POSES} from './work-cycle';
const mount=document.getElementById('study-canvas')!;
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Chainmaker. Drag to rotate; scroll to zoom.');
const scene=new T.Scene();scene.background=new T.Color('#d9d6c9');scene.fog=new T.Fog('#d9d6c9',8,22);
const camera=new T.PerspectiveCamera(34,innerWidth/innerHeight,.03,40);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.45;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,1,.35);
const pmrem=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=pmrem.fromScene(room);scene.environment=env.texture;scene.environmentIntensity=.40;room.dispose();pmrem.dispose();
scene.add(new T.HemisphereLight('#e6e6d7','#776955',1.3));
const sun=new T.DirectionalLight('#fff1d5',2.8);sun.position.set(-3,5,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-3;sun.shadow.normalBias=.012;sun.shadow.bias=-.0001;scene.add(sun);
const fill=new T.DirectionalLight('#dbe3e0',1.0);fill.position.set(3,3,-3);scene.add(fill);
const fire=new T.PointLight('#ff9b49',2.5,3,2);fire.position.set(-1.35,1.20,.92);scene.add(fire);
const earth=new T.MeshStandardMaterial({color:'#89816b',roughness:1});const base=new T.Mesh(new T.CylinderGeometry(2.02,2.05,.09,96),earth);base.position.set(0,-.055,.55);base.receiveShadow=true;scene.add(base);
const floorMats=['#807462','#958772','#736b5c','#897d67'].map(color=>new T.MeshStandardMaterial({color,roughness:.96}));
let seed=1865;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let z=-1.25;z<2.28;z+=.21)for(let x=-1.85;x<1.9;x+=.32){if(Math.hypot(x,z-.55)>1.91)continue;const stone=new T.Mesh(new T.BoxGeometry(.31,.035,.20),floorMats[Math.floor(random()*4)]);stone.position.set(x+(Math.round(z/.21)%2)*.08,-.007+random()*.004,z);stone.receiveShadow=true;scene.add(stone);}
// A small bank of dark coke with restrained embers, scaled for hand-forged chain.
const coalMat=new T.MeshStandardMaterial({color:'#262721',roughness:.94});
const emberMat=new T.MeshStandardMaterial({color:'#683620',emissive:'#b63205',emissiveIntensity:.7,roughness:.95});
for(let i=0;i<58;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.36;const lump=new T.Mesh(new T.IcosahedronGeometry(.028+random()*.025,0),i%7===0?emberMat:coalMat);lump.scale.set(1.15,.65,.83);lump.position.set(-1.35+Math.cos(a)*r,1.015+(.36-r)*.14,1.10+Math.sin(a)*r*.66);lump.rotation.set(random(),random(),random());lump.castShadow=true;lump.receiveShadow=true;scene.add(lump);}
const linkMat=new T.MeshStandardMaterial({color:'#e49e48',emissive:'#ff5e13',emissiveIntensity:1.5,roughness:.6,metalness:.6});
const link=new T.Mesh(new T.TorusGeometry(.031,.007,8,28),linkMat);link.rotation.x=Math.PI/2;link.scale.set(1.4,1,1);link.position.copy(LINK);scene.add(link);
const chainmat=new T.MeshStandardMaterial({color:'#53554b',metalness:.8,roughness:.65});
for(let i=0;i<9;i++){const o=new T.Mesh(new T.TorusGeometry(.029,.006,8,24),chainmat);o.scale.set(1.4,1,1);o.position.set(.10+i*.056,1.061-Math.max(0,i-4)*.045,.72);o.rotation.set(i%2?0:Math.PI/2,0,i>4?-.6:0);o.castShadow=true;scene.add(o);}
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let rig:ReturnType<typeof createChainmakerRig>|undefined;let ready=false;
const loading=document.getElementById('loading')!;
const query=new URLSearchParams(location.search);const reduce=matchMedia('(prefers-reduced-motion: reduce)');let paused=query.has('still')||reduce.matches;const requestedTime=Number(query.get('t')??1.97);let time=Number.isFinite(requestedTime)?requestedTime:1.97;let last=performance.now();
const motion=document.getElementById('motion') as HTMLButtonElement;
function setPause(value:boolean){paused=value;motion.textContent=paused?'Play':'Pause';motion.setAttribute('aria-pressed',String(paused));}setPause(paused);
const views={hands:{eye:[.7,1.4,1.3],target:[0,1.13,.42]},back:{eye:[-1.8,1.6,-3],target:[0,.92,.14]},work:{eye:[2.25,1.95,3.7],target:[.13,1.04,.30]},portrait:{eye:[.95,1.8,2.2],target:[0,1.48,.10]},side:{eye:[-3.5,1.95,1.25],target:[0,1.03,.45]}};
function setView(name:keyof typeof views){const v=views[name];const aspect=innerWidth/innerHeight;const target=new T.Vector3(...v.target);camera.position.copy(target).add(new T.Vector3(...v.eye).sub(target).multiplyScalar(aspect<.8?1.42:1));controls.target.copy(target);controls.update();document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));}
setView((query.get('view') in views?query.get('view'):'work') as keyof typeof views);
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view as keyof typeof views));
motion.onclick=()=>setPause(!paused);document.getElementById('strike')!.onclick=()=>{time=query.get('asset')==='legacy'?PERIOD*.68:WORK_POSES.strike;setPause(true);};document.getElementById('lift')!.onclick=()=>{time=query.get('asset')==='legacy'?PERIOD*.45:WORK_POSES.raised;setPause(true);};reduce.addEventListener('change',e=>{if(e.matches)setPause(true);});
if(query.get('asset')==='legacy'){document.querySelector('.edition')!.textContent='01 / EARLIER FIGURE';document.querySelector<HTMLAnchorElement>('#notes a[download]')!.href='/chainmaker/chainmaker.glb';}
const notes=document.getElementById('notes')!,about=document.getElementById('show-notes')!;about.onclick=()=>{notes.hidden=!notes.hidden;about.setAttribute('aria-expanded',String(!notes.hidden));};document.getElementById('close-notes')!.onclick=()=>{notes.hidden=true;about.setAttribute('aria-expanded','false');about.focus();};
window.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===renderer.domElement){e.preventDefault();setPause(!paused);}if(e.key==='Escape'&&!notes.hidden){notes.hidden=true;about.setAttribute('aria-expanded','false');about.focus();}});
Promise.all([loader.loadAsync(query.get('asset')==='legacy'?'/chainmaker/chainmaker.glb':'/chainmaker-v2/chainmaker.glb'),loader.loadAsync('/forge/mushroom-green-forge.glb')]).then(([figure,forge])=>{
 figure.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(figure.scene);rig=query.get('asset')==='legacy'?createChainmakerRig(figure.scene):createSkeletalChainmakerRig(figure.scene);
 forge.scene.updateMatrixWorld(true);forge.scene.traverse(o=>{if(!(o instanceof T.Mesh)||!/^Anvil|^Hearth/.test(o.name))return;const geo=centralWorkstation(o.geometry,o.matrixWorld);if(!geo.index?.count){geo.dispose();return;}const materials=(Array.isArray(o.material)?o.material:[o.material]).map(mat=>{const copy=mat.clone();if(copy instanceof T.MeshStandardMaterial&&copy.emissive.getHex()!==0){copy.color.set('#342f25');copy.emissive.set('#a82c05');copy.emissiveIntensity=.35;}return copy;});const m=new T.Mesh(geo,Array.isArray(o.material)?materials:materials[0]);if(!/^Anvil/.test(o.name))m.position.set(-1.35,0,-.5);m.castShadow=true;m.receiveShadow=true;scene.add(m);});
 refineObject(scene);ready=true;loading.hidden=true;rig.update(time);
}).catch(error=>{console.error(error);loading.textContent='The study could not load. Reload to try again.';});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.05);last=now;if(!paused&&ready)time+=dt;if(rig)rig.update(time);fire.intensity=2.5+Math.sin(time*7)*.2;controls.update();renderer.render(scene,camera);});
