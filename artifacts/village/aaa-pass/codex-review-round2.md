The changes improve the scene, but the improvement is modest. Stronger shadows expose the remaining material and geometry problems. They also hide detail.

I assume left is before and right is now. Cost estimates cover implementation and tuning by one experienced developer.

### 1. Before and after

| Pair | Verdict | Visible evidence |
|---|---|---|
| **01 — Lane** | **Better, with regression** | The continuous dark tracks are gone. The road looks less painted. However, broad shadow bands now dominate it. The right-hand buildings lose wall, door, and planting detail in deep shadow. |
| **02 — Approach** | **Better, slightly** | The foreground shrub connects more convincingly with the ground. Stronger contact shadows help the cart and building. However, the shrub becomes a nearly black mass. The workshop walls remain difficult to read. |
| **04 — Limewash** | **Better** | The coating reads as a maintained surface with local damage. Previously, the large patches competed with the whole building. These cameras differ, so this is not a controlled lighting comparison. |
| **07 — Brook** | **No visible change overall** | Water reflection, bank shape, reeds, and rock placement look substantially unchanged. Darker foliage adds little. A still image cannot establish whether the flow animation improved. |
| **08 — Yard** | **Better, slightly** | Shrub bases look fuller and better connected to the ground. The main improvement is local. The smooth lawn, isolated grass triangles, and uniform brick barriers still define the scene. |
| **09 — Overview** | **No visible change overall** | The right image has somewhat stronger contrast. Building forms, tree distribution, ground coverage, and depth remain essentially the same. It does not read as a different quality level. |

The smoke changes are not clearly demonstrated by these stills. The window changes are also too subtle to judge at the paired images’ scale.

### 2. Eight highest-impact defects now

**1. The ground has colour variation but little physical structure.**  
Images 01, 02, and 08 show broad, smooth surfaces between scattered props. The yard looks grass-covered despite its apparent use.

**Fix:** Add shallow terrain relief, worn entrances, compacted working areas, exposed soil, and accumulated material beside walls. Blend tiled ground materials using painted masks. Add normal and roughness variation at separate scales.  
**Cost:** 3–5 developer days; low to moderate GPU cost.

**2. Material detail has excessive contrast and inconsistent scale.**  
The cottage’s mortar lines and roof seams dominate image 03. The forge floor has similarly heavy joints. These surfaces look assembled from individually outlined pieces.

**Fix:** Reduce joint darkness and width. Check texture scale against doors and people. Move fine relief into normal maps. Reserve geometry for edges that affect silhouettes.  
**Cost:** 2–4 days; roughly neutral GPU cost, potentially fewer triangles.

**3. Lighting loses too much information in shadow.**  
The lane’s right side and workshop exterior become dark blocks. Henry’s room has a bright lamp pool but weak light distribution elsewhere.

**Fix:** Rebalance direct light against sky fill using fixed-camera comparisons. Bake indirect light for static interiors. Give window openings plausible light contribution. Reduce the grading curve’s shadow compression before increasing exposure.  
**Cost:** 2–4 days; low runtime cost with baked lighting.

**4. Vegetation still exposes its construction.**  
Image 03 has large, flat leaves with conspicuous repeated patterns. Trees form dense clumps with limited branch structure. The skirt improves shrub contact but leaves the upper shape unchanged.

**Fix:** Rebuild the nearest plants with curled leaves, varied orientation, and visible stems. Improve foliage normals and backlighting. Create several distinct tree silhouettes and transition them gradually with distance.  
**Cost:** 4–8 days; moderate cost unless instance counts and foliage overdraw are controlled.

**5. Building detail changes too sharply with distance.**  
Nearby cottages have individual roof pieces. Middle-distance buildings become plain boxes with sparse openings. Image 10 makes this especially obvious.

**Fix:** Create intermediate building detail levels with doors, windows, eaves, chimney caps, and material variation. Preserve those features in distant texture atlases. Check transitions from actual overview cameras.  
**Cost:** 3–6 days; low to moderate cost with instancing and atlases.

**6. Roof edges look broken by the construction method.**  
Image 03 shows repeated thin, projecting tile ends and dark gaps. The result resembles loose plates more than a settled roof.

**Fix:** Establish consistent overlapping courses and restrained displacement. Build coherent ridge and verge details. Use textured roof surfaces behind selected edge tiles.  
**Cost:** 2–4 days; neutral or reduced GPU cost.

**7. The forge view exposes unfinished scene boundaries.**  
Image 05 shows a large pale void behind truncated masonry. The worker has much more surface detail than the surrounding equipment. The room reads as an exposed model.

**Fix:** Define a deliberate cutaway boundary with capped wall sections and a controlled background. Alternatively, retain the enclosure and constrain the camera. Match equipment material quality to the worker.  
**Cost:** 2–4 days; low runtime cost.

**8. The brook lacks a convincing transition between land and water.**  
The banks look smooth and abrupt. Reed groups repeat upright shapes. Large rocks meet water without enough visible wetness or accumulated debris.

**Fix:** Add a narrow wet-bank material band, submerged stones, irregular bank geometry, and small debris clusters. Use shoreline masks to reduce wave strength near banks and vary roughness around obstacles.  
**Cost:** 2–4 days; low to moderate GPU cost.

### 3. Distance from AAA

This remains a detailed prototype, several substantial art passes from AAA; rebuilding the ground would produce the largest single improvement.
