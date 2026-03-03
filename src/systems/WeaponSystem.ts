import type { InputManager } from '../core/InputManager';
import type { ObjectPool } from '../core/ObjectPool';
import type { Player } from '../entities/Player';
import type { Bullet } from '../entities/Bullet';
import type { ParticleManager } from '../effects/ParticleManager';
import type { PowerUpManager } from './PowerUpManager';

// Rapid fire cooldown override — 0.08s = ~12 shots/second
const RAPID_FIRE_COOLDOWN = 0.08;

/**
 * WeaponSystem handles player fire input and bullet pool acquisition.
 *
 * Phase 3 refactor: WeaponSystem is now the canonical player fire path.
 * PlayingState delegates all firing to WeaponSystem.update() instead of inlining.
 *
 * Power-up-aware:
 * - spreadShot: fires 3 bullets (left/center/right angled) using vx decomposition
 * - rapidFire:  overrides fire cooldown to 0.08s after recordFire()
 */
export class WeaponSystem {
  /**
   * Update player firing logic. Checks fire input, acquires bullets from pool,
   * applies spread shot and rapid fire power-ups, and triggers muzzle flash.
   *
   * @param dt              Fixed timestep in seconds
   * @param input           InputManager for justPressed('Space') check
   * @param player          Player entity (position, canFire, recordFire, setFireCooldown)
   * @param playerBulletPool Pool to acquire bullets from
   * @param activeBullets   Shared active bullet list — acquired bullets pushed here
   * @param particleManager Optional — if provided, spawns muzzle flash on fire
   * @param powerUpManager  Optional — if provided, queries spreadShot and rapidFire state
   */
  public update(
    _dt: number,
    input: InputManager,
    player: Player,
    playerBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    particleManager?: ParticleManager,
    powerUpManager?: PowerUpManager,
  ): void {
    if (!player.active) return;

    const wantsToFire = input.justPressed('Space');

    if (wantsToFire && player.canFire()) {
      this.fireShot(player, playerBulletPool, activeBullets, powerUpManager);

      // Record fire (sets standard cooldown via fireCooldownMultiplier)
      player.recordFire();

      // Rapid fire override: shorten cooldown to 0.08s
      if (powerUpManager?.isActive('rapidFire')) {
        player.setFireCooldown(RAPID_FIRE_COOLDOWN);
      }

      // Muzzle flash at barrel tip
      if (particleManager) {
        particleManager.spawnMuzzleFlash(player.x, player.y + player.height + 10);
      }
    }
  }

  /**
   * Fire one or more bullets depending on power-up state.
   * Spread shot: 3 bullets at -0.4, 0, +0.4 radian offsets from vertical (~23°).
   * Normal shot: 1 bullet straight up.
   */
  private fireShot(
    player: Player,
    playerBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    powerUpManager?: PowerUpManager,
  ): void {
    const isSpread = powerUpManager?.isActive('spreadShot') ?? false;
    // Angle offsets in radians from vertical (0 = straight up, positive = right)
    const angles = isSpread ? [-0.4, 0, 0.4] : [0];

    for (const angleOffset of angles) {
      const bullet = playerBulletPool.acquire();
      if (!bullet) break; // pool exhausted — silently skip remaining bullets

      // Spawn at barrel tip (top center of player ship)
      bullet.init(player.x, player.y + player.height + 10, true);

      if (isSpread && angleOffset !== 0) {
        // Decompose bullet speed into angled trajectory (negative vy = upward)
        const speed = Math.abs(bullet.vy); // BULLET_SPEED from init()
        bullet.vx = Math.sin(angleOffset) * speed;
        bullet.vy = -Math.cos(angleOffset) * speed; // negative = upward
        bullet.setColor(0x0088ff); // spread bullets: blue (FEEL-07)
      }

      activeBullets.push(bullet);
    }
  }
}
