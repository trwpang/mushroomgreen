// Inspect a downloaded character without changing it or admitting it to public/.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {validateBytes} from 'gltf-validator';
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input) throw new Error('Usage: node scripts/chainmaker/inspect-import.mjs INPUT.glb [REPORT.json]');
const bytes = await readFile(input);
if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('Input is not a binary glTF file');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const doc = await io.readBinary(bytes);
const root = doc.getRoot();
let triangles = 0;
let finite = true;
const meshes = root.listMeshes().map(mesh => ({
  name: mesh.getName(),
  primitives: mesh.listPrimitives().map(primitive => {
    const positions = primitive.getAttribute('POSITION');
    if (!positions) throw new Error('Mesh has no positions');
    finite &&= positions.getArray().every(Number.isFinite);
    const count = primitive.getIndices()?.getCount() ?? positions.getCount();
    if (primitive.getMode() === 4) triangles += count / 3;
    return {vertices: positions.getCount(), mode: primitive.getMode(), skinAttributes: ['JOINTS_0', 'WEIGHTS_0'].every(name => primitive.getAttribute(name))};
  }),
}));
const textures = await Promise.all(root.listTextures().map(async texture => {
  const image = texture.getImage();
  const metadata = image ? await sharp(image).metadata() : {};
  return {name: texture.getName(), mimeType: texture.getMimeType(), bytes: image?.length ?? 0, width: metadata.width, height: metadata.height};
}));
const rigWarnings = [];
for (const skin of root.listSkins()) {
  const joints = skin.listJoints();
  const origins = joints.map(joint => joint.getWorldMatrix().slice(12, 15));
  if (origins.length > 1 && origins.every(p => p.every((v, axis) => Math.abs(v - origins[0][axis]) < 1e-6))) {
    rigWarnings.push('All joints have the same world origin. This is not a usable humanoid rest pose.');
  }
}
for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
  const joints = primitive.getAttribute('JOINTS_0'), weights = primitive.getAttribute('WEIGHTS_0');
  if (!joints || !weights) continue;
  const dominant = new Map();
  for (let i = 0; i < joints.getCount(); i++) {
    const js = joints.getElement(i, []), ws = weights.getElement(i, []);
    const joint = js[ws.indexOf(Math.max(...ws))];
    dominant.set(joint, (dominant.get(joint) ?? 0) + 1);
  }
  const largestShare = Math.max(...dominant.values()) / joints.getCount();
  if (largestShare > .98) rigWarnings.push(`${(largestShare * 100).toFixed(2)}% of vertices follow one joint; inspect the skin weights.`);
}
const validation = await validateBytes(bytes, {maxIssues: 60});
const report = {
  source: input, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
  triangles, finitePositions: finite, meshes,
  skins: root.listSkins().map(skin => ({name: skin.getName(), joints: skin.listJoints().map(joint => joint.getName())})),
  animations: root.listAnimations().map(animation => ({name: animation.getName(), channels: animation.listChannels().length})),
  textures, rigWarnings, validation: validation.issues,
  withinCurrentRuntimeBudget: bytes.length <= 4_000_000 && triangles <= 120_000,
  note: 'Static inspection only. Visual anatomy, rig deformation, scale, licensing and tool contact require separate review.',
};
if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!finite || validation.issues.numErrors || rigWarnings.length) process.exitCode = 1;
