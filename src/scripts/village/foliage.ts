import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Broadleaf trees and shrubs are built from alpha-tested leaf-cluster cards.
// Each card carries a painted spray of leaves on a twig; card normals follow the
// crown volume, so the canopy shades as lumpy masses instead of loose triangles.

/**
 * Leaf cards render on their own layer: the main, reflection and environment cameras see it,
 * but the GTAO camera (layer 0 only) must not, because its override pass ignores alpha cut-outs.
 */
export const FOLIAGE_LAYER=2;

export const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

/** Atlas cells: 0–1 broadleaf sprays, 2 hawthorn/hazel shrub spray, 3 bramble spray, 4 fir spray, 5 pine tufts, 6 fresh fern frond, 7 overwintered fern frond, 8 ivy. */
export type LeafCell=0|1|2|3|4|5|6|7|8;
const CELL=512,COLUMNS=4,ROWS=3,WIDTH=CELL*COLUMNS,HEIGHT=CELL*ROWS;
const cellOrigin=(cell:LeafCell):[number,number]=>[(cell%COLUMNS)*CELL,Math.floor(cell/COLUMNS)*CELL];
let atlas:T.DataTexture|null=null;

function leafOutline(ctx:CanvasRenderingContext2D,length:number,width:number,lobes:number,serration:number){
 ctx.beginPath();
 const steps=28;
 for(let side=1;side>=-1;side-=2)for(let k=0;k<=steps;k++){
  const t=side>0?k/steps:1-k/steps;
  const lobe=lobes?(.72+.28*Math.abs(Math.sin(t*Math.PI*lobes))):1;
  const tooth=serration?1+serration*((k%2)?1:-1):1;
  const half=width*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.08)),.85)*(1-.25*t)*lobe*tooth;
  const x=t*length,y=-side*half;
  if(side>0&&k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 ctx.closePath();
}
type Spray={leaves:[number,number,number][];lobes:number;serration:number;size:[number,number];width:number;palette:string[];twig:string;stemCount:number};
function drawSpray(ctx:CanvasRenderingContext2D,[ox,oy]:[number,number],spec:Spray,random:()=>number){
 ctx.save();ctx.translate(ox,oy);
 ctx.beginPath();ctx.rect(6,6,CELL-12,CELL-12);ctx.clip();
 // Twigs rise from the lower centre and fork; leaves gather at the shoot tips.
 const tips:{x:number;y:number;a:number}[]=[];
 const grow=(x:number,y:number,a:number,len:number,width:number,depth:number)=>{
  const bend=(random()-.5)*.5,mx=x+Math.cos(a+bend*.5)*len*.5,my=y+Math.sin(a+bend*.5)*len*.5,ex=x+Math.cos(a+bend)*len,ey=y+Math.sin(a+bend)*len;
  ctx.strokeStyle=spec.twig;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
  for(let i=1;i<=3;i++){const t=i/3.4;tips.push({x:x+(ex-x)*t,y:y+(ey-y)*t,a:a+bend*t+(i%2?1:-1)*(.7+random()*.5)});}
  if(depth>0){for(const turn of [-.55,.5])if(random()<.9)grow(ex,ey,a+turn+(random()-.5)*.35,len*(.58+random()*.18),width*.66,depth-1);}
  else tips.push({x:ex,y:ey,a});
 };
 for(let s=0;s<spec.stemCount;s++)grow(CELL*(.44+random()*.12),CELL*.97,-Math.PI/2+(s-(spec.stemCount-1)/2)*.42+(random()-.5)*.2,CELL*.30,5.5,2);
 // Back leaves first and darker, front leaves last and brighter.
 const order=[...tips.keys()].sort(()=>random()-.5);
 order.forEach((index,n)=>{
  const tip=tips[index],depth=n/Math.max(1,order.length-1);
  for(const [spread,scale,lift] of spec.leaves){
   const a=tip.a+spread+(random()-.5)*.35,len=(spec.size[0]+random()*(spec.size[1]-spec.size[0]))*scale;
   ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(a);
   const base=spec.palette[Math.floor(random()*spec.palette.length)];
   const g=ctx.createLinearGradient(0,-len*spec.width,0,len*spec.width);
   const shade=.55+depth*.45+lift;
   g.addColorStop(0,shadeColour(base,shade*1.12));g.addColorStop(.5,shadeColour(base,shade));g.addColorStop(1,shadeColour(base,shade*.72));
   ctx.fillStyle=g;leafOutline(ctx,len,len*spec.width,spec.lobes,spec.serration);ctx.fill();
   ctx.strokeStyle=shadeColour(base,shade*1.28);ctx.globalAlpha=.55;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(len*.9,0);ctx.stroke();
   ctx.globalAlpha=.25;ctx.lineWidth=.8;for(let v=1;v<5;v++){const x=len*v/5.5,y=len*spec.width*.55*(1-v/6);ctx.beginPath();ctx.moveTo(x-len*.06,0);ctx.lineTo(x+len*.05,-y);ctx.moveTo(x-len*.06,0);ctx.lineTo(x+len*.05,y);ctx.stroke();}
   ctx.globalAlpha=1;ctx.restore();
  }
 });
 ctx.restore();
}
function shadeColour(hex:string,f:number){const c=new T.Color(hex);c.r=Math.min(1,c.r*f);c.g=Math.min(1,c.g*f);c.b=Math.min(1,c.b*f);return '#'+c.getHexString();}

