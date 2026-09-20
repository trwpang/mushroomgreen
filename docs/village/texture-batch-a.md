# Texture expansion — first application batch

20 September 2026. Eight treatments from the 100-item audit now have original colour artwork and Three.js applications. The other 92 are a production backlog. This receipt records the initial scope, not every future target in each audit row.

## Applied surfaces

| Audit ID | Treatment | Current coverage | Remaining reuse |
| --- | --- | --- | --- |
| 1 | Hand-fired brick | Named cottage and workshop brick, service-store brick, internal chimney masonry | Other mixed masonry batches need semantic separation |
| 2 | Lime mortar | Named lime/damp mortar in cottage and workshop assets | Mortar mixed into brick batches is unchanged |
| 11 | Split slate | Named cottage/workshop slate and service-store slate | Distant baked materials retain their current finish |
| 91 | Broadleaf bark | Instanced broadleaf trunks and branches; pine/fir excluded by instance mask | Distinct branch-collar detail and physical-scale variation |
| 31 | Cast iron | Iron parts of all three cooking-range models in furnished rooms | Polished contact fittings need separate masks |
| 34 | Dull tin | Stored tin bath in all 58 homes | Other tin objects are unchanged |
| 41 | Salt glaze | Clay parts of jugs, storage/bread crocks, mixing bowls and water-crock stands | Cream stone bottles deliberately retain their existing finish |
| 21 | Cut timber | Cut log faces in woodpiles/handcarts; chopping-block top | Furniture and large cart board ends still need face selection |

Curved tin and pottery use the original model UVs. This avoids an abrupt projection change across smooth surfaces. Masonry and slate use world-scale planar detail; broadleaf branches retain cylinder UVs. End-grain UVs use circular cross-sections and the observed pith in the source image. The cut face is separate from bark, split sides, wicker, rope and broom fibres.

The old lengthwise wood shader is omitted on cut faces. It otherwise crosses the radial grain and creates excessive speckling. The corrected chopping block removes the old raised ring geometry. Random colour draws remain stable so later wood chips and log placements do not move.

## Assets and memory

Four original paired atlases are stored under `artifacts/village/texture-batch-a`. Exact prompts are in `prompts.json`; dimensions, transfer bytes and mean linear colours are in `images.json`. Runtime WebP files are in `public/surface-textures`.

| Pair | Dimensions | Transfer bytes |
| --- | --- | ---: |
| Brick / mortar | 1774 × 887 | 798,428 |
| Slate / bark | 1774 × 887 | 666,994 |
| Iron / tin | 1774 × 887 | 707,466 |
| Pottery / end grain | 1774 × 887 | 692,500 |

Total transfer is 2,865,388 bytes. Estimated RGBA texture storage with mipmaps is about 32 MiB. Full source resolution is retained for this close-view proof, above the audit's original 24 MiB planning target and within a revised 40 MiB working allowance. GPU compression, device timing and total allocation are not yet measured.

The shared cache currently has six fixed atlas callers, including the two earlier domestic pairs. Room disposal leaves these shared textures alive; page teardown releases them. This is intentionally a small persistent library, not a general streaming cache. Do not extend it to fifty resident pairs. Add a bounded residency policy before expanding the full library.

Colour samples use sRGB decoding and measured linear means to preserve established material colours. Relief and roughness variation come from restrained luminance variation. These are original generated colour artworks with approximate relief, not scanned or measured PBR materials. Detail fades with distance and uses mipmaps and anisotropic filtering.

## Review

The subagent reviewed callback composition, material selection, instancing, UVs and shared texture ownership. Corrections addressed curved-surface projection seams, unreachable cream-bottle selection, distorted split-log UVs and end grain on a block sidewall.

Validation results and browser captures accompany this receipt. The full 100-item acceptance checklist remains a target for later batches; this pass does not claim full-device performance validation or completion of all proposed material reuse.

- `village:check`: passed.
- `surfaces:check`: passed shader composition and protected-material checks.
- `village:inhabited`: passed 58 homes / 74 floors, including tin-bath coverage and Henry's separate brick/iron/glaze finishes.
- `village:props`: passed support, placement, cut-face UV and material-isolation checks; seven batches, 838,022 placed triangles.
- `village:objects`: passed existing catalogue and furnishing checks.
- Production build: 77 pages, runtime asset guard passed.
- Browser: Henry kitchen/bath, forge exterior, firewood and chopping-block views inspected. No logged shader errors. Fine pottery/tin contrast and relief reduced after close review.
- No push or deployment.
