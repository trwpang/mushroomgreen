import {siteIssue} from './site-reservations';
import {industryClear} from './historic-plan';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ground,localPoint,nearestRoad,nearestSegment,streamDistance,weaverWorkshop,chainshopPosition,chainshopReplacesHouse,type Home,type Point} from './layout';

export type AnimalPlacement={kind:'hen'|'cat';home:number;p:Point;angle:number;seed:number};
const dimensions=(h:Home)=>({w:[6.4,7.2,9.2][h.style]*h.sx,d:[4.6,4.8,4.5][h.style]*h.sz});
function local(p:Point,centre:Point,angle:number):Point {const x=p[0]-centre[0],z=p[1]-centre[1];return [x*Math.cos(angle)-z*Math.sin(angle),x*Math.sin(angle)+z*Math.cos(angle)];}
function inBox(p:Point,c:Point,a:number,w:number,d:number,margin:number){const q=local(p,c,a);return Math.abs(q[0])<w/2+margin&&Math.abs(q[1])<d/2+margin;}
/** Keep the full animal envelope clear; motion changes pose, never these footprints. */
export function lifePlacementIssue(p:Point,homes:Home[],paths:Point[][]=[]):string|null {
 if(siteIssue(p,.3)||!industryClear(...p,.5))return 'working yard';
 const r=nearestRoad(p);if(Math.hypot(p[0]-r[0],p[1]-r[1])<3.6)return 'lane';
 if(streamDistance(...p)<5)return 'brook';
 for(const path of paths)for(let i=1;i<path.length;i++){const q=nearestSegment(p,path[i-1],path[i]);if(Math.hypot(p[0]-q[0],p[1]-q[1])<1.35)return 'footpath';}
 if(inBox(p,chainshopPosition,1.03,12,10,1.3))return 'main forge';
 for(const h of homes){if(h.number===chainshopReplacesHouse)continue;const {w,d}=dimensions(h),q=local(p,[h.x,h.z],h.angle);
  if(inBox(p,[h.x,h.z],h.angle,w,d,1.05))return 'cottage';
  const bx=h.number===22?2.7:-w*.27,bz=-d/2-(h.number===22?1.05:2.9);
  if(Math.abs(q[0]-bx)<1.4&&Math.abs(q[1]-bz)<1.1)return 'coal bin';
  if(Math.abs(Math.abs(q[0])-(w/2+1.4))<.7&&q[1]>-d/2-.7&&q[1]<-d/2+5.2)return 'yard fence';
  if(h.number===22){
   if(q[0]>-5.5&&q[0]<-.95&&q[1]>-11.7&&q[1]<-7.5)return 'vegetable beds';
   if(Math.abs(q[0]-4.8)<1.35&&Math.abs(q[1]+6.5)<1.4)return 'privy';
   if(q[0]>-5.5&&q[0]<2.2&&Math.abs(q[1]+6.6)<.8)return 'washing line';
   const shop=weaverWorkshop(h);if(inBox(p,shop.p,shop.angle,shop.width,shop.depth,1.05))return 'small forge';
  }
 }
 // A bird should not balance on the edge of a cut bank.
 const y=ground(...p);for(const [x,z] of [[.45,0],[-.45,0],[0,.45],[0,-.45]])if(Math.abs(ground(p[0]+x,p[1]+z)-y)>.16)return 'steep ground';
 return null;
}
export function planVillageLife(homes:Home[],paths:Point[][]=[]):AnimalPlacement[]{
 const out:AnimalPlacement[]=[];
 const order=[22,10,40,31,46,15,53,24,8,57];let flocks=0;
 for(const id of order){const h=homes.find(h=>h.number===id);if(!h||flocks===3)continue;const {w,d}=dimensions(h);let group:AnimalPlacement[]=[];
  for(const side of [1,-1]){if(group.length)break;for(const back of [4.5,6,7.5]){
   const candidates=[[w*.18*side,-d/2-back],[w*.18*side+.85,-d/2-back-.5],[w*.18*side-.6,-d/2-back-.8]].map((p,i)=>({kind:'hen' as const,home:id,p:localPoint(h,p[0],p[1]),angle:h.angle+i*2.3,seed:id*29+i*71}));
   if(candidates.every(a=>!lifePlacementIssue(a.p,homes,paths)&&out.every(b=>Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])>1))){group=candidates;break;}
  }}
  if(group.length){out.push(...group);flocks++;}
 }
 const h=homes.find(h=>h.number===22)!;const shop=weaverWorkshop(h);
 // Quiet long-wall corner of Henry's chainshop; never the working gable entrance.
 for(const offset of [[0,shop.depth/2+1.45],[1.2,shop.depth/2+1.45],[2.3,shop.depth/2+1.65],[0,-shop.depth/2-1.45],[-1,-shop.depth/2-1.65]] as Point[]){const p:Point=[shop.p[0]+Math.cos(shop.angle)*offset[0]+Math.sin(shop.angle)*offset[1],shop.p[1]-Math.sin(shop.angle)*offset[0]+Math.cos(shop.angle)*offset[1]];
  if(!lifePlacementIssue(p,homes,paths)&&out.every(a=>Math.hypot(p[0]-a.p[0],p[1]-a.p[1])>1)){out.push({kind:'cat',home:22,p,angle:shop.angle+.8,seed:1865});break;}}
 return out;
}