/** Box-filtered mip chain that preserves alpha-test coverage, so distant crowns do not thin out. */
function coverageMips(level0:Uint8Array,width:number,height:number,threshold:number){
 const coverage=(d:Uint8Array,scale:number)=>{let n=0;for(let i=3;i<d.length;i+=4)if(Math.min(255,d[i]*scale)>threshold)n++;return n/(d.length/4);};
 const target=coverage(level0,1),mips=[{data:level0,width,height}];
 let source=level0,w=width,h=height;
 while(w>1||h>1){
  const nw=Math.max(1,w>>1),nh=Math.max(1,h>>1),out=new Uint8Array(nw*nh*4);
  for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){let r=0,g=0,b=0,a=0;
   for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]]){const sx=Math.min(w-1,x*2+dx),sy=Math.min(h-1,y*2+dy),i=(sy*w+sx)*4,k=source[i+3]+1;r+=source[i]*k;g+=source[i+1]*k;b+=source[i+2]*k;a+=source[i+3];}
   const i=(y*nw+x)*4,k=a+4;out[i]=r/k;out[i+1]=g/k;out[i+2]=b/k;out[i+3]=a/4;}
  let lo=1,hi=4;for(let k=0;k<14;k++){const mid=(lo+hi)/2;if(coverage(out,mid)<target)lo=mid;else hi=mid;}
  const scale=(lo+hi)/2;for(let i=3;i<out.length;i+=4)out[i]=Math.min(255,out[i]*scale);
  mips.push({data:out,width:nw,height:nh});source=out;w=nw;h=nh;
 }
 return mips;
}

/** A pinnate fern frond standing in its cell: rachis up the middle, lanceolate outline, lobed pinnae. */
function drawFern(ctx:CanvasRenderingContext2D,[ox,oy]:[number,number],palette:string[],tipDry:number,random:()=>number){
 ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(4,4,CELL-8,CELL-8);ctx.clip();
 const x0=CELL*.5,y0=CELL*.99,top=CELL*.03,height=y0-top;
 ctx.strokeStyle='#5d6b33';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(x0+6,y0-height*.5,x0,top);ctx.stroke();
 for(let i=0;i<30;i++){const t=.1+i/30*.88,y=y0-height*t,envelope=Math.pow(Math.sin(Math.PI*Math.min(1,(t-.06)/.96)),.75),len=CELL*.43*envelope;
  for(const side of [-1,1]){
   const rise=Math.PI/2-(1.05-t*.25)+(random()-.5)*.08,dry=t>1-tipDry&&random()<.8;
   const base=palette[Math.floor(random()*palette.length)],colour=dry?'#8a6a3c':base;
   ctx.save();ctx.translate(x0+side*2+Math.sin(t*3)*3,y);ctx.rotate(side>0?-rise:Math.PI+rise);
   const g=ctx.createLinearGradient(0,-6,0,6);g.addColorStop(0,shadeColour(colour,1.15));g.addColorStop(1,shadeColour(colour,.78));ctx.fillStyle=g;
   leafOutline(ctx,len,Math.max(3.5,len*.16),Math.max(3,len/9),0);ctx.fill();
   ctx.restore();
  }
 }
 ctx.restore();
}

/** Common ivy: a wiry stem with alternate, glossy, three-to-five-lobed leaves on long stalks. */
function drawIvy(ctx:CanvasRenderingContext2D,[ox,oy]:[number,number],random:()=>number){
 ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(6,6,CELL-12,CELL-12);ctx.clip();
 const palette=['#2f4a24','#3a5629','#2a4020','#44602e','#355026'];
 for(let stem=0;stem<3;stem++){
  let x=CELL*(.3+stem*.2),y=CELL*.98,a=-Math.PI/2+(random()-.5)*.4;
  ctx.strokeStyle='#4a3b2a';ctx.lineWidth=3;
  for(let k=0;k<9;k++){
   const nx=x+Math.cos(a)*CELL*.1,ny=y+Math.sin(a)*CELL*.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(nx,ny);ctx.stroke();
   const side=k%2?1:-1,sa=a+side*(1.1+random()*.4),len=CELL*.05,lx=nx+Math.cos(sa)*len,ly=ny+Math.sin(sa)*len,size=CELL*(.07+random()*.035);
   ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(nx,ny);ctx.lineTo(lx,ly);ctx.stroke();ctx.lineWidth=3;
   // Palmate leaf: five pointed lobes, the middle one longest, pale veins.
   ctx.save();ctx.translate(lx,ly);ctx.rotate(sa+Math.PI/2+(random()-.5)*.5);const base=palette[Math.floor(random()*palette.length)];
   ctx.fillStyle=base;ctx.beginPath();
   const lobes=[[-1.25,.55],[-.62,.85],[0,1.05],[.62,.85],[1.25,.55]];
   ctx.moveTo(0,size*.18);
   for(let i=0;i<lobes.length;i++){const [ang,r]=lobes[i],px=Math.sin(ang)*size*r,py=-Math.cos(ang)*size*r;const mid=i<lobes.length-1?(ang+lobes[i+1][0])/2:ang+.6,mr=size*.42;
    ctx.lineTo(px,py);ctx.lineTo(Math.sin(mid)*mr,-Math.cos(mid)*mr);}
   ctx.closePath();ctx.fill();
   const g=ctx.createRadialGradient(-size*.2,-size*.4,0,0,-size*.3,size);g.addColorStop(0,'rgba(210,225,180,.28)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fill();
   ctx.strokeStyle='rgba(175,190,140,.55)';ctx.lineWidth=1;for(const [ang,r] of lobes){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.sin(ang)*size*r*.8,-Math.cos(ang)*size*r*.8);ctx.stroke();}
   ctx.restore();ctx.strokeStyle='#4a3b2a';
   x=nx;y=ny;a+=(random()-.5)*.6;a=Math.max(-Math.PI*.8,Math.min(-Math.PI*.2,a));
  }
 }
 ctx.restore();
}

