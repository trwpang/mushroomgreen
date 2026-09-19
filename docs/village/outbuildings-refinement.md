# Domestic outbuilding refinement

The blank pale blocks were procedural service additions in `dwellings.ts`, not identified historical structures. They now use weathered red brick or dark timber, with household-specific dimensions and finishes. No claim is made that whitewash was historically absent; the earlier plain material was an unfinished visual treatment.

- Staggered individual brick courses over continuous recessed mortar, or separate timber boards.
- Door opening with recessed plank door, frame, lintel, iron straps, nails, latch and flagstone threshold.
- Staggered overlapping tiles, fascia, barge boards and wall flashing. Roofs rise toward the cottage and drain into the yard.
- Existing cottage oak/slate colour, normal and roughness atlases reused with one atlas cell per piece.
- Service additions kept clear of the pre-existing rear shed. Original per-house random draws retained.
- Existing sheds gained side cladding, split-board marks, lower rails and corner posts. Their authored roofs, doors and hardware remain.

Validation: `npm run village:outbuildings`, `npm run village:check`, and `npm run build`. Geometry checks exercise all 59 seeds: finite positions, vertex colours, four material batches per store, door surfaces, solid side walls, and roof drainage. Synthetic maximum set: 252,012 triangles, below the 600,000 cap; only eligible cottages receive stores in the village. Browser inspection covers the rear yards and logs.
