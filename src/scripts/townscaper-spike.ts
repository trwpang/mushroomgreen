import Phaser from 'phaser';
import { isoBounds, latLngToIso } from './scene/projection';

type LatLng = [number, number];

interface Cluster {
  id: number;
  centroid: LatLng;
  members: number[];
  primaryFamily: string;
  spriteKey: string;
  hasForge: boolean;
}

interface SceneData {
  clusters: Cluster[];
  boundary: LatLng[];
  brook: LatLng[];
  roads: { name?: string; polyline: LatLng[] }[];
  byNumber: Record<string, { id: string; name: string }>;
}

type Point = { x: number; y: number };

const STAGE_ID = 'townscaper-stage';
const TILE_W = 42;
const TILE_H = 24;
const WALL_H = 34;

const FAMILY_PALETTES: Record<string, { wall: number; trim: number; roof: number }> = {
  Weaver: { wall: 0xf2d47b, trim: 0xfff0b8, roof: 0xbc5c3f },
  Billingham: { wall: 0xd8e4aa, trim: 0xf7f4cd, roof: 0x7c8e64 },
  Homer: { wall: 0xf0b38e, trim: 0xffdfc8, roof: 0x9b513d },
  Hancox: { wall: 0xbed7d3, trim: 0xe3f1e9, roof: 0x4f7d83 },
  Dimmock: { wall: 0xefd091, trim: 0xffedc0, roof: 0x86684a },
  Kendrick: { wall: 0xd3b2dc, trim: 0xf0d9f0, roof: 0x6f4a73 },
  Founder: { wall: 0xf6c97e, trim: 0xfff0b8, roof: 0xb85a37 },
  Other: { wall: 0xe8cfa0, trim: 0xffefd0, roof: 0x8c6d4b },
};

const EMPTY_DATA: SceneData = {
  clusters: [],
  boundary: [],
  brook: [],
  roads: [],
  byNumber: {},
};

function readSceneData(): SceneData {
  const el = document.getElementById('townscaper-data');
  if (!el?.textContent) return EMPTY_DATA;
  return JSON.parse(el.textContent) as SceneData;
}

function shade(color: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (color & 255) + amount));
  return (r << 16) | (g << 8) | b;
}

