export const HAMLET_CENTRE: [number, number] = [52.4757932163071, -2.0936364426410514];
const M_PER_DEG_LAT = 111320;

export function latLngToMetres(lat: number, lng: number): { xM: number; yM: number } {
  const [cLat, cLng] = HAMLET_CENTRE;
  const cosLat = Math.cos((cLat * Math.PI) / 180);
  const xM = (lng - cLng) * M_PER_DEG_LAT * cosLat;
  const yM = -(lat - cLat) * M_PER_DEG_LAT;
  return { xM, yM };
}

// Scene scale: 1 metre == SCENE_SCALE units. Tuned so the hamlet fits the
// default ortho extent in Task 2 (halfExtent=6 covers ≈ ±60 m at scale 0.1).
export const SCENE_SCALE = 0.1;

export function latLngToScene(lat: number, lng: number): { x: number; z: number } {
  const { xM, yM } = latLngToMetres(lat, lng);
  return { x: xM * SCENE_SCALE, z: yM * SCENE_SCALE };
}
