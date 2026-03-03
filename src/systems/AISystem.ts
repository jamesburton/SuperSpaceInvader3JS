import type { EnemyFormation } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import { ENEMY_FIRE_RATE } from '../utils/constants';

const BASE_FIRE_INTERVAL = 1 / ENEMY_FIRE_RATE;

export class AISystem {
  private fireAccumulator: number = 0;
  private fireInterval: number = BASE_FIRE_INTERVAL; // seconds between formation shots

  /**
   * Update formation march and enemy firing.
   * @returns true if enemies have reached the bottom (triggers game over)
   */
  public update(
    dt: number,
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
  ): boolean {
    // Formation march
    const reachedBottom = formation.updateMarch(dt);
    if (reachedBottom) return true;

    // Enemy firing: Poisson-style interval across whole formation
    this.fireAccumulator += dt;
    if (this.fireAccumulator >= this.fireInterval) {
      this.fireAccumulator -= this.fireInterval;
      this.tryEnemyFire(formation, enemyBulletPool, activeBullets);
    }

    return false;
  }

  private tryEnemyFire(
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
  ): void {
    const firingEnemy = formation.getRandomFiringEnemy();
    if (!firingEnemy) return;

    const bullet = enemyBulletPool.acquire();
    if (bullet === null) return; // pool exhausted, skip

    const pos = formation.getEnemyWorldPos(firingEnemy);
    // Spawn bullet below enemy (enemy fires downward)
    bullet.init(pos.x, pos.y - firingEnemy.height - 10, false);
    activeBullets.push(bullet);
  }

  /**
   * Set fire rate multiplier from WaveConfig.
   * Higher multiplier = faster fire rate (shorter interval).
   */
  public setFireRateMultiplier(multiplier: number): void {
    this.fireInterval = BASE_FIRE_INTERVAL / multiplier;
  }

  /** Reset fire accumulator and multiplier on wave start */
  public reset(): void {
    this.fireAccumulator = 0;
    this.fireInterval = BASE_FIRE_INTERVAL;
  }
}
