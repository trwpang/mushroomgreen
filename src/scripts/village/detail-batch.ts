import * as T from 'three';
/** Shared primitive instances: detailed yards without a draw call per brick. */
export class DetailBatch {
 readonly root=new T.Group();
 private groups=new Map<string,{g:T.BufferGeometry;m:T.Material;matrices:T.Matrix4[];colors:T.Color[]}>();
 private box=new T.BoxGeometry(1,1,1);
 private rod=new T.CylinderGeometry(1,1,1,7);
 private stone=new T.IcosahedronGeometry(1,0);
 private ring=new T.TorusGeometry(1,.14,5,12);
 private dummy=new T.Object3D();
 add(key:string,g:T.BufferGeometry,m:T.Material,p:T.Vector3,size:T.Vector3,rotation=new T.Quaternion(),tone=1){let b=this.groups.get(key);if(!b){b={g,m,matrices:[],colors:[]};this.groups.set(key,b);}this.dummy.position.copy(p);this.dummy.scale.copy(size);this.dummy.quaternion.copy(rotation);this.dummy.updateMatrix();b.matrices.push(this.dummy.matrix.clone());b.colors.push(new T.Color().setScalar(tone));}
 block(m:T.Material,p:T.Vector3,size:T.Vector3,rotation=new T.Quaternion(),tone=1){this.add('box-'+m.uuid,this.box,m,p,size,rotation,tone);}
 rock(m:T.Material,p:T.Vector3,size:T.Vector3,rotation=new T.Quaternion(),tone=1){this.add('stone-'+m.uuid,this.stone,m,p,size,rotation,tone);}
 link(m:T.Material,p:T.Vector3,size:T.Vector3,rotation=new T.Quaternion(),tone=1){this.add('link-'+m.uuid,this.ring,m,p,size,rotation,tone);}
 beam(m:T.Material,a:T.Vector3,b:T.Vector3,r:number,tone=1){const v=b.clone().sub(a);this.add('rod-'+m.uuid,this.rod,m,a.clone().add(b).multiplyScalar(.5),new T.Vector3(r,v.length(),r),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()),tone);}
 finish(){let triangles=0;for(const b of this.groups.values()){const mesh=new T.InstancedMesh(b.g,b.m,b.matrices.length);b.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,b.colors[i]);});mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();this.root.add(mesh);triangles+=(b.g.index?.count??b.g.attributes.position.count)/3*b.matrices.length;}return {root:this.root,draws:this.groups.size,triangles};}
}