function rand(seed: number): () => number {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toPoints(points: LatLng[]): Phaser.Math.Vector2[] {
  return points.map(([lat, lng]) => {
    const p = latLngToIso(lat, lng);
    return new Phaser.Math.Vector2(p.x, p.y);
  });
}

function drawPolyline(
  graphics: Phaser.GameObjects.Graphics,
  points: LatLng[],
  color: number,
  alpha: number,
  width: number,
): void {
  if (points.length < 2) return;
  graphics.lineStyle(width, color, alpha);
  const first = latLngToIso(points[0][0], points[0][1]);
  graphics.beginPath();
  graphics.moveTo(first.x, first.y);
  for (const [lat, lng] of points.slice(1)) {
    const p = latLngToIso(lat, lng);
    graphics.lineTo(p.x, p.y);
  }
  graphics.strokePath();
}

function isoLocal(tx: number, ty: number, z = 0): Point {
  return {
    x: (tx - ty) * TILE_W / 2,
    y: (tx + ty) * TILE_H / 2 - z * WALL_H,
  };
}

function polygon(
  graphics: Phaser.GameObjects.Graphics,
  points: Point[],
  fill: number,
  alpha = 1,
  stroke = 0x6f563e,
  strokeAlpha = 0.28,
): void {
  graphics.fillStyle(fill, alpha);
  graphics.lineStyle(1.4, stroke, strokeAlpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) graphics.lineTo(p.x, p.y);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
}

function drawBlock(
  graphics: Phaser.GameObjects.Graphics,
  tx: number,
  ty: number,
  w: number,
  d: number,
  h: number,
  palette: { wall: number; trim: number; roof: number },
): void {
  const a = isoLocal(tx, ty, 0);
  const b = isoLocal(tx + w, ty, 0);
  const c = isoLocal(tx + w, ty + d, 0);
  const dpt = isoLocal(tx, ty + d, 0);
  const at = isoLocal(tx, ty, h);
  const bt = isoLocal(tx + w, ty, h);
  const ct = isoLocal(tx + w, ty + d, h);
  const dt = isoLocal(tx, ty + d, h);

  polygon(graphics, [b, c, ct, bt], shade(palette.wall, -42), 1, 0x5a432f, 0.24);
  polygon(graphics, [a, dpt, dt, at], shade(palette.wall, -18), 1, 0x5a432f, 0.22);
  polygon(graphics, [at, bt, ct, dt], palette.wall, 1, 0x5a432f, 0.32);

  const roofLift = 0.45;
  const ridge1 = isoLocal(tx + w * 0.5, ty + d * 0.04, h + roofLift);
  const ridge2 = isoLocal(tx + w * 0.5, ty + d * 0.96, h + roofLift);
  polygon(graphics, [at, bt, ridge1], shade(palette.roof, 14), 1, 0x50352b, 0.26);
  polygon(graphics, [dt, ct, ridge2], shade(palette.roof, -14), 1, 0x50352b, 0.26);
  polygon(graphics, [at, dt, ridge2, ridge1], palette.roof, 1, 0x50352b, 0.24);
  polygon(graphics, [bt, ct, ridge2, ridge1], shade(palette.roof, -28), 1, 0x50352b, 0.22);

  const doorBase = isoLocal(tx + w, ty + d * 0.5, 0.05);
  const doorTop = isoLocal(tx + w, ty + d * 0.5, 0.62);
  graphics.lineStyle(5, 0x5b3b26, 0.75);
  graphics.lineBetween(doorBase.x - 1, doorBase.y - 2, doorTop.x - 1, doorTop.y - 1);

  graphics.fillStyle(palette.trim, 0.72);
  const winA = isoLocal(tx + w, ty + d * 0.22, 0.72);
  const winB = isoLocal(tx, ty + d * 0.68, 0.76);
  graphics.fillRoundedRect(winA.x - 3, winA.y - 3, 7, 5, 1);
  graphics.fillRoundedRect(winB.x - 3, winB.y - 3, 7, 5, 1);
}

function drawTower(
  graphics: Phaser.GameObjects.Graphics,
  tx: number,
  ty: number,
  palette: { wall: number; trim: number; roof: number },
): void {
  drawBlock(graphics, tx, ty, 1, 1, 1.9, {
    ...palette,
    wall: shade(palette.wall, 10),
    roof: 0x3d2f28,
  });
  const top = isoLocal(tx + 0.5, ty + 0.5, 2.42);
  graphics.fillStyle(0x34251d, 0.62);
  graphics.fillEllipse(top.x, top.y + 2, 12, 6);
}

function drawCluster(scene: Phaser.Scene, cluster: Cluster): Phaser.GameObjects.Container {
  const p = latLngToIso(cluster.centroid[0], cluster.centroid[1]);
  const palette = FAMILY_PALETTES[cluster.primaryFamily] ?? FAMILY_PALETTES.Other;
  const container = scene.add.container(p.x, p.y);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x4a4a2c, 0.17);
  shadow.fillEllipse(0, 28, Math.min(190, 60 + cluster.members.length * 14), 34);
  container.add(shadow);

  const g = scene.add.graphics();
  const random = rand(cluster.id * 4001 + cluster.members.length * 97);
  const count = Math.min(9, Math.max(3, cluster.members.length));
  const slots = [
    [-1.2, -0.5], [0.05, -0.78], [1.08, -0.24],
    [-1.55, 0.66], [-0.25, 0.46], [0.9, 0.78],
    [-0.75, 1.5], [0.58, 1.56], [1.65, 0.9],
  ];

  for (let i = 0; i < count; i += 1) {
    const [sx, sy] = slots[i];
    const wide = random() > 0.5;
    const h = 0.85 + random() * 0.42 + (cluster.hasForge && i === 0 ? 0.5 : 0);
    drawBlock(
      g,
      sx,
      sy,
      wide ? 1.25 : 1,
      wide ? 0.9 : 1.1,
      h,
      i % 2 === 0 ? palette : { ...palette, wall: shade(palette.wall, random() > 0.5 ? 18 : -12) },
    );
  }

  if (cluster.hasForge) drawTower(g, 0.05, 0.35, palette);
  container.add(g);
  container.setDepth(p.y + 200);
  container.setSize(220, 160);
  container.setInteractive(
    new Phaser.Geom.Ellipse(0, 18, 210, 145),
    Phaser.Geom.Ellipse.Contains,
  );
  container.setData('cluster', cluster);
  return container;
}

