# Mushroom Green — 1865 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take the existing single-file Leaflet map of Mushroom Green in 1865 and rebuild it as an Astro static site with one durable URL per household, ready to host on `mushroomgreen.uk` via Netlify.

**Architecture:** Astro static site. 59 household Markdown files in a content collection drive both the village map (via a generated `households.json`) and 59 per-household stub pages. Leaflet 1.9 from CDN renders both the village map and a small inset on each household page. Visual continuity with the legacy HTML is required — the family colour palette, polygon styles, settlement boundary, Black Brook, greens, founder gold pulse, and print CSS all carry across.

**Tech Stack:** Astro 5.x, TypeScript, Leaflet 1.9 (CDN), Carto Light tiles, Netlify.

**Source of truth for design decisions:** `docs/plans/2026-04-21-mushroom-green-rebuild-design.md`. Read it first.

**Source of truth for legacy data and visuals:** `legacy/Map/mushroom_green_1865_v10_9_3.html`. The `census` and `osmHouses` JS literals near the top are the data to migrate. The Leaflet setup further down is the visual recipe to port.

---

## Phase 0 — Sanity check (5 min)

### Task 1: Install dependencies

**Files:**
- Modify: nothing (writes `package-lock.json`, `node_modules/`)

**Step 1:** Install.

```sh
cd /Users/tomweaver/Documents/GitHub/mushroomgreen
npm install
```

Expected: clean install, no peer-dep warnings beyond Astro's normal ones. `node_modules/` and `package-lock.json` appear.

**Step 2:** Commit the lock file.

```sh
git add package-lock.json
git commit -m "chore: add npm lock file"
```

### Task 2: Confirm dev server runs

**Step 1:** Start.

```sh
npm run dev
```

Expected: `astro` starts on `http://localhost:4321`. Hit it in a browser; the placeholder index page renders ("Scaffold complete. Implementation in progress.").

**Step 2:** Stop the server (Ctrl-C). No commit.

---

## Phase 1 — Static reference data (15 min)

The settlement boundary, Black Brook, two village greens, and the family colour table are settlement-level constants. Extract them from the legacy HTML into JSON files so the map components can import them.

### Task 3: Extract settlement boundary

**Files:**
- Create: `src/data/boundary.json`

**Step 1:** Read coordinates from `legacy/Map/mushroom_green_1865_v10_9_3.html` line 70 (the `boundary` const).

**Step 2:** Write the JSON.

```json
[
  [52.4772048, -2.0943019],
  [52.4772815, -2.094292],
  [52.4769054, -2.0949522],
  [52.4747151, -2.0949838],
  [52.47469, -2.0933034],
  [52.4751177, -2.0928342],
  [52.4761486, -2.0916816],
  [52.4771787, -2.0942501],
  [52.4771595, -2.0942338],
  [52.4772048, -2.0943019]
]
```

**Step 3:** Commit.

```sh
git add src/data/boundary.json
git commit -m "feat(data): extract settlement boundary"
```

### Task 4: Extract Black Brook coordinates

**Files:**
- Create: `src/data/brook.json`

**Step 1:** Find the `brookCoords` const in the legacy HTML (around line 219 in v10_9_3.html). Copy as JSON array.

**Step 2:** Write `src/data/brook.json` with the `brookCoords` array as a top-level JSON array of `[lat, lon]` pairs.

**Step 3:** Commit.

```sh
git add src/data/brook.json
git commit -m "feat(data): extract Black Brook coordinates"
```

### Task 5: Extract village greens polygons

**Files:**
- Create: `src/data/greens.json`

**Step 1:** Find both `L.polygon([...], {color: '#5a8a3c', ...})` calls in the legacy HTML — village green west of Saltwells Lane, and the second green below Quarry Rd entrance.

**Step 2:** Write `src/data/greens.json`:

```json
[
  {
    "name": "Village Green",
    "label_position": [52.476507, -2.093014],
    "polygon": [
      [52.4764568, -2.0931627],
      [52.4766425, -2.0932004],
      [52.4766113, -2.0928889],
      [52.4763679, -2.0926572],
      [52.4764568, -2.0931627]
    ]
  },
  {
    "name": "Second Green",
    "label_position": null,
    "polygon": [
      [52.476248, -2.0923873],
      [52.4761838, -2.0918355],
      [52.475896, -2.0913672],
      [52.4760005, -2.0918051],
      [52.4758128, -2.0920404],
      [52.4760258, -2.0924309],
      [52.4760423, -2.0925164],
      [52.4761527, -2.0924928],
      [52.476248, -2.0923873]
    ]
  }
]
```

