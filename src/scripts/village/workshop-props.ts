import * as T from 'three';
import {refineSurface} from '../rendering/surfaces';
import {textureDetail} from './texture-detail';

export interface ShopPlacement {kind:string;x:number;z:number;radius:number;support:'floor'|'bench'|'wall'|'beam';}
/** Visit-derived shop contents. Metres in the unscaled shop, with separate domestic quantities. */
export function addWorkshopProps(root:T.Group,domestic=false){
 const group=new T.Group();group.name='Workshop_details';root.add(group);
 // Contents retain useful physical sizes in Henry's smaller building.
 group.scale.set(1/root.scale.x,1/root.scale.y,1/root.scale.z);
 const sx=root.scale.x,sz=root.scale.z,floor=.125*root.scale.y;
 let seed=domestic?4280:4261;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const placements:ShopPlacement[]=[];
 const mats={iron:new T.MeshStandardMaterial({name:'Workshop pitted iron',color:'#665c4d',metalness:.63,roughness:.82}),
  worn:new T.MeshStandardMaterial({name:'Workshop rubbed iron',color:'#74746a',metalness:.78,roughness:.47}),
  wood:new T.MeshStandardMaterial({name:'Workshop worn oak',color:'#594531',roughness:.94}),
  coal:new T.MeshStandardMaterial({name:'Workshop cold coal',color:'#292824',roughness:.97}),
  water:new T.MeshStandardMaterial({name:'Workshop quench water',color:'#343a30',metalness:.25,roughness:.23})};
 refineSurface(mats.iron,'iron');textureDetail(mats.iron,'cast-iron');
 const batches=new Map<string,{geometry:T.BufferGeometry;material:T.Material;matrices:T.Matrix4[];colors:T.Color[]}>();
 const box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,8),cone=new T.CylinderGeometry(.14,1,1,8);
 const matrix=new T.Matrix4(),q=new T.Quaternion();
 function add(key:string,g:T.BufferGeometry,material:T.Material,p:T.Vector3,scale=new T.Vector3(1,1,1),rotation=new T.Quaternion()){
  let b=batches.get(key);if(!b){b={geometry:g,material,matrices:[],colors:[]};batches.set(key,b);}
  b.matrices.push(matrix.compose(p,rotation,scale).clone());b.colors.push(new T.Color().setScalar(.79+rand()*.28));
 }
 function block(p:number[],size:number[],material:'wood'|'iron'|'worn'='wood',angle=0){add('boxes-'+material,box,mats[material],new T.Vector3(...p),new T.Vector3(...size),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle));}
 function rod(a:T.Vector3,b:T.Vector3,r:number,material:'iron'|'worn'|'wood'='iron',pointed=false){
  const d=b.clone().sub(a);q.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());
  add((pointed?'point-':'rod-')+material,pointed?cone:cylinder,mats[material],a.clone().add(b).multiplyScalar(.5),new T.Vector3(r,d.length(),r),q.clone());
 }
 function linkGeometry(length:number,width:number,tube:number,open=false){
  // Capsule-shaped forged links: straight sides, rounded shoulders, real hole.
  const points:T.Vector3[]=[],r=width/2,straight=(length-width)/2;
  const count=24;
  for(let k=0;k<=count;k++){
   const a=-Math.PI/2+k/count*Math.PI*2;
   if(open&&k>count-3)break;
   points.push(new T.Vector3(Math.cos(a)*r+(Math.cos(a)>=0?straight:-straight),Math.sin(a)*r,0));
  }
  return new T.TubeGeometry(new T.CatmullRomCurve3(points,!open,'centripetal'),32,tube,6,!open);
 }
 const sizes={small:{l:.075,w:.037,t:.007},medium:{l:.15,w:.078,t:.013},large:{l:.44,w:.23,t:.04}};
 const geometries=Object.fromEntries(Object.entries(sizes).map(([key,s])=>[key,linkGeometry(s.l,s.w,s.t)]));
 const counts={small:0,medium:0,large:0,blanks:0,tools:0,suspensionRings:0};
 const suspensionRing=new T.TorusGeometry(1,.09,8,36);
 function hangingRing(station:number){
  // IMG_4273: a heavy open iron ring hangs from a slender overhead rod.
  // Offset towards the horn, outside the hammer stroke and the chimney breast.
  const x=station*sx+.49,z=.80*sz,beamY=2.46*root.scale.y;
  const radius=domestic?.10:.12,y=domestic?1.43:1.75;
  placements.push({kind:'chain suspension ring',x,z,radius,support:'beam'});
  block([x,beamY,0],[.12,.14,4.08*sz]);
  // A saddle wraps the timber so the support remains legible in roof cutaways.
  for(const side of [-1,1])block([x+side*.066,beamY,z],[.018,.17,.058],'iron');
  block([x,beamY+.079,z],[.15,.018,.058],'iron');
  block([x,beamY-.079,z],[.15,.018,.058],'iron');
  rod(new T.Vector3(x,beamY-.083,z),new T.Vector3(x,y+radius+.016,z),.009);
  // The small lower eye passes around the top of the larger ring.
  add('suspension-rings',suspensionRing,mats.iron,new T.Vector3(x,y+radius+.008,z),new T.Vector3(.025,.035,.025),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));
  add('suspension-rings',suspensionRing,mats.iron,new T.Vector3(x,y,z),new T.Vector3(radius,radius*1.07,radius));
  counts.suspensionRings++;
 }
 function placeLink(kind:keyof typeof sizes,px:number,pz:number,angle:number,i:number,lift=0){
  const s=sizes[kind],tilt=i%2?1.08:-.12,forward=new T.Vector3(Math.cos(angle),0,Math.sin(angle));
  const across=new T.Vector3(-Math.sin(angle),0,Math.cos(angle)).applyAxisAngle(forward,tilt);
  const normal=new T.Vector3().crossVectors(forward,across);
  const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(forward,across,normal));
  const y=floor+s.t+s.w/2*Math.abs(Math.sin(tilt))+lift;
  add('chain-'+kind,geometries[kind],mats.iron,new T.Vector3(px,y,pz),undefined,rotation);counts[kind]++;
  if(kind==='large'&&i%3===0){const d=across.clone().multiplyScalar(s.w*.39);rod(new T.Vector3(px,y,pz).sub(d),new T.Vector3(px,y,pz).add(d),s.t*.65);}
 }
 function pile(kind:keyof typeof sizes,x:number,z:number,n:number,radius:number){
  placements.push({kind:kind+' chain heap',x,z,radius,support:'floor'});
  const s=sizes[kind],phase=rand()*Math.PI*2,step=s.l*.70;
  // Resample a lopsided coil by arc length, so adjoining links remain interlocked.
  // Later turns lie on the earlier chain, rather than forming three tidy rows.
  const points:T.Vector3[]=[];let travelled=0,previous:T.Vector3|undefined,next=0;
  for(let a=0;points.length<n&&a<60;a+=.012){
   const r=radius*(.62+.07*Math.sin(a*1.3+phase)),lift=Math.max(0,a-Math.PI*2)/(Math.PI*2)*s.t*2;
   const p=new T.Vector3(x+Math.cos(a+phase)*r,lift,z+Math.sin(a+phase)*r*.66);
   if(previous)travelled+=p.distanceTo(previous);
   if(travelled>=next){points.push(p);next+=step;}
   previous=p;
  }
  points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];placeLink(kind,p.x,p.z,Math.atan2(b.z-a.z,b.x-a.x),i,p.y);});
 }
 function stock(x:number,z:number,length:number,n:number){
  placements.push({kind:'cut iron and unfinished blanks',x,z,radius:length*.57,support:'floor'});
  for(const side of [-1,1])block([x+side*length*.32,floor+.025,z],[.065,.05,.38]);
  for(let i=0;i<n;i++){
   const zz=z+(i%7-3)*.041,yy=floor+.063+Math.floor(i/7)*.027,dx=(rand()-.5)*.09;
   rod(new T.Vector3(x-length/2+dx,yy,zz),new T.Vector3(x+length/2+dx,yy,zz+(rand()-.5)*.03),.011);counts.blanks++;
  }
 }
 const openLink=linkGeometry(.12,.065,.011,true);
 function benchTools(x:number,y:number,z:number){
  placements.push({kind:'forming tools and open links',x,z,radius:.26,support:'bench'});
  // All objects sit on the timber top; the centre working anvil remains clear.
  for(let i=0;i<4;i++){rod(new T.Vector3(x-.08+i*.043,y+.012,z-.13),new T.Vector3(x-.08+i*.043,y+.012,z+.1),.010);counts.blanks++;}
  for(let i=0;i<2;i++)add('open-links',openLink,mats.iron,new T.Vector3(x+.03,y+.012,z+.17+i*.07),undefined,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
  rod(new T.Vector3(x-.15,y,z+.02),new T.Vector3(x-.15,y+.10,z+.02),.027,'worn',true);counts.tools++;
 }
 function toolRail(x:number,z:number){
  placements.push({kind:'wall tool rack',x,z,radius:.43,support:'wall'});
  block([x,1.13,z],[.86,.07,.065]);
  for(let i=0;i<5;i++){
   const xx=x-.33+i*.165;rod(new T.Vector3(xx,1.14,z),new T.Vector3(xx,1.14,z+.13),.009);
   const bottom=.38+rand()*.14;
   rod(new T.Vector3(xx,1.1,z+.13),new T.Vector3(xx-.02,bottom,z+.10),.012);
   if(i%2===0){rod(new T.Vector3(xx+.04,1.1,z+.13),new T.Vector3(xx+.02,bottom,z+.10),.011);rod(new T.Vector3(xx-.02,bottom,z+.1),new T.Vector3(xx+.005,bottom-.03,z+.14),.010);}
   else rod(new T.Vector3(xx-.02,bottom,z+.1),new T.Vector3(xx-.12,bottom+.025,z+.1),.014);
   counts.tools++;
  }
 }
 function legVice(x:number,z:number){
  placements.push({kind:'post vice and hand screw',x,z,radius:.20,support:'bench'});
  block([x,.58,z],[.14,.90,.14]);
  block([x,1.10,z],[.16,.22,.11],'iron');block([x,1.24,z-.035],[.24,.09,.09],'worn');
  block([x,1.24,z+.09],[.24,.09,.075],'iron');
  rod(new T.Vector3(x,1.12,z-.09),new T.Vector3(x,1.12,z+.25),.027,'worn');
  rod(new T.Vector3(x-.23,1.12,z+.24),new T.Vector3(x+.23,1.12,z+.24),.012);
  rod(new T.Vector3(x,.21,z-.1),new T.Vector3(x,1.15,z+.09),.03);
  block([x,floor+.035,z-.075],[.25,.07,.29],'iron');counts.tools++;
 }
 function fuelBed(x:number){
  const coalGeo=new T.IcosahedronGeometry(1,0),sy=root.scale.y;
  for(let i=0;i<54;i++){
   const px=(x-.43+(rand()-.5)*.96)*sx,pz=(1.60+(rand()-.5)*.49)*sz;
   add('fuel-coal',coalGeo,mats.coal,new T.Vector3(px,(.956+rand()*.006)*sy,pz),new T.Vector3((.04+rand()*.05)*sx,.015*sy,(.035+rand()*.045)*sz),new T.Quaternion().setFromEuler(new T.Euler(0,rand()*6.28,0)));
  }
 }
 function quench(x:number,z:number,r=.25){
  placements.push({kind:'quench vessel',x,z,radius:r+.055,support:'floor'});
  const h=r*1.5,profile=[new T.Vector2(0,0),new T.Vector2(r*.70,0),new T.Vector2(r,.035),new T.Vector2(r,h),new T.Vector2(r-.018,h),new T.Vector2(r-.025,.05),new T.Vector2(0,.05)];
  add('quench-'+r,new T.LatheGeometry(profile,20),mats.iron,new T.Vector3(x,floor,z));
  add('quench-water-'+r,new T.CylinderGeometry(r-.027,r-.027,.007,24),mats.water,new T.Vector3(x,floor+h*.7,z));
  const handle=new T.TorusGeometry(r*.75,.011,5,20,Math.PI);
  add('quench-handle-'+r,handle,mats.worn,new T.Vector3(x,floor+h,z),undefined,new T.Quaternion());
 }
 if(!domestic){
  for(const x of [-3,0,3])fuelBed(x);
  pile('large',-3.72,-1.25,9,.58);pile('large',2.28,-1.25,9,.58);
  pile('medium',-1.6,-1.62,24,.48);pile('medium',1.04,-1.62,24,.48);
  pile('small',-2.25,.70,42,.24);pile('small',.93,1.38,42,.24);pile('medium',3.95,1.02,15,.30);
  legVice(-2.63,1.00);legVice(3.37,1.00);
  stock(-.55,-1.65,1.08,18);stock(3.2,-1.6,.70,12);
  toolRail(-2.35,-1.89);toolRail(1.25,-1.89);
  quench(-1.25,.95,.24);quench(1.60,1.35,.20);
  for(const station of [-3,0,3])benchTools(station-.30,.792,.40);
 }else{
  fuelBed(0);
  pile('medium',-1.79,-.98,12,.27);pile('small',.62,-1.10,30,.20);
  pile('small',.83,.70,24,.20);stock(-.85,-1.12,.62,10);
  toolRail(.70,-1.30);quench(-.62,.86,.17);
  benchTools(-.30,.757,.31);legVice(.35,.76);
 }
 // Append these after existing props to preserve their seeded variation.
 for(const station of domestic?[0]:[-3,0,3])hangingRing(station);
 for(const [key,b]of batches){
  const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);mesh.name='Workshop_'+key;
  b.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,b.colors[i]);});
  mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
 }
 group.userData.visitReference='IMG_4261–4280';group.userData.counts=counts;
 return {group,placements,counts,draws:batches.size,physicalBounds:{width:9*sx,depth:4.2*sz}};
}
