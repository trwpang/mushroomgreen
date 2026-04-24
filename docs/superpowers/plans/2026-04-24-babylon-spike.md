# Babylon.js village spike — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note:** Coding is delegated to Codex (see `codex:codex-rescue` subagent / `codex:rescue` skill). Blender work is driven through the `ahujasid/blender-mcp` server. Claude orchestrates — it does not write code directly.

**Goal:** Build `/babylon-spike` — a Babylon.js 3D painterly village that clears the `/phaser-spike` ceiling toward Townscaper-level quality. De-risk the engine switch before committing to the production build.

**Architecture:** Babylon.js 8.x with an orthographic `ArcRotateCamera` mounted in an Astro route. Assets authored in Blender via MCP, exported as glTF, imported with `SceneLoader`. Corner-modular cottages (4 rotated instances of one corner mesh + roof + props) on an iso-diamond tile ground. Brook as a polyline ribbon with UV-scroll shader on tile edges (dual-graph placement per Oscar Stålberg's Townscaper rule). Camera rotates 4 cardinal angles via arrow keys.

**Tech Stack:** Astro 5 + TypeScript 5.6 + Babylon.js 8.x (`@babylonjs/core` + `@babylonjs/loaders`) + Blender MCP (`ahujasid/blender-mcp`) + existing project data (`src/data/clusters.json`, `src/data/brook.json`, `src/data/roads.json`, `src/content/households/`).

**Verification discipline:** The spec explicitly excludes unit tests — verification is visual, via `browser-harness` screenshots and manual checks at `http://localhost:4321/babylon-spike`. TDD is adapted: each task defines the **visual/functional check** that it must pass, confirms it currently fails, implements, confirms it passes, then commits. This preserves test-first rigour without inventing test harnesses the spec forbade.

---

## File map

```
src/pages/babylon-spike.astro                   route + BaseLayout + <canvas> + JSON data bridge
src/scripts/babylon/spike-scene.ts              entry — engine, scene, camera, lights, boot
src/scripts/babylon/ground.ts                   iso diamond tile grid + dual-graph path routing
src/scripts/babylon/building.ts                 corner-modular cottage assembly
src/scripts/babylon/brook.ts                    polyline ribbon + UV-scroll water shader
src/scripts/babylon/props.ts                    chimney / door / window / smoke placement
src/scripts/babylon/interactions.ts             pointer hover, tooltip DOM, click → /households/[id]/
src/scripts/babylon/rotation.ts                 keyboard camera rotation (Arrow keys, 4 angles)
src/scripts/babylon/projection.ts               latLng → scene-space (x, z) helpers

public/babylon-sprites/                         gitignored, Blender-MCP-produced glTFs
  tile-grass.glb
  tile-dirt-path.glb
  cottage-corner.glb
  cottage-roof.glb
  prop-chimney.glb
  prop-door.glb
  prop-window.glb
  prop-smoke-emitter.glb                        (optional — task 13 uses Babylon.ParticleSystem if model route is noisy)
```

Each module has one responsibility. Modules communicate through plain object returns — no classes beyond the Scene itself. Scene lifecycle (dispose) is handled by the Astro route unmount.

---

## Pre-flight

Before Task 1, verify these prerequisites are available. If any fail, stop and surface to Tom.

- [ ] **P1: Node and npm present.** Run `node --version && npm --version`. Expected: Node ≥ 20, npm ≥ 10.
- [ ] **P2: Astro dev server currently works.** Run `npm run dev`, confirm `/` and `/phaser-spike` load with no console errors. Kill the server.
- [ ] **P3: Blender MCP available.** Run `claude mcp list` (or equivalent agent-side check) and confirm a Blender MCP server is connected. If not, install `ahujasid/blender-mcp` per [its README](https://github.com/ahujasid/blender-mcp) and restart Blender with the MCP addon enabled.
- [ ] **P4: browser-harness available.** Run `command -v browser-harness`. Expected: path to binary. Install per `~/Developer/browser-harness/install.md` if missing.

---

## Task 1: Install Babylon and scaffold /babylon-spike route

**Files:**
- Modify: `package.json` (add `@babylonjs/core` and `@babylonjs/loaders` to `dependencies`)
- Modify: `.gitignore` (add `public/babylon-sprites/`)
- Create: `src/pages/babylon-spike.astro`
- Create: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

The check for this task: navigating to `http://localhost:4321/babylon-spike` returns HTTP 200 and renders a full-viewport canvas with a solid warm-green fill. Console shows zero errors. `/` and `/phaser-spike` still work identically.

- [ ] **Step 2: Confirm it currently fails**

Run `npm run dev` and visit `http://localhost:4321/babylon-spike`. Expected: **404**. That's the failing state.

- [ ] **Step 3: Install Babylon deps**

```bash
npm install @babylonjs/core @babylonjs/loaders
```

Expected: both packages appear in `package.json` `dependencies`. No errors.

- [ ] **Step 4: Ignore the upcoming sprite directory**

Append to `.gitignore`:

```
# Babylon spike assets — local only, not deployed
public/babylon-sprites/
```

- [ ] **Step 5: Create src/pages/babylon-spike.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';

const sceneData = {
  clusters: [],
  brook: [],
  roads: [],
  boundary: [],
  byNumber: {},
};
---

<BaseLayout title="Babylon Spike — Mushroom Green">
  <canvas id="babylon-root" style="width:100vw;height:100vh;display:block;"></canvas>
  <script type="application/json" id="scene-data" set:html={JSON.stringify(sceneData)} />
  <script type="module" src="/src/scripts/babylon/spike-scene.ts"></script>
  <style is:global>
    body { margin: 0; overflow: hidden; background: #0f1411; }
    canvas#babylon-root:focus { outline: none; }
  </style>
</BaseLayout>
```

- [ ] **Step 6: Create src/scripts/babylon/spike-scene.ts (solid-colour sanity build)**

```ts
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';

const canvas = document.getElementById('babylon-root') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('babylon-spike: #babylon-root canvas missing');
}

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
// Warm green, matches the Phaser spike background colour for the side-by-side frame
scene.clearColor = new Color4(140 / 255, 180 / 255, 89 / 255, 1);

// Task 1 has no camera yet — scene.render() is a no-op without one, so we
// explicitly clear to scene.clearColor each frame. Task 2 adds the camera
// and the scene.render() call starts doing real work.
engine.runRenderLoop(() => {
  engine.clear(scene.clearColor, true, true, true);
  scene.render();
});
window.addEventListener('resize', () => engine.resize());
```

- [ ] **Step 7: Confirm the visual check passes**

Start dev server: `npm run dev` (let Astro pick any port if 4321 is taken). Visit `/babylon-spike`. Expected: full-viewport warm green canvas, DevTools console shows zero errors. Visit `/` and `/phaser-spike`: both still work unchanged.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore src/pages/babylon-spike.astro src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): scaffold /babylon-spike route with solid canvas

Installs @babylonjs/core and @babylonjs/loaders; adds empty Astro
route with a fullscreen canvas and a minimal Babylon Engine/Scene
that renders a solid warm-green background. Zero console errors."
```

---

## Task 2: Orthographic camera + lights + test cube

**Files:**
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

A single grey cube visible in classic iso orientation (roughly-equal tops, front-right and front-left faces visible, parallel edges). `HemisphericLight` fills ambient; `DirectionalLight` casts a subtle directional highlight. Console still zero errors.

- [ ] **Step 2: Confirm it currently fails**

Visit `/babylon-spike`. Expected: warm-green void, no cube. That's the failing state.

- [ ] **Step 3: Replace spike-scene.ts with the camera + cube build**

```ts
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
// Babylon 8.x modular imports don't auto-bind the first camera as
// activeCamera — scene.render() stays a no-op until we set it explicitly.
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
```

- [ ] **Step 4: Confirm the visual check passes**

Reload `/babylon-spike`. Expected: warm-green canvas with a grey cube in the centre in iso orientation. Console zero errors. Resize window → cube stays centred and iso-shaped.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): orthographic iso camera + lights + test cube

ArcRotateCamera in ORTHOGRAPHIC mode at alpha=-PI/4, beta=PI/3.
Hemi + directional lights. One test cube visible in classic iso
orientation. Resize handler keeps orthoLeft/Right in aspect."
```

---

## Task 3: Projection helpers + Astro data bridge

**Files:**
- Create: `src/scripts/babylon/projection.ts`
- Modify: `src/pages/babylon-spike.astro`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

Browser console shows a single log line at boot: `babylon-spike: loaded 14 clusters, 6 selected for spike, brook N pts, roads N pts, boundary N pts`. No other logs, no errors. The test cube from Task 2 is still visible.

- [ ] **Step 2: Confirm it currently fails**

Reload `/babylon-spike`. Expected: no such log line. That's the failing state.

- [ ] **Step 3: Create src/scripts/babylon/projection.ts**

This mirrors the Phaser projection module but outputs scene-space `{ x, z }` (Babylon uses Y-up, X/Z as the ground plane).

```ts
export const HAMLET_CENTRE: [number, number] = [52.4757932163071, -2.0936364426410514];
const M_PER_DEG_LAT = 111320;

export function latLngToMetres(lat: number, lng: number): { xM: number; yM: number } {
  const [cLat, cLng] = HAMLET_CENTRE;
  const cosLat = Math.cos((cLat * Math.PI) / 180);
  const xM = (lng - cLng) * M_PER_DEG_LAT * cosLat;
  const yM = -(lat - cLat) * M_PER_DEG_LAT;
  return { xM, yM };
}

// Scene scale: 1 metre == SCENE_SCALE units. Tuned so the hamlet fits the
// default ortho extent in Task 2 (halfExtent=6 covers ≈ ±60 m at scale 0.1).
export const SCENE_SCALE = 0.1;

export function latLngToScene(lat: number, lng: number): { x: number; z: number } {
  const { xM, yM } = latLngToMetres(lat, lng);
  return { x: xM * SCENE_SCALE, z: yM * SCENE_SCALE };
}
```

- [ ] **Step 4: Update src/pages/babylon-spike.astro to emit real data**

Replace the frontmatter and JSON emission with:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
import clustersJson from '../data/clusters.json';
import brookJson from '../data/brook.json';
import roadsJson from '../data/roads.json';
import boundaryJson from '../data/boundary.json';

const households = await getCollection('households');
const spikeClusters = clustersJson.clusters.slice(0, 6);
const spikeHouseholdNumbers = new Set(spikeClusters.flatMap((c: any) => c.members));
const byNumber: Record<number, { name: string; family: string; id: string }> = {};
for (const h of households) {
  if (spikeHouseholdNumbers.has(h.data.number)) {
    byNumber[h.data.number] = {
      name: h.data.household_name,
      family: h.data.family,
      id: h.id.replace(/\.md$/, ''),
    };
  }
}

const sceneData = {
  clusters: spikeClusters,
  brook: brookJson,
  roads: roadsJson,
  boundary: boundaryJson,
  byNumber,
};
---
```

Leave the body `<canvas>`, `<script type="application/json" id="scene-data" ...>`, and `<script type="module" src=".../spike-scene.ts">` unchanged.

- [ ] **Step 5: Read scene-data in spike-scene.ts and log the summary**

Insert this at the top of `spike-scene.ts`, immediately after the canvas lookup:

```ts
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
```

- [ ] **Step 6: Confirm the visual check passes**

Reload `/babylon-spike`. Console shows the log with non-zero counts on every field. No errors.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/babylon/projection.ts src/pages/babylon-spike.astro src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): scene-data bridge + lat/lng→scene projection

