import * as T from 'three';
import type {Home} from './layout';
import {type InteriorPlan,type Furnishing,validateInterior} from './interior-plans';
import {interiorObject} from './interior-objects';
import {type InteriorObjectId} from './interior-catalogue';
export interface Dressing {id:InteriorObjectId;x:number;y:number;z:number;angle:number;tilt?:number;sx:number;sy:number;sz:number;anchor:string;role:'core'|'surface'|'wall'|'floor'|'bed';}
export function objectBounds(p:Dressing){return interiorObject(p.id).bounds.clone().applyMatrix4(new T.Matrix4().compose(new T.Vector3(p.x,p.y,p.z),new T.Quaternion().setFromEuler(new T.Euler(p.tilt??0,p.angle,0,'YXZ')),new T.Vector3(p.sx,p.sy,p.sz)));}
export function planDressing(home:Home,plan:InteriorPlan,floor:number,sy:number){
 const out:Dressing[]=[],items=plan.floors[floor].items,n=home.number,w=plan.width,d=plan.depth;
 const add=(id:InteriorObjectId,x:number,y:number,z:number,anchor:string,role:Dressing['role'],angle=0,sx=1,sz=1,scaleY=1)=>{const a={id,x,y,z,anchor,role,angle,sx,sz,sy:scaleY};out.push(a);return a;};
 function fit(id:InteriorObjectId,a:Furnishing,angle=a.angle??0,heightScale=1){const b=interiorObject(id).bounds.getSize(new T.Vector3()),swap=Math.abs(Math.sin(angle))>.5;return add(id,a.x,0,a.z,a.id,'core',angle,(swap?a.d:a.w)/b.x,(swap?a.w:a.d)/b.z,heightScale);}
 function surface(id:InteriorObjectId,a:Dressing,y:number,width:number,depth:number,dx=0,dz=0,scale=1,angle=0){
  const sockets=interiorObject(a.id).surfaces,slot=sockets.reduce((best,s)=>Math.abs(s.y*a.sy-y)<Math.abs(best.y*a.sy-y)?s:best,sockets[0]);
  if(!slot)return false;
  const tilt=['dinner-plate','side-plate'].includes(id)&&(a.id==='plate-rack'||a.id==='dresser'&&y>1)?Math.PI/2-.12:0;
  const floorOffset=objectBounds({id,x:0,y:0,z:0,angle:0,tilt,sx:scale,sy:scale,sz:scale,anchor:'',role:'surface'}).min.y;
  const c=Math.cos(a.angle),s=Math.sin(a.angle),p:Dressing={id,x:a.x+dx*c+dz*s,y:a.y+slot.y*a.sy+.001-floorOffset,z:a.z-dx*s+dz*c,angle:a.angle+angle,tilt,sx:scale,sy:scale,sz:scale,anchor:a.anchor,role:'surface'},b=objectBounds(p);
  const local=objectBounds({...p,x:dx,y:0,z:dz,angle});
  if(local.min.x<(slot.x-slot.width/2)*a.sx+.006||local.max.x>(slot.x+slot.width/2)*a.sx-.006||local.min.z<(slot.z-slot.depth/2)*a.sz+.006||local.max.z>(slot.z+slot.depth/2)*a.sz-.006)return false;
  if(out.some(q=>q.role==='surface'&&q.anchor===p.anchor&&objectBounds(q).clone().expandByScalar(.008).intersectsBox(b)))return false;
  out.push(p);return true;
 }
 const ranges:InteriorObjectId[]=['open-range','oven-range','hob-stove'],tables:InteriorObjectId[]=['scrubbed-table','turned-table','trestle-table'],beds:InteriorObjectId[]=['rope-bed','iron-bed','box-bed'],storage:InteriorObjectId[]=['dresser','drawers','food-cupboard'];
 for(const a of items){
  if(a.kind==='hearth'){
   const model=ranges[n%3],p=fit(model,{...a,x:a.x+a.w/2-.36,w:.58,d:a.d-.28},Math.PI/2,.85);
   const kettle:InteriorObjectId=n%4===0?'copper-kettle':n%3===0?'iron-kettle':'cooking-pot';
   surface(kettle,p,.749*.85+.009,(a.d-.28),.58,-(a.d-.28)*.23,0,.78);
   surface(n%3===0?'skillet':n%2?'saucepan':'griddle',p,.749*.85+.009,(a.d-.28),.58,(a.d-.28)*.22,0,.54,Math.PI/2);
   if(n%4===0)add('fireguard',a.x+a.w/2-.09,0,a.z,a.id,'floor',Math.PI/2,Math.min(1,(a.d-.10)/.74),.8,.85);
   // Mantel objects are fully supported by the existing chimney-breast shelf.
   const mantel=add('tinderbox',a.x+a.w/2-.065,1.435,a.z+a.d*.32,a.id+'-mantel','surface',Math.PI/2,.7,.7,.7);
   if(n%2===0)add('candlestick',a.x+a.w/2-.06,1.435,a.z-a.d*.32,a.id+'-mantel','surface',0,.8,.8,.8);
  }else if(a.kind==='table'){
   const p=fit(tables[(Math.floor(n/3)+n)%3],a),top=.783;
   // Meals own the dining table. Sewing never occupies the cooking/eating surface.
   const meals:InteriorObjectId[][]=[['dinner-plate','bread','tankard'],['soup-bowl','jug','wooden-spoon'],['bread-board','cheese','knife'],['teapot','teacup','saucer'],['mixing-bowl','rolling-pin','egg-cup'],['side-plate','butter-dish','fork']];
   if(n===22){
    for(const side of [-1,1]){surface('dinner-plate',p,top,a.w,a.d,side*.40,0,.9);surface('tankard',p,top,a.w,a.d,side*.62,-.23,.85);surface('knife',p,top,a.w,a.d,side*.23,.04,.82);}
    surface('oil-lamp',p,top,a.w,a.d,0,-.17,1);surface('bread',p,top,a.w,a.d,0,.20,.8);
   }else{const meal=meals[n%6];surface(meal[0],p,top,a.w,a.d,-a.w*.29,0,.9);surface(meal[1],p,top,a.w,a.d,a.w*.27,-.05,.9);surface(meal[2],p,top,a.w,a.d,0,.14,.9,Math.PI/2);}
  }else if(a.kind==='prep'){
   const p=fit('prep-table',a),top=.8125;
   // The middle stays clear for kneading, cutting, and setting a hot pan down.
   surface('mixing-bowl',p,top,a.w,a.d,-a.w*.30,0,.9);
   surface('rolling-pin',p,top,a.w,a.d,-a.w*.29,.21,.80);
   surface('dish-rack',p,top,a.w,a.d,a.w*.31,0,.86);
   for(const [i,id]of (['vegetable-basket','storage-crock','flour-sack'] as InteriorObjectId[]).entries())surface(id,p,.2425,a.w,a.d,(i-1)*a.w*.29,0,.85);
   surface('spice-jar',p,top,a.w,a.d,0,-.20,.9);
   surface('trivet',p,top,a.w,a.d,-a.w*.168,0,.80);
  }else if(a.kind==='sewingtable'){
   const p=fit('sewing-table',a);surface('hand-machine',p,.8125,a.w,a.d,-a.w*.13,0,.88);
   surface('thread-spools',p,.8125,a.w,a.d,a.w*.33,-.10,.85);surface('scissors',p,.8125,a.w,a.d,a.w*.33,.15,.8);
   surface('folded-linen',p,.2425,a.w,a.d,-a.w*.22,0,.9);surface('sewing-basket',p,.2425,a.w,a.d,a.w*.24,0,1);
  }else if(a.kind==='armchair'){
   fit(a.variant%2?'rush-armchair':'windsor-armchair',a);
  }else if(a.kind==='waterstation'){
   fit('water-crock-stand',a);
  }else if(a.kind==='fuelstore'){
   fit('log-basket',a);
  }else if(a.kind==='bed'){
   const p=fit(beds[(n+a.variant)%3],a);add('patchwork-quilt',a.x,.575,a.z+a.d*.12,a.id,'bed',0,(a.w-.06)/1.2,(a.d*.68)/1.3,1);
   add(n%2?'pillow':'bolster',a.x,.585,a.z-a.d*.32,a.id,'bed',0,Math.min(1,a.w/.85),1,1);
   const foot:InteriorObjectId=n%3===0?'boots':n%3===1?'clogs':'chamber-pot';add(foot,a.x-a.w*.25,0,a.z+a.d*.20,a.id,'floor',0,.8,.8,.8);
  }else if(a.kind==='cupboard'||a.kind==='pantry'){
   const id=a.kind==='pantry'?'food-cupboard':n===22?'dresser':storage[(n+floor)%3],p=fit(id,a,a.angle??(a.z>0?Math.PI:0));
   if(id==='dresser'){
    const shelves:InteriorObjectId[][]=[['storage-crock','spice-jar'],['stone-bottle','glass-bottle'],['teacup','tankard']];
    shelves.forEach((row,i)=>row.forEach((item,j)=>surface(item,p,[1.05,1.38,1.65][i],a.w,.18,(j-.5)*a.w*.48,-.075,.72)));
    for(const [j,item]of (['dinner-plate','side-plate'] as InteriorObjectId[]).entries())surface(item,p,.845,a.w,a.d,(j-.5)*a.w*.48,.02,.72);
   }else{
    const high=id==='drawers'?.845:1.505;
    const pairs:InteriorObjectId[][]=[['bread-crock','storage-crock'],['folded-linen','flat-iron'],['jug','mixing-bowl'],['stone-bottle','oil-lamp'],['glass-bottle','sewing-basket']];
    (floor?pairs[(n+floor)%5]:[['bread-crock','storage-crock'],['stone-bottle','oil-lamp'],['jug','mixing-bowl']][n%3] as InteriorObjectId[]).forEach((item,j)=>surface(item,p,high,a.w,a.d,(j-.5)*a.w*.46,0,.7));
   }
  }else if(a.kind==='stool'){fit((['stool','spindle-chair','ladder-chair'] as InteriorObjectId[])[n%3],a,a.angle??(a.z>0?Math.PI:0));
  }else if(a.kind==='washstand'){
   const p=fit('washstand',a,a.angle??(a.z>0?Math.PI:0));surface('jug',p,.815,a.w,a.d,a.w*.30,0,.7);
   surface('soap-dish',p,.815,a.w,a.d,-a.w*.28,0,.75);
   add(n%2?'water-pail':'slop-pail',a.x+Math.sin(p.angle)*.064,0,a.z+Math.cos(p.angle)*.064,a.id,'floor',p.angle,.70,.70,.70);
   surface('scrub-brush',p,.335,a.w-.1,a.d-.06,0,-.11*p.sz,.85);
  }else if(a.kind==='fuelbucket'){fit('coal-scuttle',a,Math.PI/2); // Coal stays at the planned hearth-side position.
  }else if(a.kind==='chest'){
   const p=fit('blanket-box',a);surface(n%4===0?'cap':'folded-linen',p,.538,a.w,a.d,0,0,.85);
  }else if(a.kind==='linenbench'){
   if(n%7===0){const p=fit('treadle-machine',a);surface('thread-spools',p,.777,a.w,a.d,-a.w*.37,.05,.75);}
   else{const p=fit('bench',a);surface(n===22?'book':'folded-linen',p,.463,a.w,a.d,-a.w*.34,0,.8);if(n!==22)surface('sewing-basket',p,.463,a.w,a.d,a.w*.28,0,.9);}
  }
 }
 // A shallow centre-wall cupboard shelf avoids all four glazing openings.
 const kitchenShelf:InteriorObjectId[]=['storage-crock','spice-jar','stone-bottle','glass-bottle','teacup','soup-bowl','tankard','salt-cellar','butter-dish','coffee-mill'];
 const shelf=add('plate-rack',0,1.02,-d/2+.33,'rear-wall-rack','wall');
 for(let level=0;level<3;level++){
  const shelfChoices:InteriorObjectId[]=['dinner-plate','side-plate','soup-bowl','teacup','saucer','tankard','egg-cup','salt-cellar','spice-jar','storage-crock','stone-bottle','glass-bottle','bread-crock','butter-dish','flat-iron','trivet','oil-lamp','book','candle-snuffer','sewing-basket','thread-spools','scissors','pincushion','darning-mushroom','needle-case','folded-linen','cap','scrub-brush','soap-dish','mortar','coffee-mill','tinderbox'];
  for(let j=0;j<2;j++)surface(level===2?(j?'side-plate':'dinner-plate'):(floor?shelfChoices: kitchenShelf)[(n*3+floor*11+level*2+j)%(floor?shelfChoices:kitchenShelf).length],shelf,[.057,.347,.677][level],.72,.23,(j-.5)*.34,0,.64);
 }
 // Curtains stay beside the aperture, forward of timber; leave the central glass visible.
 const low=(floor?1.225:1.30)*sy-.45*sy-.12,high=low+.9*sy;
 for(const side of [-1,1])for(const x of [-w*.32,w*.32])if((n+floor)%4!==1||x<0){
  const p=add('curtains',x,high-.96,side*(d/2-.255),`window-${side}-${x}`,'wall',side===-1?0:Math.PI,home.sx,1,.96/1.09);
 }
 // Small items hang from individual visible pegs, away from the window openings.
 const wallItems:InteriorObjectId[]=['toast-fork','poker','tongs','coal-shovel','bellows','ladle','onion-string','herb-bundle','apron','towel','mirror','wall-clock','framed-print'];
 const positions=[[-w*.10,-d/2+.245],[w*.10,-d/2+.245]];
 for(let i=0;i<2;i++){const id=wallItems[(n*2+floor*3+i)%wallItems.length],b=interiorObject(id).bounds;const x=positions[i][0];
  // Broad apron/clock shapes use the outer gable; slender fire tools use the chimney gable.
  if(['toast-fork','poker','tongs','coal-shovel','bellows','ladle'].includes(id))add(id,-w/2+.185-b.min.z*.82,n===22?.55:.65,n===22?.82+i*.16:-d*.28+i*.16,'hearth-tools','wall',Math.PI/2,.82,.82,.82);
  else add(id,x,1.78-b.max.y*.82,-d/2+.185-b.min.z*.82,'rear-wall-hanging','wall',0,.82,.82,.82);
 }
 // A cooker has nearby hanging utensils, and family possessions occupy the blank wall between windows.
 if(!floor){
  const gableX=-w/2+.21;
  if(n===22)add('pan-rack',-2.08,1.80,-d/2+.21,'rear-wall-hanging','wall',0,.9,.9,.9);
  else if(items.some(a=>a.kind==='prep'))add('pan-rack',gableX,1.50,-d*.32,'hearth-tools','wall',Math.PI/2,.9,.9,.9);
  if(n===22){
   for(const [id,x,y]of [['wall-clock',-.48,1.30],['wall-sampler',.45,1.27],['oval-portrait',.87,1.38]] as const){const b=interiorObject(id).bounds;add(id,x,y,-d/2+.185-b.min.z,'rear-wall-hanging','wall');}
   const hearth=items.find(a=>a.kind==='hearth')!;
   add('mantel-clock',hearth.x+hearth.w/2-.065,1.435,0,hearth.id+'-mantel','surface',Math.PI/2,.80,.80,.80);
   add('log-basket',-4.65,0,.91,'hearth-kindling','floor',0,.55,.55,.55);
  }else{
   const id:InteriorObjectId=n%3===0?'wall-sampler':n%3===1?'oval-portrait':'wall-clock',b=interiorObject(id).bounds;
   add(id,-w*.14,1.36,-d/2+.185-b.min.z*.78,'rear-wall-hanging','wall',0,.78,.78,.78);
  }
 }
 // Extra floor items only enter if the same person-sized route test still passes.
 const floorExtras:InteriorObjectId[]=[];if(!floor&&n%9===0)floorExtras.push('cradle');if(!floor&&n%5===0)floorExtras.push('flour-sack');
 for(const id of floorExtras){const size=interiorObject(id).bounds.getSize(new T.Vector3());let found=false;
  for(const side of [1,-1])for(const end of [-1,1])for(const offset of [.22,.52,.82]){
   if(found)break;const x=side*(w/2-.22-size.x/2),z=end*(d/2-.22-size.z/2-offset),a:Furnishing={id:`object-${id}`,kind:'basket',x,z,w:size.x,d:size.z,variant:0};
   const trial={...plan,floors:plan.floors.map((f,i)=>i===floor?{...f,items:[...f.items,a]}:f)};
   if(!validateInterior(trial).length){add(id,x,0,z,a.id,'floor');found=true;}
  }
 }
 return out;
}