/** Conifer shoots: short paired needles in two ranks along a forking twig (fir), or radiating brushes (pine). */
function drawNeedles(ctx:CanvasRenderingContext2D,[ox,oy]:[number,number],pine:boolean,random:()=>number){
 ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(6,6,CELL-12,CELL-12);ctx.clip();
 const old=pine?['#3d5640','#48613f','#34503a']:['#28432b','#304d31','#2b4630','#375434'],fresh=pine?['#6c8753','#5f7b4a']:['#6f9446','#7ea24d','#628a3f'];
 const shoot=(x:number,y:number,a:number,len:number,depth:number)=>{
  const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len;
  ctx.strokeStyle='#4b3a28';ctx.lineWidth=depth?3.2:2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
  const steps=Math.floor(len/(pine?7:4.5));
  for(let i=0;i<steps;i++){const t=i/steps,px=x+(ex-x)*t,py=y+(ey-y)*t,tip=t>.72;
   for(const side of pine?[-1,-.45,.45,1]:[-1,1]){
    const na=a+side*(pine?.55+random()*.35:1.25+random()*.25),nl=pine?38+random()*22:13+random()*8;
    const palette=tip?fresh:old;ctx.strokeStyle=palette[Math.floor(random()*palette.length)];ctx.lineWidth=pine?2:2.6;
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(na)*nl,py+Math.sin(na)*nl);ctx.stroke();}
  }
  if(depth>0)for(const t of pine?[.45]:[.3,.55,.75]){const bx=x+(ex-x)*t,by=y+(ey-y)*t;for(const side of [-1,1])shoot(bx,by,a+side*(.75+random()*.3),len*(pine?.55:.42)*(1-t*.4),depth-1);}
 };
 if(pine)for(let s=0;s<4;s++)shoot(CELL*(.3+s*.13),CELL*.95,-Math.PI/2+(s-1.5)*.32,CELL*(.42+random()*.12),1);
 else shoot(CELL*.5,CELL*.97,-Math.PI/2,CELL*.86,2);
 ctx.restore();
}

export function leafAtlas(){
 if(atlas)return atlas;
 // Node validation scripts build geometry without a DOM; give them a neutral placeholder.
 if(typeof document==='undefined')return new T.DataTexture(new Uint8Array([120,140,70,255]),1,1);
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d',{willReadFrequently:true})!;const random=seeded(5301865);
 const spring=['#6f8a3a','#7d963f','#62792f','#8a9b45','#6a8338','#5c7431'];
 // Oak-type lobed leaves in rosettes, then a smoother beech/ash-type spray.
 drawSpray(ctx,cellOrigin(0),{leaves:[[-.5,1,0],[0,1.08,.06],[.5,.95,0],[1.1,.8,-.05],[-1.1,.82,-.05]],lobes:4.5,serration:0,size:[46,66],width:.34,palette:spring,twig:'#4a3f2c',stemCount:2},random);
 drawSpray(ctx,cellOrigin(1),{leaves:[[-.45,1,0],[.45,1,.04],[0,1.1,.08]],lobes:0,serration:.05,size:[44,62],width:.36,palette:['#789441','#86a04a','#6b8537','#91a650','#708c3c'],twig:'#51452f',stemCount:3},random);
 drawSpray(ctx,cellOrigin(2),{leaves:[[-.6,1,0],[0,1,.05],[.6,1,0],[1.2,.8,-.05],[-1.2,.8,-.05]],lobes:2.5,serration:.08,size:[26,40],width:.42,palette:['#5d7535','#688139','#56702f','#7a8f44'],twig:'#443a2a',stemCount:3},random);
 drawSpray(ctx,cellOrigin(3),{leaves:[[-.35,1,0],[.35,1,0],[0,1.15,.05]],lobes:0,serration:.12,size:[34,50],width:.45,palette:['#3f5a2f','#4d6536','#5a6a33','#6c5a33','#46602f'],twig:'#5a3a33',stemCount:2},random);
 drawNeedles(ctx,cellOrigin(4),false,random);drawNeedles(ctx,cellOrigin(5),true,random);
 drawIvy(ctx,cellOrigin(8),random);
 drawFern(ctx,cellOrigin(6),['#6d9a3a','#79a444','#618d34','#86ad4d'],0,random);drawFern(ctx,cellOrigin(7),['#4f6a31','#5b7236','#47602d'],.3,random);
 const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data;
 // Canvas pixels are unpremultiplied: give transparent texels the cell's mean leaf colour to avoid dark mip fringes.
 const data=new Uint8Array(pixels.length);data.set(pixels);
 for(let cell=0;cell<COLUMNS*ROWS;cell++){const [x0,y0]=cellOrigin(cell as LeafCell);let r=0,g=0,b=0,n=0;
  for(let y=y0;y<y0+CELL;y++)for(let x=x0;x<x0+CELL;x++){const i=(y*WIDTH+x)*4;if(data[i+3]>200){r+=data[i];g+=data[i+1];b+=data[i+2];n++;}}
  r/=n||1;g/=n||1;b/=n||1;
  for(let y=y0;y<y0+CELL;y++)for(let x=x0;x<x0+CELL;x++){const i=(y*WIDTH+x)*4;if(data[i+3]<250){const a=data[i+3]/255;data[i]=data[i]*a+r*(1-a);data[i+1]=data[i+1]*a+g*(1-a);data[i+2]=data[i+2]*a+b*(1-a);}}
 }
 atlas=new T.DataTexture(data,WIDTH,HEIGHT,T.RGBAFormat);
 atlas.mipmaps=coverageMips(data,WIDTH,HEIGHT,.46*255);
 atlas.generateMipmaps=false;atlas.minFilter=T.LinearMipmapLinearFilter;atlas.magFilter=T.LinearFilter;
 atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;atlas.flipY=false;atlas.needsUpdate=true;
 return atlas;
}

