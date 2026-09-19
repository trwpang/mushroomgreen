import {addWorkingChainmaker} from '../chainmaker/worker';
import {centralWorkstation} from './workshop';
import {rememberPlace} from './location';
import {createInspection} from './inspection';
import {addVillageLife} from './village-life';
import {householdReader} from './household-reader';
import {coniferGeometry} from './conifers';
import {addYardDetails,openStack} from './yard-details';
import * as T from 'three';
import {addLaundry} from './laundry';
import {individualise} from './dwellings';
import {addShowcase,weatherGround} from './showcase';
import families from '../../data/families.json';
import {paintLanes,addLandscape} from './landscape';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { roads,brooks,boundary,greens,project,ground,prepareGround,weaverWorkshop,makeHomes,nearestRoad,nearestSegment,localPoint,streamDistance,chainshopPosition,chainshopReplacesHouse,type Point,type Home,type Household } from './layout';
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed=1865;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const material=(color:string,roughness=.9)=>new T.MeshStandardMaterial({color,roughness});
const soil=material('#696044'),timber=material('#514733'),iron=material('#393c33',.68),stone=material('#8c8874');
const clay=material('#514638'),brick=material('#77503b'),lime=material('#a49c81'),glass=material('#27382f',.4);
const meshes=new Map<T.Material,T.BufferGeometry[]>();
function batch(g:T.BufferGeometry,m:T.Material,matrix?:T.Matrix4){g=g.index?g.toNonIndexed():g;if(matrix)g.applyMatrix4(matrix);g.deleteAttribute('uv');const a=meshes.get(m)||[];a.push(g);meshes.set(m,a);}
const dummy=new T.Object3D();
function cube(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,angle=0){dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(w,h,d);dummy.updateMatrix();batch(new T.BoxGeometry(1,1,1),m,dummy.matrix);}
function beam(a:T.Vector3,b:T.Vector3,r:number,m:T.Material){const diff=b.clone().sub(a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.clone().normalize());dummy.scale.set(1,1,1);dummy.updateMatrix();batch(new T.CylinderGeometry(r*.75,r,diff.length(),5),m,dummy.matrix);}
async function start(){
const mount=$('village-canvas');const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Village. Drag to orbit; scroll to zoom; select a house.');
const scene=new T.Scene();scene.background=new T.Color('#c4c7b9');scene.fog=new T.Fog('#c4c7b9',850,1700);
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.2,2600);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=1800;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.04;controls.maxTargetRadius=300;controls.cursor.set(0,0,-60);controls.zoomSpeed=.8;
const hemi=new T.HemisphereLight('#e4e9de','#6e6045',2.0);scene.add(hemi);const sun=new T.DirectionalLight('#fff0d4',3.2);sun.position.set(-100,180,95);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:500});sun.shadow.normalBias=.07;sun.shadow.bias=-.0004;scene.add(sun,sun.target);const fill=new T.DirectionalLight('#ccd8e0',.8);fill.position.set(70,50,-90);scene.add(fill);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));camera.layers.enable(1);const aoCamera=camera.clone();aoCamera.layers.set(0);const ao=new GTAOPass(scene,aoCamera,innerWidth,innerHeight);ao.blendIntensity=.64;ao.updateGtaoMaterial({radius:.45,distanceExponent:1.7,thickness:1,scale:1});composer.addPass(ao);composer.addPass(new OutputPass());
const households:Household[]=await fetch('/households.json').then(r=>{if(!r.ok)throw Error('Household data unavailable');return r.json();});const homes=makeHomes(households);prepareGround(homes);const founder=homes.find(h=>h.number===22)!;const domesticShop=weaverWorkshop(founder);
const within=(x:number,z:number)=>Math.pow(x/210,2)+Math.pow((z+60)/240,2)<.97;
// Paint an original terrain atlas in world coordinates. Roads remain exactly on the map polylines.
const terrainCanvas=document.createElement('canvas');terrainCanvas.width=terrainCanvas.height=4096;const ctx=terrainCanvas.getContext('2d')!;const img=ctx.createImageData(4096,4096);
for(let j=0;j<4096;j++)for(let i=0;i<4096;i++){const n=rand()*13+Math.sin(i*.017+Math.cos(j*.02)*2)*5+Math.sin(j*.025)*4;const k=(j*4096+i)*4;img.data[k]=103+n;img.data[k+1]=110+n;img.data[k+2]=70+n*.75;img.data[k+3]=255;}ctx.putImageData(img,0,0);
const pixel=(p:Point):Point=>[(p[0]+230)/460*4096,(p[1]+320)/520*4096];
function stroke(points:Point[],width:number,color:string){ctx.beginPath();points.forEach((p,i)=>{const q=pixel(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.strokeStyle=color;ctx.lineWidth=width/460*4096;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
for(const polygon of greens){ctx.beginPath();polygon.forEach((p,i)=>{const q=pixel(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();ctx.fillStyle='#61713b55';ctx.fill();}
// Irregular bare, straw-coloured and damp patches break up the grass base.
let grassSeed=491865;const grassRandom=()=>{grassSeed=(Math.imul(grassSeed,1664525)+1013904223)>>>0;return grassSeed/4294967296;};
const grassPatch=(x:number,z:number)=>.5+.23*Math.sin(x*.19+Math.sin(z*.13)*2)+.17*Math.sin(z*.31-x*.08)+.10*Math.sin(x*.83+z*.49);
for(let i=0;i<2300;i++){const x=(grassRandom()-.5)*420,z=-60+(grassRandom()-.5)*480;if(!within(x,z))continue;const q=pixel([x,z]),r=(1.5+grassRandom()*5)*4096/460,g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],r);g.addColorStop(0,i%3?'#8c795365':'#493e3055');g.addColorStop(1,i%3?'#8c795300':'#493e3000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();}
const paths:Point[][]=[];
for(const h of homes.filter(h=>h.number!==chainshopReplacesHouse)){const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;const front=localPoint(h,0,d/2+.3);const road=nearestRoad(front);let points:Point[]=[front,road];
// Bend around intervening homes instead of cutting their footprints.
for(const other of homes){if(other===h)continue;const q=nearestSegment([other.x,other.z],front,road);if(Math.hypot(q[0]-other.x,q[1]-other.z)<Math.max(other.width,other.depth)*.45){points=[front,[other.x-Math.max(other.width,other.depth)*.7,other.z],road];break;}}
paths.push(points);const q=pixel([h.x,h.z]);ctx.save();ctx.translate(...q);ctx.rotate(-h.angle);ctx.fillStyle='#857858';ctx.beginPath();ctx.ellipse(0,0,(w/2+2.2)/460*4096,(d/2+2.8)/520*4096,0,0,Math.PI*2);ctx.fill();ctx.restore();}
paintLanes(ctx,pixel,rand,paths);
for(let i=0;i<65000;i++){const x=rand()*4096,y=rand()*4096;ctx.fillStyle=i%2?'#3f42310c':'#e0ce9f0d';ctx.fillRect(x,y,rand()*6+1,rand()*3+1);}
const groundTexture=new T.CanvasTexture(terrainCanvas);groundTexture.colorSpace=T.SRGBColorSpace;groundTexture.anisotropy=8;
const groundGeo=new T.PlaneGeometry(460,520,460,520);groundGeo.rotateX(-Math.PI/2);groundGeo.translate(0,0,-60);const pos=groundGeo.attributes.position;const index:number[]=[];const source=groundGeo.index!;for(let i=0;i<pos.count;i++)pos.setY(i,ground(pos.getX(i),pos.getZ(i)));for(let i=0;i<source.count;i+=3){const ids=[source.getX(i),source.getX(i+1),source.getX(i+2)];if(ids.every(v=>within(pos.getX(v),pos.getZ(v))))index.push(...ids);}groundGeo.setIndex(index);
const uv=groundGeo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+230)/460,1-(pos.getZ(i)+320)/520);groundGeo.computeVertexNormals();const terrain=new T.Mesh(groundGeo,new T.MeshStandardMaterial({map:groundTexture,color:'#c1c3ab',roughness:1}));weatherGround(terrain.material);terrain.receiveShadow=true;scene.add(terrain);
// A shallow cut edge gives the landscape a continuous, hand-built model base.
const edges=new Map<string,{a:number;b:number;count:number}>();
for(let i=0;i<index.length;i+=3)for(let k=0;k<3;k++){const a=index[i+k],b=index[i+(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});}
const rimPos:number[]=[];for(const {a,b,count}of edges.values())if(count===1){const ax=pos.getX(a),az=pos.getZ(a),ay=pos.getY(a),bx=pos.getX(b),bz=pos.getZ(b),by=pos.getY(b);rimPos.push(ax,ay,az,bx,by,bz,ax,-4,az,bx,by,bz,bx,-4,bz,ax,-4,az);}
const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(rimPos,3));rg.computeVertexNormals();const rimMaterial=material('#514b36');rimMaterial.side=T.DoubleSide;scene.add(new T.Mesh(rg,rimMaterial));
const base=new T.Mesh(new T.PlaneGeometry(2400,2400),material('#bec3b0'));base.rotation.x=-Math.PI/2;base.position.y=-4.1;base.receiveShadow=true;scene.add(base);
// Geometry is shared across cottages. Detailed houses only appear near the camera target.
$('load-label').textContent='Building cottages and working yards…';const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const kit=await loader.loadAsync('/village/cottages.glb');const highTemplates:T.Object3D[]=[];for(let i=0;i<3;i++){const group=kit.scene.getObjectByName('cottage_'+i);if(!group)throw Error('Cottage kit missing type '+i);highTemplates.push(group);}
const windowMaterials:T.MeshStandardMaterial[]=[glass];
for(const root of highTemplates)root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(m instanceof T.MeshStandardMaterial){if(m.map)m.map.anisotropy=8;if(m.name.includes('Small dark glass')){m.roughness=.16;m.metalness=.15;m.color.set('#496568');windowMaterials.push(m);}}}});
// Distant buildings retain brick courses and tile joints instead of flat colour blocks.
function surface(kind:'brick'|'roof'|'lime'){
const c=document.createElement('canvas');c.width=c.height=512;const p=c.getContext('2d')!;
p.fillStyle=kind==='brick'?'#655b46':kind==='roof'?'#36382d':'#9b957d';p.fillRect(0,0,512,512);
if(kind!=='lime')for(let row=0;row<32;row++)for(let col=-1;col<17;col++){const x=col*32+(row%2)*16,y=row*16;const v=rand()*20;
p.fillStyle=kind==='brick'?`rgb(${102+v},${69+v*.7},${47+v*.55})`:`rgb(${61+v},${54+v*.8},${42+v*.6})`;p.fillRect(x+1,y+1,30,14);p.fillStyle='#ffffff0e';p.fillRect(x+1,y+1,30,1);}
for(let i=0;i<16000;i++){p.fillStyle=i%2?'#191d1819':'#e6dcc013';p.fillRect(rand()*512,rand()*512,rand()*3+1,rand()*2+1);}
const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return new T.MeshStandardMaterial({map:t,roughness:1});}
const distantBrick=surface('brick'),distantRoof=surface('roof'),distantLime=surface('lime');
distantBrick.name='Wall brick';distantRoof.name='Roof tiles';distantLime.name='Wall limewash';
function lowHouse(style:number){const root=new T.Group(),w=[6.4,7.2,9.2][style],d=[4.6,4.8,4.5][style],e=[2.65,4.45,2.85][style],r=e+1.65;function add(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);}
add(new T.BoxGeometry(w,e,d),style===2?distantLime:distantBrick,0,e/2,0);const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute([-w/2-.2,e,d/2+.3,w/2+.2,e,d/2+.3,w/2+.2,r,0,-w/2-.2,e,d/2+.3,w/2+.2,r,0,-w/2-.2,r,0,-w/2-.2,r,0,w/2+.2,r,0,w/2+.2,e,-d/2-.3,-w/2-.2,r,0,w/2+.2,e,-d/2-.3,-w/2-.2,e,-d/2-.3],3));roof.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1,0,1,1,1,1,0,0,1,1,0,0,0],2));roof.computeVertexNormals();add(roof,distantRoof,0,0,0);
for(const side of [-1,1]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([side*w/2,e,-d/2,side*w/2,r,0,side*w/2,e,d/2],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,.5,1,1,0],2));g.computeVertexNormals();const m=(style===2?distantLime:distantBrick).clone();m.side=T.DoubleSide;add(g,m,0,0,0);}openStack(root,-w/2+.55,r+.55,0,.65,1.5,.55,brick);
for(const side of [-1,1])for(const x of [-w*.32,w*.32])for(const y of (style===1?[1.3,3.45]:[1.3])){add(new T.BoxGeometry(1.05,1,.045),timber,x,y,side*(d/2+.035));add(new T.BoxGeometry(.88,.82,.06),glass,x,y,side*(d/2+.055));}
add(new T.BoxGeometry(.92,1.96,.06),timber,0,.98,d/2+.055);return root;}
const houseRoots:T.Group[]=[],highRoots:T.Object3D[]=[],lowRoots:T.Object3D[]=[];const pickTargets:T.Mesh[]=[];
for(const h of homes){const root=new T.Group();root.position.set(h.x,h.height,h.z);root.rotation.y=h.angle;root.scale.set(h.sx,1,h.sz);const low=lowHouse(h.style),high=highTemplates[h.style].clone(true);high.visible=false;root.add(low,high);individualise(h,root,low,high);root.visible=h.number!==chainshopReplacesHouse;scene.add(root);houseRoots.push(root);highRoots.push(high);lowRoots.push(low);
const pick=new T.Mesh(new T.BoxGeometry([6.4,7.2,9.2][h.style],h.style===1?6.2:4.5,[4.6,4.8,4.5][h.style]),new T.MeshBasicMaterial({visible:false}));pick.position.y=(h.style===1?6.2:4.5)/2;pick.userData.home=h;root.add(pick);if(h.number!==chainshopReplacesHouse)pickTargets.push(pick);
if(h.number===chainshopReplacesHouse)continue;
// Short yard boundaries leave gaps for shared approaches.
const width=[6.4,7.2,9.2][h.style]*h.sx,depth=[4.6,4.8,4.5][h.style]*h.sz;
for(const side of [-1,1]){if(h.number===22&&side===-1)continue;for(let k=0;k<4;k++){const a=localPoint(h,side*(width/2+1.4),-depth/2+k*1.5);cube(a[0],ground(...a)+.48,a[1],.12,.95,.13,timber,h.angle);if(k<3){const b=localPoint(h,side*(width/2+1.4),-depth/2+(k+1)*1.5);for(const y of [.32,.73])beam(new T.Vector3(a[0],ground(...a)+y,a[1]),new T.Vector3(b[0],ground(...b)+y,b[1]),.032,timber);}}}
// Ash, paving fragments, and a few useful logs around each doorway.
for(let k=0;k<13;k++){const a=localPoint(h,(rand()-.5)*(width+2),depth/2+rand()*2.8);cube(a[0],ground(...a)+.035,a[1],.18+rand()*.23,.07,.13+rand()*.2,k%4?stone:soil,rand()*3);}
}
// Founder yard: a wash line, privy, vegetable rows, stacked timber, and a bench.
const yardMat=material('#6a553c'),leafMat=material('#637341');
function yardPoint(x:number,z:number,y=0){const p=localPoint(founder,x,z);return new T.Vector3(p[0],ground(...p)+y,p[1]);}
for(const x of [-4.8,1.5]){const p=yardPoint(x,-6.6);cube(p.x,p.y+1.2,p.z,.10,2.4,.10,timber,founder.angle);}
const laundry=addLaundry(scene,founder);
const life=addVillageLife(scene,homes,paths);mount.dataset.animals=JSON.stringify(life.stats);

