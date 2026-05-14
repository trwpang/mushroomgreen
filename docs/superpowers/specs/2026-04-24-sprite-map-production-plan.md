# Sprite Map Production Plan

## Visual Target

The replacement map is a worn, Black Country isometric scene, not a clean toy village. The core references are the older forge sprites such as `02-forge-v2-gi2` and `02-forge-v3-nb2pro`: uneven brick, slate roofs, soot, warm forge glow, heavy smoke, softened painterly edges, and enough grime that the scene feels lived-in.

## Asset Rules

- Projection: three-quarter isometric, consistent roof angle, no front-on or side-on assets.
- Background: transparent PNG after keying; no baked checkerboard, no drop shadow from the generation background.
- Anchors: buildings anchor near ground contact, normally `anchorX: 0.5`, `anchorY: 0.9-0.94`.
- Palette: red brick, smoky slate, soot brown, yellowed limewash, muted grass, muddy tan roads, saturated blue water only where the brook is visible.
- Avoid: glossy fantasy buildings, bright toy-town palettes, black water, generic medieval cottages, obvious AI text, over-clean roofs.

## Production Gates

1. **Pipeline Gate**: every generated asset appears in the audit gallery with dimensions, anchor, category, and warnings.
2. **Placement Gate**: cluster sprite, scale, and offset can be changed from the browser editor and exported as JSON.
3. **Renderer Gate**: map supports pan/zoom, depth ordering, household interactions, roads, sprite brook, terrain, and ambient smoke.
4. **Replacement Gate**: the home route uses the sprite renderer, with the legacy Leaflet map retained on `/legacy-map/`.

## Current Decision

Use Phaser as the renderer. The engine is not the bottleneck; art direction, asset normalization, and placement tooling are. Generated animation should enter the renderer as spritesheets or texture atlases rather than live video.
