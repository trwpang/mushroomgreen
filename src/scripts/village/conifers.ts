import * as T from 'three';
// Branch sprays give firs tiered crowns and pines open, high canopies.
export function coniferGeometry(pine:boolean){
 const v:number[]=[];let seed=pine?113:291;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let layer=0;layer<9;layer++)for(let arm=0;arm<8;arm++){
  const y=pine?4.3+layer*.29:1.7+layer*.65;
  const radius=pine?2.3*Math.sqrt(Math.max(.08,1-((y-5.1)/2)**2)):2.45*(1-layer/10);
  const a=arm*Math.PI/4+layer*1.73;
  for(let spray=0;spray<12;spray++){
   const t=.16+rand()*.84,r=radius*t,x=Math.cos(a)*r,z=Math.sin(a)*r;
   const cy=y+(pine?.25:-.34)*t+rand()*.18,size=(pine?.28:.23)*(1-.3*t),turn=a+(rand()-.5)*1.2;
   const dx=Math.cos(turn)*size,dz=Math.sin(turn)*size,wx=-Math.sin(turn)*size*.7,wz=Math.cos(turn)*size*.7;
   v.push(x-dx,cy,z-dz,x+wx,cy+.07,z+wz,x+dx,cy+.13,z+dz,x-dx,cy,z-dz,x+dx,cy+.13,z+dz,x-wx,cy-.04,z-wz);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;
}
