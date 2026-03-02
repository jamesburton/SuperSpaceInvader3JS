import type { Bullet } from '../entities/Bullet';
import type { Player } from '../entities/Player';
import type { EnemyFormation } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import { runState } from '../state/RunState';
import { ENEMY_DEFS } from '../config/enemies';
import { PLAYER_INVINCIBILITY_DURATION } from '../utils/constants';

/** AABB overlap test: true if two axis-aligned boxes overlap */
function aabbOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return Math.abs(ax - bx) < aw + bw && Math.abs(ay - by) < ah + bh;
}

export class CollisionSystem {
  private playerInvincibility: number = 0; // countdown timer in seconds

  /**
   * Check player bullets vs enemies, enemy bullets vs player.
   * Mutates runState.score, runState.lives, and formation on hits.
   */
  public update(
    dt: number,
    activeBullets: Bullet[],
    player: Player,
    formation: EnemyFormation,
    playerBulletPool: ObjectPool<Bullet>,
    enemyBulletPool: ObjectPool<Bullet>,
  ): void {
    // Tick down player invincibility
    if (this.playerInvincibility > 0) {
      this.playerInvincibility -= dt;
      // Flash player mesh during invincibility (toggle visibility every 0.1s)
      player.mesh.visible = Math.floor(this.playerInvincibility / 0.1) % 2 === 0;
    } else {
      player.mesh.visible = true;
    }

    const bulletsToRelease: Array<{ bullet: Bullet; pool: ObjectPool<Bullet> }> = [];

    for (const bullet of activeBullets) {
      if (!bullet.active) continue;

      if (bullet.isPlayerBullet) {
        // Player bullet vs each active enemy
        for (const enemy of formation.enemies) {
          if (!enemy.active) continue;
          const aabb = formation.getEnemyAABB(enemy);

          if (aabbOverlap(bullet.x, bullet.y, bullet.width, bullet.height,
                          aabb.x, aabb.y, aabb.w, aabb.h)) {
            // Hit registered
            enemy.health -= 1;
            bulletsToRelease.push({ bullet, pool: playerBulletPool });

            if (enemy.health <= 0) {
              formation.killEnemy(enemy.instanceIndex);
              runState.addScore(ENEMY_DEFS[enemy.type].scoreValue);
              runState.recordKill();
            }
            break; // bullet consumed by first hit — stop checking this bullet
          }
        }
      } else {
        // Enemy bullet vs player
        if (this.playerInvincibility <= 0 && player.active) {
          if (aabbOverlap(bullet.x, bullet.y, bullet.width, bullet.height,
                          player.x, player.y, player.width, player.height)) {
            bulletsToRelease.push({ bullet, pool: enemyBulletPool });
            runState.loseLife();
            this.playerInvincibility = PLAYER_INVINCIBILITY_DURATION;
          }
        }
      }
    }

    // Release hit bullets and remove from activeBullets
    for (const { bullet, pool } of bulletsToRelease) {
      pool.release(bullet);
      const idx = activeBullets.indexOf(bullet);
      if (idx !== -1) activeBullets.splice(idx, 1);
    }
  }

  public reset(): void {
    this.playerInvincibility = 0;
  }
}