type Card={centre:T.Vector3;normal:T.Vector3;up:T.Vector3;size:number;cell:LeafCell;shade:number;tint:number;shading:T.Vector3};
function cardGeometry(cards:Card[]){
 const position:number[]=[],normal:number[]=[],facing:number[]=[],uv:number[]=[],color:number[]=[],index:number[]=[];
 for(const card of cards){
  const n=card.normal.clone().normalize(),up=card.up.clone().sub(n.clone().multiplyScalar(card.up.dot(n))).normalize(),side=new T.Vector3().crossVectors(up,n).normalize();
  const [cx,cy]=cellOrigin(card.cell),u0=cx/WIDTH,v0=cy/HEIGHT,du=CELL/WIDTH,dv=CELL/HEIGHT,base=position.length/3;
  // The twig enters at the lower centre; hang the card slightly below its anchor.
  for(const [sx,sy] of [[-.5,-.12],[.5,-.12],[.5,.88],[-.5,.88]]){
   const p=card.centre.clone().addScaledVector(side,sx*card.size).addScaledVector(up,sy*card.size);
   position.push(p.x,p.y,p.z);normal.push(card.shading.x,card.shading.y,card.shading.z);facing.push(n.x,n.y,n.z);
   uv.push(u0+du*(.012+(sx+.5)*.976),v0+dv*(.012+(1-(sy+.12))*.976));
   const c=new T.Color().setRGB(card.shade*(1+card.tint*.10),card.shade*(1+card.tint*.04),card.shade*(1-card.tint*.12));
   color.push(c.r,c.g,c.b);
  }
  index.push(base,base+1,base+2,base,base+2,base+3);
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
 g.setAttribute('cardNormal',new T.Float32BufferAttribute(facing,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(index);
 g.computeBoundingSphere();g.computeBoundingBox();
 return g;
}
type Clump={centre:T.Vector3;radius:number;density:number;inner?:boolean;flat?:number};
function fillClumps(clumps:Clump[],crownCentre:T.Vector3,crownRadius:number,bottom:number,top:number,cells:LeafCell[],cardSize:[number,number],random:()=>number){
 const cards:Card[]=[];
 for(const clump of clumps){
  const count=Math.round(clump.density*clump.radius*clump.radius*(clump.inner?.45:1));
  for(let i=0;i<count;i++){
   let dir=new T.Vector3();do dir.set(random()*2-1,random()*2-1,random()*2-1);while(dir.lengthSq()>1||dir.lengthSq()<.05);dir.normalize();
   if(dir.y<-.35&&random()<.55)dir.y*=-.4;
   const shell=clump.inner?.2+.6*random():.5+.5*Math.sqrt(random());
   const centre=clump.centre.clone().add(dir.clone().multiply(new T.Vector3(1,clump.flat??.82,1)).multiplyScalar(clump.radius*shell));
   const local=centre.clone().sub(clump.centre).divideScalar(clump.radius),global=centre.clone().sub(crownCentre).divideScalar(crownRadius);
   const shading=local.clone().multiplyScalar(.55).add(global.clone().multiplyScalar(.6)).add(new T.Vector3(0,.28,0)).normalize();
   const facing=dir.clone().add(new T.Vector3(random()-.5,random()-.3,random()-.5).multiplyScalar(1.3)).normalize();
   const up=dir.clone().setY(0).multiplyScalar(.8).add(new T.Vector3(0,.9,0)).add(new T.Vector3(random()-.5,0,random()-.5).multiplyScalar(.8));
   const height=Math.min(1,Math.max(0,(centre.y-bottom)/(top-bottom)));
   const outer=Math.min(1,local.length()),exposure=Math.min(1,global.length());
   const shade=(.38+.62*(.38*outer*outer+.34*height+.28*exposure))*(.92+random()*.16);
   cards.push({centre,normal:facing,up,size:cardSize[0]+random()*(cardSize[1]-cardSize[0]),cell:cells[Math.floor(random()*cells.length)],shade,tint:random()*2-1,shading});
  }
 }
 return cardGeometry(cards);
}

/** Tapered, curved limbs merged into one instanced trunk; UV V is scaled by length/circumference for bark detail. */
export type Limb={points:T.Vector3[];r0:number;r1:number};
export function limbGeometry(limb:Limb){
 const parts:T.BufferGeometry[]=[];let travelled=0;
 const total=limb.points.slice(1).reduce((s,p,i)=>s+p.distanceTo(limb.points[i]),0);
 for(let i=1;i<limb.points.length;i++){
  const a=limb.points[i-1],b=limb.points[i],length=a.distanceTo(b);
  const ra=limb.r0+(limb.r1-limb.r0)*travelled/total,rb=limb.r0+(limb.r1-limb.r0)*(travelled+length)/total;
  const g=new T.CylinderGeometry(rb,ra,length+Math.min(ra,rb)*.9,ra>.1?9:6,1,true);
  const uv=g.attributes.uv,circumference=Math.PI*2*ra;
  for(let k=0;k<uv.count;k++)uv.setY(k,(travelled+uv.getY(k)*length)/circumference*.229);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()));
  g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
  parts.push(g);travelled+=length;
 }
 return parts;
}
export function curve(from:T.Vector3,direction:T.Vector3,length:number,lift:number,segments:number,random:()=>number){
 const points=[from.clone()],d=direction.clone().normalize();
 for(let i=1;i<=segments;i++){d.y+=lift/segments;d.x+=(random()-.5)*.25;d.z+=(random()-.5)*.25;d.normalize();points.push(points[i-1].clone().addScaledVector(d,length/segments));}
 return points;
}

/** Ivy climbing a curved stem: cards pressed to the bark on one broad side, thinning with height. */
function ivyGeometry(stem:T.Vector3[],r0:number,r1:number,random:()=>number){
 const cards:Card[]=[],total=stem.slice(1).reduce((s,p,i)=>s+p.distanceTo(stem[i]),0),face=random()*Math.PI*2,reach=2.2+random()*2.2;
 for(let i=0;i<380;i++){
  const t=Math.pow(random(),1.35)*Math.min(1,reach/total);let d=t*total,k=0;
  while(k<stem.length-2&&d>stem[k].distanceTo(stem[k+1])){d-=stem[k].distanceTo(stem[k+1]);k++;}
  const a=stem[k],b=stem[k+1],axis=b.clone().sub(a).normalize(),p=a.clone().lerp(b,Math.min(1,d/a.distanceTo(b)));
  if(p.y<.02)continue;
  const spread=(random()-.5)*(3.4-2.2*t/Math.min(1,reach/total)),theta=face+spread;
  const out=new T.Vector3(Math.cos(theta),0,Math.sin(theta));out.addScaledVector(axis,-out.dot(axis)).normalize();
  const radius=r0+(r1-r0)*t+.012;
  cards.push({centre:p.clone().addScaledVector(out,radius+.02),normal:out.clone().add(new T.Vector3((random()-.5)*.5,(random()-.3)*.4,(random()-.5)*.5)).normalize(),up:axis.clone().add(new T.Vector3((random()-.5)*.6,0,(random()-.5)*.6)),size:.34+random()*.2,cell:8,shade:.55+.45*random(),tint:random()*2-1,shading:out.clone().add(new T.Vector3(0,.35,0)).normalize()});
 }
 return cardGeometry(cards);
}

/**
 * Moss and lichen on bark: green on the damp north (−Z) side and on upper surfaces, strongest near the
 * ground and on fallen wood. Uses barkCoverage, so conifer stems stay mostly clean.
 */
export function mossyBark(material:T.MeshStandardMaterial){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader='varying vec3 mossNormal;varying float mossHeight;varying vec3 mossPoint;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   mat3 mossBasis=mat3(modelMatrix);
   #ifdef USE_INSTANCING
    mossBasis=mossBasis*mat3(instanceMatrix);
   #endif
   mossNormal=normalize(mossBasis*objectNormal);mossHeight=position.y;mossPoint=position;`);
  shader.fragmentShader='varying vec3 mossNormal;varying float mossHeight;varying vec3 mossPoint;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
   float mossPatch=fract(sin(dot(floor(mossPoint*vec3(14.,6.,14.)),vec3(12.9898,78.233,31.17)))*43758.5453);
   float mossBlob=.5+.5*sin(mossPoint.x*9.+sin(mossPoint.y*3.1)*2.+mossPoint.z*7.);
   float mossSide=smoothstep(-.35,.6,dot(normalize(mossNormal),normalize(vec3(0.,.55,-1.))));
   float mossLow=1.-smoothstep(.2,2.8+mossBlob,mossHeight);
   float mossAmount=clamp(mossSide*(.35+.65*mossLow)*(.55+.45*mossBlob)+(mossPatch-.5)*.25,0.,1.);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.15,.23,.06)*(.8+mossPatch*.5),smoothstep(.22,.62,mossAmount)*.9);
   // Pale grey-green lichen crusts higher on the stem.
   float lichen=smoothstep(.78,.95,mossPatch)*(1.-mossLow)*smoothstep(.2,.8,mossSide+.3);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.42,.46,.36),lichen*.55);
   #include <roughnessmap_fragment>`);
 };
 material.customProgramCacheKey=()=>key+'|mossy-bark-v1';
 material.needsUpdate=true;
 return material;
}

