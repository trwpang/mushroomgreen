import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, meshopt, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { validateBytes } from 'gltf-validator';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const path = new URL('../../public/village/cottages.glb', import.meta.url);
const manifestPath = new URL('../../public/village/asset-manifest.json', import.meta.url);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});
const original = await readFile(path);
const previousManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const document = await io.readBinary(original);
await document.transform(dedup(), weld(), prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 86, slots: /baseColorTexture/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, slots: /normalTexture|metallicRoughnessTexture/ }),
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
if (triangles > 600_000 || bytes.length > 16_000_000) throw new Error(`Asset exceeds the single-forge budget: ${bytes.length} bytes, ${triangles} triangles`);
await writeFile(new URL('../../artifacts/village/gltf-validation.json', import.meta.url), JSON.stringify({
  khronos: report,
  decodedChecks: { finitePositions: true, validIndices: true, triangles },
  budget: { maxTriangles: 600_000, maxBytes: 16_000_000 },
}, null, 2));
const temporary = new URL(path.href + '.tmp');
await writeFile(temporary, bytes);
await rename(temporary, path);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
Object.assign(manifest, {
  uncompressedBytes: previousManifest.uncompressedBytes ?? original.length,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  compression: 'EXT_meshopt_compression',
  triangles,
  meshBatches: decoded.getRoot().listMeshes().length,
  validationErrors: report.issues.numErrors,
});
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ before: original.length, after: bytes.length, triangles, validationErrors: report.issues.numErrors }));
