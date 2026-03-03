import type { BossEnemy } from '../entities/Boss';
import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import { BOSS_DEF } from '../config/boss';

/** Horizontal movement boundary (±units from center). */
const MOVE_BOUND = 280;

/** Boss bullet speed (slightly slower than regular enemy bullets for readability). */
const BULLET_SPD = 280;

/**
 * BossSystem: manages the boss encounter update loop.
 *
 * Phase 1 attack — Aimed spread shots (3-way):
 *   Boss fires at player X position with ±25° spread at BOSS_DEF.phases[0].fireRate.
 *
 * Phase 2 attack — Sweeping horizontal beam:
 *   Boss fires 5 bullets evenly across −60° to +60° from straight down
 *   at BOSS_DEF.phases[1].fireRate.
 *
 * Phase transition:
 *   When boss.healthFraction() <= 0.5 while in phase 1:
 *   - Sets currentPhase = 2
 *   - Triggers 0.4s white flash then settles to phase 2 color (orange)
 *   - Resets attack timer
 *   - Sets phaseJustChanged flag (auto-reset on read — for camera shake)
 *
 * Boss oscillates horizontally: 60 units/sec in phase 1, 100 units/sec in phase 2.
 */
export class BossSystem {
  private attackTimer: number = 0;
  private moveDir: number = 1;       // +1 = right, -1 = left
  private flashTimer: number = 0;    // countdown for phase transition flash
  private _phaseJustChanged: boolean = false;

  /**
   * True for exactly one update() call after phase transition — for camera shake trigger.
   * Auto-resets to false on read.
   */
  public get phaseJustChanged(): boolean {
    const v = this._phaseJustChanged;
    this._phaseJustChanged = false;
    return v;
  }

  public update(
    dt: number,
    boss: BossEnemy,
    playerX: number,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
  ): void {
    if (!boss.active) return;

    // --- Phase transition check ---
    if (boss.currentPhase === 1 && boss.healthFraction() <= 0.5) {
      boss.currentPhase = 2;
      this._phaseJustChanged = true;
      this.flashTimer = 0.4;       // 0.4s flash duration
      this.attackTimer = 0;        // reset attack pattern on transition
      boss.applyFlashColor(1);     // phase[1] flashColor = 0xFFFFFF (white)
    }

    // --- Flash timer (phase transition telegraph) ---
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        boss.applyPhaseColor(1);   // settle to phase 2 color (orange)
      }
    }

    // --- Horizontal movement ---
    const moveSpeed = boss.currentPhase === 1 ? 60 : 100;
    boss.x += this.moveDir * moveSpeed * dt;
    if (boss.x > MOVE_BOUND) {
      boss.x = MOVE_BOUND;
      this.moveDir = -1;
    }
    if (boss.x < -MOVE_BOUND) {
      boss.x = -MOVE_BOUND;
      this.moveDir = 1;
    }
    boss.updateMesh();

    // --- Attack timer ---
    const phaseIdx = (boss.currentPhase - 1) as 0 | 1;
    const fireInterval = 1 / BOSS_DEF.phases[phaseIdx].fireRate;
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.attackTimer = fireInterval;
      this.fire(boss, playerX, enemyBulletPool, activeBullets, boss.currentPhase);
    }
  }

  private fire(
    boss: BossEnemy,
    playerX: number,
    pool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    phase: 1 | 2,
  ): void {
    // Fire from bottom edge of boss hull
    const bx = boss.x;
    const by = boss.y - boss.height - 8;

    if (phase === 1) {
      // Aimed spread: 3 bullets aimed at player position ±25 degrees
      const dx = playerX - bx;
      const dy = -600; // strongly downward aim (player is below)
      const baseAngle = Math.atan2(dy, dx);
      const spread = 25 * (Math.PI / 180);
      for (const offset of [-spread, 0, spread]) {
        const b = pool.acquire();
        if (!b) continue;
        b.init(bx, by, false);
        b.vx = Math.cos(baseAngle + offset) * BULLET_SPD;
        b.vy = Math.sin(baseAngle + offset) * BULLET_SPD;
        activeBullets.push(b);
      }
    } else {
      // Sweeping beam: 5 bullets across -60° to +60° from straight down
      // Straight down = -π/2; spread is added to that base angle
      const angles = [-60, -30, 0, 30, 60].map(d => d * Math.PI / 180 - Math.PI / 2);
      for (const angle of angles) {
        const b = pool.acquire();
        if (!b) continue;
        b.init(bx, by, false);
        b.vx = Math.cos(angle) * BULLET_SPD;
        b.vy = Math.sin(angle) * BULLET_SPD;
        activeBullets.push(b);
      }
    }
  }

  /** Reset system state — call when boss encounter resets or on game restart. */
  public reset(): void {
    this.attackTimer = 0;
    this.moveDir = 1;
    this.flashTimer = 0;
    this._phaseJustChanged = false;
  }
}
