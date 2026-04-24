import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { CottageMetadata } from './building';

export interface HouseholdLookup {
  [number: number]: { name: string; family: string; id: string };
}

/**
 * Hover + click interactions for cottages. Wires Babylon's pointer
 * observers, ray-picks the cottage meshes via shared CottageMetadata,
 * tints on hover, shows a DOM tooltip built only via
 * createElement/textContent (innerHTML is blocked by the project's
 * security hook), routes clicks to /households/<id>/.
 */
export function wireInteractions(scene: Scene, byNumber: HouseholdLookup): void {
  const tooltipEl = document.getElementById('babylon-tooltip') as HTMLDivElement | null;
  // Tooltip element is added by the .astro page in Task 15 plan step 3;
  // if missing, fall back gracefully so we don't crash the whole scene.
  const hasTooltip = !!tooltipEl;

  let hoveredMesh: AbstractMesh | null = null;
  let hoveredPrev: Color3 | null = null;

  function clearHover(): void {
    if (hoveredMesh && hoveredPrev) {
      const mat = hoveredMesh.material as StandardMaterial | null;
      if (mat && mat.diffuseColor) mat.diffuseColor = hoveredPrev;
    }
    hoveredMesh = null;
    hoveredPrev = null;
    if (hasTooltip && tooltipEl) tooltipEl.classList.remove('visible');
  }

  scene.onPointerMove = (event, pickInfo) => {
    const hit = pickInfo?.hit ? pickInfo.pickedMesh : null;
    const meta = hit ? ((hit as unknown as { metadata?: unknown }).metadata as CottageMetadata | undefined) : undefined;
    if (!meta || typeof meta.clusterId !== 'number' || !hit) {
      clearHover();
      return;
    }
    if (hoveredMesh === hit) {
      if (hasTooltip && tooltipEl) {
        tooltipEl.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;
      }
      return;
    }
    clearHover();
    hoveredMesh = hit;
    const mat = hit.material as StandardMaterial | null;
    if (mat && mat.diffuseColor) {
      hoveredPrev = mat.diffuseColor.clone();
      mat.diffuseColor = mat.diffuseColor.add(new Color3(0.15, 0.1, 0));
    }
    if (hasTooltip && tooltipEl) {
      while (tooltipEl.firstChild) tooltipEl.removeChild(tooltipEl.firstChild);
      const title = document.createElement('strong');
      title.textContent = meta.primaryFamily;
      const count = document.createElement('div');
      count.textContent = `${meta.memberCount} household${meta.memberCount === 1 ? '' : 's'}`;
      tooltipEl.appendChild(title);
      tooltipEl.appendChild(count);
      tooltipEl.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;
      tooltipEl.classList.add('visible');
    }
  };

  scene.onPointerDown = (_event, pickInfo) => {
    const hit = pickInfo?.hit ? pickInfo.pickedMesh : null;
    const meta = hit ? ((hit as unknown as { metadata?: unknown }).metadata as CottageMetadata | undefined) : undefined;
    if (!meta || typeof meta.clusterId !== 'number') return;
    const firstMember = meta.members[0];
    const entry = byNumber[firstMember];
    if (!entry) {
      console.warn(`babylon-spike click: no lookup for household ${firstMember}`);
      return;
    }
    window.location.href = `/households/${entry.id}/`;
  };
}
