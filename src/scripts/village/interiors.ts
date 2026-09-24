import {createFire} from './fire';
import {requestLight,lightPoolInstalled,type PooledLight} from './light-pool';
import {addHenryStatue} from './henry-statue';
import {textureDetail,type TextureDetail} from './texture-detail';
import {domesticWear} from './domestic-wear';
import {wearFloor} from './floor-wear';
import {refineSurface,cloneSurface,type Surface} from '../rendering/surfaces';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Home} from './layout';
import {localPoint} from './layout';
import {planInterior,roomDimensions,seeded,type InteriorPlan,type Furnishing} from './interior-plans';
import {interiorObject,type ObjectMaterial} from './interior-objects';
import {planDressing} from './interior-dressing';
import type {InteriorObjectId} from './interior-catalogue';

export interface InteriorView {group:T.Group;plan:InteriorPlan;floor:number;floors:number;target:T.Vector3;camera:T.Vector3;}
/** Shared room builder for isolated cutaways and furnished village shells. */
export function createInteriors(scene:T.Object3D,embedded=false){
 let active:InteriorView|null=null,clock=0;let removeStatue:(()=>void)|undefined;
 let flame:T.Mesh|null=null,glow:{intensity:number}|null=null,hearthFire:ReturnType<typeof createFire>|null=null;let lampFlame:T.Mesh|null=null,lampGlow:{intensity:number}|null=null;
 // Room lights come from the shared pool in the village (constant light count, no shader recompiles);
 // isolated studies without a pool keep real lights.
 const pooled:PooledLight[]=[];
 function roomLight(parent:T.Object3D,position:T.Vector3,color:string,intensity:number,distance:number){
  if(lightPoolInstalled()){const anchor=new T.Object3D();anchor.position.copy(position);parent.add(anchor);const handle=requestLight(anchor,color,intensity,distance);pooled.push(handle);return handle;}
  const light=new T.PointLight(color,intensity,distance,2);light.position.copy(position);parent.add(light);return light;
 }
 const resources=new Set<T.Material|T.Texture|T.BufferGeometry>();
 const own=<A extends T.Material|T.Texture|T.BufferGeometry>(r:A)=>{resources.add(r);return r;};
 function hide(){hearthFire?.dispose();hearthFire=null;for(const handle of pooled)handle.release();pooled.length=0;removeStatue?.();removeStatue=undefined;if(active)scene.remove(active.group);for(const r of resources)r.dispose();resources.clear();active=null;flame=null;glow=null;lampFlame=null;lampGlow=null;}
 function show(home:Home,floor=0):InteriorView{
  hide();const plan=planInterior(home);floor=Math.max(0,Math.min(plan.floors.length-1,floor));
  const rand=seeded(plan.seed+floor*473),root=new T.Group();root.name=`House ${home.number} — interpreted interior — ${plan.floors[floor].name}`;
  root.position.set(home.x,home.height,home.z);root.rotation.y=home.angle;scene.add(root);
  const w=plan.width,d=plan.depth;
  const {sy}=roomDimensions(home,floor);
  const levelHeight=2.225*sy,base=floor*levelHeight+.12,wallH=(home.style===1?levelHeight:[2.65,4.45,2.85][home.style]*sy)-(embedded?.12:0);
  function texture(kind:'wood'|'plaster'|'cloth'|'brick',baseColour:string){
   const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;
   ctx.fillStyle=baseColour;ctx.fillRect(0,0,256,256);
   for(let i=0;i<5500;i++){const x=rand()*256,y=rand()*256;ctx.fillStyle=rand()>.5?'#ffffff0d':'#1b120d12';ctx.fillRect(x,y,kind==='wood'?1:2,kind==='wood'?8+rand()*80:2);}
   // Broad translucent wear below the fine grain: handled wood, uneven lime,
   // ash near skirtings, and faded folds. Seeded independently of room layouts.
   const wear=seeded(plan.seed+floor*313+{wood:7,plaster:31,cloth:53,brick:79}[kind]);
   for(let i=0;i<35;i++){const x=wear()*256,y=wear()*256,r=12+wear()*48;
    const wash=ctx.createRadialGradient(x,y,0,x,y,r);wash.addColorStop(0,kind==='plaster'?'#655c4316':kind==='wood'?'#352b1b14':'#eee4cb12');wash.addColorStop(1,'#73694e00');ctx.fillStyle=wash;ctx.fillRect(x-r,y-r,r*2,r*2);}
   if(kind==='plaster'){const damp=ctx.createLinearGradient(0,180,0,256);damp.addColorStop(0,'#504c3e00');damp.addColorStop(1,'#504c3e13');ctx.fillStyle=damp;ctx.fillRect(0,180,256,76);
    for(let i=0;i<5;i++){const x=wear()*256,y=wear()*220;ctx.strokeStyle='#665e481e';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3,y+12);ctx.lineTo(x-1,y+20);ctx.lineTo(x+4,y+34);ctx.stroke();}}
   if(kind==='wood'){for(let i=0;i<28;i++){ctx.strokeStyle='#21170f24';ctx.lineWidth=.4;ctx.beginPath();const x=rand()*256;ctx.moveTo(x,0);ctx.bezierCurveTo(x+8,85,x-6,160,x+2,256);ctx.stroke();}}
   if(kind==='cloth')for(let i=0;i<256;i+=3){ctx.fillStyle='#b3a78a26';ctx.fillRect(i,0,1,256);ctx.fillRect(0,i,256,1);}
   if(kind==='brick'){ctx.strokeStyle='#a2957c';ctx.lineWidth=3;for(let y=0;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=(y/32%2)*32;x<256;x+=64){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke();}}}
   const t=own(new T.CanvasTexture(c));t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
  }
  const woodMap=texture('wood','#796045'),plasterMap=texture('plaster','#c4b99e'),clothMap=texture('cloth','#c4b69a'),brickMap=texture('brick','#69422d');
  const mat=(color:string,map?:T.Texture,roughness=.93,kind?:Surface)=>{const m=own(new T.MeshStandardMaterial({color,map:map??null,roughness}));return refineSurface(m,kind??(map===woodMap?'wood':map===clothMap?'cloth':map===brickMap?'brick':map===plasterMap?'plaster':roughness<.5?'ceramic':'iron'));};
  const woods=['#e3ccaa','#c5b59d','#d3b590','#b59f84'].map(c=>mat(c,woodMap));
  const lime=mat(['#ddd6ba','#c7ccb9','#d8c7b0','#cbc3b3','#d7d0b9','#c4c7b5'][plan.palette],plasterMap),dark=mat('#211e18',undefined,.93,'coal'),iron=mat('#37372e',undefined,.7),brick=mat('#c2aa93',brickMap),stone=mat('#8a8170',undefined,.93,'stone'),cream=mat('#e9dfc9',clothMap),blanket=mat(['#786a53','#6a7773','#827064','#77794f','#8b7b66','#697071'][plan.palette],clothMap),ceramic=mat('#b5a787',undefined,.34),earthenware=mat('#835a3d',undefined,.42);
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  function add(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,rx=0,ry=0,rz=0){const matrix=new T.Matrix4().compose(new T.Vector3(x,y+base,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1));const n=g.index?g.toNonIndexed():g.clone();g.dispose();if(!n.hasAttribute('color'))n.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(n.getAttribute('position').count*3).fill(1),3));n.applyMatrix4(matrix);const b=batches.get(m)||[];b.push(n);batches.set(m,b);}
  function box(x:number,y:number,z:number,a:number,b:number,c:number,m:T.Material=woods[0],ry=0){add(new T.BoxGeometry(a,b,c),m,x,y,z,0,ry);}
  function cylinder(x:number,y:number,z:number,rt:number,rb:number,h:number,m:T.Material,sides=12){add(new T.CylinderGeometry(rt,rb,h,sides),m,x,y,z);}
  function sphere(x:number,y:number,z:number,a:number,b:number,c:number,m:T.Material){const g=new T.SphereGeometry(1,12,7);g.scale(a,b,c);add(g,m,x,y,z);}
  function rod(a:T.Vector3,b:T.Vector3,r:number,m:T.Material){const g=new T.CylinderGeometry(r,r,a.distanceTo(b),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()));const p=a.clone().add(b).multiplyScalar(.5);add(g,m,p.x,p.y,p.z);}
  const stair=plan.floors[floor].items.find(a=>a.kind==='stairs');
  // Ground-floor finishes vary by household. These are material interpretations, not recorded fittings.
  const finish:InteriorObjectId=!floor&&(home.number%3!==0||home.number===22)?(home.number%7===0?'flagstones':'quarry-tiles'):'board-ceiling';
  const objectMats:Record<ObjectMaterial,T.Material>={oak:woods[0],darkwood:woods[2],iron,steel:mat('#8f9389',undefined,.44,'iron'),copper:mat('#a17b43',undefined,.48,'iron'),cream:ceramic,blue:mat('#394e69',undefined,.4,'ceramic'),clay:earthenware,cloth:blanket,green:mat('#636e54',clothMap,.92,'cloth'),coal:dark,glass:mat('#71867c',undefined,.18,'glass'),lampglass:own(new T.MeshBasicMaterial({color:'#a6bab2',transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide})),paper:mat('#c3b79c',plasterMap,.95,'cloth'),linen:mat('#d0c7ae',clothMap,.97,'cloth'),tile:own(new T.MeshStandardMaterial({color:'#955b43',roughness:.83})),stone:mat('#807b69',plasterMap,.97,'stone')};
  const fabric=own(new T.MeshStandardMaterial({color:blanket.color,map:clothMap,roughness:.98,side:T.DoubleSide}));refineSurface(fabric,'cloth');objectMats.cloth=fabric;for(const key of ['tile','stone','steel'] as const)(objectMats[key] as T.MeshStandardMaterial).vertexColors=true;for(const key of ['steel','copper'] as const)(objectMats[key] as T.MeshStandardMaterial).metalness=.55;
  for(const m of woods)domesticWear(m,plan,floor,base,'wood');
  domesticWear(lime,plan,floor,base,'plaster');domesticWear(brick,plan,floor,base,'brick');
  textureDetail(brick,'fired-brick');
  for(const key of ['iron','steel','copper','cream','blue','clay','cloth','linen','green'] as const){const m=objectMats[key];if(m instanceof T.MeshStandardMaterial)domesticWear(m,plan,floor,base,['iron','steel','copper'].includes(key)?'metal':['cloth','linen','green'].includes(key)?'cloth':'ceramic');}
  const floorMaterials=new Map<T.Material,T.Material>();
  const detailedMaterials=new Map<string,T.MeshStandardMaterial>();
  function objectFinish(id:InteriorObjectId,part:ObjectMaterial,m:T.Material){
   const detail:TextureDetail|undefined=id==='tin-bath'&&part==='steel'?'dull-tin':
    ['open-range','oven-range','hob-stove'].includes(id)&&part==='iron'?'cast-iron':
    ['storage-crock','bread-crock','jug','mixing-bowl','water-crock-stand'].includes(id)&&part==='clay'?'salt-glaze':undefined;
   if(!detail||!(m instanceof T.MeshStandardMaterial))return m;
   const key=detail+'-'+part;
   if(!detailedMaterials.has(key))detailedMaterials.set(key,textureDetail(own(cloneSurface(m)),detail));
   return detailedMaterials.get(key)!;
  }
  function object(id:InteriorObjectId,x:number,y:number,z:number,sx=1,scaleY=1,sz=1,angle=0,tilt=0,floorSurface=false){
   for(const part of interiorObject(id).parts){const g=part.geometry.clone();g.scale(sx,scaleY,sz);g.rotateX(tilt);let m=objectFinish(id,part.material,objectMats[part.material]);if(floorSurface&&m instanceof T.MeshStandardMaterial){if(!floorMaterials.has(m))floorMaterials.set(m,wearFloor(own(cloneSurface(m)),plan,floor,id==='flagstones'?'stone':'wood'));m=floorMaterials.get(m)!;}add(g,m,x,y,z,0,angle);}
  }
  // Quarry tiles use one room-wide 9-inch grid. No stretched edge modules or repeated dark diagonal pattern.
  if(finish==='quarry-tiles'){
   box(0,.006,0,w-.20,.024,d-.20,own(new T.MeshStandardMaterial({color:'#766a59',roughness:.98})));
   const clay=objectMats.tile as T.MeshStandardMaterial;clay.color.set('#ffffff');clay.roughness=.93;wearFloor(clay,plan,floor,'clay');
   const tileRand=seeded(home.number*631+floor*31),pitch=.2286,gap=.003;
   for(let x=-w/2+.10;x<w/2-.10;x+=pitch)for(let z=-d/2+.10;z<d/2-.10;z+=pitch){
    const fw=Math.min(pitch,w/2-.10-x),fd=Math.min(pitch,d/2-.10-z);
    if(fw<=gap||fd<=gap)continue;
    // Small rounded shoulders and isolated corner losses, with a level walking face.
    const hw=(fw-gap)/2-.001,hd=(fd-gap)/2-.001,cut=Math.min(.003+Math.pow(tileRand(),5)*.012,hw*.15,hd*.15),shape=new T.Shape();
    shape.moveTo(-hw+cut,-hd);shape.lineTo(hw-cut,-hd);shape.lineTo(hw,-hd+cut);shape.lineTo(hw,hd-cut);shape.lineTo(hw-cut,hd);shape.lineTo(-hw+cut,hd);shape.lineTo(-hw,hd-cut);shape.lineTo(-hw,-hd+cut);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,steps:1});g.rotateX(-Math.PI/2);
    const palette=['#8c5946','#95634e','#9d6c55','#855a4c','#a16e58','#91604c'];
    const tint=new T.Color(palette[Math.floor(tileRand()*palette.length)]).lerp(new T.Color('#93634e'),.55).multiplyScalar(.92+tileRand()*.10);
    const pos=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+x+fw/2+w/2)/w,1-(pos.getZ(i)+z+fd/2+d/2)/d);
    const colours=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++)tint.toArray(colours,i*3);g.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    add(g,objectMats.tile,x+fw/2,.025,z+fd/2);
   }
  }else{
  // Short metre-scale modules fit the room boundaries and leave the actual stair opening.
  for(let z=-d/2+.10;z<d/2-.10;z+=.72)for(let x=-w/2+.10;x<w/2-.10;x+=.72){
   const fw=Math.min(.72,w/2-.10-x),fd=Math.min(.72,d/2-.10-z);
   const xs=[x,x+fw],zs=[z,z+fd];
   if(floor&&stair){for(const edge of [stair.x-stair.w/2,stair.x+stair.w/2])if(edge>x&&edge<x+fw)xs.push(edge);for(const edge of [stair.z-stair.d/2,stair.z+stair.d/2])if(edge>z&&edge<z+fd)zs.push(edge);}
   xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);
   for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){const cx=(xs[i-1]+xs[i])/2,cz=(zs[j-1]+zs[j])/2;
    if(floor&&stair&&Math.abs(cx-stair.x)<stair.w/2&&Math.abs(cz-stair.z)<stair.d/2)continue;
    object(finish,cx,finish==='board-ceiling'?-.06:0,cz,xs[i]-xs[i-1],1,zs[j]-zs[j-1],0,0,true);
   }
  }
  }
  if(floor&&stair){
   const left=stair.x-stair.w/2,right=stair.x+stair.w/2,back=stair.z-stair.d/2,front=stair.z+stair.d/2;
   box((-w/2+left)/2,-.08,0,left+w/2,.13,d,embedded?lime:dark);
   box((right+w/2)/2,-.08,0,w/2-right,.13,d,embedded?lime:dark);
   box(stair.x,-.08,(-d/2+back)/2,stair.w,.13,back+d/2,embedded?lime:dark);
   if(front<d/2)box(stair.x,-.08,(front+d/2)/2,stair.w,.13,d/2-front,embedded?lime:dark);
   // Lower-storey shell gives the upper cutaway a grounded silhouette.
   if(!embedded){box(0,-base/2,-d/2,w,base,.18,brick);box(-w/2,-base/2,0,.18,base,d,brick);}
  }else box(0,-.08,0,w+.08,.13,d+.08,embedded?lime:dark);
  // Rear wall has actual glazing openings. Front and right wall are cut away for inspection.
  const windowW=.96*home.sx,windowLow=(floor?1.225:1.30)*sy-.45*sy-(embedded?.12:0),windowHigh=windowLow+.9*sy;
  const windows=[-w*.32,w*.32];
  if(embedded){
   const iw=w-.30,id=d-.30;
   for(const side of [-1,1]){
    // Front lining also leaves the existing central doorway clear.
    const cuts=[...windows.map(x=>({left:x-windowW/2,right:x+windowW/2,low:windowLow,high:windowHigh})),
      ...(side===1&&!floor?[{left:-.46*home.sx,right:.46*home.sx,low:0,high:1.98*sy-base}]:[])].sort((a,b)=>a.left-b.left);
    let edge=-iw/2;
    for(const cut of cuts){
     if(cut.left>edge)box((edge+cut.left)/2,wallH/2,side*id/2,cut.left-edge,wallH,.06,lime);
     if(cut.low>0)box((cut.left+cut.right)/2,cut.low/2,side*id/2,cut.right-cut.left,cut.low,.06,lime);
     if(cut.high<wallH)box((cut.left+cut.right)/2,(cut.high+wallH)/2,side*id/2,cut.right-cut.left,wallH-cut.high,.06,lime);
     edge=cut.right;
    }
    if(edge<iw/2)box((edge+iw/2)/2,wallH/2,side*id/2,iw/2-edge,wallH,.06,lime);
    box(side*iw/2,wallH/2,0,.06,wallH,id,lime);
   }
   // The next floor supplies the ground-floor ceiling and its real stair opening.
   if(floor===plan.floors.length-1)box(0,wallH-.035,0,iw,.07,id,lime);
  }else{
  let last=-w/2;
  for(const wx of windows){const left=wx-windowW/2;box((last+left)/2,wallH/2,-d/2,left-last,wallH,.17,lime);box(wx,windowLow/2,-d/2,windowW,windowLow,.17,lime);box(wx,(windowHigh+wallH)/2,-d/2,windowW,wallH-windowHigh,.17,lime);last=wx+windowW/2;}
  box((last+w/2)/2,wallH/2,-d/2,w/2-last,wallH,.17,lime);
  box(-w/2,wallH/2,0,.18,wallH,d,lime);
  box(w/2,.17,0,.18,.34,d,lime);
  for(const side of [-1,1])box(side*(w/4+.26),.17,d/2,w/2-.52,.34,.18,lime);
  // Exposed cut surfaces, dark skirting, door jamb stumps and worn sill.
  box(-w/2,wallH+.015,0,.19,.035,d,stone);box(w/2,.35,0,.19,.025,d,stone);
  box(-w/2+.105,.12,0,.045,.17,d-.18,woods[2]);box(0,.12,-d/2+.10,w-.20,.17,.045,woods[2]);
  for(const side of [-1,1])box(side*.51,.29,d/2,.06,.57,.21,woods[1]);box(0,.04,d/2,.98,.08,.36,stone);
  }
  const glass=own(new T.MeshPhysicalMaterial({color:'#a4b7ae',transparent:true,opacity:.37,roughness:.18,metalness:.10,depthWrite:false,side:T.DoubleSide}));
  refineSurface(glass,'glass');
  if(!embedded)for(const wx of windows){const mid=(windowLow+windowHigh)/2,wh=windowHigh-windowLow;
   for(const dx of [-windowW/2,0,windowW/2])box(wx+dx,mid,-d/2+.07,.04,wh+.08,.07,woods[1]);
   for(const yy of [windowLow,mid,windowHigh])box(wx,yy,-d/2+.07,windowW+.06,.036,.07,woods[1]);
   box(wx,windowLow-.07,-d/2+.1,windowW+.18,.09,.35,stone);
   const pane=new T.Mesh(own(new T.PlaneGeometry(windowW-.04,wh-.04)),glass);pane.position.set(wx,mid+base,-d/2+.035);root.add(pane);
   // Window latch; no modern handles or giant reflective panes.
   box(wx+.07,mid,-d/2+.13,.14,.022,.025,iron);
  }
  if(embedded)for(const side of [-1,1])for(const wx of windows){
   // Deep timber reveals cover the coarse brick edges of the authored opening.
   // Stand 25 mm proud of the plaster, rather than sharing its visible plane.
   // Jambs end at the rails so their front faces cannot overlap at the corners.
   const mid=(windowLow+windowHigh)/2,z=side*(d/2-.055),rail=.065;
   for(const dx of [-1,1])box(wx+dx*(windowW/2-.075*home.sx),mid,z,.16*home.sx,windowHigh-windowLow-rail,.30,woods[1]);
   for(const yy of [windowLow,windowHigh])box(wx,yy,z,windowW+.01*home.sx,rail,.30,woods[1]);
  }
  // One rough transverse ceiling tie remains, but the roof is removed.
  box(-w*.18,wallH-.09,0,.14,.18,d,woods[1]);
  function bowl(x:number,y:number,z:number,r=.1,m:T.Material=ceramic){const pts=[new T.Vector2(0,0),new T.Vector2(r*.6,.015),new T.Vector2(r,.11),new T.Vector2(r*.9,.12),new T.Vector2(r*.48,.045),new T.Vector2(0,.045)];add(new T.LatheGeometry(pts,14),m,x,y,z);}
  function jug(x:number,y:number,z:number){const pts=[new T.Vector2(0,0),new T.Vector2(.07,0),new T.Vector2(.105,.12),new T.Vector2(.07,.20),new T.Vector2(.065,.27),new T.Vector2(.052,.27),new T.Vector2(.055,.20)];add(new T.LatheGeometry(pts,14),earthenware,x,y,z);add(new T.TorusGeometry(.065,.015,5,14),earthenware,x+.095,y+.15,z);}
  function foldedLinen(x:number,y:number,z:number,width=.38){
   // Uneven folded cloth layers, stitched ends and a small rolled piece.
   for(let i=0;i<3;i++){box(x+(i%2)*.014,y+i*.035,z,width-i*.024,.034,.26-i*.013,i%2?blanket:cream);for(let j=0;j<3;j++)box(x-width/2+.04+j*.026,y+i*.035+.019,z,.007,.003,.23-i*.013,woods[2]);}
  }
  function hangingCloth(x:number,y:number,z:number,width:number,length:number,m:T.Material,ry=0){
   const g=new T.PlaneGeometry(width,length,15,22),p=g.attributes.position;
   for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i);p.setZ(i,.027*Math.sin(xx*37)+.012*Math.cos(yy*11));p.setY(i,yy+.012*Math.sin(xx*22));}g.computeVertexNormals();add(g,m,x,y-length/2,z,0,ry);
  }
  function furniture(a:Furnishing){const x=a.x,z=a.z,ww=a.w,dd=a.d,wood=woods[a.variant%4];
   if(a.kind==='partition'){
    // Full-height boards in the village; low boards keep the cutaway readable.
    const partitionH=embedded?Math.min(wallH,1.9):.68;
    box(x,partitionH/2,z,.10,partitionH,dd,woods[2]);box(x,partitionH+.02,z,.14,.06,dd+.025,wood);
    for(let i=0;i<Math.ceil(dd/.17);i++)box(x+.057,.35,z-dd/2+(i+.5)*dd/Math.ceil(dd/.17),.016,.64,.012,dark);
    for(const dz of [-dd/2+.04,dd/2-.04])box(x,.41,z+dz,.13,.82,.09,wood);
   }else if(a.kind==='fuelbucket'){
    const r=ww*.46;const pts=[new T.Vector2(r*.70,.025),new T.Vector2(r,.30),new T.Vector2(r*.92,.31),new T.Vector2(r*.82,.07)];
    add(new T.LatheGeometry(pts,14),iron,x,0,z);add(new T.TorusGeometry(r,.011,5,18),iron,x,.30,z,Math.PI/2);
    for(let i=0;i<7;i++)sphere(x+(rand()-.5)*r,.20+rand()*.055,z+(rand()-.5)*r,.035,.025,.030,dark);
    add(new T.TorusGeometry(r*.80,.010,5,16,Math.PI),iron,x,.30,z);
   }else if(a.kind==='flue'){
    box(x,wallH/2,z,ww,wallH,dd,lime);box(x,.10,z,ww+.05,.18,dd+.05,woods[2]);
    box(x+ww/2+.009,.48,z,.018,.36,.29,iron); // Small soot-door in the chimney breast.
    sphere(x+ww/2+.03,.48,z+.08,.024,.024,.024,iron);
   }else if(a.kind==='linenbench'){
    for(const dx of [-ww*.40,ww*.40])for(const dz of [-dd*.35,dd*.35])box(x+dx,.215,z+dz,.06,.43,.06,wood);
    for(let i=0;i<3;i++)box(x,.46,z-dd/2+dd*(i+.5)/3,ww,.055,dd/3-.008,wood);
    box(x,.18,z,ww-.1,.045,.035,wood);foldedLinen(x-ww*.24,.51,z,.36);foldedLinen(x+ww*.23,.51,z,.30);
   }else if(a.kind==='clothesrail'){
    for(const dx of [-ww*.45,ww*.45]){for(const side of [-1,1])rod(new T.Vector3(x+dx,.02,z+side*dd*.44),new T.Vector3(x+dx,1.40,z),.024,wood);}
    rod(new T.Vector3(x-ww/2,1.40,z),new T.Vector3(x+ww/2,1.40,z),.027,wood);
    rod(new T.Vector3(x-ww*.45,.40,z-dd*.28),new T.Vector3(x+ww*.45,.40,z-dd*.28),.018,wood);
    hangingCloth(x-ww*.22,1.41,z+.034,.29,.88,cream);
    hangingCloth(x+ww*.20,1.41,z+.036,.28,1.06,blanket);
    // A second folded section hangs behind the rail, showing cloth weight over timber.
    hangingCloth(x-ww*.22,1.39,z-.034,.29,.39,cream,Math.PI);
   }else if(a.kind==='basket'){
    const r=ww*.48;
    const pts=[new T.Vector2(r*.70,.025),new T.Vector2(r*.95,.32),new T.Vector2(r,.35),new T.Vector2(r*.90,.35),new T.Vector2(r*.85,.31),new T.Vector2(r*.63,.05)];
    add(new T.LatheGeometry(pts,20),woods[0],x,.01,z);
    for(let i=0;i<9;i++)add(new T.TorusGeometry(r*(.72+i*.029),.008,5,24),woods[i%2],x,.04+i*.035,z,Math.PI/2);
    for(let i=0;i<16;i++){const t=i*Math.PI/8;rod(new T.Vector3(x+Math.sin(t)*r*.70,.04,z+Math.cos(t)*r*.70),new T.Vector3(x+Math.sin(t)*r*.95,.34,z+Math.cos(t)*r*.95),.006,woods[2]);}
    for(const side of [-1,1])add(new T.TorusGeometry(.065,.012,6,14),woods[0],x+side*r*.92,.36,z,0,Math.PI/2);
    foldedLinen(x,.25,z,.27);
   }else if(a.kind==='hearth'){
    // The chimney breast is on the exterior stack's gable. The fire opens into the room (+X).
    const face=x+ww/2;box(x,.04,z,ww+.13,.09,dd+.17,stone);
    box(x-ww*.32,wallH/2,z,ww*.36,wallH,dd,brick);
    for(const side of [-1,1])box(x+.03,.62,z+side*(dd/2-.07),ww-.16,1.24,.14,brick);
    box(x+.02,1.25,z,ww-.08,.22,dd,brick);box(x-.08,(wallH+1.36)/2,z,ww-.24,wallH-1.36,dd-.10,brick);
    box(face-.06,1.42,z,.24,.09,dd+.21,woods[1]);box(x-.12,.54,z,.03,.85,dd-.40,dark);

    for(let i=0;i<5;i++)sphere(face-.18,.25,z+(rand()-.5)*dd*.5,.07,.035,.055,dark);
    // A small banked coal fire in the grate; its light comes from the shared pool.
    hearthFire=createFire({width:Math.min(.34,dd*.4),depth:.2,flameHeight:.17,tongues:5,sparks:8,smoke:new T.Vector3(-.05,.55,0),light:{intensity:1.0,distance:3.2,offset:new T.Vector3(.3,.28,0)},heat:.8,seed:plan.seed%997});
    hearthFire.group.position.set(face-.16,base+.2,z);hearthFire.group.rotation.y=Math.PI/2;root.add(hearthFire.group);

    for(let i=0;i<2;i++){rod(new T.Vector3(face-.08,.10,z+dd*.40-i*.09),new T.Vector3(face-.13,.94,z+dd*.43-i*.09),.012,iron);add(new T.TorusGeometry(.027,.008,5,10),iron,face-.13,.97,z+dd*.43-i*.09,0,Math.PI/2);}
    for(const side of [-1,1]){cylinder(face-.06,1.51,z+side*dd*.34,.026,.035,.09,ceramic);cylinder(face-.06,1.64,z+side*dd*.34,.018,.018,.18,cream);}
   }else if(a.kind==='bed'||a.kind==='pallet'){
    const pallet=a.kind==='pallet',bh=pallet?.12:.44;
    if(!pallet){for(const dx of [-ww/2+.065,ww/2-.065])for(const dz of [-dd/2+.065,dd/2-.065]){box(x+dx,.37,z+dz,.07,.74,.07,wood);sphere(x+dx,.75,z+dz,.045,.05,.045,wood);}for(const dx of [-ww/2+.06,ww/2-.06])box(x+dx,.35,z,.07,.12,dd,wood);for(const dz of [-dd/2+.06,dd/2-.06]){box(x,.54,z+dz,ww-.05,.28,.04,wood);for(let k=0;k<4;k++)box(x-ww*.35+k*ww*.23,.34,z+dz,.035,.4,.035,wood);}}
    box(x,bh,z,ww-.08,.18,dd-.08,cream);sphere(x,bh+.15,z-dd*.31,ww*.39,.09,.23,cream);
    const quilt=new T.PlaneGeometry(ww-.015,dd*.68,24,24);quilt.rotateX(-Math.PI/2);const pos=quilt.attributes.position;
    for(let i=0;i<pos.count;i++){const xx=pos.getX(i),zz=pos.getZ(i);pos.setY(i,.012*Math.sin(xx*28+zz*4)+.018*Math.sin(zz*13)+.04*Math.cos(xx/ww*Math.PI));}quilt.computeVertexNormals();add(quilt,blanket,x,bh+.105,z+dd*.14);
    for(let k=0;k<3;k++)box(x,bh+.151,z+dd*(.16+k*.07),ww-.10,.005,.021,cream);
   }else if(a.kind==='table'||a.kind==='washstand'){
    const height=a.kind==='table'?.76:.79;
    for(const dx of [-ww/2+.055,ww/2-.055])for(const dz of [-dd/2+.05,dd/2-.05])box(x+dx,height/2,z+dz,.055,height,.055,wood);
    for(const dx of [-ww/2+.055,ww/2-.055])box(x+dx,.22,z,.04,.045,dd-.07,wood);
    for(let i=0;i<4;i++)box(x-ww/2+ww*(i+.5)/4,height,z,ww/4-.009,.065,dd,wood);
    if(a.kind==='table'){bowl(x-ww*.20,height+.035,z-.06,.105);jug(x+ww*.23,height+.04,z-.13);box(x+.04,height+.039,z+.14,.24,.016,.11,woods[0]);sphere(x+.01,height+.077,z+.14,.075,.03,.046,mat('#b19255'));}
    else{bowl(x,height+.034,z,.18,ceramic);jug(x+ww*.33,height+.04,z-.02);box(x,.32,z,ww-.10,.04,dd-.06,wood);bowl(x,.35,z,.11,earthenware);}
   }else if(a.kind==='stool'){
    cylinder(x,.44,z,ww*.52,ww*.49,.055,wood,10);for(let i=0;i<3;i++){const t=i*Math.PI*2/3;rod(new T.Vector3(x+Math.sin(t)*ww*.35,.42,z+Math.cos(t)*dd*.35),new T.Vector3(x+Math.sin(t)*ww*.46,.04,z+Math.cos(t)*dd*.46),.024,wood);}
   }else if(a.kind==='cupboard'){
    box(x,.58,z,ww,1.16,dd,wood);box(x,.59,z+dd/2+.014,ww-.08,1.03,.034,woods[(a.variant+1)%4]);for(const side of [-1,1]){box(x+side*(ww/2-.025),.6,z+dd/2+.04,.03,1.14,.027,wood);box(x,.60+side*.44,z+dd/2+.04,ww-.05,.03,.027,wood);}sphere(x+ww*.28,.61,z+dd/2+.055,.022,.022,.028,iron);for(const yy of [.28,.9])box(x-ww*.37,yy,z+dd/2+.044,.065,.022,.012,iron);bowl(x-ww*.2,1.17,z,.1);jug(x+ww*.2,1.17,z);
   }else if(a.kind==='chest'){
    box(x,.23,z,ww,.42,dd,wood);box(x,.46,z,ww+.025,.05,dd+.025,woods[(a.variant+1)%4]);for(const dx of [-ww*.30,ww*.30]){box(x+dx,.245,z+dd/2+.012,.033,.43,.018,iron);box(x+dx,.49,z,.033,.01,dd+.03,iron);}box(x,.39,z+dd/2+.026,.055,.075,.015,iron);if(floor||a.variant%2===0)foldedLinen(x-ww*.12,.51,z,.30);
   }else if(a.kind==='stairs'){
    if(!floor){for(let i=0;i<11;i++){const zz=z+dd/2-dd*(i+.5)/11,yy=(i+1)*levelHeight/11;box(x,yy,zz,ww,.055,dd/11+.025,wood);}for(const dx of [-ww*.46,ww*.46])rod(new T.Vector3(x+dx,.10,z+dd/2),new T.Vector3(x+dx,levelHeight,z-dd/2),.045,wood);}
    else{for(const side of [-1,1]){for(let i=0;i<6;i++)box(x+side*ww/2,.42,z-dd/2+i*dd/5,.04,.84,.04,wood);box(x+side*ww/2,.85,z,.045,.055,dd+.08,wood);}box(x,.85,z+dd/2,ww,.055,.045,wood);}
   }
  }
  const dressing=planDressing(home,plan,floor,sy);
  const replaced=new Set(dressing.filter(p=>p.role==='core').map(p=>p.anchor));
  for(const item of plan.floors[floor].items)if(item.kind==='hearth'||!replaced.has(item.id))furniture(item);
  for(const p of dressing){
   if(!embedded&&p.id==='curtains'&&p.z>0)continue; // Front wall is removed in the cutaway.
   const curtainOffset=!embedded&&p.id==='curtains'?.12:0;
   object(p.id,p.x,p.y+.03+curtainOffset,p.z,p.sx,p.sy,p.sz,p.angle,p.tilt??0);
   if(home.number===22&&floor===0&&p.id==='oil-lamp'&&p.anchor.includes('-table-')){
    lampFlame=new T.Mesh(own(new T.SphereGeometry(1,12,8)),own(new T.MeshBasicMaterial({color:'#ffe2a3'})));
    lampFlame.position.set(p.x,base+p.y+.03+.162*p.sy,p.z);lampFlame.scale.set(.008,.023,.008);root.add(lampFlame);
    lampGlow=roomLight(lampFlame.parent??root,lampFlame.position.clone(),'#ffbd70',.55,3.5);
    root.userData.litOilLamp={anchor:p.anchor,position:lampFlame.position.toArray()};
   }

   if(p.role==='wall'&&['rear-wall-hanging','hearth-tools'].includes(p.anchor)){
    const top=p.y+.03+interiorObject(p.id).bounds.max.y*p.sy;
    const start=p.anchor==='hearth-tools'?new T.Vector3(-w/2+.18,top,p.z):new T.Vector3(p.x,top,-d/2+.18);
    const end=new T.Vector3(p.x,top,p.z);rod(start,end,.006,iron);cylinder(end.x,top+.005,end.z,.010,.010,.019,iron,8);
   }
   if(p.id==='curtains')for(const dx of [-.60,.60]){const side=p.z<0?-1:1;rod(new T.Vector3(p.x+dx*p.sx,p.y+.03+curtainOffset+1.09*p.sy,side*(d/2-.18)),new T.Vector3(p.x+dx*p.sx,p.y+.03+curtainOffset+1.09*p.sy,p.z),.007,iron);}
  }
  const table=plan.floors[floor].items.find(a=>a.kind==='table');
  if(table&&home.number%3!==0)object('rag-rug',table.x,.03,table.z,Math.min(1.3,table.w/.9),.12,Math.min(1.2,(table.d+.7)/1.28));
  // Timber boards are visible overhead inside; cutaways retain their open viewing plane.
  if(embedded)for(let z=-d/2+.18;z<d/2-.18;z+=1)for(let x=-w/2+.18;x<w/2-.18;x+=1){
   const cw=Math.min(1,w/2-.18-x),cd=Math.min(1,d/2-.18-z),xs=[x,x+cw],zs=[z,z+cd];
   if(floor<plan.floors.length-1&&stair){for(const edge of [stair.x-stair.w/2,stair.x+stair.w/2])if(edge>x&&edge<x+cw)xs.push(edge);for(const edge of [stair.z-stair.d/2,stair.z+stair.d/2])if(edge>z&&edge<z+cd)zs.push(edge);}
   xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);
   for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){const cx=(xs[i-1]+xs[i])/2,cz=(zs[j-1]+zs[j])/2;if(floor<plan.floors.length-1&&stair&&Math.abs(cx-stair.x)<stair.w/2&&Math.abs(cz-stair.z)<stair.d/2)continue;object('board-ceiling',cx,wallH-.11,cz,xs[i]-xs[i-1],1,zs[j]-zs[j-1]);}
  }
  root.userData.interiorObjects=dressing;root.userData.floorFinish=finish;
  if(floor||plan.width>7){
   // Pegs and spare clothes occupy the gable wall, above floor-level circulation.
   const hz=-d*.29;box(-w/2+.115,1.65,hz,.055,.09,.91,woods[1]);
   for(let i=0;i<4;i++){const zz=hz-.34+i*.23;rod(new T.Vector3(-w/2+.14,1.65,zz),new T.Vector3(-w/2+.25,1.68,zz),.017,woods[1]);}
   hangingCloth(-w/2+.26,1.64,hz-.21,.27,.81,cream,Math.PI/2);
   hangingCloth(-w/2+.27,1.64,hz+.20,.28,1.05,blanket,Math.PI/2);
   // A candle and simple bowl are set on the window sill rather than the floor.
   const wx=-w*.32;cylinder(wx,windowLow+.01,-d/2+.14,.07,.075,.03,earthenware);cylinder(wx,windowLow+.12,-d/2+.14,.02,.02,.19,cream);
  }
  // Wall fittings and their supported contents come from the shared dressing plan.
  if(plan.floors[floor].curtain&&!plan.floors[floor].items.some(a=>a.kind==='partition')){
   const bed=plan.floors[floor].items.find(a=>a.kind==='bed')!;
   const cx=bed.x-bed.w/2-.20,startZ=bed.z-bed.d/2+.08,length=1.05;
   // A partly drawn head-of-bed screen, never a full wall across the window or passage.
   rod(new T.Vector3(cx,1.70,startZ),new T.Vector3(cx,1.70,startZ+length),.022,woods[1]);
   const g=new T.PlaneGeometry(.58,1.34,18,18),p=g.attributes.position;
   for(let i=0;i<p.count;i++)p.setZ(i,.038*Math.sin(p.getX(i)*48));g.computeVertexNormals();
   add(g,cream,cx,1.00,startZ+.31,0,Math.PI/2);
  }
  for(const [material,parts]of batches){const g=own(mergeGeometries(parts));parts.forEach(p=>p.dispose());const m=new T.Mesh(g,material);m.castShadow=material!==objectMats.tile&&material!==objectMats.lampglass;m.receiveShadow=true;if(material===objectMats.lampglass){m.layers.set(1);m.userData.lampChimney=true;}if(material===objectMats.tile)m.userData.quarryFloor={pitch:.2286,gap:.003};root.add(m);}
  if(!embedded){const ambient=new T.HemisphereLight('#e7dec7','#726049',1.15);root.add(ambient);}
  const targetPoint=localPoint(home,0,0),cameraPoint=localPoint(home,w*.924,d*1.152);
  active={group:root,plan,floor,floors:plan.floors.length,target:new T.Vector3(targetPoint[0],home.height+base+.8,targetPoint[1]),camera:new T.Vector3(cameraPoint[0],home.height+base+Math.max(w,d)*1.02+2.88,cameraPoint[1])};
  root.userData.interiorPlan=plan;root.userData.home=home;if(home.number===22&&floor===0)removeStatue=addHenryStatue(root,base);return active;
 }
 return {show,hide,setFloor(floor:number){return active?show(active.group.userData.home as Home,floor):null;},get active(){return active;},update(time:number){clock=time;if(lampGlow)lampGlow.intensity=.55+.015*Math.sin(clock*3.7)+.008*Math.sin(clock*8.1);if(lampFlame)lampFlame.scale.y=.023+.001*Math.sin(clock*4.3);if(glow)glow.intensity=.85+.12*Math.sin(clock*4.7)+.06*Math.sin(clock*9.1);hearthFire?.update(clock);if(flame)flame.scale.y=.45+.10*Math.sin(clock*5.7);}};
}
