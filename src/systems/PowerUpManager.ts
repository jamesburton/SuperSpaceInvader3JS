import type { Scene, Object3D } from 'three';
import { ObjectPool } from '../core/ObjectPool';
import { PickupToken } from '../entities/PickupToken';
import type { PowerUpType } from '../config/powerups';
import { POWER_UP_DEFS, POWER_UP_TYPES } from '../config/powerups';

const PICKUP_POOL_SIZE = 16;

/**
 * PowerUpManager owns the PickupToken pool, active power-up state, drop spawning,
 * and duration ticking. CollisionSystem wires this in Plan 03-06.
 *
 * Responsibilities:
 * - trySpawnDrop()    — called by CollisionSystem after enemy kill
 * - collectPickup()  — called by CollisionSystem on player-token AABB overlap
 * - isActive(type)   — queried by WeaponSystem to determine shot pattern
 * - update(dt)       — ticks active power-up duration and drifts tokens downward
 * - releaseAll()     — call on wave reset or run end
 */
export class PowerUpManager {
  private readonly pool: ObjectPool<PickupToken>;
  private readonly activeTokens: PickupToken[] = [];

  // Active power-up state — only one non-shield power-up active at a time (last collected wins)
  private activePowerUp: PowerUpType | null = null;
  private activeDuration: number = 0;

  // Shield absorb state — absorbs one hit, then expires
  private shieldCharges: number = 0;

  constructor(scene: Scene) {
    this.pool = new ObjectPool<PickupToken>(
      () => new PickupToken(scene),
      PICKUP_POOL_SIZE,
    );
  }

  /**
   * Try to spawn a power-up drop at (x, y).
   * Rolls against dropChance (0–1); selects a random PowerUpType uniformly.
   * Called by CollisionSystem after enemy kill in Plan 03-06.
   */
  public trySpawnDrop(x: number, y: number, dropChance: number): void {
    if (Math.random() > dropChance) return;
    const token = this.pool.acquire();
    if (!token) return;
    const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
    token.init(x, y, type);
    this.activeTokens.push(token);
  }

  /**
   * Activate a collected power-up token. Last collected wins (replaces current active).
   * Shield type: adds a single shield charge instead of a timed duration.
   * Returns the display name string for PickupFeedback (Plan 03-07 wiring).
   * Releases the token back to pool immediately.
   */
  public collectPickup(token: PickupToken): string {
    const def = POWER_UP_DEFS[token.type];
    if (token.type === 'shield') {
      this.shieldCharges = 1; // one absorb charge
    } else {
      this.activePowerUp = token.type;
      this.activeDuration = def.duration;
    }
    const idx = this.activeTokens.indexOf(token);
    if (idx !== -1) this.activeTokens.splice(idx, 1);
    this.pool.release(token);
    return def.displayName;
  }

  /**
   * Query whether a power-up type is currently active.
   * WeaponSystem calls isActive('spreadShot') / isActive('rapidFire') each fixed step.
   * CollisionSystem calls isActive('shield') before applying player damage.
   */
  public isActive(type: PowerUpType): boolean {
    if (type === 'shield') return this.shieldCharges > 0;
    return this.activePowerUp === type && this.activeDuration > 0;
  }

  /**
   * Called when player takes a hit while shield is active.
   * Consumes one shield charge and returns true (hit absorbed).
   * Returns false if no shield charges remain.
   */
  public consumeShieldCharge(): boolean {
    if (this.shieldCharges > 0) {
      this.shieldCharges = 0;
      return true; // absorbed
    }
    return false;
  }

  /** Remaining duration for active timed power-up in seconds. 0 if none. For HUD display. */
  public get activeDurationRemaining(): number {
    return this.activeDuration;
  }

  /** Full duration for the currently active power-up type. For HUD percentage bar. */
  public get activeDurationFull(): number {
    if (!this.activePowerUp) return 0;
    return POWER_UP_DEFS[this.activePowerUp].duration;
  }

  /** Currently active timed power-up type, or null if none. */
  public get activePowerUpType(): PowerUpType | null {
    return this.activePowerUp;
  }

  /** Number of shield charges remaining (0 or 1). */
  public get activeShieldCharges(): number {
    return this.shieldCharges;
  }

  /**
   * Update all active tokens (drift down) and tick active power-up duration.
   * Cull tokens that exit the world bottom (update() returns false).
   * Call each fixed step.
   */
  public update(dt: number): void {
    // Tick active timed power-up
    if (this.activePowerUp && this.activeDuration > 0) {
      this.activeDuration -= dt;
      if (this.activeDuration <= 0) {
        this.activeDuration = 0;
        this.activePowerUp = null;
      }
    }

    // Drift tokens downward — release any that exit the world bottom
    for (let i = this.activeTokens.length - 1; i >= 0; i--) {
      const token = this.activeTokens[i];
      const alive = token.update(dt);
      if (!alive) {
        this.pool.release(token);
        this.activeTokens.splice(i, 1);
      }
    }
  }

  /**
   * Release all active tokens and reset power-up state.
   * Call on wave reset or run end.
   */
  public releaseAll(): void {
    for (const token of this.activeTokens) {
      this.pool.release(token);
    }
    this.activeTokens.length = 0;
    this.activePowerUp = null;
    this.activeDuration = 0;
    this.shieldCharges = 0;
  }

  /**
   * Get active tokens array — CollisionSystem iterates this for player-vs-token AABB checks.
   * Readonly to prevent external mutation.
   */
  public getActiveTokens(): readonly PickupToken[] {
    return this.activeTokens;
  }

  /**
   * Register all token meshes with selective bloom selection.
   * Call once from Game.init() after PowerUpManager is constructed.
   */
  public registerBloom(addToBloom: (mesh: Object3D) => void): void {
    this.pool.forEach(t => addToBloom(t.mesh));
  }
}
