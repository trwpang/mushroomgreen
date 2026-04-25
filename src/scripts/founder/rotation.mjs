// Cardinal rotation state machine + sprite-key resolver for the founder vignette.

export const headings = ['NE', 'SE', 'SW', 'NW'];

export function createRotation() {
  return { heading: 'NE' };
}

export function rotateRight(state) {
  const i = headings.indexOf(state.heading);
  return { heading: headings[(i + 1) % headings.length] };
}

export function rotateLeft(state) {
  const i = headings.indexOf(state.heading);
  return { heading: headings[(i + headings.length - 1) % headings.length] };
}

export function resolveFacing(spriteKey, heading, opts = {}) {
  if (opts.orientationAgnostic) return spriteKey;
  return `${spriteKey}-${heading}`;
}
