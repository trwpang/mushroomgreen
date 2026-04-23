import Phaser from 'phaser';
import { latLngToIso } from './projection';

export const SPRITES: Record<string, { url: string; anchorY: number }> = {
  'cottage-small':   { url: '/spike-sprites/05-cottage-small-v2-nb2pro-keyed.png',  anchorY: 0.92 },
  'cottage-master':  { url: '/spike-sprites/01-cottage-master-v3-nb2pro-keyed.png', anchorY: 0.92 },
  'cottage-terrace': { url: '/spike-sprites/10-cottage-terrace-v1-nb2pro-keyed.png', anchorY: 0.92 },
  'cottage-lshape':  { url: '/spike-sprites/11-cottage-lshape-v1-nb2pro-keyed.png',  anchorY: 0.92 },
  'cottage-large':   { url: '/spike-sprites/06-cottage-large-v1-keyed.png',         anchorY: 0.92 },
  'forge':           { url: '/spike-sprites/02-forge-v3-nb2pro-keyed.png',          anchorY: 0.92 },
  'willow':          { url: '/spike-sprites/03-willows-v1-keyed.png',               anchorY: 0.90 },
  'bridge':          { url: '/spike-sprites/12-bridge-v1-keyed.png',                anchorY: 0.85 },
};

// Copy the 17 WILLOW_CANDIDATES positions verbatim from spike-isometric.astro
export const WILLOW_POSITIONS: [number, number][] = [
  [52.4780, -2.0958], [52.4775, -2.0957], [52.4771, -2.0958],
  [52.4766, -2.0955], [52.4761, -2.0952], [52.4756, -2.0948],
  [52.4751, -2.0945], [52.4770, -2.0947], [52.4764, -2.0943],
  [52.4758, -2.0938], [52.4754, -2.0933], [52.4763, -2.0928],
  [52.4768, -2.0935], [52.4759, -2.0922], [52.4767, -2.0920],
  [52.4750, -2.0930], [52.4747, -2.0938],
];

// Brook point closest to a road in the OSM data (they're 41m apart at
// their nearest — there's no true intersection). Lands the bridge visually
// on the water where a road comes nearest. Tuned by walking the
// brook.json × roads.json cross-product offline.
export const BRIDGE_POSITION: [number, number] = [52.4764272, -2.095408];

export function preloadSprites(scene: Phaser.Scene): void {
  for (const [key, s] of Object.entries(SPRITES)) {
    scene.load.image(`spr-${key}`, s.url);
  }
}

export interface Placement {
  key: string;
  lat: number;
  lng: number;
  scale: number;
  clusterId?: number;
}

export interface PlacementResult {
  all: Placement[];
  clusters: Placement[];
  forges: Placement[];
}

export function buildPlacements(
  clusters: Array<{ id: number; centroid: [number, number]; spriteKey: string }>,
): PlacementResult {
  const clusterItems: Placement[] = clusters.map((c) => ({
    key: c.spriteKey,
    lat: c.centroid[0],
    lng: c.centroid[1],
    scale: 0.35, // first guess; may need adjustment after visual review
    clusterId: c.id,
  }));
  const forges = clusterItems.filter((p) => p.key === 'forge');
  const bridge: Placement = {
    key: 'bridge', lat: BRIDGE_POSITION[0], lng: BRIDGE_POSITION[1], scale: 0.3,
  };
  const willows: Placement[] = WILLOW_POSITIONS.map(([lat, lng]) => ({
    key: 'willow', lat, lng, scale: 0.28,
  }));
  const all = [...clusterItems, bridge, ...willows];
  return { all, clusters: clusterItems, forges };
}

export function placeSprites(
  scene: Phaser.Scene,
  placements: Placement[],
): Map<number, Phaser.GameObjects.Image> {
  const clusterSpriteMap = new Map<number, Phaser.GameObjects.Image>();
  // Sort ascending by iso-Y so southern sprites sit on top of northern ones
  const sorted = placements
    .map((p) => ({ ...p, iso: latLngToIso(p.lat, p.lng) }))
    .sort((a, b) => a.iso.y - b.iso.y);
  for (const p of sorted) {
    const meta = SPRITES[p.key];
    if (!meta) continue;
    const sprite = scene.add.image(p.iso.x, p.iso.y, `spr-${p.key}`);
    sprite.setOrigin(0.5, meta.anchorY);
    sprite.setScale(p.scale);
    sprite.setDepth(p.iso.y);
    sprite.setData('key', p.key);
    sprite.setData('lat', p.lat);
    sprite.setData('lng', p.lng);
    if (p.clusterId !== undefined) {
      clusterSpriteMap.set(p.clusterId, sprite);
    }
  }
  return clusterSpriteMap;
}
