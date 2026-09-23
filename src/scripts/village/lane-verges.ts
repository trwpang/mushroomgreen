import * as T from 'three';
import {refineSurface} from '../rendering/surfaces';
import {ground,laneLines,nearestRoad,roundedLine,renderedRoads,villageRoads,type Point} from './layout';
import {stoneVariants} from './riverbank';
import {roadCrossing} from './road-crossing';

// Lane margins. The painted lanes met the grass along a crisp line; real unmetalled lanes
// fray into their verges. This adds: grass that encroaches on the lane edge, taller verge
// tussocks, a sparse grassy crown between the wheel ruts of the hamlet's own lanes, grit and
// cinders lying in the ruts, and spring dandelions on the verges. Own seeds throughout.
// Cinders spread on lanes are a plausible local practice, not documented for these lanes.

const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function samples(line:Point[],step:number){const out:{p:Point;t:Point}[]=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(len/step));for(let j=0;j<n;j++)out.push({p:[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],t:[(b[0]-a[0])/len,(b[1]-a[1])/len]});}return out;}
const edgeNoise=(p:Point)=>.5+.3*Math.sin(p[0]*.53+Math.sin(p[1]*.41)*2)+.2*Math.sin(p[1]*1.37-p[0]*.91);

/** Paint an irregular grass edge over the lane shoulders, after all lane layers. */
export function paintLaneEdges(ctx:CanvasRenderingContext2D,pixel:(p:Point)=>Point,paths:Point[][]){
 const nearPath=(q:Point)=>paths.some(line=>line.some((b,i)=>{if(!i)return false;const a=line[i-1],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(q[0]-a[0]-dx*u,q[1]-a[1]-dz*u)<1.4;}));
 const random=seeded(2621865),scale=ctx.canvas.width/460;
 for(const line of renderedRoads.map(roundedLine))for(const {p,t} of samples(line,.3))for(const side of [-1,1]){
  const reach=1.5+edgeNoise([p[0]+side*9,p[1]])*.95+(random()-.5)*.35,q:Point=[p[0]-t[1]*reach*side,p[1]+t[0]*reach*side];
  const road=nearestRoad(q);if(Math.hypot(q[0]-road[0],q[1]-road[1])<reach-.05||nearPath(q))continue;
  const c=pixel(q),r=(.2+random()*.45)*scale,g=ctx.createRadialGradient(c[0],c[1],0,c[0],c[1],r);
  const colour=random()<.7?'96,103,58':'118,112,70';g.addColorStop(0,`rgba(${colour},.72)`);g.addColorStop(.55,`rgba(${colour},.45)`);g.addColorStop(1,`rgba(${colour},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(c[0],c[1],r,0,Math.PI*2);ctx.fill();
 }
}

function tuftGeometry(blades:number,height:[number,number],seed:number,dry:number){
 const random=seeded(seed),position:number[]=[],normal:number[]=[],color:number[]=[],index:number[]=[];
 const green=[new T.Color('#4d5a2a'),new T.Color('#6c7a37'),new T.Color('#86904a')],straw=new T.Color('#a39462');
 for(let b=0;b<blades;b++){
  const a=b*2.39996+random()*.6,r=random()*.06,h=height[0]+random()*(height[1]-height[0]),lean=.15+random()*.55,w=.006+random()*.004,spent=random()<dry;
  const out=new T.Vector3(Math.cos(a),0,Math.sin(a)),side=new T.Vector3(-out.z,0,out.x),start=position.length/3;
  for(let k=0;k<=4;k++){const t=k/4,c=out.clone().multiplyScalar(r+lean*t*t*h).add(new T.Vector3(0,h*t*(1-.2*t*lean),0));
   for(const s of [-1,1]){const q=c.clone().addScaledVector(side,s*w*(1-t*.85));position.push(q.x,q.y,q.z);const n=new T.Vector3(0,1,0).addScaledVector(out,.4).normalize();normal.push(n.x,n.y,n.z);
    const col=(spent&&t>.4?green[1].clone().lerp(straw,(t-.4)/.6):green[0].clone().lerp(green[2],t)).multiplyScalar(.85+random()*.3);color.push(col.r,col.g,col.b);}
   if(k)index.push(start+(k-1)*2,start+(k-1)*2+1,start+k*2+1,start+(k-1)*2,start+k*2+1,start+k*2);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(index);g.computeBoundingSphere();return g;
}
/** Dandelion: a flat toothed rosette, one stalk and a yellow head (a few already clocks). */
function dandelionGeometry(){
 const position:number[]=[],normal:number[]=[],color:number[]=[],leaf=new T.Color('#4f6a2c'),stalk=new T.Color('#6f7f3c'),head=new T.Color('#e0b422');
 const tri=(a:number[],b:number[],c:number[],col:T.Color,n=[0,1,0])=>{position.push(...a,...b,...c);for(let i=0;i<3;i++){normal.push(...n);color.push(col.r,col.g,col.b);}};
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,l=.09+.03*Math.sin(i*2.3),c=Math.cos(a),s=Math.sin(a),px=-s*.018,pz=c*.018;tri([0,.004,0],[c*l*.5+px,.008,s*l*.5+pz],[c*l,.006,s*l],leaf);tri([0,.004,0],[c*l,.006,s*l],[c*l*.5-px,.008,s*l*.5-pz],leaf);}
 const h=.14;tri([-.003,0,0],[.003,0,0],[.001,h,0],stalk,[0,0,1]);tri([0,0,-.003],[0,0,.003],[0,h,.001],stalk,[1,0,0]);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,b=(i+1)/10*Math.PI*2,r=.022;tri([0,h+.006,0],[Math.cos(a)*r,h,Math.sin(a)*r],[Math.cos(b)*r,h,Math.sin(b)*r],head);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.computeBoundingSphere();return g;
}

export type VergeOptions={clear:(p:Point,radius:number)=>boolean};
export function addLaneVerges(scene:T.Scene,{clear}:VergeOptions){
 const random=seeded(2641865),d=new T.Object3D();
 const verge:T.Matrix4[]=[],crown:T.Matrix4[]=[],flowers:T.Matrix4[]=[],grit:{m:T.Matrix4;c:T.Color;shape:number}[]=[];
 const hamlet=new Set(villageRoads.map(line=>line));
 const onBridge=(p:Point)=>{const dx=p[0]-roadCrossing.centre[0],dz=p[1]-roadCrossing.centre[1],along=dx*roadCrossing.direction[0]+dz*roadCrossing.direction[1],across=-dx*roadCrossing.direction[1]+dz*roadCrossing.direction[0];return Math.abs(along)<roadCrossing.halfLength+1.5&&Math.abs(across)<roadCrossing.halfWidth+2.5;};
 const place=(list:T.Matrix4[],p:Point,scale:number,lift=0)=>{d.position.set(p[0],ground(...p)+lift,p[1]);d.rotation.set(0,random()*Math.PI*2,0);d.scale.setScalar(scale);d.updateMatrix();list.push(d.matrix.clone());};
 renderedRoads.forEach((route,index)=>{
  const line=laneLines[index],own=hamlet.has(route);
  for(const {p,t} of samples(line,.55)){
   const n:Point=[-t[1],t[0]];
   for(const side of [-1,1]){
    // Verge tussocks, thickest where the lane edge frays.
    const fray=edgeNoise([p[0]+side*9,p[1]]),reach=2.05+random()*1.1;
    if(random()<fray*fray*.85)for(let k=0,count=1+Math.floor(random()*4);k<count;k++){const r=reach+(random()-.3)*.6,q:Point=[p[0]+n[0]*r*side+(random()-.5)*.55,p[1]+n[1]*r*side+(random()-.5)*.55],road=nearestRoad(q);
     if(Math.hypot(q[0]-road[0],q[1]-road[1])>1.85&&!onBridge(q)&&clear(q,.12))place(verge,q,.55+random()*.55);}
    if(random()<.035){const q:Point=[p[0]+n[0]*(2.3+random()*1.3)*side,p[1]+n[1]*(2.3+random()*1.3)*side],road=nearestRoad(q);
     if(Math.hypot(q[0]-road[0],q[1]-road[1])>2.1&&!onBridge(q)&&clear(q,.1))place(flowers,q,.8+random()*.5,.005);}
    // Grit and cinders in the wheel tracks.
    if(random()<.5){const q:Point=[p[0]+n[0]*(.87+(random()-.5)*.35)*side+t[0]*(random()-.5)*.5,p[1]+n[1]*(.87+(random()-.5)*.35)*side+t[1]*(random()-.5)*.5];
     if(!onBridge(q)&&clear(q,.02)){const s=.018+random()*.035,cinder=random()<.45;d.position.set(q[0],ground(...q)+s*.05,q[1]);d.rotation.set(random()*.4,random()*6.3,random()*.4);d.scale.set(s*1.3,s*.8,s);d.updateMatrix();
      grit.push({m:d.matrix.clone(),c:new T.Color(cinder?'#34322f':'#8f8573').multiplyScalar(.8+random()*.35),shape:Math.floor(random()*4)});}}
   }
   // A sparse grassy crown survives between the ruts of the hamlet's own lanes.
   if(own&&random()<.28){const q:Point=[p[0]+n[0]*(random()-.5)*.45,p[1]+n[1]*(random()-.5)*.45];
    if(!onBridge(q)&&clear(q,.05)&&junctionFree(q,index))place(crown,q,.45+random()*.35);}
  }
 });
 const grass=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.95});refineSurface(grass,'leaf');
 const add=(g:T.BufferGeometry,m:T.Material,list:T.Matrix4[])=>{const mesh=new T.InstancedMesh(g,m,list.length);list.forEach((x,i)=>mesh.setMatrixAt(i,x));mesh.receiveShadow=true;scene.add(mesh);return mesh;};
 add(tuftGeometry(16,[.22,.5],2651865,.3),grass,verge).castShadow=true;
 add(tuftGeometry(9,[.06,.14],2661865,.15),grass,crown);
 add(dandelionGeometry(),refineSurface(new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.8}),'leaf'),flowers);
 const stones=stoneVariants(1),gritMaterial=refineSurface(new T.MeshStandardMaterial({color:'#ffffff',roughness:.92}),'stone');
 for(let shape=0;shape<4;shape++){const mine=grit.filter(g=>g.shape===shape),mesh=new T.InstancedMesh(stones[shape],gritMaterial,mine.length);
  mine.forEach((g,i)=>{mesh.setMatrixAt(i,g.m);mesh.setColorAt(i,g.c);});mesh.receiveShadow=true;scene.add(mesh);}
 return {counts:{verge:verge.length,crown:crown.length,dandelions:flowers.length,grit:grit.length}};

 function junctionFree(q:Point,index:number){for(const [k,other] of laneLines.entries()){if(k===index)continue;let best=Infinity;for(let i=1;i<other.length;i++){const a=other[i-1],b=other[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(q[0]-a[0]-dx*u,q[1]-a[1]-dz*u));}if(best<5)return false;}return true;}
}
