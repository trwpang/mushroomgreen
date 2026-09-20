import assert from 'node:assert/strict';
import {TextureResidency,rgbaMipBytes} from '../../src/scripts/village/texture-residency';
let now=0;const freed:string[]=[],requests=new Map<string,{resolve:(r:string)=>void;reject:()=>void}>();
const cache=new TextureResidency<string>({fallback:'fallback',budget:20,bytes:()=>10,now:()=>now,release:r=>freed.push(r),load:url=>new Promise((resolve,reject)=>requests.set(url,{resolve,reject})),idleMs:30000,activeMs:2000});
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const a=cache.use('a'),aUniform=a.uniform;cache.use('a');const b=cache.use('b');cache.use('c');await flush();
assert.equal(requests.size,2);assert.equal(cache.stats.reservedBytes,20);assert.equal(cache.stats.queued,1);
requests.get('a')!.resolve('A');requests.get('b')!.resolve('B');await flush();
assert.equal(cache.stats.residentBytes,20);assert.equal(a.ready.value,1);assert.equal(cache.stats.loading,0);
// Visible materials stay resident. A queued atlas waits until an older one is unused.
now=3000;cache.use('b');cache.tick();await flush();assert.deepEqual(freed,['A']);assert.equal(a.uniform,aUniform);assert.equal(a.uniform.value,'fallback');assert.equal(a.ready.value,0);
requests.get('c')!.resolve('C');await flush();assert.equal(cache.stats.residentBytes,20);
// Returning to an evicted surface reloads through the original shader slot.
now=6000;cache.use('a');await flush();requests.get('a')!.resolve('A2');await flush();assert.equal(a.uniform,aUniform);assert.equal(a.uniform.value,'A2');
now=40001;cache.tick();assert.equal(cache.stats.residentBytes,0);assert.equal(b.ready.value,0);
// Failed downloads have a cooldown, and late downloads cannot resurrect disposed GPU resources.
const fail=cache.use('bad');await flush();requests.get('bad')!.reject();await flush();assert.equal(fail.state,'failed');cache.use('bad');assert.equal(fail.state,'failed');
cache.use('late');await flush();cache.dispose();requests.get('late')!.resolve('late-resource');await flush();assert(freed.includes('late-resource'));assert.equal(cache.stats.residentBytes,0);
assert.equal(rgbaMipBytes(2,2),20);assert.equal(rgbaMipBytes(1,1),4);assert(rgbaMipBytes(1774,887)<8.1*1024*1024);
console.log('Texture residency passed: deduplication, reserved budget, bounded concurrency, visible protection, eviction/reload, failure cooldown and late-load disposal.');