function fillPopup(popup: HTMLElement, cluster: Cluster, data: SceneData, x: number, y: number): void {
  popup.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = `${cluster.members.length} households`;
  popup.appendChild(heading);
  const list = document.createElement('ul');
  for (const n of cluster.members) {
    const li = document.createElement('li');
    const entry = data.byNumber[String(n)];
    if (entry) {
      const a = document.createElement('a');
      a.href = `/households/${entry.id}/`;
      a.textContent = entry.name;
      li.appendChild(a);
    } else {
      li.textContent = `Household ${n}`;
    }
    list.appendChild(li);
  }
  popup.appendChild(list);
  popup.hidden = false;
  popup.style.left = `${Math.min(x, window.innerWidth - 340)}px`;
  popup.style.top = `${Math.min(y, window.innerHeight - 300)}px`;
}

class TownscaperScene extends Phaser.Scene {
  private dataModel: SceneData = EMPTY_DATA;
  private dragStart?: Point;
  private cameraStart?: Point;
  private waterTick = 0;
  private shimmer?: Phaser.GameObjects.Graphics;

  constructor() {
    super('TownscaperScene');
  }

  init(data: { sceneData: SceneData }): void {
    this.dataModel = data.sceneData;
  }

  create(): void {
    const bounds = this.dataModel.boundary.length > 0
      ? isoBounds(this.dataModel.boundary)
      : { minX: -700, maxX: 700, minY: -500, maxY: 500 };
    const worldPad = 760;
    const worldW = bounds.maxX - bounds.minX + worldPad * 2;
    const worldH = bounds.maxY - bounds.minY + worldPad * 2;
    this.cameras.main.setBounds(bounds.minX - worldPad, bounds.minY - worldPad, worldW, worldH);

    this.drawBackdrop(bounds, worldPad);
    this.drawGround();
    this.drawWaterAndRoads();

    const clusters = [...this.dataModel.clusters]
      .sort((a, b) => latLngToIso(a.centroid[0], a.centroid[1]).y - latLngToIso(b.centroid[0], b.centroid[1]).y);
    const containers = clusters.map((cluster) => drawCluster(this, cluster));
    this.wireInteraction(containers);
    this.frameVillage(bounds);
    this.setupCameraControls();

    (window as unknown as { __townscaperSpike?: Phaser.Game }).__townscaperSpike = this.game;
  }

  update(_time: number, delta: number): void {
    this.waterTick += delta;
    if (!this.shimmer) return;
    this.shimmer.clear();
    for (let i = 0; i < this.dataModel.brook.length - 1; i += 5) {
      const p = this.dataModel.brook[i];
      const q = this.dataModel.brook[i + 1];
      if (!q) continue;
      const pulse = 0.22 + Math.sin(this.waterTick * 0.002 + i) * 0.08;
      drawPolyline(this.shimmer, [p, q], 0xffffff, pulse, 3.2);
    }
  }

