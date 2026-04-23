import Phaser from 'phaser';
import { drawBrook, drawRoads } from './brookAndRoads';
import { isoBounds, latLngToIso } from './projection';

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
}

const EMPTY_SCENE_DATA: SceneData = {
  clusters: [],
  boundary: [],
  brook: [],
  roads: [],
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

  constructor() {
    super('VillageScene');
  }

  init(data: { sceneData: SceneData }): void {
    this.sceneData = data.sceneData;
  }

  preload(): void {
    this.load.image('meadow', '/spike-sprites/meadow.png');
  }

  create(): void {
    if (this.sceneData.boundary.length === 0) {
      this.setupPanZoom();
      return;
    }

    const { minX, maxX, minY, maxY } = isoBounds(this.sceneData.boundary);
    const width  = maxX - minX;
    const height = maxY - minY;
    const pad    = Math.max(width, height) * 0.2;
    const camera = this.cameras.main;

    // 1) World bounds with padding
    camera.setBounds(minX - pad, minY - pad, width + 2 * pad, height + 2 * pad);

    // 2) Pick a fit zoom (clamped to [0.5, 2.5] so we don't start at extreme values)
    const fitZoom = Math.min(
      this.scale.width  / (width  + 2 * pad),
      this.scale.height / (height + 2 * pad),
    );
    camera.setZoom(Phaser.Math.Clamp(fitZoom, 0.5, 2.5));

    // 3) Center — MUST be called AFTER setZoom, so Phaser computes scroll using the
    //    final zoom. Also use the centre of the *padded* bounds so the view is framed
    //    symmetrically.
    camera.centerOn((minX + maxX) / 2, (minY + maxY) / 2);

    // Meadow ground sprite — sized to the padded world bounds
    const meadow = this.add.image(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      'meadow',
    ).setDepth(-100);
    meadow.setDisplaySize(width + 2 * pad, height + 2 * pad);

    // Brook + roads drawn via Graphics
    drawBrook(this, this.sceneData.brook, -50);
    drawRoads(this, this.sceneData.roads, -40);

    const markers = this.add.graphics();
    markers.fillStyle(0xff3366, 0.9);

    for (const cluster of this.sceneData.clusters) {
      const point = latLngToIso(cluster.centroid[0], cluster.centroid[1]);
      markers.fillCircle(point.x, point.y, 24);
    }

    this.setupPanZoom();
  }

  private setupPanZoom(): void {
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        const camera = this.cameras.main;
        const nextZoom = Phaser.Math.Clamp(camera.zoom - deltaY * 0.001, 0.5, 2.5);
        const pointer = this.input.activePointer;
        const worldX = camera.scrollX + pointer.x / camera.zoom;
        const worldY = camera.scrollY + pointer.y / camera.zoom;

        camera.setZoom(nextZoom);
        camera.scrollX = worldX - pointer.x / nextZoom;
        camera.scrollY = worldY - pointer.y / nextZoom;
      },
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        return;
      }

      const camera = this.cameras.main;
      this.isDragging = true;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.cameraStart = { x: camera.scrollX, y: camera.scrollY };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) {
        return;
      }

      const camera = this.cameras.main;
      camera.scrollX = this.cameraStart.x - (pointer.x - this.dragStart.x) / camera.zoom;
      camera.scrollY = this.cameraStart.y - (pointer.y - this.dragStart.y) / camera.zoom;
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    this.game.canvas.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });
  }
}
