import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPropKit,type PropKind} from './working-props';
import {planVillageLife} from './village-life';
import {ground,localPoint,nearestRoad,nearestSegment,streamDistance,chainshopPosition,weaverWorkshop,type Home,type Point} from './layout';
export type PropPlacement={kind:PropKind;p:Point;angle:number;home:number;group:string;tilt?:number;lift?:number};
const dims=(h:Home)=>({w:[6.4,7.2,9.2][h.style]*h.sx,d:[4.6,4.8,4.5][h.style]*h.sz});
const local=(p:Point,c:Point,a:number):Point=>{const x=p[0]-c[0],z=p[1]-c[1];return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];};
export function propGroundIssue(p:Point,homes:Home[],paths:Point[][],trees:Point[]=[]):string|null{
 const r=nearestRoad(p);if(Math.hypot(p[0]-r[0],p[1]-r[1])<2.5)return 'lane';
 if(streamDistance(...p)<3.1)return 'brook';
 for(const path of paths)for(let i=1;i<path.length;i++){const q=nearestSegment(p,path[i-1],path[i]);if(Math.hypot(p[0]-q[0],p[1]-q[1])<.75)return 'path';}
 if(trees.some(t=>Math.hypot(p[0]-t[0],p[1]-t[1])<.65))return 'tree';
 const f=local(p,chainshopPosition,1.03);if(Math.abs(f[0])<4.7&&Math.abs(f[1])<2.65)return 'forge wall';
 if(f[0]>4.45&&f[0]<8&&Math.abs(f[1])<1.6)return 'forge entrance';
 if(f[0]>-2.05&&f[0]<.65&&f[1]>3.8&&f[1]<9.1)return 'cart';
 for(const h of homes){if(h.number===5)continue;const {w,d}=dims(h),q=local(p,[h.x,h.z],h.angle);
  if(Math.abs(q[0])<w/2+.14&&Math.abs(q[1])<d/2+.14)return 'house';
  if(Math.abs(q[0])<w/2+.12&&q[1]<-d/2&&q[1]>-d/2-1.9)return 'rear stores';
  if(Math.abs(Math.abs(q[0])-(w/2+1.4))<.15&&q[1]>-d/2-.2&&q[1]<-d/2+4.7)return 'fence';
  const bx=h.number===22?2.7:-w*.27,bz=-d/2-(h.number===22?1.05:2.9);if(Math.abs(q[0]-bx)<.86&&Math.abs(q[1]-bz)<.65)return 'coal bunker';
  if(h.number===22){if(q[0]>-4.9&&q[0]<-1.8&&q[1]>-11.1&&q[1]<-7.9)return 'vegetable bed';if(Math.abs(q[0]-4.8)<.8&&Math.abs(q[1]+6.5)<.9)return 'privy';if(q[0]>-5&&q[0]<1.7&&Math.abs(q[1]+6.6)<.3)return 'laundry';const s=weaverWorkshop(h),l=local(p,s.p,s.angle);if(Math.abs(l[0])<s.width/2+.2&&Math.abs(l[1])<s.depth/2+.2)return 'small forge';}
 }
 return null;
}
export function planWorkingProps(homes:Home[],models:Record<PropKind,T.Group>,paths:Point[][]=[],trees:Point[]=[]){
 const out:PropPlacement[]=[];const bounds=Object.fromEntries(Object.entries(models).map(([k,m])=>[k,new T.Box3().setFromObject(m)])) as Record<PropKind,T.Box3>;
 const samples=(a:PropPlacement):Point[]=>{const b=bounds[a.kind],v:Point[]=[];for(let x=b.min.x-.06;x<=b.max.x+.1;x+=.16)for(let z=b.min.z-.06;z<=b.max.z+.1;z+=.16)v.push([a.p[0]+x*Math.cos(a.angle)+z*Math.sin(a.angle),a.p[1]-x*Math.sin(a.angle)+z*Math.cos(a.angle)]);return v;};
 const occupied:{p:Point;radius:number;group:string}[]=planVillageLife(homes,paths).map(a=>({p:a.p,radius:.45,group:'animal'}));
 const accept=(a:PropPlacement)=>{
  const b=bounds[a.kind],radius=Math.hypot(b.max.x-b.min.x,b.max.z-b.min.z)/2;
  if(occupied.some(b=>b.group!==a.group&&Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])<radius+b.radius+.10))return false;
  const points=samples(a);if(points.some(p=>propGroundIssue(p,homes,paths,trees)))return false;
  const ys=points.map(p=>ground(...p));if(Math.max(...ys)-Math.min(...ys)>.21)return false;
  out.push(a);occupied.push({p:a.p,radius,group:a.group});return true;
 };
 const forgePoint=(x:number,z:number):Point=>[chainshopPosition[0]+x*Math.cos(1.03)+z*Math.sin(1.03),chainshopPosition[1]-x*Math.sin(1.03)+z*Math.cos(1.03)];
 for(const [kind,x,z] of [['grindstone',1.65,3.65],['scuttle',3.7,2.95],['woodpile',-3.4,3.35]] as [PropKind,number,number][])accept({kind,p:forgePoint(x,z),angle:1.03,home:5,group:'forge-'+kind});
 const henry=homes.find(h=>h.number===22)!;
 if(accept({kind:'tub',p:localPoint(henry,-.4,-7.85),angle:henry.angle,home:22,group:'wash-22'}))out.push({kind:'washboard',p:localPoint(henry,-.4,-8.03),angle:henry.angle,tilt:-.55,lift:.07,home:22,group:'wash-22'});
 // Each small working group belongs to a yard. Prefer open rear corners and omit unsafe candidates.
 const requests:[PropKind,number][]=[['wheelbarrow',22],['tools',22],['block',22],['handcart',10],['pump',40],['grindstone',6],['tub',31],['woodpile',31],['block',31],['tools',15],['wheelbarrow',15],['scuttle',15],['tub',46],['woodpile',46],['scuttle',46],['tools',53],['block',53],['wheelbarrow',24],['woodpile',24],['scuttle',24],['handcart',57],['scuttle',22]];
 for(const [kind,id] of requests){const h=homes.find(h=>h.number===id)!;const {w,d}=dims(h);let placed=false;
  for(const rear of [3.8,5.1,6.4,7.5]){if(placed)break;for(const x of [w*.25,-w*.25,w*.48,-w*.48,0]){const p=localPoint(h,x,-d/2-rear),group=kind==='tub'?'wash-'+id:kind+'-'+id;
   if(accept({kind,p,angle:h.angle+(kind==='wheelbarrow'?.35:0),home:id,group})){placed=true;if(kind==='tub')out.push({kind:'washboard',p:localPoint(h,x,-d/2-rear-.18),angle:h.angle,tilt:-.55,lift:.07,home:id,group});break;}
  }}
 }
 // Guarantee one example of each requested type, with the same clearance rules.
 for(const kind of Object.keys(models) as PropKind[]){if(out.some(p=>p.kind===kind))continue;
  outer:for(const h of homes.filter(h=>h.number!==5)){const {w,d}=dims(h);for(const rear of [4,5.5,7])for(const x of [-w*.4,w*.4])if(accept({kind,p:localPoint(h,x,-d/2-rear),angle:h.angle,home:h.number,group:kind+'-fallback'}))break outer;}
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
