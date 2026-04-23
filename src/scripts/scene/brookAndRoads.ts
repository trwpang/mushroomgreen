import Phaser from 'phaser';
import { latLngToIso } from './projection';

type LatLng = [number, number];

function projectPolyline(line: LatLng[]): { x: number; y: number }[] {
  return line.map(([lat, lng]) => latLngToIso(lat, lng));
}

export function drawBrook(scene: Phaser.Scene, brook: LatLng[], depth: number) {
  if (brook.length < 2) return;
  const pts = projectPolyline(brook);
  const layers = [
    { color: 0x8fb06a, width: 36,  alpha: 0.60 },
    { color: 0xa9c480, width: 22,  alpha: 0.65 },
    { color: 0x4a90d9, width: 12,  alpha: 0.70 },
    { color: 0x3d7cbd, width: 6.5, alpha: 0.92 },
    { color: 0xc8eaf8, width: 2.4, alpha: 0.95 },
  ];
  for (const { color, width, alpha } of layers) {
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    g.setDepth(depth);
  }
}

export function drawRoads(
  scene: Phaser.Scene,
  roads: { polyline: LatLng[] }[],
  depth: number,
) {
  const strokes = [
    { color: 0x7a6040, width: 9,   alpha: 0.55 },
    { color: 0xb5884c, width: 6,   alpha: 0.85 },
    { color: 0xe8d69a, width: 2.5, alpha: 0.9  },
  ];
  for (const r of roads) {
    if (!r.polyline || r.polyline.length < 2) continue;
    const pts = projectPolyline(r.polyline);
    for (const s of strokes) {
      const g = scene.add.graphics({ x: 0, y: 0 });
      g.lineStyle(s.width, s.color, s.alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
      g.setDepth(depth);
    }
  }
}
