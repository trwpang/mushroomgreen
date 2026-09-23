import * as T from 'three';
import {DetailBatch} from './detail-batch';
import {excavations,hollowRadius,railRoutes,railNearest,pools,shafts,insideSite} from './historic-plan';
import {ground,nearestRoad,baseGround,type Point} from './layout';
import {refineSurface} from '../rendering/surfaces';
import {textureDetail} from './texture-detail';
import type {BackyardShop} from './backyard-workshops';
export function lineSamples(line:Point[],step=.8){const out:{p:Point;t:Point}[]=[];for(let i=1;i<line.length;i++){const a=line[i-1],c=line[i],l=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.ceil(l/step);for(let j=0;j<n;j++)out.push({p:[a[0]+(c[0]-a[0])*j/n,a[1]+(c[1]-a[1])*j/n],t:[(c[0]-a[0])/l,(c[1]-a[1])/l]});}return out;}
export function paintHistoricLandscape(ctx:CanvasRenderingContext2D,pixel:(p:Point)=>Point,shops:BackyardShop[]){
 const sx=ctx.canvas.width/460,sz=ctx.canvas.height/520;
 const dab=(p:Point,r:number,c:string)=>{const q=pixel(p),g=ctx.createRadialGradient(...q,0,...q,r*sx);g.addColorStop(0,c);g.addColorStop(.5,c);g.addColorStop(1,c.slice(0,7)+'00');ctx.fillStyle=g;ctx.fillRect(q[0]-r*sx,q[1]-r*sx,r*sx*2,r*sx*2);};
 for(const e of excavations)for(let x=e.p[0]-e.rx*1.6;x<e.p[0]+e.rx*1.6;x+=.55)for(let z=e.p[1]-e.rz*1.6;z<e.p[1]+e.rz*1.6;z+=.55){const r=hollowRadius(x,z,e);if(r>1.14||!insideSite(x,z))continue;const road=nearestRoad([x,z]);if(Math.hypot(x-road[0],z-road[1])<5)continue;const noise=Math.sin(x*12.9898+z*78.233)*43758.5453,n=noise-Math.floor(noise);const q=pixel([x,z]);ctx.fillStyle=e.kind==='clay'?`rgba(${134+n*24},${100+n*17},${66+n*12},${r<1?.65:.2})`:`rgba(${76+n*23},${68+n*19},${50+n*12},${r<1?.72:.2})`;ctx.fillRect(q[0],q[1],sx*.6,sz*.6);}
 for(const line of railRoutes)for(const {p}of lineSamples(line,.6))if(insideSite(...p))dab(p,3.5,'#6b6658c0');
 for(const e of pools){dab(e.p,Math.max(e.rx,e.rz)*1.3,'#504d35b0');}
 for(const s of shafts)dab(s.p,5.1,'#504434b0');
 for(const s of shops){dab(s.p,Math.max(s.width,s.depth)*.85,'#514637b0');for(const {p}of lineSamples(s.access,.4))dab(p,.75,'#968064aa');}
}
export function addHistoricLandscape(scene:T.Scene){
 const batch=new DetailBatch();batch.root.name='Historic workings and railway';
 const mat=(color:string,kind:Parameters<typeof refineSurface>[1])=>refineSurface(new T.MeshStandardMaterial({color,roughness:.93}),kind);
 const wood=mat('#504532','wood'),iron=textureDetail(mat('#514a3c','iron'),'cast-iron'),railTop=mat('#727061','iron'),brick=textureDetail(mat('#725442','brick'),'fired-brick'),shale=mat('#484637','stone'),clay=mat('#756147','stone'),leaf=mat('#35472c','leaf'),reed=mat('#83865a','leaf');
 const v=(p:Point,h=0)=>new T.Vector3(p[0],ground(...p)+h,p[1]);
 let sleepers=0,railMetres=0,crossings=0,bankRocks=0;const placed:Point[]=[];
 for(const line of railRoutes){const samples=lineSamples(line,.72);for(let i=0;i<samples.length;i++){
  const {p,t}=samples[i];if(!insideSite(p[0]+t[1]*2,p[1]-t[0]*2)||!insideSite(p[0]-t[1]*2,p[1]+t[0]*2))continue;
  if(placed.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.45))continue;placed.push(p);
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(t[0],t[1]));
  batch.block(wood,v(p,.085),new T.Vector3(2.35,.15,.22),q,.8+(i%7)*.045);sleepers++;
  for(const side of [-1,1]){const a:Point=[p[0]-t[1]*.7175*side,p[1]+t[0]*.7175*side];batch.block(iron,v(a,.18),new T.Vector3(.19,.045,.18),q);for(const off of [-.095,.095]){const b:Point=[a[0]+t[1]*off,a[1]-t[0]*off];batch.block(iron,v(b,.22),new T.Vector3(.033,.025,.035),q);}}
  const road=nearestRoad(p);if(Math.hypot(p[0]-road[0],p[1]-road[1])<2.8){batch.block(wood,v(p,.245),new T.Vector3(1.29,.12,.64),q);crossings++;}
  if(i%2===0)for(let k=0;k<4;k++){const off=(k%2?1:-1)*(1.2+((i*7+k)%11)*.075),a:Point=[p[0]-t[1]*off,p[1]+t[0]*off];batch.rock(shale,v(a,.015),new T.Vector3(.10,.04,.065),q,.74+(i%9)*.045);}
 }
 // Continuous web, foot and rubbed head. No gaps between the short rail sections.
 for(let i=1;i<samples.length;i++){const a=samples[i-1],c=samples[i];if(!insideSite(...a.p)||!insideSite(...c.p))continue;
  for(const side of [-1,1]){const pa:Point=[a.p[0]-a.t[1]*.7175*side,a.p[1]+a.t[0]*.7175*side],pc:Point=[c.p[0]-c.t[1]*.7175*side,c.p[1]+c.t[0]*.7175*side];if(!insideSite(...pa)||!insideSite(...pc))continue;const va=v(pa,.23),vb=v(pc,.23),delta=vb.clone().sub(va),length=delta.length(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),delta.normalize()),mid=va.add(vb).multiplyScalar(.5);
   for(const [dy,width,height,m]of [[-.06,.12,.025,iron],[0,.018,.115,iron],[.064,.057,.039,railTop]] as const)batch.block(m,mid.clone().add(new T.Vector3(0,dy,0)),new T.Vector3(length+.012,height,width),q);
   railMetres+=length;
  }
 }
 }
 // Exposed fragments, erosion streaks and scrub belong on the banks, not across the village.
 for(const e of excavations)for(let j=0;j<135;j++){const a=j*2.399963,r=.63+((j*17)%41)/100,p:Point=[e.p[0]+Math.cos(a)*e.rx*r,e.p[1]+Math.sin(a)*e.rz*r];if(!insideSite(...p)||railNearest(...p).distance<4)continue;const road=nearestRoad(p);if(Math.hypot(p[0]-road[0],p[1]-road[1])<5)continue;
  const size=.045+(j%9)*.038;batch.rock(e.kind==='clay'?clay:shale,v(p,size*.12),new T.Vector3(size*1.7,size*.3,size),new T.Quaternion().setFromEuler(new T.Euler(.1,j,0)),.75+(j%7)*.05);bankRocks++;
  if(j%5===0)for(let k=0;k<7;k++){const b:Point=[p[0]+Math.sin(k*2.4)*.3,p[1]+Math.cos(k*2.4)*.3];batch.beam(leaf,v(b),v([b[0]+.11,b[1]+.05],.25+(k%3)*.17),.017);for(let n=0;n<3;n++)batch.rock(leaf,v(b,.18+n*.11),new T.Vector3(.10,.025,.055),new T.Quaternion().setFromEuler(new T.Euler(.2,k,0)));}
 }
 // Conservative closed shaft mouths: brick collars, thick cover boards and a timber enclosure.
 for(const s of shafts){const y=ground(...s.p),r=s.radius;for(let row=0;row<3;row++)for(let j=0;j<24;j++){const a=(j+(row%2)*.5)/24*Math.PI*2,p=new T.Vector3(s.p[0]+Math.cos(a)*r,y+.065+row*.125,s.p[1]+Math.sin(a)*r);batch.block(brick,p,new T.Vector3(.28,.115,.25),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-a+Math.PI/2),.75+(j%7)*.045);}
  for(let j=0;j<9;j++)batch.block(wood,new T.Vector3(s.p[0]+(j-4)*r*.22,y+.41,s.p[1]),new T.Vector3(r*.21,.14,r*2.08));
  for(const x of [-2.0,2.0])for(const z of [-2.0,2.0]){const p:Point=[s.p[0]+x,s.p[1]+z];batch.block(wood,v(p,.58),new T.Vector3(.12,1.16,.12));}
  for(const side of [-1,1])for(const height of [.4,.85]){batch.beam(wood,v([s.p[0]-2,s.p[1]+side*2],height),v([s.p[0]+2,s.p[1]+side*2],height),.045);batch.beam(wood,v([s.p[0]+side*2,s.p[1]-2],height),v([s.p[0]+side*2,s.p[1]+2],height),.045);}
 }
 const waterMaterial=new T.MeshStandardMaterial({name:'Still working pools',color:'#354b3c',roughness:.48,metalness:.04,envMapIntensity:.16});
 waterMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 poolPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npoolPoint=position;');
  shader.fragmentShader='varying vec3 poolPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   normal=normalize(normal+vec3(sin(poolPoint.x*9.+poolPoint.z*6.)*.035,0.,cos(poolPoint.z*11.-poolPoint.x*3.)*.025));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   diffuseColor.rgb*=.88+.12*sin(poolPoint.x*1.7+sin(poolPoint.z*.9));`);
 };
 const waterMeshes:T.Mesh[]=[];
 let waterTriangles=0;
 for(const e of pools){const water=baseGround(...e.p)-e.depth*.50,vertices:number[]=[];
  // Sample the actual hollow. Trim water to ground contour to prevent a floating ellipse.
  for(let x=e.p[0]-e.rx*1.5;x<e.p[0]+e.rx*1.5;x+=.25)for(let z=e.p[1]-e.rz*1.5;z<e.p[1]+e.rz*1.5;z+=.25){const points:Point[]=[[x,z],[x,z+.25],[x+.25,z],[x+.25,z+.25]];for(const ids of [[0,1,2],[2,1,3]])if(ids.every(i=>insideSite(...points[i])&&ground(...points[i])<water-.015)){for(const i of ids)vertices.push(points[i][0],water,points[i][1]);waterTriangles++;}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const mesh=new T.Mesh(geo,waterMaterial);mesh.name='Small pool in working hollow';scene.add(mesh);waterMeshes.push(mesh);
  for(let j=0;j<45;j++){const a=j*2.4,p:Point=[e.p[0]+Math.cos(a)*e.rx,e.p[1]+Math.sin(a)*e.rz];if(ground(...p)<water-.1)continue;for(let k=0;k<3;k++){const start=v([p[0]+k*.05,p[1]]);batch.beam(reed,start,start.clone().add(new T.Vector3(.07,.35+(j%7)*.07,.03)),.012);}}
 }
 const result=batch.finish();scene.add(result.root);return {...result,sleepers,railMetres,crossings,bankRocks,shaftCount:shafts.length,pools:pools.length,waterTriangles,waterMaterial,waterMeshes};
}
