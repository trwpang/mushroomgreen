import * as T from 'three';
import {ground,streamSurface,streamWidth,type Point} from './layout';
/** A stone that meets the current. `top` is its height above the local water surface (m);
 * positive tops break the surface, negative ones sit below it and only raise boils. */
export type BrookObstacle={p:Point;radius:number;top:number};
export type BrookFlowMesh={geometry:T.BufferGeometry;length:number};

const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
/**
 * Dense water ribbon with a baked current. Per vertex:
 *  - `channel` (across, along) in metres, the FFT sampling space;
 *  - `flowVel` (across, along) in m/s: a cross-channel profile that slows to the banks and runs
 *    faster on the outside of bends, plus potential flow round each stone (Rankine cylinder),
 *    a velocity deficit in its wake and a slight stall on its upstream face;
 *  - `stir` (turbulence 0–1, foam 0–1, surface lift m, water depth m): wakes, standing V-arms, the
 *    pillow of water heaped against a stone, waterline foam, and slack foam at the shoreline.
 * `uv` keeps the old (0–1 across, metres along) layout for depth colouring.
 */
export function buildBrookFlow(points:Point[],obstacles:BrookObstacle[],keep:(x:number,z:number)=>boolean,across=16):BrookFlowMesh{
 const n=points.length,cols=across+1;
 const tangents=points.map((p,i)=>{const a=points[Math.max(0,i-2)],b=points[Math.min(n-1,i+2)],l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l] as Point;});
 // Signed curvature of the centre line (1/m), lightly smoothed; positive bends to the left.
 const curvature=points.map((_,i)=>{const a=tangents[Math.max(0,i-3)],b=tangents[Math.min(n-1,i+3)],l=Math.hypot(points[Math.min(n-1,i+3)][0]-points[Math.max(0,i-3)][0],points[Math.min(n-1,i+3)][1]-points[Math.max(0,i-3)][1])||1;return (a[0]*b[1]-a[1]*b[0])/l;});
 // Stones near this line, each with the local downstream direction.
 const stones=obstacles.map(o=>{let best=0,d=Infinity;for(let i=0;i<n;i+=2){const q=Math.hypot(points[i][0]-o.p[0],points[i][1]-o.p[1]);if(q<d){d=q;best=i;}}return {...o,t:tangents[best],reach:o.radius*11,near:d,row:best};}).filter(o=>o.near<streamWidth(...o.p)*.6+o.radius);
 // Each row only tests the stones whose reach can touch it.
 const byRow:(typeof stones)[]=points.map(()=>[]);
 for(const s of stones){let lo=s.row,hi=s.row;while(lo>0&&Math.hypot(points[lo][0]-s.p[0],points[lo][1]-s.p[1])<s.reach+3)lo--;while(hi<n-1&&Math.hypot(points[hi][0]-s.p[0],points[hi][1]-s.p[1])<s.reach+3)hi++;for(let i=lo;i<=hi;i++)byRow[i].push(s);}
 const position:number[]=[],uv:number[]=[],channel:number[]=[],flowVel:number[]=[],stir:number[]=[],flowTangent:number[]=[],index:number[]=[];
 let along=0;
 for(let i=0;i<n;i++){
  // The ribbon runs 0.9 m past the wetted edge; the bank clips it along the true shoreline.
  const p=points[i],[tx,tz]=tangents[i],nx=-tz,nz=tx,wet=streamWidth(...p)*.5,half=wet+.9,surface=streamSurface(...p);
  if(i)along+=Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]);
  // Narrow reaches run faster (continuity); the bend throws the thread of the current outwards.
  const base=T.MathUtils.clamp(.5*2.7/(wet*2),.3,.8),bend=T.MathUtils.clamp(curvature[i]*wet*1.4,-.45,.45);
  for(let j=0;j<cols;j++){
   const off=(-1+2*j/across)*half,xi=T.MathUtils.clamp(off/wet,-1,1),x=p[0]+nx*off,z=p[1]+nz*off;
   // Mid-channel is always deep; only the margins need the true bank height.
   const depth=Math.abs(off)<wet*.55?.4:surface-ground(x,z);
   // Velocity is carried as a world vector so overlapping stones compose correctly.
   const u0=base*(1-.82*Math.abs(xi)**3)*(1-bend*xi);
   let wx=u0*tx,wz=u0*tz,turb=.08+.12*smooth(.55,1,Math.abs(xi)),foam=.16*smooth(.78,1,Math.abs(xi))+.08*smooth(.1,.01,depth),lift=0;
   for(const s of byRow[i]){
    const dx=x-s.p[0],dz=z-s.p[1],r=Math.hypot(dx,dz);if(r>s.reach)continue;
    const R=s.radius,sx=s.t[0],sz=s.t[1],lx=dx*sx+dz*sz,ly=-dx*sz+dz*sx;
    // Piercing stones act fully; submerged ones fade out over their last 25 cm of cover.
    const pierce=smooth(-.05,.04,s.top),effect=Math.max(pierce,smooth(-.3,-.02,s.top)*.55);
    if(effect<=0)continue;
    let fx=wx*sx+wz*sz,fy=-wx*sz+wz*sx;const U=Math.max(fx,0),rr=Math.max(r,R*.98),k=R*R/rr**4;
    // Rankine cylinder: the stream parts round the stone and closes behind it.
    fx+=(U*(1-k*(lx*lx-ly*ly))-U)*effect;fy+=-U*2*k*lx*ly*effect;
    // Separated wake: a slow, turbulent tongue widening downstream.
    if(lx>0){const x1=lx/R,b=R*(.85+.14*x1),w=Math.max(0,1-(ly/b)**2),decay=Math.exp(-Math.max(0,x1-.6)/4.5);
     fx*=1-.6*w*decay*effect;turb+=.95*w*decay*effect;
     // Shear layers shed foam streaks along the wake's edges; clumps gather in its core.
     foam+=pierce*(.62*Math.exp(-(((Math.abs(ly)-b*.82)/(.32*R))**2))*Math.exp(-Math.max(0,x1-1)/4)+.4*w*Math.exp(-Math.max(0,x1-.8)/1.8));}
    // Standing V-arms off the shoulders of a piercing stone.
    if(lx>-R){const arm=Math.abs(ly)-(R*.9+(lx+R)*Math.tan(.36));turb+=.55*pierce*Math.exp(-((arm/(.28*R))**2))*Math.exp(-Math.max(0,lx)/(9*R));}
    // Water heaps against the upstream face, with foam hugging the whole waterline.
    const face=Math.max(0,-lx/Math.max(r,1e-4)),ring=Math.exp(-(((r/R-1.06)/.22)**2));
    lift+=pierce*.035*Math.exp(-(((r/R-1.08)/.3)**2))*face*(U/.5)**2;
    // Only water with some pace breaks white against a stone; quiet contacts stay clear.
    const pace=smooth(.12,.42,U);foam+=pierce*ring*(.2+.8*face)*pace;turb+=effect*.5*ring*(.3+.7*pace);
    // A submerged stone lifts a gentle boil just downstream of itself.
    if(s.top<0)lift+=.012*effect*(1-pierce)*Math.exp(-((lx/R-.8)**2+(ly/R)**2));
    wx=fx*sx-fy*sz;wz=fx*sz+fy*sx;
   }
   const u=wx*tx+wz*tz,v=wx*nx+wz*nz;
   position.push(x,surface+lift,z);uv.push((xi+1)/2,along);channel.push(off,along);flowVel.push(v,u);
   stir.push(Math.min(1,turb),Math.min(1,foam),lift,depth);flowTangent.push(tx,tz);
  }
  if(i&&keep(...p)&&keep(...points[i-1]))for(let j=0;j<across;j++){const a=(i-1)*cols+j,b=a+1,c=i*cols+j,d=c+1;index.push(a,c,b,b,c,d);}
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setAttribute('channel',new T.Float32BufferAttribute(channel,2));
 geometry.setAttribute('flowVel',new T.Float32BufferAttribute(flowVel,2));
 geometry.setAttribute('stir',new T.Float32BufferAttribute(stir,4));
 geometry.setAttribute('flowTangent',new T.Float32BufferAttribute(flowTangent,2));
 geometry.setIndex(index);geometry.computeVertexNormals();
 return {geometry,length:along};
}
