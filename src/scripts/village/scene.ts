import {setHenryStatueEnvironment} from './henry-statue';
import {createHouseLabels} from './house-labels';
import {planBackyardWorkshops,levelBackyardWorkshops,addBackyardWorkshops} from './backyard-workshops';
import {planYardPlots,paintYardPlots,addYardPlots} from './yard-plots';
import {paintHistoricLandscape,addHistoricLandscape} from './historic-landscape';
import {siteIssue} from './site-reservations';
import {industryClear} from './historic-plan';
import {createCompass} from './compass';
import {addRoadCrossing,roadCrossing} from './road-crossing';
import {roomDimensions,planInterior,seedInteriorPlan} from './interior-plans';
import {createInteriors} from './interiors';
import {ageBuilding} from './building-age';
import {paintWorkingYards} from './working-yards';
import {addWorkingProps} from './prop-placement';
import {addForgeCart} from './cart';
import {panDestination,zoomDestination,turnDestination,containRoom} from './navigation';
import {inhabitHouses} from './inhabited-houses';
import {mergeByMaterial} from './merge-meshes';
import {createFire,fireTime,softSmokeTexture} from './fire';
import {installLightPool,updateLightPool} from './light-pool';
import {addSpringFlowers} from './spring-flowers';
import {addFlyAgarics} from './fly-agaric';
import {createSoundscape} from './soundscape';
import {chunkInstances} from './instance-chunks';
import {releaseGeometryAfterUpload,releaseTextureImages} from './release-cpu';
import {leanShadowMap} from './shadow-target';
import {createWeather} from './weather';
import {LINK} from '../chainmaker/rig';
import {refineObject,refineSurface,weatherArchitecture} from '../rendering/surfaces';
import {addWorkingChainmaker} from '../chainmaker/worker';
import {centralWorkstation,clearChainmakerStance} from './workshop';
import {wearWorkshop} from './workshop-wear';
import {addWorkshopProps} from './workshop-props';
import {detailArchitecture,textureDetail} from './texture-detail';
import {maintainMaterialTextures,disposeMaterialTextures} from './worked-materials';
import {rememberPlace} from './location';
import {createInspection} from './inspection';
import {addVillageLife} from './village-life';
import {householdReader} from './household-reader';
import {broadleafVariants,coniferVariant,hedgeGeometry,foliageMaterial,FOLIAGE_LAYER} from './foliage';
import {addWoodlandFloor,paintWoodlandLitter} from './woodland-floor';
import {createSky,addFarCountry,type FarData} from './sky';
import {addLaneVerges,paintLaneEdges} from './lane-verges';
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
import {cinematicOutput} from '../rendering/finish';
import { streamWidth,outsideRoads,roundedLine,renderedRoads,brooks,boundary,greens,project,ground,streamSurface,prepareGround,weaverWorkshop,makeHomes,nearestRoad,nearestVillageRoad,nearestSegment,localPoint,streamDistance,chainshopPosition,chainshopReplacesHouse,type Point,type Home,type Household } from './layout';
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const loadDebug=new URLSearchParams(location.search).has('debug'),loadStart=performance.now();
const stage=(name:string)=>{if(loadDebug)console.info(`[load] ${((performance.now()-loadStart)/1000).toFixed(2)}s ${name}`);};
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
const mount=$('village-canvas');// Lite mode for devices that cannot hold the full scene in GPU memory (older iPads): chosen with
// ?lite, or remembered after the full scene once lost its graphics context on this device.
const lite=(()=>{if(new URLSearchParams(location.search).has('lite'))return true;try{return localStorage.getItem('mg-lite')==='1';}catch{return false;}})();
// Touch-only devices (phones, tablets) render at up to 1.25× — dense small screens hide the
// difference and it saves ~30% of the GPU work; desktops keep 1.5×.
const handheld=matchMedia('(pointer:coarse)').matches&&!matchMedia('(any-pointer:fine)').matches;
const basePixelRatio=Math.min(devicePixelRatio,lite?1:handheld?1.25:1.5);
// No canvas MSAA: the scene renders through the composer's own (non-multisampled) targets, so a
// multisampled drawing buffer only cost ~90 MB of GPU memory and a resolve per frame.
const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(basePixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Village. Drag to orbit; scroll to zoom; select a house.');
addEventListener('pagehide',event=>{if(!event.persisted)disposeMaterialTextures();});
const scene=new T.Scene();scene.background=new T.Color('#c4c7b9');scene.fog=new T.Fog('#c4c7b9',850,1700);const sky=createSky(scene);const weather=createWeather(scene);const fogBase={near:850,far:1700};
const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.2,2600);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=1800;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.04;controls.maxTargetRadius=300;controls.cursor.set(0,0,-60);controls.zoomSpeed=.8;
const updateCompass=createCompass($('village-compass'));
const hemi=new T.HemisphereLight('#d6e2ec','#5c5140',2.0);scene.add(hemi);const sun=new T.DirectionalLight('#fff0d4',3.2);sun.position.set(-100,180,95);sun.castShadow=true;sun.shadow.mapSize.set(lite?2048:4096,lite?2048:4096);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:500});sun.shadow.normalBias=.025;sun.shadow.radius=2.3;sun.shadow.bias=-.0004;leanShadowMap(sun);scene.add(sun,sun.target);const fill=new T.DirectionalLight('#c4d4e4',.75);fill.position.set(70,50,-90);scene.add(fill);installLightPool(scene,6);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));camera.layers.enable(1);camera.layers.enable(FOLIAGE_LAYER);const aoCamera=camera.clone();aoCamera.layers.set(0);const ao=new GTAOPass(scene,aoCamera,innerWidth,innerHeight);ao.blendIntensity=.8;
// AO is soft, low-frequency shading: computing it at half resolution and upsampling in the blend
// quarters its cost (as ektogamat's threejs-punk does). ?ao=full keeps it full size for comparison.
if(new URLSearchParams(location.search).get('ao')!=='full'){const full=ao.setSize.bind(ao);ao.setSize=(w:number,h:number)=>full(Math.max(1,Math.ceil(w/2)),Math.max(1,Math.ceil(h/2)));ao.setSize(innerWidth,innerHeight);}
ao.updateGtaoMaterial({radius:.6,distanceExponent:1.6,thickness:1.2,scale:1});composer.addPass(ao);composer.addPass(cinematicOutput());
const farRequest=Promise.all([fetch('/far-country/far-country.json').then(r=>r.json() as Promise<FarData>),new T.TextureLoader().loadAsync('/far-country/ground-1882.webp')]);
stage('before households fetch');const households:Household[]=await fetch('/households.json').then(r=>{if(!r.ok)throw Error('Household data unavailable');return r.json();});const [farData,farGround]=await farRequest;const homes=makeHomes(households);prepareGround(homes);const founder=homes.find(h=>h.number===22)!;const domesticShop=weaverWorkshop(founder);
const within=(x:number,z:number)=>Math.pow(x/210,2)+Math.pow((z+60)/240,2)<.97;
// Paint an original terrain atlas in world coordinates. Roads follow the saved village map and the traced historic exit.
stage('before terrain canvas');const terrainCanvas=document.createElement('canvas');terrainCanvas.width=terrainCanvas.height=4096;const ctx=terrainCanvas.getContext('2d')!;const img=ctx.createImageData(4096,4096);
// rand() inlined with row terms hoisted: byte-identical pixels and final seed, ~8x faster.
{const data=img.data;let s=seed;for(let j=0,k=0;j<4096;j++){const bend=Math.cos(j*.02)*2,row=Math.sin(j*.025)*4;for(let i=0;i<4096;i++,k+=4){s=(Math.imul(s,1664525)+1013904223)>>>0;const n=s/4294967296*13+Math.sin(i*.017+bend)*5+row;data[k]=103+n;data[k+1]=110+n;data[k+2]=70+n*.75;data[k+3]=255;}}seed=s;}ctx.putImageData(img,0,0);
const pixel=(p:Point):Point=>[(p[0]+230)/460*4096,(p[1]+320)/520*4096];
function stroke(points:Point[],width:number,color:string){ctx.beginPath();points.forEach((p,i)=>{const q=pixel(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.strokeStyle=color;ctx.lineWidth=width/460*4096;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
for(const polygon of greens){ctx.beginPath();polygon.forEach((p,i)=>{const q=pixel(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();ctx.fillStyle='#61713b55';ctx.fill();}
// Irregular bare, straw-coloured and damp patches break up the grass base.
let grassSeed=491865;const grassRandom=()=>{grassSeed=(Math.imul(grassSeed,1664525)+1013904223)>>>0;return grassSeed/4294967296;};
const grassPatch=(x:number,z:number)=>.5+.23*Math.sin(x*.19+Math.sin(z*.13)*2)+.17*Math.sin(z*.31-x*.08)+.10*Math.sin(x*.83+z*.49);
for(let i=0;i<2300;i++){const x=(grassRandom()-.5)*420,z=-60+(grassRandom()-.5)*480;if(!within(x,z))continue;const q=pixel([x,z]),r=(1.5+grassRandom()*5)*4096/460,g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],r);g.addColorStop(0,i%3?'#8c795365':'#493e3055');g.addColorStop(1,i%3?'#8c795300':'#493e3000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();}
// The mapped 1881-82 countryside (parcels, hedges, lanes) fades in across the outer band of the model,
// so the modelled ground meets the far country without a visible rim.
{const E=farData.extent,img=farGround.image as CanvasImageSource,band=document.createElement('canvas');band.width=band.height=4096;const b=band.getContext('2d')!;
 const [x0,y0]=pixel([-E,-E]),[x1,y1]=pixel([E,E]);b.drawImage(img,x0,y0,x1-x0,y1-y0);
 b.globalCompositeOperation='destination-in';const c=pixel([0,-60]);b.translate(c[0],c[1]);b.scale(210/460*4096,240/520*4096);
 const fade=b.createRadialGradient(0,0,0,0,0,Math.sqrt(.97));fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(.74,'rgba(0,0,0,0)');fade.addColorStop(.9,'rgba(0,0,0,.55)');fade.addColorStop(1,'rgba(0,0,0,.92)');
 b.fillStyle=fade;b.fillRect(-2,-2,4,4);ctx.drawImage(band,0,0);}
const paths:Point[][]=[];
for(const h of homes.filter(h=>h.number!==chainshopReplacesHouse)){const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;const front=localPoint(h,0,d/2+.3);const road=nearestVillageRoad(front);let points:Point[]=[front,road];
// Bend around intervening homes instead of cutting their footprints.
for(const other of homes){if(other===h)continue;const q=nearestSegment([other.x,other.z],front,road);if(Math.hypot(q[0]-other.x,q[1]-other.z)<Math.max(other.width,other.depth)*.45){points=[front,[other.x-Math.max(other.width,other.depth)*.7,other.z],road];break;}}
paths.push(points);const q=pixel([h.x,h.z]);ctx.save();ctx.translate(...q);ctx.rotate(-h.angle);ctx.fillStyle='#857858';ctx.beginPath();ctx.ellipse(0,0,(w/2+2.2)/460*4096,(d/2+2.8)/520*4096,0,0,Math.PI*2);ctx.fill();ctx.restore();}
const backyardShops=planBackyardWorkshops(homes,paths);
levelBackyardWorkshops(backyardShops);
const yardPlots=planYardPlots(homes,paths,backyardShops);
paintYardPlots(ctx,pixel,yardPlots);
paintHistoricLandscape(ctx,pixel,backyardShops);
paintLanes(ctx,pixel,rand,paths);paintLaneEdges(ctx,pixel,paths);
paintWorkingYards(ctx,pixel,homes);
for(let i=0;i<65000;i++){const x=rand()*4096,y=rand()*4096;ctx.fillStyle=i%2?'#3f42310c':'#e0ce9f0d';ctx.fillRect(x,y,rand()*6+1,rand()*3+1);}
stage('terrain painted');// Lite mode uploads the painted terrain at half size (21 MB instead of 85 MB on the GPU).
const groundTexture=new T.CanvasTexture(lite?(()=>{const half=document.createElement('canvas');half.width=half.height=2048;half.getContext('2d')!.drawImage(terrainCanvas,0,0,2048,2048);return half;})():terrainCanvas);groundTexture.colorSpace=T.SRGBColorSpace;groundTexture.anisotropy=8;
const groundGeo=new T.PlaneGeometry(460,520,460,520);groundGeo.rotateX(-Math.PI/2);groundGeo.translate(0,0,-60);const pos=groundGeo.attributes.position;const index:number[]=[];const source=groundGeo.index!;for(let i=0;i<pos.count;i++)pos.setY(i,ground(pos.getX(i),pos.getZ(i)));for(let i=0;i<source.count;i+=3){const ids=[source.getX(i),source.getX(i+1),source.getX(i+2)];if(ids.every(v=>within(pos.getX(v),pos.getZ(v))))index.push(...ids);}groundGeo.setIndex(index);
const uv=groundGeo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+230)/460,1-(pos.getZ(i)+320)/520);groundGeo.computeVertexNormals();// Tree-cover map (≈1.8 m texels), filled once the trees are placed; the ground shader turns
// grass to leaf litter and soil beneath closed canopy.
const CANOPY=256,canopyData=new Uint8Array(CANOPY*CANOPY),canopyTexture=new T.DataTexture(canopyData,CANOPY,CANOPY,T.RedFormat);canopyTexture.magFilter=canopyTexture.minFilter=T.LinearFilter;
const canopyAt=(x:number,z:number)=>{const i=Math.floor((x+230)/460*CANOPY),j=Math.floor((z+320)/520*CANOPY);return i<0||j<0||i>=CANOPY||j>=CANOPY?0:canopyData[j*CANOPY+i]/255;};
const terrain=new T.Mesh(groundGeo,new T.MeshStandardMaterial({map:groundTexture,color:'#c1c3ab',roughness:1}));weatherGround(terrain.material,canopyTexture);terrain.receiveShadow=true;scene.add(terrain);
addRoadCrossing(scene,groundTexture);
const historic=addHistoricLandscape(scene),smallShops=addBackyardWorkshops(scene,backyardShops),plots=addYardPlots(scene,yardPlots);mount.dataset.gardenGrowth=JSON.stringify({hedgeRuns:plots.hedgeRuns,cabbages:plots.cabbages});
mount.dataset.historicLandscape=JSON.stringify({shops:smallShops.count,plots:plots.plots,boundaries:plots.sections,beds:plots.beds,railMetres:Math.round(historic.railMetres/2),sleepers:historic.sleepers,shafts:historic.shaftCount,pools:historic.pools,draws:historic.draws+smallShops.draws+plots.draws+2,triangles:historic.triangles+smallShops.triangles+plots.triangles});
// A shallow cut edge gives the landscape a continuous, hand-built model base.
const edges=new Map<string,{a:number;b:number;count:number}>();
for(let i=0;i<index.length;i+=3)for(let k=0;k<3;k++){const a=index[i+k],b=index[i+(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});}
const rimPos:number[]=[];for(const {a,b,count}of edges.values())if(count===1){const ax=pos.getX(a),az=pos.getZ(a),ay=pos.getY(a),bx=pos.getX(b),bz=pos.getZ(b),by=pos.getY(b);rimPos.push(ax,ay,az,bx,by,bz,ax,-4,az,bx,by,bz,bx,-4,bz,ax,-4,az);}
const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(rimPos,3));rg.computeVertexNormals();const rimMaterial=material('#514b36');rimMaterial.side=T.DoubleSide;scene.add(new T.Mesh(rg,rimMaterial));
const base=new T.Mesh(new T.PlaneGeometry(2400,2400),material('#bec3b0'));base.rotation.x=-Math.PI/2;base.position.y=-4.1;base.receiveShadow=true;scene.add(base);
// Geometry is shared across cottages. Detailed houses only appear near the camera target.
$('load-label').textContent='Building cottages and working yards…';const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);stage('before cottage kit');const kit=await loader.loadAsync('/village/cottages.glb');const highTemplates:T.Object3D[]=[];for(let i=0;i<3;i++){const group=kit.scene.getObjectByName('cottage_'+i);if(!group)throw Error('Cottage kit missing type '+i);highTemplates.push(group);}
const windowMaterials:T.MeshStandardMaterial[]=[glass];
for(const root of highTemplates)root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(m instanceof T.MeshStandardMaterial){if(m.map)m.map.anisotropy=8;if(m.name.includes('Small dark glass')){m.roughness=.16;m.metalness=.15;m.color.set('#91a6a0');m.transparent=true;m.opacity=.24;m.depthWrite=false;o.castShadow=false;windowMaterials.push(m);}}}});
// One mesh per material in each cottage template (79 → ~24 draws). Door/frame and chimney meshes stay
// separate because individualise() and the limewash treatment select them by name.
const houseCategory=(o:T.Mesh)=>/door|frames/i.test(o.name)?'Door frames':/chimney|flue|stack/i.test(o.name)?'Chimney stack':'';
// Roof finish: half-round clay ridge tiles along the ridge, oversailing courses and clay pots on each stack.
// Heights are measured from the cottage kit (ridge = eaves + 1.65 m, roof tiles peak 0.22 m above it; stack tops per style).
const ridgeClay=refineSurface(new T.MeshStandardMaterial({name:'Ridge clay tiles',color:'#5c3a2c',roughness:.9}),'brick'),potClay=refineSurface(new T.MeshStandardMaterial({name:'Chimney pot clay',color:'#8a5238',roughness:.8}),'ceramic');
highTemplates.forEach((template,style)=>{const w=[6.4,7.2,9.2][style],e=[2.65,4.45,2.85][style],ridge=e+1.65,stack={x:[-2.65,-3.05,-4.05][style],top:[5.99,7.79,6.19][style]};
 const parts:T.Mesh[]=[];// A full round sunk into the ridge leaves the half-round crown showing.
 const tile=new T.CylinderGeometry(.115,.11,.318,12);tile.rotateZ(Math.PI/2);
 const n=Math.round((w+.5)/.33);for(let i=0;i<n;i++){const m=new T.Mesh(tile,ridgeClay);m.position.set(-w/2-.22+(i+.5)*(w+.44)/n,ridge+.25,0);m.rotation.set((Math.sin(i*7.1)*.03),Math.sin(i*5.3)*.02,Math.sin(i*3.3)*.02);m.position.y+=Math.sin(i*2.7)*.008;m.name='Ridge tiles';m.castShadow=m.receiveShadow=true;parts.push(m);}
 // Ridge tiles sit in a continuous lime mortar bed, so the joints read as pointing, not daylight.
 {const bed=new T.Mesh(new T.BoxGeometry(w+.44,.07,.2),new T.MeshStandardMaterial({name:'Ridge bedding mortar',color:'#5d574a',roughness:1}));bed.position.set(0,ridge+.19,0);bed.name='Ridge bedding';parts.push(bed);}
 // Oversailing brick course and two tapered pots.
 const band=new T.Mesh(new T.BoxGeometry(.72,.09,.72),ridgeClay);band.position.set(stack.x,stack.top-.12,0);band.name='Chimney oversail';parts.push(band);
 for(const dz of [-.14,.14]){const pot=new T.Mesh(new T.LatheGeometry([[.1,0],[.105,.04],[.085,.26],[.09,.3],[.075,.31],[.07,.02]].map(([r,y])=>new T.Vector2(r,y)),12),potClay);pot.position.set(stack.x,stack.top-.01,dz);pot.name='Chimney pot';pot.castShadow=true;parts.push(pot);}
 template.add(...parts);});
