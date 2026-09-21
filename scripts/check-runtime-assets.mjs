import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
for(const [folder,file,budget]of [['forge','mushroom-green-forge.glb',12_000_000],['village','cottages.glb',16_000_000],['chainmaker','chainmaker.glb',4_000_000],['chainmaker-v2','chainmaker.glb',4_000_000],['interior-objects','catalogue.glb',6_000_000]]){
 const base=new URL(`../public/${folder}/`,import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('asset-manifest.json',base),'utf8'));
 const bytes=await readFile(new URL(file,base));
 assert.equal(manifest.validationErrors,0,`${folder}: run the complete model build and validation`);
 assert.equal(manifest.compression,'EXT_meshopt_compression',`${folder}: an uncompressed export must not be served`);
 assert.equal(manifest.bytes,bytes.length,`${folder}: asset size differs from its validation receipt`);
 assert.equal(manifest.sha256,createHash('sha256').update(bytes).digest('hex'),`${folder}: asset differs from its validated hash`);
 if(manifest.sourceHashes)for(const [path,hash]of Object.entries(manifest.sourceHashes))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,`${folder}: source changed; regenerate its export`);
 assert.ok(bytes.length<=budget,`${folder}: asset exceeds its download budget`);
 console.log(`${folder}: validated asset, ${(bytes.length/1e6).toFixed(2)} MB`);
}
