// Flat-top axial hex math, odd-q offset (matches src/data/cluster-tile-placements.json convention).

const SQRT3 = Math.sqrt(3);

export function axialToPixel({ q, r }, size) {
  const x = size * (3 / 2) * q;
  const y = size * SQRT3 * (r + q / 2);
  return { x, y };
}

export function pixelToAxial({ x, y }, size) {
  const q = (2 / 3) * x / size;
  const r = (-1 / 3) * x / size + (SQRT3 / 3) * y / size;
  return roundAxial({ q, r });
}

function roundAxial({ q, r }) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function neighbours({ q, r }) {
  return [
    { q: q + 1, r }, { q: q - 1, r },
    { q, r: r + 1 }, { q, r: r - 1 },
    { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
  ];
}

export function oddQNeighbours({ q, r }) {
  const odd = (q & 1) !== 0;
  return [
    { q: q + 1, r: r + (odd ? 1 : 0) },
    { q: q + 1, r: r + (odd ? 0 : -1) },
    { q, r: r - 1 },
    { q: q - 1, r: r + (odd ? 1 : 0) },
    { q: q - 1, r: r + (odd ? 0 : -1) },
    { q, r: r + 1 },
  ];
}

export function oddQToPlane({ q, r }, radiusM) {
  return {
    xM: q * radiusM * 1.5,
    yM: (r + ((q & 1) !== 0 ? 0.5 : 0)) * SQRT3 * radiusM,
  };
}

export function planeHexCorners({ xM, yM }, radiusM) {
  return [0, 60, 120, 180, 240, 300].map((degrees) => {
    const angle = degrees * Math.PI / 180;
    return {
      xM: xM + Math.cos(angle) * radiusM,
      yM: yM + Math.sin(angle) * radiusM,
    };
  });
}