mount.dataset.coalBunkers=String(addYardDetails(scene,homes));
for(let row=0;row<9;row++)for(let col=0;col<13;col++){const p=yardPoint(-1.7+col*.24,-4.1-row*.12,.032);cube(p.x,p.y,p.z,.228,.05,.108,stone,founder.angle);}
// A mended gate beside the founder's yard.
for(let i=0;i<7;i++){const p=yardPoint(5.8,-2.3+i*.18,.52);cube(p.x,p.y,p.z,.065,1.04,.11,timber,founder.angle);}
beam(yardPoint(5.8,-2.4,.22),yardPoint(5.8,-1.1,.79),.033,timber);
for(let i=0;i<7;i++){const a=yardPoint(4.5+i%3*.16,3.8, .13+Math.floor(i/3)*.15),b=yardPoint(5.5+i%3*.16,3.8,.13+Math.floor(i/3)*.15);beam(a,b,.09,timber);}
const bench=yardPoint(-3.1,4.1,.5);cube(bench.x,bench.y,bench.z,1.6,.13,.43,timber,founder.angle);for(const x of [-3.7,-2.5]){const p=yardPoint(x,4.1,.25);cube(p.x,p.y,p.z,.1,.5,.33,timber,founder.angle);}
// Trees have individual folded leaves, with shared geometry for the whole village.
const leafVertices:number[]=[];
for(let i=0;i<1500;i++){const a=rand()*Math.PI*2,y=3.1+rand()*4.4,r=Math.sqrt(rand())*2.6*Math.sqrt(Math.max(0,1-Math.pow((y-5.3)/2.2,2))),x=Math.cos(a)*r,z=Math.sin(a)*r,s=.12+rand()*.13,turn=rand()*Math.PI*2;
const dx=Math.cos(turn)*s,dz=Math.sin(turn)*s,wx=-Math.sin(turn)*s*.44,wz=Math.cos(turn)*s*.44;
const points=[[x-dx,y,z-dz],[x-dx*.35+wx,y+.025,z-dz*.35+wz],[x+dx*.4+wx,y+.06,z+dz*.4+wz],[x+dx,y+.04,z+dz],[x+dx*.35-wx,y-.005,z+dz*.35-wz],[x-dx*.4-wx,y-.015,z-dz*.4-wz]];
for(const k of [0,1,2,0,2,3,0,3,4,0,4,5])leafVertices.push(...points[k]);}

