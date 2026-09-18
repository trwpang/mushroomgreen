import {rememberPlace} from './location';
import * as T from 'three';
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createInteriors} from './interiors';
import type {Home} from './layout';

export function createInspection(scene:T.Scene,renderer:T.WebGLRenderer,camera:T.PerspectiveCamera,controls:OrbitControls,forge:T.Group,smallForge:T.Group){
 const interiors=createInteriors(scene),saved=new Map<T.Object3D,boolean>();
 const toolbar=document.getElementById('interior-toolbar')!,label=document.getElementById('interior-title')!,floorSelect=document.getElementById('interior-floor') as HTMLSelectElement;
 let active=false,workshopActive=false,house:Home|null=null,returnCamera=new T.Vector3(),returnTarget=new T.Vector3(),oldFov=38,oldLocalClipping=false;
 const forgeMaterials=new Map<T.Mesh,T.Material|T.Material[]>(),hiddenParts:T.Object3D[]=[];
 function restore(){
  interiors.hide();for(const [o,visible]of saved)o.visible=visible;saved.clear();for(const o of hiddenParts)o.visible=true;hiddenParts.length=0;
  for(const [mesh,material]of forgeMaterials){const ms=Array.isArray(mesh.material)?mesh.material:[mesh.material];ms.forEach(m=>m.dispose());mesh.material=material;}forgeMaterials.clear();
  active=false;workshopActive=false;renderer.localClippingEnabled=oldLocalClipping;toolbar.hidden=true;document.getElementById('village-app')!.removeAttribute('data-interior');renderer.shadowMap.needsUpdate=true;
 }
 function close(returnView=true){if(!active)return;rememberPlace({inside:null,floor:null});restore();controls.minDistance=9;controls.maxDistance=1800;camera.fov=oldFov;camera.updateProjectionMatrix();if(returnView){camera.position.copy(returnCamera);controls.target.copy(returnTarget);controls.update();}document.getElementById('village-canvas')!.querySelector('canvas')?.focus();}
 function isolate(root:T.Object3D){for(const o of scene.children){if(o===root||o instanceof T.Light)continue;saved.set(o,o.visible);o.visible=false;}root.visible=true;}
 function aim(position:T.Vector3,target:T.Vector3){camera.fov=42;camera.updateProjectionMatrix();camera.position.copy(position).sub(target).multiplyScalar(Math.max(1,.95/camera.aspect)).add(target);controls.target.copy(target);controls.minDistance=3;controls.maxDistance=55;controls.update();renderer.shadowMap.needsUpdate=true;}
 function enter(home:Home|null,workshop:'main'|'small'|null=null){
  if(active)close();returnCamera.copy(camera.position);returnTarget.copy(controls.target);oldFov=camera.fov;oldLocalClipping=renderer.localClippingEnabled;house=home;workshopActive=Boolean(workshop||home?.number===5);
  rememberPlace({house:home?.number??5,inside:workshop??'home',floor:null});active=true;toolbar.hidden=false;document.getElementById('village-app')!.dataset.interior='true';document.getElementById('house-panel')!.hidden=true;
  if(home&&!workshop&&home.number!==5){const v=interiors.show(home);isolate(v.group);aim(v.camera,v.target);label.textContent=home.household_name+' · No. '+home.number;floorSelect.replaceChildren(...v.plan.floors.map((f,i)=>new Option(f.name,String(i))));floorSelect.hidden=v.floors===1;}
  else{const root=workshop==='small'?smallForge:forge;isolate(root);root.traverse(o=>{
   if(/^(Roof|Ridge|Gutters|Chimney|Flue|Lead)/.test(o.name)){hiddenParts.push(o);o.visible=false;}
   if(o instanceof T.Mesh&&/^(Masonry|Brickwork|Interior_lime|Wood_grain|Ironmongery|Window|Shutter|Door)/.test(o.name)){
    forgeMaterials.set(o,o.material);const plane=new T.Plane(new T.Vector3(0,-1,0),root.position.y+1.25);
    const clone=(m:T.Material)=>{const n=m.clone();n.clippingPlanes=[plane];n.clipShadows=true;n.side=T.DoubleSide;return n;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
   }
  });renderer.localClippingEnabled=true;const target=root.localToWorld(new T.Vector3(0,.4,0));aim(root.localToWorld(new T.Vector3(7.2,10.8,-8.1)),target);label.textContent=workshop==='small'?'Henry’s small chainshop':'The chain workshop';floorSelect.hidden=true;}
  document.getElementById('leave-interior')!.focus();
 }
 floorSelect.onchange=()=>{const v=interiors.setFloor(Number(floorSelect.value));if(v){aim(v.camera,v.target);rememberPlace({floor:floorSelect.value});}};
 document.getElementById('leave-interior')!.onclick=()=>{close();document.getElementById('house-panel')!.hidden=false;document.getElementById('enter-house')!.focus();};
 return {enter,close,setFloor:(floor:number)=>{floorSelect.value=String(floor);const v=interiors.setFloor(floor);if(v){aim(v.camera,v.target);rememberPlace({floor});}},get active(){return active;},get workshopActive(){return workshopActive;},update:(time:number)=>interiors.update(time)};
}
