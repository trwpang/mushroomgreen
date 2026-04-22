# Mushroom Green — 1865 site rebuild — design

**Date:** 2026-04-21
**Status:** Approved (brainstorm session)
**Owner:** Tom Weaver
**Content author:** Tom's father (handing copy to Tom for commit)

---

## 1. Context

Tom's father has built a single-file interactive Leaflet map of **Mushroom Green in 1865** — a small chainmaking settlement near Dudley, England — showing all 59 households recorded in the 1861 census, colour-coded by family (Weaver, Billingham, Hancox, Dimmock, Griffiths, Nicklin, Pearson, Sidaway, Kendrick, Other), with hover popups showing household name and occupant count. House polygons come from OpenStreetMap (mapping by Mike Mushroom). The Weaver family — Tom's lineage — is the focus; Henry Weaver b.1789 is highlighted as the founder with a pulsing gold marker and a biographical popup.

The current artefact is `MAP mushroom green1865 v10.html` / `mushroom_green_1865_v10_9_3.html` — a self-contained HTML file with all data inlined as JavaScript, designed to be opened locally and distributed with companion `.docx` print wrappers.

The goal of this rebuild is to:

1. Take that map online at a real, shareable URL.
2. Restructure the data so each household has a durable home (its own page at its own URL) where biographies, photos, family-tree notes, and other historical content can grow over time.
3. Keep the current visual identity. Don't reinvent what already works.

## 2. Goals & non-goals

**Goals (MVP):**

- Ship the existing map, visually faithful to v10_9_3, on `mushroomgreen.uk` via Netlify.
- Convert the inline census + OSM polygon data into 59 per-household Markdown files with typed frontmatter (one source of truth per household).
- Generate one stub page per household at `/household/{number}-{kebab-name}` from those files, even when the prose body is empty.
- Migrate the existing Henry Weaver founder biography to its household page as the worked example.
- Make the build fail loudly on bad household data (typo in family name, missing position, etc.) so silent breakage doesn't accumulate.
- Print CSS preserved — A4 landscape from the live site still works for handouts.

**Non-goals (MVP):**

- Per-person occupant detail (names, ages, occupations from the census transcribed for each individual). Schema leaves room; doing the work is later.
- Family pages (`/family/weaver`). The household-page cross-links cover the same need for now.
- Search.
- Photo galleries beyond a simple list.
- Authentication, user accounts, comments, contributions.
- A CMS UI. Tom edits Markdown directly.
- Custom historical-styled basemap (sepia/parchment). Carto Light is fine — it's what the current map uses.
- Family-tree cross-link visualisations beyond a simple list of related households.

**Explicit out-of-scope until evidence justifies it:**

- The "B. unlisted family extras" option from brainstorming — public site for everyone is the MVP. The architecture leaves room to add `/family/private/...` later behind basic auth.

## 3. Architecture

**Stack:** Astro (static), Leaflet 1.9 from CDN (matches current map), Carto Light tiles (matches current map), TypeScript, Netlify hosting.

**Why Astro:**

- Built-in content collections — point Astro at `src/content/households/`, get a typed query API and one route per file with no plumbing.
- Static output — no server, no DB, no runtime cost. Netlify CDN serves it.
- Zero-JS by default — pages are HTML; Leaflet is a small island only on routes that need it.
- Markdown-first — frontmatter is the data model.

**Why Leaflet (kept from current build):**

- Already works. The current map's behaviour, styling, and quirks are tuned. Switching to MapLibre + custom tiles is a rebuild, not a port.
- Carto Light tiles are free and look right with the current colour palette.
- Father can read and reason about the existing JS. Continuity matters.

**Why Netlify:**

- Free static hosting with deploy previews per branch.
- Automatic Let's Encrypt for the custom domain.
- Trivial DNS swap when going live on `mushroomgreen.uk`.

## 4. Repo layout