export type Broadleaf={trunk:T.BufferGeometry;crown:T.BufferGeometry;ivy?:T.BufferGeometry};
/**
 * Broadleaf variants keep the original crown envelope (≈2.6 m radius, 3.1–7.5 m high)
 * so tree clearances, crown hiding and shadows remain valid for every placement.
 */
export function broadleafVariants():Broadleaf[]{
 return [0,1,2].map(variant=>{
  const random=seeded(7731865+variant*977);
  const limbs:Limb[]=[],clumps:Clump[]=[];
  const lean=new T.Vector3((random()-.5)*.18,1,(random()-.5)*.18);
  const stem=curve(new T.Vector3(0,-.35,0),lean,5.6+variant*.35,0,5,random);
  limbs.push({points:stem,r0:.22,r1:.07});
  // Buttress roots flare into the ground rather than a cylinder meeting the soil.
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+random()*.5,reach=.3+random()*.12;limbs.push({points:[new T.Vector3(Math.cos(a)*.08,.34,Math.sin(a)*.08),new T.Vector3(Math.cos(a)*reach,-.02,Math.sin(a)*reach),new T.Vector3(Math.cos(a)*(reach+.2),-.2,Math.sin(a)*(reach+.2))],r0:.12,r1:.045});}
  const count=[5,6,5][variant],reach=[1.75,1.45,1.95][variant],rise=[.55,.85,.35][variant];
  for(let i=0;i<count;i++){
   const a=i*2.39996+variant*.7+(random()-.5)*.4,h=1.9+i/count*1.8+random()*.3;
   const from=stem[Math.min(stem.length-2,Math.floor(h/1.15))].clone().lerp(stem[Math.min(stem.length-1,Math.floor(h/1.15)+1)],.5);from.y=h;
   const dir=new T.Vector3(Math.cos(a),rise+random()*.25,Math.sin(a));
   const limb=curve(from,dir,reach*(.85+random()*.3)*(1-i/count*.25),.35,3,random);
   limbs.push({points:limb,r0:.095-i*.006,r1:.035});
   const tip=limb[limb.length-1];
   for(const turn of [-.6,.55]){const d=tip.clone().sub(limb[limb.length-2]).normalize();d.applyAxisAngle(new T.Vector3(0,1,0),turn+(random()-.5)*.4);d.y+=.35;
    const twig=curve(limb[limb.length-2].clone().lerp(tip,.5),d,.75+random()*.45,.2,2,random);limbs.push({points:twig,r0:.035,r1:.014});
    clumps.push({centre:twig[twig.length-1].clone().add(new T.Vector3(0,.25,0)),radius:.95+random()*.35,density:30});}
   clumps.push({centre:tip.clone().add(new T.Vector3(0,.35,0)),radius:1.05+random()*.3,density:30});
  }
  const top=stem[stem.length-1];
  clumps.push({centre:top.clone().add(new T.Vector3(0,.55,0)),radius:1.35,density:30});
  clumps.push({centre:new T.Vector3(0,4.9,0),radius:1.7,density:22,inner:true});
  // Squeeze into the original envelope.
  const crownCentre=new T.Vector3(0,5.3,0);
  for(const c of clumps){const h=new T.Vector2(c.centre.x,c.centre.z),max=2.55-c.radius*.6;if(h.length()>max){h.setLength(max);c.centre.x=h.x;c.centre.z=h.y;}c.centre.y=Math.min(7.5-c.radius*.75,Math.max(3.1+c.radius*.7,c.centre.y));}
  const crown=fillClumps(clumps,crownCentre,2.7,3.0,7.6,variant===1?[1,1,0]:[0,0,1],[.95,1.3],random);
  const trunk=mergeGeometries(limbs.flatMap(limbGeometry));
  trunk.computeBoundingSphere();
  return {trunk,crown,ivy:ivyGeometry(stem,.22,.07,seeded(7931865+variant*131))};
 });
}