// Lime mortar reads as recessed joints, not ink lines.
for(const t of highTemplates)t.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&/lime mortar/i.test(o.material.name)&&!o.material.userData.lifted){o.material.userData.lifted=true;(o.material as T.MeshStandardMaterial).color.multiplyScalar(1.35);}});
const templateMerge=highTemplates.map(t=>mergeByMaterial(t,houseCategory));
// Period crown/cylinder glass: faintly wavy panes; transparent face-on, mirror-like at grazing angles.
function glazeWindow(m:T.MeshStandardMaterial){
 if(m.userData.glazed)return;m.userData.glazed=true;
 const previous=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  shader.vertexShader='varying vec3 glazePoint;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nglazePoint=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='varying vec3 glazePoint;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 gp=glazePoint*vec3(9.,13.,9.);
   vec3 glazeRipple=vec3(sin(gp.x*1.7+sin(gp.y*.9)*2.)+sin(gp.z*2.3),0.,sin(gp.y*1.3+gp.x*.7)+sin(gp.z*1.9-gp.y))*.018;
   normal=normalize(normal+mat3(viewMatrix)*glazeRipple);`).replace('#include <opaque_fragment>',`
   float glazeFacing=abs(dot(normal,normalize(vViewPosition)));
   float glazeFresnel=.04+.96*pow(1.-glazeFacing,5.);
   diffuseColor.a=clamp(diffuseColor.a+glazeFresnel*.55,0.,.85);
   // Sky reflection: the local environment capture is taken under trees, so add the open sky explicitly.
   vec3 glazeReflect=reflect(normalize(-vViewPosition),normal);float glazeUp=clamp((inverseTransformDirection(glazeReflect,viewMatrix)).y*.5+.5,0.,1.);
   outgoingLight+=mix(vec3(.30,.31,.29),vec3(.62,.70,.78),glazeUp)*(glazeFresnel*.8+.06);
   #include <opaque_fragment>`);};
 m.customProgramCacheKey=()=>key+'|crown-glass-v1';
}
// Distant buildings retain brick courses and tile joints instead of flat colour blocks.
function surface(kind:'brick'|'roof'|'lime'){
const c=document.createElement('canvas');c.width=c.height=512;const p=c.getContext('2d')!;
p.fillStyle=kind==='brick'?'#655b46':kind==='roof'?'#36382d':'#9b957d';p.fillRect(0,0,512,512);
if(kind!=='lime')for(let row=0;row<32;row++)for(let col=-1;col<17;col++){const x=col*32+(row%2)*16,y=row*16;const v=rand()*20;
p.fillStyle=kind==='brick'?`rgb(${102+v},${69+v*.7},${47+v*.55})`:`rgb(${61+v},${54+v*.8},${42+v*.6})`;p.fillRect(x+1,y+1,30,14);p.fillStyle='#ffffff0e';p.fillRect(x+1,y+1,30,1);}
for(let i=0;i<16000;i++){p.fillStyle=i%2?'#191d1819':'#e6dcc013';p.fillRect(rand()*512,rand()*512,rand()*3+1,rand()*2+1);}
const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return new T.MeshStandardMaterial({map:t,roughness:1});}
const distantBrick=surface('brick'),distantRoof=surface('roof'),distantLime=surface('lime');
// Double-sided so the open gable triangles can share the wall material and merge into one draw.
distantBrick.side=distantLime.side=T.DoubleSide;distantBrick.name='Wall brick';distantRoof.name='Roof tiles';distantLime.name='Wall limewash';
function lowHouse(style:number){const root=new T.Group(),w=[6.4,7.2,9.2][style],d=[4.6,4.8,4.5][style],e=[2.65,4.45,2.85][style],r=e+1.65;function add(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);}
add(new T.BoxGeometry(w,e,d),style===2?distantLime:distantBrick,0,e/2,0);const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute([-w/2-.2,e,d/2+.3,w/2+.2,e,d/2+.3,w/2+.2,r,0,-w/2-.2,e,d/2+.3,w/2+.2,r,0,-w/2-.2,r,0,-w/2-.2,r,0,w/2+.2,r,0,w/2+.2,e,-d/2-.3,-w/2-.2,r,0,w/2+.2,e,-d/2-.3,-w/2-.2,e,-d/2-.3],3));roof.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1,0,1,1,1,1,0,0,1,1,0,0,0],2));roof.computeVertexNormals();add(roof,distantRoof,0,0,0);
for(const side of [-1,1]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([side*w/2,e,-d/2,side*w/2,r,0,side*w/2,e,d/2],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,.5,1,1,0],2));g.computeVertexNormals();add(g,style===2?distantLime:distantBrick,0,0,0);}openStack(root,-w/2+.55,r+.55,0,.65,1.5,.55,brick);
for(const side of [-1,1])for(const x of [-w*.32,w*.32])for(const y of (style===1?[1.3,3.45]:[1.3])){add(new T.BoxGeometry(1.05,1,.045),timber,x,y,side*(d/2+.035));add(new T.BoxGeometry(.88,.82,.06),glass,x,y,side*(d/2+.055));}
add(new T.BoxGeometry(.92,1.96,.06),timber,0,.98,d/2+.055);
// Mid-distance detail that survives the switch from the full model: sills, lintels, a door step and pots.
for(const side of [-1,1])for(const x of [-w*.32,w*.32])for(const y of (style===1?[1.3,3.45]:[1.3])){add(new T.BoxGeometry(1.15,.07,.14),stone,x,y-.53,side*(d/2+.06));add(new T.BoxGeometry(1.2,.12,.08),style===2?distantLime:brick,x,y+.57,side*(d/2+.03));}
add(new T.BoxGeometry(1.1,.1,.26),stone,0,.05,d/2+.12);
for(const dz of [-.14,.14])add(new T.CylinderGeometry(.075,.095,.3,8),brick,-w/2+.55,r+.55+.75+.15,dz);
mergeByMaterial(root);return root;}
stage('before houses');const houseRoots:T.Group[]=[],highRoots:T.Object3D[]=[],lowRoots:T.Object3D[]=[];stage('houses? ');const pickTargets:T.Mesh[]=[];
for(const s of backyardShops){const pick=new T.Mesh(new T.BoxGeometry(s.width,2.8,s.depth),new T.MeshBasicMaterial({visible:false}));pick.position.set(s.p[0],s.y+1.4,s.p[1]);pick.rotation.y=s.angle;pick.userData.home=homes.find(h=>h.number===s.home);smallShops.root.add(pick);pickTargets.push(pick);}
for(const h of homes){const root=new T.Group();root.position.set(h.x,h.height,h.z);root.rotation.y=h.angle;root.scale.set(h.sx,1,h.sz);const low=lowHouse(h.style),high=highTemplates[h.style].clone(true);high.visible=false;root.add(low,high);individualise(h,root,low,high);root.visible=h.number!==chainshopReplacesHouse;scene.add(root);houseRoots.push(root);highRoots.push(high);lowRoots.push(low);
const pick=new T.Mesh(new T.BoxGeometry([6.4,7.2,9.2][h.style],h.style===1?6.2:4.5,[4.6,4.8,4.5][h.style]),new T.MeshBasicMaterial({visible:false}));pick.position.y=(h.style===1?6.2:4.5)/2;pick.userData.home=h;root.add(pick);if(h.number!==chainshopReplacesHouse)pickTargets.push(pick);
if(h.number===chainshopReplacesHouse)continue;
// Short yard boundaries leave gaps for shared approaches.
const width=[6.4,7.2,9.2][h.style]*h.sx,depth=[4.6,4.8,4.5][h.style]*h.sz;
for(const side of [-1,1]){if(h.number===22&&side===-1)continue;for(let k=0;k<4;k++){const a=localPoint(h,side*(width/2+1.4),-depth/2+k*1.5);cube(a[0],ground(...a)+.48,a[1],.12,.95,.13,timber,h.angle);if(k<3){const b=localPoint(h,side*(width/2+1.4),-depth/2+(k+1)*1.5);for(const y of [.32,.73])beam(new T.Vector3(a[0],ground(...a)+y,a[1]),new T.Vector3(b[0],ground(...b)+y,b[1]),.032,timber);}}}
// Retire the uniform doorstep rubble scatter. Preserve its five random draws per
// fragment so established woodland and other seeded landscape details stay put.
for(let k=0;k<13*5;k++)rand();
}
// Founder yard: a wash line, privy, vegetable rows, stacked timber, and a bench.
const yardMat=material('#6a553c'),leafMat=material('#637341');
function yardPoint(x:number,z:number,y=0){const p=localPoint(founder,x,z);return new T.Vector3(p[0],ground(...p)+y,p[1]);}
for(const x of [-4.8,1.5]){const p=yardPoint(x,-6.6);cube(p.x,p.y+1.2,p.z,.10,2.4,.10,timber,founder.angle);}
const laundry=addLaundry(scene,founder);
const life=addVillageLife(scene,homes,paths);let catFur:((eye:T.Vector3)=>void)|undefined;life.root.traverse(o=>{if(o.userData.furDetail)catFur=o.userData.furDetail;});mount.dataset.animals=JSON.stringify(life.stats);

