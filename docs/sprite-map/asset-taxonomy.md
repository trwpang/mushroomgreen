# Sprite Asset Taxonomy

## Buildings

Required minimum:

- `forge`: 3 variants, red brick, smoke-capable.
- `workshop`: 3 variants, slate roof, soot, open/working details.
- `cottage-small`: 4 variants.
- `cottage-terrace`: 4 variants.
- `cottage-lshape`: 2 variants.
- `family-cluster`: 3 variants for larger household clusters.

Metadata:

- Category: `building`
- Anchor: normally `0.5, 0.9-0.94`
- Max edge: 512 px
- Must include enough padding before keying that chimneys/smoke are not cropped.

## Water

Required minimum:

- straight stream, 4 directions or rotatable.
- curve stream, 4 directions or rotatable.
- banked edge segment.
- ripple/pool.
- small bridge.
- culvert/ditch mouth.

Metadata:

- Category: `water` or `bridge`
- Anchor: `0.5, 0.6-0.84`
- Must be visibly blue.
- Reject if near-black or grey after keying.

## Roads And Ground

Required minimum:

- dirt straight.
- dirt curve.
- fork.
- junction.
- muddy lane strip.
- cart rut.
- cobble/yard patch.
- soot-dark yard patch.

Metadata:

- Category: `road`
- Anchor: `0.5, 0.72-0.86`
- May be translucent or low alpha in renderer.

## Vegetation

Required minimum:

- willow/tree, 4 variants.
- hedge, 3 variants.
- scrub, 3 variants.
- grass clump, 3 variants.

Metadata:

- Category: `vegetation`
- Anchor: `0.5, 0.9-0.96` for upright objects, lower for flat hedges.

## Props

Required minimum:

- coal pile.
- cart.
- barrel/crates.
- fence.
- puddle.
- washing/yard object.
- timber/ore pile.

Metadata:

- Category: `prop`
- Anchor depends on sprite footprint.

## Naming

Use:

`<pass>-<asset-family>-<variant>-<generator>.png`

Examples:

- `17-forge-redbrick-v1-imagegen.png`
- `18-stream-curve-v3-imagegen.png`
- `19-coal-pile-v2-imagegen.png`
