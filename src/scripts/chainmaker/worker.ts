import * as T from 'three';
import {createChainmakerRig,LINK} from './rig';
import {createSkeletalChainmakerRig} from './skeletal-rig';
/** Attach at the main forge's central workstation, in its unscaled local metre coordinates. */
export function addWorkingChainmaker(forge:T.Group,figure:T.Group){
 const root=new T.Group();root.name='Working chainmaker';root.add(figure);forge.add(root);
 figure.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=true;});
 // Existing interior bricks finish at about 0.125m above the forge asset datum.
 const floorHeight=.125;figure.position.y=floorHeight;let skeletal=false;figure.traverse(o=>{if(o instanceof T.SkinnedMesh)skeletal=true;});const rig=skeletal?createSkeletalChainmakerRig(figure,floorHeight):createChainmakerRig(figure,floorHeight);
 const hot=new T.MeshStandardMaterial({color:'#d68835',emissive:'#ff5e13',emissiveIntensity:1.3,roughness:.6,metalness:.6});
 const link=new T.Mesh(new T.TorusGeometry(.031,.007,8,28),hot);link.name='Worked link';link.rotation.x=Math.PI/2;link.scale.set(1.4,1,1);link.position.copy(LINK);root.add(link);
 const iron=new T.MeshStandardMaterial({color:'#53554b',metalness:.8,roughness:.65});
 for(let i=1;i<9;i++){const chain=new T.Mesh(new T.TorusGeometry(.029,.006,8,24),iron);chain.scale.set(1.4,1,1);chain.position.set(.10+i*.056,1.061-Math.max(0,i-4)*.045,.72);chain.rotation.set(i%2?0:Math.PI/2,0,i>4?-.6:0);chain.castShadow=chain.receiveShadow=true;root.add(chain);}
 rig.update(0);
 return {root,update:rig.update};
}
