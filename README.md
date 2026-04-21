# Mushroom Green — 1865

Family history archive map of Mushroom Green, a chainmaking settlement near Dudley, England, as it stood in 1865. 59 households from the 1861 census, plotted on real OpenStreetMap building polygons, colour-coded by family.

Live site: <https://mushroomgreen.uk> (once deployed).

## Background

Built by Tom Weaver from research and curation by his father. House polygons mapped in OSM by Mike Mushroom. The Weaver family is the focus of the archive ("Book of Weaver"), but all nine recurring families are colour-coded and cross-linked.

## Stack

- [Astro](https://astro.build) — static site generator, content collections
- [Leaflet](https://leafletjs.com) — interactive map
- [Carto Light](https://carto.com/basemaps/) tiles
- [Netlify](https://netlify.com) — hosting

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Add or edit a household

Each household lives at `src/content/households/{number}-{kebab-name}.md`. Frontmatter shape and the data model are documented in [`docs/plans/2026-04-21-mushroom-green-rebuild-design.md`](docs/plans/2026-04-21-mushroom-green-rebuild-design.md).

## Legacy material

`legacy/` contains the original single-file HTML maps, Word print wrappers, OSM source export, and PNG renders that this project rebuilds. Not deployed; kept for reference.
