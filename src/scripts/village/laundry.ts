import {refineSurface} from '../rendering/surfaces';
import * as T from 'three';
import {ground,localPoint,type Home} from './layout';

// Plain washable garments, interpreted for a modest mid-Victorian household.
export function addLaundry(scene:T.Scene,home:Home){
 const group=new T.Group();scene.add(group);group.rotation.y=home.angle;
 const centre=localPoint(home,0,-6.6);group.position.set(centre[0],0,centre[1]);
 const ends=[-4.8,1.5].map(x=>{const p=localPoint(home,x,-6.6);return ground(...p)+2.25;});
 const ropeY=(x:number)=>{const t=(x+4.8)/6.3;return ends[0]*(1-t)+ends[1]*t-.13*Math.sin(t*Math.PI);};
 const ropePoints=Array.from({length:41},(_,i)=>{const x=-4.8+i/40*6.3;return new T.Vector3(x,ropeY(x),0);});
 const rope=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ropePoints),80,.009,5,false),new T.MeshStandardMaterial({color:'#79715b',roughness:1}));group.add(rope);
 const pegMat=new T.MeshStandardMaterial({color:'#8d7450',roughness:1});
 const fabrics:{geometry:T.BufferGeometry;base:Float32Array;phase:number}[]=[];
 function garment(name:string,x:number,outline:number[][],color:string,phase:number,pegXs:number[],kind='plain'){
  const points=outline.map(p=>new T.Vector2(p[0],p[1]));const triangles=T.ShapeUtils.triangulateShape(points,[]);const vertices:number[]=[];
  function split(a:T.Vector2,b:T.Vector2,c:T.Vector2,depth:number){if(!depth){for(const p of [a,b,c])vertices.push(p.x,p.y,0);return;}const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);split(a,ab,ca,depth-1);split(ab,b,bc,depth-1);split(ca,bc,c,depth-1);split(ab,bc,ca,depth-1);}
  for(const ids of triangles)split(points[ids[0]],points[ids[1]],points[ids[2]],4);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  const minX=Math.min(...outline.map(p=>p[0])),maxX=Math.max(...outline.map(p=>p[0])),height=-Math.min(...outline.map(p=>p[1]));
  geo.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3?[]:[(vertices[i]-minX)/(maxX-minX),1+vertices[i+1]/height]),2));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  // Fine woven threads, worn hems and hand-sewn repairs, not flat solid colour.
  for(let i=0;i<256;i+=2){ctx.strokeStyle=i%4?'#ffffff0d':'#302c2420';ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
  ctx.strokeStyle='#655d4955';ctx.lineWidth=2;ctx.strokeRect(5,4,246,246);
  if(kind==='shirt'){ctx.strokeStyle='#726b5955';ctx.strokeRect(122,10,12,88);ctx.fillStyle='#746f5c';for(let y=24;y<94;y+=20){ctx.beginPath();ctx.arc(128,y,2,0,Math.PI*2);ctx.fill();}}
  if(kind==='apron'){ctx.fillStyle='#bbb5a136';ctx.fillRect(90,130,76,46);ctx.strokeStyle='#423e354a';ctx.strokeRect(90,130,76,46);}
  if(kind==='petticoat'){ctx.strokeStyle='#6c675c44';for(const y of [222,230,238]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const material=new T.MeshStandardMaterial({map,roughness:1,side:T.DoubleSide});refineSurface(material,'cloth');const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.position.set(x,ropeY(x),.018);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  // Bake top-edge slope into the undeformed coordinates; each peg meets the rope.
  const base=new Float32Array(vertices);for(let i=0;i<base.length;i+=3)base[i+1]+=ropeY(x+base[i])-ropeY(x);
  // The cloth is re-shaped every frame: mark it dynamic (and so exempt from releasing its CPU copy).
  if(!geo.getAttribute('normal'))geo.computeVertexNormals();(geo.getAttribute('position') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);(geo.getAttribute('normal') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);
  fabrics.push({geometry:geo,base,phase});
  for(const px of pegXs){const peg=new T.Group();peg.position.set(x+px,ropeY(x+px)+.025,.01);
    const head=new T.Mesh(new T.SphereGeometry(.022,7,5),pegMat);head.position.y=.038;peg.add(head);
    for(const z of [-.014,.014]){const leg=new T.Mesh(new T.BoxGeometry(.023,.105,.013),pegMat);leg.position.set(0,-.007,z);peg.add(leg);}peg.rotation.z=.08*Math.sin(phase+px);group.add(peg);}
 }
 garment('Linen work shirt',-3.85,[[-.21,0],[-.11,0],[-.08,-.065],[.08,-.065],[.11,0],[.21,0],[.75,-.53],[.67,-.69],[.55,-.65],[.29,-.30],[.29,-.99],[.10,-1.04],[-.12,-1.01],[-.29,-.97],[-.29,-.30],[-.55,-.65],[-.67,-.69],[-.75,-.53]],'#bcb69f',.3,[-.2,.2],'shirt');
 garment('Mended cotton apron',-2.20,[[-.30,0],[.30,0],[.35,-.28],[.49,-.96],[.20,-1.02],[-.08,-.99],[-.48,-.95],[-.35,-.28]],'#777e79',1.7,[-.27,.27],'apron');
 garment('Plain cotton petticoat',-.75,[[-.31,0],[.31,0],[.45,-.55],[.57,-1.12],[.25,-1.17],[-.10,-1.13],[-.54,-1.16],[-.43,-.54]],'#b7ab91',3.2,[-.28,.28],'petticoat');
 const stocking=[[-.08,0],[.08,0],[.07,-.44],[.11,-.61],[.26,-.69],[.24,-.79],[.02,-.78],[-.09,-.65],[-.10,-.43]];
 garment('Wool stocking left',.55,stocking,'#726b58',4.1,[0]);garment('Wool stocking right',.98,stocking,'#817663',4.6,[0]);
 let last=-Infinity;
 const update=(time:number)=>{if(time===last)return;last=time;for(const {geometry,base,phase}of fabrics){const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1],drop=Math.max(0,-y);const folds=Math.sin(x*31+phase)*.028+Math.sin(x*16+y*3+phase)*.018;const breeze=Math.sin(time*1.3+phase+y*2)*.045*drop*drop;p.setXYZ(i,x+Math.sin(time*.8+phase)*.012*drop,y,folds*Math.min(1,drop*10)+breeze);}geometry.computeVertexNormals();}};
 update(0);return {update};
}
