import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

const canvas = document.getElementById('babylon-root') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('babylon-spike: #babylon-root canvas missing');
}

const dataEl = document.getElementById('scene-data');
if (!dataEl || !dataEl.textContent) {
  throw new Error('babylon-spike: #scene-data payload missing');
}
interface SceneData {
  clusters: Array<{ id: number; centroid: [number, number]; members: number[]; primaryFamily: string; spriteKey: string; hasForge: boolean }>;
  brook: [number, number][];
  roads: Array<{ polyline: [number, number][] }>;
  boundary: [number, number][];
  byNumber: Record<number, { name: string; family: string; id: string }>;
}
const data: SceneData = JSON.parse(dataEl.textContent);
console.log(
  `babylon-spike: loaded ${data.clusters.length} clusters, ${data.clusters.length} selected for spike, ` +
  `brook ${data.brook.length} pts, roads ${data.roads.length} pts, boundary ${data.boundary.length} pts`,
);

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(140 / 255, 180 / 255, 89 / 255, 1);

// Orthographic ArcRotateCamera — classic 2:1 iso look
const camera = new ArcRotateCamera(
  'camera',
  -Math.PI / 4,       // alpha (azimuth) — rotates on arrow keys later
  Math.PI / 3,        // beta (elevation from Y axis; 60° from vertical = 30° from horizontal)
  50,
  Vector3.Zero(),
  scene,
);
camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
// Babylon 8.x does not auto-bind the first camera as activeCamera when using
// modular imports — scene.render() stays a no-op until we set it explicitly.
scene.activeCamera = camera;

function fitOrtho(halfExtent: number): void {
  const aspect = engine.getAspectRatio(camera);
  camera.orthoTop = halfExtent;
  camera.orthoBottom = -halfExtent;
  camera.orthoLeft = -halfExtent * aspect;
  camera.orthoRight = halfExtent * aspect;
}
fitOrtho(6);
window.addEventListener('resize', () => { engine.resize(); fitOrtho(6); });

new HemisphericLight('hemi', new Vector3(0, 1, 0), scene).intensity = 0.75;
const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3).normalize(), scene);
sun.intensity = 0.6;

// Test cube — removed in Task 5 once the ground replaces it.
// Babylon 8.x modular imports don't auto-attach a default material, so
// we create a StandardMaterial explicitly or the mesh renders invisibly.
const testCube = MeshBuilder.CreateBox('test-cube', { size: 2 }, scene);
const cubeMat = new StandardMaterial('mat-test-cube', scene);
cubeMat.diffuseColor = new Color3(0.7, 0.7, 0.7);
testCube.material = cubeMat;

engine.runRenderLoop(() => scene.render());