```
mushroomgreen/
├── .git/
├── .gitignore
├── .project-status.md           # tracked by Tom's TRW dashboard
├── .claude/
│   └── napkin.md                # per Tom's global CLAUDE.md
├── README.md
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── netlify.toml
├── docs/
│   └── plans/
│       └── 2026-04-21-mushroom-green-rebuild-design.md   # this doc
├── public/
│   └── photos/                  # household photos referenced from frontmatter
├── src/
│   ├── pages/
│   │   ├── index.astro                          # the map (homepage)
│   │   ├── about.astro
│   │   ├── 404.astro
│   │   └── household/
│   │       └── [slug].astro                     # one route per household
│   ├── layouts/
│   │   └── BaseLayout.astro                     # shared shell, OG meta, header
│   ├── components/
│   │   ├── VillageMap.astro                     # main Leaflet map
│   │   ├── InsetMap.astro                       # single-household focus map
│   │   ├── HouseholdMeta.astro                  # family, occupants, founder badge
│   │   ├── NeighboursList.astro
│   │   └── RelatedHouseholdsList.astro
│   ├── content/
│   │   ├── config.ts                            # household schema (Zod)
│   │   └── households/
│   │       ├── 01-frost.md
│   │       ├── 02-roberts.md
│   │       ├── ...
│   │       └── 59-sml-billingham-1826.md
│   ├── data/
│   │   ├── boundary.json                        # settlement polygon
│   │   ├── brook.json                           # Black Brook coords
│   │   ├── greens.json                          # village greens polygons
│   │   └── families.json                        # family colour table
│   ├── lib/
│   │   ├── family-style.ts                      # colour + font logic, shared
│   │   └── slug.ts                              # slug derivation rules
│   └── styles/
│       └── global.css
└── legacy/                                      # father's source material
    └── Map/
        ├── MAP mushroom green1865 v10.html
        ├── mushroom_green_1865_v10_9_3.html
        ├── *.docx                               # print wrappers
        ├── *.webarchive
        ├── *.png
        ├── map-11.osm
        └── Mushroom Green Maps/
```

## 5. Data model

**One Markdown file per household at `src/content/households/{number}-{kebab-name}.md`.** Number prefix gives natural sort. Slug is derived: lowercase, drop punctuation, kebab-case the household name, prefix with two-digit number.

**Slug examples:**

| Household | Slug |
|-----------|------|
| 1 — Frost | `01-frost` |
| 22 — Henry Weaver 1789 | `22-henry-weaver-1789` |
| 26 — Hannah Weaver (Tromans) 1813 | `26-hannah-weaver-tromans-1813` |
| 51 — Wm Round / Isaac Billingham | `51-round-billingham` |
| 38 — Yardley / Mariah Weaver 1789 | `38-yardley-weaver-1789` |

For households with two surnames in one slot ("Wm Round / Isaac Billingham"), MVP keeps both in `household_name` and uses one combined slug. The `family` field picks the primary (the one driving the colour today). This matches the current data exactly. If the genealogy ever needs richer modelling, refactor to a `co_household` field — additive, non-breaking.

**Frontmatter schema (validated by Astro content collections):**

```yaml
---
number: 22                        # int 1–59 — required
household_name: "Henry Weaver 1789"   # required
family: Weaver                    # enum: Weaver | Billingham | Hancox | Dimmock |
                                  # Griffiths | Nicklin | Pearson | Sidaway |
                                  # Kendrick | Other — required
founder: true                     # boolean — optional, default false
estimated_position: false         # boolean — optional, default false (true =
                                  # not yet in OpenStreetMap, mirrors `est:true`
                                  # flag in current map)
occupants_1861: 2                 # int >= 0 — required (household size)
position:                         # required
  lat: 52.47568
  lon: -2.09253
polygon:                          # required — OSM building outline
  - [52.4756481, -2.0925223]
  - [52.4756037, -2.0925748]
  - ...
neighbours: [21, 24, 25]          # int[] — optional, adjacent households
related_households: [36, 37]      # int[] — optional, e.g. other Weaver houses
photos: []                        # string[] — optional, paths under /public/photos/
sources:                          # string[] — optional, references for traceability
  - "1861 census RG9/2027"
  - "OSM building polygon"
---

Henry Weaver, b.1789 in Sedgley, was patriarch of the Mushroom Green Weavers
and one of the first settlers of the enclosure...
```

**Schema enforced in `src/content/config.ts` via Zod.** Build fails with file:line error on:

- Missing required field
- `family` not in the enum (typo like `Weeaver`)
- `polygon` not an array of `[number, number]` tuples
- `position.lat` / `position.lon` not numbers

**How map data gets aggregated:** Astro's `getCollection('households')` runs at build time. A small build step in `src/pages/index.astro` (frontmatter section) reads all 59 entries and writes a flat `households.json` for the Leaflet map to fetch on the homepage. Same data drives the per-household routes via `getStaticPaths()`.

