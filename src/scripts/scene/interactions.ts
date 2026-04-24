import Phaser from 'phaser';

export interface HouseholdLookup {
  [num: string]: { id: string; name: string };
}

export interface Cluster {
  id: number;
  members: number[];
  centroid: [number, number];
  spriteKey: string;
}

export function wireInteractions(
  scene: Phaser.Scene,
  spritesByClusterId: Map<number, Phaser.GameObjects.Image>,
  clusters: Cluster[],
  byNumber: HouseholdLookup,
): void {
  void scene;

  const tooltip = document.getElementById('phaser-tooltip');
  const popup = document.getElementById('phaser-popup');
  if (!tooltip || !popup) return;

  for (const c of clusters) {
    const sprite = spritesByClusterId.get(c.id);
    if (!sprite) continue;
    sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });

    sprite.on('pointerover', (p: Phaser.Input.Pointer) => {
      sprite.setTint(0xfff2cc);
      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
      c.members.forEach((n, i) => {
        if (i > 0) tooltip.appendChild(document.createElement('br'));
        const span = document.createElement('span');
        span.textContent = byNumber[String(n)]?.name ?? `Household ${n}`;
        tooltip.appendChild(span);
      });
      tooltip.hidden = false;
      tooltip.style.left = `${p.event.clientX + 14}px`;
      tooltip.style.top = `${p.event.clientY + 14}px`;
    });

    sprite.on('pointermove', (p: Phaser.Input.Pointer) => {
      tooltip.style.left = `${p.event.clientX + 14}px`;
      tooltip.style.top = `${p.event.clientY + 14}px`;
    });

    sprite.on('pointerout', () => {
      sprite.clearTint();
      tooltip.hidden = true;
    });

    sprite.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown() || p.middleButtonDown()) return;
      if (c.members.length === 1) {
        const entry = byNumber[String(c.members[0])];
        if (entry) window.location.href = `/households/${entry.id}/`;
      } else {
        showPopup(popup, c, byNumber, p.event.clientX, p.event.clientY);
      }
    });
  }

  document.addEventListener('mousedown', (e) => {
    if (popup.hidden) return;
    if (e.target instanceof Node && !popup.contains(e.target)) {
      popup.hidden = true;
    }
  }, true);
}

function showPopup(
  popup: HTMLElement,
  cluster: Cluster,
  byNumber: HouseholdLookup,
  clientX: number,
  clientY: number,
): void {
  while (popup.firstChild) popup.removeChild(popup.firstChild);

  const heading = document.createElement('div');
  heading.textContent = `${cluster.members.length} households at this cluster`;
  heading.style.cssText = 'margin-bottom: 8px; font-weight: 600; font-size: 0.95em;';
  popup.appendChild(heading);

  const ul = document.createElement('ul');
  for (const n of cluster.members) {
    const entry = byNumber[String(n)];
    const li = document.createElement('li');
    if (entry) {
      const a = document.createElement('a');
      a.href = `/households/${entry.id}/`;
      a.textContent = entry.name;
      li.appendChild(a);
    } else {
      li.textContent = `Household ${n}`;
    }
    ul.appendChild(li);
  }
  popup.appendChild(ul);

  const hint = document.createElement('div');
  hint.className = 'dismiss-hint';
  hint.textContent = 'Click outside to dismiss';
  popup.appendChild(hint);

  popup.hidden = false;
  popup.style.left = `${Math.min(clientX, window.innerWidth - 260)}px`;
  popup.style.top = `${Math.min(clientY, window.innerHeight - 260)}px`;
}
