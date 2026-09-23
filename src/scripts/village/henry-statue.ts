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
  g.scene.traverse(o=>{
   if(!(o instanceof T.Mesh))return;
   o.castShadow=o.receiveShadow=true;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!(m instanceof T.MeshStandardMaterial))continue;
    m.envMap=reflectedLight??null;m.envMapIntensity=1.1;
    // Lift the dark scan's bronze albedo without adding self-light or losing its patina.
    m.color.multiplyScalar(3.2);m.metalness=.18;
   }
  });
  return g.scene;
 }).catch(error=>{statue=undefined;throw error;});
}
/** Modern family easter egg: a 457.2 mm bronze on the floor beside the fireplace. */
export function addHenryStatue(room:T.Group,base:number){
 let cancelled=false;let display:T.Group|undefined;
 void loadStatue().then(template=>{
  if(cancelled||!room.parent)return;
  display=new T.Group();display.name='Henry’s commemorative statue — modern family easter egg';
  // Replace the former coal-bucket position; the +X-facing figure looks into the room.
  // Match the floor prop datum so the original plinth rests on the quarry tiles.
  const model=template.clone(true);model.position.set(-3.74,base+.03,-.87);
  model.name='Henry Weaver statue · 18 inches';display.add(model);room.add(display);
  room.userData.henryStatue={heightMetres:.4572,modernEasterEgg:true,placement:'fireplace floor'};
  document.dispatchEvent(new Event('village-asset-ready'));
 }).catch(error=>console.warn('Henry statue could not load',error));
 return ()=>{cancelled=true;if(display)room.remove(display);};
}
