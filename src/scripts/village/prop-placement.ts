import {siteIssue} from './site-reservations';
import {industryClear} from './historic-plan';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPropKit,type PropKind} from './working-props';
import {planVillageLife} from './village-life';
import {ground,localPoint,nearestRoad,nearestSegment,streamDistance,chainshopPosition,weaverWorkshop,type Home,type Point} from './layout';
export type PropPlacement={kind:PropKind;p:Point;angle:number;home:number;group:string;tilt?:number;lift?:number;support?:string;wallSide?:-1|1;station?:string};
const dims=(h:Home)=>({w:[6.4,7.2,9.2][h.style]*h.sx,d:[4.6,4.8,4.5][h.style]*h.sz});
const local=(p:Point,c:Point,a:number):Point=>{const x=p[0]-c[0],z=p[1]-c[1];return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];};
// Trees bucketed in 2m cells (cached per array); same test as trees.some(within .65m).
const treeCells=new WeakMap<Point[],{count:number;cells:Map<number,Point[]>}>();
function nearTree(p:Point,trees:Point[]){
 let index=treeCells.get(trees);
 if(!index||index.count!==trees.length){const cells=new Map<number,Point[]>();for(const t of trees){const key=Math.floor(t[0]/2)*65536+Math.floor(t[1]/2),list=cells.get(key);if(list)list.push(t);else cells.set(key,[t]);}index={count:trees.length,cells};treeCells.set(trees,index);}
 const cx=Math.floor(p[0]/2),cz=Math.floor(p[1]/2);
 for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const t of index.cells.get(x*65536+z)||[])if(Math.hypot(p[0]-t[0],p[1]-t[1])<.65)return true;
 return false;
}
export function propGroundIssue(p:Point,homes:Home[],paths:Point[][],trees:Point[]=[],wall?:{home:number;side:-1|1}):string|null{
 if(siteIssue(p,.3)||!industryClear(...p,.5))return 'working yard';
 const r=nearestRoad(p);if(Math.hypot(p[0]-r[0],p[1]-r[1])<2.5)return 'lane';
 if(streamDistance(...p)<3.1)return 'brook';
 for(const path of paths)for(let i=1;i<path.length;i++){const q=nearestSegment(p,path[i-1],path[i]);if(Math.hypot(p[0]-q[0],p[1]-q[1])<.75)return 'path';}
 if(nearTree(p,trees))return 'tree';
 const f=local(p,chainshopPosition,1.03);if(Math.abs(f[0])<4.7&&Math.abs(f[1])<2.65)return 'forge wall';
 if(f[0]>4.45&&f[0]<8&&Math.abs(f[1])<1.6)return 'forge entrance';
 if(f[0]>-2.05&&f[0]<.65&&f[1]>3.8&&f[1]<9.1)return 'cart';
 for(const h of homes){if(h.number===5)continue;const {w,d}=dims(h),q=local(p,[h.x,h.z],h.angle);
  // The padded, tilted box extends beyond the mesh. Only its own support wall gets this tolerance.
  const touchesSupport=wall?.home===h.number&&wall.side*q[0]>=w/2+.1375*h.sx-.30;
  if(!touchesSupport&&Math.abs(q[0])<w/2+.14&&Math.abs(q[1])<d/2+.14)return 'house';
  if(Math.abs(q[0])<w/2+.12&&q[1]<-d/2&&q[1]>-d/2-1.9)return 'rear stores';
  if(Math.abs(Math.abs(q[0])-(w/2+1.4))<.15&&q[1]>-d/2-.2&&q[1]<-d/2+4.7)return 'fence';
  if(Math.hypot((q[0]+w/2+.65*h.sx)/h.sx,(q[1]+.8*h.sz)/h.sz)<.40)return 'authored rain barrel';
  const bx=h.number===22?2.7:-w*.27,bz=-d/2-(h.number===22?1.05:2.9);if(Math.abs(q[0]-bx)<.86&&Math.abs(q[1]-bz)<.65)return 'coal bunker';
  if(h.number===22){if(q[0]>-4.9&&q[0]<-1.8&&q[1]>-11.1&&q[1]<-7.9)return 'vegetable bed';if(Math.abs(q[0]-4.8)<.8&&Math.abs(q[1]+6.5)<.9)return 'privy';if(q[0]>-5&&q[0]<1.7&&Math.abs(q[1]+6.6)<.3)return 'laundry';const s=weaverWorkshop(h),l=local(p,s.p,s.angle);if(Math.abs(l[0])<s.width/2+.2&&Math.abs(l[1])<s.depth/2+.2)return 'small forge';}
 }
 return null;
}
export function planWorkingProps(homes:Home[],models:Record<PropKind,T.Group>,paths:Point[][]=[],trees:Point[]=[]){
 const out:PropPlacement[]=[];
 const bounds=Object.fromEntries(Object.entries(models).map(([k,m])=>[k,new T.Box3().setFromObject(m)])) as Record<PropKind,T.Box3>;
 const animals=planVillageLife(homes,paths);
 const tiltedBounds=(a:PropPlacement)=>bounds[a.kind].clone().applyMatrix4(new T.Matrix4().makeRotationX(a.tilt??0));
 const rectangle=(a:PropPlacement)=>{const b=tiltedBounds(a);return [[b.min.x-.025,b.min.z-.025],[b.max.x+.025,b.min.z-.025],[b.max.x+.025,b.max.z+.025],[b.min.x-.025,b.max.z+.025]].map(([x,z])=>[a.p[0]+x*Math.cos(a.angle)+z*Math.sin(a.angle),a.p[1]-x*Math.sin(a.angle)+z*Math.cos(a.angle)] as Point);};
 const overlaps=(a:Point[],b:Point[])=>{for(const r of [a,b])for(let i=0;i<2;i++){const axis:Point=[r[i+1][1]-r[i][1],r[i][0]-r[i+1][0]],pa=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),pb=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);if(Math.max(...pa)<Math.min(...pb)||Math.max(...pb)<Math.min(...pa))return false;}return true;};
 const samples=(a:PropPlacement)=>{const b=tiltedBounds(a),v:Point[]=[];const nx=Math.ceil((b.max.x-b.min.x+.06)/.14),nz=Math.ceil((b.max.z-b.min.z+.06)/.14);for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=b.min.x-.03+i*(b.max.x-b.min.x+.06)/nx,z=b.min.z-.03+j*(b.max.z-b.min.z+.06)/nz;v.push([a.p[0]+x*Math.cos(a.angle)+z*Math.sin(a.angle),a.p[1]-x*Math.sin(a.angle)+z*Math.cos(a.angle)] as Point);}return v;};
 const accept=(a:PropPlacement)=>{
  const footprint=rectangle(a),points=samples(a);
  const issue=points.map(p=>propGroundIssue(p,homes,paths,trees,a.wallSide?{home:a.home,side:a.wallSide}:undefined)).find(Boolean);if(issue){return false;}
  if(animals.some(an=>points.some(p=>Math.hypot(p[0]-an.p[0],p[1]-an.p[1])<.46))){return false;}
  if(out.some(b=>!(a.group===b.group&&[a.kind,b.kind].includes('washboard')&&[a.kind,b.kind].includes('tub'))&&overlaps(footprint,rectangle(b)))){return false;}
  const ys=points.map(p=>ground(...p));if(Math.max(...ys)-Math.min(...ys)>.16)return false;
  out.push(a);return true;
 };
 type Part={kind:PropKind;x:number;z:number;turn?:number;tilt?:number;lift?:number};
 type Station='fuel'|'washing'|'storage'|'garden'|'water'|'delivery'|'repair'|'feeding'|'coal'|'workshop';
 const recipes:Record<string,Part[]>={
  fuel:[{kind:'woodpile',x:-.72,z:0},{kind:'block',x:.68,z:.08}],
  washing:[{kind:'tub',x:0,z:0},{kind:'washboard',x:0,z:-.18,tilt:-.55,lift:.07},{kind:'basket',x:-.91,z:0},{kind:'bucket',x:.82,z:.03}],
  storage:[{kind:'sacks',x:-.38,z:0},{kind:'basket',x:.57,z:.02}],
  garden:[{kind:'tools',x:0,z:0}],
  water:[{kind:'barrel',x:-.22,z:0},{kind:'bucket',x:.47,z:.14}],
  delivery:[{kind:'handcart',x:-.52,z:0,turn:Math.PI/2},{kind:'churn',x:1.60,z:.1}],
  repair:[{kind:'trestles',x:0,z:0},{kind:'woodpile',x:0,z:1.22}],
 };
 const make=(h:Home,station:Station,part:Part,p:Point,angle:number,wallSide?:-1|1):PropPlacement=>({kind:part.kind,p:[p[0]+part.x*Math.cos(angle)+part.z*Math.sin(angle),p[1]-part.x*Math.sin(angle)+part.z*Math.cos(angle)],angle:angle+(part.turn??0),tilt:part.tilt,lift:part.lift,home:h.number,group:station+'-'+h.number,station,wallSide,support:wallSide?'wall':undefined});
 // A station is atomic: a failed component cannot leave an axe, basket or sack stranded.
 const attempt=(members:PropPlacement[])=>{const count=out.length;for(const a of members)if(!accept(a)){out.length=count;return false;}return true;};
 const wallStation=(h:Home,station:Station,parts:Part[])=>{
  const {w,d}=dims(h);let back=Infinity;
  for(const p of parts){const b=bounds[p.kind].clone().applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(p.tilt??0,p.turn??0,0,'YXZ')));back=Math.min(back,p.z+b.min.z);}
  for(const side of [-1,1] as const)for(const along of [0,.20,-.20]){
   const angle=h.angle+side*Math.PI/2,p=localPoint(h,side*(w/2+.1375*h.sx-back+.035),d*along);
   if(attempt(parts.map(part=>make(h,station,part,p,angle,side))))return true;
  }return false;
 };
 const rearStation=(h:Home,station:Station,parts:Part[])=>{
  const {w,d}=dims(h);
  // Limit working groups to the domestic yard, just behind the rear stores.
  for(const rear of [3.8,4.8])for(const x of [-w*.25,w*.25,0])if(attempt(parts.map(part=>make(h,station,part,localPoint(h,x,-d/2-rear),h.angle))))return true;
  return false;
 };
 const henry=homes.find(h=>h.number===22)!;
 const washPoint=localPoint(henry,-.4,-7.85);
 if(attempt(recipes.washing.slice(0,2).map(p=>make(henry,'washing',p,washPoint,henry.angle)))){
  for(const kind of ['basket','bucket'] as PropKind[])for(const [x,z] of [[.85,0],[-.91,0],[0,-1.05],[.7,-.7],[-.7,-.7]])if(accept(make(henry,'washing',{kind,x,z},washPoint,henry.angle)))break;
 }
 // Large equipment has only a few shared working sites.
 for(const id of [53,6])rearStation(homes.find(h=>h.number===id)!,'repair',recipes.repair);
 for(const id of [40,31])rearStation(homes.find(h=>h.number===id)!,'delivery',recipes.delivery);
 const forgePoint=(x:number,z:number):Point=>[chainshopPosition[0]+x*Math.cos(1.03)+z*Math.sin(1.03),chainshopPosition[1]-x*Math.sin(1.03)+z*Math.cos(1.03)];
 accept({kind:'grindstone',p:forgePoint(1.65,3.65),angle:1.03,home:5,group:'workshop-5',station:'workshop'});
 for(const h of homes.filter(h=>h.number!==5)){
  // Different homes have different work areas. Smaller groups use clear wall sections.
  const station:Station=(['fuel','washing','storage','garden','fuel','storage'] as Station[])[h.number%6];
  if(!out.some(a=>a.home===h.number&&a.station===station))(station==='washing'?rearStation:wallStation)(h,station,recipes[station]);
  if(h.number%3===0)wallStation(h,'garden',recipes.garden);
  if(h.number%4===0){const {w,d}=dims(h),bx=h.number===22?2.7:-w*.27,bz=-d/2-(h.number===22?1.05:2.9);for(const side of [-1,1])if(accept({...make(h,'coal',{kind:'scuttle',x:0,z:0},localPoint(h,bx+side*1.20,bz-.12),h.angle),support:'coal bunker'}))break;}
 }
 for(const id of [14,44])wallStation(homes.find(h=>h.number===id)!,'water',recipes.water);
 // Garden barrows and forks belong beside an existing tool rack, not an empty patch.
 const attachNear=(anchor:PropPlacement,kind:PropKind,station:Station,maxDistance=2.5)=>{
  const h=homes.find(h=>h.number===anchor.home)!;
  for(const distance of [1.45,1.85,maxDistance])for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   const angle=anchor.angle+a,p:Point=[anchor.p[0]+Math.cos(angle)*distance,anchor.p[1]-Math.sin(angle)*distance];
   if(accept({...make(h,station,{kind,x:0,z:0},p,anchor.angle+Math.PI/2),group:anchor.group,support:anchor.kind}))return true;
  }return false;
 };
 for(const anchor of out.filter(p=>p.kind==='tools')){if(anchor.home%2===0)attachNear(anchor,'wheelbarrow','garden');else if(anchor.home%3===0)attachNear(anchor,'hayfork','garden');}
 // Feed is put beside the existing hens. Keep their movement envelopes clear.
 for(const id of new Set(animals.filter(a=>a.kind==='hen').map(a=>a.home))){const animal=animals.find(a=>a.home===id&&a.kind==='hen')!;attachNear({kind:'trough',p:animal.p,angle:animal.angle,home:id,group:'feeding-'+id,station:'feeding'},'trough','feeding',2);}
 // Pumps need a bucket and a clear working apron; these are shared yard facilities.
 for(const id of [40,24])rearStation(homes.find(h=>h.number===id)!,'water',[{kind:'pump',x:0,z:0},{kind:'bucket',x:1.02,z:.1}]);
 // Ladders stand beside a wall, within the same maintenance area as a tool rack.
 for(const h of homes.filter(h=>[6,24,40,53].includes(h.number)))wallStation(h,'garden',[{kind:'ladder',x:0,z:0}]);
 // If a scarce type could not fit, try its whole logical station at another home.
 const scarce:[PropKind,Station,Part[],boolean][]=[['handcart','delivery',recipes.delivery,false],['trestles','repair',recipes.repair,false],['barrel','water',recipes.water,true],['pump','water',[{kind:'pump',x:0,z:0},{kind:'bucket',x:1.02,z:.1}],false],['ladder','garden',[{kind:'ladder',x:0,z:0}],true]];
 for(const [kind,station,parts,wall] of scarce)if(!out.some(p=>p.kind===kind))for(const h of homes.filter(h=>h.number!==5)){if((wall?wallStation:rearStation)(h,station,parts))break;}
 // Brooms rest against blank gables, with the bristles fitted to the terrain.
 const broomPoints:T.Vector3[]=[];models.broom.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)broomPoints.push(new T.Vector3().fromBufferAttribute(p,i));}});
 const tilt=.38,lean=new T.Matrix4().makeRotationX(tilt),reach=Math.max(...broomPoints.map(p=>p.clone().applyMatrix4(lean).z));
 for(const h of homes.filter(h=>h.number!==5&&h.number%2===0)){
  const {w,d}=dims(h),face=w/2+.1375*h.sx;
  outer:for(const side of [-1,1] as const)for(const along of [.22,-.05,-.28]){
   const p=localPoint(h,side*(face+reach+.003),d*along),angle=h.angle-side*Math.PI/2,rotation=new T.Matrix4().makeRotationFromEuler(new T.Euler(tilt,angle,0,'YXZ'));let height=-Infinity;
   for(const point of broomPoints){const v=point.clone().applyMatrix4(rotation);height=Math.max(height,ground(p[0]+v.x,p[1]+v.z)-v.y);}
   if(accept({kind:'broom',p,angle,tilt,lift:height-ground(...p)-.008,home:h.number,group:'housekeeping-'+h.number,station:'housekeeping',support:'wall',wallSide:side}))break outer;
  }
 }
 return out;
}
export function addWorkingProps(scene:T.Scene,homes:Home[],oak?:T.MeshStandardMaterial,paths:Point[][]=[],trees:Point[]=[]){
 const kit=createPropKit(oak),placements=planWorkingProps(homes,kit.models,paths,trees),batches=new Map<T.Material,T.BufferGeometry[]>();
 for(const p of placements){const source=kit.models[p.kind];const matrix=new T.Matrix4().compose(new T.Vector3(p.p[0],ground(...p.p)+(p.lift??0)+.008,p.p[1]),new T.Quaternion().setFromEuler(new T.Euler(p.tilt??0,p.angle,0,'YXZ')),new T.Vector3(1,1,1));
  for(const child of source.children){const mesh=child as T.Mesh,g=mesh.geometry.clone().applyMatrix4(matrix),mat=mesh.material as T.Material,list=batches.get(mat)||[];list.push(g);batches.set(mat,list);}
 }
 const root=new T.Group();root.name='Village working objects';for(const [m,parts] of batches){const mesh=new T.Mesh(mergeGeometries(parts),m);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);parts.forEach(g=>g.dispose());}scene.add(root);
 for(const model of Object.values(kit.models))model.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
 return {placements,root,counts:Object.fromEntries(Object.keys(kit.models).map(k=>[k,placements.filter(p=>p.kind===k).length]))};
}
