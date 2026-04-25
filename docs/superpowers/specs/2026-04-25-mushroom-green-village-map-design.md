# Mushroom Green Village Map — Design Spec

**Date:** 2026-04-25
**Status:** Approved (brainstorm complete; awaits implementation plan)
**Scope:** Replacement for the current Leaflet homepage map at [mushroomgreen.uk](https://mushroomgreen.uk). The Phaser sprite renderer Codex has been advancing becomes the production path.
**Supersedes:** `docs/sprite-map/vision.md` and `docs/superpowers/specs/2026-04-24-sprite-map-production-plan.md` for purposes of new work — they remain on disk as historical context.

---

## §1 Vision & success criterion

The replacement is a charming tile-game (Townscaper / Civ-adjacent) rendering of 1865 Mushroom Green — hex-disciplined for placement and scale, painterly-worn in feel, historically faithful to the 59 households across the full Black Country extent.

### The lodestar moment

Tom's father — who designed the original Leaflet map and has spent years researching these ancestors — opens the new view, intuitively zooms into the founder cottage (Henry Weaver, household #22), rotates it slightly, and is moved. Smoke is billowing from the adjacent forge. A cat sits outside. The deeper he zooms, the more detail emerges. The map connects him with the people he's been researching.

That moment is the gate everything is judged against. It implies:

- The founder cottage is the canonical hero asset; quality starts there.
- Cardinal rotation belongs in v1, not v2 — the "rotates slightly" beat *is* the magic.
- Living-world details (smoke, cat) belong in v1 for the founder scene, not deferred.
- LOD richness — "more you zoom, more there is" — is intrinsic to the design, not optional polish.

### Constraints

- Private project. No public deadline. No rush.
- Tom's father is not in good health; "soon enough to show him" matters more than a calendar.
- The bar is "blow him away." Half-baked ships nothing.

---

## §2 Locked design decisions

### Renderer

Phaser sprite renderer (current path with Codex), mounted on the Astro homepage. The Babylon.js spike was discontinued — sprite is committed. The legacy Leaflet map remains at `/legacy-map/` for reference and continuity.

### Visual philosophy

Charming tile-game. Townscaper / Civ-adjacent — *not* the painterly literal `vision.png`, which serves as mood reference only. Visible hex outlines are optional polish; tile-discipline is mandatory (it forces deliberate scale, perspective, and placement, and was what unstuck Codex from "placing stuff all over the place").

### Aesthetic — Tier 1 (never sacrificed)

1. **Asset coherence** — every sprite belongs to one world.
2. **Historical fidelity** — real 1865 placements, real brook routes.
3. **Worn / historic feel** — soot, slate, irons-and-brick Black Country grime; 1865 industrial hamlet, not generic medieval village.
4. **Camera exploration** — pan, zoom, cardinal rotation.

### Aesthetic — Tier 2 (should-have, cuttable)

Compositional density, living world, painterly textures, discoverable detail, time/seasons.

**Promotions to v1 for the founder cottage scene only:** *living world* (forge smoke) and *discoverable detail* (the cat) — these are part of the lodestar moment, so they ship in M0 even if the rest of the map waits.

### Aesthetic — explicitly skipped

- Hex grid as visual charm — discipline yes, visible lines optional.
- Hand-curated *every* cell — some procedural is fine; back-of-house editor offers curation where it matters.
- Mobile parity — desktop / iPad first.

### World scope

Full 1865 extent. All 59 households are first-class — no "main 14 vs peripheral 45" tier in the data model. Building variants (cottage-small / redbrick / yellow / terrace / lshape / forge / family-cluster) are reused across all placements via `cluster-tile-placements.json`.

> **Households vs buildings.** A *household* is a row in `src/content/households/`. A *building* is what renders on the map — a 1-, 2-, or 3-cell footprint sprite. Multi-cell footprints (terraces, family-clusters) can host multiple households in one sprite, so the count of buildings on the map is *less than* 59. Milestone descriptions below talk in buildings; data and interaction layers operate on households.

### Camera

Pan + zoom (smooth, ~3-5× range). Cardinal rotation (snap NE / SE / SW / NW) **ships with founder cottage in M0** because the lodestar requires it; expanded to remaining buildings as their 4-up sheets land. Free-form 360° rotation is out of scope.

### Asset pipeline

Full style guide + spritesheet system, executed via OpenAI's **GPT image-2** model and the open-source Codex skill **agent-sprite-forge**. Each sheet is one coherent generation pass — coherence is by construction (shared prompt, seed, style anchor across the sheet) rather than enforced after the fact across many singleton gens.

The style guide itself (`docs/sprite-map/style-guide.md`) is authored *before* any sheet generation and cited by every master prompt.

### Editor

Tile-first, back-of-house only. Lives at `/sprite-map-editor/`, doesn't need to be linked from the public homepage, doesn't need auth — just isn't on the public navigation.

### Mobile

Desktop / iPad first. Mobile is a bonus, not a gate.

---

## §3 Architecture

### Stack

- Astro static site, Phaser canvas mounted on `/` (homepage).
- Existing `src/components/SpriteVillageMap.astro` and `src/scripts/sprite-village-map.ts` are the renderer entry; both stay and evolve.
- Editor at `/sprite-map-editor/`.

### Layers (back-to-front)

1. **Hex grid** — axial-coordinate lattice, Civ-style ground-projected hexes (per `docs/sprite-map/grid-placement-research.md`). Visible outlines are configurable; structurally always present.
2. **Terrain** — one painted hex sprite per cell from the terrain sheet (grass, dirt, mud, scrub, brook, woodland-floor, etc.).
3. **Decorations** — multi-cell vegetation, scrub, hedges, brook accents; can overhang adjacent cells.
4. **Buildings** — footprint-anchored, depth-sorted by occupied cells. Per `sprite-footprints.json` + `cluster-tile-placements.json`.
5. **Animation overlays** — water frames, forge smoke (integrated near the forge sprite — *not* free-floating particles).
6. **Interaction layer** — hover highlight, click-to-navigate to `/households/[id]/`, family-color tint.

### Asset pipeline

```
prompt + style anchor
  ↓
agent-sprite-forge (image-2 spritesheet, chroma-key bg)
  ↓
sliced PNGs + transparent backgrounds
  ↓
generated-sprite-manifest.json entry
  ↓
renderer
```

Each sheet generated as one coherent unit. Output lives under `public/sprite-map/generated/`; raw inputs under `assets/sprite-map/raw/`.

### Camera mechanics

Phaser camera handles smooth pan / zoom. Cardinal rotation is implemented as a *sprite-set swap* keyed on heading — the world axis stays fixed, terrain stays orientation-agnostic (hex tiles look the same from all 4 cardinals), and only buildings swap to the appropriate facing variant. This avoids re-projecting the whole scene and keeps the asset budget honest at 4× per building rather than 4× per tile.

### Data sources of truth

| File | Role |
| --- | --- |
| `src/content/households/*.md` | 59 household frontmatter (already wired) |
| `src/data/cluster-tile-placements.json` | Per-household hex coordinate placement |
| `src/data/sprite-footprints.json` | Footprint rules (cell counts, anchors) |
| `src/data/sprite-scene.json` | Scene composition: brook, vegetation, props |
| `src/data/generated-sprite-manifest.json` | Sprite catalog with dimensions, anchors, variants |
| `docs/sprite-map/style-guide.md` (NEW) | Style guide cited by every sheet's master prompt |

### Editor

Tile-first interaction model. Click any visible tile → select → assign sprite / terrain / footprint. Reads and writes the JSONs above. Back-of-house only.

---

## §4 Tile vocabulary & sheet plan

The unit of coherence is the **sheet** — each sheet is one image-2 generation. Sheets are ordered by milestone.

### M0 — Founder cottage scene

- **`founder-and-forge-sheet`** — Henry Weaver's cottage in 4 cardinal facings + the adjacent forge with smoke baked into its frames (multi-frame for drift). Plus 1-2 props: a cat, a barrel.
- **`terrain-mini-sheet`** — only the few hex types under the founder scene: grass / pasture, dirt path, dirt yard.

### M1 — Hamlet centre

- **`buildings-sheet`** (expand) — all building variants (cottage-small / redbrick / yellow / terrace / lshape / forge / family-cluster) in 4 cardinal facings each. ≈8-12 variants × 4 facings on one or two coherent sheets.
- **`terrain-base-sheet`** — full 8-12 tile variants: grass, pasture, dirt, mud, soot, scrub, hedgerow, gravel, dirt yard.
- **`water-sheet`** — Black Brook tiles + edges + pool + ford + bridge approach. 4-8 ripple-loop frames.
- **`woodland-sheet`** — willows, oaks, hawthorns, hedgerows, scrub. Multi-cell trees that can overhang adjacent hexes.

### M2 — Full 1865 extent

- **`peripheral-terrain-sheet`** — pasture variants, broader woodland, footpath beyond the lane.
- **`industrial-edge-sheet`** — marl pit, slag heap, brick kilns, colliery edge. Used at remote borders to ground the Black Country setting.
- Building variants from M1 are reused across the outlying placements via `cluster-tile-placements.json`. No new building sprites needed at M2 unless the asset audit identifies a peripheral type the M1 sheet doesn't cover.

### M3 — Polish

- **`animation-fx-sheet`** — chimney smoke variants, fire glow, flag / banner, leaf flicker.
- **`animals-sheet`** — chickens, pigs, dogs, horse, more cats. Static or gentle idle loops.
- **`props-sheet`** — carts, anvils, water butts, fences, gates, washing lines, lanterns.
- **`ui-marker-sheet`** — hover indicator, family-color flag, tooltip arrow, compass.
- **`seasonal-variants`** — re-render selected sheets in winter / dusk / rain.

### Style guide upstream

Before any sheet ships, `docs/sprite-map/style-guide.md` codifies:

- Palette hex codes (red brick, slate, soot brown, limewash, muddy tan, brook blue, lichen green).
- Brick technique, slate technique, weathering technique.
- Anchor angle (3/4 iso) and light direction.
- Canonical reference images: `02-forge-v3-nb2pro` family + `16-worn-*` family.
- Reject rules (clean toy-town, fantasy cottages, neon grass, black water, baked shadows, generic medieval).

Every master prompt cites the style guide.

---

## §5 Milestones — exit criteria

Each milestone is something Tom's father can react to. Not "feature complete" — *react-able*.

### M0 — Founder Cottage Vignette

A deployable preview (e.g. `/founder/`) showing Henry Weaver's cottage #22 + adjacent forge with smoke + a cat, on a small painted-hex terrain patch, viewable from 4 cardinal angles. Pan + zoom work; deeper zoom reveals at least one detail not visible from the default zoom (chimney pots, door knocker, soot streaks, the cat's eyes opening). Style guide written. One coherent image-2 sheet authored end-to-end. Codex's pipeline validated against the highest-quality bar in the project.

