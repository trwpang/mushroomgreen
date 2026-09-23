import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import type {InteriorObjectId} from './interior-catalogue';
import type {ObjectMaterial,ObjectSurface} from './interior-objects';

// Second-pass models for ten catalogue objects that read as primitives up close.
// Metres, +Z is the usable front, every model rests on y = 0. Forms follow common mid-Victorian
// Black Country domestic types; they are interpretations, not surveyed objects.

type Put=(g:T.BufferGeometry,m:ObjectMaterial,x?:number,y?:number,z?:number,rx?:number,ry?:number,rz?:number)=>void;
export type DetailContext={put:Put;surfaces:ObjectSurface[]};

const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

/** Loft closed rings (each an array of points, same length) into a tube with UVs; optional flat caps. */
function loft(rings:T.Vector3[][],capStart=false,capEnd=false,flip=false){
 if(flip)rings=rings.map(r=>r.slice().reverse());
 const n=rings[0].length,position:number[]=[],uv:number[]=[],index:number[]=[];
 rings.forEach((ring,j)=>{for(let i=0;i<=n;i++){const p=ring[i%n];position.push(p.x,p.y,p.z);uv.push(i/n,j/(rings.length-1));}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;index.push(a,c,b,b,c,d);}
 const cap=(ring:T.Vector3[],flip:boolean)=>{const centre=ring.reduce((s,p)=>s.add(p),V(0,0,0)).multiplyScalar(1/n),base=position.length/3;position.push(centre.x,centre.y,centre.z);uv.push(.5,.5);
  ring.forEach(p=>{position.push(p.x,p.y,p.z);uv.push(.5,.5);});for(let i=0;i<n;i++){const a=base+1+i,b=base+1+(i+1)%n;if(flip)index.push(base,b,a);else index.push(base,a,b);}};
 if(capStart)cap(rings[0],true);if(capEnd)cap(rings[rings.length-1],false);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
/** Superellipse ring in the XY plane of a local frame. */
function ring(centre:T.Vector3,axisX:T.Vector3,axisY:T.Vector3,rx:number,ry:number,n:number,power=2.6,shape?:(a:number)=>number){
 const out:T.Vector3[]=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a),k=shape?shape(a):1;
  const x=Math.sign(c)*Math.pow(Math.abs(c),2/power)*rx*k,y=Math.sign(s)*Math.pow(Math.abs(s),2/power)*ry*k;out.push(centre.clone().addScaledVector(axisX,x).addScaledVector(axisY,y));}
 return out;
}
function lathe(profile:[number,number][],segments=32,deform?:(p:T.Vector3,angle:number)=>void){
 const g=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),segments);
 if(deform){const p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);deform(v,Math.atan2(v.x,v.z));p.setXYZ(i,v.x,v.y,v.z);}}
 g.computeVertexNormals();return g;
}
/** Smooth normals across a displaced surface without losing the UVs. */
function smooth(g:T.BufferGeometry){const uv=g.getAttribute('uv');g.deleteAttribute('normal');const m=mergeVertices(g,1e-5);m.computeVertexNormals();if(!m.getAttribute('uv')&&uv)m.setAttribute('uv',uv);return m;}
function tube(points:T.Vector3[],radius:number,sides=6,closed=false){return new T.TubeGeometry(new T.CatmullRomCurve3(points,closed),Math.max(8,points.length*2),radius,sides,closed);}

