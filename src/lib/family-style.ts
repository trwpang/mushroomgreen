import families from '../data/families.json';

/**
 * Family enum — must stay in sync with the schema in src/content/config.ts
 * and the colour table in src/data/families.json.
 */
export type FamilyName =
  | 'Weaver'
  | 'Billingham'
  | 'Hancox'
  | 'Dimmock'
  | 'Griffiths'
  | 'Nicklin'
  | 'Pearson'
  | 'Sidaway'
  | 'Kendrick'
  | 'Other';

interface Swatch {
  fill: string;
  border: string;
}

const palette = families as Record<string, Swatch>;

/**
 * Look up the fill/border colours for a household.
 *
 * Founder households override the family colour with the gold "Founder" swatch.
 * Falls back to "Other" if the family lookup misses (defensive — the schema
 * enum should prevent this, but the JSON import isn't typed).
 */
export function familyStyle(family: FamilyName, founder = false): Swatch {
  if (founder) {
    return palette.Founder ?? palette.Other;
  }
  return palette[family] ?? palette.Other;
}

/**
 * Polygon fill opacity, matching the legacy map exactly.
 *   founder   → 0.95
 *   estimated → 0.70
 *   weaver    → 0.88
 *   default   → 0.68
 */
export function fillOpacity(
  founder: boolean,
  isWeaver: boolean,
  estimated: boolean,
): number {
  if (founder) return 0.95;
  if (estimated) return 0.7;
  if (isWeaver) return 0.88;
  return 0.68;
}

/**
 * Polygon border weight in pixels, matching the legacy map.
 *   founder → 3
 *   weaver  → 2.5
 *   default → 1.5
 */
export function borderWeight(founder: boolean, isWeaver: boolean): number {
  if (founder) return 3;
  if (isWeaver) return 2.5;
  return 1.5;
}
