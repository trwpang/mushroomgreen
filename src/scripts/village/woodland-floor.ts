import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cloneSurface,refineSurface} from '../rendering/surfaces';
import {ground,type Point} from './layout';
import {FOLIAGE_LAYER,brambleGeometry,curve,fernGeometry,foliageMaterial,limbGeometry,seeded} from './foliage';

// Woodland ground flora and deadwood under the dense valley trees: male-fern colonies,
// bramble mounds, fallen limbs and snapped stumps over russet leaf and bracken litter.
// The season follows the spring flowers: fresh fronds beside overwintered ones.
// Placement uses its own seed and the caller's clearance test (roads, paths, yards,
// brook banks, workshops, reserved sites), so the rest of the village is unchanged.

type Tree={p:Point};
export type FloorOptions={trees:Tree[];clear:(p:Point,radius:number)=>boolean;time:{value:number};bark:T.MeshStandardMaterial;keepClear:Point[][]};

function deadwoodGeometries(random:()=>number){
 // Two fallen limbs lying along +X (centred), with side stubs; ends are separate cut faces.
 const logs=[3.4,2.3].map((length,variant)=>{
  const points=[new T.Vector3(-length/2,0,0),new T.Vector3(-length/6,(random()-.5)*.05,(random()-.5)*.12),new T.Vector3(length/6,(random()-.5)*.05,(random()-.5)*.12),new T.Vector3(length/2,0,0)];
  const r0=variant?.15:.21,r1=variant?.1:.13;
  const parts=limbGeometry({points,r0,r1});
  for(let k=0;k<(variant?1:3);k++){const x=-length/3+k*length/3.2,dir=new T.Vector3(random()-.5,.5+random()*.4,random()<.5?-.8:.8);parts.push(...limbGeometry({points:curve(new T.Vector3(x,0,0),dir,.35+random()*.45,.1,2,random),r0:.06,r1:.025}));}
  const ends:T.BufferGeometry[]=[];
  for(const [x,r] of [[-length/2,r0],[length/2,r1]] as const){const cap=new T.CircleGeometry(r*.94,10);const p=cap.attributes.position;for(let i=1;i<p.count;i++)p.setZ(i,(random()-.5)*r*.25);cap.rotateY(x<0?-Math.PI/2:Math.PI/2);cap.translate(x+(x<0?-.01:.01),0,0);cap.computeVertexNormals();ends.push(cap);}
  return {bark:mergeGeometries(parts),ends:mergeGeometries(ends),radius:r0,length};
 });
 // A snapped stump with root flare and a jagged, pale break.
 const stumpParts=limbGeometry({points:[new T.Vector3(0,-.2,0),new T.Vector3(.02,.5,0)],r0:.27,r1:.24});
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2+random()*.4;stumpParts.push(...limbGeometry({points:[new T.Vector3(Math.cos(a)*.1,.22,Math.sin(a)*.1),new T.Vector3(Math.cos(a)*.42,-.04,Math.sin(a)*.42),new T.Vector3(Math.cos(a)*.6,-.2,Math.sin(a)*.6)],r0:.11,r1:.04}));}
 const top=new T.CircleGeometry(.235,12);top.rotateX(-Math.PI/2);const tp=top.attributes.position;for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i);tp.setY(i,.56+(i?.04+Math.max(0,Math.sin(Math.atan2(z,x)*2+1))*.16*random():.03));}top.computeVertexNormals();
 return {logs,stump:{bark:mergeGeometries(stumpParts),ends:top}};
}

export function paintWoodlandLitter(ctx:CanvasRenderingContext2D,pixel:(p:Point)=>Point,patches:{p:Point;r:number}[]){
 const random=seeded(4471865),scale=ctx.canvas.width/460;
 for(const {p,r} of patches){
  // Russet dead bracken and oak leaves: soft blotches with scattered darker flecks.
  for(let k=0;k<3;k++){const q=pixel([p[0]+(random()-.5)*r,p[1]+(random()-.5)*r]),rad=r*(.45+random()*.5)*scale,g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],rad);
   g.addColorStop(0,k%2?'#6b4f2e3a':'#5d4a2c33');g.addColorStop(.6,k%2?'#6b4f2e22':'#5d4a2c1c');g.addColorStop(1,'#5d4a2c00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],rad,0,Math.PI*2);ctx.fill();}
  for(let k=0;k<40;k++){const a=random()*Math.PI*2,d=Math.sqrt(random())*r,q=pixel([p[0]+Math.cos(a)*d,p[1]+Math.sin(a)*d]);ctx.fillStyle=k%3?'#7a5a3450':'#3b2f2248';ctx.fillRect(q[0],q[1],1+random()*2,1+random()*1.5);}
 }
}

