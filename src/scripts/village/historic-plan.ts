/** Approximate OS trace. See docs/village/historic-landscape-opportunities.md.
 * Local metres, east +X / north -Z. Shapes/depths are an explicit interpretation.
 * The northern clay working continues beyond the model: never move it inwards.
 */
export type P=[number,number];
export const insideSite=(x:number,z:number)=>(x/210)**2+((z+60)/240)**2<.965;
export function segmentPoint(p:P,a:P,b:P):P{const x=b[0]-a[0],z=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/(x*x+z*z||1)));return [a[0]+x*t,a[1]+z*t];}
// Trace vertices in the saved 768x817 NLS reference, calibrated at zoom 17.3.
export function trace([x,y]:P):P{return [(x-384)*.925,(y-529.2)*.923];}
export const railRoutes:P[][]=[
 [[290,135],[351,211],[413,279],[463,316],[478,357],[493,411],[511,454],[549,476],[601,501],[647,539]].map(p=>trace(p as P)),
 [[511,454],[506,422],[520,385],[541,350],[570,312],[624,225],[680,126]].map(p=>trace(p as P)),
 [[463,316],[509,319],[552,316],[570,312],[620,292],[695,273],[758,248]].map(p=>trace(p as P)),
];
export function railNearest(x:number,z:number){let distance=Infinity,p:P=[0,0],tangent:P=[1,0];for(const line of railRoutes)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],q=segmentPoint([x,z],a,b),d=Math.hypot(x-q[0],z-q[1]);if(d<distance){distance=d;p=q;const l=Math.hypot(b[0]-a[0],b[1]-a[1]);tangent=[(b[0]-a[0])/l,(b[1]-a[1])/l];}}return {distance,p,tangent};}
export const excavations=[
 {id:'north-clay-bank',p:trace([455,188]),rx:29,rz:48,depth:3.0,angle:-.42,kind:'clay'},
 {id:'shaft-working',p:trace([550,437]),rx:18,rz:27,depth:1.25,angle:.28,kind:'spoil'},
];
export const shafts=[{p:trace([538,414]),radius:1.2},{p:trace([552,448]),radius:1.0}];
export const pools=[{p:trace([550,382]),rx:3.6,rz:5.2,depth:.75},{p:trace([536,458]),rx:2.5,rz:1.65,depth:.45}];
export function hollowRadius(x:number,z:number,e:typeof excavations[number]){const dx=x-e.p[0],dz=z-e.p[1],c=Math.cos(e.angle),s=Math.sin(e.angle),a=Math.atan2(dz,dx);return Math.hypot((dx*c-dz*s)/e.rx,(dx*s+dz*c)/e.rz)/(1+.09*Math.sin(a*5)+.04*Math.sin(a*9));}
export const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
let railDatum=0;
export function prepareHistoricGround(base:(x:number,z:number)=>number){railDatum=base(115,-120);}
// One gentle grade across the connected branch network prevents discontinuities
// at points. This is engineering interpretation, not recovered Victorian levels.
export function railBed(x:number,z:number){return railDatum+(x-115)*.012-(z+120)*.009;}
export function historicGround(x:number,z:number,y:number,roadDistance:number){
 const roadFade=smooth(4,9,roadDistance);
 for(const e of excavations){const r=hollowRadius(x,z,e);if(r<1)y-=e.depth*(1-smooth(.25,1,r))*roadFade;}
 for(const e of pools){const r=Math.hypot((x-e.p[0])/e.rx,(z-e.p[1])/e.rz);if(r<1.35)y-=e.depth*(1-smooth(.7,1.35,r))*roadFade;}
 const rail=railNearest(x,z);if(rail.distance<6.5){const t=1-smooth(1.6,6.5,rail.distance);y+=(railBed(...rail.p)-y)*t*roadFade;}
 return y;
}
export function industryClear(x:number,z:number,margin=0){
 if(railNearest(x,z).distance<3.4+margin)return false;
 if(excavations.some(e=>hollowRadius(x,z,e)<.78+margin/20))return false;
 if(pools.some(e=>Math.hypot((x-e.p[0])/(e.rx+margin),(z-e.p[1])/(e.rz+margin))<1.4))return false;
 return true;
}
