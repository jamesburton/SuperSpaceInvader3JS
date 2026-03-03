import type { Mesh, InstancedMesh } from 'three';
import type { EnemyType } from '../config/enemies';

// Base interface for all poolable objects
export interface PooledObject {
  active: boolean;
  mesh: Mesh | null;
}

// Entity position/velocity data (used by movement system)
export interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;   // AABB half-width for collision
  height: number;  // AABB half-height for collision
  active: boolean;
}

// Player bullet entity
export interface BulletEntity extends Entity {
  isPlayerBullet: boolean;
  mesh: Mesh | null;
}

// Enemy entity data
export interface EnemyEntity extends Entity {
  health: number;
  maxHealth: number;
  type: EnemyType;     // Phase 3: all six archetypes
  row: number;         // Formation row (0 = top)
  col: number;         // Formation column (0 = left)
  instanceIndex: number; // Index into InstancedMesh for matrix/color updates
}

// High-level game phase state (used by StateManager in Phase 1)
export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

// Game mode — determines whether the player is in endless roguelite or structured campaign
export type GameMode = 'endless' | 'campaign';

// Run-level ephemeral state
export interface RunStateData {
  score: number;
  lives: number;
  wave: number;
  enemiesKilled: number;
  gamePhase: GamePhase;
  gold: number;  // Gold accumulated during this run (in-run only, resets on run end)
  siEarnedThisRun: number; // SI$ earned this run via wave clears (for run-end display)
}

// InstancedMesh wrapper for enemy rendering
export interface EnemyInstancedRenderer {
  mesh: InstancedMesh;
  count: number;           // current active instance count
  maxCount: number;        // pre-allocated size
}