  private drawBackdrop(bounds: { minX: number; maxX: number; minY: number; maxY: number }, pad: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xc9e4e0, 0xc9e4e0, 0xf6e9c8, 0xf6e9c8, 1);
    bg.fillRect(bounds.minX - pad, bounds.minY - pad, bounds.maxX - bounds.minX + pad * 2, bounds.maxY - bounds.minY + pad * 2);
    bg.setDepth(-1000);
  }

  private drawGround(): void {
    const g = this.add.graphics();
    g.setDepth(-240);
    if (this.dataModel.boundary.length > 2) {
      g.fillStyle(0x9bb968, 1);
      g.lineStyle(4, 0x6f8a4b, 0.22);
      g.fillPoints(toPoints(this.dataModel.boundary), true);
      g.strokePoints(toPoints(this.dataModel.boundary), true, true);
    }

    const random = rand(1865);
    for (let i = 0; i < 46; i += 1) {
      const base = this.dataModel.boundary[i % this.dataModel.boundary.length] ?? [52.476, -2.094];
      const p = latLngToIso(
        base[0] + (random() - 0.5) * 0.0013,
        base[1] + (random() - 0.5) * 0.0015,
      );
      g.fillStyle(random() > 0.5 ? 0xb7c979 : 0x7fa45a, 0.18);
      g.fillEllipse(p.x, p.y, 120 + random() * 170, 44 + random() * 65);
    }
  }

  private drawWaterAndRoads(): void {
    const water = this.add.graphics().setDepth(-180);
    drawPolyline(water, this.dataModel.brook, 0x6b9fc2, 0.28, 32);
    drawPolyline(water, this.dataModel.brook, 0x437fa8, 0.88, 16);
    drawPolyline(water, this.dataModel.brook, 0xb8e2e7, 0.68, 5);
    this.shimmer = this.add.graphics().setDepth(-175);

    const roads = this.add.graphics().setDepth(-120);
    for (const road of this.dataModel.roads) {
      drawPolyline(roads, road.polyline, 0x785c3d, 0.42, 18);
      drawPolyline(roads, road.polyline, 0xc39b5a, 0.92, 10);
      drawPolyline(roads, road.polyline, 0xf2dca0, 0.82, 3.5);
    }
  }

  private frameVillage(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const camera = this.cameras.main;
    const clusterPoints = this.dataModel.clusters.map((cluster) => cluster.centroid);
    const frame = clusterPoints.length > 0 ? isoBounds(clusterPoints) : bounds;
    const width = Math.max(700, frame.maxX - frame.minX);
    const height = Math.max(460, frame.maxY - frame.minY);
    const zoom = Math.min(this.scale.width / width, this.scale.height / height);
    camera.setZoom(Phaser.Math.Clamp(zoom, 0.55, 2.15));
    const centerX = (frame.minX + frame.maxX) / 2;
    const centerY = (frame.minY + frame.maxY) / 2 + 220;
    camera.scrollX = centerX - this.scale.width / (2 * camera.zoom);
    camera.scrollY = centerY - this.scale.height / (2 * camera.zoom);
  }

  private wireInteraction(containers: Phaser.GameObjects.Container[]): void {
    const tooltip = document.getElementById('townscaper-tooltip');
    const popup = document.getElementById('townscaper-popup');
    if (!tooltip || !popup) return;

    for (const container of containers) {
      const cluster = container.getData('cluster') as Cluster;
      container.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        this.tweens.add({ targets: container, y: container.y - 7, duration: 120, ease: 'Sine.easeOut' });
        tooltip.replaceChildren();
        tooltip.textContent = cluster.members
          .map((n) => this.dataModel.byNumber[String(n)]?.name ?? `Household ${n}`)
          .join('\n');
        tooltip.hidden = false;
        tooltip.style.whiteSpace = 'pre-line';
        tooltip.style.left = `${pointer.event.clientX + 14}px`;
        tooltip.style.top = `${pointer.event.clientY + 14}px`;
      });
      container.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        tooltip.style.left = `${pointer.event.clientX + 14}px`;
        tooltip.style.top = `${pointer.event.clientY + 14}px`;
      });
      container.on('pointerout', () => {
        this.tweens.add({ targets: container, y: latLngToIso(cluster.centroid[0], cluster.centroid[1]).y, duration: 160, ease: 'Sine.easeOut' });
        tooltip.hidden = true;
      });
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
        if (cluster.members.length === 1) {
          const entry = this.dataModel.byNumber[String(cluster.members[0])];
          if (entry) window.location.href = `/households/${entry.id}/`;
        } else {
          fillPopup(popup, cluster, this.dataModel, pointer.event.clientX, pointer.event.clientY);
        }
      });
    }

    document.addEventListener('mousedown', (event) => {
      if (popup.hidden) return;
      if (event.target instanceof Node && !popup.contains(event.target)) popup.hidden = true;
    }, true);
  }

  private setupCameraControls(): void {
    this.game.canvas.style.touchAction = 'none';
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      const camera = this.cameras.main;
      const pointer = this.input.activePointer;
      const worldX = camera.scrollX + pointer.x / camera.zoom;
      const worldY = camera.scrollY + pointer.y / camera.zoom;
      const nextZoom = Phaser.Math.Clamp(camera.zoom - dy * 0.001, 0.3, 2.2);
      camera.setZoom(nextZoom);
      camera.scrollX = worldX - pointer.x / nextZoom;
      camera.scrollY = worldY - pointer.y / nextZoom;
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) return;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.cameraStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || !this.cameraStart) return;
      const camera = this.cameras.main;
      camera.scrollX = this.cameraStart.x - (pointer.x - this.dragStart.x) / camera.zoom;
      camera.scrollY = this.cameraStart.y - (pointer.y - this.dragStart.y) / camera.zoom;
    });
    this.input.on('pointerup', () => {
      this.dragStart = undefined;
      this.cameraStart = undefined;
    });
  }
}

const stage = document.getElementById(STAGE_ID);
if (stage) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: STAGE_ID,
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    antialias: true,
    scene: [TownscaperScene],
  });
  game.scene.start('TownscaperScene', { sceneData: readSceneData() });

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
}
