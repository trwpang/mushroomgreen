import * as T from 'three';
/**
 * three.js gives a PCF shadow map a full RGBA colour target beside its depth texture, but PCF
 * reads only the depth. At 4096² that colour target is 64 MB of GPU memory that nothing samples.
 * Creating the map up front with a one-channel colour target (16 MB) leaves the shadows identical:
 * three.js keeps an existing map as long as the shadow type does not change.
 */
export function leanShadowMap(light:T.DirectionalLight|T.SpotLight){
 const {x,y}=light.shadow.mapSize,map=new T.WebGLRenderTarget(x,y,{format:T.RedFormat});
 const depth=new T.DepthTexture(x,y,T.UnsignedIntType);depth.format=T.DepthFormat;depth.compareFunction=T.LessEqualCompare;depth.minFilter=depth.magFilter=T.LinearFilter;
 map.texture.name=depth.name=light.name+'.shadowMap';map.depthTexture=depth;light.shadow.map=map;
}
