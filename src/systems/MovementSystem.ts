import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import { WORLD_HEIGHT, BULLET_HEIGHT } from '../utils/constants';

// Cull bounds: bullets are released when fully past top or bottom edge
const CULL_TOP = WORLD_HEIGHT / 2 + BULLET_HEIGHT;
const CULL_BOTTOM = -(WORLD_HEIGHT / 2) - BULLET_HEIGHT;

/**
 * MovementSystem moves all active bullets each fixed step and releases
 * out-of-bounds bullets back to their respective pools.
 * Also tracks player horizontal movement state for engine trail effects (Plan 03).
 */
export class MovementSystem {
  /**
   * True when the player is pressing left or right this fixed step.
   * Read by PlayingState.update() (wired in Plan 04) to decide whether to call
   * particleManager.spawnEngineTrail().
   */
  public isMovingHorizontally: boolean = false;

  /**
   * Record current player movement direction from input.
   * Call from PlayingState BEFORE player.update() each fixed step.
   *
   * @param leftHeld Whether the left key is currently held
   * @param rightHeld Whether the right key is currently held
   */
  public trackPlayerMovement(leftHeld: boolean, rightHeld: boolean): void {
    this.isMovingHorizontally = leftHeld || rightHeld;
  }

  /**
   * Move all active bullets. Splice and release bullets that exit the screen.
   * Iterates backwards to allow safe in-place removal.
   *
   * @param dt Fixed timestep in seconds
   * @param activeBullets Mutable list of live bullets (spliced on cull)
   * @param playerPool Player bullet pool (for release)
   * @param enemyPool Enemy bullet pool (for release)
   */
  public updateBullets(
    dt: number,
    activeBullets: Bullet[],
    playerPool: ObjectPool<Bullet>,
    enemyPool: ObjectPool<Bullet>,
  ): void {
    for (let i = activeBullets.length - 1; i >= 0; i--) {
      const bullet = activeBullets[i];
      if (!bullet.active) continue;

      bullet.y += bullet.vy * dt;
      bullet.syncMesh();

      // Cull out-of-bounds bullets back to pool
      if (bullet.isPlayerBullet && bullet.y > CULL_TOP) {
        playerPool.release(bullet);
        activeBullets.splice(i, 1);
      } else if (!bullet.isPlayerBullet && bullet.y < CULL_BOTTOM) {
        enemyPool.release(bullet);
        activeBullets.splice(i, 1);
      }
    }
  }
}