// Each articulated part uses one vertex-colour draw call, including toes and feather tips.
const animalSurface=new T.MeshStandardMaterial({vertexColors:true,roughness:.91});
function partBuilder(root:T.Group){
 const buckets=new Map<T.Material,T.BufferGeometry[]>();
 const put=(g:T.BufferGeometry,m:T.Material,p:[number,number,number],scale:[number,number,number]=[1,1,1],rotation:[number,number,number]=[0,0,0])=>{
  const matrix=new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));g.applyMatrix4(matrix);g.deleteAttribute('uv');const list=buckets.get(m)||[];list.push(g.index?g.toNonIndexed():g);buckets.set(m,list);
 };
 const oval=(m:T.Material,p:[number,number,number],scale:[number,number,number],rotation:[number,number,number]=[0,0,0])=>put(new T.SphereGeometry(1,12,8),m,p,scale,rotation);
 const rod=(m:T.Material,a:[number,number,number],b:[number,number,number],r:number,r2=r)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),v=to.clone().sub(from),g=new T.CylinderGeometry(r2,r,v.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()));g.translate(...from.add(to).multiplyScalar(.5).toArray());put(g,m,[0,0,0]);};
 const finish=()=>{const all:T.BufferGeometry[]=[];for(const [m,parts]of buckets){const colour=(m as T.MeshStandardMaterial).color;for(const g of parts){const values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=colour.r;values[i+1]=colour.g;values[i+2]=colour.b;}g.setAttribute('color',new T.BufferAttribute(values,3));all.push(g);}}const geometry=mergeGeometries(all);const mesh=new T.Mesh(geometry,animalSurface);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);all.forEach(g=>g.dispose());};
 return {put,oval,rod,finish};
}
function material(color:string,roughness=.9){return new T.MeshStandardMaterial({color,roughness});}

