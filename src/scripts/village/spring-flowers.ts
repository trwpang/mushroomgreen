import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ground,nearestRoad,nearestSegment,streamDistance,chainshopPosition,weaverWorkshop,type Home,type Point} from './layout';
import {seeded} from './interior-plans';

type Flower={p:Point;scale:number;angle:number};
// The copse northwest of the main chainshop, visible across the lane in house 5's view.
export const bluebellCopse={centre:[12,23] as Point,rx:22,rz:23};
export function flowerClearance(p:Point,homes:Home[],paths:Point[][],trees:Point[]):boolean{
 const [x,z]=p,road=nearestRoad(p);
 if(Math.hypot(x-road[0],z-road[1])<3.7||streamDistance(x,z)<3.7)return false;
 if(Math.hypot(x-chainshopPosition[0],z-chainshopPosition[1])<11)return false;
 const founder=homes.find(h=>h.number===22);if(founder){const shop=weaverWorkshop(founder);if(Math.hypot(x-shop.p[0],z-shop.p[1])<6)return false;}
 for(const h of homes){if(h.number===5)continue;const dx=x-h.x,dz=z-h.z,c=Math.cos(h.angle),s=Math.sin(h.angle),lx=dx*c-dz*s,lz=dx*s+dz*c;
  const w=[6.4,7.2,9.2][h.style]*h.sx/2,d=[4.6,4.8,4.5][h.style]*h.sz/2;
  if(Math.abs(lx)<w+2.4&&lz>-d-(h.number===22?12:4.5)&&lz<d+3)return false;
 }
 for(const line of paths)for(let i=1;i<line.length;i++){const q=nearestSegment(p,line[i-1],line[i]);if(Math.hypot(x-q[0],z-q[1])<1.15)return false;}
 return !trees.some(t=>Math.hypot(x-t[0],z-t[1])<.55);
}
export function planSpringFlowers(homes:Home[],paths:Point[][],trees:Point[]){
 const random=seeded(4191865),bluebells:Flower[]=[],daffodils:Flower[]=[];
 const copse=trees.filter(p=>((p[0]-bluebellCopse.centre[0])/bluebellCopse.rx)**2+((p[1]-bluebellCopse.centre[1])/bluebellCopse.rz)**2<1);
 const bloom=(p:Point):Flower=>({p,scale:.72+random()*.55,angle:random()*Math.PI*2});
 for(const t of copse){
  // Offset overlapping colonies leave bare seams, tree roots and natural margins.
  const a=random()*6.28,centre:Point=[t[0]+Math.cos(a)*1.2,t[1]+Math.sin(a)*1.2];
  for(let i=0;i<125;i++){const a=random()*6.28,r=Math.sqrt(random())*3.6,p:Point=[centre[0]+Math.cos(a)*r,centre[1]+Math.sin(a)*r*.75];
   if(random()>.82+.15*Math.sin(p[0]*1.2+p[1]*.6)||!flowerClearance(p,homes,paths,trees))continue;
   if(bluebells.some(b=>Math.hypot(b.p[0]-p[0],b.p[1]-p[1])<.16))continue;
   bluebells.push(bloom(p));
  }
 }
 // Small, uneven groups on sheltered margins. Avoid a uniform yellow scatter.
 const candidates:Point[]=[...homes.filter(h=>h.number!==5).map(h=>[h.x,h.z] as Point),...trees.filter((_,i)=>i%31===0)];
 for(const c of candidates){if(random()<.32)continue;const a=random()*6.28,offset=6+random()*5,centre:Point=[c[0]+Math.cos(a)*offset,c[1]+Math.sin(a)*offset];
  if((centre[0]/205)**2+((centre[1]+60)/235)**2>.94)continue;
  for(let i=0,n=3+Math.floor(random()*6);i<n;i++){const a=random()*6.28,r=Math.sqrt(random())*.85,p:Point=[centre[0]+Math.cos(a)*r,centre[1]+Math.sin(a)*r];
   if(flowerClearance(p,homes,paths,trees))daffodils.push(bloom(p));
  }
 }
 return {bluebells,daffodils,copseTrees:copse.length};
}

