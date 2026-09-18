import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ground,localPoint,chainshopReplacesHouse,type Home} from './layout';

export function addYardDetails(scene:T.Scene,homes:Home[]){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#493629';ctx.fillRect(0,0,128,128);
 for(let i=0;i<3000;i++){const x=(i*73)%128,y=(i*41+Math.floor(i/128)*17)%128;ctx.fillStyle=i%3?'#574333':'#30271f';ctx.fillRect(x,y,1+i%2,1);}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const soil=new T.MeshStandardMaterial({map:texture,roughness:1});
 const boardCanvas=document.createElement('canvas');boardCanvas.width=128;boardCanvas.height=512;const bc=boardCanvas.getContext('2d')!;bc.fillStyle='#928571';bc.fillRect(0,0,128,512);
 for(let i=0;i<460;i++){const x=(i*47)%128,y=(i*113)%512;bc.fillStyle=i%3?'#352c2038':'#d4c5a13a';bc.fillRect(x,y,.4+i%2,25+i%71);}for(let i=0;i<7;i++){const x=12+i*17,y=35+(i*73)%420;bc.strokeStyle='#30291f66';bc.beginPath();bc.ellipse(x,y,2,12,0,0,Math.PI*2);bc.stroke();}
 const boardMap=new T.CanvasTexture(boardCanvas);boardMap.colorSpace=T.SRGBColorSpace;boardMap.anisotropy=4;
 const wood=new T.MeshStandardMaterial({map:boardMap,color:'#ada18e',roughness:1});
 const boardVariants=['#a1947e','#b7a88f','#8b826f'].map(color=>new T.MeshStandardMaterial({map:boardMap,color,roughness:1}));
 const coal=new T.MeshStandardMaterial({color:'#242521',roughness:.8});
 const leaves=['#637445','#7a885a','#50613c'].map(color=>new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}));
 const buckets=new Map<T.Material,T.BufferGeometry[]>();
 function put(g:T.BufferGeometry,m:T.Material,h:Home,x:number,y:number,z:number){if(!(m as T.MeshStandardMaterial).map)g.deleteAttribute("uv");const p=localPoint(h,x,z);g.rotateY(h.angle);g.translate(p[0],ground(...p)+y,p[1]);const list=buckets.get(m)||[];list.push(g.index?g.toNonIndexed():g);buckets.set(m,list);}
 function box(h:Home,x:number,y:number,z:number,w:number,d:number,t:number,m:T.Material){put(new T.BoxGeometry(w,d,t),m,h,x,y,z);}
 let count=0;
 for(const h of homes){if(h.number===chainshopReplacesHouse)continue;count++;
  // Low, open timber coal bins sit beside the rear wall, clear of the doorway.
  const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;
  const x=h.number===22?2.7:-w*.27,z=-d/2-(h.number===22?1.05:2.9);
  for(let row=0;row<4;row++){const y=.12+row*.17;box(h,x,y,z-.48,1.5,.15,.085,wood);for(const side of [-1,1])box(h,x+side*.71,y,z,.085,.15,1.04,wood);if(row<2)box(h,x,y,z+.48,1.5,.15,.085,wood);}
  for(const side of [-1,1])for(const end of [-1,1])box(h,x+side*.67,.37,z+end*.44,.09,.75,.09,wood);
  box(h,x,.23,z,1.3,.23,.85,coal);
  for(let i=0;i<45;i++){const u=Math.sin(i*31.7+h.number)*.5+.5,v=Math.sin(i*17.3+h.number*2)*.5+.5;const g=new T.IcosahedronGeometry(.075+(i%4)*.019,0);g.scale(1,.7,1.2);g.rotateY(i*2.3);put(g,coal,h,x+(u-.5)*1.19,.37+.12*(1-Math.abs(u-.5)*2),z+(v-.5)*.75);}
 }
 const h=homes.find(h=>h.number===22)!;
 // Two modest kitchen beds with a clear central footpath and low board edging.
 for(let bed=0;bed<2;bed++){
  const x=-4.2+bed*1.65,z=-9.5;
  box(h,x,.07,z,1.18,.13,2.8,soil);
  for(const side of [-1,1]){box(h,x+side*.62,.12,z,.065,.23,2.96,wood);box(h,x,.12,z+side*1.45,1.3,.23,.065,wood);}
  for(let row=0;row<5;row++)for(let col=0;col<2;col++){
   const px=x+(col-.5)*.52,pz=z+(row-2)*.51;
   if(bed===0){
    for(let leaf=0;leaf<7;leaf++){
     const a=leaf*2.4+row,vertices:number[]=[];
     const point=(t:number,side:number)=>{const r=.035+t*.21,spread=Math.sin(t*Math.PI)*.105*side;return [Math.cos(a)*r-Math.sin(a)*spread,.11+.17*Math.sin(t*Math.PI*.85),Math.sin(a)*r+Math.cos(a)*spread];};
     for(let j=0;j<5;j++){const a0=point(j/5,-1),b=point(j/5,1),c=point((j+1)/5,1),d=point((j+1)/5,-1);vertices.push(...a0,...b,...c,...a0,...c,...d);}
     const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();put(g,leaves[leaf%3],h,px,0,pz);
    }
   }else for(let leaf=0;leaf<5;leaf++){
    const a=leaf*2.4,g=new T.PlaneGeometry(.026,.34,1,3),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const t=(p.getY(i)+.17)/.34;p.setXYZ(i,p.getX(i)+Math.sin(a)*t*t*.12,t*.34,Math.cos(a)*t*t*.12);}g.computeVertexNormals();put(g,leaves[leaf%3],h,px,.1,pz);
   }
  }
 }
 // A narrow boarded privy with a pitched roof, braced door and iron hardware.
 const px=4.8,pz=-6.5,iron=new T.MeshStandardMaterial({color:'#34332d',roughness:.85});
 for(let i=0;i<8;i++){const offset=(i-3.5)*.15;box(h,px+offset,.86,pz+.64,.143,1.72,.07,boardVariants[i%3]);for(const side of [-1,1])box(h,px+side*.60,.86,pz+offset,.07,1.72,.143,boardVariants[(i+side+3)%3]);}
 for(let i=0;i<6;i++)box(h,px+(i-2.5)*.15,.83,pz-.67,.143,1.60,.06,boardVariants[i%3]);
 for(const side of [-1,1])box(h,px+side*.53,.9,pz-.67,.13,1.8,.10,wood);
 box(h,px,1.70,pz-.67,1.2,.13,.1,wood);
 for(const y of [.34,1.25])box(h,px,y,pz-.715,.86,.07,.03,wood);
 const brace=new T.BoxGeometry(.06,.95,.035);brace.rotateZ(-.60);put(brace,wood,h,px,.79,pz-.73);
 for(const y of [.35,1.25])box(h,px-.38,y,pz-.755,.23,.035,.025,iron);
 box(h,px+.31,.83,pz-.755,.12,.035,.03,iron);
 for(const x of [-.16,0,.16])box(h,px+x,1.51,pz-.708,.055,.10,.012,iron);
 for(const side of [-1,1])for(let i=0;i<5;i++){const x=side*(.07+i*.14),g=new T.BoxGeometry(.17,.065,1.55);g.rotateZ(-side*.33);put(g,coal,h,px+x,2.01-Math.abs(x)*.34,pz);}
 box(h,px,.035,pz-.83,1.03,.07,.35,soil);
 for(const [m,parts] of buckets){const g=mergeGeometries(parts);const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);parts.forEach(g=>g.dispose());}
 return count;
}

export function openStack(root:T.Object3D,x:number,y:number,z:number,w:number,height:number,d:number,m:T.Material){
 const wall=.105;
 const add=(a:number,b:number,c:number,px:number,py:number,pz:number,mat=m)=>{const mesh=new T.Mesh(new T.BoxGeometry(a,b,c),mat);mesh.position.set(px,py,pz);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);};
 for(const side of [-1,1]){add(wall,height,d,x+side*(w-wall)/2,y,z);add(w-2*wall,height,wall,x,y,z+side*(d-wall)/2);}
 add(w-2*wall,.025,d-2*wall,x,y+height/2-.45,z,new T.MeshStandardMaterial({color:'#141310',roughness:1}));
}
