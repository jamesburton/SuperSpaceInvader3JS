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
  ENEMY_BASE_MARCH_SPEED,
  ENEMY_MARCH_SPEEDUP,
  ENEMY_DROP_DISTANCE,
  ENEMY_POOL_SIZE,
} from '../utils/constants';
import { ENEMY_DEFS, ROW_SIZES } from '../config/enemies';
import type { FormationLayout, WaveConfig } from '../config/waveConfig';
import { getWaveConfig } from '../config/waveConfig';

// ---------------------------------------------------------------------------
// Type-to-row-index map for AABB sizing.
// Grunt size varies by formation row; all other archetypes use fixed row-index.
// ---------------------------------------------------------------------------
const TYPE_ROW_INDEX: Record<EnemyType, number | null> = {
  grunt:    null, // varies by row — computed dynamically
  shielder: 3,    // large
  flanker:  1,    // medium-small
  sniper:   2,    // medium-large
  charger:  3,    // large
  swooper:  1,    // medium-small
};

/** Per-enemy data. Held in a flat array — EnemyFormation manages them. */
export class Enemy {
  public x: number = 0;
  public y: number = 0;
  public readonly width: number;    // AABB half-width
  public readonly height: number;   // AABB half-height
  public health: number = 1;
  public maxHealth: number = 1;
  public readonly type: EnemyType;
  public readonly row: number;
  public readonly col: number;
  public readonly instanceIndex: number;
  public active: boolean = true;

  /** Slot within this enemy's type-specific InstancedMesh. Set by EnemyFormation.spawnWave(). */
  public meshSlot: number = 0;

  // ---- Archetype-specific state ----

  /** Shielder: shield is active while shieldHp > 0 */
  public shieldActive: boolean = false;
  /** Shielder: remaining shield HP */
  public shieldHp: number = 0;

  /** Swooper: true when entity has exited screen bounds and is looping back */
  public offScreen: boolean = false;
  /** Swooper state machine */
  public swooperPhase: 'formation' | 'diving' | 'looping' | 'returning' = 'formation';
  /** Swooper re-entry position target */
  public swooperLoopX: number = 0;
  public swooperLoopY: number = 0;

  /** Flanker: true after it breaks formation */
  public flankerCharging: boolean = false;

  /** Charger: countdown until next dive; reset after each dive */
  public chargerDiveTimer: number = 0;
  /** Charger: true during active dive */
  public chargerDiving: boolean = false;
  /** Charger: player X at moment dive triggered */
  public chargerTargetX: number = 0;

