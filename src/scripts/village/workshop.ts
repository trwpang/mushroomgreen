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