for(let i=0;i<leafVertices.length;i+=3){const x=leafVertices[i],y=leafVertices[i+1],z=leafVertices[i+2],lobe=1+.13*Math.sin(Math.atan2(z,x)*5+y*1.7);leafVertices[i]=x*lobe;leafVertices[i+2]=z*lobe;}
const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(leafVertices,3));leafGeo.computeVertexNormals();const canopyMat=new T.MeshStandardMaterial({color:'#73804c',roughness:1,side:T.DoubleSide});
const treePositions:Point[]=[localPoint(founder,-10,5),localPoint(founder,8,-9)];
for(let i=0;i<750;i++){const x=(rand()-.5)*395,z=-60+(rand()-.5)*460;if(!within(x,z)||streamDistance(x,z)<4)continue;const near=nearestRoad([x,z]);if(Math.hypot(x-near[0],z-near[1])<7||homes.some(h=>Math.hypot(x-h.x,z-h.z)<Math.max(h.width,h.depth)*.65+5))continue;if(x>-30&&x<100&&z>-160&&z<80&&rand()<.88)continue;treePositions.push([x,z]);}
for(let i=treePositions.length-1;i>=0;i--)if(Math.hypot(treePositions[i][0]-domesticShop.p[0],treePositions[i][1]-domesticShop.p[1])<7)treePositions.splice(i,1);
// Dense valley woods wrap the green and reach the edges of domestic plots.
let woodlandSeed=2201865;const woodlandRandom=()=>{woodlandSeed=(Math.imul(woodlandSeed,1664525)+1013904223)>>>0;return woodlandSeed/4294967296;};
function greenDistance(p:Point){let best=Infinity;for(const polygon of greens)for(let i=0;i<polygon.length;i++){const q=nearestSegment(p,polygon[i],polygon[(i+1)%polygon.length]);best=Math.min(best,Math.hypot(p[0]-q[0],p[1]-q[1]));}return best;}
function clearOfYards(x:number,z:number){return !homes.some(h=>{const dx=x-h.x,dz=z-h.z,c=Math.cos(h.angle),s=Math.sin(h.angle),lx=dx*c-dz*s,lz=dx*s+dz*c;const w=[6.4,7.2,9.2][h.style]*h.sx/2,d=[4.6,4.8,4.5][h.style]*h.sz/2;return Math.abs(lx)<w+2.8&&lz>-d-(h.number===22?12:5)&&lz<d+3;});}
let addedTrees=0;
for(let i=0;i<42000&&addedTrees<1450;i++){
 const x=-205+woodlandRandom()*400,z=-290+woodlandRandom()*460,d=streamDistance(x,z),g=greenDistance([x,z]);
 const valley=d<55||(x<-28&&x>-155&&z>-65&&z<160)||(z>70&&x<150);
 const nearHamlet=homes.some(h=>Math.hypot(x-h.x,z-h.z)<28);
 if(!(valley||g<32||nearHamlet&&woodlandRandom()<.62)||!within(x,z)||d<3.4||Math.hypot(x-domesticShop.p[0],z-domesticShop.p[1])<5.2||Math.hypot(x-chainshopPosition[0],z-chainshopPosition[1])<10)continue;
 const road=nearestRoad([x,z]);if(Math.hypot(x-road[0],z-road[1])<4.2||!clearOfYards(x,z))continue;
 if(paths.some(line=>line.some((p,i)=>{if(!i)return false;const q=nearestSegment([x,z],line[i-1],p);return Math.hypot(x-q[0],z-q[1])<2.4;})))continue;
 if(treePositions.some(p=>Math.hypot(x-p[0],z-p[1])<3.5))continue;
 treePositions.push([x,z]);addedTrees++;
}
// Keep the fixed brook viewpoint in a small natural clearing.
const brookLook=brooks[0].reduce((best,p)=>Math.hypot(p[0]+73,p[1]-70)<Math.hypot(best[0]+73,best[1]-70)?p:best,brooks[0][0]);
const brookEye:Point=[brookLook[0]+9,brookLook[1]+13];
for(let i=treePositions.length-1;i>=0;i--){const p=treePositions[i],q=nearestSegment(p,brookLook,brookEye);if(Math.hypot(p[0]-q[0],p[1]-q[1])<5.5)treePositions.splice(i,1);}
mount.dataset.woodlandTrees=String(addedTrees);mount.dataset.totalTrees=String(treePositions.length);
const species=treePositions.map((_,i)=>i>1&&i%10===3?1:i>1&&i%10===7?2:0);
const crownMeshes=[leafGeo,coniferGeometry(true),coniferGeometry(false)].map((g,k)=>{const mesh=new T.InstancedMesh(g,k?new T.MeshStandardMaterial({color:k===1?'#53684b':'#405b46',roughness:1,side:T.DoubleSide}):canopyMat,species.filter(s=>s===k).length);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;});
const trunkParts:T.BufferGeometry[]=[];
function trunkPart(a:T.Vector3,b:T.Vector3,r:number){const d=b.clone().sub(a),g=new T.CylinderGeometry(r*.55,r,d.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());trunkParts.push(g);}
trunkPart(new T.Vector3(),new T.Vector3(.12,5.2,0),.19);for(let i=0;i<4;i++){const a=i*Math.PI/2;trunkPart(new T.Vector3(0,2.2,0),new T.Vector3(Math.cos(a)*1.8,4.4,Math.sin(a)*1.8),.08);}
const trunkGeometry=mergeGeometries(trunkParts);trunkParts.forEach(g=>g.dispose());const treeTrunks=new T.InstancedMesh(trunkGeometry,timber,treePositions.length);treeTrunks.castShadow=treeTrunks.receiveShadow=true;scene.add(treeTrunks);
const crownRecords:{trunk:number;kind:number;slot:number;matrix:T.Matrix4;center:T.Vector3;radius:number;hidden:boolean}[]=[];
const crownIndex=[0,0,0];mount.dataset.treeSpecies=JSON.stringify({broadleaf:species.filter(s=>s===0).length,pine:species.filter(s=>s===1).length,fir:species.filter(s=>s===2).length});
treePositions.forEach((p,i)=>{
 const wooded=streamDistance(...p)<55||greenDistance(p)<32;
 const scale=wooded?.95+woodlandRandom()*.85:.7+woodlandRandom()*.8;
 dummy.position.set(p[0],ground(...p),p[1]);dummy.rotation.set(0,woodlandRandom()*Math.PI*2,0);dummy.scale.set(scale*(.94+woodlandRandom()*.22),scale,scale);dummy.updateMatrix();const kind=species[i],treeLeaves=crownMeshes[kind],slot=crownIndex[kind]++;treeLeaves.setMatrixAt(slot,dummy.matrix);treeTrunks.setMatrixAt(i,dummy.matrix);crownRecords.push({trunk:i,kind,slot,matrix:dummy.matrix.clone(),center:new T.Vector3(p[0],ground(...p)+4.6*scale,p[1]),radius:3.3*scale,hidden:false});treeLeaves.setColorAt(slot,new T.Color().setHSL(.19+woodlandRandom()*.025,.20+woodlandRandom()*.10,.30+woodlandRandom()*.13));
 // Muted leaf litter beneath the canopy makes the woods read as connected ground.
 const q=pixel(p),radius=2.6*scale/460*4096,g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],radius);g.addColorStop(0,'#454b2d45');g.addColorStop(1,'#454b2d00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],radius,0,Math.PI*2);ctx.fill();
});groundTexture.needsUpdate=true;
// Sparse meadow grass, denser on the margins; no blades through lanes or buildings.
const grassVertices:number[]=[];
for(let blade=0;blade<7;blade++){const a=blade*2.4,x=Math.cos(a)*.09,z=Math.sin(a)*.09,h=.15+(blade%3)*.055,w=.013;grassVertices.push(x-w,0,z,x+w,0,z,x+.025,h*.6,z+.015,x-w,0,z,x+.025,h*.6,z+.015,x+.045,h,z+.025);}
const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(grassVertices,3));grassGeo.computeVertexNormals();
const grassPoints:{p:Point;height:number;dry:boolean}[]=[];
// Discontinuous wall weeds: small tufts in sheltered corners, not a tidy border.
for(const h of homes.filter(h=>h.number!==chainshopReplacesHouse)){const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;
 for(let i=0;i<90;i++){const x=(grassRandom()-.5)*(w+1.5),z=(i%2?1:-1)*(d/2+.2+grassRandom()*.8),p=localPoint(h,x,z);if(Math.abs(x)<1.2&&z>0||grassPatch(...p)<.48)continue;grassPoints.push({p,height:.45+grassRandom()*.85,dry:i%3===0});}
}
// Meadow colonies grow taller away from the paths, separated by worn bare gaps.
for(let i=0;i<78000;i++){
 const x=(grassRandom()-.5)*410,z=-60+(grassRandom()-.5)*470,patch=grassPatch(x,z);
 if(!within(x,z)||streamDistance(x,z)<2.7||patch<.48||grassRandom()>patch)continue;
 const r=nearestRoad([x,z]),roadDistance=Math.hypot(x-r[0],z-r[1]);
 if(roadDistance<3.4||homes.some(h=>Math.hypot(x-h.x,z-h.z)<Math.max(h.width,h.depth)*.58+2))continue;
 let pathDistance=Infinity;for(const line of paths)for(let j=1;j<line.length;j++){const q=nearestSegment([x,z],line[j-1],line[j]);pathDistance=Math.min(pathDistance,Math.hypot(x-q[0],z-q[1]));}
 if(pathDistance<1.2)continue;
 const away=Math.min(1,Math.min(roadDistance-3.4,pathDistance-1.2)/6),height=.7+away*(1.3+grassRandom()*1.5);
 for(let j=0;j<3;j++)grassPoints.push({p:[x+(grassRandom()-.5)*.45,z+(grassRandom()-.5)*.45],height:height*(.65+grassRandom()*.5),dry:patch<.65||j===0});
}
const meadow=new T.InstancedMesh(grassGeo,new T.MeshStandardMaterial({color:'#a2a27c',roughness:1,side:T.DoubleSide}),grassPoints.length);
grassPoints.forEach(({p,height,dry},i)=>{dummy.position.set(p[0],ground(...p)+.01,p[1]);dummy.rotation.set(0,grassRandom()*6.28,0);const width=.7+grassRandom()*.85;dummy.scale.set(width,height,width);dummy.updateMatrix();meadow.setMatrixAt(i,dummy.matrix);meadow.setColorAt(i,new T.Color(dry?'#8b7a4b':'#596840').multiplyScalar(.8+grassRandom()*.4));});meadow.receiveShadow=true;scene.add(meadow);mount.dataset.grassTufts=String(grassPoints.length);
for(const [m,geos]of meshes){const g=mergeGeometries(geos);if(g){const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);}for(const g of geos)g.dispose();}meshes.clear();
// The existing forge is reused as architecture, without its standalone diorama base.
$('load-label').textContent='Lighting the chain shop…';const forge=await loader.loadAsync('/forge/mushroom-green-forge.glb');const forgeRoot=new T.Group();const forgePos:Point=chainshopPosition;forgeRoot.position.set(forgePos[0],ground(...forgePos),forgePos[1]);forgeRoot.rotation.y=1.03;
const buildingNames=/^(Masonry|Brickwork|Interior|Shutters|Wood_grain|Shutter_braces|Ironmongery|Window|Door|Threshold|Roof|Ridge|Gutters|Chimney|Flue|Lead|Hearth|Cinders|Hood|Anvil|Hammer|Finished_chain|Stock_iron|Quench|Tub|Coal_heap|Timber_stock|Bench|Tongs)/;
forge.scene.updateMatrixWorld(true);forge.scene.traverse(o=>{if(o instanceof T.Mesh&&buildingNames.test(o.name)){const isWorkingHammer=/^Hammer/.test(o.name);const mesh=new T.Mesh(isWorkingHammer?centralWorkstation(o.geometry,o.matrixWorld,false):o.geometry,o.material);mesh.name=o.name;if(/^Cinders/.test(o.name)){mesh.material=(Array.isArray(o.material)?o.material[0]:o.material).clone();const cm=mesh.material as T.MeshStandardMaterial;if(cm.emissiveIntensity>0){cm.emissive.set('#d54e14');cm.emissiveIntensity=.65;}}if(!isWorkingHammer)mesh.applyMatrix4(o.matrixWorld);mesh.castShadow=mesh.receiveShadow=true;forgeRoot.add(mesh);}});scene.add(forgeRoot);const forgePick=new T.Mesh(new T.BoxGeometry(9.7,5.7,5.1),new T.MeshBasicMaterial({visible:false}));forgePick.position.y=2.7;forgePick.userData.forge=true;forgeRoot.add(forgePick);pickTargets.push(forgePick);
const worker=addWorkingChainmaker(forgeRoot,(await loader.loadAsync('/chainmaker/chainmaker.glb')).scene);
mount.dataset.chainmakers='1';
// A smaller family workshop at Henry's roadside gable. The location is an
// oral-history interpretation; this remains separate from the surviving forge.
const weaverShop=new T.Group();weaverShop.position.set(domesticShop.p[0],ground(...domesticShop.p),domesticShop.p[1]);weaverShop.rotation.y=domesticShop.angle;weaverShop.scale.set(.55,.72,.70);
forge.scene.traverse(o=>{if(o instanceof T.Mesh&&buildingNames.test(o.name)&&! /^(Chimney|Flue|Lead)/.test(o.name)){let geometry=o.geometry;
// Keep one full-sized work station in the domestic shop, with a clear central aisle.
if(/^(Hearth|Cinders|Hood|Anvil|Hammer)/.test(o.name)){geometry=centralWorkstation(o.geometry,o.matrixWorld);const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;if(/^Cinders/.test(o.name)){const m=(Array.isArray(o.material)?o.material[0]:o.material).clone() as T.MeshStandardMaterial;m.emissive.set('#d54e14');m.emissiveIntensity=.65;mesh.material=m;}mesh.castShadow=mesh.receiveShadow=true;weaverShop.add(mesh);return;}
const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;mesh.applyMatrix4(o.matrixWorld);mesh.castShadow=mesh.receiveShadow=true;weaverShop.add(mesh);}});
const beforeStack=weaverShop.children.length;openStack(weaverShop,0,4.18,1.25,.66,1.65,.62,distantBrick);weaverShop.children.slice(beforeStack).forEach(o=>o.name='Chimney_domestic');
const smallPick=new T.Mesh(new T.BoxGeometry(9.4,5,5),new T.MeshBasicMaterial({visible:false}));smallPick.position.y=2.5;smallPick.userData.home=founder;weaverShop.add(smallPick);pickTargets.push(smallPick);scene.add(weaverShop);mount.dataset.domesticChainshops='1';
const shopGlow=new T.PointLight('#ffab57',5,4,2);shopGlow.position.copy(weaverShop.localToWorld(new T.Vector3(4.3,1.2,0)));scene.add(shopGlow);
const showcase=addShowcase(scene);
let landscapeSeed=9321865;const landscapeRandom=()=>{landscapeSeed=(Math.imul(landscapeSeed,1664525)+1013904223)>>>0;return landscapeSeed/4294967296;};
const landscape=addLandscape(scene,homes.filter(h=>h.number!==chainshopReplacesHouse),landscapeRandom,life.placements.map(a=>a.p));mount.dataset.shrubs=String(landscape.counts.shrubs);mount.dataset.forgePosition=forgePos.join(',');
// A static local environment supplies reflected sky and foliage; flow normals animate it.
const capture=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});const reflectionCamera=new T.CubeCamera(.1,600,capture);reflectionCamera.position.set(-75,ground(-75,55)+3,55);[...landscape.waterMeshes,...showcase.puddles].forEach(o=>o.visible=false);scene.updateMatrixWorld(true);reflectionCamera.update(renderer,scene);[...landscape.waterMeshes,...showcase.puddles].forEach(o=>o.visible=true);const pmrem=new T.PMREMGenerator(renderer);const reflection=pmrem.fromCubemap(capture.texture);landscape.waterMaterial.envMap=reflection.texture;landscape.waterMaterial.envMapIntensity=.3;showcase.wet.envMap=reflection.texture;showcase.wet.envMapIntensity=.35;for(const m of windowMaterials){m.envMap=reflection.texture;m.envMapIntensity=.7;m.roughness=.16;m.needsUpdate=true;}capture.dispose();pmrem.dispose();
// Map overlay: exact source footprints, boundary, mapped routes, and household numbers.
const overlay=new T.Group();overlay.visible=false;scene.add(overlay);function mapLine(points:Point[],color:string,closed=false){const ps=closed?[...points,points[0]]:points;const g=new T.BufferGeometry().setFromPoints(ps.map(p=>new T.Vector3(p[0],ground(...p)+.25,p[1])));const line=new T.Line(g,new T.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.85}));line.renderOrder=5;overlay.add(line);}
mapLine(boundary,'#f0d492',true);for(const r of roads)mapLine(r,'#f2deae');for(const g of greens)mapLine(g,'#c5e2a0',true);
const labelEls=homes.map(h=>{mapLine(h.polygon.map(project),(families[h.founder?'Founder':h.family as keyof typeof families]||families.Other).border,true);const el=document.createElement('span');el.className='map-label';el.textContent=String(h.number);el.hidden=true;$('map-labels').append(el);return el;});
const selection=new T.Mesh(new T.RingGeometry(5.8,6.0,64),new T.MeshBasicMaterial({color:'#dfbc6f',side:T.DoubleSide,transparent:true,opacity:.8,depthTest:false}));selection.rotation.x=-Math.PI/2;selection.visible=false;selection.renderOrder=6;scene.add(selection);
// Soft smoke lies outside the AO normal pass.
const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=96;const sc=smokeCanvas.getContext('2d')!;for(let i=0;i<14;i++){const x=48+Math.sin(i*12.7)*20,y=48+Math.cos(i*8.3)*19;const grad=sc.createRadialGradient(x,y,0,x,y,24);grad.addColorStop(0,'rgba(115,114,104,.22)');grad.addColorStop(1,'rgba(140,138,125,0)');sc.fillStyle=grad;sc.fillRect(0,0,96,96);}const smokeTexture=new T.CanvasTexture(smokeCanvas);const chimneys=homes.filter(h=>h.number!==chainshopReplacesHouse&&(h.number%3===0||h.number===22)).map(h=>{const p=localPoint(h,(-[6.4,7.2,9.2][h.style]/2+.55)*h.sx,0);return new T.Vector3(p[0],h.height+[2.65,4.45,2.85][h.style]+3.35,p[1]);});for(const x of [-3,0,3])chimneys.push(forgeRoot.localToWorld(new T.Vector3(x,5.2,1.3)));chimneys.push(weaverShop.localToWorld(new T.Vector3(0,5.2,1.25)));const smoke=chimneys.flatMap((p,k)=>Array.from({length:8},(_,i)=>{const sprite=new T.Sprite(new T.SpriteMaterial({map:smokeTexture,transparent:true,depthWrite:false,opacity:.3,color:'#aca996'}));sprite.layers.set(1);scene.add(sprite);return {sprite,p,phase:i/8*8+k*.3};}));
let savePicture=false;
$('save-view').onclick=()=>{savePicture=true;};$('close-picture').onclick=()=>{$<HTMLDialogElement>('picture-preview').close();};
const stillFrame=new URLSearchParams(location.search).has('still');
let paused=reduced||stillFrame,dusk=false,mapOpen=false,selected:Home|null=null,time=stillFrame?4:0,lightAmount=0;let tween:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3;t:number}|null=null;
const center=new T.Vector3(5,ground(5,-50),-50);
function move(pos:T.Vector3,target:T.Vector3,immediate=false){if(immediate||reduced){camera.position.copy(pos);controls.target.copy(target);controls.update();tween=null;}else tween={from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),target:target.clone(),t:0};}
function zoom(factor:number){tween=null;const offset=camera.position.clone().sub(controls.target);const distance=T.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset.setLength(distance));controls.update();}
function cleanView(on:boolean){$('village-app').dataset.clean=String(on);$('restore-interface').hidden=!on;}
$('clean-view').onclick=()=>cleanView(true);$('restore-interface').onclick=()=>cleanView(false);document.addEventListener('keydown',e=>{if((e.key==='h'||e.key==='H')&&!(e.target instanceof HTMLSelectElement)){cleanView($('village-app').dataset.clean!=='true');}if(e.key==='Escape')cleanView(false);});
$('zoom-in').onclick=()=>zoom(.75);$('zoom-out').onclick=()=>zoom(1/.75);
function visit(h:Home,immediate=false){camera.fov=42;camera.updateProjectionMatrix();const target=new T.Vector3(h.x,h.height+1.5,h.z);const p=localPoint(h,h.number===22?-22:-16,21);const pos=new T.Vector3(p[0],h.height+13,p[1]);if(camera.aspect<.85)pos.sub(target).multiplyScalar(.85/camera.aspect).add(target);move(pos,target,immediate);$('place-label').textContent=h.number===22?'Henry Weaver’s home & small chainshop · No. 22':h.household_name+' · No. '+h.number;}
function view(name:string,immediate=false){rememberPlace({view:name,house:null,inside:null,floor:null,worker:null});if(typeof inspection!=='undefined')inspection.close(false);controls.minDistance=name==='yard'?3:9;camera.fov=name==='washing'?62:name==='approach'?34:name==='lane'?48:name==='yard'?46:38;camera.updateProjectionMatrix();$('village-app').dataset.view=name;document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));if(name==='village'){let pos=new T.Vector3(5,655,45);if(camera.aspect<1)pos.sub(center).multiplyScalar(1/camera.aspect*1.16).add(center);move(pos,center,immediate);$('place-label').textContent='Mushroom Green, Black Country';}else if(name==='approach'){const target=new T.Vector3(forgePos[0]+1.2,ground(...forgePos)+1.6,forgePos[1]-1.8);const offset=new T.Vector3(17,2.9,-11).multiplyScalar(Math.max(1,.8/camera.aspect));move(target.clone().add(offset),target,immediate);$('place-label').textContent='The chainshop approach · after the rain';}else if(name==='washing'){const p=localPoint(founder,-1.5,-6.6),q=localPoint(founder,-1.5,-10.5);const target=new T.Vector3(p[0],ground(...p)+1.4,p[1]);move(new T.Vector3(q[0],ground(...p)+3.2,q[1]),target,immediate);$('place-label').textContent='Wash day · Henry Weaver’s yard';}else if(name==='yard'){const y=ground(-5,7);move(new T.Vector3(-1.5,y+3.2,11),new T.Vector3(-5,y+.5,6.9),immediate);$('place-label').textContent='A working yard · hens and household tasks';}else if(name==='henry')visit(founder,immediate);else if(name==='brook'){$('place-label').textContent='Black Brook · water and woodland';const p=brooks[0].reduce((best,p)=>Math.hypot(p[0]+73,p[1]-70)<Math.hypot(best[0]+73,best[1]-70)?p:best,brooks[0][0]);const target=new T.Vector3(p[0],ground(...p),p[1]);const offset=new T.Vector3(9,5.2,13).multiplyScalar(Math.max(1,.8/camera.aspect));move(target.clone().add(offset),target,immediate);}else if(name==='forge'){$('place-label').textContent='Mushroom Green chainshop';const target=new T.Vector3(forgePos[0],ground(...forgePos)+1.5,forgePos[1]);move(target.clone().add(new T.Vector3(16,3.6,-4).multiplyScalar(Math.max(1,.8/camera.aspect))),target,immediate);}else {$('place-label').textContent='Along Mushroom Green lane';move(new T.Vector3(-59,ground(-59,-59)+4.5,-59),new T.Vector3(-27,ground(-27,-70)+1.3,-70),immediate);}}
const inspection=createInspection(scene,renderer,camera,controls,forgeRoot,weaverShop);
$('enter-house').onclick=()=>{tween=null;inspection.enter(selected);};
$('visit-yard').onclick=()=>{$('house-panel').hidden=true;selection.visible=false;view('yard');};
$('enter-chainshop').onclick=()=>{tween=null;inspection.enter(founder,'small');};
const reader=householdReader(homes,h=>select(h,true));
function select(h:Home,go=false){inspection.close();rememberPlace({house:h.number,inside:null,floor:null});selected=h;$('house-panel').hidden=false;$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');$('house-number').textContent='HOUSEHOLD / '+String(h.number).padStart(2,'0');reader.show(h);$('house-panel').focus({preventScroll:true});$('enter-house').onclick=()=>{tween=null;inspection.enter(h);};selection.position.set(h.x,h.height+.25,h.z);selection.visible=true;$<HTMLSelectElement>('house-select').value=String(h.number);if(go){$('village-app').dataset.view='house';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));visit(h);}}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{$('house-panel').hidden=true;selection.visible=false;view(b.dataset.view!);}));$('house-select').addEventListener('change',e=>{const h=homes.find(h=>h.number===Number((e.target as HTMLSelectElement).value));if(h){$('visit-house').onclick=()=>{if(selected)visit(selected);};select(h,true);};});$('close-house').onclick=()=>{$('house-panel').hidden=true;selection.visible=false;$('house-select').focus();};$('visit-house').onclick=()=>{if(selected)visit(selected);};$('map-toggle').onclick=()=>{mapOpen=!mapOpen;overlay.visible=mapOpen;$('map-toggle').setAttribute('aria-pressed',String(mapOpen));};$('light').onclick=()=>{dusk=!dusk;$('light').textContent=dusk?'Dusk':'Daylight';$('light').setAttribute('aria-pressed',String(dusk));$('village-app').dataset.light=dusk?'dusk':'day';};function pauseUI(){$('motion').textContent=paused?'Play':'Pause';$('motion').setAttribute('aria-pressed',String(paused));$('interior-motion').textContent=paused?'Play':'Pause';$('interior-motion').setAttribute('aria-pressed',String(paused));}pauseUI();$('motion').onclick=$('interior-motion').onclick=()=>{paused=!paused;pauseUI();};$('notes').onclick=()=>{const open=$('notes-panel').hidden;$('notes-panel').hidden=!open;$('house-panel').hidden=true;$('notes').setAttribute('aria-expanded',String(open));};$('close-notes').onclick=()=>{$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');};
const ray=new T.Raycaster();let down:Point=[0,0];renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(inspection.active)return;if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(pickTargets)[0];if(hit){if(hit.object.userData.forge){selection.visible=false;$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');$('house-panel').hidden=false;$('house-number').textContent='MUSHROOM GREEN / CHAINSHOP';$('house-name').textContent='The chain workshop';$('enter-house').onclick=()=>{tween=null;inspection.enter(null,'main');};$('house-description').textContent='A place of fire, iron and hand work. This reconstruction draws on photographs of the surviving Mushroom Green chainshop. Its layout and 1865 appearance are interpreted.';reader.forge();selected=null;$('visit-house').onclick=()=>view('forge');}else{ $('visit-house').onclick=()=>{if(selected)visit(selected);};select(hit.object.userData.home);}}});controls.addEventListener('start',()=>{tween=null;});renderer.domElement.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();view('village');}if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.75);}if(e.key==='-'){e.preventDefault();zoom(1/.75);}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();camera.position.sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?-.12:.12).add(controls.target);}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){inspection.close();renderer.domElement.focus();$('house-panel').hidden=true;$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');selection.visible=false;}});
new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);}).observe(mount);
addEventListener('resize',()=>{const w=mount.clientWidth,h=mount.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);});
const initialPlace=new URLSearchParams(location.search),requestedView=initialPlace.get('view');view(requestedView&&['village','approach','forge','henry','brook','lane','washing','yard'].includes(requestedView)?requestedView:'village',true);document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select').forEach(el=>el.disabled=false);$('loading').hidden=true;$('village-status').textContent='Village loaded. All 59 households are available.';cleanView(new URLSearchParams(location.search).has('clean'));const initialHome=homes.find(h=>h.number===Number(initialPlace.get('house')));if(initialHome){select(initialHome);visit(initialHome,true);if(initialPlace.has('inside')){inspection.enter(initialHome,initialPlace.get('inside')==='small'&&initialHome.number===22?'small':initialPlace.get('inside')==='main'||initialHome.number===5?'main':null);const floor=Number(initialPlace.get('floor'));if(floor===1)inspection.setFloor(floor);if(initialPlace.get('worker')==='1')inspection.watchWorker();}}document.documentElement.dataset.villageReady='true';mount.dataset.households=String(homes.length);mount.dataset.renderedCottages=String(houseRoots.filter(o=>o.visible).length);mount.dataset.forgeCount='1';mount.dataset.cottageTypes='3';const lastShadowTarget=new T.Vector3(Infinity,0,0);let shadowSpan=0;let last=performance.now(),frame=0,total=0,lodTimer=1;
function animate(now:number){const real=(now-last)/1000,dt=Math.min(real,.05);last=now;if(!document.hidden){if(!paused)time+=dt;landscape.update(time);laundry.update(time);life.update(time);inspection.update(time);const workerVisible=forgeRoot.visible&&camera.position.distanceTo(forgeRoot.position)<80;if(worker.root.visible!==workerVisible)renderer.shadowMap.needsUpdate=true;worker.root.visible=workerVisible;if(workerVisible){worker.update(time);if(!paused)renderer.shadowMap.needsUpdate=true;}if(tween){tween.t+=dt;const r=Math.min(1,tween.t/1.6),t=r*r*(3-2*r);camera.position.lerpVectors(tween.from,tween.to,t);controls.target.lerpVectors(tween.fromTarget,tween.target,t);if(r===1)tween=null;}controls.update();if(within(camera.position.x,camera.position.z))camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+1.2);lodTimer+=dt;if(lodTimer>.35){lodTimer=0;let visible=0,shadowDirty=false;const ranked=homes.map((h,i)=>({i,d:Math.hypot(h.x-controls.target.x,h.z-controls.target.z)})).sort((a,b)=>a.d-b.d);const near=new Set(ranked.filter(a=>a.d<85&&camera.position.distanceTo(controls.target)<160).slice(0,18).map(a=>a.i));homes.forEach((h,i)=>{const on=near.has(i);if(highRoots[i].visible!==on)shadowDirty=true;highRoots[i].visible=on;lowRoots[i].visible=!on;if(on)visible++;});mount.dataset.detailedHomes=String(visible);
const target=controls.target;const distance=camera.position.distanceTo(target);
// Remove only foreground crowns from close house views; restore them when the camera moves.
const sight=new T.Line3(camera.position,target),closest=new T.Vector3(),zero=new T.Matrix4().makeScale(0,0,0);
for(const tree of crownRecords){const t=sight.closestPointToPointParameter(tree.center,true);sight.at(t,closest);const hide=!inspection.active&&distance<80&&t>.03&&t<.94&&tree.center.distanceTo(closest)<tree.radius;
if(hide!==tree.hidden){tree.hidden=hide;crownMeshes[tree.kind].setMatrixAt(tree.slot,hide?zero:tree.matrix);crownMeshes[tree.kind].instanceMatrix.needsUpdate=true;treeTrunks.setMatrixAt(tree.trunk,hide?zero:tree.matrix);treeTrunks.instanceMatrix.needsUpdate=true;shadowDirty=true;}}
(scene.fog as T.Fog).near=Math.max(40,distance+15);(scene.fog as T.Fog).far=Math.max(145,distance+145);sun.target.position.set(target.x,0,target.z);sun.position.set(target.x+20,65,target.z+100);const span=camera.position.distanceTo(target)>140?200:38;Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();if(shadowDirty||target.distanceToSquared(lastShadowTarget)>.01||shadowSpan!==span){renderer.shadowMap.needsUpdate=true;lastShadowTarget.copy(target);shadowSpan=span;}}
lightAmount=T.MathUtils.damp(lightAmount,dusk?1:0,3,dt);landscape.waterMaterial.envMapIntensity=.3*(1-.7*lightAmount);sun.color.set('#ffda9c');sun.intensity=T.MathUtils.lerp(3.5,.35,lightAmount);hemi.intensity=T.MathUtils.lerp(1.25,.75,lightAmount);showcase.glow.intensity=18+Math.sin(time*8)*.7;for(const m of windowMaterials){m.emissive.set('#a16635');m.emissiveIntensity=.10+lightAmount*.65;}(scene.background as T.Color).lerpColors(new T.Color('#c6c5b7'),new T.Color('#58656b'),lightAmount);(scene.fog as T.Fog).color.copy(scene.background as T.Color);
for(const {sprite,p,phase}of smoke){const age=(time*.45+phase)%8;const size=.22+age*.22+age*age*.025;const curl=Math.sin(age*1.6+phase)*.13*age;sprite.position.copy(p).add(new T.Vector3(age*.24+age*age*.024+curl,age*.48,-age*.13+Math.cos(age+phase)*age*.055));sprite.scale.set(size*(1+.12*Math.sin(age+phase)),size*.85,1);sprite.material.opacity=Math.min(1,age*3)*Math.pow(1-age/8,1.5)*.64;sprite.material.rotation=phase+age*.12;}
for(let i=0;i<homes.length;i++){const el=labelEls[i];el.hidden=!mapOpen||inspection.active;if(mapOpen&&!inspection.active){const h=homes[i],p=new T.Vector3(h.x,h.height+7,h.z).project(camera);el.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;el.style.left=(p.x*.5+.5)*mount.clientWidth+'px';el.style.top=(-p.y*.5+.5)*mount.clientHeight+'px';}}
ao.enabled=!inspection.workshopActive&&camera.position.distanceTo(controls.target)<130;aoCamera.copy(camera);aoCamera.layers.set(0);if(!inspection.active)landscape.reflect(renderer,camera,controls.target);composer.render();renderer.shadowMap.autoUpdate=false;
if(savePicture){
  savePicture=false;const aspect=camera.aspect,pixelRatio=renderer.getPixelRatio();
  camera.aspect=16/9;camera.updateProjectionMatrix();renderer.setPixelRatio(1);composer.setPixelRatio(1);renderer.setSize(1920,1080,false);composer.setSize(1920,1080);landscape.reflect(renderer,camera,controls.target,true);composer.render();
  renderer.domElement.toBlob(blob=>{if(!blob){$('village-status').textContent='Could not create the picture. Try again.';return;}const image=$<HTMLImageElement>('picture-image');if(image.src.startsWith('blob:'))URL.revokeObjectURL(image.src);const picture=URL.createObjectURL(blob);image.src=picture;const download=$<HTMLAnchorElement>('picture-download');download.href=picture;download.download='mushroom-green-'+($('village-app').dataset.view||'village')+'.png';$<HTMLDialogElement>('picture-preview').showModal();$('village-status').textContent='Picture ready to download.';},'image/png');
  camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setPixelRatio(pixelRatio);composer.setPixelRatio(pixelRatio);renderer.setSize(mount.clientWidth,mount.clientHeight);composer.setSize(mount.clientWidth,mount.clientHeight);
}
frame++;total+=real;if(frame%120===0){mount.dataset.fps=String(Math.round(frame/total));mount.dataset.drawCalls=String(renderer.info.render.calls);}}
requestAnimationFrame(animate);}requestAnimationFrame(animate);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('load-label').textContent='Graphics paused. Reload to return to the village.';});
}
start().catch(error=>{console.error('Village could not load',error);$('loading').hidden=false;$('load-label').textContent='The village could not load. Reload to try again.';$('village-status').textContent='Village loading failed.';});
