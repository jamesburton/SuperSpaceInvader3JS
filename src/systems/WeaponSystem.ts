import type { InputManager } from '../core/InputManager';
import type { ObjectPool } from '../core/ObjectPool';
import type { Player } from '../entities/Player';
import type { Bullet } from '../entities/Bullet';

/**
 * WeaponSystem handles player fire input and bullet pool acquisition.
 *
 * Note: The active fire path for Plan 02 is inlined in Game.update() to keep
 * activeBullets management local to the Game. This class exists for Plans 03+
 * enemy weapon logic and will take over player fire in Plan 04 refactor.
 */
export class WeaponSystem {
  public update(
    _dt: number,
    input: InputManager,
    player: Player,
    playerBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
  ): void {
    if (!player.active) return;

    const wantsToFire = input.justPressed('Space');

    if (wantsToFire && player.canFire()) {
      const bullet = playerBulletPool.acquire();
      if (bullet !== null) {
        // Spawn bullet at barrel tip (top center of player ship)
        bullet.init(player.x, player.y + player.height + 10, true);
        activeBullets.push(bullet);
        player.recordFire();
      }
      // null = pool exhausted — silently skip (64-slot pool is more than enough)
    }
  }
}