Astro emits first-6-cluster scene data as JSON; boot parses it and
logs a summary. projection.ts exposes latLngToScene() with flat-earth
cos(lat) correction and a tuned SCENE_SCALE so the hamlet fits the
default orthographic frame."
```

---

## Task 4: Blender MCP produces tile-grass.glb

**Files:**
- Create: `public/babylon-sprites/tile-grass.glb` (gitignored; produced via Blender MCP)
- Create: `spike/blender-scripts/tile-grass.md` (committed — records the exact MCP steps)

- [ ] **Step 1: Define the visual check**

`public/babylon-sprites/tile-grass.glb` exists and is a valid glTF. Opening it in a glTF viewer (or re-importing into Blender via MCP) shows a single diamond-footprint tile (2 units wide × 1 unit deep) with a painterly green material. The mesh has a unique material named `mat-grass`. The tile origin is at the mesh's bottom-centre.

- [ ] **Step 2: Confirm it currently fails**

Run `ls public/babylon-sprites/tile-grass.glb`. Expected: `No such file or directory`. That's the failing state.

- [ ] **Step 3: Drive Blender via MCP to produce the tile**

Using the Blender MCP server, issue these operations (Codex sequences them through its `mcp__blender__*` tools — exact tool names vary by MCP implementation; translate to the installed server's namespace):

1. New file, delete default cube/camera/light.
2. Create a plane, rotate to lie on X/Z plane, scale to diamond footprint: vertices at `(1, 0, 0)`, `(0, 0, 0.5)`, `(-1, 0, 0)`, `(0, 0, -0.5)`.
3. Apply a painterly shader: base colour `#8fb65a`, medium roughness (0.8), very low specular, subtle normal-map noise. Use Blender's *Brick texture* or *Noise texture* fed through a *ColorRamp* into the Principled BSDF base colour to get brush-stroke variation. Name the material `mat-grass`.
4. Set origin to `(0, 0, 0)` (geometry → origin → origin to 3D cursor with cursor at world origin).
5. Export selection as glTF 2.0 binary (`.glb`) to `public/babylon-sprites/tile-grass.glb`. Export settings: include materials, no animations, compression off.

- [ ] **Step 4: Record the recipe as a skill-in-waiting**

Create `spike/blender-scripts/tile-grass.md` with the exact MCP calls used, any parameter values tuned, and a note: *"If this tile renders well in Task 5, promote this recipe to `~/.claude/skills/sprite-tile-grass/` per the global principle that successful sprite runs become reusable skills."*

- [ ] **Step 5: Confirm the visual check passes**

Run `ls -la public/babylon-sprites/tile-grass.glb`. Expected: non-zero-size file. Optionally open in https://gltf.report or re-import via Blender MCP to visually confirm a single diamond mesh with `mat-grass`.

- [ ] **Step 6: Commit**

```bash
git add spike/blender-scripts/tile-grass.md
git commit -m "asset(babylon): tile-grass.glb recipe

Records the Blender MCP steps that produced public/babylon-sprites/
tile-grass.glb (2×1 diamond, painterly green material, origin at
mesh bottom-centre). Asset itself stays gitignored."
```

---

## Task 5: Ground tiling — grass carpet over the scene