**Static reference data** (boundary, brook, greens, family colours) lives in `src/data/*.json` — these are settlement-level, not per-household, and don't change per build. The `VillageMap` component imports them directly.

## 6. Pages & routes

| Route | Source | Purpose |
|-------|--------|---------|
| `/` | `src/pages/index.astro` | The map. Visually identical to current `v10_9_3.html`. |
| `/household/{slug}` | `src/pages/household/[slug].astro` + content collection | One per household, generated via `getStaticPaths()`. |
| `/about` | `src/pages/about.astro` | Project description, credits to father and Mike Mushroom, sources, methodology. |
| `/404` | `src/pages/404.astro` | Friendly fallback with link back to map. |
| `/households.json` | Built from collection at compile time | Static JSON consumed by `VillageMap`. |
| `/sitemap-index.xml` | `@astrojs/sitemap` integration | Auto-generated. |

### 6a. The map (`/`)

Visual continuity with current map:

- Leaflet 1.9 from CDN (same as today)
- Carto Light tiles (same)
- Same family colour palette, same polygon styling, same boundary dashing, same Black Brook triple-line, same greens, same compass control
- Founder gold pulse for Henry Weaver — same animation
- House labels: number + surname in family colour
- Hover popup: surname + occupants pill (same as today)
- Print CSS: A4 landscape header at 36px (same as today)
- Header: title, byline, legend (same content)

**Behavioural changes:**

- Click a polygon → popup includes a "View household →" link routing to `/household/{slug}`
- Data sourced from `/households.json` (built from frontmatter), not inlined JS
- Family colour rules and founder logic move from inline JS into `src/lib/family-style.ts`, shared with the household pages

### 6b. Per-household page (`/household/{slug}`)

Layout:

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Mushroom Green map                            │
├─────────────────────────────────────────────────────────┤
│  No. 22 — Henry Weaver, b.1789  ★ Founder               │
│  Weaver family · 2 occupants in 1861                    │
│                                                         │
│  ┌──────────────────┐                                   │
│  │ [inset map]      │  Henry Weaver, b.1789 in          │
│  │ this house gold, │  Sedgley, was patriarch of the    │
│  │ neighbours dim,  │  Mushroom Green Weavers and one   │
│  │ rest faded       │  of the first settlers of the     │
│  └──────────────────┘  enclosure…                       │
│                                                         │
│  Neighbours                                             │
│  • No.21 — Amb Weaver 1814                              │
│  • No.24 — Jas Weaver 1814                              │
│  • No.25 — Thos Weaver 1821                             │
│                                                         │
│  Other Weaver households                                │
│  • No.6 — Henry Weaver 1827                             │
│  • No.20 — Jos. Weaver 1811   (etc.)                    │
│                                                         │
│  Sources                                                │
│  • 1861 census RG9/2027                                 │
│  • OSM building polygon                                 │
└─────────────────────────────────────────────────────────┘
```

**Empty-state:** if the prose body is empty (the common case at MVP launch), the page still renders with title, inset, family, occupants, neighbours, related, sources. Useful from day one.

**Estimated-position warning:** if `estimated_position: true`, an amber note appears under the title — *"Position estimated — not yet in OpenStreetMap."* — mirroring the current popup behaviour.

**Founder badge:** if `founder: true`, the gold star appears next to the household name, and a "Founder of Mushroom Green" call-out appears above the prose body.

### 6c. About page

One static page covering:

- What Mushroom Green was in 1865 (chainmaking, the enclosure, Black Brook)
- The 1861 census as the underlying source
- Mike Mushroom's OSM mapping work
- Tom's father's research and curation
- How to read the map (legend, family colours, founder)
- Plain-language note on accuracy and ongoing additions

## 7. Build & deploy

**Build:**

- `npm run build` runs Astro's static build → `dist/`
- Astro validates every `.md` against the content schema; bad frontmatter fails with file:line error
- Single artefact, no env vars needed

**Netlify config (`netlify.toml`):**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/households.json"
  [headers.values]
    Cache-Control = "public, max-age=3600"
```

**Branch deploys:** Netlify gives every branch a preview URL. Tom shares previews with father before merging.

**Domain rollout:**

