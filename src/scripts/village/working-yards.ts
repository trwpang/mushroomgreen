import {localPoint,chainshopPosition,weaverWorkshop,chainshopReplacesHouse,type Home,type Point} from './layout';
/** Painted onto the existing terrain map: no extra mesh, texture or transparent decal layer. */
export function paintWorkingYards(ctx:CanvasRenderingContext2D,pixel:(p:Point)=>Point,homes:Home[]){
 const unitX=Math.abs(pixel([1,0])[0]-pixel([0,0])[0]),unitZ=Math.abs(pixel([0,1])[1]-pixel([0,0])[1]);
 const dab=(p:Point,rx:number,rz:number,angle:number,colour:string)=>{
  const q=pixel(p);ctx.save();ctx.translate(...q);ctx.rotate(-angle);ctx.scale(rx*unitX,rz*unitZ);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,colour);g.addColorStop(.45,colour);g.addColorStop(1,colour.slice(0,7)+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
 };
 for(const h of homes){
  if(h.number===chainshopReplacesHouse)continue;
  const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;
  // Domestic entries read as trodden and swept. Heavy fuel marks stay by the actual bin.
  dab(localPoint(h,0,d/2+.8),.80,1.22,h.angle,'#afa08340');
  const binX=h.number===22?2.7:-w*.27,binZ=-d/2-(h.number===22?1.05:2.9);
  dab(localPoint(h,binX,binZ+.43),.95,.72,h.angle,'#332d2590');
  for(let i=0;i<4;i++){
   const x=binX+(Math.sin(h.number*3.1+i*7.3))*.46,z=binZ+.45+i*.22;
   dab(localPoint(h,x,z),.18,.28,h.angle,'#39332a59');
  }
  // A worn access strip at the existing rear shed, with irregular soft edges.
  dab(localPoint(h,w/2-.8*h.sx,-d/2-1.7*h.sz),.63,.73,h.angle,'#8e7b5d55');
 }
 const h=homes.find(h=>h.number===22)!;
 const shop=weaverWorkshop(h);
 // Industrial yard aprons: the existing two shops, not an invented forge for every household.
 dab(chainshopPosition,6.3,3.8,1.03,'#463c2e60');
 dab(shop.p,3.6,2.1,shop.angle,'#41382e68');
}