export function detailedObject(id:InteriorObjectId,{put,surfaces}:DetailContext):boolean{
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:ObjectMaterial,ry=0)=>put(new T.BoxGeometry(w,h,d),m,x,y,z,0,ry);
 const rod=(a:number[],b:number[],r:number,m:ObjectMaterial='iron',sides=8)=>{const s=V(a[0],a[1],a[2]),e=V(b[0],b[1],b[2]),g=new T.CylinderGeometry(r,r,s.distanceTo(e),sides);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),e.clone().sub(s).normalize()));const p=s.add(e).multiplyScalar(.5);put(g,m,p.x,p.y,p.z);};
 const random=seeded(9001+id.length*131);

 if(id==='open-range'){
  // Open cooking range: a raised fire basket between two hobs, a side oven and a side boiler with a brass tap,
  // an ash pit under the firebars, a polished steel fender rail and a high back plate with a plate shelf.
  box(0,.04,0,.96,.08,.55,'clay');                                        // hearth stone
  box(0,.09,.02,.92,.02,.5,'iron');                                        // base plate
  box(0,.46,-.205,.92,.74,.06,'iron');                                     // back plate
  for(const side of [-1,1]){
   const x=side*.315;
   box(x,.39,-.005,.29,.58,.40,'iron');                                    // oven / boiler cheek
   // Cast frame and door with raised panel, hinges and latch.
   box(x,.40,.196,.25,.42,.012,'iron');box(x,.40,.205,.19,.34,.01,'iron');
   for(const y of [.25,.55])box(x-side*.118,y,.206,.02,.05,.02,'steel');
   if(side<0){ // oven: steel handle and a small damper knob
    rod([x+.05,.47,.225],[x+.05,.33,.225],.007,'steel');for(const y of [.47,.33])rod([x+.05,y,.207],[x+.05,y,.225],.005,'steel');
    const knob=new T.CylinderGeometry(.013,.013,.012,12);knob.rotateX(Math.PI/2);put(knob,'steel',x,.635,.21);
   }else{ // boiler: lifting lid on the hob and a brass draw-off tap
    const lid=new T.CylinderGeometry(.09,.09,.008,20);put(lid,'iron',x,.759,-.02);rod([x-.03,.768,-.02],[x+.03,.768,-.02],.006,'steel');
    rod([x,.26,.2],[x,.26,.245],.009,'copper',10);rod([x,.26,.245],[x,.215,.26],.007,'copper',10);rod([x-.018,.28,.245],[x+.018,.28,.245],.004,'copper');
   }
  }
  // Fire basket: side cheeks, bottom firebars, front bars, coal bed with irregular lumps, ash pit and pan.
  for(const side of [-1,1])box(side*.165,.43,.02,.03,.48,.36,'iron');
  box(0,.215,.03,.30,.03,.34,'iron');                                       // ash pit top rail
  box(0,.13,.06,.28,.05,.28,'coal');box(0,.16,.19,.29,.02,.03,'steel');     // ash pan and lip
  for(let i=0;i<7;i++)rod([-.13+i*.043,.29,-.14],[-.13+i*.043,.29,.17],.008);// bottom firebars
  for(let i=0;i<9;i++)rod([-.14+i*.035,.29,.185],[-.14+i*.035,.48,.185],.006);// front bars
  for(const y of [.30,.39,.48])rod([-.15,y,.187],[.15,y,.187],.008);
  const lumps=new T.IcosahedronGeometry(1,0);
  for(let i=0;i<34;i++){const g=lumps.clone();const s=.018+random()*.02;g.scale(s*(1+random()*.4),s*.8,s*(1+random()*.4));g.rotateY(random()*6);put(g,'coal',(random()-.5)*.26,.31+random()*.09,-.12+random()*.28);}
  lumps.dispose();
  // Canopy over the fire, mantel shelf and a steel fender with a rolled rail.
  box(0,.60,.0,.30,.05,.36,'iron');
  // Continuous cast hob top over fire and side ovens (the measured kettle/pan support), with a hot-plate ring.
  box(0,.73,0,.94,.05,.50,'iron');surfaces.push({x:0,y:.755,z:0,width:.90,depth:.47});
  const plate=new T.TorusGeometry(.112,.006,6,32);plate.rotateX(Math.PI/2);put(plate,'steel',-.315,.755,-.02);
  box(0,.757,.235,.94,.006,.02,'steel');                                    // polished front edge
  box(0,.905,-.2,.92,.25,.04,'iron');for(let i=0;i<4;i++)box(-.33+i*.22,.905,-.175,.16,.16,.012,'iron');
  box(0,1.04,-.18,.94,.025,.1,'iron');                                      // plate shelf
  rod([-.47,.05,.255],[.47,.05,.255],.012,'steel',10);for(const x of [-.47,.47])rod([x,.05,.255],[x,.05,.10],.012,'steel',10);
  put(lathe([[.068,0],[.068,.14],[.058,.14],[.058,0]],20),'iron',0,1.03,-.15);ring3(put,0,1.17,-.15,.066);
  return true;
 }

 if(id==='jug'){
  // Salt-glazed stoneware jug: footed, full belly, collared neck, pulled pouring lip and a strap handle.
  const h=.22,wall=.006;
  const outside:[number,number][]=[[.052,0],[.058,.006],[.07,.03],[.083,.075],[.085,.10],[.078,.135],[.058,.165],[.05,.18],[.052,.19],[.06,.205],[.064,h]];
  const inside=outside.slice().reverse().map(([r,y])=>[Math.max(0,r-wall),Math.max(.012,y)] as [number,number]);
  const profile=[[0,0] as [number,number],...outside,...inside,[0,.012] as [number,number]];
  const g=lathe(profile,40,(p,a)=>{
   // Pull the lip forward (+X) above the neck; pinch the rim sides next to it.
   const lipAmount=Math.max(0,(p.y-.185)/(h-.185));const front=Math.max(0,Math.cos(a-Math.PI/2));
   const r=Math.hypot(p.x,p.z);if(r<1e-6)return;const k=1+lipAmount*(Math.pow(front,6)*.42-Math.pow(Math.abs(Math.sin(a-Math.PI/2)),8)*.05*Math.max(0,Math.cos(a-Math.PI/2)));
   p.x*=k;p.z*=k;p.y+=lipAmount*Math.pow(front,6)*.006;
   // Throwing rings: faint spiral ridges on the outside of the belly.
   if(r>.03&&p.y>.02&&p.y<.17){const ridge=1+.012*Math.sin(p.y*260);p.x*=ridge;p.z*=ridge;}
  });
  put(g,'clay');
  // Two incised bands and a slightly darker glaze run are separate thin rings.
  for(const [y,r] of [[.108,.0852],[.118,.0845]] as const){const t=new T.TorusGeometry(r,.0015,4,48);t.rotateX(Math.PI/2);put(t,'darkwood',0,y,0);}
  // Strap handle: flattened section from neck to belly, opposite the lip.
  const strap=[V(-.05,.196,0),V(-.095,.2,0),V(-.118,.16,0),V(-.11,.10,0),V(-.083,.07,0)];
  const hg=tube(strap,.01,8);hg.scale(1,1,1.7);put(hg,'clay');
  return true;
 }

 if(id==='bread'){
  // Cottage loaf: a broad lower round and a smaller top round, joined by a floured dimple, with slashes.
  const crust=(r:number,h:number,y0:number,slashes:number,seed:number)=>{
   const rnd=seeded(seed);const g=new T.SphereGeometry(1,40,24);const p=g.attributes.position,v=new T.Vector3();
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),up=v.y;
    let k=1+.035*Math.sin(a*3+seed)+.02*Math.sin(a*7-seed);
    // Oven spring: taller top, slumped foot flattened onto the tin-less base.
    let y=up>0?up*h*(1+.08*Math.sin(a*2)):Math.max(-1,up)*h*.35;
    const slash=Math.pow(Math.max(0,Math.cos((a+rnd()*0)*slashes)),40)*Math.max(0,1-Math.abs(up-.25)*2.5);
    k-=slash*.07;
    p.setXYZ(i,v.x*r*k,Math.max(0,y+h*.35)+y0,v.z*r*k*.95);}
   return smooth(g);
  };
  put(crust(.13,.075,0,6,11),'oak');
  const top=crust(.078,.058,.0,5,23);top.translate(.004,.085,0);put(top,'oak');
  // Floured thumb dimple and a dusting ring where the rounds meet.
  const dimple=new T.SphereGeometry(.013,12,8);dimple.scale(1,.3,1);put(dimple,'linen',.004,.172,0);
  
  return true;
 }

 if(id==='cheese'){
  // A wedge cut from a round truckle: solid pale paste with a thin brown rind on the curve, top and base.
  const R=.2,h=.07,angle=.78,a0=-angle/2;
  const sector=(r0:number,r1:number)=>{const shape=new T.Shape();const steps=20;
   if(r0<=0){shape.moveTo(0,0);}else shape.moveTo(Math.cos(a0)*r0,Math.sin(a0)*r0);
   for(let i=0;i<=steps;i++){const a=a0+angle*i/steps;shape.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);}
   if(r0>0)for(let i=steps;i>=0;i--){const a=a0+angle*i/steps;shape.lineTo(Math.cos(a)*r0,Math.sin(a)*r0);}
   shape.closePath();return shape;};
  const solid=(shape:T.Shape,depth:number,y:number,m:ObjectMaterial)=>{const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);g.rotateY(Math.PI/2);put(g,m,0,y,R*.5);};
  solid(sector(0,R-.005),h-.006,.003,'cream');
  solid(sector(R-.006,R),h,0,'oak');
  for(const y of [0,h-.004])solid(sector(R-.016,R-.004),.004,y,'oak');
  for(let i=0;i<3;i++){const size=.006+random()*.004,c=new T.IcosahedronGeometry(size,0);put(c,'cream',.06+random()*.03,size,R*.5+.02+random()*.02);}
  return true;
 }

 if(id==='flour-sack'){
  // Filled hessian sack: settled and wider at the foot, gathered neck bound with cord, a frayed top frill,
  // bottom corners ("ears") and a painted merchant's band.
  const rings:T.Vector3[][]=[],n=36,rows=26;
  for(let j=0;j<=rows;j++){const t=j/rows,y=t*.35;
   const body=t<.8?1:1-(t-.8)/.2*.78;const settle=1+.18*Math.max(0,.25-t)*4;
   const rx=.13*body*settle*(1+.03*Math.sin(t*9)),rz=.095*body*settle;
   const pleat=(a:number)=>1+Math.max(0,t-.62)*.18*Math.sin(a*11+t*4)+.012*Math.sin(a*5+j);
   rings.push(ring(V(0,y+.004,0),V(1,0,0),V(0,0,1),rx,rz,n,t<.1?3.2:2.4,pleat));}
  let g=loft(rings,true,false);
  // Ears: pull the two bottom corners outward.
  const p=g.attributes.position,v=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(v.y<.08){const ear=Math.pow(Math.abs(v.x)/.16,6)*(1-v.y/.08);v.x*=1+ear*.18;v.y=Math.max(0,v.y-ear*.004);}if(v.y<.004)v.y=0;p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();put(g,'cloth');
  // Frill above the tie: an open, pleated cone.
  const frill:T.Vector3[][]=[];for(let j=0;j<=6;j++){const t=j/6;frill.push(ring(V(0,.35+t*.05,0),V(1,0,0),V(0,0,1),.03+t*.035,.024+t*.028,n,2,a=>1+.22*Math.sin(a*9+t*2)));}
  put(loft(frill),'cloth');
  const cord=new T.TorusGeometry(.032,.005,6,28);cord.rotateX(Math.PI/2);cord.scale(1,1,.8);put(cord,'oak',0,.352,0);
  rod([.028,.352,.012],[.05,.30,.03],.003,'oak',5);rod([.022,.352,.018],[.035,.29,.045],.003,'oak',5);
  // Stencilled band: a slightly proud strip following the front face.
  const band:T.Vector3[][]=[];for(let j=0;j<=10;j++){const t=j/10,x=-.07+t*.14,z=.101*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(x)/.14,2.4)))+.002;band.push([V(x,.14,z),V(x,.17,z+.001)]);}
  const strip=new T.BufferGeometry(),pos:number[]=[],uv:number[]=[],idx:number[]=[];band.forEach((pair,j)=>{pair.forEach((q,k)=>{pos.push(q.x,q.y,q.z);uv.push(j/10,k);});if(j){const a=(j-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}});
  strip.setAttribute('position',new T.Float32BufferAttribute(pos,3));strip.setAttribute('uv',new T.Float32BufferAttribute(uv,2));strip.setIndex(idx);strip.computeVertexNormals();put(strip,'blue');
  return true;
 }

 if(id==='pillow'){
  // Feather pillow: plump centre, pinched seamed edges and corners, a head hollow and blue ticking stripes.
  const W=.52,D=.32,H=.14,nx=30,nz=18;
  const height=(u:number,v:number)=>{const e=(1-Math.pow(Math.abs(u),3.2))*(1-Math.pow(Math.abs(v),3.2));const hollow=Math.exp(-((u+.08)**2/.08+(v-.05)**2/.15))*.18;return Math.max(0,Math.pow(e,.55)*(1-hollow));};
  const shell=(sign:number)=>{const pos:number[]=[],uv:number[]=[],idx:number[]=[];
   for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const u=i/nx*2-1,v=j/nz*2-1,pinch=1-.06*Math.pow(Math.abs(u*v),2);
    pos.push(u*W/2*pinch,H/2+sign*height(u,v)*H/2*(sign>0?1:.8),v*D/2*pinch);uv.push(i/nx,j/nz);}
   for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(sign>0)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;};
  const top=shell(1),bottom=shell(-1);
  // Rest the underside on the bed: shift so the lowest point is y=0.
  bottom.computeBoundingBox();const lift=-bottom.boundingBox!.min.y;top.translate(0,lift,0);bottom.translate(0,lift,0);
  put(top,'linen');put(bottom,'linen');
  // Piped seam round the edge.
  const seam:T.Vector3[]=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2,c=Math.cos(a),s=Math.sin(a);const u=Math.sign(c)*Math.pow(Math.abs(c),.3),v=Math.sign(s)*Math.pow(Math.abs(s),.3);const pinch=1-.06*Math.pow(Math.abs(u*v),2);seam.push(V(u*W/2*pinch,H/2+lift,v*D/2*pinch));}
  put(tube(seam,.0045,6,true),'linen');
  // Ticking stripes follow the top surface.
  for(let k=0;k<11;k++){const v=-.9+k*.18,pts:number[]=[],uvs:number[]=[],ids:number[]=[];
   for(let i=0;i<=nx;i++){const u=i/nx*2-1;for(const dv of [-.018,.018]){const vv=v+dv,pinch=1-.06*Math.pow(Math.abs(u*vv),2);pts.push(u*W/2*pinch,H/2+height(u,vv)*H/2+lift+.0012,vv*D/2*pinch);uvs.push(i/nx,dv>0?1:0);}
    if(i){const a=(i-1)*2;ids.push(a,a+1,a+2,a+1,a+3,a+2);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(ids);g.computeVertexNormals();put(g,'blue');}
  return true;
 }

 if(id==='boots'||id==='clogs'){
  const clog=id==='clogs';
  const shoe=(x:number,turn:number,seed:number)=>{
   const L=clog?.28:.29,rnd=seeded(seed),group:{g:T.BufferGeometry;m:ObjectMaterial}[]=[];
   const soleT=clog?.034:.016,rows=22;
   // Footprint: narrow heel, waisted instep, broad rounded toe.
   const width=(t:number)=>.036+.012*Math.sin(Math.PI*Math.min(1,t*1.15))+(t>.55?.012*Math.sin((t-.55)/.45*Math.PI*.9):0)-(t>.93?(t-.93)*.5:0);
   const toeSpring=(t:number)=>clog?Math.pow(Math.max(0,t-.72)/.28,2)*.028:Math.pow(Math.max(0,t-.8)/.2,2)*.01;
   // Sole: lofted slab (wooden clog sole is thick with a rocker; boot sole is leather with a heel block).
   const sole:T.Vector3[][]=[];for(let j=0;j<=rows;j++){const t=j/rows,z=-L/2+t*L,w=width(t)+.004;const lift=toeSpring(t);
    const r=ring(V(0,soleT/2+lift,z),V(1,0,0),V(0,1,0),w,soleT/2,18,6);sole.push(r.map(p=>V(p.x,Math.max(lift,p.y),p.z)));}
   group.push({g:loft(sole,true,true,true),m:clog?'oak':'darkwood'});
   if(!clog){const heel=new T.BoxGeometry(.066,.024,.075);heel.translate(0,.012,-L/2+.042);group.push({g:heel,m:'darkwood'});}
   // Upper: lofted over the last from heel counter to toe; the vamp opening and the boot shaft.
   const up:T.Vector3[][]=[],base=soleT+(clog?0:.0);
   for(let j=0;j<=rows;j++){const t=j/rows,z=-L/2+.006+t*(L-.012),w=width(t)*.97,lift=toeSpring(t);
    const hgt=clog?(t<.55?.07:.07*(1-(t-.55)/.45*.45)):(t<.5?.085:.085*(1-(t-.5)/.5*.52));
    const r=ring(V(0,base+lift,z),V(1,0,0),V(0,1,0),w,hgt,20,2.2).map(p=>V(p.x,Math.max(base+lift,p.y),p.z));up.push(r);}
   group.push({g:loft(up,true,true,true),m:'darkwood'});
   // Toe cap seam and welt line.
   const seam:T.Vector3[]=[];for(let i=0;i<=16;i++){const a=Math.PI*(i/16),t=.82;const w=width(t)*.99,h=(clog?.055:.06);seam.push(V(Math.cos(a)*w,base+toeSpring(t)+Math.sin(a)*h*.9,-L/2+t*L));}
   group.push({g:tube(seam,.0018,4),m:'coal'});
   if(clog){
    // Irons ("caulkers") nailed under the sole, brass tacks round the welt, and an instep clasp.
    for(const [a,b] of [[.02,.42],[.6,.98]] as const){const pts:T.Vector3[]=[];for(let i=0;i<=12;i++){const t=a+(b-a)*i/12;pts.push(V(width(t)*.82,.004+toeSpring(t),-L/2+t*L));}
     const pts2=pts.map(p=>V(-p.x,p.y,p.z)).reverse();group.push({g:tube([...pts,...pts2],.0035,5),m:'iron'});}
    for(let i=0;i<26;i++){const t=.05+i*.035;if(t>.97)break;for(const s of [-1,1]){const c=new T.SphereGeometry(.0035,5,3);c.translate(s*(width(t)+.001),soleT+toeSpring(t)+.006,-L/2+t*L);group.push({g:c,m:'copper'});}}
    const opening=new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);opening.scale(.03,.004,.06);opening.translate(0,soleT+.069,-L/2+.3*L);group.push({g:opening,m:'coal'});
    const clasp=new T.BoxGeometry(.03,.012,.004);clasp.rotateX(-.9);clasp.translate(.02,.1,-.01);group.push({g:clasp,m:'copper'});
   }else{
    // Boot shaft above the ankle with a pull tab, tongue, eyelets and a crossed lace.
    const shaft:T.Vector3[][]=[];for(let j=0;j<=8;j++){const t=j/8,y=base+.06+t*.11;shaft.push(ring(V(0,y,-L/2+.075+t*.008),V(1,0,0),V(0,0,1),.042+t*.004,.05+t*.004,20,2.3));}
    group.push({g:loft(shaft),m:'darkwood'});
    const lining:T.Vector3[][]=[];for(let j=0;j<=8;j++){const t=j/8,y=base+.06+t*.108;lining.push(ring(V(0,y,-L/2+.075+t*.008),V(1,0,0),V(0,0,1),.037+t*.004,.045+t*.004,20,2.3));}
    group.push({g:loft(lining,true,false,true),m:'coal'});
    const collar=new T.TorusGeometry(1,.0045,5,24);collar.scale(.047,.055,1);collar.rotateX(Math.PI/2);collar.translate(0,base+.17,-L/2+.083);group.push({g:collar,m:'darkwood'});
    const tab=new T.TorusGeometry(.012,.003,4,10,Math.PI);tab.translate(0,base+.17,-L/2+.03);group.push({g:tab,m:'darkwood'});
    const tongue=new T.BoxGeometry(.034,.12,.006);tongue.rotateX(-.5);tongue.translate(0,base+.13,-L/2+.14);group.push({g:tongue,m:'darkwood'});
    const eyes:T.Vector3[][]=[];for(let i=0;i<6;i++){const y=base+.085+i*.016,z=-L/2+.16-i*.012;eyes.push([V(-.022,y,z),V(.022,y,z)]);for(const e of eyes[i]){const eye=new T.TorusGeometry(.003,.0012,4,8);eye.lookAt(V(0,.5,1));eye.translate(e.x,e.y,e.z+.004);group.push({g:eye,m:'steel'});}}
    const lace:T.Vector3[]=[];for(let i=0;i<6;i++){const [a,b]=eyes[i];lace.push(i%2?a.clone():b.clone());lace.push(i%2?b.clone():a.clone());}
    group.push({g:tube(lace.map(p=>p.add(V(0,0,.006))),.0014,4),m:'linen'});
    const bow=new T.TorusGeometry(.009,.0016,4,10);bow.translate(-.008,base+.17,-L/2+.105);group.push({g:bow,m:'linen'});
    // Hobnails round the sole edge.
    for(let i=0;i<30;i++){const t=.04+i*.031;if(t>.98)break;for(const s of [-1,1]){const n=new T.SphereGeometry(.003,5,3);n.scale(1,.5,1);n.translate(s*(width(t)-.004),.0016,-L/2+t*L);group.push({g:n,m:'steel'});}}
   }
   const m=new T.Matrix4().compose(V(x,0,0),new T.Quaternion().setFromEuler(new T.Euler(0,turn,0)),V(1,1,1));
   for(const {g,m:mat} of group){g.applyMatrix4(m);put(g,mat);}
  };
  shoe(-.075,.08,5);shoe(.08,-.14,9);
  return true;
 }

 if(id==='scrub-brush'){
  // Scrubbing brush: a boat-shaped beech back with finger grooves and dense bristle tufts set in rows.
  const back:T.Vector3[][]=[];for(let j=0;j<=10;j++){const t=j/10,y=.034+t*.022,shrink=1-Math.pow(t,3)*.25;back.push(ring(V(0,y,0),V(1,0,0),V(0,0,1),.075*shrink,.036*shrink,32,3.4,a=>1-.06*Math.pow(Math.abs(Math.sin(a)),8)*(t>.3&&t<.7?1:0)));}
  put(loft(back,true,true),'oak');
  for(let i=0;i<13;i++)for(let j=0;j<6;j++){const x=(i-6)*.0108,z=(j-2.5)*.0112;if((x/.07)**2+(z/.033)**2>.92)continue;
   const len=.03-random()*.004,splay=V(x,0,z).multiplyScalar(.12),t=new T.CylinderGeometry(.0042,.0052,len,6,1,true);
   t.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),V(splay.x,1,splay.z).normalize()));put(t,'linen',x+(random()-.5)*.0015,len/2+.002,z+(random()-.5)*.0015);
   const tip=new T.CircleGeometry(.0052,6);tip.rotateX(Math.PI/2);put(tip,'linen',x+splay.x*len*.5,.002,z+splay.z*len*.5);}
  return true;
 }

 if(id==='onion-string'){
  // Onions plaited by their dried necks into a straw rope, hung from a loop; papery skins, root plates.
  const onion=(size:number,seed:number)=>{const rnd=seeded(seed);
   const g=lathe([[0,-1],[.18,-.97],[.55,-.78],[.92,-.35],[1,.05],[.88,.45],[.55,.78],[.2,1.05],[.08,1.35],[.03,1.6],[0,1.62]],18,(p,a)=>{const k=1+.05*Math.sin(a*5+seed)+.03*Math.sin(a*9);p.x*=k;p.z*=k;});
   g.scale(size,size*.95,size);return {g,rnd};};
  const axis=(y:number)=>V(Math.sin(y*9)*.006,y,Math.cos(y*9)*.004);
  // Plaited straw core: three twisted strands.
  for(let s=0;s<3;s++){const pts:T.Vector3[]=[];for(let i=0;i<=40;i++){const y=.02+i/40*.5,a=y*38+s*2.1;pts.push(axis(y).add(V(Math.cos(a)*.009,0,Math.sin(a)*.009)));}put(tube(pts,.0035,5),'oak');}
  const loopRing=new T.TorusGeometry(.022,.0035,5,18);put(loopRing,'oak',0,.545,0);
  for(let i=0;i<15;i++){const y=.05+i*.03,a=i*2.4,size=.042-i*.0012+(i%3)*.003;const {g}=onion(size,i*7+3);
   const out=V(Math.cos(a),0,Math.sin(a)*.8),centre=axis(y).addScaledVector(out,size*.95).add(V(0,-size*.25,0));
   // Neck points toward the plait.
   g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),axis(y+.03).sub(centre).normalize()));put(g,i%4===1?'oak':'clay',centre.x,centre.y,centre.z);
   // Root tuft at the base.
   const root=new T.ConeGeometry(size*.25,size*.3,6);root.rotateX(Math.PI);root.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),centre.clone().sub(axis(y+.03)).normalize()));
   const tipPos=centre.clone().addScaledVector(centre.clone().sub(axis(y+.03)).normalize(),size*1.05);put(root,'linen',tipPos.x,tipPos.y,tipPos.z);}
  return true;
 }
 return false;
}

function ring3(put:Put,x:number,y:number,z:number,r:number){const t=new T.TorusGeometry(r,.009,6,24);t.rotateX(Math.PI/2);put(t,'iron',x,y,z);}