**Files:**
- Create: `src/scripts/babylon/ground.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

A carpet of diamond grass tiles covers the scene, replacing the test cube. Tiles interlock cleanly in the iso 2:1 pattern with no gaps and no z-fighting. At default camera, the tile grid fills the full viewport. Console zero errors.

- [ ] **Step 2: Confirm it currently fails**

Reload `/babylon-spike`. Expected: still the grey test cube on green void. That's the failing state.

- [ ] **Step 3: Create src/scripts/babylon/ground.ts**

```ts
import type { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { latLngToScene } from './projection';
import '@babylonjs/loaders/glTF';

const TILE_W = 2;
const TILE_D = 1;

export async function buildGround(
  scene: Scene,
  boundary: [number, number][],
): Promise<void> {
  const bounds = boundary.map(([lat, lng]) => latLngToScene(lat, lng));
  const xs = bounds.map((p) => p.x);
  const zs = bounds.map((p) => p.z);
  const minX = Math.min(...xs) - TILE_W;
  const maxX = Math.max(...xs) + TILE_W;
  const minZ = Math.min(...zs) - TILE_D;
  const maxZ = Math.max(...zs) + TILE_D;

  const container = await SceneLoader.LoadAssetContainerAsync(
    '/babylon-sprites/', 'tile-grass.glb', scene,
  );
  const template = container.meshes.find((m) => m.name !== '__root__');
  if (!template) throw new Error('ground: tile-grass.glb has no mesh');
  template.setEnabled(false);

  for (let z = minZ; z <= maxZ; z += TILE_D) {
    // Offset every other row by half-tile to interlock diamonds
    const rowIndex = Math.round((z - minZ) / TILE_D);
    const xOffset = rowIndex % 2 === 0 ? 0 : TILE_W / 2;
    for (let x = minX + xOffset; x <= maxX; x += TILE_W) {
      const inst = template.createInstance(`grass-${x.toFixed(2)}-${z.toFixed(2)}`);
      inst.position = new Vector3(x, 0, z);
    }
  }
}
```

- [ ] **Step 4: Wire the ground into spike-scene.ts**

Remove the test cube (`MeshBuilder.CreateBox(...)`) line and replace with:

```ts
import { buildGround } from './ground';
// ...later, after camera + lights are created:
await buildGround(scene, data.boundary);
```

The top of the module must be an `async` wrapper since top-level await in Astro's bundling is flaky — wrap everything below the `const canvas = ...` check in an `await (async () => { ... })();` IIFE, or promote to a `boot()` function that is awaited once.

- [ ] **Step 5: Confirm the visual check passes**

Reload `/babylon-spike`. Expected: a field of diamond grass tiles covering the viewport, no test cube, interlocking cleanly. No console errors. Resize: stays coherent.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/babylon/ground.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): iso diamond grass ground carpet

buildGround() loads tile-grass.glb, instantiates a grass carpet
covering the padded boundary extent with every other row offset by
half-tile for classic iso interlock. Replaces Task 2's test cube."
```

---

## Task 6: Dirt-path tile + dual-graph edge routing along roads

**Files:**
- Create: `public/babylon-sprites/tile-dirt-path.glb` (gitignored; Blender MCP)
- Create: `spike/blender-scripts/tile-dirt-path.md`
- Modify: `src/scripts/babylon/ground.ts`

- [ ] **Step 1: Define the visual check**

Dirt-brown iso tiles form continuous paths along each `roads.json` polyline. Paths run *between* grass tiles (dual-graph rule: the path is on the tile edge, not on a tile face), so grass tiles stay whole and full-featured while paths occupy the transition space. No gaps, no overlaps.

- [ ] **Step 2: Confirm it currently fails**

Reload `/babylon-spike`. Expected: grass carpet only, no paths. That's the failing state.

- [ ] **Step 3: Blender MCP — produce tile-dirt-path.glb**

Same pipeline as tile-grass, with:
- Base colour: `#8a6b4a` (Staffordshire dirt, matches the painted-brick cottage palette)
- Shape: same diamond footprint (2×1) so it interlocks with grass at the same origin
- Material name: `mat-dirt-path`
- Optional: vary brush-stroke noise frequency so dirt and grass visibly differ even at distance

Export to `public/babylon-sprites/tile-dirt-path.glb`.

Record recipe at `spike/blender-scripts/tile-dirt-path.md`.

- [ ] **Step 4: Extend ground.ts with dual-graph path routing**

Add an exported helper and call it after `buildGround`:

```ts
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
// ... existing imports

// Public API — call after buildGround(). Consumes the road polylines in
// lat/lng and stamps dirt-path tiles on the grass at every polyline vertex,
// quantised to the tile grid so paths read as continuous.
export async function paintRoads(
  scene: Scene,
  roads: Array<{ polyline: [number, number][] }>,
): Promise<void> {
  const container = await SceneLoader.LoadAssetContainerAsync(
    '/babylon-sprites/', 'tile-dirt-path.glb', scene,
  );
  const template = container.meshes.find((m) => m.name !== '__root__');
  if (!template) throw new Error('paintRoads: tile-dirt-path.glb has no mesh');
  template.setEnabled(false);

  const stamped = new Set<string>();
  for (const road of roads) {
    for (const [lat, lng] of road.polyline) {
      const { x, z } = latLngToScene(lat, lng);
      // Quantise to the same diamond grid used by buildGround
      const qx = Math.round(x / (TILE_W / 2)) * (TILE_W / 2);
      const qz = Math.round(z / TILE_D) * TILE_D;
      const key = `${qx}:${qz}`;
      if (stamped.has(key)) continue;
      stamped.add(key);
      const inst = template.createInstance(`dirt-${qx}-${qz}`);
      // Raise by 0.001 to prevent z-fight with grass tile below
      inst.position = new Vector3(qx, 0.001, qz);
    }
  }
}
```

In `spike-scene.ts`, add `await paintRoads(scene, data.roads);` immediately after the `buildGround(...)` call.

- [ ] **Step 5: Confirm the visual check passes**

Reload `/babylon-spike`. Expected: grass carpet with brown-tile paths running along where `roads.json` polylines are. Paths read as continuous strokes (path segments sit on consecutive tile cells).

- [ ] **Step 6: Commit**

```bash
git add spike/blender-scripts/tile-dirt-path.md src/scripts/babylon/ground.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): dirt-path tiles stamped along road polylines

Blender-MCP-produced tile-dirt-path.glb interlocks with the grass
grid. paintRoads() quantises each roads.json polyline vertex onto
the tile grid and stamps a dirt tile there (raised 1 mm to avoid
z-fight with the grass below)."
```

---

## Task 7: Cottage corner + roof glTFs

**Files:**
- Create: `public/babylon-sprites/cottage-corner.glb` (gitignored; Blender MCP)
- Create: `public/babylon-sprites/cottage-roof.glb` (gitignored; Blender MCP)
- Create: `spike/blender-scripts/cottage-corner.md`
- Create: `spike/blender-scripts/cottage-roof.md`

- [ ] **Step 1: Define the visual check**

Both glTFs exist in `public/babylon-sprites/`. Each opens as a valid glTF. The corner mesh is one quadrant of a square cottage (one external corner angle, two wall faces meeting at a right angle), with origin at the inner corner. The roof mesh is a complete 4-sided pitched roof sized to fit a 2×2 unit square cottage footprint, origin at the roof's bottom-centre.

- [ ] **Step 2: Confirm it currently fails**

`ls public/babylon-sprites/cottage-corner.glb public/babylon-sprites/cottage-roof.glb`. Expected: both missing.

- [ ] **Step 3: Blender MCP — produce cottage-corner.glb**

1. Model one external-corner L-shape: two walls meeting at a 90° angle, each wall 1 unit long and 1.5 units tall, ~0.15 units thick.
2. Material: painted Staffordshire red brick — base `#a0523a`, rough 0.9, with a faint brick-row normal map or procedural texture. Name `mat-brick`.
3. Origin at the inner corner (world `(0, 0, 0)`). When 4 of these are instantiated at `(0, 0, 0)`, `(0, 0, 0)`, `(0, 0, 0)`, `(0, 0, 0)` and rotated 0°/90°/180°/270° about Y, they form a complete square cottage shell.
4. Export to `public/babylon-sprites/cottage-corner.glb`. Record recipe at `spike/blender-scripts/cottage-corner.md`.

- [ ] **Step 4: Blender MCP — produce cottage-roof.glb**

1. Model a 4-sided pitched roof: square base 2×2 units, apex 1.2 units above base centre, eaves overhang 0.1 unit on each side.
2. Material: slate blue-grey — base `#4e5b67`, rough 0.85, with subtle directional tile-row pattern. Name `mat-roof`.
3. Origin at the centre of the roof's bottom face (so placing at `(x, wall-height, z)` drops the roof onto the cottage walls cleanly).
4. Export to `public/babylon-sprites/cottage-roof.glb`. Record recipe.

- [ ] **Step 5: Confirm the visual check passes**

Both files exist, non-zero size. Optional: load into gltf.report and confirm meshes match the origin/dimension expectations above.

- [ ] **Step 6: Commit**

```bash
git add spike/blender-scripts/cottage-corner.md spike/blender-scripts/cottage-roof.md
git commit -m "asset(babylon): cottage-corner + cottage-roof recipes

Records the Blender MCP pipelines that produced the first two
cottage modules. Corner is a single L-shaped quadrant with origin
at the inner corner (rotate 4× to assemble a square shell). Roof is
a full 2×2 4-sided pitch with origin at the bottom-centre."
```

---

## Task 8: building.ts — assemble 1 cottage at origin

**Files:**
- Create: `src/scripts/babylon/building.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

A single square red-brick cottage with a slate-blue pitched roof appears at scene origin `(0, 0, 0)`. Walls form a closed square (no visible gap at corners). Roof sits snugly on top. Camera rotation is not expected yet — at default azimuth, all four walls are coherent (two visible, two implied behind).

- [ ] **Step 2: Confirm it currently fails**

Reload `/babylon-spike`. Expected: ground + paths only, no cottage.

- [ ] **Step 3: Create src/scripts/babylon/building.ts**

```ts
import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/loaders/glTF';

export interface BuildingTemplates {
  corner: Mesh;
  roof: Mesh;
}

export async function loadBuildingTemplates(scene: Scene): Promise<BuildingTemplates> {
  const cornerContainer = await SceneLoader.LoadAssetContainerAsync(
    '/babylon-sprites/', 'cottage-corner.glb', scene,
  );
  const roofContainer = await SceneLoader.LoadAssetContainerAsync(
    '/babylon-sprites/', 'cottage-roof.glb', scene,
  );
  const corner = cornerContainer.meshes.find((m) => m.name !== '__root__') as Mesh | undefined;
  const roof = roofContainer.meshes.find((m) => m.name !== '__root__') as Mesh | undefined;
  if (!corner || !roof) throw new Error('loadBuildingTemplates: missing mesh in glTF');
  corner.setEnabled(false);
  roof.setEnabled(false);
  return { corner, roof };
}

// Cottage footprint: 2 × 2 units (matches cottage-roof's base). Walls are
// 1.5 units tall (cottage-corner's height).
const CORNER_WALL_HEIGHT = 1.5;

export function placeCottage(
  scene: Scene,
  templates: BuildingTemplates,
  position: { x: number; z: number },
  name: string,
): TransformNode {
  const root = new TransformNode(`cottage-${name}`, scene);
  root.position = new Vector3(position.x, 0, position.z);

  // Four corner instances rotated 0°, 90°, 180°, 270° about Y.
  // cottage-corner's origin is the inner corner of the L, so each rotated
  // copy places itself at the matching cottage corner without translation.
  for (let i = 0; i < 4; i += 1) {
    const inst = templates.corner.createInstance(`cottage-${name}-corner-${i}`);
    inst.parent = root;
    inst.rotation = new Vector3(0, (i * Math.PI) / 2, 0);
  }
  // Roof sits on top of walls. cottage-roof's origin is the bottom-centre.
  const roofInst = templates.roof.createInstance(`cottage-${name}-roof`);
  roofInst.parent = root;
  roofInst.position = new Vector3(0, CORNER_WALL_HEIGHT, 0);
  return root;
}
```

- [ ] **Step 4: Wire a single cottage at origin into spike-scene.ts**

Add after `paintRoads`:

```ts
import { loadBuildingTemplates, placeCottage } from './building';
// ...
const buildingTemplates = await loadBuildingTemplates(scene);
placeCottage(scene, buildingTemplates, { x: 0, z: 0 }, 'origin-test');
```

- [ ] **Step 5: Confirm the visual check passes**

Reload. Expected: one red-brick cottage with slate-blue roof at scene centre. Walls are a closed square. Roof sits flush. No visible gap at corners.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/babylon/building.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): corner-modular cottage assembly at origin

loadBuildingTemplates() caches the corner + roof glTFs; placeCottage()
instantiates 4 rotated corner copies + 1 roof under a TransformNode
parent. Single test cottage at scene origin confirms the rotational
symmetry works — walls close cleanly, roof sits flush at wall height."
```

---

## Task 9: Place 6 cottages at cluster centroids

**Files:**
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

Six cottages appear on the ground, each at a cluster centroid from `data.clusters`. Cottages do not overlap each other or obviously-visible paths. Camera framing captures all 6 within the default orthographic view. Console zero errors.

- [ ] **Step 2: Confirm it currently fails**

Reload. Expected: only the one origin-test cottage. Failing state.

- [ ] **Step 3: Replace the single test cottage with 6 cluster-placed cottages**

In `spike-scene.ts`, replace the origin-test line with:

```ts
import { latLngToScene } from './projection';
// ...
for (const cluster of data.clusters) {
  const { x, z } = latLngToScene(cluster.centroid[0], cluster.centroid[1]);
  placeCottage(scene, buildingTemplates, { x, z }, String(cluster.id));
}
```

Additionally, widen the orthographic extent so all 6 centroids fit. Replace `fitOrtho(6)` calls with a boundary-aware fit:

```ts
// Fit ortho camera to cluster extent with 20% pad
const pts = data.clusters.map((c) => latLngToScene(c.centroid[0], c.centroid[1]));
const minX = Math.min(...pts.map((p) => p.x));
const maxX = Math.max(...pts.map((p) => p.x));
const minZ = Math.min(...pts.map((p) => p.z));
const maxZ = Math.max(...pts.map((p) => p.z));
const halfW = Math.max((maxX - minX), (maxZ - minZ)) / 2 * 1.2;
camera.target = new Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
function fitOrtho(): void {
  const aspect = engine.getAspectRatio(camera);
  camera.orthoTop = halfW;
  camera.orthoBottom = -halfW;
  camera.orthoLeft = -halfW * aspect;
  camera.orthoRight = halfW * aspect;
}
fitOrtho();
window.addEventListener('resize', () => { engine.resize(); fitOrtho(); });
```

- [ ] **Step 4: Confirm the visual check passes**

Reload. Expected: 6 cottages scattered across the grass-and-path ground, all in frame at default camera. No overlap of cottage walls into each other. Console clean.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): place 6 cottages at real cluster centroids

