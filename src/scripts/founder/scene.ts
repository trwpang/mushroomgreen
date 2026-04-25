import Phaser from 'phaser';
import { axialToPixel, neighbours } from './hex.mjs';
import { createRotation, rotateLeft, rotateRight } from './rotation.mjs';
import { detailTier } from './zoom-detail.mjs';

const HEX_SIZE = 64;
const PATCH_RADIUS = 2;

class FounderScene extends Phaser.Scene {
  private rotation = createRotation();
  private hudText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'FounderScene' }); }

  create() {
    const { width, height } = this.scale;

    // Draw the hex patch as outlines so we can see structure.
    const g = this.add.graphics({ lineStyle: { color: 0x6e7e3e, width: 1, alpha: 0.6 } });
    const cells = this.computePatchCells(PATCH_RADIUS);
    for (const cell of cells) {
      const { x, y } = axialToPixel(cell, HEX_SIZE);
      this.drawHex(g, x + width / 2, y + height / 2, HEX_SIZE);
    }

    // HUD (heading + zoom tier).
    this.hudText = this.add.text(16, 16, '', {
      color: '#3a2f1c', fontFamily: 'monospace', fontSize: '14px',
    }).setScrollFactor(0).setDepth(1000);
    this.updateHud();

    // Camera: pan (drag), zoom (wheel).
    const cam = this.cameras.main;
    cam.setBackgroundColor('#dde7d4');
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });
    this.input.on('wheel', (_p: any, _o: any, _dx: number, dy: number) => {
      cam.zoom = Phaser.Math.Clamp(cam.zoom * (dy < 0 ? 1.1 : 0.9), 0.4, 4.0);
      this.updateHud();
    });

    // Rotation: arrow keys.
    const left = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const right = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    left?.on('down', () => { this.rotation = rotateLeft(this.rotation); this.updateHud(); this.events.emit('rotation-changed'); });
    right?.on('down', () => { this.rotation = rotateRight(this.rotation); this.updateHud(); this.events.emit('rotation-changed'); });
  }

  private computePatchCells(radius: number) {
    const cells = [{ q: 0, r: 0 }];
    let frontier = [{ q: 0, r: 0 }];
    for (let i = 0; i < radius; i++) {
      const next: typeof frontier = [];
      for (const c of frontier) {
        for (const n of neighbours(c)) {
          if (!cells.some(x => x.q === n.q && x.r === n.r)) {
            cells.push(n); next.push(n);
          }
        }
      }
      frontier = next;
    }
    return cells;
  }

  private drawHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      pts.push(cx + size * Math.cos(a), cy + size * Math.sin(a));
    }
    g.strokePoints([
      { x: pts[0], y: pts[1] }, { x: pts[2], y: pts[3] }, { x: pts[4], y: pts[5] },
      { x: pts[6], y: pts[7] }, { x: pts[8], y: pts[9] }, { x: pts[10], y: pts[11] },
    ], true);
  }

  private updateHud() {
    const z = this.cameras.main.zoom;
    this.hudText.setText(`heading: ${this.rotation.heading}    zoom: ${z.toFixed(2)} (${detailTier(z)})`);
  }
}

export function createScene() {
  return [FounderScene];
}
