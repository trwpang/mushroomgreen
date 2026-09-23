import * as T from 'three';
import {chainshopPosition,type Home} from './layout';
type Rect={x:number;y:number;w:number;h:number};
const overlap=(a:Rect,b:Rect)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
/** Screen-space packing: labels stay readable, with thin leaders to their own house. */
export function createHouseLabels(homes:Home[],layer:HTMLElement,select:(h:Home)=>void){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('house-label-leaders');layer.append(svg);
 const rows=homes.map(h=>{const el=document.createElement('button');el.type='button';el.className='map-label';el.hidden=true;el.title=`${h.number}. ${h.household_name}`;el.setAttribute('aria-label',`Read about ${h.number}, ${h.household_name}`);el.onclick=()=>select(h);layer.append(el);const line=document.createElementNS(svg.namespaceURI,'path');svg.append(line);return {h,el,line};});
 let last=0,previous='',namesMode=false;const point=new T.Vector3();
 return (camera:T.Camera,names:boolean,numbers:boolean,hidden:boolean,width:number,height:number)=>{
  const signature=[names,numbers,hidden,width,height,document.getElementById("house-panel")?.hidden,document.getElementById("notes-panel")?.hidden,camera.projectionMatrix.elements[0],...camera.matrixWorld.elements.map(n=>n.toFixed(2))].join('|');if(signature===previous||performance.now()-last<70)return;last=performance.now();previous=signature;
  layer.hidden=hidden||!(names||numbers);if(layer.hidden)return;
  if(namesMode!==names){namesMode=names;layer.classList.toggle('with-house-names',names);}
  const occupied:Rect[]=[];
  for(const selector of ['header','footer nav','.zoom-controls','#village-compass','#house-panel','#notes-panel','#room-controls']){const el=document.querySelector<HTMLElement>(selector);if(!el||el.hidden||getComputedStyle(el).display==='none')continue;const r=el.getBoundingClientRect();occupied.push({x:r.x-5,y:r.y-5,w:r.width+10,h:r.height+10});}
  const projected=rows.map(row=>{const h=row.h,p=h.number===5?chainshopPosition:[h.x,h.z];point.set(p[0],h.height+(h.style===1?6.8:4.8),p[1]).project(camera);return {...row,x:(point.x*.5+.5)*width,y:(-.5*point.y+.5)*height,visible:Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1};}).sort((a,b)=>a.y-b.y||a.h.number-b.h.number);
  for(const r of projected){r.el.hidden=!r.visible;r.line.setAttribute('d','');if(!r.visible)continue;
   r.el.textContent=names?`${r.h.number} · ${r.h.household_name}`:String(r.h.number);
   const w=names?Math.min(width<640?140:190,Math.max(95,r.el.textContent.length*5.45+14)):26,h=names?22:20;
   let chosen:Rect|undefined;
   for(let ring=0;ring<20&&!chosen;ring++){const offsets=ring===0?[[0,0]]:Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*ring*20,Math.sin(i*Math.PI/8)*ring*15]);for(const [dx,dy]of offsets){const rect={x:r.x-w/2+dx,y:r.y-h-8+dy,w,h};if(rect.x<10||rect.x+w>width-10||rect.y<10||rect.y+h>height-84||occupied.some(o=>overlap(rect,o)))continue;chosen=rect;break;}}
   if(!chosen){r.el.hidden=true;continue;}occupied.push(chosen);r.el.style.left=chosen.x+'px';r.el.style.top=chosen.y+'px';r.el.style.width=w+'px';
   const endX=Math.max(chosen.x,Math.min(chosen.x+w,r.x)),endY=Math.max(chosen.y,Math.min(chosen.y+h,r.y));
   if(names)r.line.setAttribute('d',`M${r.x.toFixed(1)},${r.y.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}`);
  }
 };
}
