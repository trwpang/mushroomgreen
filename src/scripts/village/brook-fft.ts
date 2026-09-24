/** Three-cascade FFT surface for the brook (Tessendorf synthesis, capillary–gravity dispersion).
 * Pure maths, shared by the worker and the synchronous still-frame path. Each cascade tile is
 * 64² and covers its own band of wavenumbers; the tile lengths are mutually incommensurate, so
 * the summed surface does not repeat within the brook. Output texels are RGBA:
 * height (m), ∂h/∂across, ∂h/∂along and the Laplacian (for crest foam), in channel space
 * (x = across, y = along the current). */
export const FFT_SIZE=64;
export const CASCADE_LENGTHS=[.83,2.37,6.71] as const;
// Band edges in rad/m: 6.71 m tile below 12, 2.37 m tile 12–40, 0.83 m tile above 40.
const BANDS:[number,number][]=[[40,1e9],[12,40],[0,12]];
// Target RMS slope of each band; the shader scales these with local turbulence.
const SLOPES=[.075,.085,.06];
const G=9.81,SURFACE_TENSION=7.28e-5;

type Cascade={h0r:Float64Array;h0i:Float64Array;h0mr:Float64Array;h0mi:Float64Array;kx:Float64Array;ky:Float64Array;omega:Float64Array;heightRms:number};
export type BrookSpectrum={cascades:Cascade[];re:Float64Array;im:Float64Array;re2:Float64Array;im2:Float64Array};

function gaussian(next:()=>number){let u=0;while(u<1e-12)u=next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*next());}
function spectrum(k:number,kx:number,ky:number){
 if(k<1e-6)return 0;
 // Short, turbulence-driven ripples: a k⁻⁴ tail rolled off below ~2 m and above ~3 cm,
 // with a mild preference for crests lying across the current.
 const align=(ky/k)**2;
 return Math.exp(-((3/k)**2))*Math.exp(-((k/210)**2))/k**4*(.45+.55*align);
}
export function createBrookSpectrum(seed=1865):BrookSpectrum{
 const N=FFT_SIZE,cascades=CASCADE_LENGTHS.map((L,c)=>{
  let s=(seed*2654435761+c*97)>>>0;const next=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  const n=N*N,h0r=new Float64Array(n),h0i=new Float64Array(n),kx=new Float64Array(n),ky=new Float64Array(n),omega=new Float64Array(n),amp=new Float64Array(n);
  const [lo,hi]=BANDS[c];let slope2=0,height2=0;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
   const m=i<N/2?i:i-N,q=j<N/2?j:j-N,idx=j*N+i,x=2*Math.PI*m/L,y=2*Math.PI*q/L,k=Math.hypot(x,y);
   kx[idx]=x;ky[idx]=y;omega[idx]=Math.sqrt(G*k+SURFACE_TENSION*k**3);
   const inBand=k>=lo&&k<hi&&i!==N/2&&j!==N/2;amp[idx]=inBand?Math.sqrt(spectrum(k,x,y)/2):0;
   h0r[idx]=gaussian(next)*amp[idx];h0i[idx]=gaussian(next)*amp[idx];
   const e=h0r[idx]**2+h0i[idx]**2;slope2+=k*k*e;height2+=e;
  }
  // Normalise each band to its target RMS slope (the sum form below has no 1/N factor).
  const scale=SLOPES[c]/Math.sqrt(Math.max(slope2*2,1e-30));
  for(let i=0;i<n;i++){h0r[i]*=scale;h0i[i]*=scale;}
  const h0mr=new Float64Array(n),h0mi=new Float64Array(n);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const mi=(N-i)%N,mj=(N-j)%N;h0mr[j*N+i]=h0r[mj*N+mi];h0mi[j*N+i]=-h0i[mj*N+mi];}
  return {h0r,h0i,h0mr,h0mi,kx,ky,omega,heightRms:Math.sqrt(height2*2)*scale};
 });
 const n=N*N;return {cascades,re:new Float64Array(n),im:new Float64Array(n),re2:new Float64Array(n),im2:new Float64Array(n)};
}

