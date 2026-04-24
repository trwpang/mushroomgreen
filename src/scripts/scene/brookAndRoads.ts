import Phaser from 'phaser';
import { latLngToIso } from './projection';

export type LatLng = [number, number];

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

export function createBrookShimmer(
  scene: Phaser.Scene,
  brook: LatLng[],
  depth: number,
): (time: number) => void {
  const pts = projectPolyline(brook);
  const g = scene.add.graphics().setDepth(depth);

  if (pts.length < 2) {
    return (time: number) => {
      void time;
      g.clear();
    };
  }

  const cumulativeLengths: number[] = [0];
  let totalLength = 0;
  for (let i = 1; i < pts.length; i++) {
    const from = pts[i - 1];
    const to = pts[i];
    totalLength += Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    cumulativeLengths.push(totalLength);
  }

  if (totalLength <= 0) {
    return (time: number) => {
      void time;
      g.clear();
    };
  }

  const pointAt = (t: number): { x: number; y: number } => {
    const targetLength = Phaser.Math.Clamp(t, 0, 1) * totalLength;
    let segmentIndex = 1;
    while (
      segmentIndex < cumulativeLengths.length - 1
      && cumulativeLengths[segmentIndex] < targetLength
    ) {
      segmentIndex++;
    }

    const from = pts[segmentIndex - 1];
    const to = pts[segmentIndex];
    const segmentStart = cumulativeLengths[segmentIndex - 1];
    const segmentEnd = cumulativeLengths[segmentIndex];
    const segmentLength = segmentEnd - segmentStart;
    const segmentT = segmentLength === 0
      ? 0
      : (targetLength - segmentStart) / segmentLength;

    return {
      x: Phaser.Math.Linear(from.x, to.x, segmentT),
      y: Phaser.Math.Linear(from.y, to.y, segmentT),
    };
  };

  const shimmers = [
    { speed: 0.00012, phase: 0,   len: 0.10, alpha: 0.55 },
    { speed: 0.00015, phase: 0.5, len: 0.07, alpha: 0.45 },
  ];

  return (time: number) => {
    g.clear();
    for (const shimmer of shimmers) {
      const startT = (time * shimmer.speed + shimmer.phase) % (1 - shimmer.len);
      g.lineStyle(3, 0xffffff, shimmer.alpha);
      g.beginPath();
      for (let i = 0; i <= 20; i++) {
        const p = pointAt(startT + shimmer.len * (i / 20));
        if (i === 0) {
          g.moveTo(p.x, p.y);
        } else {
          g.lineTo(p.x, p.y);
        }
      }
      g.strokePath();
    }
  };
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
