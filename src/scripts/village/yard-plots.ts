import {gardenHedgeGeometry,cabbageGeometry,foliageMaterial,FOLIAGE_LAYER} from './foliage';
import * as T from 'three';
import {DetailBatch} from './detail-batch';
import {ground,localPoint,type Home,type Point} from './layout';
import {propGroundIssue} from './prop-placement';
import {getSiteReservations,setSiteReservations,siteIssue,type ReservedSite} from './site-reservations';
import {insideSite,industryClear} from './historic-plan';
import {refineSurface} from '../rendering/surfaces';
import type {BackyardShop} from './backyard-workshops';
export type YardPlot={home:number;polygon:Point[];boundaries:{a:Point;b:Point;kind:number}[];bed?:ReservedSite};
function clip(poly:Point[],normal:Point,limit:number){const out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*normal[0]+a[1]*normal[1]-limit,db=b[0]*normal[0]+b[1]*normal[1]-limit;if(da<=0)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;}
export function planYardPlots(homes:Home[],paths:Point[][],shops:BackyardShop[]){
 const out:YardPlot[]=[],reservations=[...getSiteReservations()];
 for(const h of homes){if(h.number===5)continue;const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz,shop=shops.find(s=>s.home===h.number),back=Math.max(9+(h.number%4)*1.3,shop?Math.hypot(shop.p[0]-h.x,shop.p[1]-h.z)+3:0),left=w/2+1.5+(h.number%3)*.5,right=w/2+1.5;
  let polygon=[[-left,-d/2],[right,-d/2],[right+1.2,-back*.62],[right-.5,-back],[-left+1.1,-back-.8]].map(p=>localPoint(h,...p as Point));
  // Neighbour bisectors trim the rough plot shape, so enclosed yards cannot overlap.
  for(const o of homes){if(o===h||o.number===5||Math.hypot(o.x-h.x,o.z-h.z)>55)continue;const n:Point=[o.x-h.x,o.z-h.z];polygon=clip(polygon,n,((o.x*o.x+o.z*o.z)-(h.x*h.x+h.z*h.z))/2);if(polygon.length<3)break;}
  if(polygon.length<3)continue;
  const plot:YardPlot={home:h.number,polygon,boundaries:[]};
  for(let i=1;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(len/1.5));
   for(let j=0;j<n;j++){const p:Point=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],q:Point=[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n];
    const samples=Array.from({length:9},(_,k)=>[p[0]+(q[0]-p[0])*k/8,p[1]+(q[1]-p[1])*k/8] as Point);
    if(samples.some(v=>!insideSite(...v)||!industryClear(...v,1)||siteIssue(v,.85)||propGroundIssue(v,homes,paths)))continue;
    if(Math.abs(ground(...p)-ground(...q))>.5)continue;
    plot.boundaries.push({a:p,b:q,kind:h.number%3});
    const middle:Point=[(p[0]+q[0])/2,(p[1]+q[1])/2];reservations.push({p:middle,angle:-Math.atan2(q[1]-p[1],q[0]-p[0]),width:Math.hypot(q[0]-p[0],q[1]-p[1]),depth:.24,kind:'yard boundary',home:h.number});
   }
  }
  if(h.number%3===0&&h.number!==22){for(const side of [-1,1]){const p=localPoint(h,side*w*.27,-d/2-4.7),bed:ReservedSite={p,angle:h.angle,width:1.2,depth:2.0,kind:'vegetable bed',home:h.number};const points=[[-.8,-1.2],[.8,-1.2],[.8,1.2],[-.8,1.2],[0,0]].map(([x,z])=>[p[0]+Math.cos(h.angle)*x+Math.sin(h.angle)*z,p[1]-Math.sin(h.angle)*x+Math.cos(h.angle)*z] as Point);
    if(points.every(q=>!siteIssue(q,.3)&&!propGroundIssue(q,homes,paths)&&industryClear(...q,1))){plot.bed=bed;reservations.push(bed);break;}
  }}
  out.push(plot);setSiteReservations(reservations);
 }
 setSiteReservations(reservations);return out;
}
export function paintYardPlots(ctx:CanvasRenderingContext2D,pixel:(p:Point)=>Point,plots:YardPlot[]){for(const p of plots){ctx.beginPath();p.polygon.forEach((q,i)=>{const xy=pixel(q);if(i)ctx.lineTo(...xy);else ctx.moveTo(...xy);});ctx.closePath();ctx.fillStyle=['#72634818','#414b3312','#8d76541a'][p.home%3];ctx.fill();}}
export function addYardPlots(scene:T.Scene,plots:YardPlot[]){const b=new DetailBatch();b.root.name='Irregular cottage plots';const wood=refineSurface(new T.MeshStandardMaterial({color:'#635740',roughness:1}),'wood'),brick=refineSurface(new T.MeshStandardMaterial({color:'#745b45',roughness:1}),'brick'),leaf=refineSurface(new T.MeshStandardMaterial({color:'#61703d',roughness:1}),'leaf'),soil=refineSurface(new T.MeshStandardMaterial({color:'#51432e',roughness:1}),'stone'),mortar=refineSurface(new T.MeshStandardMaterial({color:'#6b6555',roughness:1}),'plaster');
 const v=(p:Point,y:number)=>new T.Vector3(p[0],ground(...p)+y,p[1]);let sections=0,beds=0;const hedges:T.Matrix4[]=[],cabbages:T.Matrix4[]=[];
 for(const plot of plots){for(const {a,b:end,kind}of plot.boundaries){const dx=end[0]-a[0],dz=end[1]-a[1],l=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle);sections++;
  if(kind===0){for(const p of [a,end])b.block(wood,v(p,.43),new T.Vector3(.07,.86,.07),q);for(const y of [.32,.69])b.beam(wood,v(a,y),v(end,y),.031);b.beam(wood,v(a,.30),v(end,.7),.022);}
  else if(kind===1){
   // Low brick garden wall: 215×65 mm bricks in stretcher bond on a lime mortar core, with a
   // soldier coping of bricks on edge. Height and length follow the original boundary.
   const course=.075,rows=6,mortarH=rows*course;
   const inset=Math.min(.02,l*.05)/l;for(let k=0,n=Math.max(1,Math.round(l/.9));k<n;k++){const t=inset+(k+.5)/n*(1-2*inset),p:Point=[a[0]+dx*t,a[1]+dz*t];b.block(mortar,v(p,mortarH/2),new T.Vector3(l*(1-2*inset)/n+.002,mortarH,.17),q);}
   for(let row=0;row<rows;row++){const n=Math.max(1,Math.round(l/.225)),stagger=row%2?.5:0;
    for(let j=-(row%2);j<n;j++){const s0=Math.max(0,(j+stagger)/n),s1=Math.min(1,(j+1+stagger)/n);if(s1-s0<.2/n)continue;const t=(s0+s1)/2,p:Point=[a[0]+dx*t,a[1]+dz*t];
     const tone=.72+((row*7+j*13+plot.home*5)%11)*.035,jitter=((row*5+j*3)%7-3)*.0015;
     b.block(brick,v([p[0]-dz/l*jitter,p[1]+dx/l*jitter],.0325+row*course+.005),new T.Vector3((s1-s0)*l-.01,.065,.1025*2-.01),q,tone);}}
   for(let j=0,n=Math.max(1,Math.round(l/.075));j<n;j++){const t=(j+.5)/n,p:Point=[a[0]+dx*t,a[1]+dz*t];b.block(brick,v(p,mortarH+.11),new T.Vector3(l/n-.009,.215,.1025*2),q,.62+((j*11+plot.home)%9)*.04);}
  }
  // Garden hedges: overlapping leaf-card runs along the boundary, a little uneven in height and line.
  else for(let j=0,n=Math.max(1,Math.round(l/.6));j<n;j++){const t=(j+.5)/n,p:Point=[a[0]+dx*t,a[1]+dz*t],wobble=Math.sin(j*2.3+plot.home)*.5+.5,m=new T.Matrix4().compose(v([p[0]-dz/l*(wobble-.5)*.06,p[1]+dx/l*(wobble-.5)*.06],-.03),q.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),(wobble-.5)*.12)),new T.Vector3(l/n*1.15,.9+wobble*.2,.9+wobble*.12));hedges.push(m);}
 }
 if(plot.bed){const s=plot.bed,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.angle),p=(x:number,z:number):Point=>[s.p[0]+Math.cos(s.angle)*x+Math.sin(s.angle)*z,s.p[1]-Math.sin(s.angle)*x+Math.cos(s.angle)*z];beds++;
  b.block(soil,v(s.p,.045),new T.Vector3(1.2,.09,2),q);for(const side of [-1,1])b.block(wood,v(p(side*.62,0),.1),new T.Vector3(.045,.2,2.07),q);for(let row=0;row<2;row++)for(let j=0;j<5;j++){const turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),row*1.7+j*2.3),size=.98+((j*3+row+plot.home)%5)*.07;cabbages.push(new T.Matrix4().compose(v(p((row-.5)*.5,(j-2)*.35),.085),q.clone().multiply(turn),new T.Vector3(size,size,size)));}
 }
 }
 const result=b.finish();scene.add(result.root);
 const hedgeMesh=new T.InstancedMesh(gardenHedgeGeometry(),refineSurface(foliageMaterial({value:0},{color:'#c9cdb6',sway:0,transmission:.3}),'leaf'),hedges.length);hedges.forEach((m,i)=>hedgeMesh.setMatrixAt(i,m));hedgeMesh.layers.set(FOLIAGE_LAYER);hedgeMesh.castShadow=hedgeMesh.receiveShadow=true;result.root.add(hedgeMesh);
 const cabbageMesh=new T.InstancedMesh(cabbageGeometry(),refineSurface(new T.MeshStandardMaterial({vertexColors:true,roughness:.7,side:T.DoubleSide}),'leaf'),cabbages.length);cabbages.forEach((m,i)=>cabbageMesh.setMatrixAt(i,m));cabbageMesh.castShadow=cabbageMesh.receiveShadow=true;result.root.add(cabbageMesh);
 void leaf;return {...result,plots:plots.length,sections,beds,hedgeRuns:hedges.length,cabbages:cabbages.length};
}
