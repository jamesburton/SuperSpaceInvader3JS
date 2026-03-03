import type { Bullet } from '../entities/Bullet';
import type { Player } from '../entities/Player';
import type { EnemyFormation } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import type { ParticleManager } from '../effects/ParticleManager';
import type { PowerUpManager } from './PowerUpManager';
import { runState } from '../state/RunState';
import { ENEMY_DEFS } from '../config/enemies';
import { PLAYER_INVINCIBILITY_DURATION } from '../utils/constants';
import { wavePalette } from '../config/palettes';

/** AABB overlap test: true if two axis-aligned boxes overlap */
function aabbOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return Math.abs(ax - bx) < aw + bw && Math.abs(ay - by) < ah + bh;
}

export class CollisionSystem {
  private playerInvincibility: number = 0; // countdown timer in seconds
  private particleManager: ParticleManager | null = null;
  private powerUpManager: PowerUpManager | null = null;
  private hitThisStep: boolean = false;    // flag for camera shake trigger
  private collectedPickupName: string | null = null; // set when pickup collected this step

  /**
   * Inject ParticleManager for death burst effects.
   * Called from Game.ts during init() after ParticleManager is created.
   * Using setter injection to avoid circular constructor dependencies.
   */
  public setParticleManager(pm: ParticleManager): void {
    this.particleManager = pm;
  }

  /**
   * Inject PowerUpManager for pickup collision, shield absorb, and SID drops.
   * Called from Game.ts during init() after PowerUpManager is created.
   * Using setter injection to avoid circular constructor dependencies.
   */
  public setPowerUpManager(pm: PowerUpManager): void {
    this.powerUpManager = pm;
  }

  /**
   * Returns true if an enemy bullet hit the player during the last update() call.
   * Auto-resets on read — call once per fixed step from PlayingState to trigger CameraShake.
   */
  public wasHitThisStep(): boolean {
    const result = this.hitThisStep;
    this.hitThisStep = false; // auto-reset on read
    return result;
  }

  /**
   * Returns the display name of a pickup collected during the last update() call, or null.
   * Auto-resets on read — call once per fixed step from PlayingState to show PickupFeedback.
   */
  public consumePickupName(): string | null {
    const n = this.collectedPickupName;
    this.collectedPickupName = null; // auto-reset on read
    return n;
  }

  /**
   * Check player bullets vs enemies, enemy bullets vs player, and player vs pickup tokens.
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
            // Hit registered — consume bullet regardless of shield state
            bulletsToRelease.push({ bullet, pool: playerBulletPool });

            // Shielder shield phasing: reduce shieldHp before body damage
            if (enemy.type === 'shielder' && enemy.shieldActive) {
              enemy.shieldHp -= 1;
              if (enemy.shieldHp <= 0) {
                // Shield destroyed — show visual burst but DO NOT kill body yet
                enemy.shieldActive = false;
                if (this.particleManager) {
                  const worldPos = formation.getEnemyWorldPos(enemy);
                  this.particleManager.spawnDeathBurst(worldPos.x, worldPos.y + enemy.height, 0xff00ff);
                }
              }
              break; // bullet consumed
            }

            // Normal body damage (shield inactive or non-Shielder)
            enemy.health -= 1;

            if (enemy.health <= 0) {
              // Capture world position BEFORE killEnemy() scales matrix to zero
              const worldPos = formation.getEnemyWorldPos(enemy);
              formation.killEnemy(enemy.instanceIndex);
              runState.addScore(ENEMY_DEFS[enemy.type].scoreValue);
              runState.recordKill();

              // INRUN-01: drop SI$ on kill
              const def = ENEMY_DEFS[enemy.type];
              runState.addCurrency(def.sidDropAmount);

              // Try to spawn a power-up drop at kill position
              if (this.powerUpManager) {
                this.powerUpManager.trySpawnDrop(worldPos.x, worldPos.y, def.dropChance);
              }

              // Spawn death particle burst at kill position with current wave palette color
              if (this.particleManager) {
                const paletteColor = wavePalette.getColor(runState.wave);
                this.particleManager.spawnDeathBurst(worldPos.x, worldPos.y, paletteColor);
              }
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

            // Shield power-up absorb: consume one charge to skip life loss
            if (this.powerUpManager && this.powerUpManager.consumeShieldCharge()) {
              // Hit absorbed by shield — still shake camera but skip loseLife()
              this.hitThisStep = true;
              continue; // skip loseLife
            }

            runState.loseLife();
            this.playerInvincibility = PLAYER_INVINCIBILITY_DURATION;
            this.hitThisStep = true; // signal PlayingState to trigger camera shake
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

    // Pickup token collision — detect player-vs-token AABB overlap
    if (this.powerUpManager && this.playerInvincibility <= 0) {
      for (const token of this.powerUpManager.getActiveTokens()) {
        if (!token.active) continue;
        if (aabbOverlap(player.x, player.y, player.width, player.height,
                        token.x, token.y, token.width, token.height)) {
          const displayName = this.powerUpManager.collectPickup(token);
          this.collectedPickupName = displayName; // readable by PlayingState for PickupFeedback
          break; // one pickup per step
        }
      }
    }
  }

  public reset(): void {
    this.playerInvincibility = 0;
    this.collectedPickupName = null;
    this.hitThisStep = false;
  }
}