1. Initial deploy on `<auto>.netlify.app`
2. Verify map and a couple of household pages on mobile + desktop
3. Add `mushroomgreen.uk` as a custom domain in Netlify; LE certificate provisioned automatically
4. DNS at registrar:
   - `A` apex → Netlify load-balancer IP (per Netlify's current docs)
   - `CNAME` `www` → `<site>.netlify.app`
5. Set `mushroomgreen.uk` as primary; auto-redirect `www.` → apex

**Day-one extras:**

- `@astrojs/sitemap` integration for `/sitemap-index.xml`
- Open Graph meta on every page (title + a static map PNG — the existing `Mushroom Green — 1865 v12.png` is perfect)
- Friendly 404 page
- Print CSS preserved

## 8. Verification

**Pre-deploy (must pass before merging or flipping the domain):**

- `npm run build` succeeds with no schema errors
- All 59 household pages render without runtime errors
- Map loads and `/households.json` is fetched
- Inset map on a household page works (a single household is highlighted; rest faded)
- Visual smoke test on iPhone Safari + desktop Chrome
- Lighthouse score ≥ 95 across the board (static Astro should achieve this trivially)
- Founder pulse renders, founder popup links to the founder's household page
- Estimated-position warning appears for any household with `estimated_position: true`

**Manual checks:**

- One known-coord household (e.g. #22 Henry Weaver) places at the same lat/lon as the current map
- Family colour for at least one household per family matches the current map
- Print preview from `/` produces an A4-landscape page that looks like the current PDF/docx output

## 9. Future hooks (no work now — architecture supports them)

- **Unlisted family content (option B):** add `/family/private/...` routes with `noindex` meta + Netlify basic-auth headers. Same Markdown pattern; no schema change.
- **Family pages:** add `src/pages/family/[name].astro`. Filter the collection by `family`, render a small map and a list. Pure additive.
- **Search:** add Pagefind (free, static, generated at build time). No backend.
- **Photo galleries:** the `photos: []` frontmatter field is already in the schema. Just build a richer rendering component.
- **Per-person occupant detail:** add an optional `people:` array to frontmatter when census transcriptions arrive. Existing files remain valid:
  ```yaml
  people:
    - name: "Henry Weaver"
      born: 1789
      birthplace: Sedgley
      occupation: chainmaker
    - name: "Ann Maria Weaver"
      born: 1791
      relationship: wife
  ```
- **Family-tree cross-links beyond a simple list:** progressive enhancement — render a graph or a small tree visualisation in the related-households component. Data is already there.
- **Custom historical-styled basemap:** swap Carto Light for a MapLibre style with vector tiles when there's appetite. Keep the `VillageMap` component's API the same so household pages don't change.

## 10. Open questions / decisions deferred

- **Netlify subdomain name** — Tom picks at first deploy. Suggest `mushroom-green` if available.
- **DNS host for `mushroomgreen.uk`** — Tom configures when ready to flip.
- **Analytics** — none for MVP. Add Plausible or Netlify Analytics later if there's interest.
- **Comments / submissions from descendants** — explicitly out of scope. Revisit if community appears.

## 11. Migration of the founder bio

The existing Henry Weaver founder popup HTML in `mushroom_green_1865_v10_9_3.html`:

> Henry Weaver b.1789, Sedgley — patriarch of the Mushroom Green Weavers and one of the first settlers of the enclosure, establishing the family's presence in the chainmaking community. Lived here from c.1800 until 1857, when his wife Ann Maria passed away. He then moved to 52 Netherton Hill, and his son John Weaver b.1824 took over the house.

This becomes the prose body of `src/content/households/22-henry-weaver-1789.md`, lightly reformatted to Markdown. It's the worked example for the per-household pattern.

## 12. Authoring workflow

Father drafts content (Word, email, plain text — whatever's comfortable) and hands it to Tom. Tom edits the matching `.md` file: drops prose into the body, adds `photos`, `sources`, `related_households`. Tom commits, Netlify deploys, Tom shares the preview link with father for sign-off, then merges.

No CMS. No login. The friction is intentional — every change goes through Tom's review, which keeps the archive consistent.

---

## 13. Update 2026-04-22 — source switched to v10_11_35_28

**What changed:** Initial implementation ported the legacy file `mushroom_green_1865_v10_9_3.html`. Tom's father confirmed the canonical source is the later `mushroom_green_1865_v10_11_35_28.html` (extracted from the `Mushroom Green — 1865 —interactive online version.webarchive`, now also stored as a plain `.html` in `legacy/Map/` for reference). The newer file shifts the map from a clean digital plot toward a Victorian-era surveyed-map aesthetic.

**Households are unchanged** — same 59 entries, same OSM polygons, same census fields. The schema, the migration script, the household pages, the content collection, the deploy plumbing — all remain.

**What's added:**

- **Homer family** — 10th family colour (light purple `#d8c8f0` / border `#6844b0`). Households #28, #35, #44, #49, #52 (all surnamed Homer) recolour from "Other" beige to Homer purple. Schema enum + `families.json` + legend + migration script update.
- **Mousesweet Brook** — second river. ~46 lat/lon points joining Black Brook. New `src/data/mousesweet.json`. Same triple-line styling as Black Brook.
- **Black Brook** — densified from 29 to 44 points; outer band weight 9→8, colour `#a8d8f0`→`#7ab8d8`, opacity 0.35→0.45; mid opacity 0.80→0.85; inner opacity 0.65→0.70.
- **12 area polygons (A–M)** — watercolour land-use context drawn beneath houses: Mushroom Green Valley, MG Settlement, Saltwells Nature Reserve, two Village Greens, Industrial Area, four Residential zones (W, NE, SE, Central, S), West H, Pond. New `src/data/areas.json`. Total ~600 lat/lon points.
- **6 settlement road centrelines** — drawn atop houses with cream-on-dark double-line for hand-engraved look. New `src/data/roads.json`.
- **Victorian title cartouche** — fixed bottom-left, triple-inset border, contains title + byline + household count.
- **Decorative outer map border** — 3px outer frame with triple inset rings + 4 corner cross-pattée SVG ornaments.
- **"SCALE OF CHAINS" bar** — bottom-right, 4 alternating black/cream chain segments with 0/1/2/3/4 ch. tick labels.
- **"Surveyed by Michael Weaver from Census Returns, 1861 · Parish of Rowley Regis"** — bottom-right italic attribution.
- **Place labels** — "Oxley Close", "Quarry Road" (boundary roads); "Mushroom Green Valley", "Saltwells Nature Reserve" (area context).
- **Compass** — fleur-de-lis ornament on the N point.
- **Sepia tile filter** — `sepia(0.2) brightness(0.98) contrast(0.97)` applied to `.leaflet-tile-pane` for a vintage tone.
- **IM Fell English** — Google Fonts antique serif applied globally as primary font (Georgia falls back). The new source imports the font but never wires it; we wire it globally as the most likely intent.
- **Map view changes:** explicit `setView([52.4757932163071, -2.0936364426410514], 18.25)` instead of `fitBounds`. `minZoom: 15` (was 17) for more zoom-out reach. `zoomSnap: 0.25, zoomDelta: 0.25` for finer-grained zoom. `maxBounds` removed — users can now pan freely.
- **Header** — taller (48 → 72px), bigger title font (1.05em → 1.2em), bigger subtitle (0.7em → 0.8em). Print CSS still collapses header to 36px for A4 landscape.

**What's deliberately stripped:**

- **`window.changeArea` / `resetArea` / `listAreas`** — console-only authoring API. Removed from production. (Father can edit `areas.json` directly to recolour.)
- **`#area-key` debug panel** — `display:none` in source; not built.
- **`outerBoundary` const** — declared but unused in source (~100 dead lat/lon pairs); not ported.

**Decisions made (bias: trust father's intent, strip authoring scaffolding):**

- IM Fell English applied globally — the file imports it but never wires it; the most defensible interpretation is "Dad meant to apply it everywhere but didn't finish."
- All 12 area polygons kept — they're the Victorian land-use story. Area B (Settlement) overlaps the dashed brown boundary; both retained because they have different visual weight (B is a soft fill, the boundary outline is the dashed marker).
- Console editing API removed — production page should not expose authoring affordances.

**Implementation phases (executed 2026-04-22):**

- **Phase A** — Data files + schema: add Homer to families.json + schema + legend, densify brook.json, add mousesweet.json + areas.json + roads.json, re-run migration to re-detect Homer households.
- **Phase B** — VillageMap re-port: add area-polygon layer (beneath houses), mousesweet polyline, settlement-road double-lines (atop houses), boundary + area labels, fleur-de-lis on compass, sepia tile filter, switch view to setView at zoom 18.25, minZoom 15, zoomSnap 0.25, remove maxBounds.
- **Phase C** — Page chrome: import IM Fell English in BaseLayout and wire it globally, add Victorian title cartouche / decorative border / scale-of-chains / surveyed-by annotation as components, update index.astro header to 72px + bigger fonts.
