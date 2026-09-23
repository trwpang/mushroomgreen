import {siteIssue} from './site-reservations';
import {industryClear} from './historic-plan';
import {refineSurface} from '../rendering/surfaces';
import * as T from 'three';
import {brookWater,downstreamLine} from './brook-water';
import { roads,renderedRoads,brooks,baseGround,streamSurface,ground,streamWidth,streamDistance,nearestRoad,roundedLine,chainshopPosition,type Point,type Home } from './layout';
const inside=(x:number,z:number)=>Math.pow(x/210,2)+Math.pow((z+60)/240,2)<.96;
function samples(line:Point[],step=1):Point[]{const out:Point[]=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step));for(let j=0;j<n;j++)out.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}out.push(line[line.length-1]);return out;}
const roadSamples=renderedRoads.map(r=>samples(roundedLine(r),.7));
export function paintLanes(ctx:CanvasRenderingContext2D,pixel:(p:Point)=>Point,rand:()=>number,paths:Point[][]=[]){
const scale=ctx.canvas.width/460;
// Damp earth and leaf litter blend the water into its banks.
for(const line of brooks)for(const p of samples(line,1)){const q=pixel(p),r=(streamWidth(...p)*.5+2)*scale;const g=ctx.createRadialGradient(q[0],q[1],r*.2,q[0],q[1],r);g.addColorStop(0,'#655a40');g.addColorStop(.63,'#696347c0');g.addColorStop(1,'#69714a00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();}
// Paint the entire network in layers: no verge can cut across a junction.
const networks=roadSamples.map(points=>points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return {p,nx:-(b[1]-a[1])/len,nz:(b[0]-a[0])/len};}));
function stroke(points:Point[],width:number,color:string){ctx.beginPath();points.forEach((p,i)=>{const q=pixel(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.lineWidth=width*scale;ctx.strokeStyle=color;ctx.lineCap=ctx.lineJoin='round';ctx.stroke();}
for(const [width,color] of [[5.2,'#71634e'],[4.6,'#8e7356'],[4.05,'#a18768']] as const)for(const points of roadSamples)stroke(points,width,color);
// Footpaths cross the road's verge before the wheel tracks are applied.
// A flared, feathered mouth erases the road-edge stripe rather than ending at it.
let pathSeed=1871;const pathRandom=()=>{pathSeed=(Math.imul(pathSeed,1664525)+1013904223)>>>0;return pathSeed/4294967296;};
for(const path of paths){
 for(const p of samples(roundedLine(path),.18)){
  const road=nearestRoad(p),distance=Math.hypot(p[0]-road[0],p[1]-road[1]);
  const flare=Math.exp(-(((distance-2.2)/1.25)**2));
  const radius=(.76+.65*flare)*scale,q=pixel(p);
  const gradient=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],radius);
  gradient.addColorStop(0,'#a18768cc');gradient.addColorStop(.48,'#a1876880');gradient.addColorStop(1,'#a1876800');
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(q[0],q[1],radius,0,Math.PI*2);ctx.fill();
 }
 for(const p of samples(path,.35))for(let k=0;k<5;k++){
  const q=pixel([p[0]+(pathRandom()-.5)*1.05,p[1]+(pathRandom()-.5)*1.05]);ctx.fillStyle=k%2?'#c4a78335':'#53402e30';ctx.fillRect(q[0],q[1],.7+pathRandom(),.7+pathRandom());
 }
}
let roadSeed=2571865;const roadRandom=()=>{roadSeed=(Math.imul(roadSeed,1664525)+1013904223)>>>0;return roadSeed/4294967296;};
for(const [roadIndex,frames] of networks.entries()){
 const random=roadIndex===4||roadIndex>=roads.length?roadRandom:rand;
 // Consume the old stub's draws to preserve the rest of the scene seed.
 if(roadIndex===4)for(let i=0;i<samples(roundedLine(roads[4]),.7).length*30*5;i++)rand();
 for(const side of [-1,1]){const track=frames.map(({p,nx,nz})=>[p[0]+nx*.87*side,p[1]+nz*.87*side] as Point);stroke(track,.58,'#79604770');stroke(track,.25,'#59463390');}
 for(const {p,nx,nz} of frames)for(let k=0;k<30;k++){const off=(random()-.5)*4.3,q=pixel([p[0]+nx*off+(random()-.5)*.7,p[1]+nz*off+(random()-.5)*.7]);ctx.fillStyle=k%3?'#c4a78360':'#53402e65';ctx.fillRect(q[0],q[1],.04*scale+random(),.035*scale+random());}
}
// Irregular damp patches follow wheel ruts and worn shoulders along the lane.
for(const frames of networks)for(let i=3;i<frames.length;i+=7){
 const {p,nx,nz}=frames[i],side=i%2?1:-1,q=pixel([p[0]+nx*.87*side,p[1]+nz*.87*side]);
 const r=(.6+.3*Math.sin(i*2.1))*scale,g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],r);
 g.addColorStop(0,'#3e332654');g.addColorStop(1,'#3e332600');ctx.save();ctx.translate(...q);ctx.scale(1,1.8);ctx.translate(-q[0],-q[1]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();ctx.restore();
}
const q=pixel(chainshopPosition);ctx.fillStyle='#665a42';ctx.beginPath();for(let i=0;i<32;i++){const a=i/32*Math.PI*2,r=.91+rand()*.13;const x=q[0]+Math.cos(a)*5.7*scale*r,y=q[1]+Math.sin(a)*7*scale*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
}
export function addLandscape(scene:T.Scene,homes:Home[],rand:()=>number,clearings:Point[]=[]){
const water=brookWater(scene),waterTime=water.time,waterMat=water.material;
const waterMeshes:T.Mesh[]=[];
for(const source of brooks){const line=downstreamLine(source),points=samples(line,.7);const verts:number[]=[],uvs:number[]=[],tangents:number[]=[],indices:number[]=[];let distance=0;
for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];const len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;const nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;if(i)distance+=Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]);const w=streamWidth(...p)*.53;for(const side of [-1,1]){verts.push(p[0]+nx*w*side,streamSurface(...p),p[1]+nz*w*side);uvs.push((side+1)/2,distance);tangents.push(nz,-nx);}if(i&&inside(...p)&&inside(...points[i-1])){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k);}}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('flowTangent',new T.Float32BufferAttribute(tangents,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,waterMat);mesh.receiveShadow=true;scene.add(mesh);waterMeshes.push(mesh);
}
const stoneGeo=new T.IcosahedronGeometry(1,1);const positions=stoneGeo.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);const f=.94+.09*Math.sin(x*7+y*5+z*9);positions.setXYZ(i,x*f,y*f,z*f);}stoneGeo.computeVertexNormals();
const wakes:{p:Point;tx:number;tz:number;s:number}[]=[];
const rocks:{p:Point;s:number;wet:boolean;surface?:boolean}[]=[],shrubs:{p:Point;s:number}[]=[],reeds:Point[]=[];
for(const source of brooks){const points=samples(downstreamLine(source),1.2);for(let i=1;i<points.length-1;i++){const p=points[i];if(!inside(...p))continue;const prev=points[i-1],next=points[i+1],len=Math.hypot(next[0]-prev[0],next[1]-prev[1])||1,nx=-(next[1]-prev[1])/len,nz=(next[0]-prev[0])/len;
for(const side of [-1,1]){const d=streamWidth(...p)*.5+rand()*.9;rocks.push({p:[p[0]+nx*d*side,p[1]+nz*d*side],s:.18+rand()*.52,wet:true});if(rand()<.64){const off=d+1+rand()*1.6;shrubs.push({p:[p[0]+nx*off*side,p[1]+nz*off*side],s:.6+rand()*.9});}if(rand()<.65)for(let j=0;j<4;j++)reeds.push([p[0]+nx*(d+.5)*side+(rand()-.5),p[1]+nz*(d+.5)*side+(rand()-.5)]);}
if(rand()<.15){const off=(rand()-.5)*streamWidth(...p)*.55,q:Point=[p[0]+nx*off,p[1]+nz*off],s=.24+rand()*.48;rocks.push({p:q,s,wet:true,surface:true});wakes.push({p:q,tx:nz,tz:-nx,s});}
if(i%3===0){const off=(rand()-.5)*streamWidth(...p)*.7;rocks.push({p:[p[0]+nx*off,p[1]+nz*off],s:.16+rand()*.16,wet:true});}
}}
for(const points of roadSamples)for(let i=0;i<points.length;i+=2){const p=points[i];if(!inside(...p))continue;const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;const nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;const side=rand()<.5?-1:1;const d=2.2+rand()*.55;rocks.push({p:[p[0]+nx*d*side,p[1]+nz*d*side],s:.04+rand()*.11,wet:false});if(i%10===0){const off=4+rand()*2;const q:Point=[p[0]+nx*off*side,p[1]+nz*off*side];if(!homes.some(h=>Math.hypot(h.x-q[0],h.z-q[1])<Math.max(h.width,h.depth)*.65+2))shrubs.push({p:q,s:.6+rand()*.9});}}
// Small, uneven colonies connect the lane verge to the woodland floor.
for(const points of roadSamples)for(let i=6;i<points.length;i+=18){const p=points[i],a=points[i-1],b=points[Math.min(i+1,points.length-1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,side=i%2?1:-1;
 for(let j=0;j<3;j++){const off=3.4+j*.5,q:Point=[p[0]-(b[1]-a[1])/len*off*side+Math.sin(i+j)*.7,p[1]+(b[0]-a[0])/len*off*side+Math.cos(i+j)*.7];const road=nearestRoad(q);
 if(inside(...q)&&Math.hypot(q[0]-road[0],q[1]-road[1])>3.1&&!homes.some(h=>Math.hypot(h.x-q[0],h.z-q[1])<Math.max(h.width,h.depth)*.7+3))shrubs.push({p:q,s:.28+j*.13});
 }
}
// Patches follow damp ground and yard edges rather than a uniform scatter.
for(const h of homes)for(let j=0;j<5;j++){const a=rand()*Math.PI*2,d=Math.max(h.width,h.depth)*.6+1.3;const p:Point=[h.x+Math.cos(a)*d,h.z+Math.sin(a)*d];const r=nearestRoad(p);if(Math.hypot(p[0]-r[0],p[1]-r[1])>4)shrubs.push({p,s:.4+rand()*.65});}
// The forge has its own placed brambles; random shrubs must not block the entrance.
for(let i=shrubs.length-1;i>=0;i--)if(clearings.some(p=>Math.hypot(p[0]-shrubs[i].p[0],p[1]-shrubs[i].p[1])<1+shrubs[i].s*.8)||Math.hypot(shrubs[i].p[0]-chainshopPosition[0],shrubs[i].p[1]-chainshopPosition[1])<12)shrubs.splice(i,1);
for(let i=shrubs.length-1;i>=0;i--)if(siteIssue(shrubs[i].p,.6)||!industryClear(...shrubs[i].p,.6))shrubs.splice(i,1);
for(let i=rocks.length-1;i>=0;i--)if(siteIssue(rocks[i].p,.2))rocks.splice(i,1);
const d=new T.Object3D();
const rockMaterial=new T.MeshStandardMaterial({color:'#aaa398',roughness:.78});
rockMaterial.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 stonePoint;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstonePoint=position;');
 shader.fragmentShader='varying vec3 stonePoint;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float grit=mix(.5,fract(sin(dot(floor(stonePoint*95.),vec3(12.9898,78.233,31.17)))*43758.5453),1.-smoothstep(.3,1.2,length(fwidth(stonePoint*95.))));
 float vein=sin(stonePoint.x*23.+sin(stonePoint.z*17.)+stonePoint.y*11.);
 diffuseColor.rgb*=.75+grit*.4+vein*.055;
 diffuseColor.rgb*=mix(.57,1.,smoothstep(-.35,.55,stonePoint.y));`);
};
refineSurface(rockMaterial,'stone');
const rockMesh=new T.InstancedMesh(stoneGeo,rockMaterial,rocks.length);
rocks.forEach(({p,s,wet,surface},i)=>{d.position.set(p[0],surface?streamSurface(...p)-s*.16:ground(...p)+s*.33,p[1]);d.rotation.set(rand()*.3,rand()*6.28,rand()*.2);d.scale.set(s*1.3,s*.7,s);d.updateMatrix();rockMesh.setMatrixAt(i,d.matrix);rockMesh.setColorAt(i,new T.Color(wet?'#959188':'#a49879').multiplyScalar(.8+rand()*.35));});rockMesh.castShadow=rockMesh.receiveShadow=true;scene.add(rockMesh);
const wakeVerts:number[]=[],wakeUvs:number[]=[];
for(const {p,tx,tz,s} of wakes)for(const side of [-1,1])for(let j=0;j<12;j++){
 const vertex=(k:number,edge:number)=>{const t=k/12,along=.12+t*(1.7+s),cross=side*(s*.55+t*.6)+edge*.10;const x=p[0]+tx*along-tz*cross,z=p[1]+tz*along+tx*cross;wakeVerts.push(x,streamSurface(x,z)+.02,z);wakeUvs.push(edge,t);};
 vertex(j,-1);vertex(j+1,-1);vertex(j,1);vertex(j,1);vertex(j+1,-1);vertex(j+1,1);
}
const wakeGeo=new T.BufferGeometry();wakeGeo.setAttribute('position',new T.Float32BufferAttribute(wakeVerts,3));wakeGeo.setAttribute('uv',new T.Float32BufferAttribute(wakeUvs,2));
const wakeMat=new T.ShaderMaterial({uniforms:{time:waterTime},vertexShader:`varying vec2 wakeUv;void main(){wakeUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec2 wakeUv;void main(){float edge=1.-abs(wakeUv.x);float pulse=.3+.7*pow(.5+.5*sin(wakeUv.y*32.-time*6.),3.);float alpha=edge*(1.-wakeUv.y)*pulse*.34;gl_FragColor=vec4(.63,.66,.54,alpha); #include <tonemapping_fragment>
#include <colorspace_fragment>
}`,transparent:true,depthWrite:false,side:T.DoubleSide});
// Shader directives must start on their own line.
wakeMat.fragmentShader=wakeMat.fragmentShader.replace('; #include',';\n#include');
const wakeMesh=new T.Mesh(wakeGeo,wakeMat);wakeMesh.renderOrder=2;wakeMesh.layers.set(1);scene.add(wakeMesh);
const leaves:number[]=[],colors:number[]=[];for(let i=0;i<720;i++){const a=rand()*6.28,r=Math.sqrt(rand())*.72,y=.15+rand()*.95,x=Math.cos(a)*r,z=Math.sin(a)*r,s=.025+rand()*.045;leaves.push(x-s,y,z,x,y+.1,z+s*.5,x+s,y,z,x-s,y,z,x+s,y,z,x,y-.015,z-s*.5);const color=new T.Color().setHSL(.20+rand()*.045,.33,.12+rand()*.12);for(let j=0;j<6;j++)colors.push(color.r,color.g,color.b);}
const bushGeo=new T.BufferGeometry();bushGeo.setAttribute('position',new T.Float32BufferAttribute(leaves,3));bushGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));bushGeo.computeVertexNormals();const bushes=new T.InstancedMesh(bushGeo,new T.MeshStandardMaterial({color:'#a9b58b',vertexColors:true,side:T.DoubleSide,roughness:1}),shrubs.length);
shrubs.forEach(({p,s},i)=>{d.position.set(p[0],ground(...p),p[1]);d.rotation.set(0,rand()*6.28,0);d.scale.set(s,s,s);d.updateMatrix();bushes.setMatrixAt(i,d.matrix);});bushes.castShadow=bushes.receiveShadow=true;scene.add(bushes);
const reedGeo=new T.BufferGeometry();reedGeo.setAttribute('position',new T.Float32BufferAttribute([-.025,0,0,.10,1.1,.03,.025,0,0,0,0,-.025,-.04,.8,.17,0,0,.025],3));reedGeo.computeVertexNormals();const reedMesh=new T.InstancedMesh(reedGeo,new T.MeshStandardMaterial({color:'#8b9160',side:T.DoubleSide,roughness:1}),reeds.length);reeds.forEach((p,i)=>{d.position.set(p[0],ground(...p),p[1]);d.rotation.set(0,rand()*6.28,0);d.scale.setScalar(.65+rand()*.65);d.updateMatrix();reedMesh.setMatrixAt(i,d.matrix);});scene.add(reedMesh);
refineSurface(bushes.material,'leaf');refineSurface(reedMesh.material,'leaf');
return {update:(time:number)=>{waterTime.value=time;},reflect:(renderer:T.WebGLRenderer,camera:T.Camera,target:T.Vector3,force=false)=>water.reflect(renderer,camera,target,[...waterMeshes,wakeMesh],force),waterMeshes,counts:{rocks:rocks.length,shrubs:shrubs.length,reeds:reeds.length},waterMaterial:waterMat};
}
