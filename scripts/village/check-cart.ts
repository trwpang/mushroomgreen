import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {addForgeCart} from '../../src/scripts/village/cart';
import {makeHomes,prepareGround,ground,chainshopPosition} from '../../src/scripts/village/layout';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const scene=new T.Scene(),cart=addForgeCart(scene);scene.updateMatrixWorld(true);
let triangles=0;cart.traverse(o=>{if(o instanceof T.Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));}});
assert.equal(cart.children.length,3);assert(triangles<30000);assert.equal(cart.userData.spec.wheels,2);assert.equal(cart.userData.spec.horse,false);
const supportGaps=cart.userData.supports.map((p:number[])=>{const v=new T.Vector3().fromArray(p).applyMatrix4(cart.matrixWorld);return v.y-ground(v.x,v.z);});
assert(supportGaps.every((g:number)=>g>-.12&&g<.16),`Ground supports float or sink: ${supportGaps}`);
// Sample the cart's footprint against all cottage walls and the principal forge doorway.
for(let x=-1.3;x<=1.3;x+=.2)for(let z=-1.2;z<3.85;z+=.2){const p=new T.Vector3(x,0,z).applyMatrix4(cart.matrixWorld);
 for(const h of homes.filter(h=>h.number!==5)){const dx=p.x-h.x,dz=p.z-h.z,lx=dx*Math.cos(h.angle)-dz*Math.sin(h.angle),lz=dx*Math.sin(h.angle)+dz*Math.cos(h.angle);assert(Math.abs(lx)>[6.4,7.2,9.2][h.style]*h.sx/2+.25||Math.abs(lz)>[4.6,4.8,4.5][h.style]*h.sz/2+.25,`Cart crosses house ${h.number}`);}
 const dx=p.x-chainshopPosition[0],dz=p.z-chainshopPosition[1],lx=dx*Math.cos(1.03)-dz*Math.sin(1.03),lz=dx*Math.sin(1.03)+dz*Math.cos(1.03);
 assert(!(lx>4.4&&lx<8&&Math.abs(lz)<1.4),'Cart blocks main entrance');
}
const report={triangles,draws:3,supportGaps,spec:cart.userData.spec,position:cart.position.toArray(),clearOfHousesAndDoor:true};
mkdirSync('artifacts/village/cart',{recursive:true});writeFileSync('artifacts/village/cart/validation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