mount.dataset.coalBunkers=String(addYardDetails(scene,homes));
for(let row=0;row<9;row++)for(let col=0;col<13;col++){const p=yardPoint(-1.7+col*.24,-4.1-row*.12,.032);cube(p.x,p.y,p.z,.228,.05,.108,stone,founder.angle);}
// A mended gate beside the founder's yard.
for(let i=0;i<7;i++){const p=yardPoint(5.8,-2.3+i*.18,.52);cube(p.x,p.y,p.z,.065,1.04,.11,timber,founder.angle);}
beam(yardPoint(5.8,-2.4,.22),yardPoint(5.8,-1.1,.79),.033,timber);
for(let i=0;i<7;i++){const a=yardPoint(4.5+i%3*.16,3.8, .13+Math.floor(i/3)*.15),b=yardPoint(5.5+i%3*.16,3.8,.13+Math.floor(i/3)*.15);beam(a,b,.09,timber);}
const bench=yardPoint(-3.1,4.1,.5);cube(bench.x,bench.y,bench.z,1.6,.13,.43,timber,founder.angle);for(const x of [-3.7,-2.5]){const p=yardPoint(x,4.1,.25);cube(p.x,p.y,p.z,.1,.5,.33,timber,founder.angle);}
stage('before trees');// Broadleaf crowns are leaf-cluster cards on branching trunks (foliage.ts). The old
// folded-leaf generator's 7,500 draws are still consumed to preserve the scene seed.
for(let i=0;i<7500;i++)rand();
const foliageTime={value:0},broadleaf=broadleafVariants(),canopyMat=foliageMaterial(foliageTime,{color:'#d2d6bd'});
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
for(let i=treePositions.length-1;i>=0;i--)if(siteIssue(treePositions[i],1.6)||!industryClear(...treePositions[i],1.5))treePositions.splice(i,1);
mount.dataset.woodlandTrees=String(addedTrees);mount.dataset.totalTrees=String(treePositions.length);
// Kinds: 0/3/4 broadleaf variants, 1 pine, 2 fir. All crown cards stay out of the AO pass on FOLIAGE_LAYER.
const species=treePositions.map((_,i)=>i>1&&i%10===3?1:i>1&&i%10===7?2:[0,3,4][i%3]);
const broadKind=(k:number)=>k===0||k>2;
const pine=coniferVariant(true),fir=coniferVariant(false),coniferMats=[foliageMaterial(foliageTime,{color:'#cdd3c4',transmission:.3}),foliageMaterial(foliageTime,{color:'#d0d8c6',sway:.6,transmission:.25})];
const crownMeshes=[broadleaf[0].crown,pine.crown,fir.crown,broadleaf[1].crown,broadleaf[2].crown].map((g,k)=>{const mesh=new T.InstancedMesh(g,broadKind(k)?canopyMat:coniferMats[k-1],species.filter(s=>s===k).length);mesh.castShadow=mesh.receiveShadow=true;mesh.layers.set(FOLIAGE_LAYER);scene.add(mesh);return mesh;});
const trunkMaterial=timber.clone();
// Trunk slots follow crown kinds: broadleaf variants 0/2/3, pine 1, fir 4.
const trunkSlot=(k:number)=>k===0?0:k===3?2:k===4?3:k===1?1:4;
const trunkMeshes=[broadleaf[0].trunk,pine.trunk,broadleaf[1].trunk,broadleaf[2].trunk,fir.trunk].map((g,t)=>{const count=species.filter(k=>trunkSlot(k)===t).length,mesh=new T.InstancedMesh(g,trunkMaterial,count);g.setAttribute('barkCoverage',new T.InstancedBufferAttribute(new Float32Array(count).fill(t===1||t===4?0:1),1));mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;});

const crownRecords:{trunk:number;trunkMesh:number;kind:number;slot:number;matrix:T.Matrix4;center:T.Vector3;radius:number;hidden:boolean}[]=[];
const crownIndex=[0,0,0,0,0],trunkIndex=[0,0,0,0,0];mount.dataset.treeSpecies=JSON.stringify({broadleaf:species.filter(broadKind).length,pine:species.filter(s=>s===1).length,fir:species.filter(s=>s===2).length});
treePositions.forEach((p,i)=>{
 const wooded=streamDistance(...p)<55||greenDistance(p)<32;
 const scale=wooded?.95+woodlandRandom()*.85:.7+woodlandRandom()*.8;
 dummy.position.set(p[0],ground(...p),p[1]);dummy.rotation.set(0,woodlandRandom()*Math.PI*2,0);dummy.scale.set(scale*(.94+woodlandRandom()*.22),scale,scale);dummy.updateMatrix();const kind=species[i],treeLeaves=crownMeshes[kind],slot=crownIndex[kind]++;treeLeaves.setMatrixAt(slot,dummy.matrix);const trunkMesh=trunkSlot(kind),trunk=trunkIndex[trunkMesh]++;trunkMeshes[trunkMesh].setMatrixAt(trunk,dummy.matrix);crownRecords.push({trunk,trunkMesh,kind,slot,matrix:dummy.matrix.clone(),center:new T.Vector3(p[0],ground(...p)+4.6*scale,p[1]),radius:3.3*scale,hidden:false});treeLeaves.setColorAt(slot,new T.Color().setHSL(.19+woodlandRandom()*.025,.20+woodlandRandom()*.10,.30+woodlandRandom()*.13));
 // Muted leaf litter beneath the canopy makes the woods read as connected ground.
 const q=pixel(p),radius=2.6*scale/460*4096,g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],radius);g.addColorStop(0,'#454b2d45');g.addColorStop(1,'#454b2d00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],radius,0,Math.PI*2);ctx.fill();
});groundTexture.needsUpdate=true;

{// Canopy cover: each tree shades a soft disc of about its crown; cover saturates where crowns meet.
 const cover=new Float32Array(CANOPY*CANOPY),cx=460/CANOPY,cz=520/CANOPY;
 for(const p of treePositions){const i0=Math.floor((p[0]+230)/cx),j0=Math.floor((p[1]+320)/cz);
  for(let j=j0-7;j<=j0+7;j++)for(let i=i0-7;i<=i0+7;i++){if(i<0||j<0||i>=CANOPY||j>=CANOPY)continue;const d=Math.hypot(-230+(i+.5)*cx-p[0],-320+(j+.5)*cz-p[1]);if(d<12)cover[j*CANOPY+i]+=Math.exp(-((d/4.3)**2))*.85;}}
 for(let k=0;k<cover.length;k++)canopyData[k]=Math.round(255*(1-Math.exp(-cover[k])));canopyTexture.needsUpdate=true;}
