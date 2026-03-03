import type { EnemyFormation } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import type { HUD } from '../ui/HUD';
import type { AISystem } from './AISystem';
import { runState } from '../state/RunState';
import { wavePalette } from '../config/palettes';
import { getWaveConfig } from '../config/waveConfig';

export class SpawnSystem {
  private waveTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private readonly TRANSITION_DELAY = 2.5; // seconds before new wave spawns

  // Shop trigger state
  private _shopPending: boolean = false;

  /** Readable by PlayingState to know when shop should open */
  public get shopPending(): boolean { return this._shopPending; }

  /** Call after PlayingState has handled the shop (clears the flag) */
  public clearShopPending(): void { this._shopPending = false; }

  /**
   * Apply Wave 1 palette to the formation at game start.
   * Call this from Game.ts after constructing spawnSystem and formation,
   * before entering the first state, so enemies spawn with cyan color.
   */
  public initPalette(formation: EnemyFormation): void {
    formation.applyPalette(wavePalette.getColor(1));
  }

  /**
   * Check if wave is clear; if so, begin transition to next wave.
   * Returns true if currently in wave transition (pause AI/collision during this).
   */
  public update(
    dt: number,
    formation: EnemyFormation,
    playerBulletPool: ObjectPool<Bullet>,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    hud: HUD,
    aiSystem: AISystem,
  ): boolean {
    if (this.waveTransitioning) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.waveTransitioning = false;
        this.startNextWave(formation, playerBulletPool, enemyBulletPool, activeBullets, aiSystem);
      }
      return true; // still transitioning
    }

    // Check if all enemies cleared
    if (formation.activeCount === 0 && !this.waveTransitioning) {
      // Capture current wave config BEFORE advancing (shopAfterThisWave belongs to wave just cleared)
      const currentConfig = getWaveConfig(runState.wave);
      runState.nextWave();
      this.waveTransitioning = true;
      this.transitionTimer = this.TRANSITION_DELAY;
      hud.showWaveAnnouncement(runState.wave, wavePalette.getColor(runState.wave));

      // Check if shop should trigger (based on the wave just completed)
      if (currentConfig.shopAfterThisWave) {
        this._shopPending = true;
        // Small buffer: extend transition to give shop time before wave spawns
        this.transitionTimer = this.TRANSITION_DELAY + 0.5;
      }
    }

    return false;
  }

  private startNextWave(
    formation: EnemyFormation,
    playerBulletPool: ObjectPool<Bullet>,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    aiSystem: AISystem,
  ): void {
    // Clear all active bullets
    activeBullets.forEach((b) => {
      if (b.isPlayerBullet) playerBulletPool.release(b);
      else enemyBulletPool.release(b);
    });
    activeBullets.length = 0;

    // Fetch config for the new wave and spawn it
    const config = getWaveConfig(runState.wave);
    formation.spawnWave(config);

    // Apply wave-specific neon palette color
    formation.applyPalette(wavePalette.getColor(runState.wave));

    // Apply escalation multipliers — reset first, then re-apply so interval is correct
    aiSystem.reset();
    aiSystem.setFireRateMultiplier(config.fireRateMultiplier);
  }

  public reset(): void {
    this.waveTransitioning = false;
    this.transitionTimer = 0;
    this._shopPending = false;
  }
}
