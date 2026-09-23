import type {Home} from './layout';
export type FurnitureKind='hearth'|'bed'|'table'|'stool'|'cupboard'|'chest'|'washstand'|'stairs'|'pallet'|'linenbench'|'clothesrail'|'basket'|'flue'|'fuelbucket'|'partition'|'prep'|'sewingtable'|'armchair'|'pantry'|'waterstation'|'fuelstore'|'spinningwheel'|'warpingframe';
export interface Furnishing {id:string;kind:FurnitureKind;x:number;z:number;w:number;d:number;variant:number;angle?:number;zone?:string;}
export interface InteriorFloor {name:string;items:Furnishing[];curtain:boolean;}
export interface InteriorPlan {number:number;width:number;depth:number;wallHeight:number;chimneyX:number;occupants:number;seed:number;floors:InteriorFloor[];palette:number;}
export function seeded(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
/** Shared height datum for room geometry and the inside camera. Storeys are interpreted. */
export function roomDimensions(h:Home,floor=0){
 const rand=seeded(h.number*971+1865);rand();rand();rand();
 const sy=h.number===22?1:.9+rand()*.21,levelHeight=2.225*sy;
 const level=h.style===1&&floor===1?1:0;
 return {sy,level,levelHeight,base:.12+level*levelHeight,height:(h.style===1?levelHeight:[2.65,4.45,2.85][h.style]*sy)-.12};
}
export function overlaps(a:Furnishing,b:Furnishing,gap=.06){return Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;}
// Furniture is in actual metres. Geometry is not stretched with the cottage asset.
// The 1861 count informs crowding, never a claim about specific 1865 possessions.
// Planning searches many trial layouts and validates each one; it is deterministic per house.
// Streaming rooms re-planned the same cottage once per floor, so cache the result (callers get a copy).
const planned=new Map<string,InteriorPlan>();
const planKey=(h:Home)=>[h.number,h.style,h.sx,h.sz,h.occupants_1861].join('|');
/** Plans computed elsewhere (the planning worker) are accepted into the same cache. */
export function seedInteriorPlan(h:Home,plan:InteriorPlan){if(!planned.has(planKey(h)))planned.set(planKey(h),plan);}
export function planInterior(h:Home):InteriorPlan{
 const key=planKey(h);
 let plan=planned.get(key);if(!plan){plan=planInteriorUncached(h);planned.set(key,plan);}
 return structuredClone(plan);
}
export function planInteriorUncached(h:Home):InteriorPlan{
 const width=[6.4,7.2,9.2][h.style]*h.sx,depth=[4.6,4.8,4.5][h.style]*h.sz;
 const rand=seeded(h.number*1865+7301),count=h.occupants_1861||1;
 const plan:InteriorPlan={number:h.number,width,depth,wallHeight:h.style===1?2.15:2.5,chimneyX:-width/2+.55*h.sx,occupants:count,seed:h.number*1865+7301,floors:[],palette:h.number%6};
 const floors=h.style===1?2:1;
 for(let floor=0;floor<floors;floor++){
  const items:Furnishing[]=[],innerW=width/2-.18,innerD=depth/2-.18;
  const fits=(a:Furnishing)=>Math.abs(a.x)+a.w/2<=innerW+.001&&Math.abs(a.z)+a.d/2<=innerD+.001&&!items.some(b=>overlaps(a,b,((a.kind==='stool'&&b.kind==='table')||(a.kind==='table'&&b.kind==='stool'))?.16:(floor?.53:.43)))&&(a.kind==='hearth'||Math.abs(a.x)-a.w/2>=.50);
  function place(kind:FurnitureKind,w:number,d:number,candidates:[number,number][],required=false){
   for(const [x,z] of candidates){const a={id:`${h.number}-${floor}-${kind}-${items.length}`,kind,x,z,w,d,variant:Math.floor(rand()*6)};if(fits(a)){items.push(a);return a;}}
   if(required)throw new Error(`No room for ${kind} in house ${h.number} floor ${floor}`);return null;
  }
  function candidates(w:number,d:number,side:number,back:boolean){const out:[number,number][]=[];for(let iz=0;iz<Math.ceil(depth/.12);iz++)for(let ix=0;ix<Math.ceil(width/.12);ix++){
   const x=side*(innerW-w/2-ix*.12),z=(back?-1:1)*(innerD-d/2-iz*.12);if(side*x<.5+w/2)continue;out.push([x,z]);}return out;}
  {const hw=Math.min(1.15,1.04*h.sx);place(floor?'flue':'hearth',hw,1.15,[[-innerW+hw/2,0]],true);}
  if(floors===2)place('stairs',.76,1.85,[[innerW-.38,innerD-1.525]],true);
  if(width>8.5&&depth>4.5&&(floor||floors===1))place('partition',.12,depth/2-.12,[[width*.13,-depth/4+.12]]);
  // Sleeping places stay in the quieter rear/right area; crowding adds a second bed only where it fits.
  const bedW=width<5.4?1.05:1.28+(h.number%3)*.05;
  if(floor||floors===1){place('bed',bedW,1.9,candidates(bedW,1.9,1,true),true);
   if(count>4)place('bed',1.07,1.83,candidates(1.07,1.83,-1,true));
   if(count>8)place('pallet',.72,1.7,candidates(.72,1.7,1,false));}
  if(!floor){
   // A usable eating/work group belongs near the hearth, not against the front cut line.
   // Small cottages keep a compact table; broad cottages have space for a larger work surface.
   const tw=Math.min(1.42,.86+Math.max(0,width-4.5)*.11),td=.68;
   const preferredX=-Math.max(1.15,width*.245),preferredZ=.54+(h.number%3)*.10;
   const tableCandidates=candidates(tw,td,-1,false).sort((a,b)=>Math.hypot(a[0]-preferredX,a[1]-preferredZ)-Math.hypot(b[0]-preferredX,b[1]-preferredZ));
   const table=place('table',tw,td,tableCandidates,true)!;
   const seats:[number,number][]=[[table.x,table.z+td/2+.34],[table.x,table.z-td/2-.34],[table.x-tw/2-.34,table.z],[table.x+tw/2+.34,table.z]];
   place('stool',.34,.34,seats);
   if(count>1)place('stool',.34,.34,seats);
   if(!place('cupboard',.92,.43,candidates(.92,.43,-1,true)))place('cupboard',.64,.36,candidates(.64,.36,-1,true),true);
   const fuelCandidates=candidates(.36,.36,-1,true).sort((a,b)=>Math.hypot(a[0]+width*.34,a[1]+.85)-Math.hypot(b[0]+width*.34,b[1]+.85));place('fuelbucket',.36,.36,fuelCandidates);
   const washCandidates=candidates(.58,.36,1,false).sort((a,b)=>Math.hypot(a[0]-width*.27,a[1]+depth*.15)-Math.hypot(b[0]-width*.27,b[1]+depth*.15));
   place('washstand',.58,.36,washCandidates);
  }else{
   const bed=items.find(a=>a.kind==='bed')!;
   const near=(cw:number,cd:number,px:number,pz:number,side:number)=>candidates(cw,cd,side,false).sort((a,b)=>Math.hypot(a[0]-px,a[1]-pz)-Math.hypot(b[0]-px,b[1]-pz));
   place('chest',.84,.43,near(.84,.43,bed.x,bed.z+bed.d/2+.72,1));
   place('washstand',.58,.36,near(.58,.36,bed.x-bed.w/2-.98,bed.z+.30,1));
   // The open side of the chamber forms a small dressing/storage group.
   // Folded linen, a plain clothes horse and basket replace empty perimeter-only staging.
   place('linenbench',1.02,.40,near(1.02,.40,-width*.245,.62,-1));
   if(h.number%4===2)place('cupboard',.68,.40,near(.68,.40,-width*.25,-1.10,-1));
   else place('clothesrail',.92,.38,near(.92,.38,-width*.245,-.80,-1));
   place('basket',.45,.45,near(.45,.45,-width*.19,1.65,-1));
  }
  if(!floor&&floors===1&&width*depth>42){const benchSpots=candidates(.9,.4,-1,true).sort((a,b)=>Math.hypot(a[0]+width*.22,a[1]+depth*.28)-Math.hypot(b[0]+width*.22,b[1]+depth*.28));place('linenbench',.9,.4,benchSpots);}
  if(!floor&&width*depth>35&&h.number%2===0){const spots=candidates(.45,.45,1,false).sort((a,b)=>Math.hypot(a[0]-width*.21,a[1]-.6)-Math.hypot(b[0]-width*.21,b[1]-.6));place('basket',.45,.45,spots);}
  if(!floor&&h.number%3!==0){const bed=items.find(a=>a.kind==='bed'),nearBed: [number,number][]=bed?[[bed.x,bed.z+bed.d/2+.65]]:[];place('chest',.58,.36,[...nearBed,...candidates(.58,.36,1,true)]);}
  plan.floors.push({name:floor?'Sleeping room':'Living room',items,curtain:floors===1&&width>7});
 }
 return furnishLivingPlan(plan);
}
export function validateInterior(plan:InteriorPlan):string[]{
 const errors:string[]=[];
 for(const [floorIndex,floor]of plan.floors.entries()){
  const prefix=`House ${plan.number}, floor ${floorIndex}: `;
  for(const a of floor.items){
   if(Math.abs(a.x)+a.w/2>plan.width/2-.17||Math.abs(a.z)+a.d/2>plan.depth/2-.17)errors.push(prefix+a.id+' crosses wall');
   if(a.kind!=='hearth'&&Math.abs(a.x)-a.w/2<.49)errors.push(prefix+a.id+' blocks central passage');
   for(const b of floor.items)if(a.id<b.id&&overlaps(a,b,.07))errors.push(prefix+a.id+' overlaps '+b.id);
  }
  const table=floor.items.find(a=>a.kind==='table'),seats=floor.items.filter(a=>a.kind==='stool');
  if(table&&!seats.length)errors.push(prefix+'table has no seat');
  for(const seat of seats)if(table&&Math.hypot(Math.max(0,Math.abs(seat.x-table.x)-table.w/2),Math.max(0,Math.abs(seat.z-table.z)-table.d/2))>.50)errors.push(prefix+'seat is too far from table');
  // A person-sized navigation grid must connect entrance, room centre and every item.
  const step=.12,radius=.21,nx=Math.ceil(plan.width/step),nz=Math.ceil(plan.depth/step);
  const point=(i:number,j:number)=>[-plan.width/2+(i+.5)*step,-plan.depth/2+(j+.5)*step];
  const free=(i:number,j:number)=>{if(i<0||j<0||i>=nx||j>=nz)return false;const [x,z]=point(i,j);return Math.abs(x)<plan.width/2-.18-radius&&Math.abs(z)<plan.depth/2-.18-radius&&!floor.items.some(a=>Math.abs(x-a.x)<a.w/2+radius&&Math.abs(z-a.z)<a.d/2+radius);};
  const start=[Math.floor(nx/2),Math.floor((plan.depth-.5)/step)];
  const seen=new Set<string>(),queue=[start];while(queue.length){const [i,j]=queue.shift()!;const key=i+','+j;if(seen.has(key)||!free(i,j))continue;seen.add(key);for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([i+di,j+dj]);}
  if(seen.size<20)errors.push(prefix+'no entrance route');
  {const stairs=floor.items.find(a=>a.kind==='stairs');if(stairs){const tx=stairs.x,tz=stairs.z+(floorIndex?-1:1)*(stairs.d/2+.34);const reachable=[...seen].some(key=>{const [i,j]=key.split(',').map(Number),[x,z]=point(i,j);return Math.hypot(x-tx,z-tz)<.22;});if(!reachable)errors.push(prefix+'stair landing is blocked');}}
  for(const a of floor.items){let accessible=false;for(const key of seen){const [i,j]=key.split(',').map(Number),[x,z]=point(i,j);const dx=Math.max(0,Math.abs(x-a.x)-a.w/2),dz=Math.max(0,Math.abs(z-a.z)-a.d/2);if(Math.hypot(dx,dz)<.5){accessible=true;break;}}if(!accessible)errors.push(prefix+a.id+' cannot be reached');}
 }
 const hearth=plan.floors[0].items.find(a=>a.kind==='hearth');
 if(!hearth||Math.abs(hearth.x-plan.chimneyX)>hearth.w/2+.06||Math.abs(hearth.z)>.01)errors.push(`House ${plan.number}: hearth misses chimney`);
 return errors;
}

/** Furnishing is arranged by use, with wall storage and working room in front. */
function furnishLivingPlan(plan:InteriorPlan):InteriorPlan {
 if(plan.number===21){
  // Seven recorded occupants; furniture and two-storey form remain an interpretation.
  // Keep the existing stair footprint and all sleeping-room positions.
  const stairs=plan.floors[0].items.find(a=>a.kind==='stairs')!;
  const item=(kind:FurnitureKind,x:number,z:number,w:number,d:number,zone:string,angle=0):Furnishing=>({id:`21-0-${kind}-${zone}`,kind,x,z,w,d,zone,angle,variant:0});
  plan.floors[0].items=[
   item('hearth',-3.456954836409901,0,1.15,1.15,'cooking'),stairs,
   item('table',-1.93,.30,1.72,.83,'eating'),
   item('linenbench',-1.93,1.10,1.64,.38,'eating-front',Math.PI),
   item('linenbench',-1.93,-.50,1.64,.38,'eating-back'),
   item('stool',-.68,.30,.34,.34,'eating-end',-Math.PI/2),
   item('prep',-2.65,-2.82,1.70,.62,'cooking'),
   item('cupboard',-1.17,-2.89,.95,.48,'cooking'),
   item('fuelbucket',-2.97,-1.02,.34,.34,'cooking'),
   item('waterstation',-3.63,-1.75,.40,.40,'cooking'),
   item('armchair',-3.62,1.75,.60,.64,'rest',Math.PI/2),
   item('chest',-1.95,2.88,1.14,.46,'household-storage'),
   item('pantry',1.30,-2.89,.70,.46,'storage'),
   item('washstand',2.58,-2.89,.68,.46,'washing'),
   item('clothesrail',1.62,2.88,.86,.40,'clothes',Math.PI),
  ];
  return plan;
 }
 if(plan.number===22){
  const item=(kind:FurnitureKind,x:number,z:number,w:number,d:number,zone:string,angle=0,variant=0):Furnishing=>({id:`22-0-${kind}-${zone}`,kind,x,z,w,d,zone,angle,variant});
  plan.floors[0].items=[
   item('hearth',-4.525,0,1.15,1.15,'cooking'),
   item('partition',1.50,-1.80,.12,2.48,'sleeping'),
   item('bed',4.36,-2.08,1.45,1.92,'sleeping'),
   item('prep',-3.38,-2.68,2.02,.64,'cooking'),
   item('cupboard',-1.38,-2.77,1.32,.48,'cooking'),
   item('pantry',-4.77,-1.82,.48,.88,'cooking',Math.PI/2),
   item('table',-2.30,.55,1.64,.82,'eating'),
   item('stool',-2.30,1.32,.44,.42,'eating-front',Math.PI),
   item('stool',-2.30,-.22,.44,.42,'eating-back'),
   item('linenbench',-2.05,2.77,1.72,.44,'rest',Math.PI),
   item('armchair',-4.65,1.56,.66,.68,'rest',Math.PI/2),
   item('fuelbucket',-3.74,.87,.34,.34,'cooking'),
   item('fuelstore',-4.66,2.70,.60,.46,'fuel',Math.PI),
   item('waterstation',-1.34,-1.40,.50,.50,'cooking'),
   item('sewingtable',3.18,2.71,1.24,.58,'sewing',Math.PI),
   item('spinningwheel',1.84,2.67,1.02,.48,'inherited-textiles',Math.PI),
   item('warpingframe',5.00,.70,.15,.79,'inherited-textiles',-Math.PI/2),
   item('armchair',3.18,1.71,.58,.58,'sewing',0,1),
   item('washstand',2.21,-2.75,.64,.46,'sleeping'),
   item('chest',4.35,-.49,1.10,.48,'sleeping'),
   item('clothesrail',4.58,2.70,.86,.40,'clothes'),
   item('basket',4.67,1.78,.44,.44,'clothes'),
  ];
  return plan;
 }
 for(const [floor,f]of plan.floors.entries()){
  const accept=(a:Furnishing,replace?:Furnishing)=>{
   const others=f.items.filter(b=>b!==replace);
   if(Math.abs(a.x)+a.w/2>plan.width/2-.18||Math.abs(a.z)+a.d/2>plan.depth/2-.18||Math.abs(a.x)-a.w/2<.5||others.some(b=>overlaps(a,b,.09)))return false;
   const trial={...plan,floors:plan.floors.map((ff,i)=>i===floor?{...ff,items:[...others,a]}:ff)};
   if(validateInterior(trial).length)return false;
   f.items=[...others,a];return true;
  };
  const wallSpots=(w:number,d:number,side:number,front=false)=>{
   const spots:[number,number][]=[];const z=(front?1:-1)*(plan.depth/2-.21-d/2);
   for(let x=plan.width/2-.23-w/2;x>.50+w/2;x-=.24)spots.push([side*x,z]);return spots;
  };
  // Benches and washstands belong against a wall. Loose laundry belongs beside the washstand.
  for(const a of [...f.items].filter(a=>['linenbench','washstand','clothesrail'].includes(a.kind))){
   const spots=[...wallSpots(a.w,a.d,a.x<0?-1:1,a.kind==='linenbench'),...wallSpots(a.w,a.d,a.x<0?-1:1)];
   spots.sort((a1,b)=>Math.hypot(a1[0]-a.x,a1[1]-a.z)-Math.hypot(b[0]-a.x,b[1]-a.z));
   for(const [x,z]of spots)if(accept({...a,x,z,angle:z>0?Math.PI:0},a))break;
  }
  for(const a of [...f.items].filter(a=>a.kind==='basket')){
   const wash=f.items.find(a=>a.kind==='washstand');if(wash)for(const side of [-1,1])if(accept({...a,x:wash.x+side*(wash.w/2+a.w/2+.12),z:wash.z},a))break;
  }
  if(floor)continue;
  const insert=(kind:FurnitureKind,w:number,d:number,side:number,front=false,zone='cooking')=>{
   const spots=wallSpots(w,d,side,front);
   for(const [x,z]of spots){if(kind==='pantry'&&Math.abs(x-side*plan.width*.32)<w/2+.70)continue;const a:Furnishing={id:`${plan.number}-${floor}-${kind}-zone`,kind,x,z,w,d,variant:plan.number%3,zone,angle:front?Math.PI:0};if(accept(a))return a;}
  };
  // Larger homes get a separate prep bench; small homes keep a clear section of their dining table.
  if(plan.width*plan.depth>23)insert('prep',Math.min(1.40,plan.width*.14),.50,-1);
  if([12,40].includes(plan.number))insert('sewingtable',.86,.48,1,true,'sewing');
  if(plan.width*plan.depth>22)insert('armchair',.60,.60,-1,true,'rest');
  if(plan.width*plan.depth>32)insert('pantry',.65,.43,1,false,'storage');
  if(plan.width*plan.depth>30)insert('waterstation',.39,.39,-1,false);
  const table=f.items.find(a=>a.kind==='table');
  if(table){
   const desired=Math.min(4,plan.occupants);
   for(const [dx,dz,angle]of [[0,table.d/2+.36,Math.PI],[0,-table.d/2-.36,0],[-table.w/2-.36,0,Math.PI/2],[table.w/2+.36,0,-Math.PI/2]]){
    if(f.items.filter(a=>a.kind==='stool').length>=desired)break;
    accept({id:`${plan.number}-extra-seat-${dx}-${dz}`,kind:'stool',x:table.x+dx,z:table.z+dz,w:.34,d:.34,angle,variant:plan.number%3,zone:'eating'});
   }
  }
 }
 return plan;
}
