// Zoom-tier mapping for the founder vignette. The "more you zoom, more you see" lodestar.

const MID_THRESHOLD = 1.25;
const CLOSE_THRESHOLD = 2.25;

export function detailTier(zoom) {
  if (zoom >= CLOSE_THRESHOLD) return 'close';
  if (zoom >= MID_THRESHOLD) return 'mid';
  return 'overview';
}

export function resolveDetailKey(baseKey, tier) {
  if (tier === 'close') return `${baseKey}-close`;
  return baseKey;
}
