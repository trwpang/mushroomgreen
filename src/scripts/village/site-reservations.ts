/** Shared reservations keep new yards clear of props, animals and vegetation. */
export type SitePoint=[number,number];
export type ReservedSite={p:SitePoint;angle:number;width:number;depth:number;kind:string;home?:number};
let sites:ReservedSite[]=[];
export function setSiteReservations(next:ReservedSite[]){sites=next;}
// Cached trig and a bounding-circle reject; the rotated-box test and first-match order are unchanged.
const frames=new WeakMap<ReservedSite,{c:number;t:number;reach:number}>();
export function siteIssue(p:SitePoint,margin=0):string|null{
 for(const s of sites){let f=frames.get(s);if(!f||f.reach!==Math.hypot(s.width/2,s.depth/2)){f={c:Math.cos(s.angle),t:Math.sin(s.angle),reach:Math.hypot(s.width/2,s.depth/2)};frames.set(s,f);}
  const dx=p[0]-s.p[0],dz=p[1]-s.p[1],limit=f.reach+Math.abs(margin)*1.415+1e-6;if(dx*dx+dz*dz>limit*limit)continue;const {c,t}=f;
  if(Math.abs(dx*c-dz*t)<s.width/2+margin&&Math.abs(dx*t+dz*c)<s.depth/2+margin)return s.kind;
 }return null;
}
export function getSiteReservations(){return sites;}
