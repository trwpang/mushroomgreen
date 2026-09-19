import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createPropKit,propNames,type PropKind} from './working-props';
const mount=document.getElementById('prop-stage')!,caption=document.getElementById('prop-caption')!;
async function start(){
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;mount.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#d8d7c9');const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.02,160);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=.7;controls.maxDistance=45;
scene.add(new T.HemisphereLight('#f5efe0','#6d6350',2.1));const sun=new T.DirectionalLight('#fff0d9',3.5);sun.position.set(-6,10,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:10,bottom:-10,near:.1,far:40});sun.shadow.normalBias=.012;scene.add(sun);const fill=new T.DirectionalLight('#d2e0ec',1);fill.position.set(5,4,-7);scene.add(fill);
const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#c4c2af',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.01;ground.receiveShadow=true;scene.add(ground);
const loaded=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/village/cottages.glb');let oak:T.MeshStandardMaterial|undefined;loaded.scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&/Old oak/.test(m.name))oak=m;});
const kit=createPropKit(oak),group=new T.Group();scene.add(group);
const show=(id:string)=>{group.clear();document.querySelectorAll<HTMLButtonElement>('[data-prop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.prop===id)));const keys=Object.keys(propNames) as PropKind[];
 if(id==='all'){keys.forEach((k,i)=>{const obj=kit.models[k];obj.position.set((i%5-2)*3.1,0,(Math.floor(i/5)-.5)*3.5);obj.rotation.y=.12;group.add(obj);});camera.position.set(5,9,14);controls.target.set(0,.2,0);caption.textContent='Original models · Select an object to inspect its construction';}
 else{const k=id as PropKind,obj=kit.models[k];obj.position.set(0,0,0);obj.rotation.y=0;group.add(obj);const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3()),centre=b.getCenter(new T.Vector3()),distance=Math.max(size.x,size.y,size.z)*2.65;camera.position.copy(centre).add(new T.Vector3(distance*.65,distance*.42,distance*(k==='wheelbarrow'?-.85:.85)));controls.target.copy(centre);caption.textContent=propNames[k]+' · '+size.x.toFixed(2)+' × '+size.y.toFixed(2)+' × '+size.z.toFixed(2)+' m';}
 camera.updateProjectionMatrix();controls.update();mount.dataset.selection=id;};
 document.querySelectorAll<HTMLButtonElement>('[data-prop]').forEach(b=>b.onclick=()=>show(b.dataset.prop!));const requested=new URL(location.href).searchParams.get('item');show(requested&&requested in propNames?requested:'all');
 renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
start().catch(error=>{caption.textContent='The object study could not load.';console.error(error);});