**Step 3:** Commit.

```sh
git add src/data/greens.json
git commit -m "feat(data): extract village greens"
```

### Task 6: Extract family colour table

**Files:**
- Create: `src/data/families.json`

**Step 1:** Pull the `familyColors` object from v10_9_3.html (around line 277). Add `Founder` and `Other` entries (visible in legend).

**Step 2:** Write the JSON.

```json
{
  "Weaver":     {"fill": "#aed6f1", "border": "#2471a3"},
  "Billingham": {"fill": "#f9c6d0", "border": "#c0392b"},
  "Hancox":     {"fill": "#d5f5e3", "border": "#27ae60"},
  "Dimmock":    {"fill": "#fdebd0", "border": "#e67e22"},
  "Griffiths":  {"fill": "#e8daef", "border": "#8e44ad"},
  "Nicklin":    {"fill": "#d6eaf8", "border": "#1a6fa8"},
  "Pearson":    {"fill": "#fdfbd4", "border": "#b7950b"},
  "Sidaway":    {"fill": "#f5cba7", "border": "#ca6f1e"},
  "Kendrick":   {"fill": "#b8ede4", "border": "#1a8878"},
  "Other":      {"fill": "#f0ece0", "border": "#8a7a55"},
  "Founder":    {"fill": "#f9e04b", "border": "#b8860b"}
}
```

**Step 3:** Commit.

```sh
git add src/data/families.json
git commit -m "feat(data): extract family colour table"
```

---

## Phase 2 — Library code (15 min)

Two small TypeScript modules used by both the map and the household pages.

### Task 7: Family style helper

**Files:**
- Create: `src/lib/family-style.ts`

**Step 1:** Write the helper.

```ts
import families from '../data/families.json';

export type FamilyName =
  | 'Weaver' | 'Billingham' | 'Hancox' | 'Dimmock'
  | 'Griffiths' | 'Nicklin' | 'Pearson' | 'Sidaway'
  | 'Kendrick' | 'Other';

type Style = { fill: string; border: string };

export function familyStyle(family: FamilyName, founder = false): Style {
  if (founder) return families['Founder'];
  return families[family] ?? families['Other'];
}

export function fillOpacity(founder: boolean, isWeaver: boolean, estimated: boolean): number {
  if (founder) return 0.95;
  if (estimated) return 0.7;
  if (isWeaver) return 0.88;
  return 0.68;
}

export function borderWeight(founder: boolean, isWeaver: boolean): number {
  if (founder) return 3;
  if (isWeaver) return 2.5;
  return 1.5;
}
```

**Step 2:** Commit.

```sh
git add src/lib/family-style.ts
git commit -m "feat(lib): family colour and style helpers"
```

### Task 8: Slug derivation

**Files:**
- Create: `src/lib/slug.ts`

**Step 1:** Write the helper.

```ts
/**
 * Derive a URL slug for a household.
 * Examples:
 *   slugify(1, "Frost") -> "01-frost"
 *   slugify(22, "Henry Weaver 1789") -> "22-henry-weaver-1789"
 *   slugify(26, "Hannah Weaver (Tromans) 1813") -> "26-hannah-weaver-tromans-1813"
 *   slugify(51, "Wm Round / Isaac Billingham") -> "51-round-billingham"
 */
export function slugify(number: number, householdName: string): string {
  const padded = String(number).padStart(2, '0');
  const cleaned = householdName
    .toLowerCase()
    .replace(/\bwm\b/g, '')           // drop "Wm" abbreviation
    .replace(/\bisaac\b/g, '')        // for compound households, keep surnames only
    .replace(/[()]/g, ' ')            // strip parens
    .replace(/[^a-z0-9\s/-]/g, '')    // drop other punctuation
    .replace(/\s*\/\s*/g, ' ')        // slashes -> spaces
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
  return `${padded}-${cleaned}`;
}
```

**Step 2:** Verify against the four examples above. Add a tiny throwaway script if needed:

```sh
node --input-type=module -e "
import { slugify } from './src/lib/slug.ts';
console.log(slugify(1, 'Frost'));
console.log(slugify(22, 'Henry Weaver 1789'));
console.log(slugify(26, 'Hannah Weaver (Tromans) 1813'));
console.log(slugify(51, 'Wm Round / Isaac Billingham'));
"
```

