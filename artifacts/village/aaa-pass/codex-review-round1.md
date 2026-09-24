**The main failure is consistency.** Detailed textures sit on simple shapes, weak contact shadows, repeated vegetation, and unfinished distant buildings. More texture detail will not close that gap.

Costs below are rough engineering estimates. Runtime costs are relative; measure them on the target device.

1. **Lighting fails to connect objects to the ground.**  
   **Shots:** 01, 02, 04, 08, 09.  
   Shrubs appear to float. Wall bases, fence posts, and yard objects lack convincing contact shadows. Some broad shadows are strong, but small contact points remain bright. This makes the scene look assembled from separate assets.  
   **Fix:** Ground every instance using its root position and terrain height. Improve near-camera shadow resolution and tune bias at scene scale. Add half-resolution SSAO with depth-aware filtering. Use cheap contact decals beneath small static objects.  
   **Cost:** 3–5 days. Moderate GPU cost for SSAO; low cost for placement fixes and decals.

2. **Buildings read as textured boxes.**  
   **Shots:** 01, 02, 04, 08, 09, 10.  
   Roof edges are thin and straight. Several chimneys are plain extrusions. Corners, eaves, and openings lack enough construction detail. The forge has more detail, which exposes the simpler surrounding buildings.  
   **Fix:** Create a shared construction kit: thick roof edges, ridge tiles, fascia boards, recessed openings, projecting sills, lintels, chimney caps, and pots. Add slight, controlled variation in roof and wall alignment. Use simpler geometry only at distance.  
   **Cost:** 5–8 days. Low to moderate GPU cost with instancing and distance-based detail.

3. **Vegetation exposes its construction method.**  
   **Shots:** 01, 02, 07, 08, 09, 10.  
   Leaf clusters form coarse, repeated masses. Several bushes have visible gaps beneath them. Grass looks like isolated spikes. Distant trees become rows of identical pointed shapes. The brook has two conspicuous fences of reeds.  
   **Fix:** Use fewer, better tree and shrub variants. Build irregular branch silhouettes and leaf clusters with several sizes. Tune alpha cutout mipmaps to retain leaf coverage. Add restrained backlighting to leaves. Place grass in patches driven by shade, moisture, and disturbance. Break reed lines into uneven groups.  
   **Cost:** 6–10 days. Moderate cost; foliage overdraw needs a strict budget.

4. **Surface textures look stamped onto geometry.**  
   **Shots:** 01, 02, 03, 05, 06, 07.  
   Plaster repeats in mirrored patches. Wood stretches across large surfaces. Brick joints often read as bright lines rather than recesses. Ground and stone textures blur at close range. Material scale changes between objects.  
   **Fix:** Standardize world-scale texture density. Combine broad colour variation with small normal and roughness detail. Use non-mirrored stochastic sampling on plaster, soil, and rock. Preserve brick alignment; vary bricks through masks instead. Reserve height effects for nearby hero surfaces.  
   **Cost:** 4–7 days. Low to moderate GPU cost, depending on texture samples.

5. **Windows and doors are flat cutouts.**  
   **Shots:** 01, 02, 04, 08, 09.  
   Several windows are uniform green-black rectangles. Others have pale, nearly uniform panes. Frames lack convincing recesses and shadow. The limewashed cottage door is a flat brown slab. These features dominate how viewers judge building scale.  
   **Fix:** Add actual reveals, frame depth, sill geometry, and door thickness. Give glass restrained Fresnel reflection from an environment map. Place a dark interior shell behind each window. Add a few curtain or shutter variants. Model door planks, braces, hinges, and thresholds where visible.  
   **Cost:** 3–5 days. Low GPU cost. Avoid separate real-time reflections for every window.

6. **Lanes and yards lack material structure.**  
   **Shots:** 01, 02, 04, 08, 09.  
   The lane has two dark, nearly continuous stripes. They look painted on. Yard surfaces resemble the same green-brown carpet with scattered stones. Paths do not convincingly record feet, wheels, drainage, or workshop waste.  
   **Fix:** Build terrain masks from use: compacted routes, wheel depressions, muddy hollows, gravel margins, and grass recovery. Add shallow geometry deformation for nearby ruts. Scatter stones into margins and depressions. Concentrate coal dust and scale around forge entrances.  
   **Cost:** 4–6 days. Low to moderate cost using shared terrain masks and instanced scatter.

7. **The distant landscape is visibly unfinished.**  
   **Shots:** 09, 10.  
   Plain red house blocks remain clearly visible. Tree rows repeat across broad, mostly empty fields. Detail disappears before distance and haze can conceal the change. The result resembles a development map.  
   **Fix:** Give distant buildings a minimal roof, chimney, window, and value pattern. Use textured low-detail meshes or baked impostors. Preserve silhouette and average brightness between detail levels. Group vegetation along terrain features and boundaries. Use distance haze to support these transitions.  
   **Cost:** 4–7 days. Usually neutral or beneficial to runtime after proper detail management.

