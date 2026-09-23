/** Shared reservations keep new yards clear of props, animals and vegetation. */
export type SitePoint=[number,number];
export type ReservedSite={p:SitePoint;angle:number;width:number;depth:number;kind:string;home?:number};
let sites:ReservedSite[]=[];
export function setSiteReservations(next:ReservedSite[]){sites=next;}
export function siteIssue(p:SitePoint,margin=0):string|null{
 for(const s of sites){const dx=p[0]-s.p[0],dz=p[1]-s.p[1],c=Math.cos(s.angle),t=Math.sin(s.angle);
  if(Math.abs(dx*c-dz*t)<s.width/2+margin&&Math.abs(dx*t+dz*c)<s.depth/2+margin)return s.kind;
 }return null;
}
export function getSiteReservations(){return sites;}
