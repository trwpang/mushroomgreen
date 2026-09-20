import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {refineSurface} from '../rendering/surfaces';

// Interpreted domestic stores, not surveyed historical extensions. Geometry is in cottage metres.
export function serviceStore(number:number, width:number, depth:number, height:number, datum:number, atlases:Partial<Record<'wood'|'slate',T.MeshStandardMaterial>>={}){
  let seed=number*8191+341;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const group=new T.Group();group.name='Weathered service store';
  const materials=['brick','wood','slate','iron'].map(kind=>{
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness:kind==='iron'?.83:.96});
    m.name='Store '+kind;m.userData.surfaceDatum=datum;
    const source=atlases[kind as 'wood'|'slate'];
    if(source){m.map=source.map;m.normalMap=source.normalMap;m.roughnessMap=source.roughnessMap;m.normalScale.copy(source.normalScale);}
    refineSurface(m,kind as 'brick'|'wood'|'slate'|'iron');return m;
  });
  const parts:T.BufferGeometry[][]=materials.map(()=>[]);
  const matrix=new T.Matrix4();
  function box(x:number,y:number,z:number,w:number,h:number,d:number,kind:number,color:string,tilt=0,variation=.16,roll=0){
    const g=new T.BoxGeometry(w,h,d).toNonIndexed();
    matrix.makeRotationFromEuler(new T.Euler(tilt,0,roll)).setPosition(x,y,z);g.applyMatrix4(matrix);
    const c=new T.Color(materials[kind].map?(kind===1?'#c6bba8':'#c3b9a5'):color).multiplyScalar(1+(random()-.5)*variation);
    if(materials[kind].map){
      const piece=Math.floor(random()*16),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,((piece%4)+.015+uv.getX(i)*.97)/4,(Math.floor(piece/4)+.015+uv.getY(i)*.97)/4);
    }
    const colors=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3)c.toArray(colors,i);
    g.setAttribute('color',new T.BufferAttribute(colors,3));parts[kind].push(g);
  }
  const front=-depth/2,back=depth/2,base=.08;
  const eave=Math.max(1.94,height),pitch=.30,roof=(z:number)=>eave+(z-front)*pitch;
  const doorX=(number%3-1)*width*.12,doorW=.76,doorH=1.76;
  const left=doorX-doorW/2,right=doorX+doorW/2;
  const brick=['#784432','#87503a','#6a4335','#925741'][number%4];
  const timber=['#61503a','#514735','#706048'][number%3];
  const isTimber=number%2===1;
  // Continuous recessed backing closes mortar joints. A real opening remains behind the door.
  box((-width/2+left)/2,eave/2,front+.07,left+width/2,eave,.14,0,'#51493b');
  box((right+width/2)/2,eave/2,front+.07,width/2-right,eave,.14,0,'#51493b');
  box(doorX,(doorH+eave)/2,front+.07,doorW,eave-doorH,.14,0,'#51493b');
  for(const side of [-1,1]){
    // Fill to the inclined roof with narrow panels, including the triangular upper section.
    for(let j=0;j<Math.ceil(depth/.15);j++){
      const step=depth/Math.ceil(depth/.15),z=front+(j+.5)*step,h=roof(z);
      box(side*(width/2-.065),h/2,z,.13,h,step+.001,0,'#484134',0,0);
    }
  }
  box(0,.05,0,width,.10,depth,0,'#534a3b');
  box(0,roof(back)/2,back-.05,width,roof(back),.10,0,'#51493b');
  if(!isTimber){
    for(let row=0;row<Math.floor(eave/.085);row++){
      const y=.045+row*.085;
      for(let x=-width/2-(row%2)*.145;x<width/2;x+=.29){
        const a=Math.max(-width/2,x),b=Math.min(width/2,x+.29);
        const spans=y<doorH?[[a,Math.min(b,left)],[Math.max(a,right),b]]:[[a,b]];
        for(const [lo,hi] of spans)if(hi-lo>.024)
          box((lo+hi)/2,y,front-.017,hi-lo-.011,.074,.045,0,row<3?'#4b3c2d':brick);
      }
    }
    for(const side of [-1,1])for(let row=0;row<Math.ceil(roof(back)/.085);row++){
      const y=.045+row*.085;
      for(let z=front-(row%2)*.145;z<back;z+=.29){
        const a=Math.max(front,z),b=Math.min(back,z+.29);
        if(b-a>.03&&y+.04<roof(a))box(side*(width/2+.012),y,(a+b)/2,.045,.074,b-a-.011,0,row<3?'#4b3c2d':brick);
      }
    }
  }else{
    const n=Math.ceil(width/.16),step=width/n;
    for(let i=0;i<n;i++){
      const a=-width/2+i*step,b=a+step;
      if(b>left&&a<right){box((a+b)/2,(doorH+eave)/2,front-.024,step-.005,eave-doorH,.07,1,timber);continue;}
      box((a+b)/2,eave/2,front-.024,step-.006,eave-.014,.075,1,timber);
    }
    for(const side of [-1,1])for(let i=0,n=Math.ceil(depth/.16);i<n;i++){
      const z=front+(i+.5)*depth/n,h=roof(z)-.02;
      box(side*width/2,h/2,z,.07,h,depth/n-.006,1,timber);
    }
  }
  // Individual door planks, jambs, iron straps and a thumb latch.
  box(doorX,(doorH+base)/2,front+.018,doorW,doorH-base,.045,1,'#3c3428');
  for(let i=0;i<6;i++)box(left+(i+.5)*doorW/6,(doorH+base)/2,front-.025,doorW/6-.006,doorH-base,.065,1,timber);
  for(const x of [left-.045,right+.045])box(x,doorH/2,front-.054,.082,doorH,.10,1,'#403829');
  box(doorX,doorH+.052,front-.07,doorW+.20,.105,.16,1,'#51402d');
  for(const y of [.35,1.44]){
    box(doorX-.04,y,front-.073,.65,.07,.03,1,'#443a2b');
    box(left+.12,y,front-.098,.32,.035,.016,3,'#2c2b24');
    for(const x of [left+.02,left+.25])box(x,y,front-.109,.018,.018,.012,3,'#71604b');
  }
  box(right-.09,.95,front-.10,.14,.028,.027,3,'#38372c');
  box(right-.07,.91,front-.11,.018,.095,.018,3,'#38372c');
  // A diagonal ledge stiffens the reused plank door. Two rivets hold each old strap.
  const braceLength=Math.hypot(.52,1.02);
  box(doorX,.89,front-.079,.055,braceLength,.026,1,'#544733',0,.12,-Math.atan2(.52,1.02));
  // Short matching repair pieces at the exposed board feet; high wall boards remain intact.
  if(isTimber){
    const repairSide=number%3===0?-1:1;
    for(let i=0;i<2;i++){
      const rz=front+(1.5+i)*depth/Math.ceil(depth/.16),rh=.24+(number%4)*.045;
      box(repairSide*(width/2+.043),rh/2+.06,rz,.026,rh,depth/Math.ceil(depth/.16)-.013,1,'#8c7758',0,.1);
      for(const y of [.10,rh+.025])box(repairSide*(width/2+.063),y,rz,.012,.014,.018,3,'#44392d',0,0);
    }
  }
  // Vent slot under the eave, with slats rather than a painted rectangle.
  const ventX=doorX>0?-width*.34:width*.34;
  box(ventX,eave-.24,front-.041,.28,.15,.018,3,'#22251f');
  for(let i=0;i<3;i++)box(ventX,eave-.29+i*.048,front-.060,.31,.028,.048,1,'#514b38');
  for(let i=0;i<3;i++)box(doorX+(i-1)*.32,.055,front-.23,.313,.11,.45,0,'#696552');
  // Roof drains away from the cottage. Staggered courses overlap downhill; no slab cap.
  const slope=-Math.atan(pitch),roofW=width+.24,roofD=depth+.24;
  box(0,roof(0)+.025,0,roofW,.055,roofD,1,'#42382b',slope,0);
  for(let row=0;row<Math.ceil(roofD/.19);row++){
    const z=front-.10+row*.19;
    for(let x=-roofW/2-(row%2)*.135;x<roofW/2;x+=.27){
      const a=Math.max(-roofW/2,x),b=Math.min(roofW/2,x+.27);
      if(b-a<.025)continue;
      box((a+b)/2,roof(z)+.072+row*.002+(random()-.5)*.005,z,b-a-.006,.033,.29,2,
        number%3===0?'#534e40':'#73513b',slope, .30);
    }
  }
  box(0,roof(front-.14)-.005,front-.14,roofW,.105,.05,1,'#4d4030');
  for(const side of [-1,1])box(side*(width/2+.12),roof(0),0,.055,.105,roofD,1,'#504030',slope);
  box(0,roof(back)+.13,back-.018,width+.12,.13,.045,3,'#58564b');
  parts.forEach((list,i)=>{
    const mesh=new T.Mesh(mergeGeometries(list),materials[i]);list.forEach(g=>g.dispose());
    mesh.name='Store '+materials[i].name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  });
  group.userData.door={x:doorX,z:front,width:doorW,height:doorH};
  group.userData.roof={front:roof(front),back:roof(back)};
  return group;
}
