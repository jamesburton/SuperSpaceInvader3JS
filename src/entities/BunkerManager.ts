import {
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  Color,
} from 'three';
import type { Scene } from 'three';
import { WORLD_WIDTH } from '../utils/constants';

// Bunker segment half-extents for collision
const SEG_W = 8;   // half-width (full width = 16 units)
const SEG_H = 6;   // half-height (full height = 12 units)
const COLS = 4;    // segments per row
const ROWS = 4;    // rows per bunker
const BUNKER_Y = -160; // Y position of bunker center
const MAX_BUNKERS = 4;
const BUNKER_COLOR = 0x00cc44; // neon green

/** A single destructible block of a bunker. */
export interface BunkerSegment {
  mesh: Mesh;
  alive: boolean;
  x: number;
  y: number;
  readonly hw: number; // AABB half-width = SEG_W / 2
  readonly hh: number; // AABB half-height = SEG_H / 2
}

interface Bunker {
  index: number;
  x: number;
  segments: BunkerSegment[];
}

/**
 * BunkerManager — spawns, tracks, and destroys destructible bunker formations.
 *
 * Call spawnForRun(count) at run start to place bunkers.
 * Call reset() at run end / continue to remove all meshes.
 * Segments have AABB fields (hw/hh) for use with CollisionSystem.
 */
export class BunkerManager {
  private bunkers: Bunker[] = [];
  private sharedGeo: BoxGeometry | null = null;
  private materials: MeshStandardMaterial[] = [];
  private bloomCallback: ((mesh: Mesh) => void) | null = null;

  constructor(private readonly scene: Scene) {}

  /** Register a callback to add meshes to the bloom selection when spawned. */
  public registerBloom(callback: (mesh: Mesh) => void): void {
    this.bloomCallback = callback;
  }

  /**
   * Spawn `count` bunkers evenly spaced across the play area.
   * Clamped to MAX_BUNKERS. Resets any existing bunkers first.
   */
  public spawnForRun(count: number): void {
    this.reset();
    const n = Math.min(Math.max(1, count), MAX_BUNKERS);
    this.sharedGeo = new BoxGeometry(SEG_W * 2, SEG_H * 2, 1);

    const step = WORLD_WIDTH / (n + 1);

    for (let i = 0; i < n; i++) {
      const bunkerX = -WORLD_WIDTH / 2 + step * (i + 1);
      const segments: BunkerSegment[] = [];

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const segX = bunkerX + (col - (COLS - 1) / 2) * SEG_W * 2;
          const segY = BUNKER_Y + (row - (ROWS - 1) / 2) * SEG_H * 2;

          const mat = new MeshStandardMaterial({
            color: BUNKER_COLOR,
            emissive: new Color(BUNKER_COLOR),
            emissiveIntensity: 0.8,
            roughness: 1.0,
            metalness: 0.0,
          });
          this.materials.push(mat);

          const mesh = new Mesh(this.sharedGeo, mat);
          mesh.position.set(segX, segY, 0);
          this.scene.add(mesh);
          this.bloomCallback?.(mesh);

          segments.push({
            mesh,
            alive: true,
            x: segX,
            y: segY,
            hw: SEG_W / 2,
            hh: SEG_H / 2,
          });
        }
      }

      this.bunkers.push({ index: i, x: bunkerX, segments });
    }
  }

  /** Remove all bunker meshes from scene and free GPU resources. */
  public reset(): void {
    for (const bunker of this.bunkers) {
      for (const seg of bunker.segments) {
        this.scene.remove(seg.mesh);
      }
    }
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.sharedGeo?.dispose();
    this.sharedGeo = null;
    this.materials = [];
    this.bunkers = [];
  }

  /** Flat array of all currently alive segments across all bunkers. */
  public getSegments(): BunkerSegment[] {
    const result: BunkerSegment[] = [];
    for (const bunker of this.bunkers) {
      for (const seg of bunker.segments) {
        if (seg.alive) result.push(seg);
      }
    }
    return result;
  }

  /** Returns true if any bunker has at least one destroyed segment (can be repaired). */
  public hasDamagedBunker(): boolean {
    const maxSegs = COLS * ROWS;
    return this.bunkers.some(b => b.segments.filter(s => s.alive).length < maxSegs);
  }

  /** Destroy a single segment: mark dead and hide its mesh. */
  public destroySegment(seg: BunkerSegment): void {
    seg.alive = false;
    seg.mesh.visible = false;
  }

  /**
   * Fully repair the most damaged bunker (fewest alive segments).
   * Called when player buys REPAIR BUNKER in the shop.
   */
  public repairMostDamaged(): void {
    const target = this._findMostDamaged();
    if (!target) return;
    for (const seg of target.segments) {
      seg.alive = true;
      seg.mesh.visible = true;
    }
  }

  /**
   * Restore `count` segments on the most damaged bunker.
   * Called each wave if bunker_autorepair meta upgrade is owned.
   */
  public autoRepairBetweenWaves(count: number): void {
    const target = this._findMostDamaged();
    if (!target) return;
    let restored = 0;
    for (const seg of target.segments) {
      if (!seg.alive && restored < count) {
        seg.alive = true;
        seg.mesh.visible = true;
        restored++;
      }
    }
  }

  private _findMostDamaged(): Bunker | null {
    if (this.bunkers.length === 0) return null;
    return this.bunkers.reduce((worst, b) => {
      const aliveCount = b.segments.filter(s => s.alive).length;
      const worstAlive = worst.segments.filter(s => s.alive).length;
      return aliveCount < worstAlive ? b : worst;
    });
  }
}