(Astro projects can't run TS directly without a loader — skip the runtime check if it fails. Eyeball the regex instead.)

**Step 3:** Commit.

```sh
git add src/lib/slug.ts
git commit -m "feat(lib): household slug derivation"
```

---

## Phase 3 — Household data migration (30 min)

Convert the inline `census` and `osmHouses` data from the legacy HTML into 59 Markdown files. The migration is one-shot but committed to `scripts/` for reproducibility.

### Task 9: Write the migration script

**Files:**
- Create: `scripts/migrate-households.mjs`

**Step 1:** Author the script with the legacy data inlined for determinism. Copy `census` (lines 71–131) and `osmHouses` (line 133) verbatim from `legacy/Map/mushroom_green_1865_v10_9_3.html`.

```js
// scripts/migrate-households.mjs
// One-shot migration: legacy inline JS -> 59 src/content/households/*.md files.
// Safe to re-run; overwrites existing files.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'content', 'households');
mkdirSync(OUT_DIR, { recursive: true });

// --- Paste from legacy/Map/mushroom_green_1865_v10_9_3.html ---
const census = {
  1: {name:"Frost", occ:2, weaver:false, founder:false},
  // ... paste all 59 entries from the legacy file ...
  59:{name:"Sml Billingham 1826", occ:9, weaver:false, est:false},
};

const osmHouses = [
  // ... paste all 59 entries from the legacy file ...
];
// --- end paste ---

const FAMILIES = ['Weaver','Billingham','Hancox','Dimmock','Griffiths','Nicklin','Pearson','Sidaway','Kendrick'];

function detectFamily(entry) {
  if (entry.weaver) return 'Weaver';
  const lower = entry.name.toLowerCase();
  for (const f of FAMILIES) {
    if (lower.includes(f.toLowerCase())) return f;
  }
  return 'Other';
}

function slugify(number, name) {
  const padded = String(number).padStart(2, '0');
  const cleaned = name
    .toLowerCase()
    .replace(/\bwm\b/g, '')
    .replace(/\bisaac\b/g, '')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9\s/-]/g, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
  return `${padded}-${cleaned}`;
}

function yamlPolygon(poly) {
  return poly.map(([lat, lon]) => `  - [${lat}, ${lon}]`).join('\n');
}

function yamlFrontmatter(number, entry, house) {
  const family = detectFamily(entry);
  const founder = !!entry.founder;
  const estimated = !!entry.est;
  return `---
number: ${number}
household_name: "${entry.name.replace(/"/g, '\\"')}"
family: ${family}
${founder ? 'founder: true\n' : ''}${estimated ? 'estimated_position: true\n' : ''}occupants_1861: ${entry.occ}
position:
  lat: ${house.lat}
  lon: ${house.lon}
polygon:
${yamlPolygon(house.poly)}
sources:
  - "1861 census"
  - "OSM building polygon (mapping by Mike Mushroom)"
---
`;
}

let written = 0;
for (let n = 1; n <= 59; n++) {
  const entry = census[n];
  const house = osmHouses.find(h => h.num_int === n);
  if (!entry || !house) {
    console.warn(`Skipping #${n}: missing data`);
    continue;
  }
  const slug = slugify(n, entry.name);
  const body = yamlFrontmatter(n, entry, house) + '\n';
  writeFileSync(join(OUT_DIR, `${slug}.md`), body, 'utf-8');
  written++;
}
console.log(`Wrote ${written} household files to ${OUT_DIR}`);
```

**Step 2:** Commit the script (data not yet generated).

```sh
mkdir -p scripts
git add scripts/migrate-households.mjs
git commit -m "chore(migrate): add household migration script"
```

### Task 10: Run the migration

**Step 1:** Execute.

```sh
node scripts/migrate-households.mjs
```

Expected: `Wrote 59 household files to .../src/content/households`. Verify with `ls src/content/households/ | wc -l` — expect `59`.

**Step 2:** Spot-check three files.

```sh
cat src/content/households/01-frost.md
cat src/content/households/22-henry-weaver-1789.md
cat src/content/households/59-sml-billingham-1826.md
```

Each must have valid YAML frontmatter, the right number, the right family, and a polygon array with at least three points.

**Step 3:** Run an Astro build to confirm the schema validates all 59.

```sh
npm run build
```

Expected: build completes without schema errors. If a household fails, the error message will name the file and the field.

**Step 4:** Commit the generated files.

```sh
git add src/content/households/
git commit -m "feat(content): migrate 59 households from legacy HTML"
```

### Task 11: Migrate Henry Weaver founder bio

**Files:**
- Modify: `src/content/households/22-henry-weaver-1789.md`

**Step 1:** Find the founder popup HTML in `legacy/Map/mushroom_green_1865_v10_9_3.html` (around line 348). Lift the prose.

**Step 2:** Append it as the body of `22-henry-weaver-1789.md` (below the closing `---`):

```markdown
Henry Weaver, b.1789 in Sedgley, was patriarch of the Mushroom Green Weavers
and one of the first settlers of the enclosure, establishing the family's
presence in the chainmaking community. He lived here from c.1800 until 1857,
when his wife Ann Maria passed away. He then moved to 52 Netherton Hill, and
his son **John Weaver b.1824** took over the house.
```

**Step 3:** Re-run the build to confirm prose body parses.

```sh
npm run build
```

**Step 4:** Commit.

```sh
git add src/content/households/22-henry-weaver-1789.md
git commit -m "feat(content): add founder biography for Henry Weaver"
```

---

## Phase 4 — Layouts and global styles (15 min)

### Task 12: BaseLayout

**Files:**
- Create: `src/layouts/BaseLayout.astro`

**Step 1:** Author.

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}

const { title, description = 'Mushroom Green in 1865 — a family-history archive of 59 households from the 1861 census.', ogImage = '/og-default.png' } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={new URL(ogImage, Astro.site).toString()} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

**Step 2:** Commit.

```sh
git add src/layouts/BaseLayout.astro
git commit -m "feat(layout): add BaseLayout with OG meta"
```

### Task 13: Global CSS

**Files:**
- Create: `src/styles/global.css`

**Step 1:** Author. Lift the body/typography rules from the legacy HTML's `<style>` block; keep them minimal.

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Georgia, serif;
  background: #ffffff;
  color: #2c1810;
  line-height: 1.5;
}
a { color: #803303; text-decoration: underline; }
a:hover { color: #2c1810; }
img { max-width: 100%; height: auto; }
```