Replaces the single origin-test cottage with 6 cottages mapped from
the first 6 entries of clusters.json. Camera ortho extent now fits
the cluster bounding box with 20% pad so all 6 land in frame."
```

---

## Task 10: Props — chimney, door, window

**Files:**
- Create: `public/babylon-sprites/prop-chimney.glb` (Blender MCP)
- Create: `public/babylon-sprites/prop-door.glb` (Blender MCP)
- Create: `public/babylon-sprites/prop-window.glb` (Blender MCP)
- Create: `spike/blender-scripts/prop-chimney.md`
- Create: `spike/blender-scripts/prop-door.md`
- Create: `spike/blender-scripts/prop-window.md`
- Create: `src/scripts/babylon/props.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

Every cottage shows: one chimney at the roof ridge, one dark door on the south-facing wall, one window on the east wall and one on the west wall. Props are clearly visible at default camera; their scale/position reads correct (door ≈ 0.8 units tall, windows ≈ 0.4 units square, chimney ≈ 0.5 units tall on the roof).

- [ ] **Step 2: Confirm it currently fails**

Reload. Expected: cottages without props.

- [ ] **Step 3: Blender MCP — produce the three prop glTFs**

- **prop-chimney.glb**: short rectangular brick stack, ~0.3×0.3×0.5, material `mat-brick` (reuse cottage palette). Origin at bottom-centre.
- **prop-door.glb**: dark-wood panel, ~0.4×0.01×0.8, material `mat-door` (colour `#3a2818`, rough 0.9). Origin at bottom-centre.
- **prop-window.glb**: mullioned window, ~0.4×0.01×0.4, material `mat-window` (colour `#e6d890` — warm interior-lit, emission 0.4). Origin at centre.