stage('trees placed');mount.dataset.flowers=JSON.stringify(addSpringFlowers(scene,homes,paths,treePositions));
// Sparse meadow grass, denser on the margins; no blades through lanes or buildings.
const grassVertices:number[]=[];
for(let blade=0;blade<7;blade++){const a=blade*2.4,x=Math.cos(a)*.09,z=Math.sin(a)*.09,h=.15+(blade%3)*.055,w=.013;grassVertices.push(x-w,0,z,x+w,0,z,x+.025,h*.6,z+.015,x-w,0,z,x+.025,h*.6,z+.015,x+.045,h,z+.025);}
const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(grassVertices,3));grassGeo.computeVertexNormals();
stage('flowers done');const grassPoints:{p:Point;height:number;dry:boolean}[]=[];
// Discontinuous wall weeds: small tufts in sheltered corners, not a tidy border.
for(const h of homes.filter(h=>h.number!==chainshopReplacesHouse)){const w=[6.4,7.2,9.2][h.style]*h.sx,d=[4.6,4.8,4.5][h.style]*h.sz;
 for(let i=0;i<90;i++){const x=(grassRandom()-.5)*(w+1.5),z=(i%2?1:-1)*(d/2+.2+grassRandom()*.8),p=localPoint(h,x,z);if(Math.abs(x)<1.2&&z>0||grassPatch(...p)<.48)continue;grassPoints.push({p,height:.45+grassRandom()*.85,dry:i%3===0});}
}
// Meadow colonies grow taller away from the paths, separated by worn bare gaps.
for(let i=0;i<78000;i++){
 const x=(grassRandom()-.5)*410,z=-60+(grassRandom()-.5)*470,patch=grassPatch(x,z);
 if(!within(x,z)||streamDistance(x,z)<2.7||patch<.48||grassRandom()>patch)continue;
 if(Math.hypot(x-chainshopPosition[0],z-chainshopPosition[1])<8)continue;
 const r=nearestRoad([x,z]),roadDistance=Math.hypot(x-r[0],z-r[1]);
 if(roadDistance<3.4||homes.some(h=>Math.hypot(x-h.x,z-h.z)<Math.max(h.width,h.depth)*.58+2))continue;
 let pathDistance=Infinity;for(const line of paths)for(let j=1;j<line.length;j++){const q=nearestSegment([x,z],line[j-1],line[j]);pathDistance=Math.min(pathDistance,Math.hypot(x-q[0],z-q[1]));}
 if(pathDistance<1.2)continue;
 const away=Math.min(1,Math.min(roadDistance-3.4,pathDistance-1.2)/6),height=.7+away*(1.3+grassRandom()*1.5);
 for(let j=0;j<3;j++)grassPoints.push({p:[x+(grassRandom()-.5)*.45,z+(grassRandom()-.5)*.45],height:height*(.65+grassRandom()*.5),dry:patch<.65||j===0});
}
for(let i=grassPoints.length-1;i>=0;i--)if(siteIssue(grassPoints[i].p,.15)||!industryClear(...grassPoints[i].p))grassPoints.splice(i,1);
const meadow=new T.InstancedMesh(grassGeo,new T.MeshStandardMaterial({color:'#a2a27c',roughness:1,side:T.DoubleSide}),grassPoints.length);
// Grass thins out under closed canopy (draws still consumed so other placements keep their seeds).
grassPoints.forEach(({p,height,dry},i)=>{dummy.position.set(p[0],ground(...p)+.01,p[1]);dummy.rotation.set(0,grassRandom()*6.28,0);const width=.7+grassRandom()*.85,shade=Math.max(0,1-Math.max(0,canopyAt(...p)-.45)/.2);dummy.scale.set(width*shade,height*shade,width*shade);dummy.updateMatrix();meadow.setMatrixAt(i,dummy.matrix);meadow.setColorAt(i,new T.Color(dry?'#8b7a4b':'#596840').multiplyScalar(.8+grassRandom()*.4));});meadow.receiveShadow=true;scene.add(meadow);mount.dataset.grassTufts=String(grassPoints.length);
for(const [m,geos]of meshes){const g=mergeGeometries(geos);if(g){const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);}for(const g of geos)g.dispose();}meshes.clear();
// The existing forge is reused as architecture, without its standalone diorama base.
$('load-label').textContent='Lighting the chain shop…';const forge=await loader.loadAsync('/forge/mushroom-green-forge.glb');const forgeRoot=new T.Group();const forgePos:Point=chainshopPosition;forgeRoot.position.set(forgePos[0],ground(...forgePos),forgePos[1]);forgeRoot.rotation.y=1.03;
const buildingNames=/^(Masonry|Brickwork|Interior|Shutters|Wood_grain|Shutter_braces|Ironmongery|Window|Door|Threshold|Roof|Ridge|Gutters|Chimney|Flue|Lead|Hearth|Cinders|Hood|Anvil|Hammer|Finished_chain|Stock_iron|Quench|Tub|Coal_heap|Timber_stock|Bench|Tongs)/;
forge.scene.updateMatrixWorld(true);forge.scene.traverse(o=>{if(o instanceof T.Mesh&&(buildingNames.test(o.name)||/^Annex/.test(o.name))){const isWorkingHammer=/^Hammer/.test(o.name),isStance=/^Anvil_(square_base|square_top|bolts|iron_strap)/.test(o.name),baked=isWorkingHammer||isStance;const mesh=new T.Mesh(isWorkingHammer?centralWorkstation(o.geometry,o.matrixWorld,false):isStance?clearChainmakerStance(o.geometry,o.matrixWorld):o.geometry,o.material);mesh.name=o.name;if(/^Cinders/.test(o.name)){mesh.material=(Array.isArray(o.material)?o.material[0]:o.material).clone();const cm=mesh.material as T.MeshStandardMaterial;if(cm.emissive.getHex()!==0){cm.emissive.set('#d54e14');cm.emissiveIntensity=.65;}}if(!baked)mesh.applyMatrix4(o.matrixWorld);mesh.castShadow=mesh.receiveShadow=true;forgeRoot.add(mesh);}});scene.add(forgeRoot);const forgePick=new T.Mesh(new T.BoxGeometry(9.7,5.7,5.1),new T.MeshBasicMaterial({visible:false}));forgePick.position.y=2.7;forgePick.userData.forge=true;forgeRoot.add(forgePick);pickTargets.push(forgePick);
const annexPick=new T.Mesh(new T.BoxGeometry(3.5,5.4,3.7),new T.MeshBasicMaterial({visible:false}));annexPick.position.set(2.875,2.6,-3.71);annexPick.userData.forge=true;forgeRoot.add(annexPick);pickTargets.push(annexPick);mount.dataset.chainshopAnnex='1';
// Live coal fires in the three main-forge hearths (station centres measured from the Cinders mesh).
const forgeFires=[[-3.39,1.59],[-.41,1.62],[2.57,1.58]].map(([x,z],i)=>{const fire=createFire({width:.46,depth:.34,flameHeight:.26,tongues:8,sparks:26,smoke:new T.Vector3(0,.58,-.02),light:{intensity:i===1?2.2:1.6,distance:4.2,offset:new T.Vector3(0,.35,.25)},seed:11+i*7});fire.group.position.set(x,.995,z);forgeRoot.add(fire.group);return fire;});
stage('forge built');const worker=addWorkingChainmaker(forgeRoot,(await loader.loadAsync('/chainmaker-v2/chainmaker.glb')).scene);
mount.dataset.chainmakers='1';
// A smaller family workshop at Henry's roadside gable. The location is an
// oral-history interpretation; this remains separate from the surviving forge.
const weaverShop=new T.Group();weaverShop.position.set(domesticShop.p[0],ground(...domesticShop.p),domesticShop.p[1]);weaverShop.rotation.y=domesticShop.angle;weaverShop.scale.set(.55,.72,.70);
forge.scene.traverse(o=>{if(o instanceof T.Mesh&&buildingNames.test(o.name)&&! /^(Chimney|Flue|Lead)/.test(o.name)){let geometry=o.geometry;
// Keep one full-sized work station in the domestic shop, with a clear central aisle.
if(/^(Hearth|Cinders|Hood|Anvil|Hammer)/.test(o.name)){geometry=centralWorkstation(o.geometry,o.matrixWorld);if(/^Anvil/.test(o.name)){geometry.scale(1/.55,1/.72,1);geometry.translate(0,-.035/.72,0);}const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;if(/^Cinders/.test(o.name)){const m=(Array.isArray(o.material)?o.material[0]:o.material).clone() as T.MeshStandardMaterial;if(m.emissive.getHex()!==0){m.emissive.set('#d54e14');m.emissiveIntensity=.65;}mesh.material=m;}mesh.castShadow=mesh.receiveShadow=true;weaverShop.add(mesh);return;}
const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;mesh.applyMatrix4(o.matrixWorld);mesh.castShadow=mesh.receiveShadow=true;weaverShop.add(mesh);}});
const shopLime=new T.MeshStandardMaterial({name:'Chalk limewash domestic stack',color:'#cdc9b7',roughness:.96});
const beforeStack=weaverShop.children.length;openStack(weaverShop,0,4.18,1.25,.66,1.65,.62,shopLime);weaverShop.children.slice(beforeStack).forEach(o=>o.name='Chimney_domestic');
const smallPick=new T.Mesh(new T.BoxGeometry(9.4,5,5),new T.MeshBasicMaterial({visible:false}));smallPick.position.y=2.5;smallPick.userData.home=founder;weaverShop.add(smallPick);pickTargets.push(smallPick);scene.add(weaverShop);mount.dataset.domesticChainshops='1';
// Henry's single smaller hearth: lower output, its own phase. The shop root is scaled, so counter-scale the fire.
stage('small shop built');const smallFire=createFire({width:.44,depth:.32,flameHeight:.2,tongues:6,sparks:14,smoke:new T.Vector3(0,.55,-.02),light:{intensity:1.3,distance:3.4,offset:new T.Vector3(0,.35,.25)},heat:.85,seed:61});
smallFire.group.position.set(-.41,.995,1.62);smallFire.group.scale.set(1/weaverShop.scale.x,1/weaverShop.scale.y,1/weaverShop.scale.z);weaverShop.add(smallFire.group);
stage('before workshop props');const mainContents=addWorkshopProps(forgeRoot),smallContents=addWorkshopProps(weaverShop,true);mount.dataset.workshopContents=JSON.stringify({main:mainContents.counts,small:smallContents.counts});
const shopGlow=new T.PointLight('#ffab57',5,4,2);shopGlow.position.copy(weaverShop.localToWorld(new T.Vector3(4.3,1.2,0)));scene.add(shopGlow);
stage('before showcase');const showcase=addShowcase(scene);
let cartOak:T.MeshStandardMaterial|undefined;highTemplates[0].traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&/Old oak/.test(m.name))cartOak=m;});
stage('before cart');const yardCart=addForgeCart(scene,cartOak);mount.dataset.carts='1';
stage('before working props');const workingProps=addWorkingProps(scene,homes,cartOak,paths,treePositions);mount.dataset.workingProps=JSON.stringify(workingProps.counts);
let landscapeSeed=9321865;const landscapeRandom=()=>{landscapeSeed=(Math.imul(landscapeSeed,1664525)+1013904223)>>>0;return landscapeSeed/4294967296;};
stage('before landscape');const landscape=addLandscape(scene,homes.filter(h=>h.number!==chainshopReplacesHouse),landscapeRandom,[...life.placements.map(a=>a.p),...workingProps.placements.map(a=>a.p)]);mount.dataset.shrubs=String(landscape.counts.shrubs);
stage('before far country');// The modelled ground ends on the within() ellipse. The far country continues it from the OS six-inch sheets
// (surveyed 1881-82): mapped parcels, hedges, lanes, woods, buildings and the brooks, on real DTM heights.
const farEdge=(a:number):Point=>[Math.cos(a)*210*Math.sqrt(.95),-60+Math.sin(a)*240*Math.sqrt(.95)];
const farCountry=addFarCountry(scene,farEdge,farData,farGround,{nearTrees:matrices=>{
 // Near field trees reuse the three broadleaf models; they sit outside the house LOD and crown-hiding logic.
 broadleaf.forEach((variant,k)=>{const mine=matrices.filter((_,i)=>i%3===k),crowns=new T.InstancedMesh(variant.crown,canopyMat,mine.length),trunks=new T.InstancedMesh(variant.trunk.clone(),trunkMaterial,mine.length);
  trunks.geometry.setAttribute('barkCoverage',new T.InstancedBufferAttribute(new Float32Array(mine.length).fill(1),1));
  mine.forEach((m,i)=>{crowns.setMatrixAt(i,m);trunks.setMatrixAt(i,m);crowns.setColorAt(i,new T.Color().setHSL(.19+(i*.37%1)*.025,.22+(i*.61%1)*.08,.31+(i*.83%1)*.1));});
  crowns.layers.set(FOLIAGE_LAYER);crowns.castShadow=trunks.castShadow=true;crowns.receiveShadow=trunks.receiveShadow=true;scene.add(crowns,trunks);});
},nearHedges:matrices=>{
 // Hedge runs along the near field boundaries share the shrub leaf cards.
 const hedge=new T.InstancedMesh(hedgeGeometry(),foliageMaterial(foliageTime,{color:'#c6cab3',sway:0,transmission:.3}),matrices.length);
 matrices.forEach((m,i)=>hedge.setMatrixAt(i,m));hedge.layers.set(FOLIAGE_LAYER);hedge.castShadow=hedge.receiveShadow=true;scene.add(hedge);
},weather:weatherGround,water:historic.waterMaterial});mount.dataset.farCountry=JSON.stringify(farCountry.counts);
mount.dataset.forgePosition=forgePos.join(',');
stage('landscape done');weatherArchitecture(forgeRoot,forgeRoot.position.y);weatherArchitecture(weaverShop,weaverShop.position.y);
refineSurface(timber,'wood');refineSurface(iron,'iron');refineSurface(stone,'stone');refineSurface(brick,'brick');refineSurface(lime,'plaster');refineSurface(glass,'glass');
refineSurface(meadow.material,'leaf');refineSurface(trunkMaterial,'bark');for(const crown of crownMeshes)refineSurface(crown.material as T.MeshStandardMaterial,'leaf');refineObject(scene);wearWorkshop(forgeRoot);wearWorkshop(weaverShop);detailArchitecture(scene);
let agedBuildings=0;for(let i=0;i<homes.length;i++)if(homes[i].number!==chainshopReplacesHouse){ageBuilding(houseRoots[i],homes[i].number);agedBuildings++;}ageBuilding(forgeRoot,5,true);ageBuilding(weaverShop,22,true);mount.dataset.researchBuildingPass=String(agedBuildings+2);
textureDetail(trunkMaterial,'broadleaf-bark');
stage('before woodland floor');// Woodland ground flora and deadwood keep to the trees, clear of routes, yards, banks, workshops and fixed views.
const floorClear=(p:Point,r:number)=>{
 if(!within(...p)||streamDistance(...p)<streamWidth(...p)*.5+1.6+r||!clearOfYards(...p))return false;
 const road=nearestRoad(p);if(Math.hypot(p[0]-road[0],p[1]-road[1])<3.8+r)return false;
 if(Math.hypot(p[0]-chainshopPosition[0],p[1]-chainshopPosition[1])<12||Math.hypot(p[0]-domesticShop.p[0],p[1]-domesticShop.p[1])<6)return false;
 if(paths.some(line=>line.some((q,i)=>{if(!i)return false;const s=nearestSegment(p,line[i-1],q);return Math.hypot(p[0]-s[0],p[1]-s[1])<1.6+r;})))return false;
 return !siteIssue(p,r)&&industryClear(...p,r);
};
const approachEye:Point=[forgePos[0]+18.2,forgePos[1]-12.8];
const woodlandFloor=addWoodlandFloor(scene,{trees:treePositions.map(p=>({p})),clear:floorClear,time:foliageTime,bark:trunkMaterial,keepClear:[[brookLook,brookEye],[approachEye,forgePos]]});
paintWoodlandLitter(ctx,pixel,woodlandFloor.litter);groundTexture.needsUpdate=true;mount.dataset.woodlandFloor=JSON.stringify(woodlandFloor.counts);
// Fly agarics at the foot of the tree beside the fallen log, right of the brook view.
addFlyAgarics(scene,[{p:[-75.4,69.25],radius:.09,height:.2,open:.85,lean:.06},{p:[-74.7,69.8],radius:.074,height:.16,open:.6,lean:-.08},{p:[-75.05,69.65],radius:.034,height:.07,open:.05,lean:.04}]);
stage('before lane verges');// Lane margins avoid buildings, paths, working props, animals and reserved sites.
const occupied=[...life.placements.map(a=>a.p),...workingProps.placements.map(a=>a.p)];
const laneClear=(p:Point,r:number)=>within(...p)&&!siteIssue(p,r)&&industryClear(...p,r)&&!occupied.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1+r)&&
 !homes.some(h=>{const dx=p[0]-h.x,dz=p[1]-h.z,c=Math.cos(h.angle),s=Math.sin(h.angle),lx=dx*c-dz*s,lz=dx*s+dz*c;return Math.abs(lx)<[6.4,7.2,9.2][h.style]*h.sx/2+.6+r&&Math.abs(lz)<[4.6,4.8,4.5][h.style]*h.sz/2+.6+r;})&&
 !paths.some(line=>line.some((q,i)=>{if(!i)return false;const s=nearestSegment(p,line[i-1],q);return Math.hypot(p[0]-s[0],p[1]-s[1])<1.1+r;}))&&
 Math.hypot(p[0]-chainshopPosition[0],p[1]-chainshopPosition[1])>9&&Math.hypot(p[0]-domesticShop.p[0],p[1]-domesticShop.p[1])>4;
