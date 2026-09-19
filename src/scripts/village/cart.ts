import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {refineSurface} from '../rendering/surfaces';
import {ground,chainshopPosition,type Point} from './layout';

// Original geometry, visually informed by the user's BCLM cart photograph.
// Metres, Y up, shafts toward +Z. One axle, two wheels; no horse or harness.
export function buildCart(oak?:T.MeshStandardMaterial){
 const root=new T.Group();root.name='Unhitched red works cart';
 const wood=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,map:oak?.map??null,normalMap:oak?.normalMap??null,roughnessMap:oak?.roughnessMap??null});
 const paint=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,normalMap:oak?.normalMap??null,roughnessMap:oak?.roughnessMap??null});
 const iron=new T.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.55});
 [wood,paint].forEach(m=>refineSurface(m,'wood'));refineSurface(iron,'iron');
 const materials=[wood,paint,iron],parts:T.BufferGeometry[][]=[[],[],[]];
 let seed=18650919;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const bodyMatrix=new T.Matrix4().makeRotationX(.258).setPosition(0,.868,0);
 const baseMatrix=new T.Matrix4().makeTranslation(0,.868,0);
 function add(g:T.BufferGeometry,kind:number,color:string,position:T.Vector3,rotation=new T.Quaternion(),body=true){
  const n=g.index?g.toNonIndexed():g.clone();g.dispose();
  n.applyQuaternion(rotation);n.translate(position.x,position.y,position.z);n.applyMatrix4(body?bodyMatrix:baseMatrix);
  const c=new T.Color(color).multiplyScalar(.87+rand()*.25),colors=new Float32Array(n.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3)c.toArray(colors,i);n.setAttribute('color',new T.BufferAttribute(colors,3));
  if(kind!==2&&n.attributes.uv){const tile=Math.floor(rand()*16),uv=n.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(tile%4+.015+.97*uv.getX(i))/4,(Math.floor(tile/4)+.015+.97*uv.getY(i))/4);}
  parts[kind].push(n);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,kind=1,color='#833e2d',rx=0,ry=0,rz=0,body=true){
  add(new T.BoxGeometry(w,h,d),kind,color,new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),body);
 }
 function rod(a:T.Vector3,b:T.Vector3,r:number,kind=1,color='#994a31',body=true,r2=r,sides=8){
  add(new T.CylinderGeometry(r,r2,a.distanceTo(b),sides),kind,color,a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()),body);
 }
 function rim(x:number,inner:number,outer:number,thickness:number,kind:number,color:string,start=0,length=Math.PI*2){
  // Square iron tyre and segmented wooden felloes, rather than rubber-like toruses.
  const shape=new T.Shape(),steps=Math.max(4,Math.ceil(length*16));
  for(let i=0;i<=steps;i++){const a=start+length*i/steps;const px=Math.cos(a)*outer,py=Math.sin(a)*outer;if(i)shape.lineTo(px,py);else shape.moveTo(px,py);}
  for(let i=steps;i>=0;i--){const a=start+length*i/steps;shape.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);}shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,steps:1,curveSegments:8});g.translate(0,0,-thickness/2);
  add(g,kind,color,new T.Vector3(x,0,0),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2),false);
 }
 // Axle, hubs, wheel spokes and individual rim joints.
 rod(new T.Vector3(-1.27,0,0),new T.Vector3(1.27,0,0),.055,2,'#35352d',false);
 for(const side of [-1,1]){
  const x=side*1.06;
  rim(x,.838,.868,.09,2,'#38362e');
  for(let i=0;i<8;i++)rim(x,.738,.838,.13,1,'#98472d',i*Math.PI/4+.005,Math.PI/4-.01);
  for(let i=0;i<14;i++){
   const a=i*Math.PI*2/14+.09;
   rod(new T.Vector3(x+side*.03,Math.cos(a)*.10,Math.sin(a)*.10),new T.Vector3(x,Math.cos(a)*.77,Math.sin(a)*.77),.023,1,'#a75334',false,.041,4);
   box(x+side*.076,Math.cos(a)*.81,Math.sin(a)*.81,.012,.024,.026,2,'#544435',0,0,0,false);
  }
  rod(new T.Vector3(x-side*.13,0,0),new T.Vector3(x+side*.18,0,0),.13,1,'#91412a',false,.10,18);
  for(const dx of [-.105,.125]){
   rod(new T.Vector3(x+dx-.016,0,0),new T.Vector3(x+dx+.016,0,0),.134,2,'#4a4134',false,.134,18);
  }
  rod(new T.Vector3(x+side*.18,0,0),new T.Vector3(x+side*.205,0,0),.052,2,'#796b53',false,.052,12);
  box(x+side*.216,0,0,.025,.10,.018,2,'#3b3930',0,0,0,false);
 }
 // Strong chassis above the axle, with a genuinely open load bed.
 for(const x of [-.57,.57])box(x,.19,0,.115,.18,2.5,1,'#663927');
 for(const z of [-.95,0,.95])box(0,.24,z,1.74,.11,.13,1,'#703927');
 for(let i=0;i<11;i++)box(-.73+i*.146,.34,0,.139,.068,2.26,0,'#c7b49a');
 // Gently flared sides, four board courses, worn capping and iron corner straps.
 for(const side of [-1,1]){
  for(let row=0;row<4;row++){
   const y=.47+row*.155,x=side*(.80+row*.026);
   box(x,y,0,.068,.147,2.32,1,row===2?'#87452f':'#773929',0,0,-side*.165);
   // Scattered exposed wood at rubbed board edges, not uniform painted stripes.
   for(let j=0;j<7;j++)box(x+side*.041,y-.062+(rand()-.5)*.012,(rand()-.5)*2.18,.008,.007+rand()*.012,.035+rand()*.12,0,'#b9a185');
  }
  box(side*.904,1.04,0,.10,.072,2.44,0,'#b7a385');
  for(const z of [-1.13,0,1.13]){
   box(side*.887,.74,z,.038,.59,.062,2,'#4a3b2d',0,0,-side*.16);
   for(const y of [.51,.94])box(side*.914,y,z,.02,.025,.026,2,'#897052');
  }
  // Plain ochre lining recalls the reference's panel borders, worn and restrained.
  for(const y of [.44,.98])box(side*(y>.5?.899:.813),y,0,.009,.014,2.16,1,'#af8150');
 }
 for(const end of [-1,1]){
  for(let row=0;row<4;row++)box(0,.47+row*.155,end*1.15,1.62+row*.046,.147,.065,1,end===-1?'#84422d':'#723929');
  box(0,1.04,end*1.16,1.83,.073,.09,0,'#b8a083');
  for(const x of [-.64,.64]){
   box(x,.72,end*1.194,.046,.62,.026,2,'#4b4031');
   for(const y of [.49,.95])box(x,y,end*1.216,.025,.025,.016,2,'#8b7254');
  }
 }
 // Tailboard hinges, retaining pins and short hanging chains.
 for(const side of [-1,1]){
  box(side*.60,.39,-1.204,.26,.05,.025,2,'#4e4435');
  rod(new T.Vector3(side*.76,.99,-1.21),new T.Vector3(side*.82,1.07,-1.21),.012,2,'#4c4538');
  for(let j=0;j<5;j++){
   const g=new T.TorusGeometry(.027,.006,5,10);add(g,2,'#4b4031',new T.Vector3(side*.79,.94-j*.041,-1.22),new T.Quaternion().setFromEuler(new T.Euler(0,j%2*Math.PI/2,0)));
  }
 }
 // Twin shafts: curved gently in plan and down to their resting tips.
 for(const side of [-1,1]){
  const points=[];for(let i=0;i<=12;i++){const t=i/12;points.push(new T.Vector3(side*(.74-.10*t+.035*Math.sin(t*Math.PI)),.26-.10*t,.80+3.05*t));}
  for(let i=1;i<points.length;i++)rod(points[i-1],points[i],.037-i*.001,1,'#8d442d',true,.042-i*.001,8);
  for(const z of [1.25,2.18])box(side*.71,.23-(z-.8)*.033,z,.092,.079,.075,2,'#4d4334');
 }
 box(0,.235,1.38,1.50,.065,.08,1,'#793e2a');
 // A little ingrained dirt in the empty bed and nail heads in each floor plank.
 for(let i=0;i<11;i++)for(const z of [-.92,.92])box(-.73+i*.146,.377,z,.018,.004,.018,2,'#4a4235');
 for(let i=0;i<35;i++)box((rand()-.5)*1.45,.378,(rand()-.5)*2.10,.015+rand()*.06,.006,.018+rand()*.06,0,'#746448');
 parts.forEach((list,i)=>{const mesh=new T.Mesh(mergeGeometries(list),materials[i]);mesh.name=['Cart oak','Cart faded red paint','Cart ironwork'][i];mesh.castShadow=mesh.receiveShadow=true;list.forEach(g=>g.dispose());root.add(mesh);});
 root.userData.supports=[[-1.06,0,0],[1.06,0,0],[-.64,.038,3.764],[.64,.038,3.764]];
 root.userData.spec={wheels:2,spokesPerWheel:14,horse:false,bodyWidth:1.83,bodyLength:2.44,shaftLength:3.05};
 return root;
}
export function addForgeCart(scene:T.Scene,oak?:T.MeshStandardMaterial){
 const root=buildCart(oak),angle=1.03;
 const x=-.7,z=5.1,c=Math.cos(angle),s=Math.sin(angle);
 const center:Point=[chainshopPosition[0]+x*c+z*s,chainshopPosition[1]-x*s+z*c];
 const point=(x:number,z:number):Point=>[center[0]+x*c+z*s,center[1]-x*s+z*c];
 const left=ground(...point(-1.06,0)),right=ground(...point(1.06,0)),front=ground(...point(0,3.764)),mid=(left+right)/2;
 const across=new T.Vector3(c,(right-left)/2.12,-s).normalize();
 const ahead=new T.Vector3(s,(front-mid)/3.764,c).normalize();
 const up=new T.Vector3().crossVectors(ahead,across).normalize();
 ahead.crossVectors(across,up).normalize();
 root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(across,up,ahead));root.position.set(center[0],mid+.012,center[1]);
 scene.add(root);return root;
}