  /**
   * @param row          Formation row index (0 = top)
   * @param col          Formation column index
   * @param instanceIndex Flat index in enemies[] array (row * cols + col)
   * @param type         Enemy archetype — determines geometry, stats, and AI behavior
   * @param hpMultiplier Wave HP scaling factor (default 1.0)
   */
  constructor(
    row: number,
    col: number,
    instanceIndex: number,
    type: EnemyType = 'grunt',
    hpMultiplier: number = 1.0,
  ) {
    this.row = row;
    this.col = col;
    this.instanceIndex = instanceIndex;
    this.type = type;

    // Determine AABB size: Grunt size varies by row; other types use fixed row-index
    const fixedRowIndex = TYPE_ROW_INDEX[type];
    const rowSizeIndex = fixedRowIndex !== null ? fixedRowIndex : Math.min(row, ROW_SIZES.length - 1);
    const rowSize = ROW_SIZES[rowSizeIndex];
    this.width = rowSize.halfW;
    this.height = rowSize.halfH;

    const def = ENEMY_DEFS[type];
    this.health = Math.ceil(def.hp * hpMultiplier);
    this.maxHealth = this.health;

    // Archetype-specific initialization
    if (type === 'shielder' && def.shieldHp !== undefined) {
      this.shieldActive = true;
      this.shieldHp = def.shieldHp;
    }

    if (type === 'charger') {
      // Randomize first dive delay: 3–7 seconds
      this.chargerDiveTimer = 3 + Math.random() * 4;
    }
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Row-based geometry factories (Grunt rendering — one geometry per row)
// ---------------------------------------------------------------------------

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
  // CCW fan from vertex 0
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
  // CCW fan from nose
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
  // CCW fan from vertex 0
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

/** Create per-row geometry factory array (used for Grunt rendering) */
const ROW_GEOMETRY_FACTORIES: Array<() => BufferGeometry> = [
  makeRow0Geometry,
  makeRow1Geometry,
  makeRow2Geometry,
  makeRow3Geometry,
];

// ---------------------------------------------------------------------------
// Archetype-specific geometry factories
// ---------------------------------------------------------------------------

/**
 * Grunt: delegates to row-based factory (row determines shape).
 */
function makeGruntGeometry(row: number): BufferGeometry {
  return ROW_GEOMETRY_FACTORIES[Math.min(row, ROW_GEOMETRY_FACTORIES.length - 1)]();
}

/**
 * Shielder: Wide rectangular hull 40×28 with a flat front shield bar.
 * Body: slightly inset rectangle. Shield: thick top band.
 * Color identity: bright magenta (0xff00ff).
 * 8 vertices — body (4) + shield top bar (4, sharing top edge of body).
 */
function makeShielderGeometry(): BufferGeometry {
  const hw = 20;   // half-width (40 total)
  const hh = 14;   // half-height (28 total)
  const shieldH = hh * 0.3; // shield band height
  const bodyTop = hh - shieldH; // body inset below shield

  // Shield band: full-width bar at top
  // Body: inset rectangle below shield
  const positions = new Float32Array([
    // Shield top bar (vertices 0-3)
    -hw,      hh, 0,  // 0 shield top-left
     hw,      hh, 0,  // 1 shield top-right
     hw, bodyTop, 0,  // 2 shield bottom-right
    -hw, bodyTop, 0,  // 3 shield bottom-left
    // Body rectangle (vertices 4-7)
    -hw * 0.85, bodyTop, 0,  // 4 body top-left (inset)
     hw * 0.85, bodyTop, 0,  // 5 body top-right (inset)
     hw * 0.85,     -hh, 0,  // 6 body bottom-right
    -hw * 0.85,     -hh, 0,  // 7 body bottom-left
  ]);
  const indices = new Uint16Array([
    // Shield band (CCW)
    0, 2, 1,  0, 3, 2,
    // Body (CCW)
    4, 6, 5,  4, 7, 6,
  ]);
  return buildGeometry(positions, indices);
}

/**
 * Flanker: Sideways-swept wing — asymmetric arrowhead suggesting lateral movement.
 * 6 vertices. Narrow vertically, wide horizontally.
 * Color identity: electric yellow (0xffff00).
 */
function makeFlankerGeometry(): BufferGeometry {
  const hw = 15;  // half-width
  const hh = 10;  // half-height
  // Asymmetric arrowhead: sharp left point, swept right trailing edges
  const positions = new Float32Array([
    -hw,       0, 0,  // 0 left tip (leading edge)
      0,      hh, 0,  // 1 top-center
     hw * 0.6, hh * 0.5, 0,  // 2 top-right
     hw,       0, 0,  // 3 right tip
     hw * 0.6,-hh * 0.5, 0,  // 4 bottom-right
      0,     -hh, 0,  // 5 bottom-center
  ]);
  // CCW fan from left tip
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
  return buildGeometry(positions, indices);
}

/**
 * Sniper: Tall thin cross/plus shape with elongated top barrel.
 * 16 vertices forming a clean + with the top arm extended.
 * Color identity: deep purple (0x9900ff).
 *
 * Layout (cross arms, CCW winding):
 *   Barrel (top arm), Center square, Horizontal arms, Base (bottom arm)
 */
function makeSniperGeometry(): BufferGeometry {
  const armW = 5;     // arm half-width
  const barrelH = 17; // top of barrel above center
  const baseH = 8;    // base of bottom arm below center
  const hArmW = 14;   // horizontal arm reach left/right
  const hArmH = 5;    // horizontal arm half-height (same as armW)

  // 12-vertex cross: barrel + left arm + right arm + base
  // Center region is implicitly covered by overlapping rectangles
  const positions = new Float32Array([
    // Barrel rect: top arm from y=hArmH to y=barrelH
    -armW,  hArmH,   0,  // 0
     armW,  hArmH,   0,  // 1
     armW,  barrelH, 0,  // 2
    -armW,  barrelH, 0,  // 3

    // Horizontal bar: full width from -hArmW to +hArmW, y in [-hArmH..+hArmH]
    -hArmW,  hArmH, 0,  // 4
     hArmW,  hArmH, 0,  // 5
     hArmW, -hArmH, 0,  // 6
    -hArmW, -hArmH, 0,  // 7

    // Base rect: bottom arm from y=-hArmH to y=-baseH
    -armW, -hArmH,  0,  // 8
     armW, -hArmH,  0,  // 9
     armW, -baseH,  0,  // 10
    -armW, -baseH,  0,  // 11
  ]);
  const indices = new Uint16Array([
    // Barrel (CCW)
    0, 2, 1,  0, 3, 2,
    // Horizontal bar (CCW)
    4, 6, 5,  4, 7, 6,
    // Base (CCW)
    8, 10, 9,  8, 11, 10,
  ]);
  return buildGeometry(positions, indices);
}

/**
 * Charger: Heavy rhombus/wedge with nose pointing down (charge direction).
 * 6 vertices. Wider than tall.
 * Color identity: hot orange (0xff6600).
 */
function makeChargerGeometry(): BufferGeometry {
  const hw = 19;  // half-width
  const hh = 13;  // half-height
  // Wedge: flat top, pointed bottom, wide shoulders
  const positions = new Float32Array([
    -hw * 0.5,  hh, 0,  // 0 top-left
     hw * 0.5,  hh, 0,  // 1 top-right
          hw,   0,  0,  // 2 right shoulder
       0,     -hh,  0,  // 3 nose (bottom center)
         -hw,   0,  0,  // 4 left shoulder
    -hw * 0.8, hh * 0.3, 0, // 5 upper-left (adds mass)
  ]);
  // CCW fan from top-left
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
  return buildGeometry(positions, indices);
}

/**
 * Swooper: Small arc/crescent shape, concave side facing forward.
 * 8 vertices forming a curved wing suggesting sweep motion.
 * Color identity: lime green (0x00ff44).
 */
function makeSwooperGeometry(): BufferGeometry {
  const hw = 13;  // half-width
  const hh = 10;  // half-height
  const inset = hh * 0.5; // depth of concave notch

  // Crescent: outer arc (top), inner concave notch (bottom)
  const positions = new Float32Array([
    -hw,       0, 0,  // 0 left tip
    -hw * 0.6, hh, 0,  // 1 upper-left
     hw * 0.6, hh, 0,  // 2 upper-right
     hw,       0, 0,  // 3 right tip
     hw * 0.4,-hh * 0.3, 0,  // 4 lower-right
         0,  -inset, 0,  // 5 concave center notch
    -hw * 0.4,-hh * 0.3, 0,  // 6 lower-left
    // repeat vertex 0 not needed — use fan
        0,   hh * 0.3, 0,  // 7 inner center (fill concave)
  ]);
  const indices = new Uint16Array([
    0, 2, 1,
    0, 3, 2,
    0, 4, 3,
    0, 7, 4,
    0, 5, 7,
    0, 6, 5,
  ]);
  return buildGeometry(positions, indices);
}

// ---------------------------------------------------------------------------
// Archetype geometry factory map (keyed by EnemyType, excludes grunt which
// uses makeGruntGeometry(row) with row parameter)
// ---------------------------------------------------------------------------
const ARCHETYPE_GEOMETRY_FACTORIES: Partial<Record<EnemyType, () => BufferGeometry>> = {
  shielder: makeShielderGeometry,
  flanker:  makeFlankerGeometry,
  sniper:   makeSniperGeometry,
  charger:  makeChargerGeometry,
  swooper:  makeSwooperGeometry,
};

// ---------------------------------------------------------------------------
// GridFormationLayout — satisfies FormationLayout from waveConfig.ts
// ---------------------------------------------------------------------------

/**
 * Grid-based formation layout: places enemies in a regular rows × cols grid.
 * Exported so SpawnSystem can reference it if needed.
 */
export class GridFormationLayout implements FormationLayout {
  constructor(
    public readonly rows: number,
    public readonly cols: number,
    public readonly colSpacing: number,
    public readonly rowSpacing: number,
  ) {}

  getPosition(
    row: number,
    col: number,
    formationX: number,
    formationY: number,
  ): { x: number; y: number } {
    return {
      x: formationX + (col - (this.cols - 1) / 2) * this.colSpacing,
      y: formationY - row * this.rowSpacing,
    };
  }
}

// ---------------------------------------------------------------------------
// Per-archetype emissive accent colors
// ---------------------------------------------------------------------------
const ARCHETYPE_COLORS: Record<EnemyType, number> = {
  grunt:    0x00ffff,
  shielder: 0xff00ff,
  flanker:  0xffff00,
  sniper:   0x9900ff,
  charger:  0xff6600,
  swooper:  0x00ff44,
};

const ENEMY_TYPES_ORDER: EnemyType[] = ['grunt', 'shielder', 'flanker', 'sniper', 'charger', 'swooper'];

/**
 * EnemyFormation: manages per-archetype InstancedMesh objects and formation march logic.
 * Owns all Enemy instances. AISystem calls updateMarch() each fixed step.
 *
 * Phase 3: replaced per-row meshes with per-type meshes (6 total, one per archetype).
 * spawnWave() now accepts a WaveConfig for data-driven formation building.
 * Public API remains 100% compatible — CollisionSystem and AISystem unchanged.
 */
export class EnemyFormation {
  public readonly enemies: Enemy[] = [];

  /**
   * Per-archetype instanced meshes. One InstancedMesh per enemy type.
   */
  public readonly typeMeshes: Map<EnemyType, InstancedMesh>;

  /**
   * Backward-compatibility alias: Array.from(typeMeshes.values()).
   * Game.ts iterates rowMeshes to register bloom — still works.
   */
  public get rowMeshes(): InstancedMesh[] {
    return Array.from(this.typeMeshes.values());
  }

  /**
   * @deprecated Phase 1 compatibility alias — points to the grunt mesh.
   */
  public get instancedMesh(): InstancedMesh {
    return this.typeMeshes.get('grunt')!;
  }

  // Formation position — all enemies relative to this anchor
  private formationX: number = 0;
  private formationY: number = (WORLD_HEIGHT / 2) - 80;

  // March state
  private marchDir: 1 | -1 = 1;
  private marchSpeed: number = ENEMY_BASE_MARCH_SPEED;
  private totalEnemies: number = 0;
  private activeEnemyCount: number = 0;

  // Active layout (set on spawnWave)
  private layout: GridFormationLayout;

  private readonly tmpMatrix = new Matrix4();

  constructor(scene: Scene) {
    this.typeMeshes = new Map();

    // Create one InstancedMesh per archetype type
    for (const type of ENEMY_TYPES_ORDER) {
      // For grunt, use row 0 geometry as default (formation rows use different shapes via Grunt row logic)
      // Since typeMeshes needs a single geometry per type, grunt uses row 0 (smallest) as default
      const factory = ARCHETYPE_GEOMETRY_FACTORIES[type];
      const geo = factory ? factory() : makeGruntGeometry(0);

      const mat = new MeshStandardMaterial({
        color: ARCHETYPE_COLORS[type],
        emissive: new Color(ARCHETYPE_COLORS[type]),
        emissiveIntensity: 1.0,
        roughness: 1.0,
        metalness: 0.0,
      });

      const mesh = new InstancedMesh(geo, mat, ENEMY_POOL_SIZE);
      mesh.count = 0;
      scene.add(mesh);
      this.typeMeshes.set(type, mesh);
    }

    // Default layout (will be replaced on spawnWave)
    this.layout = new GridFormationLayout(3, 8, 56, 44);

    this.spawnWave();
  }

  /**
   * Apply a neon palette color to all archetype materials.
   * Non-grunt types keep their distinct accent color blended: 70% palette, 30% type color.
   * Called by SpawnSystem on each new wave spawn.
   */
  public applyPalette(hexColor: number): void {
    const palette = new Color(hexColor);
    for (const [type, mesh] of this.typeMeshes) {
      const mat = mesh.material as MeshStandardMaterial;
      if (type === 'grunt') {
        // Grunt fully adopts wave palette
        mat.color.copy(palette);
        mat.emissive.copy(palette);
      } else {
        // Non-grunt: blend 70% palette + 30% type accent
        const accent = new Color(ARCHETYPE_COLORS[type]);
        const blended = new Color(
          palette.r * 0.7 + accent.r * 0.3,
          palette.g * 0.7 + accent.g * 0.3,
          palette.b * 0.7 + accent.b * 0.3,
        );
        mat.color.copy(blended);
        mat.emissive.copy(blended);
      }
    }
  }

  /**
   * Spawn a fresh wave of enemies using the given WaveConfig.
   * Config defaults to wave 1 for backward compatibility.
   */
  public spawnWave(config: WaveConfig = getWaveConfig(1)): void {
    this.enemies.length = 0;
    this.formationX = 0;
    this.formationY = (WORLD_HEIGHT / 2) - 80;
    this.marchDir = 1;
    this.marchSpeed = ENEMY_BASE_MARCH_SPEED * config.speedMultiplier;

    // Build GridFormationLayout from config
    this.layout = new GridFormationLayout(config.rows, config.cols, 56, 44);

    const totalEnemies = config.rows * config.cols;
    this.totalEnemies = totalEnemies;
    this.activeEnemyCount = totalEnemies;

    // Track mesh slot per type (sequential index within each type's InstancedMesh)
    const typeSlotCounters = new Map<EnemyType, number>();
    for (const type of ENEMY_TYPES_ORDER) {
      typeSlotCounters.set(type, 0);
    }

    // Build enemies array — row 0..rows-1, col 0..cols-1
    // Each row gets a homogeneous archetype determined by row index into allowedTypes
    for (let row = 0; row < config.rows; row++) {
      const typeIndex = row % config.allowedTypes.length;
      const type = config.allowedTypes[typeIndex];

      for (let col = 0; col < config.cols; col++) {
        const instanceIndex = row * config.cols + col;
        const enemy = new Enemy(row, col, instanceIndex, type, config.hpMultiplier);

        // Assign mesh slot within this type's InstancedMesh
        const slot = typeSlotCounters.get(type)!;
        enemy.meshSlot = slot;
        typeSlotCounters.set(type, slot + 1);

        this.enemies.push(enemy);
      }
    }

    // Update each typeMesh.count to the number of enemies of that type
    for (const [type, mesh] of this.typeMeshes) {
      mesh.count = typeSlotCounters.get(type)!;
    }

    // Hide all mesh slots initially (scale to zero), then updateAllMatrices sets active ones
    this._hideAllSlots();
    this.updateAllMatrices();
  }

  /**
   * Update formation march. Called by AISystem each fixed step.
   * Returns true if enemies have reached the bottom (game over trigger).
   */
  public updateMarch(dt: number): boolean {
    this.formationX += this.marchDir * this.marchSpeed * dt;

    // Find actual left/right extents of active enemies
    const wall = WORLD_WIDTH / 2;
    let rightEdge = -Infinity;
    let leftEdge  =  Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const pos = this.layout.getPosition(enemy.row, enemy.col, this.formationX, this.formationY);
      if (pos.x + enemy.width > rightEdge) rightEdge = pos.x + enemy.width;
      if (pos.x - enemy.width < leftEdge)  leftEdge  = pos.x - enemy.width;
    }

    if (this.marchDir === 1 && rightEdge >= wall) {
      this.formationX -= rightEdge - wall;
      this.formationY -= ENEMY_DROP_DISTANCE;
      this.marchDir = -1;
    } else if (this.marchDir === -1 && leftEdge <= -wall) {
      this.formationX += -wall - leftEdge;
      this.formationY -= ENEMY_DROP_DISTANCE;
      this.marchDir = 1;
    }

    this.updateAllMatrices();

    // Check if any enemy has reached the bottom
    const bottomBound = -(WORLD_HEIGHT / 2) + 60;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const pos = this.layout.getPosition(enemy.row, enemy.col, this.formationX, this.formationY);
      if (pos.y <= bottomBound) return true;
    }
    return false;
  }

