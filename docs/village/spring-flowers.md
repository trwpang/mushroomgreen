# Spring flowers

Added at Tom's request on 19 September 2026.

- Bluebell drifts grow under the copse northwest of the main forge, matching the house 5 screenshot. Current placement: 1,665 plants beneath 21 trees.
- 268 pale yellow daffodils form small, uneven clumps across sheltered village margins.
- Bluebells have five hanging bells on each stem. Daffodils have six petals and open trumpets. Both have folded, curved strap leaves.
- A separate seed preserves the existing trees, grass and household details. Exclusions protect house plots, both workshops, roads, footpaths, brook banks and tree trunks.
- Two instanced meshes share one vertex-colour material. Small flower stalks use reduced geometry. The flowers receive scene shadows.

These are artistic planting choices, not a record of flowers present in 1865.

Validation: TypeScript check, production build, browser visual review at house 5, and `scripts/village/check-flowers.ts` (repeatable placement, clear working areas, finite geometry, plant scale and two draw calls). Browser reported no errors.
