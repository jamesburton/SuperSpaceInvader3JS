import {
  InstancedMesh,
  BoxGeometry,
  MeshBasicMaterial,
  Matrix4,
} from 'three';
import type { Scene } from 'three';
import type { EnemyType } from '../config/enemies';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ENEMY_COLS,
  ENEMY_ROWS,
  ENEMY_BASE_MARCH_SPEED,
  ENEMY_MARCH_SPEEDUP,
  ENEMY_DROP_DISTANCE,
  ENEMY_POOL_SIZE,
} from '../utils/constants';
import { ENEMY_DEFS, ROW_SIZES } from '../config/enemies';

/** Per-enemy data. Held in a flat array — EnemyFormation manages them. */
export class Enemy {
  public x: number = 0;
  public y: number = 0;
  public readonly width: number;    // AABB half-width
  public readonly height: number;   // AABB half-height
  public health: number = 1;
  public maxHealth: number = 1;
  public readonly type: EnemyType = 'grunt';
  public readonly row: number;
  public readonly col: number;
  public readonly instanceIndex: number;
  public active: boolean = true;

  constructor(row: number, col: number, instanceIndex: number) {
    this.row = row;
    this.col = col;
    this.instanceIndex = instanceIndex;
    const rowSize = ROW_SIZES[Math.min(row, ROW_SIZES.length - 1)];
    this.width = rowSize.halfW;
    this.height = rowSize.halfH;
    const def = ENEMY_DEFS[this.type];
    this.health = def.hp;
    this.maxHealth = def.hp;
  }
}

/**
 * EnemyFormation: manages the InstancedMesh and formation march logic.
 * Owns all Enemy instances. AISystem calls updateMarch() each fixed step.
 */
export class EnemyFormation {
  public readonly enemies: Enemy[] = [];
  public readonly instancedMesh: InstancedMesh;

  // Formation position — all enemies relative to this anchor
  private formationX: number = 0;
  private formationY: number = (WORLD_HEIGHT / 2) - 80; // top area, 80 units from top

  // March state
  private marchDir: 1 | -1 = 1;           // 1 = right, -1 = left
  private marchSpeed: number = ENEMY_BASE_MARCH_SPEED;
  private totalEnemies: number = 0;        // initial count for speed calculation
  private activeEnemyCount: number = 0;

  // Spacing between enemies in formation
  private readonly colSpacing = 56;        // horizontal gap between columns
  private readonly rowSpacing = 44;        // vertical gap between rows

  private readonly tmpMatrix = new Matrix4();

  constructor(scene: Scene) {
    // Single BoxGeometry shared by all instances (Phase 2 will replace with per-row sub-meshes)
    // Phase 1: all instances use the same mesh; row size differences are purely in AABB data
    const geo = new BoxGeometry(32, 22, 1);
    const mat = new MeshBasicMaterial({ color: 0xffffff });

    this.instancedMesh = new InstancedMesh(geo, mat, ENEMY_POOL_SIZE);
    this.instancedMesh.count = 0; // will be set in spawnWave
    scene.add(this.instancedMesh);

    this.spawnWave();
  }