  /**
   * Kill an enemy by instanceIndex. Updates march speed and deactivates instance.
   * instanceIndex is the flat index (row * cols + col) — same as Phase 1 API.
   */
  public killEnemy(instanceIndex: number): void {
    const enemy = this.enemies[instanceIndex];
    if (!enemy || !enemy.active) return;

    enemy.active = false;
    this.activeEnemyCount = Math.max(0, this.activeEnemyCount - 1);

    // Classic Space Invaders: speed increases per enemy destroyed
    const killed = this.totalEnemies - this.activeEnemyCount;
    this.marchSpeed = ENEMY_BASE_MARCH_SPEED * Math.pow(1 + ENEMY_MARCH_SPEEDUP, killed);

    // Hide this instance by scaling to zero in the type's InstancedMesh
    this.tmpMatrix.makeScale(0, 0, 0);
    const typeMesh = this.typeMeshes.get(enemy.type);
    if (typeMesh) {
      typeMesh.setMatrixAt(enemy.meshSlot, this.tmpMatrix);
      typeMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public get activeCount(): number {
    return this.activeEnemyCount;
  }

  /**
   * Get all active enemies of a given type. Used by AISystem for per-archetype behavior dispatch.
   */
  public getActiveEnemiesByType(type: EnemyType): Enemy[] {
    return this.enemies.filter(e => e.active && e.type === type);
  }

  /**
   * Get a random active enemy for firing purposes.
   * Front-row preference: picks from lowest active row of each column.
   */
  public getRandomFiringEnemy(): Enemy | null {
    if (this.activeEnemyCount === 0) return null;

    const cols = this.layout.cols;
    const rows = this.layout.rows;

    // Build list of front-row enemies (lowest row per column)
    const frontEnemies: Enemy[] = [];
    for (let col = 0; col < cols; col++) {
      for (let row = rows - 1; row >= 0; row--) {
        const enemy = this.enemies[row * cols + col];
        if (enemy && enemy.active) {
          frontEnemies.push(enemy);
          break;
        }
      }
    }

    if (frontEnemies.length === 0) return null;
    return frontEnemies[Math.floor(Math.random() * frontEnemies.length)];
  }

  /**
   * Set an enemy's world position independently of the formation grid.
   * Used by AISystem for Charger and Swooper independent movement.
   * Updates enemy.x / enemy.y and writes the translation matrix to the type mesh.
   */
  public setEnemyWorldPos(enemy: Enemy, x: number, y: number): void {
    enemy.x = x;
    enemy.y = y;
    this.tmpMatrix.makeTranslation(x, y, 0);
    const mesh = this.typeMeshes.get(enemy.type);
    if (mesh) {
      mesh.setMatrixAt(enemy.meshSlot, this.tmpMatrix);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Get world position of an enemy.
   * For enemies moving independently (Flanker charging, Charger diving, Swooper not in
   * formation phase) return stored enemy.x/y directly — those are maintained by AISystem.
   * Otherwise, calculate from the formation grid anchor.
   */
  public getEnemyWorldPos(enemy: Enemy): { x: number; y: number } {
    if (
      enemy.flankerCharging ||
      enemy.chargerDiving ||
      enemy.swooperPhase !== 'formation'
    ) {
      return { x: enemy.x, y: enemy.y };
    }
    return this.layout.getPosition(enemy.row, enemy.col, this.formationX, this.formationY);
  }

  /** Get world AABB for an enemy (for collision detection) */
  public getEnemyAABB(enemy: Enemy): { x: number; y: number; w: number; h: number } {
    const pos = this.getEnemyWorldPos(enemy);
    return { x: pos.x, y: pos.y, w: enemy.width, h: enemy.height };
  }

  /** Scale all mesh slots to zero before a fresh wave spawn */
  private _hideAllSlots(): void {
    this.tmpMatrix.makeScale(0, 0, 0);
    for (const [, mesh] of this.typeMeshes) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.setMatrixAt(i, this.tmpMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateAllMatrices(): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const pos = this.layout.getPosition(enemy.row, enemy.col, this.formationX, this.formationY);
      this.tmpMatrix.makeTranslation(pos.x, pos.y, 0);
      const typeMesh = this.typeMeshes.get(enemy.type);
      if (typeMesh) {
        typeMesh.setMatrixAt(enemy.meshSlot, this.tmpMatrix);
      }
    }
    // Mark all type meshes as needing update
    for (const [, mesh] of this.typeMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