### M1 — Hamlet centre

The homepage `/` renders the hamlet-centre cluster set (~14 buildings, hosting roughly the densely-clustered subset of the 59 households) on terrain-painted hexes, with the Black Brook flowing (animated water tiles, edges, a footbridge), willows / hedges / scrub, and 4-cardinal rotation across all hero sprites. Pan / zoom across the hamlet feels alive. Hover tooltips wire household names; clicks navigate to `/households/[id]/`. The Leaflet legacy map remains at `/legacy-map/`. This is what replaces the current homepage.

### M2 — Full 1865 extent

All 59 households render at their real coordinates across the full Black Country extent — outlying buildings reuse the same coherent variants from M1, surrounded by pasture, scrub, broader woodland, and at least one industrial edge feature (marl pit / slag heap). Camera roams the whole extent at smooth performance. Every household reachable by hover and click.

### M3 — Polish

Chimney smoke from non-forge cottages, leaf flicker, flag / banner, animals (chickens / dogs / horse / more cats), props (carts / barrels / water butts / lanterns), discoverable detail throughout, UI markers. Optional: time-of-day or seasonal variants. The "more you zoom, more you see" promise extends across the whole map, not just the founder scene.

### Cadence

No calendar deadlines. Each milestone gates on quality, not date — *would Tom's father nod?* is the test. Codex executes; Claude checkpoints; Tom approves before proceeding.

