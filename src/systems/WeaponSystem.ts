import type { InputManager } from '../core/InputManager';
import type { ObjectPool } from '../core/ObjectPool';
import type { Player } from '../entities/Player';
import type { Bullet } from '../entities/Bullet';
import type { ParticleManager } from '../effects/ParticleManager';
import type { PowerUpManager } from './PowerUpManager';
import type { ShopSystem } from './ShopSystem';
import { audioManager } from './AudioManager';

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
    shopSystem?: ShopSystem,
  ): void {
    if (!player.active) return;

    // Enforce max in-flight bullet cap (meta upgrade: passive_maxBullets_N)
    const inFlight = activeBullets.filter(b => b.active && b.isPlayerBullet).length;
    if (inFlight >= player.maxBulletsInFlight) return;

    const wantsToFire = input.justPressed('Space');

    if (wantsToFire && player.canFire()) {
      this.fireShot(player, playerBulletPool, activeBullets, powerUpManager, shopSystem);

      // Record fire (sets standard cooldown via fireCooldownMultiplier)
      player.recordFire();
      audioManager.playSfx('shoot'); // Phase 6: weapon fire SFX (AUD-02)

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
    shopSystem?: ShopSystem,
  ): void {
    const isPiercingPowerUp = powerUpManager?.isActive('piercingShot') ?? false;
    const isSpreadPowerUp = powerUpManager?.isActive('spreadShot') ?? false;
    const shopSpread = shopSystem?.spreadCount ?? 1;
    if (isPiercingPowerUp) {
      const bullet = playerBulletPool.acquire();
      if (!bullet) return;

      bullet.init(player.x, player.y + player.height + 10, true);
      bullet.vy *= shopSystem?.bulletSpeedMultiplier ?? 1;
      bullet.configurePiercingShot();
      activeBullets.push(bullet);
      return;
    }

    // Additive: shop spread is the base, power-up pickup adds +2 on top
    const bulletCount = isSpreadPowerUp ? shopSpread + 2 : shopSpread;

    // Build angle offsets: evenly spaced across a 0.8 radian arc
    let angles: number[];
    if (bulletCount <= 1) {
      angles = [0];
    } else {
      const totalArc = 0.8; // total spread arc in radians
      angles = [];
      for (let i = 0; i < bulletCount; i++) {
        angles.push(-totalArc / 2 + (totalArc / (bulletCount - 1)) * i);
      }
    }

    const speedMul = shopSystem?.bulletSpeedMultiplier ?? 1;

    for (const angleOffset of angles) {
      const bullet = playerBulletPool.acquire();
      if (!bullet) break; // pool exhausted — silently skip remaining bullets

      // Spawn at barrel tip (top center of player ship)
      bullet.init(player.x, player.y + player.height + 10, true);

      // Apply bullet speed multiplier from shop
      bullet.vy *= speedMul;

      if (bulletCount > 1) {
        // Decompose bullet speed into angled trajectory. Positive vy = upward in this world.
        const speed = bullet.vy; // already scaled by speedMul
        bullet.vx = Math.sin(angleOffset) * speed;
        bullet.vy = Math.cos(angleOffset) * speed;
        bullet.configureSpreadShot();
      }

      activeBullets.push(bullet);
    }
  }
}
