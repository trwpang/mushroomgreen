import Phaser from 'phaser';
import { oddQNeighbours, oddQToPlane, planeHexCorners } from './hex.mjs';
import { createRotation, rotateLeft, rotateRight } from './rotation.mjs';
import { detailTier } from './zoom-detail.mjs';
import { metresToIso } from '../scene/projection';
import sceneData from '../../data/founder-scene.json';

const PATCH_RADIUS = 2;
const SPRITE_BASE = '/sprite-map/generated/founder';
const HEX_RADIUS_M = 13;
const ISO_PIXELS_PER_M = 10;

// Scales tuned against the projected ground plane, not the top-down terrain PNGs.
const BUILDING_SCALE = 0.48;
const SMOKE_SCALE    = 0.48;
const CAT_SCALE      = 0.06;
const BARREL_SCALE   = 0.08;
const FORGE_SMOKE_OFFSET = { x: 58, y: -188 };

const TERRAIN_STYLES: Record<string, { fill: number; line: number; texture: number; alpha: number }> = {
  grass: { fill: 0x9db56b, line: 0x758d4f, texture: 0x6e7e3e, alpha: 0.92 },
  pasture: { fill: 0xa7bd77, line: 0x7f9659, texture: 0x73864d, alpha: 0.9 },
  'dirt-path': { fill: 0x9a7548, line: 0x6c4f34, texture: 0xc29a62, alpha: 0.95 },
  'dirt-yard': { fill: 0x6e5238, line: 0x4a3727, texture: 0x2c2218, alpha: 0.96 },
  'cottage-yard': { fill: 0x8b6a42, line: 0x5c4028, texture: 0xc29a62, alpha: 0.95 },
  'forge-yard': { fill: 0x4f3b31, line: 0x2b211b, texture: 0x1f1915, alpha: 0.96 },
  'road-straight': { fill: 0x9a7548, line: 0x6c4f34, texture: 0xc29a62, alpha: 0.95 },
  'road-bend': { fill: 0x9a7548, line: 0x6c4f34, texture: 0xc29a62, alpha: 0.95 },
  'yard-road': { fill: 0x937047, line: 0x62472f, texture: 0xb88f5d, alpha: 0.95 },
};

const TERRAIN_TILE_KEYS = [
  'tile-cottage-yard',
  'tile-forge-yard',
  'tile-pasture',
  'tile-road-straight',
  'tile-road-bend',
  'tile-yard-road',
];