---

## §6 Out of scope (explicit exclusions)

These are not in this design. Changing any requires a new spec:

- Babylon.js / 3D-mesh rendering. Sprite path is committed.
- Painted-backdrop approach (single-image map with hotspots).
- Public editor. `/sprite-map-editor/` stays back-of-house.
- Mobile-first design. Desktop / iPad first; mobile is bonus.
- Auth / accounts / descendant logins / comments / CMS.
- Free-form 360° camera rotation.
- Live video / WebGL shaders / particle systems. Animation is sprite-frame loops only.
- Procedural-only placement. Every household placement is curated; the prior "deterministic hamlet infill" is dead.
- Re-designing the household detail pages (`/households/[id]/`). The map is the spec; detail pages stay as-is.

---

## §7 Open questions deferred to the implementation plan

These don't gate the spec, but the plan must answer:

1. **Style anchor selection.** Pick one canonical reference image to seed the style guide (`02-forge-v3-nb2pro` likely, but confirm against current asset audit).
2. **Founder cottage 4-up authoring.** Does image-2 reliably produce 4 cardinal facings of the same cottage on one sheet, or do we generate four sheets and rely on shared style anchor for consistency? M0 settles this empirically.
3. **Smoke integration.** Forge smoke baked into the forge sprite frames vs. a small overlay sheet drawn adjacent to the forge tile. M0 will settle this empirically.
4. **Hex outline policy.** Default visible vs default hidden vs zoom-dependent (visible at high zoom, fades at low).
5. **Performance ceiling.** 59 households × 4 facings × terrain hexes × animation frames — is the Phaser sprite count fine, or do we need a texture atlas / batching strategy? Profile during M1.
6. **Coordinate transform.** Real OSM lat / lon → hex axial coordinates: does the existing transform handle the wider extent at M2 without distortion?
7. **Editor workflow for sheet ingestion.** When a new image-2 sheet lands, what's the click-path from raw asset → keyed alpha → manifest entry → in-renderer placement?

These are Codex's territory once we reach the plan stage.

---

## §8 Roles

- **Claude** — spec authoring, plan authoring, design checkpoints, asset audit, style guide drafting, PR review of Codex output.
- **Codex** — sprite generation (via `agent-sprite-forge`), renderer implementation, editor implementation, JSON data updates, build verification.
- **Tom** — milestone gate decisions ("would dad nod?"), priority calls, commits, deploys, the final aesthetic taste.
- **Codex sandbox limits apply** — Codex can't commit or curl localhost; Claude verifies and commits after every Codex task. (Per existing memory.)