export function addWoodlandFloor(scene:T.Scene,{trees,clear,time,bark,keepClear}:FloorOptions){
 const random=seeded(4401865);
 const grid=new Map<string,Point[]>(),key=(x:number,z:number)=>Math.floor(x/8)+':'+Math.floor(z/8);
 for(const {p} of trees){const k=key(...p),list=grid.get(k)??[];list.push(p);grid.set(k,list);}
 const nearby=(p:Point,r:number)=>{let n=0,closest=Infinity;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const q of grid.get((Math.floor(p[0]/8)+i)+':'+(Math.floor(p[1]/8)+j))??[]){const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<r)n++;closest=Math.min(closest,d);}return {n,closest};};
 const viewClear=(p:Point,r:number)=>keepClear.every(([a,b])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t)>r+2;});
 const ok=(p:Point,r:number)=>clear(p,r)&&viewClear(p,r)&&nearby(p,r+.45).closest>r*.6+.45;
 const ferns:T.Matrix4[]=[],brambles:T.Matrix4[]=[],litter:{p:Point;r:number}[]=[],d=new T.Object3D();
 let colonies=0;
 for(let attempt=0;attempt<9000&&colonies<460;attempt++){
  const p:Point=[-205+random()*400,-290+random()*460],canopy=nearby(p,7).n;
  if(canopy<3||random()>canopy/6||!ok(p,1.2))continue;
  colonies++;litter.push({p,r:2.5+random()*2.5});
  const bramble=random()<.3,count=bramble?1+Math.floor(random()*3):3+Math.floor(random()*7);
  for(let k=0;k<count;k++){
   const a=random()*Math.PI*2,r=(bramble?.6:.9)+random()*(bramble?2.4:3.4),q:Point=[p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r],size=bramble?.8+random()*.7:.75+random()*.5;
   if(!ok(q,bramble?.9*size:.45*size))continue;
   d.position.set(q[0],ground(...q)-.02,q[1]);d.rotation.set((random()-.5)*.12,random()*Math.PI*2,(random()-.5)*.12);
   if(bramble)d.scale.set(size*(.9+random()*.3),size*(.75+random()*.3),size*(.9+random()*.3));else d.scale.setScalar(size);
   d.updateMatrix();(bramble?brambles:ferns).push(d.matrix.clone());
  }
 }
 const leafy=foliageMaterial(time,{color:'#bdc2aa',sway:0,transmission:.3});refineSurface(leafy,'leaf');
 const place=(geometry:T.BufferGeometry,matrices:T.Matrix4[])=>{const mesh=new T.InstancedMesh(geometry,leafy,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;mesh.layers.set(FOLIAGE_LAYER);scene.add(mesh);return mesh;};
 place(fernGeometry(),ferns);place(brambleGeometry(),brambles);

 // Fallen limbs and stumps: bark shares the tree detail; cut ends are pale, weathered wood.
 const wood=deadwoodGeometries(seeded(4431865));
 const deadBark=cloneSurface(bark);deadBark.color.set('#4a4636');
 const endGrain=refineSurface(new T.MeshStandardMaterial({color:'#8d7a5c',roughness:.95}),'wood');
 const logs=wood.logs.map(()=>[] as T.Matrix4[]),stumps:T.Matrix4[]=[];
 for(let attempt=0;attempt<2600&&logs.flat().length<120;attempt++){
  const variant=random()<.55?0:1,log=wood.logs[variant],scale=.75+random()*.5,half=log.length*scale/2,a=random()*Math.PI*2;
  const p:Point=[-205+random()*400,-290+random()*460];if(nearby(p,8).n<4)continue;
  const ends:Point[]=[[p[0]+Math.cos(a)*half,p[1]-Math.sin(a)*half],[p[0]-Math.cos(a)*half,p[1]+Math.sin(a)*half]];
  if(![p,...ends].every(q=>ok(q,.5)))continue;
  const y0=ground(...ends[1]),y1=ground(...ends[0]),pitch=Math.atan2(y1-y0,half*2);
  d.position.set(p[0],(y0+y1)/2+log.radius*scale*.5,p[1]);d.rotation.set(0,a,pitch,'YXZ');d.rotation.z=pitch;d.scale.setScalar(scale);d.updateMatrix();
  logs[variant].push(d.matrix.clone());litter.push({p,r:1.2+half*.6});
 }
 for(let attempt=0;attempt<2600&&stumps.length<80;attempt++){
  const p:Point=[-205+random()*400,-290+random()*460];if(nearby(p,7).n<3||!ok(p,.7))continue;
  const scale=.7+random()*.6;d.position.set(p[0],ground(...p)-.04,p[1]);d.rotation.set(0,random()*Math.PI*2,0);d.scale.set(scale,scale*(.7+random()*.6),scale);d.updateMatrix();stumps.push(d.matrix.clone());
 }
 const woodMesh=(geometry:T.BufferGeometry,material:T.Material,matrices:T.Matrix4[],barkCoverage:boolean)=>{
  if(barkCoverage)geometry.setAttribute('barkCoverage',new T.InstancedBufferAttribute(new Float32Array(matrices.length).fill(1),1));
  const mesh=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 };
 wood.logs.forEach((log,i)=>{woodMesh(log.bark,deadBark,logs[i],true);woodMesh(log.ends,endGrain,logs[i],false);});
 woodMesh(wood.stump.bark,deadBark,stumps,true);woodMesh(wood.stump.ends,endGrain,stumps,false);
 return {litter,counts:{colonies,ferns:ferns.length,brambles:brambles.length,logs:logs.flat().length,stumps:stumps.length}};
}