Export each; record recipes.

- [ ] **Step 4: Create src/scripts/babylon/props.ts**

```ts
import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/loaders/glTF';

export interface PropTemplates {
  chimney: Mesh;
  door: Mesh;
  window: Mesh;
}

export async function loadPropTemplates(scene: Scene): Promise<PropTemplates> {
  async function load(file: string): Promise<Mesh> {
    const c = await SceneLoader.LoadAssetContainerAsync('/babylon-sprites/', file, scene);
    const m = c.meshes.find((x) => x.name !== '__root__') as Mesh | undefined;
    if (!m) throw new Error(`${file}: no mesh`);
    m.setEnabled(false);
    return m;
  }
  return {
    chimney: await load('prop-chimney.glb'),
    door: await load('prop-door.glb'),
    window: await load('prop-window.glb'),
  };
}

// The cottage footprint is 2×2 and walls are 1.5 tall. Prop offsets are
// relative to the cottage's TransformNode (origin at the cottage centre).
const WALL = 1; // half-footprint
const WALL_H = 1.5;
const ROOF_RIDGE = WALL_H + 1.2; // matches cottage-roof apex

export function attachProps(
  scene: Scene,
  templates: PropTemplates,
  cottage: TransformNode,
  name: string,
): void {
  const chimney = templates.chimney.createInstance(`${name}-chimney`);
  chimney.parent = cottage;
  chimney.position = new Vector3(0.4, ROOF_RIDGE, 0.4);

  const door = templates.door.createInstance(`${name}-door`);
  door.parent = cottage;
  door.position = new Vector3(0, 0.4, WALL + 0.02);
  door.rotation = new Vector3(0, Math.PI, 0);

  const winE = templates.window.createInstance(`${name}-window-e`);
  winE.parent = cottage;
  winE.position = new Vector3(WALL + 0.02, 0.9, 0);
  winE.rotation = new Vector3(0, Math.PI / 2, 0);

  const winW = templates.window.createInstance(`${name}-window-w`);
  winW.parent = cottage;
  winW.position = new Vector3(-(WALL + 0.02), 0.9, 0);
  winW.rotation = new Vector3(0, -Math.PI / 2, 0);
}
```

- [ ] **Step 5: Wire props into spike-scene.ts**

Replace the placement loop with:

```ts
import { loadPropTemplates, attachProps } from './props';
// ...
const propTemplates = await loadPropTemplates(scene);
for (const cluster of data.clusters) {
  const { x, z } = latLngToScene(cluster.centroid[0], cluster.centroid[1]);
  const cottage = placeCottage(scene, buildingTemplates, { x, z }, String(cluster.id));
  attachProps(scene, propTemplates, cottage, String(cluster.id));
}
```

- [ ] **Step 6: Confirm the visual check passes**

Reload. Expected: all 6 cottages carry chimney + door + 2 windows. Windows glow (emissive material). Scales read correct.

- [ ] **Step 7: Commit**

```bash
git add spike/blender-scripts/prop-*.md src/scripts/babylon/props.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): chimney + door + windows on every cottage

Three Blender-MCP props (chimney/door/window) attached to every
cottage TransformNode at pre-computed offsets in the cottage's
local frame. Windows use an emissive material for warm interior
glow even without scene lights."
```

---

## Task 11: Brook — polyline ribbon

**Files:**
- Create: `src/scripts/babylon/brook.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

A blue ribbon mesh traces the brook polyline across the scene, sits just above the ground (no z-fight), width reads as a narrow stream (≈ 0.3 units wide). No UV animation yet — flat blue material is fine.

- [ ] **Step 2: Confirm it currently fails**

Reload. Expected: no brook visible.

- [ ] **Step 3: Create src/scripts/babylon/brook.ts**

```ts
import type { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { latLngToScene } from './projection';

const WIDTH = 0.3;

export function buildBrook(scene: Scene, polyline: [number, number][]): void {
  if (polyline.length < 2) return;
  // Build left and right offset rails perpendicular to each segment to
  // form a constant-width ribbon.
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  for (let i = 0; i < polyline.length; i += 1) {
    const [lat, lng] = polyline[i];
    const here = latLngToScene(lat, lng);
    const next = polyline[i + 1] ?? polyline[i - 1];
    const there = latLngToScene(next[0], next[1]);
    const dx = there.x - here.x;
    const dz = there.z - here.z;
    const len = Math.hypot(dx, dz) || 1;
    // Perpendicular in the ground plane: (-dz, 0, dx) / len
    const nx = -dz / len;
    const nz = dx / len;
    left.push(new Vector3(here.x + nx * WIDTH / 2, 0.01, here.z + nz * WIDTH / 2));
    right.push(new Vector3(here.x - nx * WIDTH / 2, 0.01, here.z - nz * WIDTH / 2));
  }
  const ribbon = MeshBuilder.CreateRibbon('brook', { pathArray: [left, right], closeArray: false, closePath: false, sideOrientation: 2 }, scene);
  const mat = new StandardMaterial('mat-brook', scene);
  mat.diffuseColor = new Color3(0.25, 0.45, 0.65);
  mat.specularColor = new Color3(0.1, 0.1, 0.1);
  ribbon.material = mat;
}
```

- [ ] **Step 4: Wire brook into spike-scene.ts**

```ts
import { buildBrook } from './brook';
// ...after buildings:
buildBrook(scene, data.brook);
```

- [ ] **Step 5: Confirm the visual check passes**

Reload. Expected: a narrow blue ribbon snaking across the ground following the brook polyline. No z-fight with grass below.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/babylon/brook.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): brook polyline ribbon

Constant-width ribbon mesh built from perpendicular-offset rails at
each brook.json vertex. Flat blue StandardMaterial; UV-scroll shader
lands in the next task."
```

---

## Task 12: UV-scroll water shader on the brook

**Files:**
- Modify: `src/scripts/babylon/brook.ts`

- [ ] **Step 1: Define the visual check**

The brook's surface appears to flow — a subtle texture pattern scrolls along the ribbon direction at ~0.5 units/second. The flow is smooth, continuous, and consistent across the whole brook. No flickering, no discontinuities at polyline vertices.

- [ ] **Step 2: Confirm it currently fails**

Reload. Expected: flat static blue ribbon.

- [ ] **Step 3: Replace the material with a UV-scrolling ShaderMaterial**

Rewrite `brook.ts`'s material creation block. Replace `const mat = new StandardMaterial(...)` through the ribbon assignment with:

```ts
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

Effect.ShadersStore['brookVertexShader'] = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
}
`;

Effect.ShadersStore['brookFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform float time;
void main(void) {
  vec2 uv = vUV;
  uv.y += time * 0.5;               // scroll along ribbon length
  float w = sin(uv.y * 12.0) * 0.5 + 0.5;
  float s = sin(uv.x * 18.0 + time * 3.0) * 0.15 + 0.85;
  vec3 deep  = vec3(0.12, 0.22, 0.36);
  vec3 light = vec3(0.45, 0.62, 0.78);
  vec3 col = mix(deep, light, w * s);
  gl_FragColor = vec4(col, 0.92);
}
`;

const mat = new ShaderMaterial('mat-brook', scene, { vertex: 'brook', fragment: 'brook' }, {
  attributes: ['position', 'uv'],
  uniforms: ['worldViewProjection', 'time'],
  needAlphaBlending: true,
});
let t = 0;
scene.onBeforeRenderObservable.add(() => {
  t += engine.getDeltaTime() / 1000;
  mat.setFloat('time', t);
});
ribbon.material = mat;
```

`buildBrook` now needs `engine` as a parameter. Update its signature to `buildBrook(scene: Scene, engine: Engine, polyline: [number, number][])` and update the call site in `spike-scene.ts` accordingly.

- [ ] **Step 4: Confirm the visual check passes**

Reload. Expected: the brook ribbon shows visible scrolling water pattern, flow direction reads as consistent. No shader-compile errors in console.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/babylon/brook.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): UV-scroll water shader on brook

Replaces the flat-blue StandardMaterial with a hand-rolled
ShaderMaterial that scrolls UV along the ribbon direction and
mixes deep/light water tones for painterly ripple. Time uniform
updated each frame."
```

---

## Task 13: Forge smoke particle emitter

**Files:**
- Modify: `src/scripts/babylon/props.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

The first cluster with `hasForge: true` shows a rising smoke plume attached to its chimney. Plume drifts upward, widens, fades out. Particles warm-sooty (tint range `#3c2e22` → `#5b463a` → `#7a6454`). Other cottages have no plumes.

- [ ] **Step 2: Confirm it currently fails**

Reload. Expected: no smoke anywhere.

- [ ] **Step 3: Add a smoke emitter helper to props.ts**

```ts
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
// ... existing imports

export function attachForgeSmoke(
  scene: Scene,
  cottage: TransformNode,
  name: string,
): void {
  // Build a white-dot texture once for particles (avoid an extra asset file)
  const tex = new DynamicTexture(`smoke-tex-${name}`, 64, scene, false);
  const ctx = tex.getContext();
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  tex.update();

  const ps = new ParticleSystem(`smoke-${name}`, 120, scene);
  ps.particleTexture = tex;
  ps.emitter = cottage; // world-positioned via cottage TransformNode
  ps.minEmitBox = new Vector3(0.4, 2.7, 0.4);
  ps.maxEmitBox = new Vector3(0.4, 2.7, 0.4);
  ps.color1 = new Color4(0.24, 0.18, 0.13, 0.85);
  ps.color2 = new Color4(0.36, 0.28, 0.21, 0.6);
  ps.colorDead = new Color4(0.48, 0.39, 0.33, 0);
  ps.minSize = 0.15;
  ps.maxSize = 0.45;
  ps.minLifeTime = 2.0;
  ps.maxLifeTime = 3.2;
  ps.emitRate = 30;
  ps.gravity = new Vector3(0, 0.1, 0);
  ps.direction1 = new Vector3(-0.15, 0.8, -0.15);
  ps.direction2 = new Vector3(0.15, 1.2, 0.15);
  ps.start();
}
```

- [ ] **Step 4: Call attachForgeSmoke for the hero forge only**

Update the cottage placement loop in `spike-scene.ts`:

```ts
import { attachForgeSmoke } from './props';
// ...
let heroForgeAttached = false;
for (const cluster of data.clusters) {
  const { x, z } = latLngToScene(cluster.centroid[0], cluster.centroid[1]);
  const cottage = placeCottage(scene, buildingTemplates, { x, z }, String(cluster.id));
  attachProps(scene, propTemplates, cottage, String(cluster.id));
  if (cluster.hasForge && !heroForgeAttached) {
    attachForgeSmoke(scene, cottage, String(cluster.id));
    heroForgeAttached = true;
  }
}
```

- [ ] **Step 5: Confirm the visual check passes**

Reload. Expected: one cottage (the first `hasForge: true`) has a warm-soot plume rising from its chimney area. Others do not.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/babylon/props.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): forge smoke plume on hero cottage

