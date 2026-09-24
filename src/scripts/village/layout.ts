import {historicGround,prepareHistoricGround} from './historic-plan';
import terrain from '../../data/terrain-heights.json';
import roadsData from '../../data/roads.json';
import outsideRoadsData from '../../data/outside-roads.json';
import brookData from '../../data/brook.json';
import mousesweetData from '../../data/mousesweet.json';
import boundaryData from '../../data/boundary.json';
import greensData from '../../data/greens.json';
export type Point = [number, number];
export interface Household { number:number; slug:string; household_name:string; family:string; founder:boolean; estimated_position:boolean; occupants_1861:number; position:{lat:number;lon:number}; polygon:Point[]; }
export interface Home extends Household { x:number; z:number; angle:number; width:number; depth:number; style:number; sx:number; sz:number; height:number; }
export const origin:Point=[52.47575918,-2.09357062];
export function project(p:Point):Point {return [(p[1]-origin[1])*111320*Math.cos(origin[0]*Math.PI/180),-(p[0]-origin[0])*111320];}
export const roads=roadsData.map(r=>r.polyline.map(p=>project(p as Point)));
// Keep the household-facing source network intact. The older map places the
// eastern junction west of its modern position, so trim only the rendered stub.
export const outsideJunction=project(outsideRoadsData.junction as Point);
export const villageRoads=roads.map((line,i)=>i===4?[outsideJunction,...line.slice(1)]:line);
export const outsideRoads=outsideRoadsData.routes.map(r=>r.polyline.map(p=>project(p as Point)));
export const renderedRoads=[...villageRoads,...outsideRoads];
const rawBrooks=[brookData,mousesweetData.polyline].map(line=>line.map(p=>project(p as Point)));
export const boundary=boundaryData.map(p=>project(p as Point));
export const greens=greensData.map(g=>g.polygon.map(p=>project(p as Point)));
export function baseGround(x:number,z:number) {
 const u=Math.max(0,Math.min(terrain.width-1.000001,(x-terrain.x0)/terrain.step)),v=Math.max(0,Math.min(terrain.height-1.000001,(z-terrain.z0)/terrain.step));
 const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*terrain.width+i,h=terrain.heights;
 return h[k]*(1-a)*(1-b)+h[k+1]*a*(1-b)+h[k+terrain.width]*(1-a)*b+h[k+terrain.width+1]*a*b;
}
prepareHistoricGround(baseGround);
// Short rounded corners preserve the source route while removing hard ribbon joints.
export function roundedLine(line:Point[]):Point[]{const out:Point[]=[line[0]];for(let i=1;i<line.length-1;i++){const a=line[i-1],b=line[i],c=line[i+1];const before:Point=[b[0]+(a[0]-b[0])*.16,b[1]+(a[1]-b[1])*.16],after:Point=[b[0]+(c[0]-b[0])*.16,b[1]+(c[1]-b[1])*.16];out.push(before);for(let j=1;j<=5;j++){const t=j/5;out.push([(1-t)**2*before[0]+2*(1-t)*t*b[0]+t*t*after[0],(1-t)**2*before[1]+2*(1-t)*t*b[1]+t*t*after[1]]);}}out.push(line[line.length-1]);return out;}
export const brooks=rawBrooks.map(roundedLine);
const villageLaneLines=roads.map(roundedLine);
export const laneLines=renderedRoads.map(roundedLine);
const laneCells=new Map<string,[Point,Point][]>();
for(const line of laneLines)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor((Math.min(a[0],b[0])-4)/16);x<=Math.floor((Math.max(a[0],b[0])+4)/16);x++)for(let z=Math.floor((Math.min(a[1],b[1])-4)/16);z<=Math.floor((Math.max(a[1],b[1])+4)/16);z++){const key=x+":"+z,list=laneCells.get(key)||[];list.push([a,b]);laneCells.set(key,list);}}
export function laneDistance(x:number,z:number){let d=Infinity;for(const [a,b] of laneCells.get(Math.floor(x/16)+":"+Math.floor(z/16))||[]){const q=nearestSegment([x,z],a,b);d=Math.min(d,Math.hypot(x-q[0],z-q[1]));}return d;}
export const chainshopLocation:Point=[52.4754217,-2.0931022];
export const chainshopPosition=project(chainshopLocation);
export const chainshopReplacesHouse=5;
export function streamWidth(x:number,z:number){return 2.7+.45*Math.sin(x*.067+z*.048)+.24*Math.sin(z*.21);}
const streamCells=new Map<string,[Point,Point][]>();
for(const line of brooks)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor((Math.min(a[0],b[0])-7)/16);x<=Math.floor((Math.max(a[0],b[0])+7)/16);x++)for(let z=Math.floor((Math.min(a[1],b[1])-7)/16);z<=Math.floor((Math.max(a[1],b[1])+7)/16);z++){const key=x+':'+z;const list=streamCells.get(key)||[];list.push([a,b]);streamCells.set(key,list);}}
export function streamDistance(x:number,z:number){let d=Infinity;for(const [a,b]of streamCells.get(Math.floor(x/16)+':'+Math.floor(z/16))||[]){const p=nearestSegment([x,z],a,b);d=Math.min(d,Math.hypot(x-p[0],z-p[1]));}return d;}
// Maintain one downstream grade on each mapped watercourse. Small rises in
// the modern DTM are cut through, rather than making water travel uphill.
const channels=brooks.map(line=>{let level=Infinity;return line.map(p=>{level=Math.min(level,baseGround(...p)-.35);return {p,h:level};});});
// Segment boxes skip channel segments strictly farther than the best so far (same result as a full scan).
const channelBoxes=channels.flatMap(line=>line.slice(1).map((b,i)=>{const a=line[i];return [Math.min(a.p[0],b.p[0]),Math.min(a.p[1],b.p[1]),Math.max(a.p[0],b.p[0]),Math.max(a.p[1],b.p[1])];}));
export function streamSurface(x:number,z:number){let distance=Infinity,height=baseGround(x,z)-.35;
 let k=0;for(const line of channels)for(let i=1;i<line.length;i++,k++){const box=channelBoxes[k],bx=Math.max(box[0]-x,0,x-box[2]),bz=Math.max(box[1]-z,0,z-box[3]),bound=distance+1e-9;if(bx*bx+bz*bz>bound*bound)continue;const a=line[i-1],b=line[i],p=nearestSegment([x,z],a.p,b.p),d=Math.hypot(x-p[0],z-p[1]);if(d<distance){distance=d;const length=Math.hypot(b.p[0]-a.p[0],b.p[1]-a.p[1]);const t=length?Math.hypot(p[0]-a.p[0],p[1]-a.p[1])/length:0;height=a.h+(b.h-a.h)*t;}}
 return height;
}
type Platform={x:number;z:number;angle:number;w:number;d:number;y:number};
let platforms:Platform[]=[];
export function weaverWorkshop(h:Home){const p=localPoint(h,-(6.4*h.sx/2+2.65),0);return {p,angle:h.angle+Math.PI,width:5.06,depth:3.57};}
export function prepareGround(homes:Home[]){
 platforms=homes.filter(h=>h.number!==chainshopReplacesHouse).map(h=>({x:h.x,z:h.z,angle:h.angle,w:[6.4,7.2,9.2][h.style]*h.sx/2+.45,d:[4.6,4.8,4.5][h.style]*h.sz/2+.45,y:baseGround(h.x,h.z)}));
 platforms.push({x:chainshopPosition[0],z:chainshopPosition[1],angle:1.03,w:7,d:6,y:baseGround(...chainshopPosition)});
 const founder=homes.find(h=>h.number===22)!;const workshop=weaverWorkshop(founder);
 platforms.push({x:workshop.p[0],z:workshop.p[1],angle:workshop.angle,w:workshop.width/2+.25,d:workshop.depth/2+.25,y:baseGround(founder.x,founder.z)});
 const px=chainshopPosition[0]+8.5*Math.cos(1.03)+3.5*Math.sin(1.03),pz=chainshopPosition[1]-8.5*Math.sin(1.03)+3.5*Math.cos(1.03);
 platforms.push({x:px,z:pz,angle:0,w:1.8,d:1,y:ground(px,pz)});
 for(const h of homes)h.height=ground(h.x,h.z)-.10;
}
export function addGroundPlatforms(items:Platform[]){platforms.unshift(...items);}
export function ground(x:number,z:number){
 const roadDistance=laneDistance(x,z);let y=historicGround(x,z,baseGround(x,z),roadDistance);const d=streamDistance(x,z),w=streamWidth(x,z)*.5;
 if(d<w+12){const bed=streamSurface(x,z)-.48;const blend=d<w?1:Math.max(0,1-(d-w)/12)**2;y=Math.min(y,y+(bed-y)*blend);}
 if(roadDistance<2.8){const shoulder=Math.max(0,Math.min(1,(2.8-roadDistance)/.7));y-=shoulder*(.15+.18*Math.exp(-(((roadDistance-.87)/.43)**2)));}
 let strongest=0,level=y;
 for(const p of platforms){if(Math.abs(x-p.x)>18||Math.abs(z-p.z)>18)continue;const dx=x-p.x,dz=z-p.z,c=Math.cos(p.angle),s=Math.sin(p.angle);const edge=Math.max(Math.abs(dx*c-dz*s)-p.w,Math.abs(dx*s+dz*c)-p.d);const t=Math.max(0,Math.min(1,1-edge/3));const weight=t*t*(3-2*t);if(weight>strongest){strongest=weight;level=p.y;}}
 return y+(level-y)*strongest;
}