const TERRAIN_TILE_FOR: Record<string, string> = {
  grass: 'tile-pasture',
  pasture: 'tile-pasture',
  'dirt-path': 'tile-road-straight',
  'dirt-yard': 'tile-cottage-yard',
  'cottage-yard': 'tile-cottage-yard',
  'forge-yard': 'tile-forge-yard',
  'road-straight': 'tile-road-straight',
  'road-bend': 'tile-road-bend',
  'yard-road': 'tile-yard-road',
};

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
  stackOrder?: number;
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

    // Projected base tiles normalized to the same iso hex polygon as the vector ground.
    for (const key of TERRAIN_TILE_KEYS) {
      this.load.image(key, `${SPRITE_BASE}/${key}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor('#dde7d4');

    // Build a map of cells in the patch (radius 2 around the founder cell, which sits at (0,-1))
    // We render the patch centred on the founder cell so it appears centred on screen.
    const founder = data.buildings.find(b => b.id === 'founder')!;
    const originPlane = oddQToPlane(founder.cellQR, HEX_RADIUS_M);

    const cells = this.computePatchCells(PATCH_RADIUS, founder.cellQR);

    const projectPlaneToScreen = (xM: number, yM: number) => {
      const iso = metresToIso(xM - originPlane.xM, yM - originPlane.yM, ISO_PIXELS_PER_M);
      return { x: cx + iso.x, y: cy + iso.y };
    };

    // Helper to convert a building/prop's cell + offset into screen pixels. Offsets are
    // tiny ground-plane nudges in hex-radius units, then projected through the same iso transform.
    const cellToScreen = (cellQR: CellQR, offset: [number, number] = [0, 0]) => {
      const plane = oddQToPlane(cellQR, HEX_RADIUS_M);
      return projectPlaneToScreen(
        plane.xM + offset[0] * HEX_RADIUS_M,
        plane.yM + offset[1] * HEX_RADIUS_M,
      );
    };

    // 1) Terrain hex floor — sprite tiles warped onto the same ground plane as the buildings.
    const terrainUnderlay = this.add.graphics().setDepth(-360);
    const terrainOutline = this.add.graphics().setDepth(-240);
    const terrainCells = [...cells].sort((a, b) => cellToScreen(a).y - cellToScreen(b).y);
    for (const cell of terrainCells) {
      this.drawTerrainBase(terrainUnderlay, cell, projectPlaneToScreen);
      const pos = cellToScreen(cell);
      this.add.image(pos.x, pos.y, this.terrainTileKey(cell))
        .setOrigin(0.5, 0.5)
        .setDepth(-330 + pos.y * 0.001);
      this.drawTerrainOutline(terrainOutline, cell, projectPlaneToScreen);
    }

    // 2) Buildings — depth-sort by world-y (lower y renders first, behind)
    type Drawable = { y: number; draw: () => void };
    const drawables: Drawable[] = [];

    for (const b of data.buildings) {
      const key = SPRITE_FOR[b.spriteKey] ?? b.spriteKey;
      const pos = cellToScreen(b.cellQR);
      drawables.push({
        y: pos.y,
        draw: () => {
          this.add.image(pos.x, pos.y, key)
            .setOrigin(0.5, 0.92)
            .setScale(BUILDING_SCALE)
            .setDepth(pos.y);
        },
      });
    }

    // 3) Props (cat, barrel) — orientation-agnostic and stackable on the same tile.
    const PROP_SCALE: Record<string, number> = { cat: CAT_SCALE, barrel: BARREL_SCALE };
    for (const p of data.props) {
      const pos = cellToScreen(p.cellQR, p.offset ?? [0, 0]);
      const scale = PROP_SCALE[p.spriteKey] ?? 0.2;
      const stackOrder = p.stackOrder ?? 0;
      drawables.push({
        y: pos.y + stackOrder * 0.01,
        draw: () => {
          this.add.image(pos.x, pos.y, p.spriteKey)
            .setOrigin(0.5, 0.92)
            .setScale(scale)
            .setDepth(pos.y + 6 + stackOrder);
        },
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
    this.add.sprite(
      forgePos.x + FORGE_SMOKE_OFFSET.x,
      forgePos.y + FORGE_SMOKE_OFFSET.y,
      'forge-smoke-frame-1',
    )
      .setOrigin(0.5, 1.0)
      .setScale(SMOKE_SCALE)
      .setAlpha(0.55)
      .play('forge-smoke')
      .setDepth(forgePos.y + 240);

    // 5) HUD — heading + zoom tier
    this.hudText = this.add.text(16, 16, '', {
      color: '#3a2f1c', fontFamily: 'monospace', fontSize: '14px',
      backgroundColor: 'rgba(245, 240, 220, 0.7)', padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(2000);

    // 6) Camera: pan (drag), zoom (wheel)
    const cam = this.cameras.main;
    cam.setZoom(0.86);
    cam.centerOn(cx, cy + 34);
    this.updateHud();
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
    const rotateLeftOnce = () => { this.rotation = rotateLeft(this.rotation); this.updateHud(); };
    const rotateRightOnce = () => { this.rotation = rotateRight(this.rotation); this.updateHud(); };
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') rotateLeftOnce();
      if (event.key === 'ArrowRight') rotateRightOnce();
    };
    window.addEventListener('keydown', onWindowKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onWindowKeyDown);
    });
  }

  private computePatchCells(radius: number, origin: CellQR): CellQR[] {
    const cells: CellQR[] = [{ ...origin }];
    let frontier: CellQR[] = [{ ...origin }];
    for (let i = 0; i < radius; i++) {
      const next: CellQR[] = [];
      for (const c of frontier) {
        for (const n of oddQNeighbours(c)) {
          if (!cells.some(x => x.q === n.q && x.r === n.r)) {
            cells.push(n); next.push(n);
          }
        }
      }
      frontier = next;
    }
    return cells;
  }

  private terrainKey(cell: CellQR): string {
    const key = `${cell.q},${cell.r}`;
    return data.terrain.overrides[key] ?? data.terrain.default;
  }

  private terrainTileKey(cell: CellQR): string {
    return TERRAIN_TILE_FOR[this.terrainKey(cell)] ?? TERRAIN_TILE_FOR.grass;
  }

  private terrainPoints(
    cell: CellQR,
    projectPlaneToScreen: (xM: number, yM: number) => { x: number; y: number },
  ): Phaser.Math.Vector2[] {
    const center = oddQToPlane(cell, HEX_RADIUS_M);
    return planeHexCorners(center, HEX_RADIUS_M).map((point) => {
      const screen = projectPlaneToScreen(point.xM, point.yM);
      return new Phaser.Math.Vector2(screen.x, screen.y);
    });
  }

  private drawTerrainBase(
    graphics: Phaser.GameObjects.Graphics,
    cell: CellQR,
    projectPlaneToScreen: (xM: number, yM: number) => { x: number; y: number },
  ) {
    const terrain = this.terrainKey(cell);
    const style = TERRAIN_STYLES[terrain] ?? TERRAIN_STYLES.grass;
    const points = this.terrainPoints(cell, projectPlaneToScreen);

    graphics.fillStyle(style.fill, style.alpha);
    graphics.fillPoints(points, true);
  }

  private drawTerrainOutline(
    graphics: Phaser.GameObjects.Graphics,
    cell: CellQR,
    projectPlaneToScreen: (xM: number, yM: number) => { x: number; y: number },
  ) {
    const terrain = this.terrainKey(cell);
    const style = TERRAIN_STYLES[terrain] ?? TERRAIN_STYLES.grass;
    const points = this.terrainPoints(cell, projectPlaneToScreen);
    const alpha = terrain === 'grass' || terrain === 'pasture' ? 0.16 : 0.24;

    graphics.lineStyle(1, style.line, alpha);
    graphics.strokePoints(points, true, true);
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