mount.dataset.laneVerges=JSON.stringify(addLaneVerges(scene,{clear:laneClear}).counts);
// A static local environment supplies reflected sky and foliage; flow normals animate it.
stage('before env capture');const capture=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});const reflectionCamera=new T.CubeCamera(.1,600,capture);reflectionCamera.children.forEach(c=>c.layers.enable(FOLIAGE_LAYER));reflectionCamera.position.set(-75,ground(-75,55)+3,55);[...landscape.waterMeshes,...showcase.puddles,...historic.waterMeshes].forEach(o=>o.visible=false);scene.updateMatrixWorld(true);reflectionCamera.update(renderer,scene);[...landscape.waterMeshes,...showcase.puddles,...historic.waterMeshes].forEach(o=>o.visible=true);const pmrem=new T.PMREMGenerator(renderer);const reflection=pmrem.fromCubemap(capture.texture);setHenryStatueEnvironment(reflection.texture);historic.waterMaterial.envMap=reflection.texture;historic.waterMaterial.needsUpdate=true;historic.poolMaterial.envMap=reflection.texture;historic.poolMaterial.needsUpdate=true;landscape.waterMaterial.envMap=reflection.texture;landscape.waterMaterial.envMapIntensity=.3;showcase.wet.envMap=reflection.texture;showcase.wet.envMapIntensity=.35;for(const m of windowMaterials){m.envMap=reflection.texture;m.envMapIntensity=.45;m.roughness=.08;m.metalness=0;glazeWindow(m);m.needsUpdate=true;}forgeRoot.traverse(o=>{if(o instanceof T.Mesh&&/^Annex_glazing/.test(o.name)){const m=o.material as T.MeshStandardMaterial;m.envMap=reflection.texture;m.envMapIntensity=.55;m.transparent=true;m.opacity=.48;m.depthWrite=false;m.needsUpdate=true;o.castShadow=false;}});capture.dispose();pmrem.dispose();
// Map overlay: exact source footprints, boundary, mapped routes, and household numbers.
const overlay=new T.Group();overlay.visible=false;scene.add(overlay);function mapLine(points:Point[],color:string,closed=false){const ps=closed?[...points,points[0]]:points;const g=new T.BufferGeometry().setFromPoints(ps.map(p=>new T.Vector3(p[0],ground(...p)+.25,p[1])));const line=new T.Line(g,new T.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.85}));line.renderOrder=5;overlay.add(line);}
mapLine(boundary,'#f0d492',true);for(const r of renderedRoads)mapLine(r,'#f2deae');for(const g of greens)mapLine(g,'#c5e2a0',true);
homes.forEach(h=>mapLine(h.polygon.map(project),(families[h.founder?'Founder':h.family as keyof typeof families]||families.Other).border,true));
const updateHouseLabels=createHouseLabels(homes,$('map-labels'),h=>select(h));
const selection=new T.Mesh(new T.RingGeometry(5.8,6.0,64),new T.MeshBasicMaterial({color:'#dfbc6f',side:T.DoubleSide,transparent:true,opacity:.8,depthTest:false}));selection.rotation.x=-Math.PI/2;selection.visible=false;selection.renderOrder=6;scene.add(selection);
// Soft smoke lies outside the AO normal pass.
const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=96;const sc=smokeCanvas.getContext('2d')!;for(let i=0;i<14;i++){const x=48+Math.sin(i*12.7)*20,y=48+Math.cos(i*8.3)*19;const grad=sc.createRadialGradient(x,y,0,x,y,24);grad.addColorStop(0,'rgba(115,114,104,.22)');grad.addColorStop(1,'rgba(140,138,125,0)');sc.fillStyle=grad;sc.fillRect(0,0,96,96);}const smokeTexture=new T.CanvasTexture(smokeCanvas);// Most cottages have a fire in; a few chimneys stand cold (own seed, so no other draw moves).
const chimneys=homes.filter(h=>h.number!==chainshopReplacesHouse&&(h.number===22||((h.number*2654435761)>>>0)%10<8)).map(h=>{const p=localPoint(h,(-[6.4,7.2,9.2][h.style]/2+.55)*h.sx,0);return new T.Vector3(p[0],h.height+[2.65,4.45,2.85][h.style]+3.35,p[1]);});for(const x of [-3,0,3])chimneys.push(forgeRoot.localToWorld(new T.Vector3(x,5.2,1.3)));chimneys.push(weaverShop.localToWorld(new T.Vector3(0,5.2,1.25)));// Chimney smoke: one instanced billboard draw (was one sprite draw per puff), depth-sorted each frame.
// Each chimney has its own draw: a few banked fires barely smoke, fresh coal smokes heavily.
const smoke=chimneys.flatMap((p,k)=>{const draw=[.35,.55,.7,.85,1,1.15][((k*2654435761)>>>0)%6],rate=.8+(((k*40503)>>>0)%100)/250;return Array.from({length:16},(_,i)=>({p,phase:i/16*8+k*.37,draw,rate}));});
const smokeGeometry=new T.InstancedBufferGeometry();smokeGeometry.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));smokeGeometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));smokeGeometry.setIndex([0,1,2,0,2,3]);
const smokeOffset=new T.InstancedBufferAttribute(new Float32Array(smoke.length*3),3),smokeShape=new T.InstancedBufferAttribute(new Float32Array(smoke.length*4),4);
smokeOffset.setUsage(T.DynamicDrawUsage);smokeShape.setUsage(T.DynamicDrawUsage);smokeGeometry.setAttribute('smokeOffset',smokeOffset);smokeGeometry.setAttribute('smokeShape',smokeShape);smokeGeometry.instanceCount=smoke.length;
const smokeMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:true,uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{map:{value:softSmokeTexture()},tint:{value:new T.Color('#86837b')}}]),
 vertexShader:`attribute vec3 smokeOffset;attribute vec4 smokeShape;varying vec2 vUv;varying float vAlpha;
  #include <fog_pars_vertex>
  void main(){vUv=uv;vAlpha=smokeShape.w;vec4 mvPosition=viewMatrix*vec4(smokeOffset,1.);float c=cos(smokeShape.z),s=sin(smokeShape.z);vec2 corner=position.xy*smokeShape.xy;mvPosition.xy+=vec2(c*corner.x-s*corner.y,s*corner.x+c*corner.y);gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
 fragmentShader:`uniform sampler2D map;uniform vec3 tint;varying vec2 vUv;varying float vAlpha;
  #include <fog_pars_fragment>
  void main(){vec4 texel=texture2D(map,vUv);gl_FragColor=vec4(tint*texel.rgb,texel.a*vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  }`});
// The sprite version sampled this canvas without sRGB decoding; keep that exact look.
const smokeMesh=new T.Mesh(smokeGeometry,smokeMaterial);smokeMesh.frustumCulled=false;smokeMesh.layers.set(1);smokeMesh.renderOrder=3;scene.add(smokeMesh);
const smokeOrder=smoke.map((_,i)=>i),smokeDepth=new Float32Array(smoke.length),smokePoint=new T.Vector3();
let savePicture=false;
$('save-view').onclick=()=>{savePicture=true;};$('close-picture').onclick=()=>{$<HTMLDialogElement>('picture-preview').close();};
const stillFrame=new URLSearchParams(location.search).has('still');
// Reduced motion keeps camera moves instant and slows ambient life to half speed; Pause still stops it all.
let paused=stillFrame,dusk=false,mapOpen=false,namesOpen=false,selected:Home|null=null,time=stillFrame?4:0,lightAmount=0;let tween:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3;t:number;duration:number}|null=null;
const center=new T.Vector3(5,ground(5,-50),-50);
function move(pos:T.Vector3,target:T.Vector3,immediate=false,duration=1.6){if(roomHome){const bounded=containRoom(pos,target,roomBounds());pos=bounded.position;target=bounded.target;}if(immediate||reduced){camera.position.copy(pos);controls.target.copy(target);controls.update();tween=null;}else tween={from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),target:target.clone(),t:0,duration};}
function zoom(factor:number){
 if(roomHome)factor=Math.pow(factor,.25);
 const target=(tween?.target??controls.target).clone(),position=tween?.to??camera.position;
 move(zoomDestination(position,target,factor,controls.minDistance,controls.maxDistance),target,false,.32);
}
function pan(dx:number,dy:number){
 const next=panDestination(camera,tween?.to??camera.position,tween?.target??controls.target,dx,dy,!!roomHome);
 move(next.position,next.target,false,.25);
}
function turn(dx:number,dy:number){
 const step=T.MathUtils.degToRad(roomHome?7:10);
 const next=turnDestination(tween?.to??camera.position,tween?.target??controls.target,dx*step,dy*step,!!roomHome);
 move(next.position,next.target,false,.22);
}
function roomBounds(){const h=roomHome!,dimensions=roomDimensions(h,roomFloor);return {x:h.x,z:h.z,angle:h.angle,width:[6.4,7.2,9.2][h.style]*h.sx,depth:[4.6,4.8,4.5][h.style]*h.sz,floor:h.height+dimensions.base,ceiling:h.height+dimensions.base+dimensions.height};}
function restoreOutdoorControls(){controls.enableRotate=true;controls.enableDamping=true;controls.panSpeed=1;controls.zoomSpeed=.8;controls.maxDistance=1800;controls.minPolarAngle=.04;controls.maxPolarAngle=Math.PI*.48;camera.near=.2;}
function repeatControl(id:string,action:()=>void){
 const button=$(id);let delay:ReturnType<typeof setTimeout>|undefined,repeat:ReturnType<typeof setInterval>|undefined;
 const stop=()=>{clearTimeout(delay);clearInterval(repeat);};
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.focus();stop();action();delay=setTimeout(()=>{repeat=setInterval(action,150);},350);});
 button.addEventListener('click',e=>{if(e.detail===0)action();});
 for(const event of ['pointerup','pointercancel','pointerleave','blur'])button.addEventListener(event,stop);
 addEventListener('blur',stop);
}

function cleanView(on:boolean){$('village-app').dataset.clean=String(on);$('restore-interface').hidden=!on;}
$('clean-view').onclick=()=>cleanView(true);$('restore-interface').onclick=()=>cleanView(false);document.addEventListener('keydown',e=>{if((e.key==='h'||e.key==='H')&&!(e.target instanceof HTMLSelectElement)){cleanView($('village-app').dataset.clean!=='true');}if(e.key==='Escape')cleanView(false);});
repeatControl('zoom-in',()=>zoom(.75));repeatControl('zoom-out',()=>zoom(1/.75));
repeatControl('pan-up',()=>pan(0,1));repeatControl('pan-down',()=>pan(0,-1));repeatControl('pan-left',()=>pan(-1,0));repeatControl('pan-right',()=>pan(1,0));
repeatControl('turn-up',()=>turn(0,1));repeatControl('turn-down',()=>turn(0,-1));repeatControl('turn-left',()=>turn(-1,0));repeatControl('turn-right',()=>turn(1,0));
let roomHome:Home|null=null;let roomFloor=0;
let roomDrag:{id:number;x:number;y:number}|null=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(!e.isPrimary){roomDrag=null;return;}if(roomHome&&e.button===0){tween=null;roomDrag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(!roomHome||!roomDrag||roomDrag.id!==e.pointerId)return;
 const dx=(e.clientX-roomDrag.x)*.0025,dy=(roomDrag.y-e.clientY)*.0025;roomDrag.x=e.clientX;roomDrag.y=e.clientY;
 const next=turnDestination(camera.position,controls.target,dx,dy,true);controls.target.copy(next.target);controls.update();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>{roomDrag=null;});
function leaveRoom(){if(!roomHome)return;const h=roomHome;roomHome=null;$('room-controls').hidden=true;visit(h,true);}
$('leave-room').onclick=leaveRoom;
const HENRY_VIEW={eye:[1.45,2.05,-.4],look:[-2.5,.92,-.05]};
function stepInside(h:Home,floor=0){
 if(h.number===5){inspection.enter(h,'main');return;}
 inspection.close(false);tween=null;controls.minDistance=.35;controls.maxDistance=6;controls.enableRotate=false;controls.enableDamping=false;controls.panSpeed=.16;controls.zoomSpeed=.25;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;camera.near=.04;roomHome=h;$('room-controls').hidden=false;$('village-app').dataset.view='room';
 const dimensions=roomDimensions(h,floor);roomFloor=dimensions.level;
 const d=[4.6,4.8,4.5][h.style]*h.sz,w=[6.4,7.2,9.2][h.style]*h.sx;
 // Henry's kitchen opens on Tom's chosen view: down the room from the far end, over the table
 // and rug to the range and chimney breast, a window in each side wall.
 const henry=h.number===22&&dimensions.level===0;
 const p=henry?localPoint(h,HENRY_VIEW.eye[0],HENRY_VIEW.eye[2]):localPoint(h,0,d*.30),q=henry?localPoint(h,HENRY_VIEW.look[0],HENRY_VIEW.look[2]):localPoint(h,-w*.19,-d*.15);
 camera.fov=68;camera.updateProjectionMatrix();camera.position.set(p[0],h.height+dimensions.base+(henry?HENRY_VIEW.eye[1]:1.53),p[1]);
 controls.target.set(q[0],h.height+dimensions.base+(henry?HENRY_VIEW.look[1]:1.13),q[1]);controls.update();
 $('house-panel').hidden=true;selection.visible=false;
 $('place-label').textContent=(roomFloor?'Upstairs · ':'Downstairs · ')+h.household_name+' · No. '+h.number;
 $('room-floor').hidden=h.style!==1;$('room-floor').textContent=roomFloor?'Go downstairs':'Go upstairs';
 $('room-level').textContent=h.style===1?(roomFloor?'Upstairs':'Downstairs')+' · upper floor is an interpretation': 'Single-level model · original layout unverified';
 rememberPlace({house:h.number,room:1,inside:null,floor:roomFloor||null});
 renderer.domElement.focus();renderer.shadowMap.needsUpdate=true;
}
$('room-floor').onclick=()=>{if(roomHome)stepInside(roomHome,roomFloor?0:1);};
 $('room-cutaway').onclick=()=>{if(!roomHome)return;const h=roomHome,floor=roomFloor;leaveRoom();inspection.enter(h);inspection.setFloor(floor);};
function visit(h:Home,immediate=false){restoreOutdoorControls();roomHome=null;$('room-controls').hidden=true;rememberPlace({room:null});controls.minDistance=9;camera.fov=42;camera.updateProjectionMatrix();const target=new T.Vector3(h.x,h.height+1.5,h.z);const p=localPoint(h,h.number===22?-22:-16,21);const pos=new T.Vector3(p[0],h.height+13,p[1]);if(camera.aspect<.85)pos.sub(target).multiplyScalar(.85/camera.aspect).add(target);move(pos,target,immediate);$('place-label').textContent=h.number===22?'Henry Weaver’s home & small chainshop · No. 22':h.household_name+' · No. '+h.number;}
function view(name:string,immediate=false){restoreOutdoorControls();roomHome=null;$('room-controls').hidden=true;rememberPlace({view:name,room:null,house:null,inside:null,floor:null,worker:null});if(typeof inspection!=='undefined')inspection.close(false);controls.minDistance=name==='yard'?3:9;camera.fov=name==='washing'?62:name==='approach'?34:name==='lane'?48:name==='yard'?46:38;camera.updateProjectionMatrix();$('village-app').dataset.view=name;document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));if(name==='village'){let pos=new T.Vector3(5,655,45);if(camera.aspect<1)pos.sub(center).multiplyScalar(1/camera.aspect*1.16).add(center);move(pos,center,immediate);$('place-label').textContent='Mushroom Green, Black Country';}else if(name==='workings'){const target=new T.Vector3(146,ground(146,-111),-111);move(target.clone().add(new T.Vector3(-47,38,51).multiplyScalar(Math.max(1,.8/camera.aspect))),target,immediate);$('place-label').textContent='Old workings · railway, shafts and wet hollows';}else if(name==='workshops'){const shop=backyardShops.find(s=>s.home===31)??backyardShops[0],p=shop.p,target=new T.Vector3(p[0],shop.y+1,p[1]),a=shop.angle;move(target.clone().add(new T.Vector3(Math.cos(a)*8+Math.sin(a)*10,7,-Math.sin(a)*8+Math.cos(a)*10)),target,immediate);$('place-label').textContent='Cottage workshops · small nail and chain shops';}else if(name==='outside'){const p=roadCrossing.centre,target=new T.Vector3(p[0],roadCrossing.height(0),p[1]);move(target.clone().add(new T.Vector3(18,15,34).multiplyScalar(Math.max(1,.8/camera.aspect))),target,immediate);$('place-label').textContent='The road out · interpreted brook crossing';}else if(name==='approach'){const target=new T.Vector3(forgePos[0]+1.2,ground(...forgePos)+1.6,forgePos[1]-1.8);const offset=new T.Vector3(17,2.9,-11).multiplyScalar(Math.max(1,.8/camera.aspect));move(target.clone().add(offset),target,immediate);$('place-label').textContent='The chainshop approach · after the rain';}else if(name==='washing'){const p=localPoint(founder,-1.5,-6.6),q=localPoint(founder,-1.5,-10.5);const target=new T.Vector3(p[0],ground(...p)+1.4,p[1]);move(new T.Vector3(q[0],ground(...p)+3.2,q[1]),target,immediate);$('place-label').textContent='Wash day · Henry Weaver’s yard';}else if(name==='yard'){const y=ground(-5,7);move(new T.Vector3(-1.5,y+3.2,11),new T.Vector3(-5,y+.5,6.9),immediate);$('place-label').textContent='A working yard · hens and household tasks';}else if(name==='henry')visit(founder,immediate);else if(name==='brook'){$('place-label').textContent='Black Brook · water and woodland';const p=brooks[0].reduce((best,p)=>Math.hypot(p[0]+73,p[1]-70)<Math.hypot(best[0]+73,best[1]-70)?p:best,brooks[0][0]);const target=new T.Vector3(p[0],ground(...p),p[1]);const offset=new T.Vector3(9,5.2,13).multiplyScalar(Math.max(1,.8/camera.aspect));move(target.clone().add(offset),target,immediate);}else if(name==='forge'){$('place-label').textContent='Mushroom Green chainshop';const target=new T.Vector3(forgePos[0],ground(...forgePos)+1.5,forgePos[1]);move(target.clone().add(new T.Vector3(16,3.6,-4).multiplyScalar(Math.max(1,.8/camera.aspect))),target,immediate);}else {$('place-label').textContent='Along Mushroom Green lane';move(new T.Vector3(-59,ground(-59,-59)+4.5,-59),new T.Vector3(-27,ground(-27,-70)+1.3,-70),immediate);}}
const inspection=createInspection(scene,renderer,camera,controls,forgeRoot,weaverShop);
$('enter-house').onclick=()=>{if(selected)stepInside(selected);};
$('visit-yard').onclick=()=>{$('house-panel').hidden=true;selection.visible=false;view('yard');};
$('enter-chainshop').onclick=()=>{tween=null;inspection.enter(founder,'small');};
const reader=householdReader(homes,h=>select(h,true));
function select(h:Home,go=false){inspection.close();rememberPlace({house:h.number,inside:null,floor:null});selected=h;$('house-panel').hidden=false;$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');$('house-number').textContent='HOUSEHOLD / '+String(h.number).padStart(2,'0');reader.show(h);$('house-panel').focus({preventScroll:true});$('enter-house').onclick=()=>stepInside(h);selection.position.set(h.x,h.height+.25,h.z);selection.visible=true;$<HTMLSelectElement>('house-select').value=String(h.number);if(go){$('village-app').dataset.view='house';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));visit(h);}}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>{$('house-panel').hidden=true;selection.visible=false;view(b.dataset.view!);}));$('house-select').addEventListener('change',e=>{const h=homes.find(h=>h.number===Number((e.target as HTMLSelectElement).value));if(h){$('visit-house').onclick=()=>{if(selected){$('house-panel').hidden=true;selection.visible=false;visit(selected);}};select(h,true);};});$('close-house').onclick=()=>{$('house-panel').hidden=true;selection.visible=false;$('house-select').focus();};$('visit-house').onclick=()=>{if(selected){$('house-panel').hidden=true;selection.visible=false;visit(selected);}};$('labels-toggle').onclick=()=>{namesOpen=!namesOpen;$('labels-toggle').setAttribute('aria-pressed',String(namesOpen));};$('map-toggle').onclick=()=>{mapOpen=!mapOpen;overlay.visible=mapOpen;$('map-toggle').setAttribute('aria-pressed',String(mapOpen));};// Rain: the visitor's choice; everything eases in and out together (weather.ts).
const rainUI=()=>{$('rain-toggle').textContent=weather.raining?'Rain':'Clear';$('rain-toggle').setAttribute('aria-pressed',String(weather.raining));};rainUI();
$('rain-toggle').onclick=()=>{weather.raining=!weather.raining;rainUI();};
$('light').onclick=()=>{dusk=!dusk;$('light').textContent=dusk?'Dusk':'Daylight';$('light').setAttribute('aria-pressed',String(dusk));$('village-app').dataset.light=dusk?'dusk':'day';};function pauseUI(){$('motion').textContent=paused?'Play':'Pause';$('motion').setAttribute('aria-pressed',String(paused));$('interior-motion').textContent=paused?'Play':'Pause';$('interior-motion').setAttribute('aria-pressed',String(paused));}pauseUI();$('motion').onclick=$('interior-motion').onclick=()=>{paused=!paused;pauseUI();};
// Synthesised brook, birdsong and anvil (soundscape.ts); starts on the first click or key press.
const anvilWorld=new T.Vector3(),soundscape=createSoundscape(camera,{brooks,surface:streamSurface,canopyAt,anvil:()=>worker.root.localToWorld(anvilWorld.copy(LINK))});
// Speaker icon: waves when sound is on, a cross when muted.
const speaker='<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/>',soundIcon=(on:boolean)=>`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="display:block">${speaker}${on?'<path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>':'<path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'}</svg>`;
const soundUI=()=>{for(const id of ['sound','interior-sound']){const b=$(id),on=soundscape.enabled;b.innerHTML=soundIcon(on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Sound on':'Sound off');b.title=on?'Sound on — brook, birdsong and the chainshop anvil (click to mute)':'Sound off (click to turn on)';}};soundUI();
$('sound').onclick=$('interior-sound').onclick=()=>{soundscape.toggle();soundUI();};$('notes').onclick=()=>{const open=$('notes-panel').hidden;$('notes-panel').hidden=!open;$('house-panel').hidden=true;$('notes').setAttribute('aria-expanded',String(open));};$('close-notes').onclick=()=>{$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');};
const ray=new T.Raycaster();let down:Point=[0,0];renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(inspection.active||roomHome)return;if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(pickTargets)[0];if(hit){if(hit.object.userData.forge){selection.visible=false;$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');$('house-panel').hidden=false;$('house-number').textContent='MUSHROOM GREEN / CHAINSHOP';$('house-name').textContent='The chain workshop';$('enter-house').onclick=()=>{roomHome=null;$('room-controls').hidden=true;rememberPlace({room:null});tween=null;inspection.enter(null,'main');};$('house-description').textContent='A place of fire, iron and hand work. This reconstruction draws on photographs of the surviving Mushroom Green chainshop. Its layout and 1865 appearance are interpreted.';reader.forge();selected=null;$('visit-house').onclick=()=>view('forge');}else{ $('visit-house').onclick=()=>{if(selected){$('house-panel').hidden=true;selection.visible=false;visit(selected);}};select(hit.object.userData.home);}}});controls.addEventListener('start',()=>{tween=null;});renderer.domElement.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();view('village');}if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.75);}if(e.key==='-'){e.preventDefault();zoom(1/.75);}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();(e.shiftKey?turn:pan)(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0);}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){leaveRoom();inspection.close();renderer.domElement.focus();$('house-panel').hidden=true;$('notes-panel').hidden=true;$('notes').setAttribute('aria-expanded','false');selection.visible=false;}});
new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);}).observe(mount);
addEventListener('resize',()=>{const w=mount.clientWidth,h=mount.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);});
const inhabited=inhabitHouses(scene,homes);
const initialPlace=new URLSearchParams(location.search),requestedView=initialPlace.get('view');view(requestedView&&['village','approach','forge','henry','brook','lane','washing','yard','outside','workings','workshops'].includes(requestedView)?requestedView:'village',true);
// Review hook: ?cam=x,y,z,tx,ty,tz fixes an exact outdoor camera for repeatable comparisons.
// Performance inspection: ?debug exposes the scene graph and renderer statistics.
if(initialPlace.has('debug'))Object.assign(window,{__village:{scene,renderer,camera,controls,composer,ao}});
const reviewCamera=initialPlace.get('cam')?.split(',').map(Number);if(reviewCamera?.length===6&&reviewCamera.every(Number.isFinite))move(new T.Vector3(...reviewCamera.slice(0,3)),new T.Vector3(...reviewCamera.slice(3)),true);
// Room layouts for every cottage are planned in a worker and seeded into the cache as they arrive.
{const planner=new Worker(new URL('./plan-worker.ts',import.meta.url),{type:'module'});let remaining=homes.length;
 planner.onmessage=(event:MessageEvent<{number:number;plan:ReturnType<typeof planInterior>}>)=>{const home=homes.find(h=>h.number===event.data.number);if(home)seedInteriorPlan(home,event.data.plan);if(--remaining===0)planner.terminate();};
 planner.onerror=()=>planner.terminate();planner.postMessage(homes.map(h=>({...h})));}
// Compile every shader variant before the village is interactive, so panning never stalls on a first
// appearance: detailed cottages of each style, one furnished room per style and all current materials.
// Split static instanced sets into grid chunks so frustum culling can skip what is off screen
// (tree crowns and trunks stay whole: they are edited at runtime to clear sight lines).
{const chunked=chunkInstances(scene,{exclude:new Set([...crownMeshes,...trunkMeshes])});mount.dataset.instanceChunks=JSON.stringify(chunked);}
// Drop JavaScript copies of static geometry once it is on the GPU (and again for detailed models
// that stream in later); textures follow a few seconds after the village is showing.
const releaseExclude=new Set<T.Object3D>(pickTargets);
mount.dataset.cpuGeometry=JSON.stringify(releaseGeometryAfterUpload(scene,releaseExclude));
const releaseTextures=()=>setTimeout(()=>{mount.dataset.cpuTextures=JSON.stringify(releaseTextureImages(scene,renderer));},4000);
document.addEventListener('village-asset-ready',()=>{releaseGeometryAfterUpload(scene,releaseExclude);releaseTextures();});
stage('before warm-up');$('load-label').textContent='Preparing materials…';
{const shown=highRoots.filter(o=>!o.visible);shown.forEach(o=>o.visible=true);
 try{await renderer.compileAsync(scene,camera);}catch(error){console.warn('Shader warm-up incomplete',error);}
 shown.forEach(o=>o.visible=false);}
// Interiors compile in the background once the village is showing: one furnished room per style,
// built in an off-screen scene and compiled against the village lights, so the first visit is smooth
// without holding up the first view.
setTimeout(async()=>{const warm=new T.Scene();
 const samples=[0,1,2].map(style=>homes.find(h=>h.style===style&&h.number!==chainshopReplacesHouse)).filter((h):h is Home=>!!h).flatMap(h=>planInterior(h).floors.map((_,floor)=>{const room=createInteriors(warm,true);room.show(h,floor);return room;}));
 try{await renderer.compileAsync(warm,camera,scene);}catch(error){console.warn('Interior warm-up incomplete',error);}
 samples.forEach(room=>room.hide());mount.dataset.interiorsWarm='1';},1200);
releaseTextures();stage('ready');document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select').forEach(el=>el.disabled=false);$('loading').hidden=true;$('village-status').textContent='Village loaded. All 59 households are available.';cleanView(new URLSearchParams(location.search).has('clean'));const initialHome=homes.find(h=>h.number===Number(initialPlace.get('house')));if(initialHome){select(initialHome);visit(initialHome,true);if(initialPlace.get('room')==='1')stepInside(initialHome,Number(initialPlace.get('floor')));if(initialPlace.has('inside')){inspection.enter(initialHome,initialPlace.get('inside')==='small'&&initialHome.number===22?'small':initialPlace.get('inside')==='main'||initialHome.number===5?'main':null);const floor=Number(initialPlace.get('floor'));if(floor===1)inspection.setFloor(floor);if(initialPlace.get('worker')==='1')inspection.watchWorker();}}document.documentElement.dataset.villageReady='true';mount.dataset.households=String(homes.length);mount.dataset.renderedCottages=String(houseRoots.filter(o=>o.visible).length);mount.dataset.forgeCount='1';mount.dataset.cottageTypes='3';const lastShadowTarget=new T.Vector3(Infinity,0,0);let shadowSpan=0;let last=performance.now(),frame=0,total=0,lodTimer=1;
document.addEventListener('village-asset-ready',()=>{renderer.shadowMap.needsUpdate=true;});
// At most ~60 frames a second: 120 Hz screens (ProMotion Macs, recent iPhones and iPads) would
// otherwise render every frame twice as often for no visible gain.
let frameGate=0;
// Dynamic resolution, only for devices whose GPU falls behind: after ~1.5 s below ~45 fps the
// render scale steps down (to 62% at most) — but each step is kept only if frames actually get
// ≥10% faster; if the bottleneck is elsewhere (CPU, other apps) it reverts and backs off. After
// ~6 s back at full rate it steps up again. A machine that holds 60 fps never leaves full resolution.
let renderScale=1,slowFor=0,fastFor=0,trial:{from:number;before:number;sum:number;n:number}|null=null,backoff=0,failures=0;
const setRenderScale=(scale:number)=>{renderScale=scale;const ratio=basePixelRatio*scale,w=mount.clientWidth,h=mount.clientHeight;renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);renderer.setSize(w,h);composer.setSize(w,h);mount.dataset.renderScale=scale.toFixed(2);};
let recent=1/60;
function adaptResolution(interval:number){
 if(stillFrame||interval>.25||failures>=3)return;
 recent+=(interval-recent)*.05;
 if(trial){trial.sum+=interval;trial.n++;if(trial.n<90)return;
  const after=trial.sum/trial.n;if(after>trial.before*.9){setRenderScale(trial.from);failures++;backoff=20;}trial=null;slowFor=fastFor=0;return;}
 if(backoff>0){backoff-=interval;return;}
 if(interval>.022){slowFor+=interval;fastFor=0;}else if(interval<.018){fastFor+=interval;slowFor=0;}
 if(slowFor>1.5&&renderScale>.62){trial={from:renderScale,before:recent,sum:0,n:0};setRenderScale(Math.max(.62,renderScale-.12));}
 else if(fastFor>6&&renderScale<1){setRenderScale(Math.min(1,renderScale+.1));fastFor=0;}
}
function animate(now:number){if(now-frameGate<1000/75){requestAnimationFrame(animate);return;}frameGate=now;adaptResolution((now-last)/1000);const real=(now-last)/1000,dt=Math.min(real,.05);last=now;if(!document.hidden){if(!paused)time+=dt*(reduced?.5:1);soundscape.setPaused(paused);soundscape.setDusk(dusk);soundscape.update(time);catFur?.(camera.position);landscape.update(time);foliageTime.value=time;fireTime.value=time;for(const fire of forgeFires)fire.update(time);smallFire.update(time);laundry.update(time);life.update(time);inspection.update(time);const workerVisible=forgeRoot.visible&&camera.position.distanceTo(forgeRoot.position)<80;if(worker.root.visible!==workerVisible)renderer.shadowMap.needsUpdate=true;worker.root.visible=workerVisible;if(workerVisible){worker.update(time);if(!paused)renderer.shadowMap.needsUpdate=true;}if(tween){tween.t+=dt;const r=Math.min(1,tween.t/tween.duration),t=r*r*(3-2*r);camera.position.lerpVectors(tween.from,tween.to,t);controls.target.lerpVectors(tween.fromTarget,tween.target,t);if(r===1)tween=null;}controls.update();updateCompass(camera.quaternion);if(roomHome){const bounded=containRoom(camera.position,controls.target,roomBounds());camera.position.copy(bounded.position);controls.target.copy(bounded.target);}if(!roomHome&&within(camera.position.x,camera.position.z))camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+1.2);if(inhabited.update(camera.position,time,inspection.active))renderer.shadowMap.needsUpdate=true;mount.dataset.inhabitedHomes=String(inhabited.loaded);mount.dataset.inhabitedFloors=String(inhabited.floors);lodTimer+=dt;if(lodTimer>.35){lodTimer=0;let visible=0,shadowDirty=false;const ranked=homes.map((h,i)=>({i,d:Math.hypot(h.x-controls.target.x,h.z-controls.target.z)})).sort((a,b)=>a.d-b.d);const near=new Set(ranked.filter(a=>a.d<85&&camera.position.distanceTo(controls.target)<160).slice(0,18).map(a=>a.i));homes.forEach((h,i)=>{const on=near.has(i)||camera.position.distanceTo(houseRoots[i].position)<20;if(highRoots[i].visible!==on)shadowDirty=true;highRoots[i].visible=on;lowRoots[i].visible=!on;if(on)visible++;});mount.dataset.detailedHomes=String(visible);
const target=controls.target;const distance=camera.position.distanceTo(target);
// Remove only foreground crowns from close house views; restore them when the camera moves.
const sight=new T.Line3(camera.position,target),closest=new T.Vector3(),zero=new T.Matrix4().makeScale(0,0,0);
for(const tree of crownRecords){const t=sight.closestPointToPointParameter(tree.center,true);sight.at(t,closest);const hide=!inspection.active&&distance<80&&t>.03&&t<.94&&tree.center.distanceTo(closest)<tree.radius;
if(hide!==tree.hidden){tree.hidden=hide;crownMeshes[tree.kind].setMatrixAt(tree.slot,hide?zero:tree.matrix);crownMeshes[tree.kind].instanceMatrix.needsUpdate=true;trunkMeshes[tree.trunkMesh].setMatrixAt(tree.trunk,hide?zero:tree.matrix);trunkMeshes[tree.trunkMesh].instanceMatrix.needsUpdate=true;shadowDirty=true;}}
// Industrial haze rather than mist: the subject stays clear and the far country fades over half a kilometre.
fogBase.near=Math.max(40,distance+25);fogBase.far=Math.max(560,distance+520);// The shadow frustum moves in steps of span/16 (a whole number of shadow texels) and is widened by one
// step, so it always covers the view. Re-rendering 4096² shadows only when a step is crossed removes
// most panning hitches, and texel-aligned steps stop shadow edges shimmering while the camera moves.
const span=camera.position.distanceTo(target)>140?200:38,step=span/16,texel=2*(span+step)/sun.shadow.mapSize.x;
const snapped=new T.Vector3(Math.round(target.x/step)*step,Math.round(target.y/texel)*texel,Math.round(target.z/step)*step);
sun.target.position.copy(snapped);sun.position.set(snapped.x+34,snapped.y+58,snapped.z+96);Object.assign(sun.shadow.camera,{left:-span-step,right:span+step,top:span+step,bottom:-span-step});sun.shadow.camera.updateProjectionMatrix();
if(shadowDirty||snapped.distanceToSquared(lastShadowTarget)>1e-6||shadowSpan!==span){renderer.shadowMap.needsUpdate=true;lastShadowTarget.copy(snapped);shadowSpan=span;}}
lightAmount=T.MathUtils.damp(lightAmount,dusk?1:0,3,dt);landscape.waterMaterial.envMapIntensity=.3*(1-.7*lightAmount);sun.color.set('#ffe4bf');const sheltered=inspection.active||!!roomHome;weather.update(time,dt,camera,sheltered);const rain=weather.amount;soundscape.setRain(rain,sheltered);
// A shower dims the sun and softens the shadows' contrast.
sun.intensity=T.MathUtils.lerp(3.9,.35,lightAmount)*(1-.68*rain);hemi.intensity=T.MathUtils.lerp(1.5,.75,lightAmount)*(1-.1*rain);
// Rain thickens the haze beyond the subject only: fog still starts just past what you look at.
(scene.fog as T.Fog).near=fogBase.near;(scene.fog as T.Fog).far=fogBase.far-(fogBase.far-fogBase.near)*.5*rain;showcase.glow.intensity=18+Math.sin(time*8)*.7;for(const m of windowMaterials){m.emissive.set('#a16635');m.emissiveIntensity=.10+lightAmount*.65;}const haze=sky.update(camera,sun.position.clone().sub(sun.target.position),lightAmount,time,rain);// Cutaway inspections isolate one building: frame it against a dark, warm backdrop, not an empty pale void.
if(inspection.active){(scene.background as T.Color).set('#26231f');(scene.fog as T.Fog).color.set('#26231f');sky.dome.visible=false;}else{(scene.background as T.Color).copy(haze);(scene.fog as T.Fog).color.copy(haze);sky.dome.visible=true;}
{const positions:T.Vector3[]=[],shapes:number[][]=[];
smoke.forEach(({p,phase,draw,rate},i)=>{const age=(time*.45*rate+phase)%8;const size=.5+age*.34+age*age*.035;const curl=Math.sin(age*1.6+phase)*.16*age;const gust=.8+.3*Math.sin(time*.13+phase*.1);const point=p.clone().add(new T.Vector3((age*.3+age*age*.05)*gust+curl,age*.55-age*age*.012,(-age*.16-age*age*.02)*gust+Math.cos(age+phase)*age*.06));positions.push(point);shapes.push([size*(1+.12*Math.sin(age+phase)),size*.8,phase+age*.12,Math.min(1,age*.9)*Math.pow(1-age/8,1.6)*.8*draw]);smokeDepth[i]=smokePoint.copy(point).applyMatrix4(camera.matrixWorldInverse).z;});
smokeOrder.sort((a,b)=>smokeDepth[a]-smokeDepth[b]);smokeOrder.forEach((index,slot)=>{const q=positions[index];smokeOffset.setXYZ(slot,q.x,q.y,q.z);smokeShape.setXYZW(slot,...shapes[index] as [number,number,number,number]);});
smokeOffset.needsUpdate=smokeShape.needsUpdate=true;}
updateHouseLabels(camera,namesOpen,mapOpen,inspection.active||!!roomHome||$('village-app').dataset.clean==='true',mount.clientWidth,mount.clientHeight);
ao.enabled=!lite&&!inspection.workshopActive&&camera.position.distanceTo(controls.target)<130;aoCamera.copy(camera);aoCamera.layers.set(0);updateLightPool(camera);if(!inspection.active)landscape.reflect(renderer,camera,controls.target);composer.render();renderer.shadowMap.autoUpdate=false;
if(savePicture){
  savePicture=false;const aspect=camera.aspect,pixelRatio=renderer.getPixelRatio();
  camera.aspect=16/9;camera.updateProjectionMatrix();renderer.setPixelRatio(1);composer.setPixelRatio(1);renderer.setSize(1920,1080,false);composer.setSize(1920,1080);landscape.reflect(renderer,camera,controls.target,true);composer.render();
  renderer.domElement.toBlob(blob=>{if(!blob){$('village-status').textContent='Could not create the picture. Try again.';return;}const image=$<HTMLImageElement>('picture-image');if(image.src.startsWith('blob:'))URL.revokeObjectURL(image.src);const picture=URL.createObjectURL(blob);image.src=picture;const download=$<HTMLAnchorElement>('picture-download');download.href=picture;download.download='mushroom-green-'+($('village-app').dataset.view||'village')+'.png';$<HTMLDialogElement>('picture-preview').showModal();$('village-status').textContent='Picture ready to download.';},'image/png');
  camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setPixelRatio(pixelRatio);composer.setPixelRatio(pixelRatio);renderer.setSize(mount.clientWidth,mount.clientHeight);composer.setSize(mount.clientWidth,mount.clientHeight);
}
frame++;total+=real;if(frame%60===0){mount.dataset.surfaceTextureMemory=JSON.stringify(maintainMaterialTextures());mount.dataset.gpuTextures=String(renderer.info.memory.textures);}if(frame%120===0){mount.dataset.fps=String(Math.round(frame/total));mount.dataset.drawCalls=String(renderer.info.render.calls);}}
requestAnimationFrame(animate);}requestAnimationFrame(animate);
// Out of GPU memory: switch this device to lite mode once and reload, rather than stopping.
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;
 if(!lite){let stored=false;try{localStorage.setItem('mg-lite','1');stored=true;}catch{/* storage blocked */}
  $('load-label').textContent='Switching to lighter graphics for this device…';setTimeout(()=>{const u=new URL(location.href);if(!stored)u.searchParams.set('lite','1');location.replace(u.toString());},900);return;}
 $('load-label').textContent='Graphics paused. Reload to return to the village.';});
}
start().catch(error=>{console.error('Village could not load',error);$('loading').hidden=false;$('load-label').textContent='The village could not load. Reload to try again.';$('village-status').textContent='Village loading failed.';});
