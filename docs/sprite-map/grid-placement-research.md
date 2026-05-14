# Grid Placement Research

## Sources Checked

- Phaser Tilemap docs: Phaser supports orthogonal, isometric, hexagonal, and staggered tilemap orientations, and treats a tilemap as map data plus render layers. It also exposes object layers parsed from Tiled for non-tile elements such as objects, triggers, and markers: https://docs.phaser.io/api-documentation/3.88.2/class/tilemaps-tilemap
- Phaser Tilemap conversion docs: Phaser has orientation-aware world-to-tile and tile-to-world conversion helpers for isometric and hexagonal tilemaps: https://docs.phaser.io/api-documentation/function/tilemaps
- Tiled object/layer model: tile layers store grid data, while object layers store freely positioned/scaled/rotated objects with custom properties: https://doc.mapeditor.org/en/stable/manual/layers/
- Tiled object alignment: tile objects can be aligned consistently with explicit object alignment settings: https://doc.mapeditor.org/manual/objects/
- Red Blob Games hex grid guide: hex maps should use formal grid coordinates, preferably axial/cube for algorithms, with explicit conversion between world/pixel positions and hex coordinates: https://www.redblobgames.com/grids/hexagons/
- Red Blob Games pixel-to-hex notes: nearest-centre guess-and-test works because regular hexes satisfy the Voronoi property: https://www.redblobgames.com/grids/hexagons-v1/more-pixel-to-hex.html
- Godot TileMap docs: tilemaps expose concepts such as tile origin, centered textures, and Y-sort for depth ordering: https://docs.godotengine.org/en/3.3/classes/class_tilemap.html
- Three.js/Godot camera docs: orthographic projection keeps object size constant regardless of distance; perspective projection makes far objects smaller: https://threejs.org/docs/pages/OrthographicCamera.html and https://docs.godotengine.org/en/4.1/classes/class_camera3d.html

## Findings

The current renderer has the right visual pieces but the wrong contract. Buildings, vegetation, road pieces, water pieces, and props are still positioned as individual world points with hand-tuned scale, angle, and depth offsets. That is effectively an illustrated scatter plot, not a map.

The next architecture should separate four concepts:

1. **Terrain cells**: the authoritative grid. Each cell has a coordinate, centre, polygon, terrain type, and edge data.
2. **Sprite definitions**: what a sprite means physically, including footprint, base cell, anchor, allowed rotations, baseline offset, and scale class.
3. **Placements**: an instance of a sprite definition placed at a grid coordinate, with only constrained nudges allowed.
4. **Generated decorations**: optional scatter details derived from terrain/building cells, not hand-authored free points.

## Perspective Decision

There are two different meanings being mixed together:

- **Orthographic or isometric/axonometric tilemap**: no distance shrink. Tiles farther away remain the same size. This is normal for most 2D tilemaps and for readable isometric art.
- **Perspective camera**: far tiles become smaller. This gives depth, but it changes the contract. Sprite assets, footprints, picking, and alignment all need to be camera-aware.

The current Phaser renderer is a 2D orthographic renderer. It can project ground-plane metres into an axonometric view, but it will not naturally make distant tiles smaller. A fake perspective pass is possible, but it would be a non-linear 2D projection and would require scaling every sprite by depth. That will quickly expose sprite perspective mismatches unless assets are generated for that camera.

Recommendation: keep the production placement model orthographic/axonometric until the tile-footprint system is stable. Then run a separate perspective spike using the same grid data:

- **Option A: orthographic axonometric**: best for 2D sprite consistency, editor reliability, and tile picking.
- **Option B: fake 2D perspective**: apply a depth-based projection and sprite scale curve; useful for visual experiments but riskier.
- **Option C: true 3D ground plane**: use Babylon/Three/Phaser 3D-like mesh plane with billboard/card sprites or generated multi-angle assets. This is the route if perspective shrink is non-negotiable.

## Proposed Data Contract

```ts
type HexCoord = { q: number; r: number };

type TerrainCell = {
  coord: HexCoord;
  land: 'grass' | 'yard' | 'road' | 'brook' | 'bank' | 'scrub';
  edges?: Partial<Record<'n' | 'ne' | 'se' | 's' | 'sw' | 'nw', 'road' | 'brook' | 'fence'>>;
};

type SpriteFootprint = {
  id: string;
  cells: HexCoord[];
  anchor: HexCoord;
  baseline: 'anchor-cell' | 'front-edge' | 'centroid';
  defaultScale: number;
  depthBias: number;
};

type SpriteDefinition = {
  key: string;
  footprint: string;
  category: 'building' | 'vegetation' | 'road' | 'water' | 'prop';
  allowedRotations: number[];
  anchorX: number;
  anchorY: number;
};

type SpritePlacement = {
  id: string;
  spriteKey: string;
  cell: HexCoord;
  rotation: 0 | 60 | 120 | 180 | 240 | 300;
  variant?: string;
  nudge?: { alongM: number; acrossM: number };
};
```

## Immediate Implementation Plan

1. Add a grid-addressing module: `latLng -> metres -> hex coord -> projected centre`.
2. Generate `clusterTileAssignments` from the current cluster centroids and store the assigned hex coordinate for each cluster.
3. Add `sprite-footprints.json` with definitions such as:
   - `cottage-small`: one cell
   - `cottage-terrace`: two adjacent cells
   - `forge`: two or three cells plus yard edge
   - `tree`: one cell with randomised local nudge
   - `yard-prop`: edge/corner decoration inside a parent cell
4. Change cluster rendering to use footprint definitions rather than free scales.
5. Convert authored `props` and `vegetation` from `latLng` entries into either `cell` placements or derived decoration rules.
6. Move roads and brook out of sprite scatter and into terrain/edge cells.
7. Only after this is stable, run a separate perspective projection experiment against the same tile data.

## Practical Next Step

The next code pass should not be another visual polish pass. It should add a real cell-addressed placement layer while preserving the current view as a fallback. The acceptance test is simple: every building should have a visible selected footprint on the grid, and changing a building's cell should move the whole building plus its footprint as one unit.
