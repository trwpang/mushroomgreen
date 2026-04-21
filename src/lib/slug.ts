/**
 * Derive a kebab-case slug for a household, prefixed with a zero-padded number.
 *
 * Rules:
 * - Zero-pad `number` to two digits, prefix with hyphen as separator.
 * - Lowercase the household name.
 * - Strip parentheses but keep their content.
 *   "Hannah Weaver (Tromans) 1813" → "hannah-weaver-tromans-1813"
 * - For compound households joined with "/" (e.g. "Wm Round / Isaac Billingham"),
 *   keep surnames only on the secondary side — drop secondary first names.
 *   "Yardley / Mariah Weaver 1789" → "yardley-weaver-1789"
 * - Drop "wm" anywhere (non-distinguishing first-name abbreviation), but keep
 *   other abbreviations like "sml", "jos", "thos" because they uniquely identify
 *   a primary household entry.
 * - Replace "/" and other non-alphanumeric characters with spaces, collapse
 *   whitespace, then join with hyphens.
 */
export function slugify(number: number, householdName: string): string {
  const numPart = String(number).padStart(2, '0');
  const namePart = nameSlug(householdName);
  return `${numPart}-${namePart}`;
}

// First-name tokens to drop on the secondary side of a "/"-compound name.
// Matches the two existing compound entries:
//   #38 "Yardley / Mariah Weaver 1789"   → drop "Mariah"
//   #51 "Wm Round / Isaac Billingham"    → drop "Isaac" (and "Wm" via the
//                                          always-drop list below)
const SECONDARY_FIRST_NAMES = new Set(['mariah', 'isaac']);

// Tokens to drop wherever they appear — non-distinguishing abbreviations.
const ALWAYS_DROP = new Set(['wm']);

function nameSlug(raw: string): string {
  // Lowercase up front; we operate purely on lower-case tokens after this.
  let s = raw.toLowerCase();

  // Strip parentheses but keep their contents — replace each bracket with a
  // space so adjacent words don't fuse together.
  s = s.replace(/[()]/g, ' ');

  // Split on "/" first so we can apply different rules to each side.
  const parts = s.split('/').map((p) => p.trim());

  const cleanedParts = parts.map((part, idx) => {
    const tokens = tokenize(part);
    return tokens
      .filter((tok) => !ALWAYS_DROP.has(tok))
      .filter((tok) => !(idx > 0 && SECONDARY_FIRST_NAMES.has(tok)))
      .join('-');
  });

  return cleanedParts.filter((p) => p.length > 0).join('-');
}

/** Split a string into lowercase alphanumeric tokens, dropping all punctuation. */
function tokenize(s: string): string[] {
  return s
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((tok) => tok.length > 0);
}
