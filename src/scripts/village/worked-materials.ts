import * as T from 'three';

// One atlas for all streamed rooms. Room disposal must not release this shared texture.
let shared:{texture:T.Texture;ready:{value:number}}|undefined;
export function workedMaterials(){
 if(shared)return shared;
 const ready={value:0};
 const texture=typeof window==='undefined'
  ?new T.DataTexture(new Uint8Array([128,128,128,255]),1,1)
  :new T.TextureLoader().load('/interior-materials/worked-clay-oak-v1.webp',()=>{ready.value=1;});
 texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=8;
 texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
 shared={texture,ready};return shared;
}
