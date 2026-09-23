import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// One small shared asset, requested only by Henry's downstairs room. Instances share GPU resources.
let statue:Promise<T.Group>|undefined;
let reflectedLight:T.Texture|undefined;
/** Reuse the scene’s existing filtered reflection; no additional capture or texture. */
export function setHenryStatueEnvironment(texture:T.Texture){reflectedLight=texture;}
function loadStatue(){
 return statue??=(new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)).loadAsync('/henry-statue/henry.glb').then(g=>{
  g.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial){m.envMap=reflectedLight??null;m.envMapIntensity=.65;}}});
  return g.scene;
 }).catch(error=>{statue=undefined;throw error;});
}
/** Modern family easter egg: a 457.2 mm bronze on a bracketed shelf beside the sleeping partition. */
export function addHenryStatue(room:T.Group,base:number,wood:T.Material){
 let cancelled=false;const owned:(T.Material|T.BufferGeometry)[]=[];let display:T.Group|undefined;
 void loadStatue().then(template=>{
  if(cancelled||!room.parent)return;
  display=new T.Group();display.name='Henry’s commemorative statue — modern family easter egg';
  const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>{
   const geo=new T.BoxGeometry(w,h,d);owned.push(geo);const m=new T.Mesh(geo,wood);m.position.set(x,base+y,z);m.castShadow=m.receiveShadow=true;display!.add(m);return m;
  };
  // Shelf back touches the west face of the existing partition at x=1.44. Brackets bear on that wall.
  box(1.235,1.25,-1.65,.39,.04,.38);
  for(const z of [-1.79,-1.51]){
   box(1.425,1.14,z,.028,.24,.035);
   const a=new T.Vector3(1.425,base+1.04,z),b=new T.Vector3(1.095,base+1.23,z),delta=b.clone().sub(a);
   const bracket=box(0,0,0,.035,delta.length(),.035);bracket.position.copy(a.add(b).multiplyScalar(.5));bracket.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  }
  const model=template.clone(true);model.position.set(1.235,base+1.27,-1.65);model.rotation.y=Math.PI;
  model.name='Henry Weaver statue · 18 inches';display.add(model);room.add(display);
  room.userData.henryStatue={heightMetres:.4572,modernEasterEgg:true};
  document.dispatchEvent(new Event('village-asset-ready'));
 }).catch(error=>console.warn('Henry statue could not load',error));
 return ()=>{cancelled=true;if(display)room.remove(display);owned.forEach(r=>r.dispose());};
}
