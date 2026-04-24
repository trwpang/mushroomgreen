# Sprite prompts

Each prompt follows the chongdashu pattern:
- Subject, pose, angle
- Identity/style details (explicit materials, palette)
- Downscale-aware rendering guidance (chunkier forms)
- Background (flat chroma green #00FF00 for keying)
- Negative list (no environment, no text, no frame, no shadows, no extra elements)

Tool: `nanaban --model gpt-image-2` (free via ChatGPT Plus/Pro sub).

---

## 01 — Red brick cottage (master)

**Purpose:** Establish the aesthetic anchor. This is the reference for every later generation.

**Filename:** `raw/01-cottage-master-v{N}.png`

**Prompt:**
```
An isometric 3/4 view building sprite of a modest two-story red brick workers' cottage from the 1860s English Black Country region (Mushroom Green, Staffordshire). Facing down-right at a classic tactical RPG isometric angle. The cottage has: warm Staffordshire-red brick walls with visible hand-painted mortar lines, a dark slate tile pitched roof, a single brick chimney with a thin smoke plume, a simple plank door with a small stone step, two small sash windows upstairs and one larger window downstairs, no garden or ground detail. Style: hand-painted, organic, illustrative line work reminiscent of Final Fantasy Tactics and tilt-shift model villages — not pixel art. Warm, slightly weathered, curated-nostalgia feel. Optimize the design to read cleanly when downscaled to 128x128 and 96x96: chunky simple forms, strong silhouette, limited palette, minimal fine texture noise, bold separation between brick and roof. Background must be an exact flat chroma green #00FF00 across the entire image, with no gradient, no shadow, no floor, no grass, no path. No environment, no other buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

**Generation:**
```
nanaban "<prompt above>" --model gpt-image-2 --ar 1:1 -o spike/sprites/raw/01-cottage-master-v1.png
```

**Actual run:** Codex OAuth expired, fell back to `nb2-pro` (Gemini). Result: `raw/01-cottage-master-v1-nb2pro.png`. First-take success — hits ~90% of the brief. Minor: slate roof reads slightly cold, side wall brick texture busy when downscaled.

---

## 02 — Chainmaker's forge

**Purpose:** Single-story industrial building. Tests whether the model can render a chimney+smoke as a focal industrial feature (vs. domestic).

**Filename:** `raw/02-forge-v{N}.png`

**Prompt:**
```
An isometric 3/4 view building sprite of a small 1860s chainmaker's forge in the English Black Country (Mushroom Green, Staffordshire). Facing down-right at the same isometric angle as the reference image. A single-story soot-stained red brick workshop with a steeply pitched slate roof, a large stone-capped chimney on the short end belching a thick dark smoke plume, wide wooden double doors on the long side (open, with darkness and orange forge-glow inside), one small soot-darkened window, a rough cobbled stone threshold. Style: hand-painted, organic, illustrative line work reminiscent of Final Fantasy Tactics — not pixel art. Same palette, line weight, and rendering style as the reference image. Optimize to read cleanly when downscaled to 128x128: chunky forms, strong silhouette, limited palette. Background must be an exact flat chroma green #00FF00. No environment, no other buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

---

## 03 — Willow tree cluster

**Purpose:** Organic vegetation to soften the built environment.

**Filename:** `raw/03-willows-v{N}.png`

**Prompt:**
```
An isometric 3/4 view sprite of a small cluster of three English willow trees on a patch of rough grass, as seen from a classic tactical RPG isometric angle matching the reference image. Mature willows with drooping slender leaves, warm olive-green foliage with hints of grey-green, soft rounded canopy shapes, visible trunk bases, clumpy grass at the base. Style: hand-painted, organic, illustrative line work — not pixel art. Same palette, line weight, and rendering style as the reference image. Optimize to read cleanly when downscaled to 128x128: chunky simple forms, strong silhouette, minimal texture noise. Background must be an exact flat chroma green #00FF00. No environment, no buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

---

## 04 — Dirt path tile

**Purpose:** Ground connector. Needs to tile-abut cleanly when composed next to itself.

**Filename:** `raw/04-path-v{N}.png`

**Prompt:**
```
An isometric 3/4 view sprite of a single straight modular segment of a hand-worn dirt footpath through scrub grass, as seen from the same tactical RPG isometric angle as the reference. A simple rectangular tile running diagonally across the frame (bottom-left to top-right), with warm brown packed earth, worn lighter strips where feet have walked, a few small stones, short grass borders on either side. The path edges must be straight and parallel to the isometric axes so multiple tiles of this type can sit end-to-end without visible seams. Style: hand-painted, organic, illustrative — not pixel art. Same palette and rendering style as the reference image. Optimize to read cleanly when downscaled. Background must be an exact flat chroma green #00FF00 everywhere that isn't path or grass verge. No environment, no buildings, no trees, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

---

## 01 v3 — Master cottage (squat + slate-blue)

**Purpose:** Re-do the anchor cottage after Tom flagged the original as too tall/narrow and too cold-grey. The Stitch reference shows wider-than-tall cottages with slate-BLUE roofs, not charcoal.

**Filename:** `raw/01-cottage-master-v3-nb2pro.png` (model: `--pro` / nb2-pro)

**Prompt:**
```
An isometric 3/4 view sprite of a squat two-bay English cottage from 1860s Mushroom Green, Staffordshire Black Country. Facing down-right, classic tactical RPG isometric angle. WIDER THAN TALL proportions — a low-slung workers' cottage, not a tall townhouse. Warm Staffordshire red brick walls with hand-painted mortar, a broad pitched roof of dark slate-blue tiles (definitely blue-grey, not black and not charcoal), a single sturdy brick chimney at one gable with a gentle white smoke plume, one plank door with a small sandstone step, two small square windows flanking the door, one tiny window in the gable end. Style: hand-painted, warm, illustrative line work reminiscent of Final Fantasy Tactics and a 2.5D Age of Empires village asset — NOT pixel art, NOT photoreal. Curated-nostalgia storybook feel. Painterly brushwork, visible light source from upper-left, soft shadow shading on the north-facing wall. Chunky simple forms that read cleanly when downscaled to 128x128. Background must be an exact flat chroma green #00FF00 across the entire image, no gradient, no shadow, no floor, no grass. No environment, no other buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

---

## 10 — Terrace-end cottage

**Purpose:** Variant for mid-row households. Implies a wider row that was demolished, giving a simple rectangular footprint.

**Filename:** `raw/10-cottage-terrace-v{N}-nb2pro.png`

**Prompt:**
```
An isometric 3/4 view sprite of a squat end-of-terrace workers' cottage from 1860s Mushroom Green, Staffordshire Black Country. Facing down-right, classic tactical RPG isometric angle. A LOW, WIDE single-story cottage with a modest low attic and very low eaves — a simple chainmaker's home, shorter than it is wide. Warm Staffordshire red brick with hand-painted mortar lines, a broad pitched slate-BLUE tile roof (blue-grey, not charcoal), ONE tall brick chimney at the far gable end belching a thin white plume, a sturdy plank door with a sandstone step, one square window beside the door, a tiny dormer window poking through the roof. Suggest this is the end of a terrace row by showing the wall truncated on one side. Style: hand-painted, warm, illustrative, storybook, reminiscent of Final Fantasy Tactics and a painterly 2.5D Age of Empires asset — NOT pixel art, NOT photoreal. Chunky simple forms, strong silhouette, reads cleanly at small size. Background must be an exact flat chroma green #00FF00 everywhere, no gradient, no shadow, no floor, no grass. No environment, no other buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

---

## 11 — L-shape cottage with lean-to

**Purpose:** Visual variety for households whose polygon has an obvious L-shape, plus general neighbour-differentiation.

**Filename:** `raw/11-cottage-lshape-v{N}-nb2pro.png`

**Prompt:**
```
An isometric 3/4 view sprite of a modest L-shape brick cottage from 1860s Mushroom Green, Staffordshire Black Country, with a smaller lean-to extension at one side. Facing down-right, classic tactical RPG isometric angle. Two-bay main range of warm red Staffordshire brick with hand-painted mortar, a pitched slate-BLUE tile roof (clearly blue-grey, not charcoal), a lower mono-pitch lean-to wing on the south-east side (shorter, with its own small door and a single square window), a single central brick chimney on the main roof ridge puffing white smoke, plank door on the main front, two sash windows flanking it. Style: hand-painted, warm, illustrative, storybook, reminiscent of Final Fantasy Tactics and a painterly 2.5D Age of Empires village asset — NOT pixel art, NOT photoreal. Chunky simple forms, strong silhouette, reads cleanly when downscaled. Background must be an exact flat chroma green #00FF00 everywhere, no gradient, no shadow, no floor, no grass, no path. No environment, no other buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

---

## 12 — Wooden plank bridge (Phaser spike)

**Purpose:** Bridge across the Black Brook where the main road crosses it. First Phaser-spike-only asset.

**Filename:** `public/spike-sprites/12-bridge-v1-keyed.png` (keyed direct to production-ready path; raw at `spike/sprites/raw/12-bridge-v1-nb2pro.png`)

**Prompt:**
```
An isometric 3/4 view sprite of a small rustic 1860s wooden plank footbridge across a narrow English stream, at the classic tactical-RPG isometric angle matching the reference. Weathered dark oak planks laid across two sturdy timber supports with visible underside beams, low plank handrails on both sides made of rough-hewn timber, a hint of worn earth path leading onto each end of the bridge. Style: hand-painted, warm, illustrative, storybook, reminiscent of Final Fantasy Tactics and a painterly 2.5D Age of Empires village asset — NOT pixel art, NOT photoreal. Chunky simple forms, strong silhouette, reads cleanly when downscaled. Background must be an exact flat chroma green #00FF00 everywhere, no gradient, no shadow, no water, no grass. No environment, no other objects, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

**Generation:**
```
nanaban --pro -o spike/sprites/raw/12-bridge-v1-nb2pro.png "<prompt>"
magick spike/sprites/raw/12-bridge-v1-nb2pro.png \
  -fuzz 18% -transparent '#00FF00' -trim +repage \
  public/spike-sprites/12-bridge-v1-keyed.png
```

**Actual run:** First take accepted. Painterly dark oak planks, timber supports with underside beams, plank handrails, worn earth path approaches at both ends. 1024×1024 pre-trim, 17.7s generation.

---

## 13 — Painterly meadow ground texture (Phaser spike)

**Purpose:** Single large ground-layer sprite sitting beneath everything in the Phaser scene. No baked-in features — brook/roads drawn in Phaser over the top.

**Filename:** `public/spike-sprites/meadow.png` (no keying — the whole image IS the meadow)

**Prompt:**
```
A seamless painterly English meadow groundplane in the style of Age of Empires and Final Fantasy Tactics — warm mid-green grass with subtle painterly variation, patches of darker olive-green tussocks, hints of wildflowers, soft light from upper-left, hand-painted brushwork. NO buildings, NO paths, NO trees, NO water, NO people, NO fences, NO frame, NO border. Pure unbroken meadow surface. Chunky simple forms with gentle texture variation so the colour doesn't read flat, but no small sharp details — this is a background layer that sprites sit on top of. Aspect ratio 4:3. Background fills entirely with meadow — no chroma green, no transparency, the meadow IS the image.
```

**Generation:**
```
nanaban --pro --ar 4:3 --size 2k -o public/spike-sprites/meadow.png "<prompt>"
```

**Actual run:** First take accepted. 2048×1536, 633 KB, 18.4s via gemini-3-pro-image-preview. Warm olive-green palette, painterly brushwork, scattered red/blue/white/yellow wildflower specks, no baked-in objects.

---

## 14 — Single willow tree (Phaser spike polish)

**Purpose:** Replace the original 3-tree willow cluster sprite (#03) when used in the scatter layer. 17 scatter positions × a 3-tree cluster felt crowded; 17 single trees reads as a properly wooded hamlet.

**Filename:** `public/spike-sprites/14-willow-single-v1-keyed.png`

**Prompt:**
```
An isometric 3/4 view sprite of a single mature English willow tree on a small tuft of rough grass, at the classic tactical RPG isometric angle. A slender trunk with drooping slender leaves, warm olive-green foliage with hints of grey-green, soft rounded canopy, visible twisted roots at the base, minimal clumpy grass at the base. Style: hand-painted, warm, illustrative, storybook, reminiscent of Final Fantasy Tactics and a painterly 2.5D Age of Empires asset — NOT pixel art, NOT photoreal. Chunky simple forms, strong silhouette, reads cleanly when downscaled. Background must be an exact flat chroma green #00FF00 everywhere, no gradient, no shadow. No other trees, no environment, no buildings, no people, no text, no labels, no frame, no cast shadow, no watermark.
```

**Generation:**
```
nanaban --pro -o spike/sprites/raw/14-willow-single-v1-nb2pro.png "<prompt>"
magick spike/sprites/raw/14-willow-single-v1-nb2pro.png \
  -fuzz 18% -transparent '#00FF00' -trim +repage \
  public/spike-sprites/14-willow-single-v1-keyed.png
```

**Actual run:** First take accepted. 1024×1024 pre-trim, 17.9s. Single slender trunk with drooping olive-green fronds, gnarled visible roots, small grass base. Reads as one tree at every scatter position.
