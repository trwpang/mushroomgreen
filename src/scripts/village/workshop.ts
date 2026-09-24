import * as T from 'three';
/** Bake decoded positions before filtering. Meshopt position attributes can be normalized integers. */
export function centralWorkstation(source:T.BufferGeometry,world:T.Matrix4,keepCentre=true){
 const geometry=source.index?source.toNonIndexed():source.clone();
 const encoded=geometry.getAttribute('position'),decoded:number[]=[];
 for(let i=0;i<encoded.count;i++)decoded.push(encoded.getX(i),encoded.getY(i),encoded.getZ(i));
 geometry.setAttribute('position',new T.Float32BufferAttribute(decoded,3));
 geometry.applyMatrix4(world);
 const positions=geometry.getAttribute('position'),keep:number[]=[];
 for(let i=0;i<positions.count;i+=3){const x=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3;if((Math.abs(x)<1.3)===keepCentre)keep.push(i,i+1,i+2);}
 geometry.setIndex(keep);return geometry;
}
/** The central anvil block's oak stool ran 0.96m deep, so its near face stood inside the
 * chainmaker's shins. Pull that face back 18cm (baked into forge-local metres); the iron
 * anvil, its foot and the far timber return are untouched. */
export const stanceClearance={near:.24,shift:.18,reach:.5};
export function clearChainmakerStance(source:T.BufferGeometry,world:T.Matrix4){
 const geometry=source.clone(),encoded=geometry.getAttribute('position'),decoded:number[]=[];
 for(let i=0;i<encoded.count;i++)decoded.push(encoded.getX(i),encoded.getY(i),encoded.getZ(i));
 geometry.setAttribute('position',new T.Float32BufferAttribute(decoded,3));geometry.applyMatrix4(world);
 const p=geometry.getAttribute('position'),{near,shift,reach}=stanceClearance;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(Math.abs(x)<.6&&y<.8&&z>near-.05&&z<reach)p.setZ(i,z+shift*T.MathUtils.clamp((reach-z)/(reach-near),0,1));}
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
