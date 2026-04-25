# Mushroom Green M0 — Founder Cottage Vignette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployable `/founder/` preview that shows Henry Weaver's cottage (household #22, cluster 8) + the adjacent forge with smoke + a cat + a barrel, viewable from 4 cardinal angles, with pan/zoom, and at least one detail revealed only at high zoom — coherent with the design spec at `docs/superpowers/specs/2026-04-25-mushroom-green-village-map-design.md`.

**Architecture:** A standalone Astro page mounting a Phaser 3 scene that renders a small (≈5×5) hex patch around cluster 8. Sprites come from two image-2 spritesheets generated via Codex's `agent-sprite-forge` skill, sliced and chroma-keyed by the existing `scripts/sprite-pipeline.mjs`. Renderer logic (rotation state, zoom-tier mapping, hex math) is split into pure-JS `.mjs` modules that can be unit-tested with Node's built-in `node:test`. Visual quality is gated by Tom's eyeball, captured via browser-harness.

**Tech Stack:** Astro 5, Phaser 3.90, TypeScript (Astro/Phaser glue), pure ESM `.mjs` (testable logic), `node:test` (unit tests, no install), ImageMagick (chroma-key, via existing pipeline), `agent-sprite-forge` Codex skill (image-2 spritesheets), browser-harness (visual QA).