function flowerGeometry(daffodil:boolean){
 const parts:T.BufferGeometry[]=[];
 const add=(g:T.BufferGeometry,colour:string)=>{const n=g.index?g.toNonIndexed():g;const c=new T.Color(colour),v=new Float32Array(n.attributes.position.count*3);for(let i=0;i<v.length;i+=3){v[i]=c.r;v[i+1]=c.g;v[i+2]=c.b;}n.setAttribute('color',new T.BufferAttribute(v,3));n.deleteAttribute('uv');parts.push(n);if(n!==g)g.dispose();};
 const tube=(points:T.Vector3[],r:number,colour:string)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points),r<.005?3:7,r,r<.005?3:4,false),colour);
 // Folded strap leaves arch out from the bulb rather than sticking up as triangles.
 for(let j=0;j<3;j++){const a=j*2.4,v:number[]=[];const point=(t:number,side:number)=>{const r=t*t*.14,w=Math.sin(t*Math.PI)*.016*side;return [Math.cos(a)*r-Math.sin(a)*w,Math.sin(t*Math.PI*.72)*(daffodil?.32:.22)-Math.abs(side)*.004,Math.sin(a)*r+Math.cos(a)*w];};
  for(let i=0;i<5;i++)for(const side of [-1,1]){const t=i/5,u=(i+1)/5;v.push(...point(t,0),...point(t,side),...point(u,side),...point(t,0),...point(u,side),...point(u,0));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();add(g,j%2?'#405735':'#607545');
 }
 const h=daffodil?.43:.35;
 tube([new T.Vector3(),new T.Vector3(0,h*.48,0),new T.Vector3(.017,h*.87,0),new T.Vector3(.07,h,0)],.006,daffodil?'#687843':'#47603b');
 if(daffodil){
  // Six pale petals and an open, darker trumpet face slightly downwards.
  const head=new T.Matrix4().compose(new T.Vector3(.075,h,0),new T.Quaternion().setFromEuler(new T.Euler(0,0,-Math.PI*.56)),new T.Vector3(1,1,1));
  for(let j=0;j<6;j++){const a=j*Math.PI/3,g=new T.BufferGeometry(),v=[0,0,0,Math.cos(a-.36)*.045,.007,Math.sin(a-.36)*.045,Math.cos(a)*.086,.016,Math.sin(a)*.086,0,0,0,Math.cos(a)*.086,.016,Math.sin(a)*.086,Math.cos(a+.36)*.045,.007,Math.sin(a+.36)*.045];g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();g.applyMatrix4(head);add(g,j%2?'#ead584':'#f3df96');}
  const trumpet=new T.LatheGeometry([new T.Vector2(.016,0),new T.Vector2(.020,.027),new T.Vector2(.031,.050),new T.Vector2(.026,.052),new T.Vector2(.015,.023)],9);trumpet.applyMatrix4(head);add(trumpet,'#d6a132');
 }else{
  for(let j=0;j<5;j++){const y=.18+j*.039,x=.014+j*.010,z=(j%2-.5)*.019;
   tube([new T.Vector3(.01,y+.025,0),new T.Vector3(x+.035,y+.025,z),new T.Vector3(x+.055,y,z)],.0038,'#596347');
   const bell=new T.LatheGeometry([new T.Vector2(.004,0),new T.Vector2(.018,-.014),new T.Vector2(.019,-.045),new T.Vector2(.027,-.058)],7);
   bell.translate(x+.055,y,z);add(bell,['#686caf','#777cbb','#565e9e'][j%3]);
  }
 }
 const geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());geometry.computeBoundingSphere();return geometry;
}
export function addSpringFlowers(scene:T.Scene,homes:Home[],paths:Point[][],trees:Point[]){
 const plan=planSpringFlowers(homes,paths,trees),dummy=new T.Object3D();
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,side:T.DoubleSide});
 for(const [name,placements,daffodil]of [['Bluebells in the chainshop copse',plan.bluebells,false],['Scattered daffodil clumps',plan.daffodils,true]] as const){
  const mesh=new T.InstancedMesh(flowerGeometry(daffodil),material,placements.length);mesh.name=name;mesh.receiveShadow=true;
  placements.forEach((f,i)=>{dummy.position.set(f.p[0],ground(...f.p)-.008,f.p[1]);dummy.rotation.set(0,f.angle,0);dummy.scale.setScalar(f.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color().setScalar(.88+(i%9)*.025));});
  mesh.computeBoundingSphere();scene.add(mesh);
 }
 return {bluebells:plan.bluebells.length,daffodils:plan.daffodils.length,copseTrees:plan.copseTrees};
}
