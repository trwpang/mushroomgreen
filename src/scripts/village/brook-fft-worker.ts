/// <reference lib="webworker" />
import {createBrookSpectrum,computeBrookSurface,FFT_SIZE} from './brook-fft';
// Computes the three cascades for each requested time and hands the buffers back (transferred).
const spec=createBrookSpectrum();
self.onmessage=(event:MessageEvent<{t:number;buffers:ArrayBuffer[]}>)=>{
 const {t,buffers}=event.data,out=buffers.map(b=>new Uint16Array(b));
 if(out.some(b=>b.length!==FFT_SIZE*FFT_SIZE*4))return;
 computeBrookSurface(spec,t,out);
 (self as unknown as Worker).postMessage({t,buffers},buffers);
};
