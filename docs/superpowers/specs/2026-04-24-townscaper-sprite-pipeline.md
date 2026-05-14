# Townscaper Sprite Pipeline Spike

## Goal

Prove that the map replacement can use a full AI sprite pipeline, not only procedural Phaser drawing.

The target workflow is:

1. Generate sprite sheets with GPT Image 2, Rosebud, Seedance frame export, or another image model.
2. Save raw outputs under `spike/sprites/raw/`.
3. Add an optional `.sheet.json` sidecar when the output is a grid or packed sheet.
4. Run `npm run sprites:pipeline`.
5. Commit or review generated keyed PNG sprites and the generated manifest.
6. Load the manifest in Phaser and place sprites on real Mushroom Green cluster positions.

## Pipeline Command

```bash
npm run sprites:pipeline
```

Defaults:

- Input: `spike/sprites/raw`
- Output: `public/spike-sprites/generated`
- Manifest: `src/data/generated-sprite-manifest.json`
- Chroma key: `#00ff00`
- Key fuzz: `18%`
- Max sprite edge: `512px`

Override example:

```bash
node scripts/sprite-pipeline.mjs \
  --input spike/sprites/raw \
  --output public/spike-sprites/generated \
  --manifest src/data/generated-sprite-manifest.json \
  --fuzz 14% \
  --maxEdge 640
```

## One Sprite Per File

For a single generated sprite:

```text
spike/sprites/raw/cottage-small-gpt-image-2.png
```

The pipeline writes:

```text
public/spike-sprites/generated/cottage-small-gpt-image-2-keyed.png
```

## Sprite Sheet Sidecar

For a sheet:

```text
spike/sprites/raw/cottages-gpt-image-2.png
spike/sprites/raw/cottages-gpt-image-2.sheet.json
```

Grid sidecar:

```json
{
  "name": "cottage-sheet",
  "keyColor": "#00ff00",
  "fuzz": "18%",
  "anchorY": 0.92,
  "grid": {
    "x": 0,
    "y": 0,
    "columns": 4,
    "rows": 2,
    "cellWidth": 512,
    "cellHeight": 512
  }
}
```

Explicit crop sidecar:

```json
{
  "keyColor": "#00ff00",
  "sprites": [
    { "name": "cottage-small-a", "x": 0, "y": 0, "width": 512, "height": 512, "anchorY": 0.92 },
    { "name": "forge-a", "x": 512, "y": 0, "width": 512, "height": 512, "anchorY": 0.92 }
  ]
}
```

## GPT Image 2 Prompt Pattern

Use this base prompt for a sheet:

```text
Create an 8-cell sprite sheet, 4 columns by 2 rows. Each cell contains one isolated isometric 3/4 view sprite for a cozy 1860s English Black Country hamlet map, inspired by Townscaper, Final Fantasy Tactics, and painterly Age of Empires building assets.

Style: warm hand-painted, chunky simple forms, toy-like but not pixel art, readable at small map size, strong silhouette, subtle linework, soft upper-left light.

Subject set:
1. small yellow brick cottage with red roof
2. two-cottage terrace with red roof
3. brown-roof cottage cluster
4. forge cottage with dark chimney
5. pale green cottage cluster
6. lavender cottage cluster
7. small wooden plank bridge
8. single willow tree

Sheet constraints: exact 4x2 grid, one sprite centered in each cell, generous padding, no overlap between cells.

Background: every cell background must be perfectly flat solid #00ff00 chroma key. No shadows, no gradients, no ground plane, no floor, no text, no labels, no watermark. Do not use #00ff00 in any sprite.
```

For individual assets, keep the same style and background constraints but request a single isolated sprite.

## Seedance / Animation Path

Seedance can be used after still sprites are approved:

- Generate a 2 to 4 second loop for water shimmer, forge smoke, or willow sway.
- Export selected frames as a grid PNG.
- Add a `.sheet.json` with frame crops.
- Load frames as a Phaser animation, not as separate hand-coded effects.

For this map, animation should be atmospheric only. It should not move building positions or make the historical cluster layout ambiguous.

## Evaluation Criteria

- The pipeline removes the chroma key cleanly enough for anti-aliased painterly edges.
- The manifest gives Phaser everything needed to load and anchor sprites.
- Generated sprites remain legible at `0.25x` to `0.45x` display scale.
- The visual language improves on the current Leaflet map without losing the real household cluster structure.
