# Domestic material and workshop pass — 20 September 2026

## What changed

Original limewash and linen atlas supplies more varied close surface detail. Plaster now shows older coats and small flakes, with shallow relief. Cloth uses irregular thread detail, while curtains have varied fold depth and uneven hems. Folded linen has compressed edges and stripes that follow its surface.

Shelves, benches, worktables and other board fittings have softened shoulders. Their top faces retain the measured support height. Dresser, drawer, cupboard and chest frames have small wooden pegs. These changes update the existing catalogue rather than adding new object types.

Both village chainshops receive workshop-local deposits: soot around the hearths and hoods, ash near the fire, and fine dark iron scale below the anvils. Working anvil faces retain a smoother finish. The deposit masks follow the authored stations, including the scaled family workshop. Paths and furnishings have not moved.

This is a surface interpretation. It does not establish the exact condition of any particular home in 1865.

## Book passage supplied by Tom

Tom read a passage on September 20 describing extreme heat, exhausting work, soaked clothes, burns from hot iron, and several women working together in some sheds. It also describes a suspended baby chair that a mother could rock while working.

Book title, author, page, date and the location of these observations are pending. The passage supports taking working conditions seriously. It does not prove that Henry's workshop contained every described feature. No baby chair or additional workers were added from this passage. Preserve it as research context for later source checking.

The current pass uses spatially specific signs of work. Food and washing surfaces remain cared for, while hearths, low edges and work areas accumulate more wear.

## Texture provenance

- Original generated atlas: `artifacts/village/domestic-materials/lime-linen-v1.png`.
- Runtime atlas: `public/interior-materials/lime-linen-v1.webp`, 1774 × 887, 701,248 bytes.
- Generated with the built-in image-generation tool. WebP conversion used Sharp, quality 90.
- No external image was used as input. This is colour artwork with approximate shader relief, not a scanned PBR material.
- Cached textures are shared across rooms and remain outside room disposal.

Exact generation prompt:

```
Create an original 2:1 landscape texture atlas with exactly TWO equal square panels side by side. For realistic 1865 poor English industrial cottage interiors. Pure material BASE COLOUR, flat orthographic, neutral uniform diffuse lighting. No perspective, objects, text, labels, margins or directional lighting. LEFT square: aged hand-applied limewash over rough lime plaster. Muted warm grey cream, thin overlapping brush washes, fine exposed sand grains and small low-relief aggregate, some worn-through grey-beige patches of earlier coats, a few short delicate hairline cracks and modest tiny flaked edges. Much material detail, dry matt. Not extreme dereliction, no exposed bricks, no giant holes, no black mould, no dark mottled sponge-paint effect. Slightly uneven but cared-for old cottage plaster, brighter than mid grey. RIGHT square: close-up field of worn natural undyed flax/linen woven cloth. Muted grey oatmeal; irregular warp and weft threads, thin and thick slubs, tiny fuzzy worn fibres, slight fading and small discoloured threads. Textile lies perfectly flat, no folds or objects, no seams, no borders. A medium/coarse plain weave with clearly visible crossing threads, not knitted, not burlap with open holes. Each material should be edge-to-edge and visually tileable, no edge highlights. Fine realistic tactile detail suitable for dynamic 3D game lighting.
```

## Validation

- Catalogue: 121 models, 179,391 triangles, 1,385,000 bytes, zero glTF validation errors.
- Object placement checks cover 58 homes, 74 floors and 3,493 dressing instances.
- Inhabited-home, compressed-workshop extraction and TypeScript checks passed.
- Production build passed. Henry’s room and the main forge were checked in the browser without shader errors.
