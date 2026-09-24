# AAA refinement pass (24 September 2026)

Method: ten fixed cameras (`still=1`, and `cam=` where needed) are captured with headless Chrome (Metal). Codex (`codex exec -i …`, read-only) acts as an **adversarial art director** that did not build the scene. Each round's full review is in `artifacts/village/aaa-pass/codex-review-round*.md`. Claude writes its own critique first, then compares.

## Round 1 (Codex: "the main failure is consistency")
- Daylight rebalanced: warmer, lower sun (`#ffe4bf`, 3.9); cooler hemisphere; bluer zenith. A gentle filmic S-curve and a soft vignette in `finish.ts`.
- GTAO radius and blend raised for contact shading.
- Shrubs grounded with a low leaf skirt.
- Continuous painted wheel stripes replaced by broken, uneven rut depressions.
- Limewash made a mostly intact coat, with loss only in the splash zone.
- Crown-glass window shading: fresnel, open-sky reflection, slight waviness. `glazeWindow()` has a once-only guard, because materials are shared.
- Chimney smoke draw varies per chimney (banked or fresh fires).

## Round 2 (Codex: "modest; stronger shadows hide detail")
- Shadow fill lifted; S-curve and vignette reduced; exposure 1.2.
- Half-round ridge tiles in a mortar bed, oversailing courses and clay chimney pots on every cottage template (measured heights: ridge = eaves + 1.65 m; the tiles peak 0.22 m above it).
- Lime mortar lightened.
- Mid-distance houses gained sills, lintels, door steps and pots. Far-country buildings gained window and door rows (shader).
- Ground shader: tufted grass with bleached patches; gravel only on bare soil (the first version sprinkled white "daisies" over grass, which was fixed). A wet dark band at the brook margin.

## Round 3 (Codex: "improves the buildings; does not yet transform the scene")
- Cutaway inspections now sit on a dark, warm backdrop instead of a pale void.
- Hens rebuilt as continuous lofted body and neck surfaces.
- Low garden walls rebuilt from 215×65 mm bricks in stretcher bond, on an inset mortar core, with a soldier coping.
- Ridge tiles bedded continuously.

## Ranked backlog (from Codex round 3, still open)
1. **Vegetation** sets the ceiling: distinct species silhouettes, visible branch structure, crown gaps, and correct plant scale near doors (the burdock-like plants at the cottage fronts are oversized).
2. **Roof field**: the tile atlas mottle reads as brown flakes. It needs consistent overlapping courses, restrained variation and edge thickness near the camera.
3. **Evidence of use on the ground**: traffic, moisture and deposit masks driving colour, roughness, micro-height and scatter; worn thresholds; ash by workshops.
4. **Wall and timber materials**: limewash should bridge joints on the high-detail mesh; opening reveals; timber grain and wear.
5. **Baked AO for static buildings and props** (narrow, to keep the recovered shadow detail).
6. **Brook geometry**: waterline refinement, buried rocks, local disturbance around obstructions.

Capture gotcha: under heavy machine load, a view captured about 6 s after load can still show the distant house version. Use `WAIT=10000` for review captures.

## Round 4 (24 Sept, Tom's review: load time, chainmaker, brook, smoke, cat, grate fire)
- **Load time** ~11.1 s → ~8.6 s with byte-identical layout (terrain noise loop inlined; nearestRoad grid index; segment-box pruning for rail/stream searches; tree cells for prop checks; streamSurface seeded by the cell distance). Equivalence was proven against the previous commit on 400k random points and the whole prop plan.
- **Chainmaker**: tong reins rolled edge-on and seated in the fist (skin inside reins 113 vertices → 0; the skeletal check now asserts < 2 mm contact); the centre anvil stool's front pulled back 18 cm so it clears his shins.
- **Motion**: prefers-reduced-motion no longer freezes smoke and water (half speed instead). **Cottage grates** burn inside the range basket.
- **Brook** (brook-fft.ts, brook-flow.ts, brook-water.ts): three FFT cascades on a baked current (Rankine flow round stones, wakes, V-arms, pillows), two-phase flow-map advection, flow-gated foam, true shoreline banks with bays, height-corrected planar reflection, Fresnel reflection/transmission. The old wake strips and churn flecks (the "white dashes") are gone. Codex review: artifacts/village/brook-fft/codex-review.md; its regressions (overhanging stones, rushes through stones, foil-like reflection, foam outlines) were fixed.
- **Cat** (cat.ts): SDF-sculpted sitting tabby with shell fur, markings, glossy eyes, whiskers and idle life.

Water backlog (Codex): opaque-pass depth for true Beer–Lambert thickness and refraction; bed gravel and submerged stones; persistent (ping-pong) foam that decays downstream.