  /** Spawn a fresh wave of enemies at the top formation position */
  public spawnWave(): void {
    this.enemies.length = 0;
    this.formationX = 0;
    this.formationY = (WORLD_HEIGHT / 2) - 80;
    this.marchDir = 1;
    this.marchSpeed = ENEMY_BASE_MARCH_SPEED;

    const totalEnemies = ENEMY_ROWS * ENEMY_COLS;
    this.totalEnemies = totalEnemies;
    this.activeEnemyCount = totalEnemies;

    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        const instanceIndex = row * ENEMY_COLS + col;
        const enemy = new Enemy(row, col, instanceIndex);
        this.enemies.push(enemy);
      }
    }

    this.instancedMesh.count = totalEnemies;
    this.updateAllMatrices();
  }

  /**
   * Update formation march. Called by AISystem each fixed step.
   * Returns true if enemies have reached the bottom (game over trigger).
   *
   * Reversal is triggered when the outermost *active* enemy edge touches the
   * world boundary — so clearing one side of the formation makes the remaining
   * enemies travel further before turning, just like classic Space Invaders.
   */
  public updateMarch(dt: number): boolean {
    this.formationX += this.marchDir * this.marchSpeed * dt;

    // Find the actual left/right extents of active enemies this frame.
    const wall = WORLD_WIDTH / 2;
    let rightEdge = -Infinity;
    let leftEdge  =  Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const pos = this.getEnemyWorldPos(enemy);
      if (pos.x + enemy.width > rightEdge) rightEdge = pos.x + enemy.width;
      if (pos.x - enemy.width < leftEdge)  leftEdge  = pos.x - enemy.width;
    }

    if (this.marchDir === 1 && rightEdge >= wall) {
      // Clamp so the outermost enemy sits exactly at the wall, then drop and reverse.
      this.formationX -= rightEdge - wall;
      this.formationY -= ENEMY_DROP_DISTANCE;
      this.marchDir = -1;
    } else if (this.marchDir === -1 && leftEdge <= -wall) {
      this.formationX += -wall - leftEdge;
      this.formationY -= ENEMY_DROP_DISTANCE;
      this.marchDir = 1;
    }

    this.updateAllMatrices();

    // Check if any enemy has reached the bottom (game over condition)
    const bottomBound = -(WORLD_HEIGHT / 2) + 60; // 60 units from bottom
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const worldY = this.formationY - enemy.row * this.rowSpacing;
      if (worldY <= bottomBound) return true;
    }
    return false;
  }

  /** Kill an enemy by instanceIndex. Updates march speed and deactivates instance. */
  public killEnemy(instanceIndex: number): void {
    const enemy = this.enemies[instanceIndex];
    if (!enemy || !enemy.active) return;

    enemy.active = false;
    this.activeEnemyCount = Math.max(0, this.activeEnemyCount - 1);

    // Classic Space Invaders: speed increases 8% per enemy destroyed
    // Recalculate from base to avoid floating point drift
    const killed = this.totalEnemies - this.activeEnemyCount;
    this.marchSpeed = ENEMY_BASE_MARCH_SPEED * Math.pow(1 + ENEMY_MARCH_SPEEDUP, killed);

    // Hide this instance by scaling it to zero
    this.tmpMatrix.makeScale(0, 0, 0);
    this.instancedMesh.setMatrixAt(instanceIndex, this.tmpMatrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public get activeCount(): number {
    return this.activeEnemyCount;
  }

  /**
   * Get a random active enemy for firing purposes.
   * Front-row preference: tries to pick an enemy in the lowest active row of each column.
   */
  public getRandomFiringEnemy(): Enemy | null {
    if (this.activeEnemyCount === 0) return null;

    // Build list of front-row enemies (lowest row per column that is still active)
    const frontEnemies: Enemy[] = [];
    for (let col = 0; col < ENEMY_COLS; col++) {
      // Scan from bottom row upward to find the lowest active enemy in this column
      for (let row = ENEMY_ROWS - 1; row >= 0; row--) {
        const enemy = this.enemies[row * ENEMY_COLS + col];
        if (enemy && enemy.active) {
          frontEnemies.push(enemy);
          break;
        }
      }
    }

    if (frontEnemies.length === 0) return null;
    return frontEnemies[Math.floor(Math.random() * frontEnemies.length)];
  }

  /** Get world position of an enemy (for bullet spawn, collision) */
  public getEnemyWorldPos(enemy: Enemy): { x: number; y: number } {
    return {
      x: this.formationX + (enemy.col - (ENEMY_COLS - 1) / 2) * this.colSpacing,
      y: this.formationY - enemy.row * this.rowSpacing,
    };
  }

  /** Get world AABB for an enemy (for collision detection) */
  public getEnemyAABB(enemy: Enemy): { x: number; y: number; w: number; h: number } {
    const pos = this.getEnemyWorldPos(enemy);
    return { x: pos.x, y: pos.y, w: enemy.width, h: enemy.height };
  }

  private updateAllMatrices(): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const pos = this.getEnemyWorldPos(enemy);
      this.tmpMatrix.makeTranslation(pos.x, pos.y, 0);
      this.instancedMesh.setMatrixAt(enemy.instanceIndex, this.tmpMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