**Step 2:** Commit.

```sh
git add src/styles/global.css
git commit -m "feat(styles): minimal global CSS"
```

---

## Phase 5 — The village map (the main page) (30 min)

### Task 14: households.json build endpoint

**Files:**
- Create: `src/pages/households.json.ts`

**Step 1:** Build a static JSON endpoint. Astro emits this to `dist/households.json` at compile time.

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const households = await getCollection('households');
  const data = households
    .map((h) => ({
      number: h.data.number,
      slug: h.id.replace(/\.md$/, ''),
      household_name: h.data.household_name,
      family: h.data.family,
      founder: h.data.founder,
      estimated_position: h.data.estimated_position,
      occupants_1861: h.data.occupants_1861,
      position: h.data.position,
      polygon: h.data.polygon,
    }))
    .sort((a, b) => a.number - b.number);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 2:** Verify.

```sh
npm run build
cat dist/households.json | head -c 500
```

Expected: pretty JSON or single-line JSON with 59 entries, each with the fields above.

**Step 3:** Commit.

```sh
git add src/pages/households.json.ts
git commit -m "feat(pages): build households.json endpoint"
```

### Task 15: VillageMap component

**Files:**
- Create: `src/components/VillageMap.astro`

This is the largest single port. Strategy: lift the legacy HTML's `<script>` block more or less verbatim, parameterize the data sources (fetch `/households.json`, import boundary/brook/greens/families from props), and let Astro bundle the result.

**Step 1:** Author. Read `legacy/Map/mushroom_green_1865_v10_9_3.html` lines 130–365 and adapt.

```astro
---
import boundary from '../data/boundary.json';
import brook from '../data/brook.json';
import greens from '../data/greens.json';
import families from '../data/families.json';
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" is:inline></script>

<div id="map" style="height: calc(100vh - 48px); width: 100%; background: #ffffff;"></div>

<style is:global>
  /* Lift styles from legacy v10_9_3.html: .leaflet-container, .leaflet-popup-*,
     .pt, .pr, .pn, .pnw, .poc, .pocw, .ps, .pest, .house-label */
  .leaflet-container { background: #ffffff !important; }
  /* ... copy the rest verbatim from legacy <style> ... */
</style>

<script
  define:vars={{
    boundaryCoords: boundary,
    brookCoords: brook,
    greens,
    familyColors: families,
  }}
  is:inline
>
  // === Lift from legacy v10_9_3.html ===
  // - Carto Light tile layer
  // - Inverse mask polygon (white outside boundary)
  // - Boundary outline
  // - Black Brook triple-line + two labels
  // - Two greens + label
  // - Compass control
  // - osmHouses loop (now: fetch from /households.json)
  // - For each household: polygon, label (number + surname), popup
  // - For founder: gold pulse animation + extended popup
  //
  // CHANGES from legacy:
  //   - Data is fetched: `const households = await fetch('/households.json').then(r => r.json());`
  //   - Each popup adds: `<a href="/household/${h.slug}">View household →</a>`
  //   - estimated_position uses dashArray '5 3' and amber border (matches legacy `est` flag)
  fetch('/households.json')
    .then((r) => r.json())
    .then((households) => {
      // ... port the legacy `osmHouses.forEach(h => {...})` block here ...
    });
</script>
```

