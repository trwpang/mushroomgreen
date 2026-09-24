import * as T from 'three';
import {ground,type Point} from './layout';
/** Fly agaric (Amanita muscaria): scarlet cap with white wart flecks, cream gills, a white
 * stem with a hanging skirt and a bulbous, ringed base. `open` runs from a warty button (0)
 * to a flattened adult cap (1). Own seed; no shared random draws. Units are metres. */
const cap=new T.MeshStandardMaterial({color:'#b5170e',roughness:.42});
cap.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 capP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncapP=position;');
 // Deeper crimson at the crown, orange towards the rim, as the pigment fades.
 shader.fragmentShader='varying vec3 capP;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float rim=clamp(length(capP.xz)/max(.001,capP.y+length(capP.xz)),0.,1.);
  diffuseColor.rgb=mix(vec3(.46,.035,.02),vec3(.8,.2,.05),smoothstep(.35,.95,rim));`);
};
const stem=new T.MeshStandardMaterial({color:'#e9e2cf',roughness:.8,side:T.DoubleSide});
const gill=new T.MeshStandardMaterial({color:'#efe6cc',roughness:.9,side:T.DoubleSide});
const wart=new T.MeshStandardMaterial({color:'#f4eedf',roughness:.85});

function lathe(points:[number,number][],segments=28){return new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments);}
export function flyAgaric(radius:number,height:number,open:number,seed:number){
 let s=seed>>>0;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 const g=new T.Group(),stemR=radius*.22,top=height;
 // Stem: swollen volva at the base, tapering up to the cap; a skirt hangs below the gills.
 g.add(new T.Mesh(lathe([[0,0],[stemR*1.75,.004],[stemR*1.9,height*.07],[stemR*1.35,height*.15],[stemR*1.08,height*.3],[stemR*.9,height*.7],[stemR*.82,top]]),stem));
 for(let i=0;i<3;i++)g.add(new T.Mesh(new T.TorusGeometry(stemR*(1.72-i*.18),stemR*.16,5,20).rotateX(Math.PI/2).translate(0,height*(.05+i*.035),0),stem));
 if(open>.3)g.add(new T.Mesh(lathe([[stemR*.86,top*.86],[stemR*1.6,top*.8],[stemR*1.75,top*.72],[stemR*1.55,top*.7]],20),stem));
 // Cap: nearly spherical in the button, flattening and turning up slightly at the rim when open.
 const dome=1-open*.62,capH=radius*(.35+.65*dome),rows:[number,number][]=[];
 for(let i=0;i<=14;i++){const t=i/14,a=t*Math.PI/2;rows.push([Math.sin(a)*radius,top+capH*Math.cos(a)**(1+open*.9)-radius*.12*dome*t*t]);}
 rows.push([radius*.97,top-radius*.06*(1-open)]);
 // Lathe profiles run rim → crown so the faces point outwards.
 g.add(new T.Mesh(lathe(rows.slice().reverse(),36),cap));
 // Gills: a cream underside from the rim to the stem.
 g.add(new T.Mesh(lathe([[radius*.97,top-radius*.06*(1-open)],[radius*.6,top-radius*.02],[stemR*.9,top+radius*.04]],36),gill));
 // Warts: pale flecks of the universal veil, denser on the crown, flattened onto the surface.
 const count=Math.round(26+30*open),warts=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),wart,count),m=new T.Object3D();
 for(let i=0;i<count;i++){const t=Math.sqrt(rand())*.92,a=rand()*Math.PI*2,k=Math.min(14,Math.floor(t*14)),[r,y]=rows[k],size=radius*(.045+.05*rand())*(1-t*.4);
  m.position.set(Math.cos(a)*r,y+size*.15,Math.sin(a)*r);m.lookAt(Math.cos(a)*r*2,y+radius*(1.2-t),Math.sin(a)*r*2);m.scale.set(size,size,size*.45);m.rotateZ(rand()*6);m.updateMatrix();warts.setMatrixAt(i,m.matrix);}
 g.add(warts);
 g.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=true;});
 return g;
}
/** A small group at the foot of a tree: two open caps and a button pushing up beside them. */
export function addFlyAgarics(scene:T.Scene,spots:{p:Point;radius:number;height:number;open:number;lean:number}[]){
 const root=new T.Group();root.name='Fly agarics';
 spots.forEach((spot,i)=>{const f=flyAgaric(spot.radius,spot.height,spot.open,911+i*37);f.position.set(spot.p[0],ground(...spot.p)-.01,spot.p[1]);f.rotation.set(spot.lean,i*2.1,spot.lean*.6);root.add(f);});
 scene.add(root);return root;
}
