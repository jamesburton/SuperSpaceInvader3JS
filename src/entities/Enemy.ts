import {
  InstancedMesh,
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  MeshStandardMaterial,
  Color,
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
 * Build a BufferGeometry from vertex positions and triangle indices.
 * All shapes are flat (z=0) for the 2D gameplay plane.
 */
function buildGeometry(
  positions: Float32Array,
  indices: Uint16Array,
): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Row 0 (small, top): Diamond — rotated square, 4 vertices.
 * Dimensions: 24w × 18h
 */
function makeRow0Geometry(): BufferGeometry {
  const hw = 12; // half-width
  const hh = 9;  // half-height
  // vertices: top, right, bottom, left
  const positions = new Float32Array([
     0,  hh, 0, // 0 top
    hw,   0, 0, // 1 right
     0, -hh, 0, // 2 bottom
   -hw,   0, 0, // 3 left
  ]);
  // CCW winding (viewed from +Z camera): flip each triangle to face toward camera
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2]);
  return buildGeometry(positions, indices);
}

/**
 * Row 1 (medium-small): Elongated hexagon — 6 vertices.
 * Dimensions: 28w × 20h
 */
function makeRow1Geometry(): BufferGeometry {
  const hw = 14; // half-width
  const hh = 10; // half-height
  const midX = hw * 0.7; // horizontal extent of mid vertices
  const midY = hh * 0.45; // vertical offset for mid vertices
  // vertices: top-center, top-right, bottom-right, bottom-center, bottom-left, top-left
  const positions = new Float32Array([
       0,  hh, 0, // 0 top-center
    midX, midY, 0, // 1 top-right
    midX,-midY, 0, // 2 bottom-right
       0, -hh, 0, // 3 bottom-center
   -midX,-midY, 0, // 4 bottom-left
   -midX, midY, 0, // 5 top-left
  ]);
  // CCW fan from vertex 0: flip each triangle to face toward +Z camera
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
  return buildGeometry(positions, indices);
}

/**
 * Row 2 (medium-large): Angular chevron/arrowhead pointing up — 6 vertices.
 * Dimensions: 32w × 22h
 */
function makeRow2Geometry(): BufferGeometry {
  const hw = 16; // half-width
  const hh = 11; // half-height
  // Arrowhead shape pointing upward with swept-back wings
  const positions = new Float32Array([
       0,   hh, 0, // 0 nose tip (top center)
      hw,  -hh, 0, // 1 right wing tip (bottom right)
    hw * 0.4, -hh * 0.3, 0, // 2 right inner notch
       0, -hh * 0.7, 0, // 3 center base notch
   -hw * 0.4, -hh * 0.3, 0, // 4 left inner notch
     -hw,  -hh, 0, // 5 left wing tip (bottom left)
  ]);
  // CCW fan from nose: flip each triangle to face toward +Z camera
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
  return buildGeometry(positions, indices);
}

/**
 * Row 3 (large, bottom): Wide crab with pincer notches — 8 vertices.
 * Dimensions: 36w × 24h
 */
function makeRow3Geometry(): BufferGeometry {
  const hw = 18; // half-width
  const hh = 12; // half-height
  // Crab body with pincer notches cut into bottom corners
  const positions = new Float32Array([
      -hw * 0.5,  hh, 0, // 0 top-left
       hw * 0.5,  hh, 0, // 1 top-right
          hw, hh * 0.3, 0, // 2 right mid-outer
          hw,     -hh, 0, // 3 right pincer tip
       hw * 0.5,  0,  0, // 4 right pincer inner notch
      -hw * 0.5,  0,  0, // 5 left pincer inner notch
         -hw,    -hh, 0, // 6 left pincer tip
         -hw, hh * 0.3, 0, // 7 left mid-outer
  ]);
  // CCW fan from vertex 0: flip each triangle to face toward +Z camera
  const indices = new Uint16Array([
    0, 2, 1,
    0, 3, 2,
    0, 4, 3,
    0, 5, 4,
    0, 6, 5,
    0, 7, 6,
  ]);
  return buildGeometry(positions, indices);
}

/** Create per-row geometry factory array */
const ROW_GEOMETRY_FACTORIES: Array<() => BufferGeometry> = [
  makeRow0Geometry,
  makeRow1Geometry,
  makeRow2Geometry,
  makeRow3Geometry,
];