8. **The close cottage view is a camera failure.**  
   **Shot:** 03.  
   A large wooden surface blocks most of the frame. Only a strip of plaster and ceiling remains visible. Whatever the underlying cause, this is an unusable inspection view.  
   **Fix:** Add a camera collision volume and swept movement tests. Set minimum distances from walls and furniture. Validate preset camera positions against the finished geometry. For deliberate cutaway views, hide selected occluding parts. Changing the near clipping plane alone will not fix this.  
   **Cost:** 1–2 days. Negligible runtime cost with simple collision proxies.

9. **Interiors lack convincing indirect light and spatial depth.**  
   **Shots:** 05, 06.  
   The forge walls and floor remain broadly bright despite local fire sources. The cottage has dark furniture against relatively even plaster. Shelves, objects, and wall junctions lack enough local shadow. Both rooms feel displayed rather than enclosed.  
   **Fix:** Bake ambient occlusion and indirect light for static interiors. A procedural scene can still receive a bake after generation. Add local reflection probes for metal and glass. Let windows and fires establish clear light direction. Keep only essential lights dynamic.  
   **Cost:** 4–8 days, including bake tooling. Low runtime cost; moderate texture memory.

10. **Fire and smoke look like separate effects.**  
    **Shots:** 01, 02, 04, 05, 09.  
    Flames form pale, upright tongues. Chimney smoke appears as disconnected soft puffs. Many chimneys emit similar smoke. The bright orange forge threshold looks stronger than some nearby surfaces facing the fire.  
    **Fix:** Combine an emissive coal bed with several animated flame layers. Drive flame motion and light variation from related signals. Replace evenly spaced smoke puffs with overlapping particles that expand, drift, and fade continuously. Use depth fading and vary emission by chimney. Check light penetration through walls.  
    **Cost:** 3–5 days. Moderate transparency cost; reduce particle resolution and distant emission.

11. **The brook lacks convincing shallow-water behaviour.**  
    **Shot:** 07.  
    A broad pale reflection dominates the foreground. Water depth is difficult to read. Rocks and banks lack clear wet boundaries. Ripple scale appears fairly uniform, with little visible response to stones or channel shape.  
    **Fix:** Use scene depth to control absorption and shallow-water colour. Limit distortion near banks to prevent sampling errors. Add a channel flow map, varied normal scales, and local disturbances around rocks. Darken wet bank material. Use restrained planar reflection if the budget permits.  
    **Cost:** 4–7 days. Moderate to high cost with planar reflection; lower with an environment map.

12. **Characters and props break the visual style and scale.**  
    **Shots:** 05, 06, 08.  
    The worker has a detailed human face, while chickens resemble assembled toy shapes. Some chains look extremely thick. Furniture edges are sharp, and the cottage floor has large, regular tiles. These differences prevent a coherent sense of scale.  
    **Fix:** Establish measured reference dimensions for chains, tools, furniture, and floor units. Rebuild the chickens with connected body shapes and better silhouettes. Match texture density across props. Add small bevels to nearby furniture. Check the worker’s grip, feet, and tool contact throughout animation.  
    **Cost:** 5–10 days. Low runtime cost if replacement meshes stay within existing budgets.

**Three global changes**

- **Rebuild the daylight balance.** The grey sky, strong shadows, and dark surfaces do not agree. Choose one clear weather condition. Match the sky environment, sun strength, shadow softness, and ambient fill. Start with neutral reference materials before changing individual textures.

- **Fix colour management, then set exposure and grading.** Check colour textures, data textures, linear lighting, and the output transform. The current image has a pervasive brown-green cast and weak separation between dark materials. Use a restrained filmic tone curve. Keep bloom limited to genuinely bright fire and lamp surfaces.

- **Use one depth system for the whole scene.** Combine near contact shading with smooth distance haze. Keep foreground blacks readable and reduce distant contrast gradually. This will improve scale across the lane, brook, village, and country views. It will not conceal unfinished nearby geometry.

**Changes to remove or rebuild**

Earlier images are not supplied, so these are apparent regressions, not confirmed comparisons.

- **Remove the close cottage preset immediately.** Shot 03 is worse than a simple exterior view.
- **Remove the continuous dark lane stripes.** A plain dirt lane would look more credible than these painted tracks.
- **Reduce the limewash damage.** Shot 04 has large, soft brown patches with little visible cause. A mostly intact coat would work better. Reintroduce damage around damp bases, edges, and exposed masonry.
- **Reduce chimney smoke coverage.** Repeated puffs across nearly every view advertise the particle system. Fewer convincing emitters would be stronger.
- **Remove floating shrubs and toy-like chickens until corrected.** Empty ground would draw less attention to the construction method.
- **Reduce oversized plaster cracks and stretched wood detail.** Plain rough surfaces would look better than obvious repetition.
- **Remove the pale selection ring from presentation captures.** In shot 04, it dominates the cottage silhouette.
- **Consolidate the interior controls.** Shot 06 has competing panels on three edges and faint text over the scene. This directly weakens the presentation.

**Fix grounding, building depth, and vegetation first.** Those defects affect almost every frame. Additional small props will have little value until these foundations work.
