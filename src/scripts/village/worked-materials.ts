import * as T from 'three';
import {rgbaMipBytes,TextureResidency} from './texture-residency';

const paths=['/interior-materials/worked-clay-oak-v1.webp','/interior-materials/lime-linen-v1.webp',...['brick-mortar','slate-bark','iron-tin','pottery-endgrain'].map(n=>`/surface-textures/${n}-v1.webp`)];
const fallback=new T.DataTexture(new Uint8Array([128,128,128,255]),1,1);fallback.colorSpace=T.SRGBColorSpace;fallback.needsUpdate=true;
const cache=new TextureResidency<T.Texture>({fallback,budget:64*1024*1024,now:()=>performance.now(),bytes:url=>{
 if(!paths.includes(url))throw Error('Register dimensions before loading a new surface atlas: '+url);
 return rgbaMipBytes(1774,887);
},release:t=>{t.dispose();t.image=null;},load:async url=>{
 const t=await new T.TextureLoader().loadAsync(url);
 if(t.image.width!==1774||t.image.height!==887){t.dispose();throw Error('Surface atlas dimensions changed without a memory budget update');}
 t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return t;
}});
const bindings=new WeakMap<T.Material,Set<string>>();
const nodeSlot={uniform:{value:fallback},ready:{value:0}};
/** Stable slots survive eviction and reload without recompiling each household material. */
export function bindMaterialAtlas(material:T.Material,shader:{uniforms:Record<string,unknown>},textureName:string,readyName:string,url:string){
 const entry=typeof window==='undefined'?nodeSlot:cache.use(url);
 shader.uniforms[textureName]=entry.uniform;shader.uniforms[readyName]=entry.ready;
 let urls=bindings.get(material);
 if(!urls){urls=new Set();bindings.set(material,urls);const previous=material.onBeforeRender;
  material.onBeforeRender=function(...args){previous.apply(this,args);if(typeof window!=='undefined')for(const path of urls!)cache.use(path);};
 }
 urls.add(url);
}
export function domesticAtlas(kind:'clay-oak'|'lime-linen'='clay-oak'){return `/interior-materials/${kind==='clay-oak'?'worked-clay-oak':'lime-linen'}-v1.webp`;}
export function maintainMaterialTextures(){cache.tick();return cache.stats;}
export function disposeMaterialTextures(){cache.dispose();fallback.dispose();}
