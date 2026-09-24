import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

/** Restrained print-like colour separation, fused into the existing output pass. */
export function cinematicOutput(){
 const pass=new OutputPass();
 pass.material.fragmentShader=pass.material.fragmentShader.replace('// color space',`
  // Work in display-linear light, before the single sRGB conversion. Keep
  // readable shadows, neutral plaster and the warm core of the working fire.
  float printLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
  vec3 printBalance=mix(vec3(.964,.988,1.024),vec3(1.028,1.010,.982),smoothstep(.045,.72,printLuma));
  gl_FragColor.rgb*=printBalance;
  gl_FragColor.rgb=mix(vec3(printLuma),gl_FragColor.rgb,1.04);
  // Gentle filmic S-curve for depth separation between dark materials, then a soft lens vignette.
  vec3 printC=clamp(gl_FragColor.rgb,0.,1.);
  gl_FragColor.rgb=mix(gl_FragColor.rgb,printC*printC*(3.-2.*printC),.07);
  vec2 printV=vUv-.5;gl_FragColor.rgb*=1.-dot(printV,printV)*.22;
  // color space`);
 return pass;
}