When porting, preserve every visual detail: the inverse mask, the boundary `dashArray:'6 3'`, brook `weight:9/4.5/1.8`, greens colour `#5a8a3c`, founder pulse keyframes, label `text-shadow`, popup classes.

**Step 2:** Verify with dev server.

```sh
npm run dev
```

Open `http://localhost:4321/`. The map should look like the legacy `v10_9_3.html` opened directly. Side-by-side compare in two browser tabs.

**Step 3:** Commit.

```sh
git add src/components/VillageMap.astro
git commit -m "feat(map): port village map component from legacy HTML"
```

### Task 16: Replace the placeholder homepage

**Files:**
- Modify: `src/pages/index.astro`

**Step 1:** Replace the placeholder with the real map page.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import VillageMap from '../components/VillageMap.astro';
---
<BaseLayout title="Mushroom Green — 1865 Occupants">
  <header
    style="
      background: #2c1810;
      color: #f5e6c8;
      padding: 8px 16px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #803303;
    "
  >
    <div>
      <h1 style="font-size: 1.05em; letter-spacing: 0.03em;">Mushroom Green — 1865 Occupants</h1>
      <p style="font-size: 0.7em; color: #c8a87a; margin-top: 1px;">
        Book of Weaver · OSM mapping by Mike Mushroom · 59 households · Click any house for details
      </p>
    </div>
    <!-- Legend block: lift verbatim from legacy v10_9_3.html lines 53-66 -->
  </header>
  <VillageMap />
</BaseLayout>

