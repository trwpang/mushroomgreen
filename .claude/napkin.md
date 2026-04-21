# Napkin — Mushroom Green project

Quick-reference notes Claude should internalize on every session start. Update whenever a mistake is corrected, a quirk is discovered, or a pattern is validated.

## Project shape

- Astro static site, content collections drive 59 per-household pages.
- Leaflet 1.9 from CDN (matches the legacy map). Carto Light tiles. Don't swap for MapLibre without explicit ask.
- Tom commits everything. Father supplies content; Tom converts to Markdown.
- Public site, no auth, no CMS.

## Conventions

- Household files: `src/content/households/{NN}-{kebab-name}.md` — two-digit number prefix for natural sort.
- Family enum is fixed: Weaver | Billingham | Hancox | Dimmock | Griffiths | Nicklin | Pearson | Sidaway | Kendrick | Other. Adding a family means updating the enum *and* the colour table in `src/data/families.json`.
- Polygons stored as `[lat, lon]` tuples (matches Leaflet's order, not GeoJSON's `[lon, lat]`). Don't flip them.
- Map visual continuity with the legacy HTML matters. Don't redesign without checking.

## Don't

- Don't move or delete `legacy/`. It's father's source-of-truth reference material.
- Don't add a CMS, auth, comments, or descendant accounts without explicit ask — those were explicitly out of MVP scope.
- Don't reinvent the family colour palette — it's in `Confluence.docx` and the legacy HTML, and father chose it deliberately.

## Codebase quirks

- Some households have two surnames in one slot (e.g. #51 "Wm Round / Isaac Billingham"). MVP keeps both in `household_name`, picks one for `family`. Refactor to a `co_household` field only if the genealogy needs it.
- Henry Weaver b.1789 (#22) is the only household with biographical content on day one — it's the worked example.
- A few households may have `estimated_position: true` if not yet in OSM — render the amber warning when set.

## Patterns that work

- (Add as discovered.)
