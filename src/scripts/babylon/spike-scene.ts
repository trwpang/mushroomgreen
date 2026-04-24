import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { buildGround, paintRoads } from './ground';
import { latLngToScene } from './projection';
import { loadBuildingTemplates, placeCottage } from './building';
import { loadPropTemplates, attachProps, attachForgeSmoke } from './props';

const canvas = document.getElementById('babylon-root') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('babylon-spike: #babylon-root canvas missing');
}

interface SceneData {
  clusters: Array<{ id: number; centroid: [number, number]; members: number[]; primaryFamily: string; spriteKey: string; hasForge: boolean }>;
  brook: [number, number][];
  roads: Array<{ polyline: [number, number][] }>;
  boundary: [number, number][];
  byNumber: Record<number, { name: string; family: string; id: string }>;
}

void (async () => {
  try {
  const dataEl = document.getElementById('scene-data');
  if (!dataEl || !dataEl.textContent) {
    throw new Error('babylon-spike: #scene-data payload missing');
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

  // Fit camera to the boundary extent so tiles/cottages land in frame.
  // Task 9 narrows this to clusters-only; Task 5 uses the full boundary.
  const boundaryPts = data.boundary.map(([lat, lng]) => latLngToScene(lat, lng));
  const boundsX = boundaryPts.map((p) => p.x);
  const boundsZ = boundaryPts.map((p) => p.z);
  const extentX = Math.max(...boundsX) - Math.min(...boundsX);
  const extentZ = Math.max(...boundsZ) - Math.min(...boundsZ);
  // Iso projection rotates tiles so the diagonal (x+z direction) becomes
  // camera-vertical — world extents mix into both view axes. Use the sum
  // divided by 2 as a conservative half-extent with 20% pad.
  const halfExtent = Math.max(extentX, extentZ) * 0.6 + Math.min(extentX, extentZ) * 0.4;
  function fitOrtho(h: number): void {
    const aspect = engine.getAspectRatio(camera);
    camera.orthoTop = h;
    camera.orthoBottom = -h;
    camera.orthoLeft = -h * aspect;
    camera.orthoRight = h * aspect;
  }
  fitOrtho(halfExtent);
  window.addEventListener('resize', () => { engine.resize(); fitOrtho(halfExtent); });

  new HemisphericLight('hemi', new Vector3(0, 1, 0), scene).intensity = 0.75;
  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3).normalize(), scene);
  sun.intensity = 0.6;

  await buildGround(scene, data.boundary);
  paintRoads(scene, data.roads);

  // Tasks 8-9-10-13: place 6 cottages at cluster centroids with props +
  // smoke on the hero forge (first cluster with hasForge=true).
  const buildingTemplates = loadBuildingTemplates(scene);
  const propTemplates = loadPropTemplates(scene);
  let heroForgeAttached = false;
  for (const cluster of data.clusters) {
    const { x, z } = latLngToScene(cluster.centroid[0], cluster.centroid[1]);
    const cottage = placeCottage(scene, buildingTemplates, { x, z }, String(cluster.id), {
      clusterId: cluster.id,
      primaryFamily: cluster.primaryFamily,
      memberCount: cluster.members.length,
      members: cluster.members,
    });
    attachProps(scene, propTemplates, cottage, String(cluster.id));
    if (cluster.hasForge && !heroForgeAttached) {
      attachForgeSmoke(scene, cottage, String(cluster.id));
      heroForgeAttached = true;
    }
  }

  // DEBUG: expose for inspection while the ground+cottages are being wired
  (window as unknown as Record<string, unknown>).__babylon = { engine, scene, camera };

  engine.runRenderLoop(() => scene.render());
  } catch (err) {
    console.error('babylon-spike boot error:', err);
    (window as unknown as Record<string, unknown>).__bootError = String(err) + '\n' + (err as Error)?.stack;
  }
})();
