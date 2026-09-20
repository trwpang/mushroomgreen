import * as T from 'three';

// One atlas for all streamed rooms. Room disposal must not release this shared texture.
const shared=new Map<string,{texture:T.Texture;ready:{value:number}}>();
export function sharedMaterialTexture(url:string){
 const cached=shared.get(url);if(cached)return cached;
 const ready={value:0};
 const texture=typeof window==='undefined'
  ?new T.DataTexture(new Uint8Array([128,128,128,255]),1,1)
  :new T.TextureLoader().load(url,()=>{ready.value=1;});
 texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=8;
 texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
 const entry={texture,ready};shared.set(url,entry);return entry;
}

export function workedMaterials(kind:'clay-oak'|'lime-linen'='clay-oak'){return sharedMaterialTexture(`/interior-materials/${kind==='clay-oak'?'worked-clay-oak':'lime-linen'}-v1.webp`);}