<style>
  @media print {
    header { height: 36px; padding: 5px 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
```

**Step 2:** Visual smoke test.

```sh
npm run dev
```

Open `http://localhost:4321/`. Compare against `legacy/Map/mushroom_green_1865_v10_9_3.html` opened in a second tab. They should be near-identical.

**Step 3:** Commit.

```sh
git add src/pages/index.astro
git commit -m "feat(pages): replace placeholder with real map page"
```

### Task 17: Visual parity check

Take a deliberate moment for verification.

**Step 1:** Open both side-by-side. Confirm:
- Settlement boundary dashed in dark brown
- Black Brook triple-line, two italic labels rotated ~22°
- Two green polygons with "Village Green" label on the larger one
- Compass control (top-right or wherever it was)
- All 59 polygons render with family-coloured fills and borders
- House labels show number + surname in family colour
- Hover popup shows surname + occupant count pill
- Click popup includes the new "View household →" link
- Henry Weaver (#22) has the gold pulse animation and an extended founder popup
- Print preview is A4 landscape and looks like `legacy/Map/Mushroom Green — 1865 v12.png`

**Step 2:** Note any drift in `.claude/napkin.md` under "Codebase quirks". No commit needed unless something's fixed.

---

## Phase 6 — Per-household pages (45 min)

### Task 18: HouseholdMeta component

**Files:**
- Create: `src/components/HouseholdMeta.astro`

**Step 1:** Author.

```astro
---
import type { CollectionEntry } from 'astro:content';
interface Props { household: CollectionEntry<'households'>['data']; }
const { household } = Astro.props;
const familyHref = `/family/${household.family.toLowerCase()}`;
---
<div style="display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: baseline; margin: 0.5rem 0 1rem;">
  <span>
    {household.family} family
  </span>
  <span>·</span>
  <span>{household.occupants_1861} occupant{household.occupants_1861 === 1 ? '' : 's'} in 1861</span>
  {household.founder && (
    <span style="color: #b8860b; font-weight: bold;">★ Founder</span>
  )}
</div>
{household.estimated_position && (
  <div style="background: #fff8e8; border-left: 3px solid #c07000; padding: 8px 12px; margin: 0 0 1rem; font-size: 0.9em; color: #8a5500;">
    ⓘ Position estimated — not yet in OpenStreetMap.
  </div>
)}
{household.founder && (
  <div style="background: #fffbea; border-left: 3px solid #b8860b; padding: 10px 14px; margin: 0 0 1rem; font-size: 0.95em; color: #4a3800;">
    <strong>★ Founder of Mushroom Green</strong>
  </div>
)}
```

**Step 2:** Commit.

```sh
git add src/components/HouseholdMeta.astro
git commit -m "feat(components): household metadata strip"
```

### Task 19: NeighboursList and RelatedHouseholdsList

**Files:**
- Create: `src/components/NeighboursList.astro`
- Create: `src/components/RelatedHouseholdsList.astro`

**Step 1:** Both have the same shape. Each takes an array of household numbers and looks them up in the collection.

```astro
---
// NeighboursList.astro
import { getCollection } from 'astro:content';
import { slugify } from '../lib/slug';
interface Props { numbers: number[]; }
const { numbers } = Astro.props;
const all = await getCollection('households');
const byNumber = new Map(all.map((h) => [h.data.number, h.data]));
const items = numbers
  .map((n) => byNumber.get(n))
  .filter((h): h is NonNullable<typeof h> => !!h);
---
{items.length > 0 && (
  <section style="margin: 1.5rem 0;">
    <h2 style="font-size: 1.1em; margin-bottom: 0.5rem;">Neighbours</h2>
    <ul style="list-style: none; padding: 0;">
      {items.map((h) => (
        <li>
          <a href={`/household/${slugify(h.number, h.household_name)}`}>
            No.{h.number} — {h.household_name}
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

For `RelatedHouseholdsList.astro`, identical except the heading is `"Other {family} households"` and the prop is `family: string` (looks up all households with matching family, excluding the current one).

**Step 2:** Commit.

```sh
git add src/components/NeighboursList.astro src/components/RelatedHouseholdsList.astro
git commit -m "feat(components): neighbour and related household lists"
```

### Task 20: InsetMap component

**Files:**
- Create: `src/components/InsetMap.astro`

**Step 1:** Author. Reuses Leaflet but renders a smaller map highlighting one household.

```astro
---
interface Props {
  number: number;
  position: { lat: number; lon: number };
  polygon: [number, number][];
  family: string;
  founder: boolean;
}
const { number, position, polygon, family, founder } = Astro.props;
const mapId = `inset-map-${number}`;
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" is:inline></script>

<div id={mapId} style="height: 320px; width: 100%; background: #fff; border: 1px solid #ddd;"></div>

<script
  define:vars={{ mapId, position, polygon, family, founder, focusNumber: number }}
  is:inline
>
  // Initialize a small map centered on `position`, zoom ~18
  // Fetch /households.json and render every polygon dimmed (low opacity grey)
  // EXCEPT the focused household which is rendered in family colour (gold if founder)
  // Use the same family colour palette as the village map.
  // Disable scroll-zoom; keep drag and tap; disable interactivity on dim polygons.
</script>
```

**Step 2:** Commit.

```sh
git add src/components/InsetMap.astro
git commit -m "feat(components): single-household inset map"
```

### Task 21: Per-household page route

**Files:**
- Create: `src/pages/household/[slug].astro`

**Step 1:** Author.

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import InsetMap from '../../components/InsetMap.astro';
import HouseholdMeta from '../../components/HouseholdMeta.astro';
import NeighboursList from '../../components/NeighboursList.astro';
import RelatedHouseholdsList from '../../components/RelatedHouseholdsList.astro';
import { slugify } from '../../lib/slug';

export async function getStaticPaths() {
  const households = await getCollection('households');
  return households.map((h) => ({
    params: { slug: h.id.replace(/\.md$/, '') },
    props: { household: h },
  }));
}

const { household } = Astro.props;
const { Content } = await household.render();
const data = household.data;
const founderBadge = data.founder ? ' ★ Founder' : '';
const title = `No. ${data.number} — ${data.household_name}${founderBadge}`;
---
<BaseLayout title={title} ogImage="/og-default.png">
  <main style="max-width: 64rem; margin: 0 auto; padding: 1.5rem;">
    <p>
      <a href="/">← Back to Mushroom Green map</a>
    </p>
    <h1 style="margin-top: 1rem;">{title}</h1>
    <HouseholdMeta household={data} />
    <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 1.5rem; align-items: start;">
      <InsetMap
        number={data.number}
        position={data.position}
        polygon={data.polygon}
        family={data.family}
        founder={data.founder}
      />
      <article>
        <Content />
      </article>
    </div>
    {data.neighbours && data.neighbours.length > 0 && (
      <NeighboursList numbers={data.neighbours} />
    )}
    <RelatedHouseholdsList family={data.family} excludeNumber={data.number} />
    {data.sources && data.sources.length > 0 && (
      <section style="margin: 2rem 0; font-size: 0.9em; color: #555;">
        <h2 style="font-size: 1em; color: #2c1810;">Sources</h2>
        <ul>{data.sources.map((s) => <li>{s}</li>)}</ul>
      </section>
    )}
  </main>
  <style>
    @media (max-width: 720px) {
      main > div { grid-template-columns: 1fr !important; }
    }
  </style>
</BaseLayout>
```

**Step 2:** Verify by visiting `/household/22-henry-weaver-1789` in dev. The Henry Weaver bio should render in the right column, the inset map in the left.

```sh
npm run dev
```

Open `http://localhost:4321/household/22-henry-weaver-1789`.

Then a stub: `http://localhost:4321/household/01-frost`. Should render with empty article body but everything else present.

**Step 3:** Commit.

```sh
git add src/pages/household/[slug].astro
git commit -m "feat(pages): per-household route"
```

### Task 22: Wire the map's "View household →" link

If Task 15 already included it, this is a no-op. If not, edit `VillageMap.astro` to add the link in each polygon's popup HTML:

```js
poly.bindPopup(`
  <div class="pt">${isFounder ? '★ ' : ''}No. ${h.number} — Mushroom Green</div>
  <div class="pr">…</div>
  <p style="margin-top:8px;text-align:right;"><a href="/household/${h.slug}">View household →</a></p>
`, {maxWidth:280});
```

**Step:** Commit if changed.

```sh
git add src/components/VillageMap.astro
git commit -m "feat(map): link popups to per-household pages"
```

---

## Phase 7 — Auxiliary pages (15 min)

### Task 23: About page

**Files:**
- Create: `src/pages/about.astro`

**Step 1:** Author. Plain prose describing the project, with credits.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="About — Mushroom Green 1865">
  <main style="max-width: 40rem; margin: 0 auto; padding: 2rem;">
    <p><a href="/">← Back to map</a></p>
    <h1>About this archive</h1>
    <p>
      Mushroom Green is a small chainmaking settlement near Dudley in the West
      Midlands of England. This map shows the 59 households recorded in the
      1861 census, plotted on real building polygons from OpenStreetMap.
    </p>
    <h2>Sources</h2>
    <ul>
      <li>1861 census returns</li>
      <li>OpenStreetMap building polygons (mapping by Mike Mushroom)</li>
    </ul>
    <h2>Credits</h2>
    <p>
      Researched and curated by John Weaver. Site built by Tom Weaver.
      Map families colour-coded: Weaver, Billingham, Hancox, Dimmock, Griffiths,
      Nicklin, Pearson, Sidaway, Kendrick.
    </p>
    <h2>How to read the map</h2>
    <p>
      Each polygon is a building present in 1861. Colour shows the household's
      family. The gold pulse marks the founding household. Click any house for
      its dedicated page.
    </p>
  </main>
</BaseLayout>
```

(Tom: confirm the credit name with father before merging — the placeholder is "John Weaver".)

**Step 2:** Commit.

```sh
git add src/pages/about.astro
git commit -m "feat(pages): about page"
```

### Task 24: 404 page

**Files:**
- Create: `src/pages/404.astro`

**Step 1:** Author.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Not found — Mushroom Green 1865">
  <main style="max-width: 40rem; margin: 0 auto; padding: 4rem 2rem; text-align: center;">
    <h1>Page not found</h1>
    <p>That household doesn't exist — or hasn't been catalogued yet.</p>
    <p style="margin-top: 2rem;"><a href="/">← Back to the map</a></p>
  </main>
</BaseLayout>
```

**Step 2:** Commit.

```sh
git add src/pages/404.astro
git commit -m "feat(pages): 404 page"
```

---

## Phase 8 — SEO + sharing (10 min)

### Task 25: Open Graph image

**Files:**
- Create: `public/og-default.png`

**Step 1:** Copy the existing static map render.

```sh
cp "legacy/Map/Mushroom Green — 1865 v12.png" public/og-default.png
```

**Step 2:** Verify by sharing a preview link in a chat that renders OG cards (iMessage, Slack) — defer until first deploy.

**Step 3:** Commit.

```sh
git add public/og-default.png
git commit -m "feat(seo): default OG image"
```

### Task 26: Sitemap verification

**Step 1:** `@astrojs/sitemap` is already wired in `astro.config.mjs`. Build and check.

```sh
npm run build
ls dist/ | grep sitemap
cat dist/sitemap-index.xml
cat dist/sitemap-0.xml | head -50
```

Expected: `sitemap-index.xml` and `sitemap-0.xml` in `dist/`. The latter lists `/`, `/about`, `/404`, and 59 `/household/*` URLs (62 total).

No code changes; no commit unless adjustments needed.

---

## Phase 9 — Build, deploy, smoke test (30 min)

### Task 27: Production build

**Step 1:**

```sh
npm run build
```

Expected: clean build, no warnings about missing fields, no schema errors.

**Step 2:** Locally serve the build.

```sh
npm run preview
```

Hit `http://localhost:4321/`. Click around: map → household → back. Try a stub household and the founder. Resize the window to mobile width.

### Task 28: Lighthouse + manual checks

**Step 1:** Run Lighthouse against `npm run preview`.

**Step 2:** Verify:
- Performance ≥ 95
- Accessibility ≥ 95
- Best practices ≥ 95
- SEO ≥ 95

**Step 3:** Manual smoke test on iPhone Safari (use a phone, or DevTools mobile emulation):
- Map renders, can pinch/zoom
- House popup opens on tap
- "View household →" link works
- Household page reflows for mobile (single column)
- Inset map fits

If anything fails, fix in the relevant component, re-build, re-test, commit.

### Task 29: First Netlify deploy

**Pre-step (Tom):** Create a Netlify account (or use existing). Create a new site from a Git repository — point it at this repo.

**Step 1:** Push.

```sh
gh repo create mushroomgreen --public --source=. --push
```

(Or use `git remote add origin … && git push -u origin master` if Tom prefers.)

**Step 2:** In Netlify UI, "Import from Git" → select repo → defaults pulled from `netlify.toml`.

**Step 3:** First deploy completes. Visit the auto-assigned `*.netlify.app` URL.

**Step 4:** Smoke test on the live URL: map, one household, founder page, mobile.

**Step 5:** Update `.project-status.md`:

```markdown
status: active
summary: Live on <netlify URL>. MVP complete — map + 59 stub household pages. Ready to point custom domain.
needs-human:
  - Configure DNS for mushroomgreen.uk → Netlify
  - Verify father's preferred credit name on /about
next-for-claude:
  - Once domain flipped, content additions: father's biographies → Markdown
```

```sh
git add .project-status.md
git commit -m "chore: project status — first deploy live"
git push
```

### Task 30: DNS handoff documentation

**Files:**
- Create: `docs/dns-rollout.md`

**Step 1:** Write a short runbook for Tom.

```markdown
# Pointing mushroomgreen.uk at Netlify

1. In Netlify → Site settings → Domain management → Add custom domain → `mushroomgreen.uk`.
2. Netlify shows the required DNS records. Typically:
   - A record at apex `mushroomgreen.uk` → Netlify load-balancer IP (per Netlify's docs).
   - CNAME `www.mushroomgreen.uk` → `<site>.netlify.app`.
3. At your DNS host (where you bought mushroomgreen.uk), add those records.
4. Wait for DNS propagation (minutes to a few hours).
5. Netlify auto-provisions a Let's Encrypt certificate.
6. In Netlify → Domain settings → Set `mushroomgreen.uk` as primary; choose redirect direction (apex vs www).
7. Visit https://mushroomgreen.uk to confirm.
```

**Step 2:** Commit.

```sh
git add docs/dns-rollout.md
git commit -m "docs: DNS rollout runbook"
git push
```

---

## Verification checklist (run after Phase 9)

- [ ] `npm run build` succeeds with no schema errors
- [ ] All 59 household pages render
- [ ] Map matches legacy `v10_9_3.html` visually
- [ ] Founder pulse animation present on Henry Weaver (#22)
- [ ] Founder popup links to `/household/22-henry-weaver-1789`
- [ ] Henry Weaver's page shows the founder bio
- [ ] Stub household page (e.g. `/household/01-frost`) renders cleanly with empty body
- [ ] Inset map highlights only the focused household
- [ ] Estimated-position warning renders for any household with `estimated_position: true`
- [ ] Sitemap lists all routes
- [ ] OG image renders when sharing the URL in iMessage/Slack
- [ ] Print preview from `/` is A4 landscape
- [ ] Mobile (iPhone Safari) usable
- [ ] Lighthouse ≥ 95 across the board
- [ ] Live on Netlify subdomain
- [ ] DNS runbook handed to Tom

---

## Notes

- **TDD where it fits:** the slug helper, the family-style helper, and the data migration script have testable logic — verify them with quick `node` one-liners or a tiny Vitest suite if it's worth the dev-dep. Visual components are verified by running the dev server and comparing to the legacy HTML side-by-side. Don't fake unit tests for visual parity.
- **Frequent commits:** every task ends with one. If a task expands, split it.
- **DRY:** the family colour palette is in *one* place (`src/data/families.json`); the slug rule is in *one* place (`src/lib/slug.ts`); the Leaflet setup recipe lives in two components (VillageMap + InsetMap) — extract a shared helper only if a third use appears.
- **YAGNI:** family pages, search, photo galleries, per-person occupant detail are deferred. Don't build them.
