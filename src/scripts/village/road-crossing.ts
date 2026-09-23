import * as T from 'three';
import {refineSurface} from '../rendering/surfaces';
import {outsideRoads,roundedLine,brooks,ground,streamSurface,type Point} from './layout';
// The historic road and our retained modern brook cross here. The crossing is
// an explicit visual interpretation, not a bridge identified on the OS sheet.
const cross=(a:Point,b:Point)=>a[0]*b[1]-a[1]*b[0];
function findCrossing(){
 const road=roundedLine(outsideRoads[1]);
 for(let i=1;i<road.length;i++)for(const brook of brooks)for(let j=1;j<brook.length;j++){
  const a=road[i-1],b=brook[j-1],r:Point=[road[i][0]-a[0],road[i][1]-a[1]],s:Point=[brook[j][0]-b[0],brook[j][1]-b[1]],den=cross(r,s);
  if(Math.abs(den)<1e-9)continue;
  const delta:Point=[b[0]-a[0],b[1]-a[1]],t=cross(delta,s)/den,u=cross(delta,r)/den;
  if(t<0||t>1||u<0||u>1)continue;
  const length=Math.hypot(...r),centre:Point=[a[0]+t*r[0],a[1]+t*r[1]],direction:Point=[r[0]/length,r[1]/length];
  const halfLength=20,halfWidth=3.1;
  const point=(along:number,across=0):Point=>[centre[0]+direction[0]*along-direction[1]*across,centre[1]+direction[1]*along+direction[0]*across];
  const start=ground(...point(-halfLength))+.04,end=ground(...point(halfLength))+.04;
  const height=(along:number)=>T.MathUtils.lerp(start,end,(along+halfLength)/(halfLength*2))+.10*Math.cos(along/halfLength*Math.PI/2);
  return {centre,direction,halfLength,halfWidth,point,height,water:streamSurface(...centre)};
 }
 throw new Error('Outside road crossing could not be located');
}
export const roadCrossing=findCrossing();
export function addRoadCrossing(scene:T.Scene,terrainTexture:T.Texture){
 const c=roadCrossing,root=new T.Group();root.name='Interpreted outside-road brook crossing';
 const stone=new T.MeshStandardMaterial({color:'#736954',roughness:1});refineSurface(stone,'stone');
 const roadMaterial=new T.MeshStandardMaterial({map:terrainTexture,color:'#c1c3ab',roughness:1});
 const verts:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let i=0;i<=80;i++){
  const u=-c.halfLength+i*.5;
  for(const side of [-1,1]){const p=c.point(u,side*c.halfWidth);verts.push(p[0],c.height(u),p[1]);uvs.push((p[0]+230)/460,1-(p[1]+320)/520);}
  if(i){const n=i*2;indices.push(n-2,n-1,n,n-1,n+1,n);}
 }
 const deckGeometry=new T.BufferGeometry();deckGeometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));deckGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));deckGeometry.setIndex(indices);deckGeometry.computeVertexNormals();
 const deck=new T.Mesh(deckGeometry,roadMaterial);deck.name='Continuous dirt and ruts across bridge';deck.receiveShadow=true;root.add(deck);
 const masonry:number[]=[];
 function quad(a:number[],b:number[],d:number[],e:number[]){masonry.push(...a,...b,...d,...a,...d,...e);}
 const vertex=(u:number,v:number,y:number)=>{const p=c.point(u,v);return [p[0],y,p[1]];};
 // A curved barrel leaves the stream open. Solid spandrels meet both banks.
 const underside=(u:number,v:number)=>Math.abs(u)<6?Math.min(c.height(u)-.55,c.water+.75+3.2*Math.sqrt(Math.max(0,1-(u/6)**2))):Math.min(ground(...c.point(u,v))-.1,c.height(u)-.4);
 for(let i=0;i<160;i++){
  const a=-20+i*.25,b=a+.25;
  for(const side of [-1,1]){
   const v=side*3.1,loA=underside(a,v),loB=underside(b,v);
   quad(vertex(a,v,loA),vertex(b,v,loB),vertex(b,v,c.height(b)),vertex(a,v,c.height(a)));
  }
  if(a>=-6&&b<=6)quad(vertex(a,-3.1,underside(a,0)),vertex(a,3.1,underside(a,0)),vertex(b,3.1,underside(b,0)),vertex(b,-3.1,underside(b,0)));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(masonry,3));g.computeVertexNormals();stone.side=T.DoubleSide;
 const shell=new T.Mesh(g,stone);shell.name='Stone arch and bank supports';shell.castShadow=shell.receiveShadow=true;root.add(shell);
 // Low, broken-tone stone courses and broad worn coping. Shared instances.
 const blocks:{u:number;v:number;y:number;w:number;h:number;d:number}[]=[];
 for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<32;i++){
  const u=-19.5+i*1.23+(row%2)*.2;
  blocks.push({u,v:side*2.92,y:c.height(u)+.13+row*.23,w:1.17,h:.22,d:.36});
 }
 for(const side of [-1,1])for(let i=0;i<27;i++){
  const u=-19.3+i*1.46;blocks.push({u,v:side*2.92,y:c.height(u)+.77,w:1.42,h:.15,d:.49});
 }
 // Small coursed face stones sit over the darker mortar shell. Omit any
 // block that would intrude into the arch; a separate ring follows the curve.
 for(const side of [-1,1])for(let row=0;row<27;row++)for(let i=0;i<44;i++){
  const u=-19.55+i*.9+(row%2)*.27,y=c.water-1+row*.31;
  const bottom=Math.max(underside(u-.43,side*3.1),underside(u+.43,side*3.1));
  const top=Math.min(c.height(u-.43),c.height(u+.43));
  if(y-.145<bottom+.03||y+.145>top-.03)continue;
  blocks.push({u,v:side*3.135,y,w:.865,h:.288,d:.09});
 }
 const archVertices:number[]=[];
 for(const side of [-1,1])for(let i=0;i<25;i++){
  const a=i/25*Math.PI+.008,b=(i+1)/25*Math.PI-.008;
  const ring=(t:number,outer:boolean)=>vertex(Math.cos(t)*(outer?6.43:6),side*3.19,c.water+.75+Math.sin(t)*(outer?3.61:3.2));
  const p=ring(a,false),q=ring(b,false),r=ring(b,true),s=ring(a,true);
  archVertices.push(...p,...q,...r,...p,...r,...s);
 }
 const archGeometry=new T.BufferGeometry();archGeometry.setAttribute('position',new T.Float32BufferAttribute(archVertices,3));archGeometry.computeVertexNormals();
 const archMaterial=new T.MeshStandardMaterial({color:'#8e826b',roughness:1,side:T.DoubleSide});refineSurface(archMaterial,'stone');
 const arch=new T.Mesh(archGeometry,archMaterial);arch.castShadow=arch.receiveShadow=true;root.add(arch);
 const stones=new T.InstancedMesh(new T.BoxGeometry(1,1,1),stone,blocks.length),dummy=new T.Object3D();
 blocks.forEach((b,i)=>{const p=c.point(b.u,b.v);dummy.position.set(p[0],b.y,p[1]);dummy.rotation.y=-Math.atan2(c.direction[1],c.direction[0]);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);stones.setColorAt(i,new T.Color('#bdb5a4').multiplyScalar(.82+(Math.sin(i*31.7)+1)*.09));});stones.castShadow=stones.receiveShadow=true;root.add(stones);
 scene.add(root);return root;
}
