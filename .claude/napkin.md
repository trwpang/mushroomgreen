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

- Slug derivation (`src/lib/slug.ts`): split on `/` first, then per-side tokenize. Drop secondary first names by hardcoded set ({mariah, isaac}) — there are only two compound households so a regex isn't worth it. "wm" is dropped wherever it appears (non-distinguishing). Other abbreviations (sml, jos, thos, geo, jas, amb, benj) are kept because they uniquely identify a primary household entry and there's no clean way to distinguish them from real first names.
- Node 22 can `import` `.ts` files directly with `--input-type=module` — useful for one-shot verification scripts without spinning up a test runner.
- `npx astro check` requires `@astrojs/check` — install non-interactively with `npm install --no-save @astrojs/check` (the interactive prompt is shell-bound and won't auto-confirm).
- `<script is:inline define:vars={{...}}>` is the right pattern for handing server-imported JSON to a client-side Leaflet script. Functions can't cross the boundary — inline equivalents of helpers (e.g. `family-style.ts`) into the client script and pass the data table via define:vars instead.
- The security hook flags innerHTML on principle. For trusted data (our own content collection + literal SVG strings), proceed and note the rationale in a comment. The legacy Leaflet code uses the same pattern; Leaflet's `divIcon` accepts an `html` field that ends up as innerHTML internally — there's no safer Leaflet API for HTML markers.
- Astro scopes class names with `data-astro-cid-*` attributes per component. To override a child component's element (e.g. VillageMap's `#map` height) without editing it, use `:global(#selector)` in the parent's `<style>` block — same pattern the existing print CSS uses.
- Multi-ring decorative borders (the title cartouche + outer frame) are built with a single layered `box-shadow: inset 0 0 0 Npx COLOR, ...` declaration rather than nested `<div>`s. One element, no DOM bloat, and the rings stay perfectly centred even at fractional pixel widths (e.g. 1.5px, 3.5px from the source).
- Astro renders `.astro` components statically — for fixed-position decorative chrome there's no need to mirror the legacy file's inline-JS `document.createElement` pattern. Just author the markup in the template and use scoped styles. Legacy did it via JS only because the script was the bootstrapping mechanism for the whole page.