**Roles:** Codex executes most tasks; Claude reviews + commits + browser-verifies (Codex sandbox can't commit or curl localhost — see `feedback_codex_sandbox_limits` in memory). Tom approves sprite tasks via screenshot review.

---

## File Structure

**New files:**

| File | Responsibility |
| --- | --- |
| `docs/sprite-map/style-guide.md` | Style guide — palette, technique rules, anchor angle, light direction, canonical references, reject rules. Cited by every master prompt. |
| `src/pages/founder.astro` | New Astro page mounting the founder vignette. |
| `src/components/FounderScene.astro` | Component wrapping the Phaser canvas. |
| `src/scripts/founder/scene.ts` | Phaser scene class. Loads sheets, places sprites, drives rotation/zoom. |
| `src/scripts/founder/rotation.mjs` | Pure JS — cardinal rotation state machine + sprite-key resolver. |
| `src/scripts/founder/zoom-detail.mjs` | Pure JS — zoom-tier → detail-tier mapping. |
| `src/scripts/founder/hex.mjs` | Pure JS — axial hex coords ↔ pixel projection for the 5×5 patch. |
| `src/scripts/founder/rotation.test.mjs` | `node:test` for rotation. |
| `src/scripts/founder/zoom-detail.test.mjs` | `node:test` for zoom-tier mapping. |
| `src/scripts/founder/hex.test.mjs` | `node:test` for hex math. |
| `src/data/founder-scene.json` | Founder vignette layout: hex coords for cottage, forge, cat, barrel, terrain types. |
| `assets/sprite-map/raw/founder-and-forge-sheet.png` | Raw image-2 output (untracked artifact). |
| `assets/sprite-map/raw/terrain-mini-sheet.png` | Raw image-2 output (untracked artifact). |
| `public/sprite-map/generated/founder/*.png` | Sliced + keyed sprites (gitignored or committed per existing convention). |

**Modified files:**

| File | Reason |
| --- | --- |
| `src/data/generated-sprite-manifest.json` | Add entries for the new founder/terrain-mini sprites. |
| `scripts/sprite-pipeline.mjs` | Possibly extend to slice multi-frame sheets if it doesn't already handle the founder layout. |

---

# Phase A — Foundations

## Task 1 — Author the style guide

**Files:**
- Create: `docs/sprite-map/style-guide.md`

The style guide locks the prompt vocabulary every spritesheet generation cites. No code yet — this is the upstream input.

- [ ] **Step 1: Audit existing canonical sprites for the style anchor**

Look at `public/sprite-map/generated/` (or `assets/sprite-map/raw/`) for the assets named in the brainstorm:
- `02-forge-v3-nb2pro` family
- `16-worn-*` family

Record their dominant traits: brick colour swatches, slate roof tone, soot/grime patterns, light direction (where shadows fall), 3/4 iso angle.

- [ ] **Step 2: Write the style guide**

Create `docs/sprite-map/style-guide.md` with these sections (no placeholders — fill every field):

```markdown
# Mushroom Green Sprite Style Guide

Source of truth for every sheet generated via agent-sprite-forge.
Every master prompt cites this document.

## Canonical anchors
- Buildings: 02-forge-v3-nb2pro family
- Terrain/props: 16-worn-* family
- Mood reference: spike/vision.png (painterly Black Country hamlet)

## Palette (sample from the canonical anchors)
- Red brick: #8b3a26
- Dark brick (soot-stained): #5a2418
- Slate roof (cool): #3e4651
- Slate roof (warm-aged): #4a4040
- Soot brown: #2c2218
- Limewash cream: #d8c89a
- Muddy tan (lanes): #7a5a3a
- Brook blue (shadow): #2f5b78
- Brook blue (highlight): #6fa3c1
- Lichen green (hedge): #5e7048
- Pasture green (mid): #6e7e3e

## Technique
- Brushwork-feel surfaces; visible imperfection.
- Brick: irregular mortar, occasional spalled face, soot streaks below windows and chimneys.
- Slate: weathered tone variation per tile; not perfectly aligned.
- Smoke: warm-grey to cool-grey gradient, painterly puffs not particle dots.
- Edges: softened, not vector-clean.

## Geometry
- Projection: 3/4 isometric (~30° camera tilt, ~45° world rotation).
- Anchor: ground contact at sprite-bottom; (0.5, 0.92) anchor point.
- Light direction: from upper-left (NW); shadows fall to lower-right.

## Sheet format (for agent-sprite-forge)
- Background: pure green chroma key (#00FF00).
- Layout: grid of N variants, equal cell size, no overlap.
- Resolution: 512px max edge per cell; sheet up to 4096×4096.
- No text, no borders, no logos.

## Reject rules
- Clean toy-town buildings.
- Generic medieval / fantasy cottages.
- Glossy or vector-perfect edges.
- Neon or oversaturated grass.
- Black water (water must be visibly blue).
- Baked drop-shadow from generation background.
- Front-on or side-on (only 3/4 iso accepted).
- Visible AI text artefacts.
```

- [ ] **Step 3: Commit**

```bash
git add docs/sprite-map/style-guide.md
git commit -m "docs(sprite-map): style guide cited by every spritesheet master prompt"
```

---

## Task 2 — Define the founder scene data

**Files:**
- Create: `src/data/founder-scene.json`
- Read: `src/data/clusters.json`, `src/data/cluster-tile-placements.json`, `src/data/sprite-footprints.json`

Encode the M0 vignette layout: which household lives at which hex, where the forge sits, where the cat and barrel sit, what terrain each visible cell shows. Henry Weaver is household #22, cluster 8, currently mapped to hex (q=0, r=-1) per `cluster-tile-placements.json`.

- [ ] **Step 1: Identify the nearest forge cluster**

Read `src/data/clusters.json`. Find clusters where `hasForge: true`. Pick the one geographically nearest cluster 8's centroid `[lat, lon]`. Note its hex coord from `cluster-tile-placements.json`.

- [ ] **Step 2: Write `src/data/founder-scene.json`**

```json
{
  "description": "M0 founder vignette layout — small hex patch around cluster 8 (Henry Weaver household #22).",
  "patchOriginQR": { "q": 0, "r": -1 },
  "patchRadius": 2,
  "buildings": [
    {
      "id": "founder",
      "clusterId": 8,
      "spriteKey": "founder-cottage",
      "footprint": "cottage-large",
      "cellQR": { "q": 0, "r": -1 },
      "primaryHouseholdId": 22
    },
    {
      "id": "adjacent-forge",
      "clusterId": "FILL FROM TASK STEP 1",
      "spriteKey": "adjacent-forge",
      "footprint": "forge",
      "cellQR": { "q": "FILL FROM TASK STEP 1", "r": "FILL FROM TASK STEP 1" }
    }
  ],
  "props": [
    { "id": "cat", "spriteKey": "cat", "cellQR": { "q": 1, "r": -1 }, "offset": [0.3, 0.4] },
    { "id": "barrel", "spriteKey": "barrel", "cellQR": { "q": 0, "r": 0 }, "offset": [-0.2, 0.1] }
  ],
  "terrain": {
    "default": "grass",
    "overrides": {
      "0,-1": "dirt-yard",
      "0,0": "dirt-path",
      "1,-1": "grass",
      "-1,0": "pasture",
      "1,0": "pasture"
    }
  }
}
```

Replace the `FILL FROM TASK STEP 1` placeholders with the actual nearest-forge cluster id and its hex coords. The placeholders are explicit so the file fails loudly if missed.

- [ ] **Step 3: Validate JSON**

```bash
node --input-type=module --eval 'import f from "./src/data/founder-scene.json" with { type: "json" }; if (!f.buildings.find(b => b.id === "founder")) throw new Error("missing founder"); if (typeof f.buildings.find(b => b.id === "adjacent-forge").cellQR.q !== "number") throw new Error("forge cellQR not filled in"); console.log("OK");'
```
Expected: `OK`. If you see "forge cellQR not filled in", go back to Step 2.

- [ ] **Step 4: Commit**

```bash
git add src/data/founder-scene.json
git commit -m "data(founder): vignette layout for M0 — cottage, forge, cat, barrel, terrain"
```

---

# Phase B — Renderer scaffolding

## Task 3 — Pure-JS hex math module

**Files:**
- Create: `src/scripts/founder/hex.mjs`
- Create: `src/scripts/founder/hex.test.mjs`

Axial hex coordinates → pixel coordinates for the founder patch. Pure function. Unit-tested. No Phaser dependency yet.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/founder/hex.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { axialToPixel, pixelToAxial, neighbours } from './hex.mjs';

const HEX_SIZE = 32;

test('axialToPixel maps origin to (0, 0)', () => {
  const { x, y } = axialToPixel({ q: 0, r: 0 }, HEX_SIZE);
  assert.equal(x, 0);
  assert.equal(y, 0);
});

test('axialToPixel maps (1, 0) to flat-top neighbour east', () => {
  const { x } = axialToPixel({ q: 1, r: 0 }, HEX_SIZE);
  assert.ok(x > 0, `expected x > 0, got ${x}`);
});

test('pixelToAxial round-trips axialToPixel', () => {
  const before = { q: 2, r: -3 };
  const { x, y } = axialToPixel(before, HEX_SIZE);
  const after = pixelToAxial({ x, y }, HEX_SIZE);
  assert.deepEqual(after, before);
});

test('neighbours returns 6 cells', () => {
  const ns = neighbours({ q: 0, r: 0 });
  assert.equal(ns.length, 6);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test src/scripts/founder/hex.test.mjs
```
Expected: FAIL with "Cannot find module './hex.mjs'".

- [ ] **Step 3: Implement `hex.mjs`**

Use the same odd-q axial layout the existing renderer uses (per `cluster-tile-placements.json` which says "odd-q hex coordinate system"). Confirm by reading `src/scripts/sprite-village-map.ts` for the existing `axialToPixel` math, and mirror its convention.

```js
// src/scripts/founder/hex.mjs
// Flat-top axial hex math, odd-q offset (matches src/data/cluster-tile-placements.json convention).

const SQRT3 = Math.sqrt(3);

export function axialToPixel({ q, r }, size) {
  const x = size * (3 / 2) * q;
  const y = size * SQRT3 * (r + q / 2);
  return { x, y };
}

export function pixelToAxial({ x, y }, size) {
  const q = (2 / 3) * x / size;
  const r = (-1 / 3) * x / size + (SQRT3 / 3) * y / size;
  return roundAxial({ q, r });
}

function roundAxial({ q, r }) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function neighbours({ q, r }) {
  return [
    { q: q + 1, r }, { q: q - 1, r },
    { q, r: r + 1 }, { q, r: r - 1 },
    { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
  ];
}
```

- [ ] **Step 4: Run tests**

```bash
node --test src/scripts/founder/hex.test.mjs
```
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/founder/hex.mjs src/scripts/founder/hex.test.mjs
git commit -m "feat(founder): pure-JS axial hex math + node:test coverage"
```

---

## Task 4 — Cardinal rotation state machine

**Files:**
- Create: `src/scripts/founder/rotation.mjs`
- Create: `src/scripts/founder/rotation.test.mjs`

Holds the current heading (`NE | SE | SW | NW`), advances on rotate-left / rotate-right input, and resolves a sprite key (e.g. `founder-cottage`) + heading into the manifest key for the right facing (e.g. `founder-cottage-NE`).

- [ ] **Step 1: Write the failing test**

```js
// src/scripts/founder/rotation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRotation, rotateLeft, rotateRight, resolveFacing, headings } from './rotation.mjs';

test('createRotation defaults to NE', () => {
  assert.equal(createRotation().heading, 'NE');
});

test('rotateRight cycles NE → SE → SW → NW → NE', () => {
  let r = createRotation();
  r = rotateRight(r); assert.equal(r.heading, 'SE');
  r = rotateRight(r); assert.equal(r.heading, 'SW');
  r = rotateRight(r); assert.equal(r.heading, 'NW');
  r = rotateRight(r); assert.equal(r.heading, 'NE');
});

test('rotateLeft cycles NE → NW → SW → SE → NE', () => {
  let r = createRotation();
  r = rotateLeft(r); assert.equal(r.heading, 'NW');
  r = rotateLeft(r); assert.equal(r.heading, 'SW');
  r = rotateLeft(r); assert.equal(r.heading, 'SE');
  r = rotateLeft(r); assert.equal(r.heading, 'NE');
});

test('resolveFacing returns "<key>-<heading>" for buildings', () => {
  assert.equal(resolveFacing('founder-cottage', 'NE'), 'founder-cottage-NE');
  assert.equal(resolveFacing('adjacent-forge', 'SW'), 'adjacent-forge-SW');
});

test('resolveFacing returns plain key for orientation-agnostic sprites', () => {
  assert.equal(resolveFacing('grass', 'NE', { orientationAgnostic: true }), 'grass');
  assert.equal(resolveFacing('cat', 'SW', { orientationAgnostic: true }), 'cat');
});

test('headings exposes the four cardinals in cycle order', () => {
  assert.deepEqual(headings, ['NE', 'SE', 'SW', 'NW']);
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
node --test src/scripts/founder/rotation.test.mjs
```
Expected: FAIL "Cannot find module './rotation.mjs'".

- [ ] **Step 3: Implement `rotation.mjs`**

```js
// src/scripts/founder/rotation.mjs
export const headings = ['NE', 'SE', 'SW', 'NW'];

export function createRotation() {
  return { heading: 'NE' };
}

export function rotateRight(state) {
  const i = headings.indexOf(state.heading);
  return { heading: headings[(i + 1) % headings.length] };
}

export function rotateLeft(state) {
  const i = headings.indexOf(state.heading);
  return { heading: headings[(i + headings.length - 1) % headings.length] };
}

export function resolveFacing(spriteKey, heading, opts = {}) {
  if (opts.orientationAgnostic) return spriteKey;
  return `${spriteKey}-${heading}`;
}
```

- [ ] **Step 4: Run tests**

```bash
node --test src/scripts/founder/rotation.test.mjs
```
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/founder/rotation.mjs src/scripts/founder/rotation.test.mjs
git commit -m "feat(founder): cardinal rotation state + facing resolver"
```

---

## Task 5 — Zoom-tier mapping

**Files:**
- Create: `src/scripts/founder/zoom-detail.mjs`
- Create: `src/scripts/founder/zoom-detail.test.mjs`

Maps a Phaser camera zoom value to a detail tier (`overview | mid | close`). Used to swap to a higher-detail sprite at high zoom. Three tiers — close-tier triggers the "more detail at zoom" lodestar requirement.

- [ ] **Step 1: Write the failing test**

```js
// src/scripts/founder/zoom-detail.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailTier, resolveDetailKey } from './zoom-detail.mjs';

test('detailTier returns "overview" below mid threshold', () => {
  assert.equal(detailTier(0.5), 'overview');
  assert.equal(detailTier(1.0), 'overview');
});

test('detailTier returns "mid" between mid and close thresholds', () => {
  assert.equal(detailTier(1.5), 'mid');
  assert.equal(detailTier(2.0), 'mid');
});

test('detailTier returns "close" at and above close threshold', () => {
  assert.equal(detailTier(2.5), 'close');
  assert.equal(detailTier(4.0), 'close');
});

test('resolveDetailKey adds "-close" suffix only at close tier', () => {
  assert.equal(resolveDetailKey('founder-cottage-NE', 'overview'), 'founder-cottage-NE');
  assert.equal(resolveDetailKey('founder-cottage-NE', 'mid'), 'founder-cottage-NE');
  assert.equal(resolveDetailKey('founder-cottage-NE', 'close'), 'founder-cottage-NE-close');
});

test('resolveDetailKey returns base key when no close variant exists', () => {
  // For sprites without a -close variant, the renderer should fall back to base.
  // This module just resolves the candidate key; the renderer checks the manifest.
  assert.equal(resolveDetailKey('grass', 'close'), 'grass-close');
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
node --test src/scripts/founder/zoom-detail.test.mjs
```

- [ ] **Step 3: Implement**

```js
// src/scripts/founder/zoom-detail.mjs
const MID_THRESHOLD = 1.25;
const CLOSE_THRESHOLD = 2.25;

export function detailTier(zoom) {
  if (zoom >= CLOSE_THRESHOLD) return 'close';
  if (zoom >= MID_THRESHOLD) return 'mid';
  return 'overview';
}

export function resolveDetailKey(baseKey, tier) {
  if (tier === 'close') return `${baseKey}-close`;
  return baseKey;
}
```

- [ ] **Step 4: Run tests**

```bash
node --test src/scripts/founder/zoom-detail.test.mjs
```
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/founder/zoom-detail.mjs src/scripts/founder/zoom-detail.test.mjs
git commit -m "feat(founder): zoom-tier mapping with close-detail key resolver"
```

---

## Task 6 — Astro page + empty Phaser canvas

**Files:**
- Create: `src/pages/founder.astro`
- Create: `src/components/FounderScene.astro`
- Create: `src/scripts/founder/scene.ts`

Mounts a blank Phaser canvas at `/founder/`. No sprites yet — just verifying the page builds and the Phaser scene boots.

- [ ] **Step 1: Write `src/components/FounderScene.astro`**

```astro
---
// Founder vignette canvas — Phaser 3 mount.
---
<div id="founder-canvas" class="founder-canvas" data-astro-cid-founder>
  <noscript>JavaScript is required to view the founder vignette.</noscript>
</div>

<script>
  import Phaser from 'phaser';
  import { createScene } from '../scripts/founder/scene.ts';

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'founder-canvas',
    backgroundColor: '#dde7d4',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: createScene(),
  });
  // Expose for debug
  (window as any).__founderGame = game;
</script>

<style>
  .founder-canvas {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>
```

- [ ] **Step 2: Write `src/pages/founder.astro`**

```astro
---
import FounderScene from '../components/FounderScene.astro';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Founder Cottage — Mushroom Green 1865</title>
    <meta name="description" content="The Henry Weaver founder cottage in 1865 Mushroom Green, viewable from four cardinal angles." />
  </head>
  <body>
    <FounderScene />
  </body>
</html>
```

- [ ] **Step 3: Write minimal Phaser scene**

```ts
// src/scripts/founder/scene.ts
import Phaser from 'phaser';

class FounderScene extends Phaser.Scene {
  constructor() { super({ key: 'FounderScene' }); }

  preload() {
    // Sheets get added in Task 11.
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Founder vignette — boot OK', {
      color: '#3a2f1c',
      fontFamily: 'serif',
      fontSize: '24px',
    }).setOrigin(0.5);
  }
}

export function createScene() {
  return [FounderScene];
}
```

- [ ] **Step 4: Build and verify the page renders**

```bash
npm run build
```
Expected: build succeeds, no errors. The Astro output should contain a `founder/index.html`.

```bash
/usr/bin/find dist/founder -name 'index.html' 2>/dev/null | head -1
```
Expected: a path is printed.

- [ ] **Step 5: Browser-harness check (Claude only — Codex sandbox can't curl localhost)**

Hand back to Claude. Claude runs `npm run dev` in background, navigates browser-harness to `http://localhost:4321/founder/`, captures `spike/screenshots/m0/01-boot.png`, confirms the "boot OK" text is visible, and closes dev server.

- [ ] **Step 6: Commit**

```bash
git add src/pages/founder.astro src/components/FounderScene.astro src/scripts/founder/scene.ts
git commit -m "feat(founder): scaffold /founder/ page + empty Phaser scene"
```

---

## Task 7 — Render hex patch + camera controls

**Files:**
- Modify: `src/scripts/founder/scene.ts`

Replace the placeholder text with a 5×5 hex patch using the `hex.mjs` module. Add Phaser camera controls: pan (drag), zoom (wheel), keyboard rotation (left/right arrow keys → publish a rotation event the scene listens for, even though we don't have facing sprites yet).

- [ ] **Step 1: Update `scene.ts`**

```ts
// src/scripts/founder/scene.ts
import Phaser from 'phaser';
import { axialToPixel, neighbours } from './hex.mjs';
import { createRotation, rotateLeft, rotateRight } from './rotation.mjs';
import { detailTier } from './zoom-detail.mjs';

const HEX_SIZE = 64;
const PATCH_RADIUS = 2;

class FounderScene extends Phaser.Scene {
  private rotation = createRotation();
  private hudText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'FounderScene' }); }

  create() {
    const { width, height } = this.scale;

    // Draw the hex patch as outlines so we can see structure.
    const g = this.add.graphics({ lineStyle: { color: 0x6e7e3e, width: 1, alpha: 0.6 } });
    const cells = this.computePatchCells(PATCH_RADIUS);
    for (const cell of cells) {
      const { x, y } = axialToPixel(cell, HEX_SIZE);
      this.drawHex(g, x + width / 2, y + height / 2, HEX_SIZE);
    }

    // HUD (heading + zoom tier).
    this.hudText = this.add.text(16, 16, '', {
      color: '#3a2f1c', fontFamily: 'monospace', fontSize: '14px',
    }).setScrollFactor(0).setDepth(1000);
    this.updateHud();

    // Camera: pan (drag), zoom (wheel).
    const cam = this.cameras.main;
    cam.setBackgroundColor('#dde7d4');
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });
    this.input.on('wheel', (_p: any, _o: any, _dx: number, dy: number) => {
      cam.zoom = Phaser.Math.Clamp(cam.zoom * (dy < 0 ? 1.1 : 0.9), 0.4, 4.0);
      this.updateHud();
    });

    // Rotation: arrow keys.
    const left = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const right = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    left?.on('down', () => { this.rotation = rotateLeft(this.rotation); this.updateHud(); this.events.emit('rotation-changed'); });
    right?.on('down', () => { this.rotation = rotateRight(this.rotation); this.updateHud(); this.events.emit('rotation-changed'); });
  }

  private computePatchCells(radius: number) {
    const cells = [{ q: 0, r: 0 }];
    let frontier = [{ q: 0, r: 0 }];
    for (let i = 0; i < radius; i++) {
      const next: typeof frontier = [];
      for (const c of frontier) {
        for (const n of neighbours(c)) {
          if (!cells.some(x => x.q === n.q && x.r === n.r)) {
            cells.push(n); next.push(n);
          }
        }
      }
      frontier = next;
    }
    return cells;
  }

  private drawHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      pts.push(cx + size * Math.cos(a), cy + size * Math.sin(a));
    }
    g.strokePoints([
      { x: pts[0], y: pts[1] }, { x: pts[2], y: pts[3] }, { x: pts[4], y: pts[5] },
      { x: pts[6], y: pts[7] }, { x: pts[8], y: pts[9] }, { x: pts[10], y: pts[11] },
    ], true);
  }

  private updateHud() {
    const z = this.cameras.main.zoom;
    this.hudText.setText(`heading: ${this.rotation.heading}    zoom: ${z.toFixed(2)} (${detailTier(z)})`);
  }
}

export function createScene() {
  return [FounderScene];
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Browser-harness check (Claude)**

Run dev. Navigate to `/founder/`. Verify:
- 19 hex outlines visible (radius-2 patch = 1 + 6 + 12 = 19).
- HUD top-left shows `heading: NE  zoom: 1.00 (overview)`.
- Wheel zoom changes the zoom value and the tier label.
- Drag pans.
- Arrow keys cycle the heading through `NE → SE → SW → NW`.
Capture `spike/screenshots/m0/02-hex-patch.png`.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/founder/scene.ts
git commit -m "feat(founder): hex patch + pan/zoom + cardinal rotation HUD"
```

---

# Phase C — Sprite production

## Task 8 — Generate the founder-and-forge sheet

**Files:**
- Create: `assets/sprite-map/raw/founder-and-forge-sheet.png` (artifact, not committed)
- Reference: `docs/sprite-map/style-guide.md`

Codex generates one coherent spritesheet containing: Henry Weaver's cottage in 4 cardinal facings (NE/SE/SW/NW), the adjacent forge in 4 facings × N smoke frames (target 6 frames per facing), a sitting cat (orientation-agnostic), and a barrel (orientation-agnostic). Single image-2 generation pass for coherence.

- [ ] **Step 1: Confirm `agent-sprite-forge` Codex skill is available**

Inside Codex, run `/skill agent-sprite-forge` (or whichever invocation form your Codex CLI uses) to confirm it loads. If it doesn't, install per the agent-sprite-forge README — the skill is open-source by gabrielchua. Don't proceed until the skill answers.

- [ ] **Step 2: Compose the master prompt**

Open `docs/sprite-map/style-guide.md`. Compose the master prompt as:

```
Generate a single spritesheet, pure green chroma-key background (#00FF00),
cells in a tight grid, no overlap, no text, no borders.

Style guide: <paste style-guide.md verbatim>

Sheet contents (label cells in reading order):
Row 1 — Henry Weaver cottage, 4 cardinal 3/4-iso facings: NE, SE, SW, NW.
        Worn redbrick, weathered slate, soot streaks. ~3-bay cottage.
Row 2 — Adjacent forge, 4 cardinal 3/4-iso facings: NE, SE, SW, NW.
        Dark soot-stained brick, slate roof, visible chimney with warm
        forge-glow at the door. NO smoke yet.
Row 3 — Forge smoke loop, 6 frames (rising drift), used for any facing.
        Painterly grey-warm puffs, transparent edges.
Row 4 — Cat (sitting), single sprite, orientation-agnostic.
        Tabby, alert, ground-shadow.
Row 5 — Barrel (oak, banded iron), single sprite, orientation-agnostic.

Output: 4096x4096 max, even cell sizes, PNG.
```

- [ ] **Step 3: Run agent-sprite-forge**

Invoke the skill (Codex CLI: `/skill agent-sprite-forge` or equivalent). Provide the master prompt. Save output to `assets/sprite-map/raw/founder-and-forge-sheet.png`.

- [ ] **Step 4: Sanity-eye the sheet**

Open the file. Verify all 4+4+6+1+1 = 16 cells are present, that the cottage NE/SE/SW/NW look like the same building from 4 sides, and that the smoke frames form a plausible drift loop.

If the sheet is incoherent (different style across rows, broken facings, etc.), iterate the prompt and re-run. Coherence is non-negotiable — this sheet is the M0 quality bar.

- [ ] **Step 5: Tom-gate (HUMAN required)**

Show the sheet to Tom. He approves or sends back. Iterate until approved. Do not proceed without approval.

- [ ] **Step 6: Commit raw output**

`assets/` may or may not be gitignored — check `.gitignore`. If raw assets are tracked:
```bash
git add assets/sprite-map/raw/founder-and-forge-sheet.png
git commit -m "asset(founder): raw image-2 sheet — cottage 4-up + forge 4-up + smoke 6-frame + cat + barrel"
```
Otherwise note the SHA1 of the file in the commit message of Task 10.

---

## Task 9 — Generate the terrain-mini sheet

**Files:**
- Create: `assets/sprite-map/raw/terrain-mini-sheet.png` (artifact)

Three hex tile types: grass/pasture, dirt path, dirt yard. Orientation-agnostic. Each painted as a hex shape (not square) so they slot into the renderer.

- [ ] **Step 1: Compose the prompt**

```
Generate a single spritesheet, pure green chroma-key background (#00FF00),
3 hex-shaped tiles in a row, equal cell size, no overlap.

Style guide: <paste style-guide.md verbatim>

Cells:
1. Grass / pasture — mid-green with subtle painterly variation, hint of clover.
2. Dirt path — muddy tan, soft cart-rut texture, slight darker centre.
3. Dirt yard — packed earth, scattered stones, soot-darker than the path.

Hex shape: flat-top (pointy sides east/west). Each tile fills its hex
fully, edge-to-edge, transparent corners. Top surface only — no thickness.

Output: 4096x4096 max, even cell sizes, PNG.
```

- [ ] **Step 2: Run agent-sprite-forge** → `assets/sprite-map/raw/terrain-mini-sheet.png`

- [ ] **Step 3: Tom-gate** — show, iterate if needed, approve.

- [ ] **Step 4: Commit raw** (if assets tracked).

---

## Task 10 — Slice + key sheets, update manifest

**Files:**
- Modify: `scripts/sprite-pipeline.mjs` (only if it can't already handle the founder layout)
- Modify: `src/data/generated-sprite-manifest.json`
- Create: `public/sprite-map/generated/founder/*.png`

Run the existing pipeline against the new sheets, slicing each cell into a transparent PNG and writing manifest entries with anchor + dimensions.

- [ ] **Step 1: Read `scripts/sprite-pipeline.mjs` end-to-end**

Understand its expected input layout. If it expects single-sprite input rather than a multi-cell sheet, you'll need to either:
(a) extend the pipeline to handle a `--layout founder-and-forge` mode that knows the cell grid, or
(b) pre-slice the sheet manually (ImageMagick crop) and feed each cell into the existing single-sprite pipeline.

(b) is simpler. Pick (b) unless you find an existing layout-aware path.

- [ ] **Step 2: Slice the founder sheet**

```bash
mkdir -p public/sprite-map/generated/founder
# Inspect the sheet to determine cell pixel size.
magick identify assets/sprite-map/raw/founder-and-forge-sheet.png

# Crop each cell. Replace CELL_W/CELL_H with the actual values.
# Row 1 (cottage): cells 0..3 → -NE/-SE/-SW/-NW.
for i in 0 1 2 3; do
  magick assets/sprite-map/raw/founder-and-forge-sheet.png \
    -crop CELL_WxCELL_H+$((i*CELL_W))+0 +repage \
    public/sprite-map/generated/founder/founder-cottage-row1-cell${i}.png
done
# Repeat for forge row, smoke row, cat, barrel — same pattern, different y offsets.
```

Then run the chroma-key pipeline against each sliced cell (existing `scripts/sprite-pipeline.mjs` handles single-sprite chroma-key removal):

```bash
npm run sprites:pipeline -- --input public/sprite-map/generated/founder --output public/sprite-map/generated/founder
```

- [ ] **Step 3: Rename to manifest keys**

```
founder-cottage-NE.png, founder-cottage-SE.png, founder-cottage-SW.png, founder-cottage-NW.png
adjacent-forge-NE.png, adjacent-forge-SE.png, adjacent-forge-SW.png, adjacent-forge-NW.png
forge-smoke-frame-1.png ... forge-smoke-frame-6.png
cat.png
barrel.png
grass.png, dirt-path.png, dirt-yard.png
```

- [ ] **Step 4: Add manifest entries**

For each new sprite, append to `src/data/generated-sprite-manifest.json` following the existing schema. Include: key, file path, width, height, anchor `(0.5, 0.92)` for buildings, `(0.5, 0.5)` for tiles, status `"accepted"`, category, source sheet.

If unsure of the schema, read existing entries in the file first and mirror their shape exactly.

- [ ] **Step 5: Verify manifest loads**

```bash
node --input-type=module --eval 'import m from "./src/data/generated-sprite-manifest.json" with { type: "json" }; const need = ["founder-cottage-NE","adjacent-forge-NE","forge-smoke-frame-1","cat","barrel","grass","dirt-path","dirt-yard"]; const missing = need.filter(k => !m.sprites?.[k] && !m[k]); if (missing.length) throw new Error("missing: " + missing.join(", ")); console.log("OK");'
```
(Adjust the lookup path `m.sprites?.[k]` if the manifest's top-level shape differs.)

Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/sprite-pipeline.mjs src/data/generated-sprite-manifest.json public/sprite-map/generated/founder/
git commit -m "asset(founder): sliced + keyed founder/forge/smoke/props/terrain sprites + manifest"
```

---

# Phase D — Integration

## Task 11 — Render the terrain hex floor

**Files:**
- Modify: `src/scripts/founder/scene.ts`

Load the terrain sprites in `preload()`. In `create()`, replace the outline-only graphics from Task 7 with painted terrain hexes — each cell rendered as a sprite, terrain type taken from `founder-scene.json`'s `terrain.overrides` (default `grass`).

- [ ] **Step 1: Update `scene.ts`**

Add:

```ts
import sceneData from '../../data/founder-scene.json';
import manifest from '../../data/generated-sprite-manifest.json';

// In preload():
this.load.image('grass', '/sprite-map/generated/founder/grass.png');
this.load.image('dirt-path', '/sprite-map/generated/founder/dirt-path.png');
this.load.image('dirt-yard', '/sprite-map/generated/founder/dirt-yard.png');

// Replace the graphics-outline loop in create() with:
const cells = this.computePatchCells(PATCH_RADIUS);
for (const cell of cells) {
  const { x, y } = axialToPixel(cell, HEX_SIZE);
  const key = `${cell.q},${cell.r}`;
  const terrain = (sceneData as any).terrain.overrides[key] ?? (sceneData as any).terrain.default;
  this.add.image(x + width / 2, y + height / 2, terrain).setOrigin(0.5);
}
```

- [ ] **Step 2: Build + browser-harness verify (Claude)**

```bash
npm run build
```

Run dev, capture `spike/screenshots/m0/03-terrain.png`. The 19-hex patch should now show painted terrain — predominantly grass, with dirt-yard at (0,-1) and dirt-path at (0,0).

- [ ] **Step 3: Commit**

```bash
git add src/scripts/founder/scene.ts
git commit -m "feat(founder): paint terrain hexes from founder-scene.json"
```

---

## Task 12 — Render founder cottage with cardinal facings

**Files:**
- Modify: `src/scripts/founder/scene.ts`

Place the founder cottage at its hex with the right facing for current rotation. Re-render on rotation-change event from Task 7. Use `resolveFacing` from `rotation.mjs`.

- [ ] **Step 1: Update `scene.ts`**

```ts
import { resolveFacing } from './rotation.mjs';

// preload — load all 4 facings:
for (const h of ['NE','SE','SW','NW']) {
  this.load.image(`founder-cottage-${h}`, `/sprite-map/generated/founder/founder-cottage-${h}.png`);
}

// in create() — after terrain loop:
const founder = (sceneData as any).buildings.find((b: any) => b.id === 'founder');
const fp = axialToPixel(founder.cellQR, HEX_SIZE);
const founderSprite = this.add.image(
  fp.x + width / 2, fp.y + height / 2,
  resolveFacing('founder-cottage', this.rotation.heading)
).setOrigin(0.5, 0.92);

this.events.on('rotation-changed', () => {
  founderSprite.setTexture(resolveFacing('founder-cottage', this.rotation.heading));
});
```

- [ ] **Step 2: Build + verify**

```bash
npm run build
```

Capture `spike/screenshots/m0/04-cottage-NE.png`, then press right-arrow once and capture `04-cottage-SE.png`, etc. for all 4 facings. Verify:
- Cottage is anchored at its hex base (not floating).
- Each rotation reveals a different side.
- Smooth re-render with no gap.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/founder/scene.ts
git commit -m "feat(founder): cottage rotates through 4 cardinal facings"
```

---

## Task 13 — Render forge with smoke + cat + barrel

**Files:**
- Modify: `src/scripts/founder/scene.ts`

Add the adjacent forge (4 facings, same swap pattern). Add a 6-frame smoke loop animated via Phaser's `anims`. Add the cat and barrel as orientation-agnostic decorations using their cellQR + offset.

- [ ] **Step 1: Update `scene.ts`**

```ts
// preload — load forge facings + smoke frames + props:
for (const h of ['NE','SE','SW','NW']) {
  this.load.image(`adjacent-forge-${h}`, `/sprite-map/generated/founder/adjacent-forge-${h}.png`);
}
for (let i = 1; i <= 6; i++) {
  this.load.image(`forge-smoke-frame-${i}`, `/sprite-map/generated/founder/forge-smoke-frame-${i}.png`);
}
this.load.image('cat', '/sprite-map/generated/founder/cat.png');
this.load.image('barrel', '/sprite-map/generated/founder/barrel.png');

// after cottage placement:
const forge = (sceneData as any).buildings.find((b: any) => b.id === 'adjacent-forge');
const fpf = axialToPixel(forge.cellQR, HEX_SIZE);
const forgeSprite = this.add.image(fpf.x + width / 2, fpf.y + height / 2,
  resolveFacing('adjacent-forge', this.rotation.heading))
  .setOrigin(0.5, 0.92);
this.events.on('rotation-changed', () => {
  forgeSprite.setTexture(resolveFacing('adjacent-forge', this.rotation.heading));
});

// Smoke animation
this.anims.create({
  key: 'forge-smoke',
  frames: Array.from({ length: 6 }, (_, i) => ({ key: `forge-smoke-frame-${i + 1}` })),
  frameRate: 6,
  repeat: -1,
});
this.add.sprite(
  fpf.x + width / 2,
  fpf.y + height / 2 - 80, // above the forge roof
  'forge-smoke-frame-1'
).play('forge-smoke').setOrigin(0.5, 1.0);

// Props
for (const prop of (sceneData as any).props) {
  const pp = axialToPixel(prop.cellQR, HEX_SIZE);
  this.add.image(
    pp.x + width / 2 + (prop.offset?.[0] ?? 0) * HEX_SIZE,
    pp.y + height / 2 + (prop.offset?.[1] ?? 0) * HEX_SIZE,
    prop.spriteKey
  ).setOrigin(0.5, 0.92);
}
```

- [ ] **Step 2: Build + verify**

```bash
npm run build
```

Capture `spike/screenshots/m0/05-full-vignette.png`. Verify:
- Forge sits on its assigned hex, rotates with arrow keys.
- Smoke loops smoothly above the forge — no jitter, no gap.
- Cat and barrel placed visibly in the scene.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/founder/scene.ts
git commit -m "feat(founder): forge with animated smoke + cat + barrel"
```

---

## Task 14 — Detail reveal on close zoom

**Files:**
- Modify: `src/scripts/founder/scene.ts`
- Reference: `src/scripts/founder/zoom-detail.mjs`

When zoom crosses the close threshold, swap the founder cottage to a `-close` variant if available in the manifest. This is the "more you zoom, more you see" lodestar requirement.

> If `agent-sprite-forge` couldn't produce a `founder-cottage-NE-close` variant (and the others), Task 8 should be re-run with an additional close-detail row OR the close variant can be a hand-painted overlay added in a subsequent commit. M0 needs at least ONE close-tier swap to validate the mechanic — door knocker, soot streaks visible, the cat's eyes opening, anything.

- [ ] **Step 1: Decide which sprite gets the close variant**

The cat is the obvious one (most charm-per-pixel): generate a second cat sprite with eyes open or whiskers detailed, name it `cat-close.png`, add to manifest. If you ran Task 8/10 with this in mind, you already have it. If not, run agent-sprite-forge for just `cat-close` now.

- [ ] **Step 2: Update `scene.ts`**

```ts
import { detailTier, resolveDetailKey } from './zoom-detail.mjs';

// Track the prop sprites we want to detail-swap:
const detailSwapSprites: Array<{
  base: string; agnostic: boolean; sprite: Phaser.GameObjects.Image;
}> = [];

// When you create the cat sprite, push it:
const catSprite = this.add.image(/* … */).setOrigin(0.5, 0.92);
detailSwapSprites.push({ base: 'cat', agnostic: true, sprite: catSprite });

// In wheel handler (extend existing):
this.input.on('wheel', (_p: any, _o: any, _dx: number, dy: number) => {
  cam.zoom = Phaser.Math.Clamp(cam.zoom * (dy < 0 ? 1.1 : 0.9), 0.4, 4.0);
  this.updateHud();

  const tier = detailTier(cam.zoom);
  for (const swap of detailSwapSprites) {
    const baseKey = swap.agnostic ? swap.base : resolveFacing(swap.base, this.rotation.heading);
    const wantKey = resolveDetailKey(baseKey, tier);
    // Only swap if the close variant actually exists in the texture cache.
    const finalKey = this.textures.exists(wantKey) ? wantKey : baseKey;
    if (swap.sprite.texture.key !== finalKey) swap.sprite.setTexture(finalKey);
  }
});
```

- [ ] **Step 3: Build + verify**

```bash
npm run build
```

In the browser, zoom in past 2.25× and confirm the cat swaps to `cat-close`. Capture `spike/screenshots/m0/06-detail-reveal.png` showing the close-tier variant.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/founder/scene.ts
git commit -m "feat(founder): zoom-tier detail reveal — close variant swap"
```

---

# Phase E — QA + ship

## Task 15 — Browser-harness verification + Tom gate

**Files:** none (pure verification)

The lodestar moment requires Tom (and ultimately his father) to react. M0 ships when Tom approves the captured screenshots.

- [ ] **Step 1: Capture the canonical screenshot set (Claude only)**

Start dev server. Navigate browser-harness to `/founder/`. Capture each:
- `m0/canonical-NE.png` — default facing, default zoom.
- `m0/canonical-SE.png`, `m0/canonical-SW.png`, `m0/canonical-NW.png` — three rotations.
- `m0/canonical-zoom-mid.png` — mid-tier zoom (~1.5×) on NE facing.
- `m0/canonical-zoom-close.png` — close-tier zoom (~2.5×) on NE facing, showing the cat-close detail.

Save under `spike/screenshots/m0/`.

- [ ] **Step 2: Run Lighthouse-light or just confirm load time**

```bash
node --input-type=module --eval '
  const start = Date.now();
  await fetch("http://localhost:4321/founder/");
  console.log("First-byte:", Date.now() - start, "ms");
'
```
Expected: under 1000ms. If notably slower, profile the Phaser scene size.

- [ ] **Step 3: Tom-gate (HUMAN required)**

Send the 6 screenshots to Tom. He responds with "approved" or specific revision asks. Iterate on whichever Phase D task is implicated until approved.

> The bar is the lodestar from §1 of the spec: would Tom's father zoom in, rotate, see smoke and the cat, and be moved? If the answer isn't an obvious yes from the screenshots alone, M0 isn't done.

- [ ] **Step 4: Update `.project-status.md`**

Reflect M0 ship status. Move M1 (hamlet centre) to `next-for-claude` so the next session knows where to pick up.

- [ ] **Step 5: Commit**

```bash
git add spike/screenshots/m0/ .project-status.md
git commit -m "ship(founder-m0): vignette approved — cottage 4-up + forge smoke + cat detail reveal"
```

- [ ] **Step 6: (Optional) Tom deploys**

If Tom wants to push the preview live: `git push`. Netlify (or whatever hosts mushroomgreen.uk) will deploy `/founder/` automatically. Otherwise M0 ships as a local-dev artifact and waits for M1 to ride along to production.

---

## Self-Review Notes

Spec coverage check:

| Spec requirement | Plan task |
| --- | --- |
| Founder cottage Henry Weaver #22, cluster 8 | Task 2, 8, 12 |
| 4 cardinal facings | Tasks 4, 8, 12 |
| Adjacent forge with smoke | Tasks 8, 13 |
| A cat and a barrel | Tasks 8, 13 |
| Painted-hex terrain patch | Tasks 9, 11 |
| Pan + zoom | Task 7 |
| Detail reveal at deep zoom | Tasks 5, 14 |
| Style guide written | Task 1 |
| Coherent image-2 sheet end-to-end | Tasks 8, 9 |
| `/founder/` route | Task 6 |
| Visual QA via browser-harness | Tasks 6, 7, 11, 12, 13, 14, 15 |
| Tom-gate before ship | Tasks 8, 9, 15 |

No placeholders other than the explicit `FILL FROM TASK STEP 1` markers in Task 2 (intentional — they fail loudly if missed). Type/property names consistent across tasks (`spriteKey`, `cellQR`, `heading`, `tier`).
