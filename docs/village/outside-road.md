# The road out of Mushroom Green

## Sources and limits

The family map shows the eastern lane meeting Quarry Road. The original six
village lanes are in `src/data/roads.json`. The saved modern survey in
`legacy/Map/map-11.osm` includes Quarry Road ways 920588405, 1242103263 and
151086274.

Tom supplied the [NLS historic OS overlay](https://maps.nls.uk/geo/explore/#zoom=17.3&lat=52.47692&lon=-2.09059&layers=257&b=ESRIWorld&o=100).
The viewer identifies layer 257 as **OS Six Inch, 1830s–1880s (county layers)**.
The exact sheet survey date was not established. This is not proof of its exact
appearance in 1865.

Visual inspection shows a north/southeast road east of the hamlet, with a bend
closer to the houses than the saved modern route. We use an approximate trace
of this older bend, rather than copying the modern southern curve.

The trace at zoom 18 was calibrated from the viewer's coordinate readouts:

- Screenshot pixel (427, 423): 52.476267, −2.092140, at the connecting lane.
- Screenshot pixel (452, 150): 52.477661, −2.091930, on the straight northern road.

Intermediate points are a visual centreline estimate. Do not interpret their
decimal places as survey precision. The northwestern bend was checked in the
wider zoom 17.3 view and follows the saved OSM points. The source and trace are
recorded in `src/data/outside-roads.json`; a wider reference screenshot is in
`artifacts/village/outside-road/nls-route-reference.jpg`.

Historic map courtesy of the National Library of Scotland, CC-BY as indicated
by the viewer. Modern map data © OpenStreetMap contributors (ODbL).

## What changed

- Trimmed the rendered eastern stub to the older junction.
- Added north and southeast continuations beyond the terrain edge.
- Used the same dirt, worn margins and wheel ruts as the village lanes.
- Recessed the new road into the terrain and cleared vegetation from its route.
- Included both continuations in the map overlay.
- Preserved all 59 household positions, orientations and floor heights.

The old source network still determines house facing and household access.
The terrain, vegetation clearance and map overlay use the rendered network.

## Brook crossing: an explicit interpretation

The southeast road crosses the retained model brook. The road initially dipped
through the water; the terrain check exposed this. A masonry arch now carries
the dirt road across the valley, with low parapets and an open water passage.

**The NLS map does not establish this bridge's material or form.** It reconciles
the historic road trace with the brook and elevation data already in the model.
No brook route, water shader or household numbering has been changed. The
village notes state this limit. The existing terrain atlas also covers the
bridge deck; no new texture images are loaded.

## Validation

- `npm run village:check`
- `npm run village:roads` — junction, both edge exits, house clearance, terrain
  depression, supported water crossing and source network checks.
- Existing `scripts/village/check-layout.ts` — all 59 records, elevations and
  brook samples.
- `npm run build` — asset checks and production build.
- Browser review: full village and the crossing at
  `/village?view=outside&still=1`.
