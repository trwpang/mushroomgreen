# Historic landscape pass — 23 September 2026

## Evidence and limits

The [NLS overlay supplied by Tom](https://maps.nls.uk/geo/explore/#zoom=17.3&lat=52.47692&lon=-2.09059&layers=257&b=ESRIWorld&o=100) shows worked ground around the hamlet. The local sheet is [Worcestershire IV.NE](https://maps.nls.uk/view/101585833), surveyed **1881–1882**, published **1887**. The series name “1830s–1880s” is not a survey date. Tom approved an interpretation within the existing perimeter, including features shown on this later map.

The trace uses the north-up map at 52.4763, -2.09357, zoom 17.3. Henry’s model origin corresponds approximately to pixel (384,529.2) in the saved 768×817 reference. The approximate scale is .925 metres per pixel east and .923 south. This is a visual alignment, not a surveyed georeference. The modern basemap was also checked at 45% overlay opacity. Historic household numbering stays unchanged.

Reference: `artifacts/village/historic-landscape/nls-reference.jpg`.

## Added inside the existing boundary

| Feature | Implementation | Interpretation |
|---|---|---|
| Old clay pits | The southern bank of the northern pit, uneven clay ground, stones and sparse scrub | Most of the pit lies outside the scene. Depth and erosion are inferred. |
| Shaft workings | Disturbed eastern ground, two brick collars with plank covers and timber enclosures | Covers and safety fences are a restrained choice; the map does not establish their condition in 1865. |
| Railway routes | About 612 m of track across three traced branches, 846 sleepers, rail chairs and fastenings; graded cuttings and embankments; timber boards at road crossings | Gauge, rail section, road crossing details and exact grades are inferred. No trains or headframes added. |
| Wet hollows | Two small pools with damp edges and reeds, fitted to depressed ground | One follows the blue map patch; the other interprets wet ground in the workings. Advanced water remains deferred. |
| Cottage plots | 58 unequal plot areas; 261 sections of low brick wall, timber fence or hedge; 10 small planted beds | Neighbouring homes constrain plot size. These are not surveyed property boundaries. |
| Backyard workshops | 50 new small nail/chain shops plus Henry’s existing shop: 51 of 58 domestic plots | No additional shop is forced into the seven constrained plots: 6, 34, 35, 36, 38, 41 and 42. Shared use is possible but is not asserted as fact. |

The mapped brickkilns lie **outside** the perimeter. They have not been moved into the village. The original cottages, household positions, main forge and Henry’s workshop remain in place.

New shops have varied brick, patched limewash or timber walls, mortar cores, individual roof tiles, open braced doors, framed glazing, small pavers, hollow chimneys, an L-shaped hearth, an anvil, stock and a chain-support ring. They are small interpreted working spaces, not additional full cutaway tours. Existing household records open when selecting their shops.

Shared placement exclusions keep new buildings, access paths, fences, trees, flowers, animals and working props apart. Workshop floors receive small level platforms. Existing home floor heights remain unchanged.

## Navigation and labels

“Old workings” and “Backyard shops” provide close views. “House labels” shows the saved household number and name; each label opens the household record. Labels move with the view, avoid one another and the main controls, and hide indoors or in clean pictures. Map-overlay number labels remain available separately.

Labels are HTML buttons projected onto screen coordinates. They use no image textures. This keeps text sharp and supports keyboard focus. The compass remains tied to model north (-Z).

## Validation and browser cost

- `village:historic`: 50 new shops, clear entrances, level floors, unchanged house heights, railway clearance, upward water normals and retained logical prop groups.
- Added detail: **30 material/geometry batches**, approximately **1.245 million triangles**, **zero new texture files**. Existing surface maps are reused.
- Existing road, navigation, animal, prop, household layout and texture checks pass. Production build and asset budgets pass.
- Chrome visual review covered the overview, labels, workshop close view and working hollows. Roof overlap and wall-board details were corrected after inspection. No visible console errors were present.
- An observed workings view reported about 24 FPS, with roughly 24 MiB in the streamed surface-texture cache. This is a single desktop observation, not a cross-device performance guarantee. Chrome reported high total page memory (about 1.3–1.7 GB). The existing `drawCalls` display reads the final compositor pass, so it does not measure the whole frame.

Validation data and the placement plan are saved under `artifacts/village/historic-landscape/`. All work remains local; no deployment or push.