export function nearestSegment(p:Point,a:Point,b:Point):Point {const dx=b[0]-a[0],dz=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return [a[0]+dx*t,a[1]+dz*t];}
// Grid index for nearestRoad. Rings of cells are searched outwards until no unvisited cell can
// hold a closer segment; ties resolve to the lowest segment index, exactly as a full ordered scan.
type RoadIndex={segments:[Point,Point][];cells:Map<number,number[]>;size:number;stamp:Uint32Array;query:number};
const roadIndexes=new WeakMap<Point[][],RoadIndex>();
function roadIndex(lines:Point[][]){
 let index=roadIndexes.get(lines);if(index)return index;
 const segments:[Point,Point][]=[],cells=new Map<number,number[]>(),size=12;
 for(const line of lines)for(let i=1;i<line.length;i++)segments.push([line[i-1],line[i]]);
 segments.forEach(([a,b],k)=>{for(let x=Math.floor(Math.min(a[0],b[0])/size);x<=Math.floor(Math.max(a[0],b[0])/size);x++)for(let z=Math.floor(Math.min(a[1],b[1])/size);z<=Math.floor(Math.max(a[1],b[1])/size);z++){const key=x*65536+z,list=cells.get(key);if(list)list.push(k);else cells.set(key,[k]);}});
 index={segments,cells,size,stamp:new Uint32Array(segments.length),query:0};roadIndexes.set(lines,index);return index;
}
export function nearestRoad(p:Point,lines:Point[][]=laneLines):Point {
 const index=roadIndex(lines),{segments,cells,size,stamp}=index,cx=Math.floor(p[0]/size),cz=Math.floor(p[1]/size),query=++index.query;
 let best:Point=roads[0][0],d=Infinity,bestK=Infinity;
 const visit=(x:number,z:number)=>{const list=cells.get(x*65536+z);if(!list)return;for(const k of list){if(stamp[k]===query)continue;stamp[k]=query;const q=nearestSegment(p,segments[k][0],segments[k][1]),dd=Math.hypot(p[0]-q[0],p[1]-q[1]);if(dd<d||(dd===d&&k<bestK)){d=dd;best=q;bestK=k;}}};
 for(let r=0;r<4;r++){
  if(r===0)visit(cx,cz);
  else for(let i=-r;i<=r;i++){visit(cx+i,cz-r);visit(cx+i,cz+r);if(i>-r&&i<r){visit(cx-r,cz+i);visit(cx+r,cz+i);}}
  // Every cell outside ring r lies at least r*size away.
  if(d<r*size-1e-9)return best;
 }
 // Far from every road: finish with an ordered scan of the unvisited segments.
 for(let k=0;k<segments.length;k++){if(stamp[k]===query)continue;const q=nearestSegment(p,segments[k][0],segments[k][1]),dd=Math.hypot(p[0]-q[0],p[1]-q[1]);if(dd<d||(dd===d&&k<bestK)){d=dd;best=q;bestK=k;}}return best;
}
export function nearestVillageRoad(p:Point):Point {return nearestRoad(p,villageLaneLines);}
export function makeHomes(rows:Household[]):Home[]{return rows.map(h=>{let [x,z]=project([h.position.lat,h.position.lon]);const poly=(h.polygon||[]).map(project);let length=0,angle=0;
for(let i=1;i<poly.length;i++){const dx=poly[i][0]-poly[i-1][0],dz=poly[i][1]-poly[i-1][1];if(Math.hypot(dx,dz)>length){length=Math.hypot(dx,dz);angle=-Math.atan2(dz,dx);}}
const ca=Math.cos(angle),sa=Math.sin(angle);const local=poly.map(p=>[(p[0]-x)*ca-(p[1]-z)*sa,(p[0]-x)*sa+(p[1]-z)*ca]);
const width=local.length?Math.max(...local.map(p=>p[0]))-Math.min(...local.map(p=>p[0])):7;
const depth=local.length?Math.max(...local.map(p=>p[1]))-Math.min(...local.map(p=>p[1])):5;
const road=nearestVillageRoad([x,z]);if((road[0]-x)*sa+(road[1]-z)*ca<0)angle+=Math.PI;
// Give Heathcock's rendered cottage clearance from the lane. Keep the source map coordinates intact.
if(h.number===41){const dx=x-road[0],dz=z-road[1],distance=Math.hypot(dx,dz);if(distance>0){x+=dx/distance*2;z+=dz/distance*2;}}
const style=h.number===22?0:h.number%5===0?2:h.number%3===0?1:0;
return {...h,x,z,angle,width,depth,style,sx:Math.max(.7,Math.min(1.65,width/[6.4,7.2,9.2][style])),sz:Math.max(.75,Math.min(1.4,depth/[4.6,4.8,4.5][style])),height:ground(x,z)-.10};});}
export function localPoint(h:Home,x:number,z:number):Point {return [h.x+Math.cos(h.angle)*x+Math.sin(h.angle)*z,h.z-Math.sin(h.angle)*x+Math.cos(h.angle)*z];}