/**
 * Conifers keep the original envelopes: firs tier from 1.7 m to ≈7 m with 2.45 m lower arms;
 * pines carry an open, flattened canopy between 4.3 and 6.6 m on a clean upper stem.
 */
export function coniferVariant(pine:boolean):Broadleaf{
 const random=seeded(pine?9121865:9341865),limbs:Limb[]=[];
 if(pine){
  const stem=curve(new T.Vector3(0,-.35,0),new T.Vector3(.06,1,-.04),6.7,0,5,random);
  limbs.push({points:stem,r0:.2,r1:.05});
  const clumps:Clump[]=[];
  for(let i=0;i<6;i++){
   const a=i*2.39996+random()*.5,h=4.1+i*.33+random()*.2,from=new T.Vector3(stem[4].x*(h/5.1),h,stem[4].z*(h/5.1));
   const limb=curve(from,new T.Vector3(Math.cos(a),.28+random()*.3,Math.sin(a)),1.25+random()*.55-(i>3?.4:0),.25,3,random);
   limbs.push({points:limb,r0:.075,r1:.028});
   const tip=limb[limb.length-1];
   clumps.push({centre:tip.clone().add(new T.Vector3(0,.2,0)),radius:.85+random()*.25,density:34,flat:.55});
   clumps.push({centre:limb[1].clone().lerp(tip,.5).add(new T.Vector3(0,.25,0)),radius:.6+random()*.15,density:30,flat:.55});
  }
  clumps.push({centre:stem[stem.length-1].clone().add(new T.Vector3(0,.2,0)),radius:.95,density:34,flat:.6});
  for(const c of clumps){const h=new T.Vector2(c.centre.x,c.centre.z),max=2.25-c.radius*.5;if(h.length()>max){h.setLength(max);c.centre.x=h.x;c.centre.z=h.y;}c.centre.y=Math.min(6.6-c.radius*.4,Math.max(4.3,c.centre.y));}
  return {trunk:mergeGeometries(limbs.flatMap(limbGeometry)),crown:fillClumps(clumps,new T.Vector3(0,5.4,0),2.3,4,6.9,[5],[.85,1.15],random)};
 }
 limbs.push({points:[new T.Vector3(0,-.35,0),new T.Vector3(0,3.5,0),new T.Vector3(.03,7.9,0)],r0:.21,r1:.03});
 const cards:Card[]=[],centre=new T.Vector3(0,4.4,0);
 for(let layer=0;layer<9;layer++)for(let arm=0;arm<7;arm++){
  const y=1.7+layer*.65,length=2.45*(1-layer/10)*(.85+random()*.25),a=arm*Math.PI*2/7+layer*1.73+(random()-.5)*.3;
  const out=new T.Vector3(Math.cos(a),0,Math.sin(a));
  // Arms droop from the stem and lift slightly at the tip.
  const at=(t:number)=>out.clone().multiplyScalar(length*t).add(new T.Vector3(0,y+.05-.42*t*length/2.45+.18*t*t*t,0));
  limbs.push({points:[at(0),at(.5),at(.85)],r0:.028,r1:.01});
  // Each arm carries flat sprays above and pendulous branchlets hanging beneath, so it reads from any side.
  const n=Math.max(3,Math.ceil(length/.34)),side=new T.Vector3(-out.z,0,out.x);
  for(let j=0;j<n;j++){
   const t=(j+.5)/n,p=at(t).add(new T.Vector3((random()-.5)*.1,(random()-.5)*.06,(random()-.5)*.1));
   const shading=out.clone().multiplyScalar(.55+t*.35).add(new T.Vector3(0,.55,0)).add(p.clone().sub(centre).multiplyScalar(.12)).normalize();
   const height=layer/8,shade=(.42+.58*(.45*t+.35*height+.2))*(.9+random()*.2),size=(.8+random()*.22)*(1-.2*t)*(1-layer*.035);
   const along=out.clone().applyAxisAngle(new T.Vector3(0,1,0),(random()-.5)*.6).add(new T.Vector3(0,-.1+t*.12,0));
   // Sprays are tilted both ways about the arm, so some face the viewer at any height.
   for(const tilt of [-1,1])cards.push({centre:p.clone().addScaledVector(along,-.12),normal:new T.Vector3(0,1,0).addScaledVector(side,tilt*(.55+random()*.4)).addScaledVector(out,.25),up:along,size,cell:4,shade,tint:random()*2-1,shading});
   for(const s of [-1,1]){
    const hang=new T.Vector3(0,-1,0).addScaledVector(out,.45+random()*.25).addScaledVector(side,s*.2);
    cards.push({centre:p.clone().addScaledVector(side,s*.06),normal:side.clone().multiplyScalar(s).addScaledVector(out,(random()-.5)*.8),up:hang,size:size*.85,cell:4,shade:shade*.9,tint:random()*2-1,shading});
   }
  }
 }
 for(let k=0;k<5;k++){const a=k*1.26;cards.push({centre:new T.Vector3(0,7.2+k*.1,0),normal:new T.Vector3(Math.cos(a),.2,Math.sin(a)),up:new T.Vector3(0,1,0),size:.7-k*.06,cell:4,shade:1,tint:.5,shading:new T.Vector3(Math.cos(a)*.5,.9,Math.sin(a)*.5).normalize()});}
 return {trunk:mergeGeometries(limbs.flatMap(limbGeometry)),crown:cardGeometry(cards)};
}

