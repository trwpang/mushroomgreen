import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, meshopt, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { validateBytes } from 'gltf-validator';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const path = new URL('../../public/forge/mushroom-green-forge.glb', import.meta.url);
const manifestPath = new URL('../../public/forge/asset-manifest.json', import.meta.url);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});
const original = await readFile(new URL('../../artifacts/forge/raw/mushroom-green-forge.glb', import.meta.url));
const previousManifest = JSON.parse(await readFile(new URL('../../artifacts/forge/raw/asset-manifest.json', import.meta.url), 'utf8'));
const document = await io.readBinary(original);
await document.transform(dedup(), weld(), prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, slots: /baseColorTexture/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 86, slots: /normalTexture|metallicRoughnessTexture/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }));
const bytes = await io.writeBinary(document);
const report = await validateBytes(bytes, { maxIssues: 100 });
// Khronos cannot decode EXT_meshopt_compression. Also check the decoded document.
const decoded = await io.readBinary(bytes);
let triangles = 0;
for (const mesh of decoded.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    const positions = primitive.getAttribute('POSITION');
    if (!positions || !positions.getArray().every(Number.isFinite)) throw new Error('Invalid vertex positions');
    const indices = primitive.getIndices();
    if (indices && !indices.getArray().every(i => i < positions.getCount())) throw new Error('Invalid triangle indices');
    triangles += (indices?.getCount() ?? positions.getCount()) / 3;
  }
}
if (report.issues.numErrors) throw new Error(JSON.stringify(report.issues));
if (triangles > 600_000 || bytes.length > 12_000_000) throw new Error(`Asset exceeds the single-forge budget: ${bytes.length} bytes, ${triangles} triangles`);
await writeFile(new URL('../../artifacts/forge/gltf-validation.json', import.meta.url), JSON.stringify({
  khronos: report,
  decodedChecks: { finitePositions: true, validIndices: true, triangles },
  budget: { maxTriangles: 600_000, maxBytes: 12_000_000 },
}, null, 2));
const temporary = new URL(path.href + '.tmp');
await writeFile(temporary, bytes);
await rename(temporary, path);
const manifest = {...previousManifest};
Object.assign(manifest, {
  uncompressedBytes: previousManifest.uncompressedBytes ?? original.length,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  compression: 'EXT_meshopt_compression',
  triangles,
  meshBatches: decoded.getRoot().listMeshes().length,
  validationErrors: report.issues.numErrors,
});
const manifestTemporary=new URL(manifestPath.href+'.tmp');
await writeFile(manifestTemporary, JSON.stringify(manifest, null, 2) + '\n');
await rename(manifestTemporary,manifestPath);
console.log(JSON.stringify({ before: original.length, after: bytes.length, triangles, validationErrors: report.issues.numErrors }));