/**
 * EnemyFormation: manages per-row InstancedMesh objects and formation march logic.
 * Owns all Enemy instances. AISystem calls updateMarch() each fixed step.
 *
 * Phase 2: replaced single instancedMesh with rowMeshes[4], one per row.
 * Each row has its own BufferGeometry shape and MeshStandardMaterial for emissive neon.
 * Public API remains 100% compatible with Phase 1 — CollisionSystem and AISystem unchanged.
 */
export class EnemyFormation {
  public readonly enemies: Enemy[] = [];

  /**
   * Per-row instanced meshes.
   * rowMeshes[0] = row 0 (top, small diamonds), rowMeshes[3] = row 3 (bottom, crabs).
   * Each InstancedMesh pre-allocated to ENEMY_POOL_SIZE slots.
   */
  public readonly rowMeshes: InstancedMesh[];

  /**
   * @deprecated Phase 1 compatibility alias — points to rowMeshes[0].
   * CollisionSystem and AISystem do not access instancedMesh directly,
   * but keep it available for any legacy reference.
   */
  public get instancedMesh(): InstancedMesh {
    return this.rowMeshes[0];
  }

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
    this.rowMeshes = [];

    for (let row = 0; row < ENEMY_ROWS; row++) {
      const geo = ROW_GEOMETRY_FACTORIES[Math.min(row, ROW_GEOMETRY_FACTORIES.length - 1)]();
      const mat = new MeshStandardMaterial({
        color: 0x00ffff,
        emissive: new Color(0x00ffff),
        emissiveIntensity: 1.0,
        roughness: 1.0,
        metalness: 0.0,
      });

      const mesh = new InstancedMesh(geo, mat, ENEMY_POOL_SIZE);
      mesh.count = 0;
      scene.add(mesh);
      this.rowMeshes.push(mesh);
    }

    this.spawnWave();
  }

  /**
   * Apply a neon palette color to all row materials.
   * Called by SpawnSystem on each new wave spawn.
   */
  public applyPalette(hexColor: number): void {
    const c = new Color(hexColor);
    for (const mesh of this.rowMeshes) {
      const mat = mesh.material as MeshStandardMaterial;
      mat.color.copy(c);
      mat.emissive.copy(c);
    }
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
        // instanceIndex within each row mesh = column index (0–9)
        const instanceIndex = col;
        const enemy = new Enemy(row, col, instanceIndex);
        this.enemies.push(enemy);
      }
    }

    // Update per-row mesh counts
    for (let row = 0; row < ENEMY_ROWS; row++) {
      this.rowMeshes[row].count = ENEMY_COLS;
    }

    this.updateAllMatrices();
  }

  /**
   * Update formation march. Called by AISystem each fixed step.
   * Returns true if enemies have reached the bottom (game over trigger).
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

  /**
   * Kill an enemy by instanceIndex. Updates march speed and deactivates instance.
   * instanceIndex here is the flat index (row * ENEMY_COLS + col) — same as Phase 1 API.
   * Internally maps to per-row instancedMesh column index.
   */
  public killEnemy(instanceIndex: number): void {
    const enemy = this.enemies[instanceIndex];
    if (!enemy || !enemy.active) return;

    enemy.active = false;
    this.activeEnemyCount = Math.max(0, this.activeEnemyCount - 1);

    // Classic Space Invaders: speed increases 8% per enemy destroyed
    // Recalculate from base to avoid floating point drift
    const killed = this.totalEnemies - this.activeEnemyCount;
    this.marchSpeed = ENEMY_BASE_MARCH_SPEED * Math.pow(1 + ENEMY_MARCH_SPEEDUP, killed);

    // Hide this instance by scaling it to zero in the row's InstancedMesh
    this.tmpMatrix.makeScale(0, 0, 0);
    const rowMesh = this.rowMeshes[enemy.row];
    rowMesh.setMatrixAt(enemy.instanceIndex, this.tmpMatrix);
    rowMesh.instanceMatrix.needsUpdate = true;
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
      // Each row has its own InstancedMesh; enemy.instanceIndex = enemy.col (0-9)
      this.rowMeshes[enemy.row].setMatrixAt(enemy.instanceIndex, this.tmpMatrix);
    }
    // Mark all row meshes as needing update
    for (const mesh of this.rowMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
