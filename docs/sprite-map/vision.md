# Mushroom Green Sprite Map Vision

## Goal

Replace the flat GIS-feeling map with a worn isometric Black Country scene that still preserves the real 1865 household geography. It should feel like a hand-built historical model: readable, interactive, and beautiful, but grimy enough to belong to iron, brick, mud, brook water, and smoke.

## Canonical Reference

The current north star is the older forge family:

- `02-forge-v2-gi2`
- `02-forge-v3-nb2pro`
- `02-forge-v1`

Why these work:

- Brick has age, soot, and irregular colour.
- Roofs are slate/blue-grey/charcoal, not clean fantasy tiles.
- Warm forge light gives human presence without becoming cartoonish.
- Smoke is heavy and dark but painterly.
- Shapes are readable at map scale.

## Accept Rules

- Projection is stable three-quarter isometric.
- Buildings are imperfect: soot, worn bricks, uneven edges, weathered slate, grime near doors and chimneys.
- Palette stays muted: red brick, smoky slate, muddy tan, lichen green, blue brook.
- Every sprite has transparent background and a ground-contact anchor.
- Sprites read clearly at 0.18-0.36 Phaser scale.
- Water is blue, visible, and continuous; never black.
- Roads feel like dirt lanes and cart tracks, not modern pavements.
- Terrain is not a flat board: yards, soot patches, hedges, trees, puddles, and ground wear should break it up.

## Reject Rules

- Clean toy-town buildings.
- Medieval fantasy cottages.
- Perfect vector-like edges.
- Neon or overly saturated grass.
- Black water.
- Large baked shadows from generation backgrounds.
- Assets that only work front-on or side-on.
- Generic “cute village” output.

## Composition Target

The first viewport should show:

- The hamlet as a legible cluster of worn buildings.
- At least one smoking forge/workshop.
- Connected road/carte-track network.
- Blue brook segments on the left/north-west side.
- Enough props and ground dirt that the village feels inhabited.
- No huge empty green board dominating the scene.

## Interaction Target

- Pan and zoom are smooth on desktop and mobile.
- Hover identifies households.
- Single-household click navigates directly.
- Multi-household click opens a popup list.
- Editor can alter placement without code changes.
