# Worked clay and oak material study

The September 20 pass replaces some generic procedural colour variation with one original generated texture atlas. The left panel supplies quarry clay; the right supplies old oak. This is an art interpretation, not a material scan or historical record.

## Runtime

- Original: `artifacts/village/material-study/worked-clay-oak-v1.png` (1774 × 887).
- Runtime: `public/interior-materials/worked-clay-oak-v1.webp` (693,490 bytes).
- One cached texture is shared by streamed rooms. Room disposal does not dispose it.
- Clay uses varied inset crops and rotations on individual tiles. Local hearth deposits, cracks and wear paths remain; broad procedural mottling is reduced.
- Dining tops use separate oak crops for their five existing planks. The mapping follows table rotation. Other furniture and ceilings retain their existing finish.
- Luminance supplies shallow shader relief. This is approximate detail, not a measured normal or height map. Geometry, furniture support heights and room lighting remain unchanged.
- The shared room builder applies these materials to matching floors and dining tables throughout the village, including embedded interiors.

## Generation

Generated with the built-in image-generation tool. Converted to WebP with Sharp at quality 92. No third-party image was used as input.

Exact prompt:

```
Create one original high-resolution 2:1 landscape PBR BASE COLOUR MATERIAL ATLAS for a historical 1865 English industrial cottage game. This is a texture sheet, not a scene or photograph of objects. Strictly flat orthographic, uniform diffuse lighting, NO perspective, NO directional shadows, NO glare, NO text, NO labels, NO margins. Exactly two equal square material panels, touching at x=50%. LEFT HALF: a continuous close-up field of very old unglazed iron-rich quarry clay, muted earthy russet-brown and umber, age embedded into the clay rather than loose dirt. Fine dark inclusions, tiny pits, scrubbed pale abrasion patches, tiny irregular flakes and small grey-brown worn areas. Subtle large-scale mineral variation and rich fine-scale tactile detail. Do NOT depict tiles, grout, a grid, separate squares or cracks crossing the whole panel: just uninterrupted clay surface which will be mapped onto individual 23cm tile meshes. Dry, aged, repeatedly scrubbed for decades; NOT polished orange terracotta and NOT terracotta roof tiles. RIGHT HALF: uninterrupted close-up of old scrubbed oak timber, straight grain running VERTICALLY top to bottom, deep fine grain, some narrow dark grain checks and two small old knots, worn fibres and little pale tool scars, restrained faded brown/grey-brown colour. No board seams, no objects, no heavy grime, no varnish. The oak should look poor but cared-for, with complex natural grain, NOT generic orange wood. Both squares fill their half edge-to-edge. Keep both materials at similar medium brightness. Painterly-realistic game texture quality with convincing fine material detail, designed to receive dynamic lighting in Three.js.
```

## Validation

- TypeScript scene check and production build passed.
- Inhabited-house checks passed for 58 homes and 74 floors.
- Henry’s room rendered without browser shader errors. Checked normal room view and a downward close view.
- `artifacts/village/material-study/henry-floor.png` records the close view.
- This pass changes quarry clay and dining-table faces. It does not finish the remaining simple wall, fabric and furniture geometry.
