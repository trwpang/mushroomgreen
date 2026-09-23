import * as T from 'three';
import {DetailBatch} from './detail-batch';
import {propGroundIssue} from './prop-placement';
import {siteIssue,setSiteReservations,type ReservedSite} from './site-reservations';
import {industryClear,insideSite} from './historic-plan';
import {localPoint,ground,addGroundPlatforms,type Home,type Point} from './layout';
import {refineSurface} from '../rendering/surfaces';
import {textureDetail} from './texture-detail';
export interface BackyardShop extends ReservedSite {home:number;y:number;variant:number;access:Point[];}
export function workshopPoint(s:ReservedSite,x:number,z:number):Point{return [s.p[0]+Math.cos(s.angle)*x+Math.sin(s.angle)*z,s.p[1]-Math.sin(s.angle)*x+Math.cos(s.angle)*z];}
export function planBackyardWorkshops(homes:Home[],paths:Point[][]=[]){
 setSiteReservations([]);const out:BackyardShop[]=[];const reserved:ReservedSite[]=[];
 // Small plots first. Larger yards can tolerate a later position choice.
 const order=homes.filter(h=>![5,22].includes(h.number)).sort((a,b)=>a.width*a.depth-b.width*b.depth||a.number-b.number);
 for(const h of order){const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;let found:BackyardShop|undefined;
  for(const size of [[3.9,3.05],[3.15,2.65],[2.45,2.25]]){if(found)break;
   for(const back of [5.0,6.2,8.6,11,13.2,15.4]){if(found)break;for(const side of [0,1,-1,.5,-.5,1.5,-1.5,2,-2]){
    const p=localPoint(h,side*(w/2+1.6),-d/2-back),candidate:BackyardShop={p,angle:h.angle+(h.number%4===0?.08:-.03),width:size[0],depth:size[1],kind:'backyard workshop',home:h.number,y:ground(...p),variant:h.number%4,access:[]};
    const samples:Point[]=[];for(let x=-size[0]/2-.35;x<=size[0]/2+.36;x+=.3)for(let z=-size[1]/2-.35;z<=size[1]/2+1.45;z+=.3)samples.push(workshopPoint(candidate,x,z));
    if(samples.some(q=>!insideSite(...q)||!industryClear(...q,1)||propGroundIssue(q,homes,paths)||siteIssue(q,.35)))continue;
    if(homes.some(o=>o!==h&&o.number!==5&&Math.hypot(p[0]-o.x,p[1]-o.z)<Math.hypot(p[0]-h.x,p[1]-h.z)*.6))continue;
    const levels=samples.map(q=>ground(...q));if(Math.max(...levels)-Math.min(...levels)>1.0)continue;
    const door=workshopPoint(candidate,-size[0]*.22,size[1]/2+.7);
    for(const accessSide of [side<0?-1:1,side<0?1:-1]){
     const to=localPoint(h,accessSide*(w/2+2.1),-d/2-2.2);
     const route=[door,localPoint(h,accessSide*(w/2+2.1),-d/2-back+size[1]/2+1.05),to];
     const clear=route.every((a,i)=>i===0||Array.from({length:21},(_,j)=>{const b=route[i-1];return [b[0]+(a[0]-b[0])*j/20,b[1]+(a[1]-b[1])*j/20] as Point;}).every(q=>!propGroundIssue(q,homes,paths)&&!siteIssue(q,.25)));
     if(clear){candidate.access=route;break;}
    }
    if(!candidate.access.length)continue;
    found=candidate;break;
   }}
  }
  if(found){out.push(found);reserved.push(found);for(let i=1;i<found.access.length;i++){const a=found.access[i-1],b=found.access[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>.1)reserved.push({p:[(a[0]+b[0])/2,(a[1]+b[1])/2],angle:-Math.atan2(b[1]-a[1],b[0]-a[0]),width:l,depth:1.0,kind:'workshop access',home:h.number});}setSiteReservations([...reserved]);}
 }
 return out;
}
export function levelBackyardWorkshops(shops:BackyardShop[]){addGroundPlatforms(shops.map(s=>({x:s.p[0],z:s.p[1],angle:s.angle,w:s.width/2+.18,d:s.depth/2+.18,y:s.y})));}
export function addBackyardWorkshops(scene:T.Scene,shops:BackyardShop[]){
 const b=new DetailBatch();b.root.name='Cottage nail and chain shops';
 const mat=(name:string,color:string,kind:Parameters<typeof refineSurface>[1])=>refineSurface(new T.MeshStandardMaterial({name,color,roughness:.94}),kind);
 const brick=textureDetail(mat('Workshop mottled brick','#76513e','brick'),'fired-brick'),mortar=mat('Workshop dark mortar','#554f41','plaster'),lime=mat('Workshop interior limewash','#a49e87','plaster'),wood=mat('Workshop patched boards','#65513b','wood'),tile=textureDetail(mat('Workshop old roof tiles','#554c40','slate'),'split-slate'),iron=textureDetail(mat('Workshop pitted iron','#37352e','iron'),'cast-iron'),coal=mat('Workshop coal','#292824','coal'),stone=mat('Workshop small floor pavers','#756950','stone');
 const glass=new T.MeshStandardMaterial({name:'Workshop glass',color:'#647873',roughness:.24,metalness:.3});
 for(const s of shops){const w=s.width,d=s.depth,e=1.93+(s.home%3)*.1,rise=.55,y=s.y;
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.angle);
  const p=(x:number,h:number,z:number)=>{const a=workshopPoint(s,x,z);return new T.Vector3(a[0],y+h,a[1]);};
  const box=(x:number,h:number,z:number,dx:number,dy:number,dz:number,m:T.Material,rx=0,rz=0,tone=1)=>b.block(m,p(x,h,z),new T.Vector3(dx,dy,dz),q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(rx,0,rz))),tone);
  const beam=(a:number[],c:number[],rad:number,m:T.Material=wood)=>b.beam(m,p(a[0],a[1],a[2]),p(c[0],c[1],c[2]),rad);
  // A foundation skirt supports the tiny level working floor on the sloping yard.
  box(0,-.2,0,w+.12,.4,d+.12,mortar);
  for(let x=-w/2+.15;x<w/2;x+=.29)for(let z=-d/2+.13;z<d/2;z+=.25)box(x,.035,z,.28,.07,.24,stone,0,0,.8+((Math.floor(x*9+z*7)+s.home)%7+7)%7*.04);
  const wall=(x:number,z:number,length:number,turn:boolean,front=false)=>{
   // Mortar cores stop daylight showing between the brick courses. Real door/window openings stay open.
   if(!front)box(x,e/2,z,turn?.18:length,e,turn?length:.18,mortar);
   else {const dl=-w*.22-.46,dr=-w*.22+.46,wl=w*.08,wr=w*.38;
    for(const [a,b]of [[-w/2,dl],[dr,wl],[wr,w/2]])box((a+b)/2,e/2,z,b-a,e,.18,mortar);
    box((dl+dr)/2,(1.76+e)/2,z,dr-dl,e-1.76,.18,mortar);
    box((wl+wr)/2,.435,z,wr-wl,.87,.18,mortar);box((wl+wr)/2,(1.6+e)/2,z,wr-wl,e-1.6,.18,mortar);
   }
   if(s.variant===3&&!front){
    const n=Math.ceil(length/.17);for(let j=0;j<n;j++){const along=-length/2+(j+.5)*length/n;
     box(turn?x:x+along,e/2,turn?z+along:z,turn?.215:length/n-.009,e-.015,turn?length/n-.009:.215,wood,0,0,.71+((j*7+s.home)%11)*.045);
    }
    for(const height of [.28,1.65])box(x,height,z,turn?.235:length,.09,turn?length:.235,wood);
    return;
   }
   const rows=Math.ceil(e/.115),cols=Math.ceil(length/.245),step=length/cols;
   for(let row=0;row<rows;row++){const h=(row+.5)*e/rows;for(let col=-1;col<cols;col++){
    const start=Math.max(-length/2,-length/2+(col+(row%2)*.5)*step),end=Math.min(length/2,-length/2+(col+1+(row%2)*.5)*step);if(end-start<.03)continue;const piece=end-start,along=(start+end)/2;const door=front&&Math.abs(along+w*.22)<.46&&h<1.76,window=front&&along>w*.08&&along<w*.38&&h>.87&&h<1.6;
    if(door||window)continue;
    const px=turn?x:x+along,pz=turn?z+along:z;

    // Exterior brick stays exposed. Pale limewash belongs only to the hearth interior.
    // Low courses retain damp staining; upper courses darken below the eaves.
    const variation=.82+((row*7+col*13+s.home+22)%11)*.027;
    const damp=1-.17*Math.exp(-h/.34),soot=1-.10*Math.exp(-(e-h)/.25);
    box(px,h,pz,turn?.202:piece-.014,e/rows-.012,turn?piece-.014:.202,brick,0,0,variation*damp*soot);

   }}
  };
  wall(0,-d/2,w,false);wall(-w/2,0,d,true);wall(w/2,0,d,true);wall(0,d/2,w,false,true);
  const slope=Math.atan2(rise,d/2+.14),roofLength=Math.hypot(d/2+.14,rise);
  // Individually laid overlapping tiles, with repairs and chipped colour variation.
  for(const side of [-1,1])for(let row=0;row<8;row++){const t=(row+.5)/8;for(let col=0,n=Math.ceil((w+.35)/.24);col<n;col++){
   const x=-(w+.35)/2+(col+.5)*(w+.35)/n,z=side*(d/2+.14)*t;
   box(x,e+rise*(1-t)+.055+(7-row)*.009+((col*3+row)%5)*.0015,z,(w+.35)/n-.007,.055,roofLength/8+.045,tile,side*slope,0,.72+((col*7+row*11+s.home)%13)*.04);
  }}
  for(let x=-w/2;x<w/2;x+=.25)box(x,e+rise+.08,0,.26,.1,.18,tile);
  for(const side of [-1,1]){beam([-w/2-.1,e+.015,side*(d/2+.15)],[w/2+.1,e+.015,side*(d/2+.15)],.052);beam([side*w/2,e,-d/2],[side*w/2,e+rise,0],.055);beam([side*w/2,e+rise,0],[side*w/2,e,d/2],.055);}
  // Gable infill: horizontal weatherboards terminate at the sloping roof.
  for(const side of [-1,1])for(let j=0;j<5;j++)box(side*w/2,e+rise*(j+.5)/5,0,.14,rise/5-.012,d*(1-(j+.5)/5),wood);
  const doorX=-w*.22;
  for(const x of [doorX-.49,doorX+.49])box(x,.91,d/2+.13,.08,1.82,.10,wood);
  box(doorX,1.84,d/2+.13,1.07,.10,.13,wood);box(doorX,.075,d/2+.2,1.07,.11,.44,stone);
  // An open braced door projects from its real hinge, clear of the threshold.
  for(let j=0;j<5;j++)box(doorX-.53,.86,d/2+.20+j*.16,.065,1.69,.153,wood,0,0,.82+j*.045);
  for(const h of [.30,1.35])box(doorX-.49,h,d/2+.51,.035,.065,.78,iron);
  beam([doorX-.49,.31,d/2+.17],[doorX-.49,1.36,d/2+.88],.027);
  const wx=w*.23;box(wx,1.24,d/2,.63,.66,.035,glass);
  for(const x of [wx-.36,wx,wx+.36])box(x,1.24,d/2+.14,.045,.83,.05,wood);
  for(const h of [.82,1.24,1.66])box(wx,h,d/2+.14,.77,.05,.06,wood);
  box(wx,.78,d/2+.18,.87,.09,.29,stone);
  // One small L-shaped hearth/workbase. Keep the entrance and central floor clear.
  const hx=w/2-.62,hz=-d/2+.47;
  box(hx,.38,hz,.86,.76,.64,mortar);box(hx,.78,hz,.83,.11,.63,iron);box(hx,.85,hz,.55,.09,.4,coal);
  box(hx,.37,hz+.72,.62,.74,.78,wood);box(hx,.77,hz+.72,.73,.1,.62,iron);box(hx,.89,hz+.72,.36,.14,.2,iron);
  beam([hx,1.04,hz+.72],[hx+.24,1.04,hz+.72],.055,iron);
  box(hx,1.45,-d/2+.25,.93,1.03,.26,s.variant===3?mortar:lime);
  // Four-sided flue with a dark recess below an OPEN mouth.
  const cy=e+rise+.52,cx=hx,cz=-d*.24,outer=.48,inner=.25;
  for(const side of [-1,1]){box(cx+side*(outer+inner)/4,cy-.39,cz,(outer-inner)/2,.78,outer,brick);box(cx,cy-.39,cz+side*(outer+inner)/4,inner,.78,(outer-inner)/2,brick);box(cx+side*.202,cy+.02,cz,.105,.095,.56,stone);box(cx,cy+.02,cz+side*.202,.30,.095,.105,stone);}
  box(cx,cy-.42,cz,.25,.018,.25,coal);
  beam([-w/2+.15,1.87,hz+.68],[w/2-.15,1.87,hz+.68],.065);
  beam([hx,1.87,hz+.68],[hx,1.4,hz+.68],.007,iron);
  b.link(iron,p(hx,1.30,hz+.68),new T.Vector3(.105,.105,.105),q);
  // Chain or nail stock belongs beside the bench, never scattered over the approach.
  for(let j=0;j<15;j++){const x=hx-.38+Math.sin(j*2.4)*.16,z=hz+.35+Math.cos(j*2.4)*.17;
   if(s.home%3)b.link(iron,p(x,.13+(j%4)*.025,z),new T.Vector3(.064,.035,.047),q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2,j*.8,0))));
   else beam([x,.12,z],[x+.2,.13,z+.035],.009,iron);
  }
  for(let j=0;j<9;j++)b.rock(coal,p(hx+.04*Math.sin(j),.86+(j%3)*.025,hz+Math.cos(j)*.15),new T.Vector3(.07,.04,.065),q,.8+j*.025);
 }
 const result=b.finish();scene.add(result.root);return {...result,count:shops.length};
}
