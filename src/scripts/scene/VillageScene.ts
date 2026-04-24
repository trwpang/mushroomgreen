import Phaser from 'phaser';
import { createBrookShimmer, drawBrook, drawRoads } from './brookAndRoads';
import { buildPlacements, placeSprites, preloadSprites, type Placement } from './clusterLayout';
import { wireInteractions, type HouseholdLookup } from './interactions';
import { isoBounds, latLngToIso } from './projection';

function dist(p1: Phaser.Input.Pointer, p2: Phaser.Input.Pointer): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function mid(p1: Phaser.Input.Pointer, p2: Phaser.Input.Pointer): { x: number; y: number } {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export interface SceneData {
  clusters: Array<{
    id: number;
    centroid: [number, number];
    members: number[];
    primaryFamily: string;
    spriteKey: string;
    hasForge: boolean;
  }>;
  boundary: [number, number][];
  brook: [number, number][];
  roads: { polyline: [number, number][] }[];
  byNumber: HouseholdLookup;
}

const EMPTY_SCENE_DATA: SceneData = {
  clusters: [],
  boundary: [],
  brook: [],
  roads: [],
  byNumber: {},
};

type Point = {
  x: number;
  y: number;
};

export default class VillageScene extends Phaser.Scene {
  private sceneData: SceneData = EMPTY_SCENE_DATA;
  private isDragging = false;
  private dragStart: Point = { x: 0, y: 0 };
  private cameraStart: Point = { x: 0, y: 0 };
  private touchPan = { active: false, startX: 0, startY: 0, camX: 0, camY: 0 };
  private touchPinch = { active: false, startDist: 0, startZoom: 0, startMidX: 0, startMidY: 0 };
  private clusterSpriteMap: Map<number, Phaser.GameObjects.Image> = new Map();
  private forgePlacements: Placement[] = [];
  private willows: Phaser.GameObjects.Image[] = [];
  private brookShimmerTick?: (time: number) => void;

  constructor() {
    super('VillageScene');
  }

  init(data: { sceneData: SceneData }): void {
    this.sceneData = data.sceneData;
  }

  preload(): void {
    this.load.image('meadow', '/spike-sprites/meadow.png');
    preloadSprites(this);
  }

  create(): void {
    this.willows = [];
    this.brookShimmerTick = undefined;

    if (this.sceneData.boundary.length === 0) {
      this.setupPanZoom();
      return;
    }

    // World bounds use the full hamlet boundary + padding — lets the camera
    // pan outward to see greens / outer brook / far willows.
    const boundaryIso = isoBounds(this.sceneData.boundary);
    const bw = boundaryIso.maxX - boundaryIso.minX;
    const bh = boundaryIso.maxY - boundaryIso.minY;
    const boundaryPad = Math.max(bw, bh) * 0.2;
    const camera = this.cameras.main;
    camera.setBounds(
      boundaryIso.minX - boundaryPad,
      boundaryIso.minY - boundaryPad,
      bw + 2 * boundaryPad,
      bh + 2 * boundaryPad,
    );

    // Initial framing fits just the cluster centroids — the village itself
    // lands dead-centre in the viewport. The bridge + far-north willows
    // live just outside this frame by design; panning (right-click-drag)
    // or scrolling up (wheel zoom out) exposes them.
    const clusterCentroids = this.sceneData.clusters.map((c) => c.centroid);
    const frameIso = clusterCentroids.length > 0
      ? isoBounds(clusterCentroids)
      : boundaryIso;
    const fw = frameIso.maxX - frameIso.minX;
    const fh = frameIso.maxY - frameIso.minY;
    // 18% pad gives the village some breathing room without cropping the
    // southernmost cottage or pulling the frame too wide.
    const framePad = Math.max(fw, fh) * 0.18;

    const fitZoom = Math.min(
      this.scale.width  / (fw + 2 * framePad),
      this.scale.height / (fh + 2 * framePad),
    );
    // Floor at 0.35 so a very wide hamlet can zoom out enough to fit every
    // cluster. User can wheel back up to 2.5×.
    camera.setZoom(Phaser.Math.Clamp(fitZoom, 0.35, 2.5));

    // Centre on the frame midpoint — puts the village itself in the middle
    // of the viewport. Set scrollX/scrollY directly (Phaser's centerOn has
    // clamped our Y to outside the expected range in 3.90 under some zoom
    // levels; scroll math against the camera view size is unambiguous).
    const centerX = (frameIso.minX + frameIso.maxX) / 2;
    const centerY = (frameIso.minY + frameIso.maxY) / 2;
    camera.scrollX = centerX - this.scale.width  / (2 * camera.zoom);
    camera.scrollY = centerY - this.scale.height / (2 * camera.zoom);

    // Alias for downstream code that used the old `minX/maxX/minY/maxY/width/height/pad`.
    const minX = boundaryIso.minX, maxX = boundaryIso.maxX;
    const minY = boundaryIso.minY, maxY = boundaryIso.maxY;
    const width = bw, height = bh, pad = boundaryPad;

    // Meadow ground sprite — sized to the padded world bounds
    const meadow = this.add.image(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      'meadow',
    ).setDepth(-100);
    meadow.setDisplaySize(width + 2 * pad, height + 2 * pad);

    // Brook + roads drawn via Graphics
    drawBrook(this, this.sceneData.brook, -50);
    this.brookShimmerTick = createBrookShimmer(this, this.sceneData.brook, -45);
    drawRoads(this, this.sceneData.roads, -40);

    const placements = buildPlacements(this.sceneData.clusters);
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(16, 16, 14);
    pg.generateTexture('smoke-puff', 32, 32);
    pg.destroy();

    const spritePlacement = placeSprites(this, placements.all);
    this.clusterSpriteMap = spritePlacement.clusterSpriteMap;
    this.willows = spritePlacement.willows;
    this.forgePlacements = placements.forges;
    wireInteractions(this, this.clusterSpriteMap, this.sceneData.clusters, this.sceneData.byNumber ?? {});

    for (const f of this.forgePlacements) {
      const { x, y } = latLngToIso(f.lat, f.lng);
      const emitter = this.add.particles(x - 8, y - 60, 'smoke-puff', {
        lifespan: 2800,
        speedY: { min: -42, max: -28 },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.9, end: 2.6 },
        alpha: { start: 0.85, end: 0 },
        frequency: 140,
        tint: [0x3c2e22, 0x5b463a, 0x7a6454],
        blendMode: 'NORMAL',
      });
      emitter.setDepth(y + 100);
      // Phaser 3.90 + Astro/Vite: the ParticleEmitter's addedToScene hook
      // doesn't auto-register the emitter on scene.sys.updateList, so
      // preUpdate never fires and no particles emit. Manual add unblocks it.
      this.sys.updateList.add(emitter);
    }

    this.setupPanZoom();
  }

  update(time: number, delta: number): void {
    void delta;
    for (const w of this.willows) {
      const phase = w.getData('phase') as number;
      const ox = w.getData('origX') as number;
      w.rotation = Math.sin(time * 0.0008 + phase) * 0.015;
      w.x = ox + Math.sin(time * 0.0006 + phase) * 2;
    }
    this.brookShimmerTick?.(time);
  }

  private setupPanZoom(): void {
    this.input.addPointer(1);
    this.game.canvas.style.touchAction = 'none';

    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        const camera = this.cameras.main;
        const nextZoom = Phaser.Math.Clamp(camera.zoom - deltaY * 0.001, 0.35, 2.5);
        const pointer = this.input.activePointer;
        const worldX = camera.scrollX + pointer.x / camera.zoom;
        const worldY = camera.scrollY + pointer.y / camera.zoom;

        camera.setZoom(nextZoom);
        camera.scrollX = worldX - pointer.x / nextZoom;
        camera.scrollY = worldY - pointer.y / nextZoom;
      },
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const isTouch = pointer.pointerType === 'touch';
      if (isTouch) {
        const pointer1 = this.input.pointer1;
        const pointer2 = this.input.pointer2;
        const camera = this.cameras.main;

        if (pointer1.isDown && pointer2.isDown) {
          const startMid = mid(pointer1, pointer2);
          this.touchPan.active = false;
          this.touchPinch = {
            active: true,
            startDist: dist(pointer1, pointer2),
            startZoom: camera.zoom,
            startMidX: startMid.x,
            startMidY: startMid.y,
          };
        } else if (pointer1.isDown && !pointer2.isDown) {
          this.touchPan = {
            active: true,
            startX: pointer1.x,
            startY: pointer1.y,
            camX: camera.scrollX,
            camY: camera.scrollY,
          };
          this.touchPinch.active = false;
        }

        return;
      }

      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        return;
      }

      const camera = this.cameras.main;
      this.isDragging = true;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.cameraStart = { x: camera.scrollX, y: camera.scrollY };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.touchPinch.active) {
        const pointer1 = this.input.pointer1;
        const pointer2 = this.input.pointer2;
        const camera = this.cameras.main;
        const newDist = dist(pointer1, pointer2);
        const ratio = newDist / this.touchPinch.startDist;
        const newZoom = Phaser.Math.Clamp(this.touchPinch.startZoom * ratio, 0.35, 2.5);
        const midpoint = mid(pointer1, pointer2);
        const worldX = camera.scrollX + midpoint.x / camera.zoom;
        const worldY = camera.scrollY + midpoint.y / camera.zoom;

        camera.setZoom(newZoom);
        camera.scrollX = worldX - midpoint.x / newZoom;
        camera.scrollY = worldY - midpoint.y / newZoom;
        return;
      }

      if (this.touchPan.active) {
        const pointer1 = this.input.pointer1;
        const camera = this.cameras.main;
        camera.scrollX = this.touchPan.camX - (pointer1.x - this.touchPan.startX) / camera.zoom;
        camera.scrollY = this.touchPan.camY - (pointer1.y - this.touchPan.startY) / camera.zoom;
        return;
      }

      if (!this.isDragging) {
        return;
      }

      const camera = this.cameras.main;
      camera.scrollX = this.cameraStart.x - (pointer.x - this.dragStart.x) / camera.zoom;
      camera.scrollY = this.cameraStart.y - (pointer.y - this.dragStart.y) / camera.zoom;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const isTouch = pointer.pointerType === 'touch';
      if (isTouch) {
        const pointer1 = this.input.pointer1;
        const pointer2 = this.input.pointer2;
        const camera = this.cameras.main;

        if (pointer === pointer2 && pointer1.isDown) {
          this.touchPinch.active = false;
          this.touchPan = {
            active: true,
            startX: pointer1.x,
            startY: pointer1.y,
            camX: camera.scrollX,
            camY: camera.scrollY,
          };
        } else if (!pointer1.isDown && !pointer2.isDown) {
          this.touchPan.active = false;
          this.touchPinch.active = false;
        } else if (!pointer1.isDown) {
          this.touchPan.active = false;
          this.touchPinch.active = false;
        }

        return;
      }

      this.isDragging = false;
    });

    this.game.canvas.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });
  }
}
