import Phaser from 'phaser';
import { axialToPixel, neighbours } from './hex.mjs';
import { createRotation, rotateLeft, rotateRight } from './rotation.mjs';
import { detailTier } from './zoom-detail.mjs';
import sceneData from '../../data/founder-scene.json';

const HEX_SIZE = 96;
const PATCH_RADIUS = 2;
const SPRITE_BASE = '/sprite-map/generated/founder';

type CellQR = { q: number; r: number };
type Building = {
  id: string;
  spriteKey: string;
  cellQR: CellQR;
};
type Prop = {
  id: string;
  spriteKey: string;
  cellQR: CellQR;
  offset?: [number, number];
};
type SceneJson = {
  buildings: Building[];
  props: Prop[];
  terrain: { default: string; overrides: Record<string, string> };
};

const data = sceneData as unknown as SceneJson;

// Pick the canonical M0 sprites from the variety pack.
// (4-cardinal rotation deferred to M1 — cottage and forge are single-facing for M0.)
const SPRITE_FOR: Record<string, string> = {
  'founder-cottage': 'founder-cottage-1',  // best of the 4 variants
  'adjacent-forge': 'founder-forge-4',     // the one with the visibly lit forge interior
};

class FounderScene extends Phaser.Scene {
  private rotation = createRotation();
  private hudText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'FounderScene' }); }

  preload() {
    // Terrain
    this.load.image('grass', `${SPRITE_BASE}/grass.png`);
    this.load.image('dirt-path', `${SPRITE_BASE}/dirt-path.png`);
    this.load.image('dirt-yard', `${SPRITE_BASE}/dirt-yard.png`);
    this.load.image('pasture', `${SPRITE_BASE}/grass.png`); // fallback to grass for now

    // Buildings (single facing each for M0)
    this.load.image('founder-cottage-1', `${SPRITE_BASE}/founder-cottage-1.png`);
    this.load.image('founder-forge-4', `${SPRITE_BASE}/founder-forge-4.png`);

    // Smoke animation frames
    for (let i = 1; i <= 6; i++) {
      this.load.image(`forge-smoke-frame-${i}`, `${SPRITE_BASE}/forge-smoke-frame-${i}.png`);
    }

    // Props
    this.load.image('cat', `${SPRITE_BASE}/cat.png`);
    this.load.image('barrel', `${SPRITE_BASE}/barrel.png`);
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor('#dde7d4');

    // Build a map of cells in the patch (radius 2 around the founder cell, which sits at (0,-1))
    // We render the patch centred on the founder cell so it appears centred on screen.
    const founder = data.buildings.find(b => b.id === 'founder')!;
    const originPx = axialToPixel(founder.cellQR, HEX_SIZE);

    const cells = this.computePatchCells(PATCH_RADIUS, founder.cellQR);

    // 1) Terrain hex floor
    for (const cell of cells) {
      const { x, y } = axialToPixel(cell, HEX_SIZE);
      const key = `${cell.q},${cell.r}`;
      const terrain = data.terrain.overrides[key] ?? data.terrain.default;
      this.add.image(cx + (x - originPx.x), cy + (y - originPx.y), terrain).setOrigin(0.5, 0.5);
    }

    // Helper to convert a building/prop's cell + offset into screen pixels.
    const cellToScreen = (cellQR: CellQR, offset: [number, number] = [0, 0]) => {
      const px = axialToPixel(cellQR, HEX_SIZE);
      return {
        x: cx + (px.x - originPx.x) + offset[0] * HEX_SIZE,
        y: cy + (px.y - originPx.y) + offset[1] * HEX_SIZE,
      };
    };

    // 2) Buildings — depth-sort by world-y (lower y renders first, behind)
    type Drawable = { y: number; draw: () => void };
    const drawables: Drawable[] = [];

    for (const b of data.buildings) {
      const key = SPRITE_FOR[b.spriteKey] ?? b.spriteKey;
      const pos = cellToScreen(b.cellQR);
      drawables.push({
        y: pos.y,
        draw: () => { this.add.image(pos.x, pos.y, key).setOrigin(0.5, 0.92); },
      });
    }

    // 3) Props (cat, barrel) — orientation-agnostic, anchored at base
    for (const p of data.props) {
      const pos = cellToScreen(p.cellQR, p.offset ?? [0, 0]);
      drawables.push({
        y: pos.y,
        draw: () => { this.add.image(pos.x, pos.y, p.spriteKey).setOrigin(0.5, 0.92); },
      });
    }

    // Sort + draw in world-y order so northern things sit behind southern things.
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    // 4) Forge smoke — animated, drawn ABOVE everything
    this.anims.create({
      key: 'forge-smoke',
      frames: Array.from({ length: 6 }, (_, i) => ({ key: `forge-smoke-frame-${i + 1}` })),
      frameRate: 4,
      repeat: -1,
    });
    const forge = data.buildings.find(b => b.id === 'adjacent-forge')!;
    const forgePos = cellToScreen(forge.cellQR);
    this.add.sprite(forgePos.x + 8, forgePos.y - HEX_SIZE * 1.6, 'forge-smoke-frame-1')
      .setOrigin(0.5, 1.0)
      .play('forge-smoke')
      .setDepth(1000);

    // 5) HUD — heading + zoom tier
    this.hudText = this.add.text(16, 16, '', {
      color: '#3a2f1c', fontFamily: 'monospace', fontSize: '14px',
      backgroundColor: 'rgba(245, 240, 220, 0.7)', padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(2000);
    this.updateHud();

    // 6) Camera: pan (drag), zoom (wheel)
    const cam = this.cameras.main;
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

    // 7) Rotation arrow keys (state machine wired; sprite swap deferred to M1)
    const left = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const right = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    left?.on('down', () => { this.rotation = rotateLeft(this.rotation); this.updateHud(); });
    right?.on('down', () => { this.rotation = rotateRight(this.rotation); this.updateHud(); });
  }

  private computePatchCells(radius: number, origin: CellQR): CellQR[] {
    const cells: CellQR[] = [{ ...origin }];
    let frontier: CellQR[] = [{ ...origin }];
    for (let i = 0; i < radius; i++) {
      const next: CellQR[] = [];
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

  private updateHud() {
    const z = this.cameras.main.zoom;
    this.hudText.setText(
      `Mushroom Green · Henry Weaver, 1865\nzoom ${z.toFixed(2)}× (${detailTier(z)})    heading ${this.rotation.heading} (rotation lands at M1)`
    );
  }
}

export function createScene() {
  return [FounderScene];
}
