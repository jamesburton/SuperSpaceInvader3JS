import type { EnemyFormation } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import type { HUD } from '../ui/HUD';
import { runState } from '../state/RunState';

export class SpawnSystem {
  private waveTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private readonly TRANSITION_DELAY = 2.5; // seconds before new wave spawns

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
  ): boolean {
    if (this.waveTransitioning) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.waveTransitioning = false;
        this.startNextWave(formation, playerBulletPool, enemyBulletPool, activeBullets);
      }
      return true; // still transitioning
    }

    // Check if all enemies cleared
    if (formation.activeCount === 0 && !this.waveTransitioning) {
      runState.nextWave();
      this.waveTransitioning = true;
      this.transitionTimer = this.TRANSITION_DELAY;
      hud.showWaveAnnouncement(runState.wave);
    }

    return false;
  }

  private startNextWave(
    formation: EnemyFormation,
    playerBulletPool: ObjectPool<Bullet>,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
  ): void {
    // Clear all active bullets
    activeBullets.forEach((b) => {
      if (b.isPlayerBullet) playerBulletPool.release(b);
      else enemyBulletPool.release(b);
    });
    activeBullets.length = 0;

    // Spawn new wave
    formation.spawnWave();
  }

  public reset(): void {
    this.waveTransitioning = false;
    this.transitionTimer = 0;
  }
}
