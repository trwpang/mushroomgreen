import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import * as T from 'three';
import {makeHomes,prepareGround,ground,localPoint,nearestVillageRoad,nearestSegment,baseGround,streamDistance,type Point} from '../../src/scripts/village/layout';
import {planBackyardWorkshops,levelBackyardWorkshops,addBackyardWorkshops,workshopPoint} from '../../src/scripts/village/backyard-workshops';
import {planYardPlots,addYardPlots} from '../../src/scripts/village/yard-plots';
import {railRoutes,insideSite,excavations,hollowRadius,railBed,pools} from '../../src/scripts/village/historic-plan';
import {lineSamples,addHistoricLandscape} from '../../src/scripts/village/historic-landscape';
import {setSiteReservations,getSiteReservations,siteIssue} from '../../src/scripts/village/site-reservations';
import {planVillageLife} from '../../src/scripts/village/village-life';
import {createPropKit} from '../../src/scripts/village/working-props';
import {planWorkingProps,propGroundIssue} from '../../src/scripts/village/prop-placement';
const homes=makeHomes(JSON.parse(readFileSync('dist/households.json','utf8')));prepareGround(homes);
const paths:Point[][]=[];
for(const h of homes.filter(h=>h.number!==5)){const front=localPoint(h,0,[4.6,4.8,4.5][h.style]*h.sz/2+.3),road=nearestVillageRoad(front);let points:Point[]=[front,road];for(const other of homes){if(other===h)continue;const q=nearestSegment([other.x,other.z],front,road);if(Math.hypot(q[0]-other.x,q[1]-other.z)<Math.max(other.width,other.depth)*.45){points=[front,[other.x-Math.max(other.width,other.depth)*.7,other.z],road];break;}}paths.push(points);}
const before=homes.map(h=>ground(h.x,h.z));const shops=planBackyardWorkshops(homes,paths);levelBackyardWorkshops(shops);const plots=planYardPlots(homes,paths,shops);const sites=[...getSiteReservations()];
assert(shops.length>=48,'At least 48 additional shops, plus Henry’s existing shop');
for(const [i,h]of homes.entries())assert(Math.abs(before[i]-ground(h.x,h.z))<1e-6,'Preserve cottage floor '+h.number);
for(const s of shops){setSiteReservations(sites.filter(r=>r.home!==s.home));for(let x=-s.width/2-.1;x<=s.width/2+.1;x+=.25)for(let z=-s.depth/2-.1;z<=s.depth/2+.1;z+=.25){const p=workshopPoint(s,x,z);assert(insideSite(...p));assert(!propGroundIssue(p,homes,paths),`Shop ${s.home} intersects ${propGroundIssue(p,homes,paths)}`);assert(Math.abs(ground(...p)-s.y)<.025,'Level shop floor '+s.home);}
 assert(s.access.length===3);for(let i=1;i<s.access.length;i++)for(let t=0;t<=1;t+=.1){const a=s.access[i-1],b=s.access[i],p:Point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];assert(!siteIssue(p,.1),'Keep workshop routes free of other yard boundaries');}
}
setSiteReservations(sites);
const animals=planVillageLife(homes,paths);assert.equal(animals.filter(a=>a.kind==='hen').length,9);assert.equal(animals.filter(a=>a.kind==='cat').length,1);
for(const a of animals)assert(!siteIssue(a.p,.46),'Animals stay clear of new shops and fences');
const props=planWorkingProps(homes,createPropKit().models,paths);assert(props.length>=100);assert(new Set(props.map(p=>p.home)).size>=35);
for(const p of props){assert(!siteIssue(p.p,.1),'Working props stay clear of new shops and fences');if(p.kind==='block')assert(props.some(q=>q.kind==='woodpile'&&q.group===p.group),'Axe retains its woodpile');if(p.kind==='basket')assert(props.some(q=>['tub','sacks'].includes(q.kind)&&q.group===p.group),'Basket retains a purpose');}
let minHouseRail=Infinity,maxEarthwork=0,railSamples=0;
for(const line of railRoutes)for(const {p}of lineSamples(line,1)){if(!insideSite(...p))continue;for(const h of homes){const d=Math.hypot(p[0]-h.x,p[1]-h.z)-Math.hypot(h.width,h.depth)/2;minHouseRail=Math.min(minHouseRail,d);assert(d>3,'Railway clears house '+h.number);}assert(streamDistance(...p)>4,'No unsupported rail crossing over water');maxEarthwork=Math.max(maxEarthwork,Math.abs(railBed(...p)-baseGround(...p)));railSamples++;}
const scene=new T.Scene(),workshops=addBackyardWorkshops(scene,shops),yards=addYardPlots(scene,plots),industry=addHistoricLandscape(scene);
const triangles=workshops.triangles+yards.triangles+industry.triangles+industry.waterTriangles,draws=workshops.draws+yards.draws+industry.draws+2;
assert(triangles<1500000,'Keep the added geometry below 1.5 million triangles');assert(draws<45,'Shared batches keep additional draws bounded');assert(industry.waterTriangles>100,'Pools have visible water area');
for(const child of scene.children)if(child instanceof T.Mesh&&child.name==='Small pool in working hollow'){const normals=child.geometry.attributes.normal;for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.99);}
const result={newWorkshops:shops.length,domesticWorkshops:shops.length+1,householdsWithoutSeparateNewShop:homes.filter(h=>![5,22].includes(h.number)&&!shops.some(s=>s.home===h.number)).map(h=>h.number),plots:plots.length,boundarySections:yards.sections,vegetableBeds:yards.beds,railSamples,minHouseRail,maxEarthwork,railMetres:Math.round(industry.railMetres/2),sleepers:industry.sleepers,shafts:industry.shaftCount,pools:industry.pools,waterTriangles:industry.waterTriangles,triangles,draws,newTextureFiles:0,retainedProps:props.length,propHouseholds:new Set(props.map(p=>p.home)).size,animals:animals.length,sourceSheet:'Worcestershire IV.NE, surveyed 1881–1882 / published 1887',interpretation:true};
mkdirSync('artifacts/village/historic-landscape',{recursive:true});writeFileSync('artifacts/village/historic-landscape/validation.json',JSON.stringify(result,null,2)+'\n');
// Reviewable plan of actual placements, clipped to the unchanged perimeter.
const point=(p:Point)=>`${p[0]+230},${p[1]+320}`;let svg='<svg xmlns="http://www.w3.org/2000/svg" width="920" height="1040" viewBox="0 0 460 520"><rect width="460" height="520" fill="#e7e3d2"/><ellipse cx="230" cy="260" rx="207" ry="236" fill="#adb28e"/>';
for(const e of excavations)svg+=`<ellipse cx="${e.p[0]+230}" cy="${e.p[1]+320}" rx="${e.rx}" ry="${e.rz}" fill="#b69570"/>`;
for(const p of plots)svg+=`<polygon points="${p.polygon.map(point).join(' ')}" fill="none" stroke="#738165" stroke-width=".4"/>`;
for(const l of railRoutes)svg+=`<polyline points="${l.map(point).join(' ')}" fill="none" stroke="#35382e" stroke-width="1.5"/>`;
for(const h of homes){svg+=`<circle cx="${h.x+230}" cy="${h.z+320}" r="3" fill="#844c36"/><text x="${h.x+233}" y="${h.z+319}" font-size="4">${h.number}</text>`;}
for(const s of shops){const p=[[-s.width/2,-s.depth/2],[s.width/2,-s.depth/2],[s.width/2,s.depth/2],[-s.width/2,s.depth/2]].map(q=>point(workshopPoint(s,q[0],q[1])));svg+=`<polygon points="${p.join(' ')}" fill="#3f6061"/><polyline points="${s.access.map(point).join(' ')}" fill="none" stroke="#776139" stroke-width=".7"/>`;}
svg+='</svg>';writeFileSync('artifacts/village/historic-landscape/placement-plan.svg',svg);console.log(result);
