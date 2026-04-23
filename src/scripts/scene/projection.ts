// Hamlet centre (mean of household positions; matches spike-isometric).
export const HAMLET_CENTRE: [number, number] = [52.4757932163071, -2.0936364426410514];

const M_PER_DEG_LAT = 111320;

// Flat-earth metre conversion with cos(lat) correction. Valid to <0.5% over
// the ~300x250m hamlet, per spec.
export function latLngToMetres(lat: number, lng: number): { xM: number; yM: number } {
  const [cLat, cLng] = HAMLET_CENTRE;
  const xM = (lng - cLng) * M_PER_DEG_LAT * Math.cos(cLat * Math.PI / 180);
  const yM = (lat - cLat) * M_PER_DEG_LAT;
  return { xM, yM: -yM };  // flip so north-in-metres becomes up in world; iso flips it again
}

// Classic 2:1 iso projection: 30° tilt. k is pixels-per-metre.
export function metresToIso(xM: number, yM: number, k = 10): { x: number; y: number } {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  return {
    x: (xM - yM) * cos30 * k,
    y: (xM + yM) * sin30 * k,
  };
}

// Convenience: full pipeline.
export function latLngToIso(lat: number, lng: number, k = 10): { x: number; y: number } {
  const { xM, yM } = latLngToMetres(lat, lng);
  return metresToIso(xM, yM, k);
}

// Depth key for painter's-algorithm sort. Higher = drawn LATER (on top).
export function isoDepth(lat: number, lng: number, k = 10): number {
  return latLngToIso(lat, lng, k).y;
}

// Compute iso bounding box for an array of [lat,lng] points.
export function isoBounds(points: [number, number][], k = 10): {
  minX: number; maxX: number; minY: number; maxY: number;
} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lat, lng] of points) {
    const { x, y } = latLngToIso(lat, lng, k);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

// Manual sanity check — run with: npx tsx src/scripts/scene/projection.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('centre:', latLngToIso(HAMLET_CENTRE[0], HAMLET_CENTRE[1]));
  const M = 111320;
  const lngOffset = 10 / (M * Math.cos(HAMLET_CENTRE[0] * Math.PI / 180));
  console.log('east 10m ~:', latLngToIso(HAMLET_CENTRE[0], HAMLET_CENTRE[1] + lngOffset));
}