Babylon ParticleSystem anchored to the first hasForge cluster's
cottage TransformNode. White-dot texture generated at runtime via
DynamicTexture (no extra asset file). Warm-soot tint, upward drift,
fade-out — matches the Phaser spike emitter palette."
```

---

## Task 14: Shadows from the directional light

**Files:**
- Modify: `src/scripts/babylon/spike-scene.ts`
- Modify: `src/scripts/babylon/ground.ts`
- Modify: `src/scripts/babylon/building.ts`

- [ ] **Step 1: Define the visual check**

Each cottage casts a soft shadow onto the ground in the directional-light direction. Shadows read as distinct but not harsh. Ground is a shadow receiver; cottages + props are shadow casters.

- [ ] **Step 2: Confirm it currently fails**

Reload. Expected: no shadows. Cottages feel pasted onto the ground.

- [ ] **Step 3: Create a ShadowGenerator and register casters/receivers**

In `spike-scene.ts`, after the directional light `sun` is created:

```ts
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

const shadows = new ShadowGenerator(1024, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurScale = 2;
shadows.setDarkness(0.35);
```

Expose `shadows` to the ground/building modules — simplest: make `shadows` a module-scoped variable and import/pass it.

Update `buildGround()` signature to accept `shadows: ShadowGenerator | null` and, for each ground tile instance, do `inst.receiveShadows = true;`. (Babylon `InstancedMesh` inherits receiveShadows from the source mesh — set it on the template too.)

Update `placeCottage()` signature to accept `shadows: ShadowGenerator | null` and register every corner + roof instance via `shadows?.addShadowCaster(inst)`.

Update `attachProps()` the same way.

At call sites in `spike-scene.ts`, pass `shadows` through.

- [ ] **Step 4: Confirm the visual check passes**

Reload. Expected: soft shadows cast by each cottage onto the grass-and-path ground. Shadows tilt in the direction of the `DirectionalLight.direction` vector.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/babylon/spike-scene.ts src/scripts/babylon/ground.ts src/scripts/babylon/building.ts src/scripts/babylon/props.ts
git commit -m "feat(babylon): directional-light shadows on cottages + ground

ShadowGenerator on the sun DirectionalLight with blur-exponential
shadow map (1024²). Ground tiles receive; cottage corners, roofs,
chimneys, doors, and windows all cast. Darkness 0.35 — subtle, not
harsh."
```

---

## Task 15: interactions.ts — hover tooltip

**Files:**
- Create: `src/scripts/babylon/interactions.ts`
- Modify: `src/scripts/babylon/building.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`
- Modify: `src/pages/babylon-spike.astro` (add tooltip DOM container)

- [ ] **Step 1: Define the visual check**

Hovering the cursor over a cottage tints it warm (colour shift, not a border), and a DOM tooltip appears near the cursor showing the primary family name for that cluster and the count of households it covers. Moving off any cottage hides the tooltip. The DOM uses `createElement` / `textContent` only — no `innerHTML` (the project's security hook blocks it).

- [ ] **Step 2: Confirm it currently fails**

Reload. Hover cottages. Expected: no tint, no tooltip.

- [ ] **Step 3: Add the tooltip container to babylon-spike.astro**

Inside the `<BaseLayout>` body, before the closing tag of the layout but after the canvas, add:

```astro
<div id="babylon-tooltip" class="bbt-tooltip" role="status" aria-live="polite"></div>
```

Extend the scoped style block:

```astro
<style is:global>
  body { margin: 0; overflow: hidden; background: #0f1411; }
  canvas#babylon-root:focus { outline: none; }
  .bbt-tooltip {
    position: fixed; top: 0; left: 0;
    padding: 0.4rem 0.6rem;
    background: rgba(15, 20, 17, 0.92);
    color: #f0e4c8;
    font: 13px/1.4 "IM Fell English", Georgia, serif;
    border: 1px solid rgba(240, 228, 200, 0.3);
    border-radius: 4px;
    pointer-events: none;
    opacity: 0; transform: translate(12px, 12px);
    transition: opacity 120ms ease;
    z-index: 10;
  }
  .bbt-tooltip.visible { opacity: 1; }
</style>
```

- [ ] **Step 4: Tag each cottage TransformNode with metadata**

In `building.ts`, export the `CottageMetadata` type (single source of truth — `interactions.ts` will import it) and extend `placeCottage` to accept and attach the metadata:

```ts
export interface CottageMetadata {
  clusterId: number;
  primaryFamily: string;
  memberCount: number;
  members: number[];
}

// Update placeCottage signature to:
//   placeCottage(scene, templates, position, name, shadows, metadata: CottageMetadata): TransformNode
// After creating `root`, assign:
//   root.metadata = metadata;
// For every corner + roof instance created inside placeCottage, also assign:
//   inst.metadata = metadata;
// — so ray-picking any child mesh surfaces the same data.
```

Thread the metadata through from `spike-scene.ts`:

```ts
placeCottage(scene, buildingTemplates, { x, z }, String(cluster.id), shadows, {
  clusterId: cluster.id,
  primaryFamily: cluster.primaryFamily,
  memberCount: cluster.members.length,
  members: cluster.members,
});
```

Also, for each corner/roof instance inside `placeCottage`, set `inst.metadata = metadata;` so ray-picking a child mesh surfaces the same data.

- [ ] **Step 5: Create src/scripts/babylon/interactions.ts**

```ts
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { CottageMetadata } from './building';

export function wireInteractions(scene: Scene): void {
  const tooltipEl = document.getElementById('babylon-tooltip') as HTMLDivElement | null;
  if (!tooltipEl) throw new Error('wireInteractions: #babylon-tooltip missing');

  let hovered: AbstractMesh | null = null;
  let hoveredTint: { mesh: AbstractMesh; prev: Color3 | null } | null = null;

  function clearHover(): void {
    if (hoveredTint) {
      const mat = hoveredTint.mesh.material as StandardMaterial | null;
      if (mat && hoveredTint.prev) mat.diffuseColor = hoveredTint.prev;
    }
    hoveredTint = null;
    hovered = null;
    tooltipEl.classList.remove('visible');
  }

  scene.onPointerMove = (event, pickInfo) => {
    const hit = pickInfo?.hit ? pickInfo.pickedMesh : null;
    const meta = hit?.metadata as CottageMetadata | undefined;
    if (!meta || typeof meta.clusterId !== 'number') {
      clearHover();
      return;
    }
    if (hovered === hit) {
      // Same mesh — update tooltip position only
      tooltipEl.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;
      return;
    }
    clearHover();
    hovered = hit;
    // Tint by shifting the diffuse colour warmer. Works on StandardMaterial
    // (our Blender exports default to this). ShaderMaterial cottages would
    // need different handling; we don't have any yet.
    const mat = hit.material as StandardMaterial | null;
    if (mat && mat.diffuseColor) {
      hoveredTint = { mesh: hit, prev: mat.diffuseColor.clone() };
      mat.diffuseColor = mat.diffuseColor.add(new Color3(0.15, 0.1, 0));
    }
    while (tooltipEl.firstChild) tooltipEl.removeChild(tooltipEl.firstChild);
    const title = document.createElement('strong');
    title.textContent = meta.primaryFamily;
    const count = document.createElement('div');
    count.textContent = `${meta.memberCount} household${meta.memberCount === 1 ? '' : 's'}`;
    tooltipEl.appendChild(title);
    tooltipEl.appendChild(count);
    tooltipEl.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;
    tooltipEl.classList.add('visible');
  };
}
```

In `spike-scene.ts`, call `wireInteractions(scene);` once after the cottage loop.

- [ ] **Step 6: Confirm the visual check passes**

Reload. Hover a cottage. Expected: cottage tints warmer, tooltip appears next to the cursor with the family name and household count. Move off: tooltip disappears, tint reverts.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/babylon/interactions.ts src/scripts/babylon/building.ts src/scripts/babylon/spike-scene.ts src/pages/babylon-spike.astro
git commit -m "feat(babylon): hover tooltip on cottages

Scene onPointerMove ray-picks; hit meshes carry CottageMetadata
propagated from placeCottage. Tooltip DOM built via createElement/
textContent only (innerHTML is blocked by the project security
hook). Tint via diffuseColor shift, reverted on clearHover."
```

---

## Task 16: interactions.ts — click routing to household detail

**Files:**
- Modify: `src/scripts/babylon/interactions.ts`

- [ ] **Step 1: Define the visual check**

Clicking a cottage navigates to `/households/<first-member-slug>/`. If the cluster has multiple members, the first one (by number) is the target for the spike. No popup yet — production can add multi-member disambiguation later.

- [ ] **Step 2: Confirm it currently fails**

Reload. Click a cottage. Expected: nothing happens.

- [ ] **Step 3: Extend wireInteractions to accept household lookup + attach onPointerDown**

Change the signature and pass `byNumber` through from `spike-scene.ts`:

```ts
export interface HouseholdLookup {
  [number: number]: { name: string; family: string; id: string };
}

// CottageMetadata is imported from './building' at the top of the file —
// do not redefine it here.

export function wireInteractions(scene: Scene, byNumber: HouseholdLookup): void {
  // ... existing pointerMove handler unchanged ...

  scene.onPointerDown = (_event, pickInfo) => {
    const hit = pickInfo?.hit ? pickInfo.pickedMesh : null;
    const meta = hit?.metadata as CottageMetadata | undefined;
    if (!meta || typeof meta.clusterId !== 'number') return;
    const firstMember = meta.members[0];
    const entry = byNumber[firstMember];
    if (!entry) {
      console.warn(`click: no lookup for household ${firstMember}`);
      return;
    }
    window.location.href = `/households/${entry.id}/`;
  };
}
```

Update call site: `wireInteractions(scene, data.byNumber);`

- [ ] **Step 4: Confirm the visual check passes**

Reload. Click a cottage. Expected: browser navigates to that cottage's household detail page and it renders correctly (the `/households/[id]` dynamic route already exists from Round 2).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/babylon/interactions.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): click cottage → household detail page

onPointerDown ray-picks, resolves the hit cottage's first member
household via the byNumber lookup, navigates via window.location to
/households/<slug>/. Multi-member disambiguation deferred to
production."
```

---

## Task 17: rotation.ts — 4-angle camera rotation on arrow keys

**Files:**
- Create: `src/scripts/babylon/rotation.ts`
- Modify: `src/scripts/babylon/spike-scene.ts`

- [ ] **Step 1: Define the visual check**

Pressing `ArrowRight` rotates the camera 90° clockwise around the scene centroid, easing smoothly (≈ 400ms animation). `ArrowLeft` rotates 90° counter-clockwise. At every cardinal angle, the scene reads coherently — no visible depth-sort failures, no disappeared geometry, tooltip + click still work. The 4 angles must produce visibly different views of the cottage cluster (different faces now visible).

- [ ] **Step 2: Confirm it currently fails**

Reload. Press arrow keys. Expected: no camera motion.

- [ ] **Step 3: Create src/scripts/babylon/rotation.ts**

```ts
import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';

const STEP = Math.PI / 2;
const DURATION_MS = 400;

export function wireRotation(camera: ArcRotateCamera): void {
  let animating = false;
  function rotate(delta: number): void {
    if (animating) return;
    animating = true;
    const from = camera.alpha;
    const to = from + delta;
    const start = performance.now();
    function step(now: number): void {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * t); // ease-in-out sine
      camera.alpha = from + (to - from) * ease;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        camera.alpha = to;
        animating = false;
      }
    }
    requestAnimationFrame(step);
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') rotate(-STEP);
    else if (e.key === 'ArrowLeft') rotate(STEP);
  });
}
```

In `spike-scene.ts`:

```ts
import { wireRotation } from './rotation';
// ...
wireRotation(camera);
```

- [ ] **Step 4: Confirm the visual check passes**

Reload. Press `ArrowRight` four times — the scene rotates through 4 quarter-turns and returns to the starting orientation. Verify every angle reads coherently. Press `ArrowLeft`: rotation reverses. Hover + click still work at every angle.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/babylon/rotation.ts src/scripts/babylon/spike-scene.ts
git commit -m "feat(babylon): arrow-key camera rotation in 90° steps

Keydown ArrowLeft/Right animates camera.alpha through a quarter
turn with ease-in-out sine over 400ms. Guards against mid-animation
re-trigger. Orthographic camera in 3D means every angle is coherent
with zero additional asset work — the deferred 'crazy hard' feature
from earlier rounds."
```

---

## Task 18: Side-by-side screenshot comparison — gate decision

**Files:**
- Create: `spike/comparison/babylon-vs-phaser.md`
- Create: `spike/comparison/babylon-default.png` (committed — small screenshot)
- Create: `spike/comparison/phaser-default.png` (committed — small screenshot)
- Create: `spike/comparison/babylon-rotations-nesw.png` (4-panel collage)

- [ ] **Step 1: Define the visual check**

Four screenshots captured and committed: `/babylon-spike` default view, `/phaser-spike` default view at equivalent framing, `/babylon-spike` at the 4 cardinal rotations. A markdown comparison doc summarises the deltas against the 5 success criteria in `docs/superpowers/specs/2026-04-24-babylon-spike-design.md`.

- [ ] **Step 2: Confirm it currently fails**

Run `ls spike/comparison/`. Expected: directory or files missing.

- [ ] **Step 3: Capture screenshots with browser-harness**

```bash
mkdir -p spike/comparison
npm run dev &  # if not already running
# Wait for dev server to settle, then:
browser-harness <<'PY'
import time
new_tab("http://localhost:4321/babylon-spike")
wait_for_load()
time.sleep(1.5)    # let the smoke/brook shaders settle into a representative frame
screenshot(path="/Users/tomweaver/Documents/GitHub/mushroomgreen/spike/comparison/babylon-default.png")

new_tab("http://localhost:4321/phaser-spike")
wait_for_load()
time.sleep(1.5)
screenshot(path="/Users/tomweaver/Documents/GitHub/mushroomgreen/spike/comparison/phaser-default.png")

# 4 rotations of the Babylon spike
new_tab("http://localhost:4321/babylon-spike")
wait_for_load()
time.sleep(1.0)
screenshot(path="/Users/tomweaver/Documents/GitHub/mushroomgreen/spike/comparison/babylon-rot-0.png")
keypress("ArrowRight"); time.sleep(0.7)
screenshot(path="/Users/tomweaver/Documents/GitHub/mushroomgreen/spike/comparison/babylon-rot-90.png")
keypress("ArrowRight"); time.sleep(0.7)
screenshot(path="/Users/tomweaver/Documents/GitHub/mushroomgreen/spike/comparison/babylon-rot-180.png")
keypress("ArrowRight"); time.sleep(0.7)
screenshot(path="/Users/tomweaver/Documents/GitHub/mushroomgreen/spike/comparison/babylon-rot-270.png")
PY
```

Combine the 4 rotation screenshots into one 2×2 collage named `babylon-rotations-nesw.png` (ImageMagick: `magick montage babylon-rot-{0,90,180,270}.png -tile 2x2 -geometry +4+4 babylon-rotations-nesw.png`). Delete the intermediate `babylon-rot-*.png` files.

- [ ] **Step 4: Write the comparison doc**

Create `spike/comparison/babylon-vs-phaser.md`:

```markdown
# /babylon-spike vs /phaser-spike — side by side

Round 3 Babylon.js spike vs Round 2 Phaser spike. Captured 2026-04-XX. The
spike is gated on 5 success criteria from the design spec; this doc is the
input to Tom's gate decision.

## Screenshots

- `babylon-default.png` — Babylon spike at default camera
- `phaser-default.png` — Phaser spike at equivalent framing
- `babylon-rotations-nesw.png` — Babylon spike at 0°/90°/180°/270°

## Success criteria check

| Criterion from spec §Success criteria | Status | Notes |
|---------------------------------------|--------|-------|
| 1. /babylon-spike loads zero console errors | ✅ / ❌ | (fill from reality) |
| 2. Default view: painted tile ground + 6 cottages + brook + one smoke | ✅ / ❌ | (fill) |
| 3. Arrow-key 4-angle rotation coherent | ✅ / ❌ | (fill) |
| 4. Hover tint + tooltip; click → /households/[id]/ | ✅ / ❌ | (fill) |
| 5. Gate decision (Tom) | ⏳ | Pending review |

## Observations vs Phaser spike

- (Fill in concrete visible differences — ground coherence, sprite integration,
  animation quality, rotation, shadows, whatever stands out.)

## Known gaps (deferred, not regressions)

(Reference the spec's "Decisions deferred to production" section; list any
that look particularly exposed in the screenshots.)
```

The three status cells marked `(fill from reality)` get replaced with honest assessment after running through the spike.

- [ ] **Step 5: Confirm the visual check passes**

Run `ls -la spike/comparison/`. Expected: 3 PNGs + 1 markdown doc, all non-zero size. Open the markdown in a preview — the screenshots render inline if using relative image references (add them to the doc).

- [ ] **Step 6: Commit**

```bash
git add spike/comparison/
git commit -m "docs(babylon): spike gate — side-by-side vs phaser spike

Screenshots of /babylon-spike (default + 4 rotations) and
/phaser-spike at equivalent framing, plus a gate checklist against
the 5 success criteria in the design spec. Tom's next step is the
gate decision: clears the Phaser ceiling (→ production plan) or
specific gaps remain (→ iterate in spike)."
```

- [ ] **Step 7: Present to Tom for the gate decision**

Surface the four images + the comparison markdown. Ask explicitly: *"Does this clear the Phaser ceiling, or are there specific gaps that need another spike iteration?"* Wait for the answer before proposing the next round's plan.

---

## Self-review

**Spec coverage check:**

- Spec §Goal — Task 1-18 together implement the spike that clears the Phaser ceiling (Task 18 gate).
- Spec §Reference (Townscaper takeaways) — corner-modular (Task 7-8), dual-graph edge routing (Task 6), feature-appropriate grids (Task 6), pre-baked placement (Task 9), props separate from tiles (Task 10), 3D cheats free (Task 14 shadows, Task 17 rotation).
- Spec §Non-goals — each non-goal appears in the "Decisions deferred to production" list at the end of the spec. Plan does not implement any of them.
- Spec §Engine and projection — Task 2 (orthographic ArcRotateCamera) + Task 3 (projection.ts).
- Spec §Flagged decisions 1-8 — Task 1 (Babylon + repo/route), Task 2 (orthographic), Tasks 4/6/7/10 (Blender MCP pipeline), Task 5 (iso diamond tiles), Task 9 (pre-baked placement), Task 11-12 (brook on edges), Task 10 (props independent), Task 1 (gitignored assets).
- Spec §Architecture Files — exact file list matches plan's File map.
- Spec §Data flow 1-8 — Task 3 (data bridge), Tasks 5-6 (ground), Task 8-9 (buildings), Task 10 (props), Task 11-12 (brook), Task 13 (smoke), Task 15-16 (interactions), Task 17 (rotation).
- Spec §Error handling — Task 1 throws on missing canvas; Task 3 throws on missing scene-data. No WebGL2 fallback (explicitly deferred in spec).
- Spec §Testing — Task 18 screenshots + comparison + gate.
- Spec §Success criteria 1-5 — Task 18 gate table.

**Placeholder scan:**
- No "TBD / TODO / implement later" — all steps have complete code or commands.
- The comparison doc has intentional `(fill from reality)` markers that are part of the task's instruction to record real observations after execution. That's not a plan placeholder — it's the task's deliverable.

**Type consistency:**
- `CottageMetadata` — defined in Task 15, used consistently in Task 15 and Task 16.
- `HouseholdLookup` — defined in Task 16, used in Task 16.
- `BuildingTemplates` — defined in Task 8, used in Tasks 8, 9, 10, 14.
- `PropTemplates` — defined in Task 10, used in Tasks 10, 13, 14.
- Function signatures: `placeCottage` signature changes in Task 14 (adds `shadows`) and Task 15 (adds `metadata`) — both changes are shown in their respective Task 3 (Step 3/4) and propagated at the call site.
- `buildBrook` signature changes in Task 12 (adds `engine`) — propagated at call site.
- `wireInteractions` signature changes in Task 16 (adds `byNumber`) — propagated at call site.
- Module paths consistent throughout: `src/scripts/babylon/*.ts`.
- Asset paths consistent: `public/babylon-sprites/*.glb` referenced from `/babylon-sprites/` URL base.

Plan is clean.
