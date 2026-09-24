**Round 3 improves the buildings. It does not yet transform the scene.** The strongest gains are chimney construction and distant depth. Several added details expose larger material and scale problems.

These judgments concern the supplied stills. Costs below are estimates, without code or GPU measurements.

| Pair | Verdict | Visible evidence and regressions |
|---|---|---|
| **01 — Lane** | **Better, slightly** | Ridge caps and chimney details improve roof silhouettes. The lane, vegetation and dark façades look largely unchanged at this size. |
| **02 — Approach** | **Better** | Background windows and roof details make the workshop setting more complete. **Regression:** the broad foreground shadow obscures much of the gravel and ground variation. |
| **03 — Cottage front** | **Better, slightly** | The ridge now has a clear construction profile. **Regression:** bright, regular gaps between ridge sections attract attention. The white wall still resembles exposed painted brick more than a continuous limewash surface. |
| **04 — Limewash** | **Better, substantially** | Pots, chimney courses, window divisions and roof edges replace obvious block forms. **Regressions:** the foreground cap looks oversized; roof edges look serrated. Bright ground patches at upper right resemble white paint or excessive reflection. |
| **07 — Brook** | **No meaningful change** | The darker bank margin helps locally. The broad, angular banks, polygonal rocks and clean central reflection still dominate. The change does not improve the overall reading enough. |
| **08 — Yard** | **Better overall** | The rear brick wall and timber structures have more readable surfaces. **Regression:** low walls now resemble large tan blocks. Their brick scale looks inconsistent with the building behind them. |
| **09 — Overview** | **Better** | Atmospheric separation gives the settlement depth. Buildings read more clearly within the trees. **Regression:** distant land disappears into a broad pale wash, which weakens landscape structure. |
| **10 — Far** | **Better, slightly** | Distant openings reduce the blank-box effect. Haze softens the horizon. Repeated tree crowns and scattered building forms remain conspicuous. |

**The next six defects, ranked:**

1. **Vegetation still sets the scene’s visual ceiling.**  
   Tree crowns resemble dense clusters of flat leaves. Shrubs repeat similar round shapes. The cottage-front plants look oversized.

   **WebGL2 fix:** Make distinct tree and shrub variants with visible branch structure and uneven crown gaps. Correct plant scale against doors. Use leaf-cluster normals and restrained backlighting. Instance variants by species and size; reduce leaf density with distance.

   **Cost:** High authoring effort, roughly 4–7 days. Medium GPU risk from leaf overdraw and shadow rendering.

2. **The roof close-up reads as brown flakes, not convincing clay tiles.**  
   Surface mottling overwhelms the tile shape. Dark cuts and uneven edges suggest broken sheets. Ridge sections resemble a segmented pipe.

   **WebGL2 fix:** Establish consistent overlapping courses and restrained tile variation. Give near tiles thickness at their exposed edges. Use matched clay colour, normal and roughness maps. Reduce random displacement. Seat ridge caps in a continuous mortar bed with subtle joints.

   **Cost:** Medium, roughly 2–4 days. Low to medium GPU cost with instanced near tiles and simpler distant roofs.

3. **Ground detail still lacks evidence of use.**  
   Added gravel and grass texture do not explain movement through the settlement. The yard remains broadly smooth and green. Paths lack distinct compressed centres, worn thresholds and accumulated dirt.

   **WebGL2 fix:** Use shared masks for traffic, moisture and deposits. Drive colour, roughness, small height changes and vegetation placement from those masks. Add shallow wheel tracks, worn door approaches and workshop ash patches. Correct the bright patches in image 04.

   **Cost:** Medium to high, roughly 3–5 days. Low to medium GPU cost; mostly textures and limited local geometry.

4. **Wall and timber materials expose the procedural construction.**  
   White masonry has uniformly strong joints. Openings have conspicuous alternating brick ends. Yard walls resemble oversized blocks. Timber boards have broad, simple colour bands.

   **WebGL2 fix:** Standardize real-world brick dimensions across buildings and boundary walls. Check texture scale against geometry. Let limewash bridge joints, with shallow normal detail and localized wear. Finish opening reveals as connected surfaces. Add timber grain and wear at contact points.

   Use separate colour, normal and roughness maps; these are supported by [Three.js `MeshStandardMaterial`](https://threejs.org/docs/pages/MeshStandardMaterial.html).

   **Cost:** Medium, roughly 2–4 days. Low GPU cost if materials share atlases.

5. **Contact lighting does not consistently explain how objects meet.**  
   Ridge caps, wall bases, timber joints and small props lack convincing local depth. Large cast shadows carry too much of that work. More global fill will not correct this.

   **WebGL2 fix:** Bake local ambient occlusion into building and prop assets. Apply it to indirect light. Add restrained contact shadows where geometry meets the ground. Tune shadow bias at close range. Keep occlusion narrow enough to preserve the improved shadow visibility.

   **Cost:** Medium, roughly 2–3 days. Low runtime cost for baked occlusion; medium cost for a screen-space pass.

6. **The brook still resembles water placed inside a polygonal channel.**  
   Straight bank facets and simple rocks dominate the foreground. The wet band cannot conceal their geometry. Water lacks visible local disturbance around obstructions.

   **WebGL2 fix:** Refine geometry along the waterline. Partly bury rocks and vary bank slopes. Use depth-based absorption and a shallow bed. Drive normal distortion along the stream direction, with local disturbances around rocks. Derive wetness from height above the water.

   **Cost:** Medium to high, roughly 3–5 days. Medium GPU cost if reflection and refraction require extra rendering.

**Distance from AAA: a more complete prototype, still several major asset and material passes from AAA environment quality.**