/** Shrub envelope matches the original bush (≈0.72 m radius, 0.15–1.1 m high). */
export function shrubGeometry(){
 const random=seeded(8421865),clumps:Clump[]=[];
 for(let i=0;i<5;i++){const a=i*2.4+random()*.5,r=i?.34+random()*.12:0;clumps.push({centre:new T.Vector3(Math.cos(a)*r,i?.5+random()*.2:.72,Math.sin(a)*r),radius:.38+random()*.12,density:150});}
 clumps.push({centre:new T.Vector3(0,.42,0),radius:.5,density:150,inner:true});
 return fillClumps(clumps,new T.Vector3(0,.6,0),.8,.1,1.15,[2,2,2,3],[.5,.68],random);
}

/** A 2.6 m run of hawthorn hedge, elongated along local X, about 1.6 m high. */
export function hedgeGeometry(){
 const random=seeded(7751865),clumps:Clump[]=[];
 for(let i=0;i<4;i++)clumps.push({centre:new T.Vector3(-1.05+i*.7+(random()-.5)*.2,.6+random()*.35,(random()-.5)*.2),radius:.5+random()*.18,density:48,flat:1.05});
 return fillClumps(clumps,new T.Vector3(0,.7,0),1.4,0,1.6,[2,2,3],[.55,.72],random);
}

/** One metre of dense, roughly clipped garden hedge: about 0.9 m high and 0.6 m through. */
export function gardenHedgeGeometry(){
 const random=seeded(7761865),clumps:Clump[]=[];
 for(let i=0;i<3;i++)for(const y of [.32,.66])clumps.push({centre:new T.Vector3(-.4+i*.4+(random()-.5)*.08,y+(random()-.5)*.06,(random()-.5)*.06),radius:.34+random()*.06,density:190,flat:1});
 return fillClumps(clumps,new T.Vector3(0,.5,0),.7,0,.95,[2,2,2,3],[.3,.42],random);
}

/**
 * Spring cabbage / kale plant: a firm pale heart inside cupped, veined outer leaves.
 * Vertex-coloured solid geometry (no cut-outs), about 0.36 m across before scaling.
 */
export function cabbageGeometry(){
 const random=seeded(7811865),position:number[]=[],normal:number[]=[],color:number[]=[],index:number[]=[];
 const outer=new T.Color('#46653a'),rib=new T.Color('#95aa76'),heart=new T.Color('#5c7f46');
 for(let leaf=0;leaf<11;leaf++){
  const a=leaf*2.39996+random()*.3,length=.16+random()*.07,width=.1+random()*.025,lift=.05+random()*.05,start=position.length/3;
  const out=new T.Vector3(Math.cos(a),0,Math.sin(a)),side=new T.Vector3(-out.z,0,out.x);
  for(let k=0;k<=4;k++)for(let j=-2;j<=2;j++){
   const t=k/4,u=j/2,w=width*Math.sin(Math.PI*Math.min(1,.15+t*.85))*u,cup=Math.abs(u)*.035*t;
   const q=out.clone().multiplyScalar(.035+length*t).addScaledVector(side,w).add(new T.Vector3(0,.03+lift*Math.sin(t*Math.PI*.8)+cup-t*t*.03,0));
   position.push(q.x,q.y,q.z);const n=new T.Vector3(0,1,0).addScaledVector(out,-.3*(1-t)).addScaledVector(side,-u*.35).normalize();normal.push(n.x,n.y,n.z);
   const c=outer.clone().lerp(rib,Math.max(0,1-Math.abs(u)*4)*.5).multiplyScalar(.75+t*.35);color.push(c.r,c.g,c.b);
  }
  for(let k=0;k<4;k++)for(let j=0;j<4;j++){const a0=start+k*5+j,b0=a0+5;index.push(a0,b0,a0+1,a0+1,b0,b0+1);}
 }
 const head=new T.SphereGeometry(.058,12,8);head.scale(1,.8,1);head.translate(0,.07,0);
 const hp=head.attributes.position,hn=head.attributes.normal,base=position.length/3;
 for(let i=0;i<hp.count;i++){position.push(hp.getX(i),hp.getY(i),hp.getZ(i));normal.push(hn.getX(i),hn.getY(i),hn.getZ(i));const c=heart.clone().multiplyScalar(.85+(hp.getY(i)-.03)*2.2);color.push(c.r,c.g,c.b);}
 const hi=head.index!;for(let i=0;i<hi.count;i++)index.push(base+hi.getX(i));
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(index);g.computeBoundingSphere();
 return g;
}