const rev=new Uint16Array(FFT_SIZE),cosT=new Float64Array(FFT_SIZE/2),sinT=new Float64Array(FFT_SIZE/2);
{const bits=Math.log2(FFT_SIZE);for(let i=0;i<FFT_SIZE;i++){let r=0;for(let b=0;b<bits;b++)r|=((i>>b)&1)<<(bits-1-b);rev[i]=r;}
 for(let i=0;i<FFT_SIZE/2;i++){cosT[i]=Math.cos(2*Math.PI*i/FFT_SIZE);sinT[i]=Math.sin(2*Math.PI*i/FFT_SIZE);}}
/** In-place inverse FFT (e^{+i}) of one strided row/column. */
function ifft1(re:Float64Array,im:Float64Array,offset:number,stride:number){
 const N=FFT_SIZE;
 for(let i=0;i<N;i++){const j=rev[i];if(j>i){const a=offset+i*stride,b=offset+j*stride;let t=re[a];re[a]=re[b];re[b]=t;t=im[a];im[a]=im[b];im[b]=t;}}
 for(let size=2;size<=N;size<<=1){const half=size>>1,step=N/size;
  for(let start=0;start<N;start+=size)for(let k=0;k<half;k++){
   const c=cosT[k*step],s=sinT[k*step],a=offset+(start+k)*stride,b=a+half*stride;
   const tr=re[b]*c-im[b]*s,ti=re[b]*s+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
  }}
}
function ifft2(re:Float64Array,im:Float64Array){const N=FFT_SIZE;for(let j=0;j<N;j++)ifft1(re,im,j*N,1);for(let i=0;i<N;i++)ifft1(re,im,i,N);}

// Float → IEEE half, for HalfFloat textures (filterable everywhere WebGL2 runs).
const f32=new Float32Array(1),u32=new Uint32Array(f32.buffer);
export function toHalf(v:number){f32[0]=v;const x=u32[0],sign=(x>>>16)&0x8000,e=((x>>>23)&0xff)-112,m=x&0x7fffff;
 if(e<=0)return sign;if(e>=31)return sign|0x7c00;return sign|(e<<10)|(m>>>13);}

/** Fill one RGBA half-float buffer per cascade for time t (seconds). */
export function computeBrookSurface(spec:BrookSpectrum,t:number,out:Uint16Array[]){
 const N=FFT_SIZE,n=N*N,{re,im,re2,im2}=spec;
 spec.cascades.forEach((c,ci)=>{
  for(let i=0;i<n;i++){
   const w=c.omega[i]*t,cw=Math.cos(w),sw=Math.sin(w);
   // h(k,t)=h0(k)e^{iωt}+conj(h0(-k))e^{-iωt}
   const hr=c.h0r[i]*cw-c.h0i[i]*sw+c.h0mr[i]*cw+c.h0mi[i]*sw,hi=c.h0r[i]*sw+c.h0i[i]*cw-c.h0mr[i]*sw+c.h0mi[i]*cw;
   const kx=c.kx[i],ky=c.ky[i],k2=kx*kx+ky*ky;
   // Pack two real fields per transform. With A=i·kx·H, B=i·ky·H, C=−k²·H:
   // IFFT(H+iA) = h + i·∂h/∂x and IFFT(B+iC) = ∂h/∂y + i·∇²h.
   re[i]=hr-kx*hr;im[i]=hi-kx*hi;
   re2[i]=-ky*hi+k2*hi;im2[i]=ky*hr-k2*hr;
  }
  ifft2(re,im);ifft2(re2,im2);
  const buffer=out[ci];
  for(let i=0;i<n;i++){buffer[i*4]=toHalf(re[i]);buffer[i*4+1]=toHalf(im[i]);buffer[i*4+2]=toHalf(re2[i]);buffer[i*4+3]=toHalf(im2[i]);}
 });
}
export function cascadeHeightRms(spec:BrookSpectrum){return spec.cascades.map(c=>c.heightRms);}
