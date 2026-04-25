# Mushroom Green Sprite Style Guide

Source of truth for every sheet generated via `agent-sprite-forge` (or any other image-2 spritesheet pipeline). Every master prompt cites this document.

The point of this guide is **asset coherence** — the project's Tier-1 must-have. Every new sprite either inherits this DNA or is rejected.

---

## Canonical anchors

These existing keyed sprites set the bar. New sheets must read as if they share authorship.

- **`02-forge-v3-nb2pro-keyed.png`** — forge / industrial buildings. Red brick + slate roof + warm forge glow.
- **`16-worn-redbrick-terrace-imagegen-keyed.png`** — terraced cottages. Red brick + weathered red-clay tile roof.
- **`16-worn-yellow-cottage-imagegen-keyed.png`** — limewash-yellow stone cottage variant.
- **Mood reference:** `spike/vision.png` — painterly Black Country hamlet (atmosphere only; we are *not* aiming at that fidelity).

---

## Palette (sampled from the canonical anchors)

These are starting hex codes — image-2 won't honour them exactly, but the prompt should request them and we audit the output against this spec.

### Brick

- Red brick (cottage): `#a04830` warm red-orange
- Aged red brick (cottage variant): `#8b3a26` slightly cooler
- Soot-darkened brick (forge / chimney): `#5a2418` deep brown-red
- Mortar / grout: `#d8c8a8` light cream
- Limewash yellow stone (yellow-cottage variant): `#b89a5a`

### Roofs

- **Slate** (FORGE / WORKSHOP only) — `#485866` cool grey-blue
- **Slate weathered** — `#3e4651` darker variant
- **Red clay tile** (COTTAGES, terraces, family-clusters) — `#8a4a30` warm red-orange
- **Red clay tile aged** — `#6b3624` darker, weathered

### Wood / trim

- Door / window frame: `#4a3a28` dark warm brown
- Door (older / soot-stained): `#2c2218` near-black

### Stone / chimney / footing

- Stone chimney: `#786858` warm grey
- Cobble footing: `#5a4838` dark warm grey
- Soot patch (ground): `#2c2218`

### Atmosphere

- Forge glow (warm light spill): `#e8a850` warm orange-yellow
- Forge glow core: `#d8743a` deeper orange
- Coal smoke (forge): `#2a2628` cool dark grey
- Wood smoke (chimney): `#6e6660` warm mid-grey

### Terrain / ground

- Pasture green (mid): `#6e7e3e`
- Grass cool variant: `#5e7048`
- Lichen / hedge green: `#4a5a36`
- Muddy tan (lanes / cart tracks): `#7a5a3a`
- Dirt yard (packed earth, soot-flecked): `#4a3a28`
- Brook blue shadow: `#2f5b78`
- Brook blue highlight: `#6fa3c1`

---

## Building-type → roof material

This is the single rule that's caused most asset incoherence so far. Lock it now:

| Building | Roof | Why |
| --- | --- | --- |
| Forge, workshop, industrial | Slate (cool grey-blue) | Heat / spark resistant. Black Country industrial standard. |
| Cottage (any size or family) | Red clay tile (warm orange-red) | Vernacular Black Country residential. |
| Terrace | Red clay tile | Same as cottage. |
| Family cluster (multi-household) | Red clay tile | Same. |
| Bridge | Stone deck, wooden rails | n/a |

Mixing slate on a cottage or clay tile on a forge is an instant reject.

---

## Technique

- **Brushwork-feel** surfaces. Visible imperfection. Painted, not drafted.
- **Brick:** irregular mortar lines, occasional spalled or darker face, soot streaks below windows and chimneys.
- **Slate:** weathered tone variation per tile; not perfectly aligned. Some tiles read as slightly lifted or replaced.
- **Clay tile:** rounded ridge tiles, weathered patches of moss / lichen on the cooler side, slightly sagged ridge line on older buildings.
- **Smoke:** painterly puffs — warm-grey to cool-grey gradient. Forge smoke is darker / sootier than cottage chimney smoke. No particle-dot rendering.
- **Edges:** softened, not vector-clean. Buildings are illustrations, not 3D-renders.
- **Wear:** soot streaks on south-facing walls, muddy splash at the base of doorways, cracked render in patches.

---

## Geometry

- **Projection:** 3/4 isometric (~30° camera tilt, ~45° world rotation).
- **Anchor:** ground contact at sprite-bottom. Building anchor point `(0.5, 0.92)`. Tile / decoration anchor `(0.5, 0.5)` for centred placement.
- **Light direction:** from upper-left (NW). Shadows cast to lower-right.
- **No scene composition** within a single sprite — sprites are single objects on transparent background. The renderer composes the scene.

### Cardinal facings

For buildings that ship with rotation (M0+):

- `NE` — building front-right corner faces camera (default heading)
- `SE` — building front-right corner rotated 90° clockwise
- `SW` — opposite of NE (rear)
- `NW` — building front-left rotated 90° anticlockwise

A facing-set must read as the same building from 4 angles. If the chimney moves to a structurally inconsistent place between facings, the set is rejected.

---

## Sheet format (for `agent-sprite-forge`)

- **Background:** pure green chroma key `#00FF00`. Solid, no gradient.
- **Layout:** grid of N variants in rows. Equal cell size. No overlap. No padding ambiguity (cells touch or have a clear gap).
- **Resolution:** up to 4096×4096 per sheet; cells up to 512px max edge.
- **No text, no borders, no logos, no frame, no watermarks.**
- **One sheet = one prompt = one coherent generation.** The whole point.

---

## Reject rules

- Clean toy-town buildings.
- Generic medieval / fantasy cottages.
- Glossy or vector-perfect edges.
- Neon or oversaturated grass.
- Black water (water must be visibly blue).
- Slate on a cottage, or clay tile on a forge.
- Baked drop-shadow from generation background bleeding into the sprite.
- Front-on or side-on (only 3/4 iso accepted).
- Visible AI text artefacts (always re-roll).
- Different brushwork style across cells of the same sheet.

---

## Mushroom Green specifics

- The hamlet is **1865 Black Country**, England — iron, brick, mud, brook water, smoke. Industrial vernacular, not picturesque.
- The brook (Black Brook) is real and flowing — never dry, never black.
- Buildings are domestic + industrial in close mix; the forge sits among the cottages.
- Vegetation: willow (along the brook), oak, hawthorn, hedgerow, scrub. No exotic species.
- Animals visible: chickens, pigs, dogs, the occasional cat, a horse. No livestock prominent.
- Roads are dirt cart tracks. No paving, no kerbs, no street furniture.

---

## Updates

When a generation pass produces a sprite that's both coherent and pushes the bar, update the canonical anchors list at the top. When a reject pattern recurs, add it to reject rules. This file evolves; commits to it are part of the asset pipeline.