/** Male-fern shuttlecock: arching pinnate fronds, a few older ones lying lower with browned tips. */
export function fernGeometry(){
 const random=seeded(6601865),position:number[]=[],normal:number[]=[],facing:number[]=[],uv:number[]=[],color:number[]=[],index:number[]=[];
 for(let frond=0;frond<10;frond++){
  const old=frond>=7,cell:LeafCell=old?7:6,[cx,cy]=cellOrigin(cell),u0=cx/WIDTH,v0=cy/HEIGHT,du=CELL/WIDTH,dv=CELL/HEIGHT;
  const a=frond*2.39996+random()*.5,length=(old?.62:.7)+random()*.3,out=new T.Vector3(Math.cos(a),0,Math.sin(a)),side=new T.Vector3(-out.z,0,out.x);
  const segments=7,start=position.length/3,p=out.clone().multiplyScalar(.05);
  for(let k=0;k<=segments;k++){
   const t=k/segments,theta=(old?.55:.22)+(old?1.05:1.05)*Math.pow(t,1.3),tangent=out.clone().multiplyScalar(Math.sin(theta)).add(new T.Vector3(0,Math.cos(theta),0));
   const width=length*.17*Math.pow(Math.sin(Math.PI*Math.min(1,.06+t*.94)),.7)+.004,surface=new T.Vector3().crossVectors(side,tangent).normalize();
   if(surface.y<0)surface.negate();
   const shade=(.5+.5*t)*(old?.8:1);
   for(const s of [-1,1]){const q=p.clone().addScaledVector(side,s*width);position.push(q.x,q.y,q.z);
    const n=surface.clone().multiplyScalar(.6).add(new T.Vector3(0,.8,0)).addScaledVector(out,.3).normalize();normal.push(n.x,n.y,n.z);facing.push(surface.x,surface.y,surface.z);
    uv.push(u0+du*(.5+s*.47),v0+dv*(.99-t*.97));color.push(shade,shade,shade);}
   if(k)index.push(start+(k-1)*2,start+(k-1)*2+1,start+k*2+1,start+(k-1)*2,start+k*2+1,start+k*2);
   p.addScaledVector(tangent,length/segments);
  }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('cardNormal',new T.Float32BufferAttribute(facing,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(index);g.computeBoundingSphere();
 return g;
}

/** Low bramble mound, about 1.6 m across and 0.7 m high. */
export function brambleGeometry(){
 const random=seeded(7701865),clumps:Clump[]=[];
 for(let i=0;i<6;i++){const a=i*2.4+random()*.6,r=i?.35+random()*.4:0;clumps.push({centre:new T.Vector3(Math.cos(a)*r,.28+random()*.2,Math.sin(a)*r),radius:.42+random()*.18,density:120,flat:.6});}
 return fillClumps(clumps,new T.Vector3(0,.3,0),1,0,.75,[3,3,3,2],[.45,.6],random);
}

/**
 * Leaf-card material: alpha-tested atlas, vertex-baked canopy occlusion,
 * direction-independent volume normals and a small wind sway driven by the scene clock.
 */
export function foliageMaterial(time:{value:number},options:{color?:string;sway?:number;transmission?:number}={}){
 const material=new T.MeshStandardMaterial({color:options.color??'#ffffff',map:leafAtlas(),alphaTest:.46,vertexColors:true,side:T.DoubleSide,roughness:.86,metalness:0});
 const sway=(options.sway??1).toFixed(3),transmission=(options.transmission??.55).toFixed(3);
 material.onBeforeCompile=shader=>{
  shader.uniforms.foliageTime=time;
  shader.vertexShader='uniform float foliageTime;attribute vec3 cardNormal;varying float foliageFacing;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec3 foliageCard=cardNormal;
   #ifdef USE_INSTANCING
    foliageCard=mat3(instanceMatrix)*foliageCard;
   #endif
   foliageFacing=abs(dot(normalize(normalMatrix*foliageCard),normalize(-mvPosition.xyz)));`).replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    float foliagePhase=instanceMatrix[3].x*.23+instanceMatrix[3].z*.17;
   #else
    float foliagePhase=0.;
   #endif
   float foliageReach=smoothstep(.2,1.,position.y*.22)*${sway};
   transformed.x+=(sin(foliageTime*1.1+foliagePhase)*.03+sin(foliageTime*3.7+position.x*3.1+position.z*2.3+foliagePhase)*.018)*foliageReach*position.y*.35;
   transformed.z+=(cos(foliageTime*.9+foliagePhase*1.3)*.025+sin(foliageTime*4.3+position.z*2.9+foliagePhase)*.016)*foliageReach*position.y*.35;`);
  // Volume normals: both faces of a card share one outward normal.
  shader.fragmentShader='varying float foliageFacing;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>',`
   // Cards seen edge-on smear their leaves; let them fall below the cut-out threshold.
   diffuseColor.a*=smoothstep(.06,.32,foliageFacing);
   #include <alphatest_fragment>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   normal=normalize(vNormal);`).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   #if NUM_DIR_LIGHTS > 0
    // Sunlight passing through thin leaves when the canopy is seen against the sun.
    vec3 foliageSun=directionalLights[0].direction;
    float foliageBack=pow(clamp(dot(normalize(-vViewPosition),foliageSun),0.,1.),2.)*clamp(.6-dot(normal,foliageSun),0.,1.);
    reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[0].color*foliageBack*${transmission};
   #endif`);
 };
 material.customProgramCacheKey=()=>'foliage-cards-v2-'+sway+transmission;
 return material;
}
