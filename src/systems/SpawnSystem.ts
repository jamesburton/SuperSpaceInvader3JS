import type { EnemyFormation } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import type { HUD } from '../ui/HUD';
import type { AISystem } from './AISystem';
import { runState } from '../state/RunState';
import { wavePalette } from '../config/palettes';
import { getWaveConfig } from '../config/waveConfig';
import type { WaveConfig } from '../config/waveConfig';
import { BOSS_TRIGGER_WAVE } from '../utils/constants';
import type { DifficultySetting } from '../state/runSetup';

export class SpawnSystem {
  private waveTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private readonly TRANSITION_DELAY = 2.5; // seconds before new wave spawns

  /** Called once immediately after each wave is cleared (after nextWave()). Used for bunker auto-repair. */
  public onWaveCleared: (() => void) | null = null;

  // Shop trigger state
  private _shopPending: boolean = false;

  /** Readable by PlayingState to know when shop should open */
  public get shopPending(): boolean { return this._shopPending; }

  /** Call after PlayingState has handled the shop (clears the flag) */
  public clearShopPending(): void { this._shopPending = false; }

  // Boss trigger state
  private _bossPending: boolean = false;

  /** Readable by PlayingState to know when boss encounter should start */
  public get bossPending(): boolean { return this._bossPending; }

  /** Call after PlayingState has handled the boss encounter start (clears the flag) */
  public clearBossPending(): void { this._bossPending = false; }

  // Campaign level wave override
  private levelWaves: WaveConfig[] | null = null;
  private levelWaveIndex: number = 0;
  private _levelCompletePending: boolean = false;
  private difficulty: DifficultySetting = 'normal';

  /** True when campaign level waves are exhausted — PlayingState should handle level-complete routing */
  public get levelCompletePending(): boolean { return this._levelCompletePending; }

  /** Call after PlayingState has handled level-complete (clears the flag) */
  public clearLevelCompletePending(): void { this._levelCompletePending = false; }

  /**
   * Set the wave config array for the current campaign level.
   * Pass null to return to endless (getWaveConfig) behaviour.
   * Call before entering a new campaign level.
   */
  public setLevelWaves(waves: WaveConfig[] | null): void {
    this.levelWaves = waves;
    this.levelWaveIndex = 0;
    this._levelCompletePending = false;
  }

  public setDifficulty(difficulty: DifficultySetting): void {
    this.difficulty = difficulty;
  }

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
      const currentConfig = getWaveConfig(runState.wave, this.difficulty);
      runState.nextWave();
      this.onWaveCleared?.(); // e.g. bunker auto-repair
      this.waveTransitioning = true;
      this.transitionTimer = this.TRANSITION_DELAY;
      hud.showWaveAnnouncement(runState.wave, wavePalette.getColor(runState.wave));

      // Check if shop should trigger (based on the wave just completed)
      if (currentConfig.shopAfterThisWave) {
        this._shopPending = true;
        // Small buffer: extend transition to give shop time before wave spawns
        this.transitionTimer = this.TRANSITION_DELAY + 0.5;
      }

      // Check if boss encounter should trigger (wave just cleared was BOSS_TRIGGER_WAVE)
      // runState.nextWave() has already been called — wave just cleared is runState.wave - 1
      const clearedWave = runState.wave - 1;
      if (clearedWave === BOSS_TRIGGER_WAVE) {
        this._bossPending = true;
      }
    }

    return false;
  }

  /**
   * Returns the next WaveConfig to spawn.
   * In campaign mode (levelWaves !== null): returns waves in sequence; sets _levelCompletePending when exhausted.
   * In endless mode (levelWaves === null): delegates to getWaveConfig(runState.wave).
   */
  private getNextWaveConfig(): WaveConfig {
    if (this.levelWaves !== null) {
      if (this.levelWaveIndex < this.levelWaves.length) {
        return this.levelWaves[this.levelWaveIndex++];
      }
      // Campaign level waves exhausted — signal level complete instead of spawning
      this._levelCompletePending = true;
      // Return a dummy config; PlayingState will handle level-complete before next spawn
      return this.levelWaves[this.levelWaves.length - 1];
    }
    return getWaveConfig(runState.wave, this.difficulty);
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

    // Fetch config for the new wave (campaign or endless) and spawn it
    const config = this.getNextWaveConfig();
    if (this._levelCompletePending) return; // PlayingState handles level-complete routing

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
    this._bossPending = false;
    this.onWaveCleared = null;
    this.levelWaves = null;
    this.levelWaveIndex = 0;
    this._levelCompletePending = false;
    this.difficulty = 'normal';
  }
}