export function addVillageLife(scene:T.Scene,homes:Home[],paths:Point[][]=[]){
 const placements=planVillageLife(homes,paths),root=new T.Group();root.name='Village yard animals';scene.add(root);
 const feathers=[material('#795039'),material('#b7996d'),material('#46413a')],dark=material('#302e29'),ochre=material('#a9874f'),comb=material('#884331'),eye=material('#171814',.4),cream=material('#b7a88b');
 const animations:{root:T.Group;neck?:T.Group;tail:T.Group;body:T.Group;seed:number;angle:number;kind:'hen'|'cat'}[]=[];
 for(const a of placements){const animal=new T.Group();animal.name=`${a.kind} at household ${a.home}`;animal.position.set(a.p[0],ground(...a.p)+.025,a.p[1]);animal.rotation.y=a.angle;root.add(animal);
  const body=new T.Group(),tail=new T.Group();animal.add(body,tail);
  if(a.kind==='hen'){
   const feather=feathers[a.seed%3],b=partBuilder(body);
   b.oval(feather,[0,.285,0],[.14,.18,.23],[-.18,0,0]);
   // Layered wing coverts lie against an oval breast; tapered feathers give a readable bird outline.
   for(const side of [-1,1]){
    b.oval(dark,[side*.114,.3,-.015],[.05,.115,.17],[.12,side*.13,side*.16]);
    for(let i=0;i<6;i++)b.oval(feather,[side*(.135+i*.002),.32-i*.012,.055-i*.034],[.018,.055,.078],[.35,side*.18,side*.1]);
    b.rod(ochre,[side*.075,.17,.015],[side*.07,.055,.028],.012,.014);
    for(let toe=0;toe<3;toe++)b.rod(ochre,[side*.07,.038,.03],[side*.07+(toe-1)*.045,.022,.115-Math.abs(toe-1)*.025],.007,.002);
    b.rod(ochre,[side*.07,.038,.03],[side*.07,.022,-.022],.005,.002);
   }b.finish();
   tail.position.set(0,.32,-.16);const t=partBuilder(tail);
   for(let i=0;i<5;i++)t.oval(i%2?feather:dark,[(i-2)*.022,.055,-.052],[.025,.12,.045],[-.72,(i-2)*.19,0]);t.finish();
   const neck=new T.Group();neck.position.set(0,.35,.13);animal.add(neck);const n=partBuilder(neck);
   n.oval(feather,[0,.075,.014],[.069,.125,.071],[-.25,0,0]);
   n.oval(feather,[0,.19,.047],[.067,.074,.073]);
   n.rod(ochre,[0,.18,.105],[0,.166,.169],.028,.002);
   for(const side of [-1,1]){n.oval(eye,[side*.058,.205,.071],[.009,.011,.009]);n.oval(comb,[side*.015,.143,.093],[.014,.031,.012]);}
   for(let i=0;i<4;i++)n.oval(comb,[0,.257+Math.sin(i*.9)*.008,.015+i*.025],[.013,.022+i%2*.009,.019]);n.finish();
   animations.push({root:animal,neck,tail,body,seed:a.seed,angle:a.angle,kind:a.kind});
  }else{
   const fur=material('#666157'),stripe=material('#373a34'),b=partBuilder(body);
   // A crouched, resting tabby: folded hocks, narrow forelegs, muzzle, triangular ears and curved tail.
   b.oval(fur,[0,.17,-.025],[.15,.17,.285],[.12,0,0]);
   for(const side of [-1,1]){
    b.oval(fur,[side*.115,.1,-.13],[.08,.10,.12]);b.oval(cream,[side*.069,.047,.215],[.052,.04,.092]);
    b.oval(fur,[side*.075,.108,.15],[.044,.086,.075],[.15,0,0]);
    for(let i=0;i<4;i++)b.oval(stripe,[side*.139,.19+i*.014,-.16+i*.075],[.012,.055,.018],[0,0,side*.15]);
   }
   b.oval(fur,[0,.235,.23],[.107,.092,.092],[.1,0,0]);
   for(const side of [-1,1]){
    const g=new T.ConeGeometry(.047,.095,3);b.put(g,fur,[side*.072,.325,.21],[1,1,.65],[0,side*.3,-side*.18]);
    b.oval(cream,[side*.028,.216,.31],[.037,.025,.027]);
    b.rod(dark,[side*.026,.252,.308],[side*.076,.247,.29],.006,.004);
    for(let i=0;i<3;i++)b.rod(cream,[side*.035,.221,.327],[side*.13,.207+i*.013,.32-i*.012],.0017,.0008);
   }
   b.oval(dark,[0,.226,.337],[.014,.009,.01]);b.finish();
   const t=partBuilder(tail);const points=[new T.Vector3(-.09,.095,-.24),new T.Vector3(-.22,.055,-.24),new T.Vector3(-.235,.045,-.03),new T.Vector3(-.19,.045,.15),new T.Vector3(-.10,.047,.19)];
   t.put(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.028,6,false),fur,[0,0,0]);
   t.oval(stripe,[-.10,.047,.19],[.03,.028,.034]);t.finish();animations.push({root:animal,tail,body,seed:a.seed,angle:a.angle,kind:a.kind});
  }
 }
 const stats={hens:placements.filter(p=>p.kind==='hen').length,cats:placements.filter(p=>p.kind==='cat').length,henYards:new Set(placements.filter(p=>p.kind==='hen').map(p=>p.home)).size};
 const update=(time:number)=>{for(const a of animations){const t=time+a.seed*.173;if(a.kind==='hen'){
   // A still pose remains deterministic. No private clock or frame-dependent drift.
   const cycle=((t*.38)%1+1)%1,peck=cycle>.48&&cycle<.86?Math.sin((cycle-.48)/.38*Math.PI)**2:0;
   a.neck!.rotation.x=peck*1.82;a.neck!.position.y=.35-peck*.13;a.body.rotation.x=peck*.08;a.tail.rotation.x=.035*Math.sin(t*1.7);a.root.rotation.y=a.angle+Math.sin(t*.27)*.08;
  }else{a.body.scale.y=1+Math.sin(t*.85)*.008;a.tail.rotation.y=Math.sin(t*.24)*.035;}}};
 update(0);return {update,stats,placements,root};
}
