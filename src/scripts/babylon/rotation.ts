import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';

const STEP = Math.PI / 2;
const DURATION_MS = 400;

/**
 * Arrow-key camera rotation in 90° increments with ease-in-out sine.
 * Guards against mid-animation re-trigger.
 */
export function wireRotation(camera: ArcRotateCamera): void {
  let animating = false;
  function rotate(delta: number): void {
    if (animating) return;
    animating = true;
    const from = camera.alpha;
    const to = from + delta;
    const start = performance.now();
    function step(now: number): void {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
      camera.alpha = from + (to - from) * ease;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        camera.alpha = to;
        animating = false;
      }
    }
    requestAnimationFrame(step);
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') rotate(-STEP);
    else if (e.key === 'ArrowLeft') rotate(STEP);
  });
}
