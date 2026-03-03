import type { EnemyFormation, Enemy } from '../entities/Enemy';
import type { ObjectPool } from '../core/ObjectPool';
import type { Bullet } from '../entities/Bullet';
import {
  ENEMY_FIRE_RATE,
  ENEMY_BULLET_SPEED,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../utils/constants';

// Approximate player Y position (near bottom of world)
const PLAYER_Y_APPROX = -230;

const BASE_FIRE_INTERVAL = 1 / ENEMY_FIRE_RATE;

export class AISystem {
  // ---- Grunt / formation fire ----
  private fireAccumulator: number = 0;
  private fireInterval: number = BASE_FIRE_INTERVAL; // seconds between formation shots

  // ---- Flanker state ----
  /** Seconds elapsed in current wave — used to trigger flanker charge */
  private flankerTimer: number = 0;
  /** Time (seconds) before flankers break formation and charge */
  private readonly flankerChargeDelay: number = 15;
  /** True once flankers have been triggered this wave */
  private flankersTriggered: boolean = false;
  /** Seconds elapsed since flankers triggered — used to switch to return phase */
  private flankerChargeTimer: number = 0;
  /** How long flankers charge before returning to formation */
  private readonly FLANKER_CHARGE_DURATION: number = 5.0;

  // ---- Sniper state ----
  /** Accumulator for sniper aimed shot interval */
  private sniperFireAccumulator: number = 0;
  /** Snipers fire every 3 seconds (aimed at player) */
  private readonly sniperFireInterval: number = 3.0;

  // ---- Swooper state ----
  /**
   * Per-group countdown timers. Group ID = enemy.instanceIndex % 4.
   * Group N triggers at 8 + N*10 seconds (8, 18, 28, 38).
   */
  private swooperGroupTimers: number[] = [8, 18, 28, 38];
  /** Tracks which swooper groups have already dive-triggered this wave */
  private swooperGroupTriggered: boolean[] = [false, false, false, false];

  /**
   * Update formation march and all archetype-specific AI behaviors.
   *
   * @param dt        Fixed timestep seconds
   * @param formation EnemyFormation instance
   * @param enemyBulletPool Pool to acquire bullets from
   * @param activeBullets   Shared active bullet list
   * @param playerX   Player's current world X — used for targeting by Flanker/Charger/Sniper
   * @returns true if enemies have reached the bottom (triggers game over)
   */
  public update(
    dt: number,
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    playerX: number,
  ): boolean {
    // Formation march (Grunt + Shielder + idle-phase specials march with formation)
    const reachedBottom = formation.updateMarch(dt);
    if (reachedBottom) return true;

    // Grunt/Shielder formation fire: Poisson-style interval
    this.fireAccumulator += dt;
    if (this.fireAccumulator >= this.fireInterval) {
      this.fireAccumulator -= this.fireInterval;
      this.tryGruntFire(formation, enemyBulletPool, activeBullets);
    }

    // Elapsed time drives flanker trigger and sniper fire interval
    this.flankerTimer += dt;
    this.sniperFireAccumulator += dt;

    // Per-archetype updates
    this.updateFlankers(dt, formation, enemyBulletPool, activeBullets, playerX);
    this.updateSnipers(formation, enemyBulletPool, activeBullets, playerX);
    this.updateChargers(dt, formation, enemyBulletPool, activeBullets, playerX);
    this.updateSwoopers(dt, formation, enemyBulletPool, activeBullets, playerX);

    return false;
  }

  // ---------------------------------------------------------------------------
  // Grunt / formation fire
  // ---------------------------------------------------------------------------

  /**
   * Grunt/Shielder formation fire: pick a front-row enemy and fire downward.
   * Enemies that are in independent-movement phases are already excluded by
   * getRandomFiringEnemy (which reads the front active row per column).
   */
  private tryGruntFire(
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
  ): void {
    const firingEnemy = formation.getRandomFiringEnemy();
    if (!firingEnemy) return;

    const bullet = enemyBulletPool.acquire();
    if (bullet === null) return; // pool exhausted, skip

    const pos = formation.getEnemyWorldPos(firingEnemy);
    bullet.init(pos.x, pos.y - firingEnemy.height - 10, false);
    activeBullets.push(bullet);
  }

  // ---------------------------------------------------------------------------
  // Flanker behavior
  // ---------------------------------------------------------------------------

  /**
   * Flanker state machine:
   *   formation → charging → returning → formation
   *
   * formation: march normally (handled by updateMarch).
   * charging:  chain behavior — each flanker chases the previous one's live X.
   *            flanker[0] targets playerX; flanker[n] targets flanker[n-1].x.
   *            Gentle downward drift. Fire every second. After FLANKER_CHARGE_DURATION,
   *            switch all to returning phase.
   * returning: each flanker independently moves back toward its formation grid slot.
   *            On arrival, flankerCharging and flankerReturning are cleared and the
   *            formation march takes over again.
   */
  private updateFlankers(
    dt: number,
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    playerX: number,
  ): void {
    // Sort by instanceIndex so chain order is consistent
    const flankers = formation.getActiveEnemiesByType('flanker')
      .sort((a, b) => a.instanceIndex - b.instanceIndex);

    // Trigger charge when timer reaches threshold (once per wave)
    if (!this.flankersTriggered && this.flankerTimer >= this.flankerChargeDelay) {
      this.flankersTriggered = true;
      this.flankerChargeTimer = 0;
      for (const flanker of flankers) {
        if (!flanker.flankerCharging) {
          const pos = formation.getEnemyWorldPos(flanker);
          flanker.x = pos.x;
          flanker.y = pos.y;
          flanker.flankerCharging = true;
          flanker.flankerReturning = false;
          flanker.chargerDiveTimer = 1.0; // fire interval timer
        }
      }
    }

    // Count up charge timer — switch all to returning after duration
    if (this.flankersTriggered) {
      this.flankerChargeTimer += dt;
      if (this.flankerChargeTimer >= this.FLANKER_CHARGE_DURATION) {
        for (const flanker of flankers) {
          if (flanker.flankerCharging && !flanker.flankerReturning) {
            flanker.flankerReturning = true;
          }
        }
      }
    }

    // --- Charging pass (chain targeting) ---
    // Each flanker chases the previous one's live X, creating a snake effect.
    let prevX = playerX;
    for (const flanker of flankers) {
      if (!flanker.flankerCharging || flanker.flankerReturning) {
        // Update prevX even for returning flankers so chain stays coherent
        prevX = flanker.x;
        continue;
      }

      // Move toward previous flanker's X at 200 units/s
      const dx = prevX - flanker.x;
      const moveX = Math.sign(dx) * Math.min(Math.abs(dx), 200 * dt);
      flanker.x += moveX;
      flanker.y -= 30 * dt; // gentle downward drift

      formation.setEnemyWorldPos(flanker, flanker.x, flanker.y);
      prevX = flanker.x; // next flanker in chain targets this one

      // Fire every second during charge
      flanker.chargerDiveTimer -= dt;
      if (flanker.chargerDiveTimer <= 0) {
        flanker.chargerDiveTimer = 1.0;
        const bullet = enemyBulletPool.acquire();
        if (bullet !== null) {
          bullet.init(flanker.x, flanker.y - flanker.height - 10, false);
          activeBullets.push(bullet);
        }
      }
    }

    // --- Returning pass ---
    for (const flanker of flankers) {
      if (!flanker.flankerReturning) continue;

      const slot = formation.getFormationSlotPos(flanker);
      const dx = slot.x - flanker.x;
      const dy = slot.y - flanker.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 12) {
        // Arrived — snap back and hand control to formation march
        formation.setEnemyWorldPos(flanker, slot.x, slot.y);
        flanker.flankerCharging = false;
        flanker.flankerReturning = false;
      } else {
        const step = 180 * dt;
        flanker.x += (dx / dist) * Math.min(step, dist);
        flanker.y += (dy / dist) * Math.min(step, dist);
        formation.setEnemyWorldPos(flanker, flanker.x, flanker.y);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sniper behavior
  // ---------------------------------------------------------------------------

  /**
   * Sniper state machine:
   *   Stays in formation march — no independent movement.
   *   Fires an aimed bullet every sniperFireInterval seconds.
   *   Target: vector from sniper's world pos toward (playerX, PLAYER_Y_APPROX).
   */
  private updateSnipers(
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    playerX: number,
  ): void {
    if (this.sniperFireAccumulator < this.sniperFireInterval) return;
    this.sniperFireAccumulator -= this.sniperFireInterval;

    const snipers = formation.getActiveEnemiesByType('sniper');
    if (snipers.length === 0) return;

    // Pick a random active sniper
    const sniper = snipers[Math.floor(Math.random() * snipers.length)];
    const pos = formation.getEnemyWorldPos(sniper);

    const bullet = enemyBulletPool.acquire();
    if (bullet === null) return;

    // init() sets vy = -ENEMY_BULLET_SPEED and vx = 0 — we override both below
    bullet.init(pos.x, pos.y - sniper.height - 10, false);

    // Aimed direction toward player position
    const aimDx = playerX - pos.x;
    const aimDy = PLAYER_Y_APPROX - pos.y;
    const dist = Math.sqrt(aimDx * aimDx + aimDy * aimDy) || 1;
    bullet.vx = (aimDx / dist) * ENEMY_BULLET_SPEED;
    bullet.vy = (aimDy / dist) * ENEMY_BULLET_SPEED;

    activeBullets.push(bullet);
  }

  // ---------------------------------------------------------------------------
  // Charger behavior
  // ---------------------------------------------------------------------------

  /**
   * Charger state machine:
   *   idle → diving → returning (teleport above screen, reset cooldown) → idle
   *
   * idle:    tick chargerDiveTimer down; trigger dive when <= 0.
   * diving:  move down at 280 units/s; slight X homing at 60 units/s.
   *          Fire one bullet at start of dive.
   *          Exit when y < -350.
   * return:  teleport to above screen (y = WORLD_HEIGHT/2 + 60), 3-7s cooldown.
   */
  private updateChargers(
    dt: number,
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    playerX: number,
  ): void {
    const chargers = formation.getActiveEnemiesByType('charger');

    for (const charger of chargers) {
      if (!charger.chargerDiving) {
        // Count down to next dive
        charger.chargerDiveTimer -= dt;
        if (charger.chargerDiveTimer <= 0) {
          // Start dive — capture current world position
          const pos = formation.getEnemyWorldPos(charger);
          charger.x = pos.x;
          charger.y = pos.y;
          charger.chargerDiving = true;
          charger.chargerTargetX = playerX;

          // Fire one bullet at dive start
          const bullet = enemyBulletPool.acquire();
          if (bullet !== null) {
            bullet.init(charger.x, charger.y - charger.height - 10, false);
            activeBullets.push(bullet);
          }
        }
      } else {
        // Diving: move down fast with slight lateral homing
        charger.y -= 280 * dt;

        const dx = charger.chargerTargetX - charger.x;
        const moveX = Math.sign(dx) * Math.min(Math.abs(dx), 60 * dt);
        charger.x += moveX;

        formation.setEnemyWorldPos(charger, charger.x, charger.y);

        // Off-screen bottom — return charger above screen and reset cooldown
        if (charger.y < -350) {
          charger.chargerDiving = false;
          charger.chargerDiveTimer = 3 + Math.random() * 4; // 3-7s cooldown

          // Park above screen so it re-enters from top visually
          const returnX = Math.max(
            -(WORLD_WIDTH / 2) + 20,
            Math.min(WORLD_WIDTH / 2 - 20, charger.chargerTargetX),
          );
          formation.setEnemyWorldPos(charger, returnX, WORLD_HEIGHT / 2 + 60);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Swooper behavior
  // ---------------------------------------------------------------------------

  /**
   * Swooper state machine (grouped dives):
   *   'formation' → 'diving' → 'looping' → 'returning' → settled (killEnemy on bottom exit)
   *
   * Group assignment: instanceIndex % 4. Groups trigger at 8, 18, 28, 38 seconds.
   *
   * formation: marches with formation normally.
   * diving:    tracks playerX area at 80 units/s lateral + 220 units/s down.
   *            Fires one bullet on dive start. Exits to looping at y < -350.
   * looping:   teleported above screen; moves down to swooperLoopY at 180 units/s.
   *            Exits to returning on arrive.
   * returning: continues down at 140 units/s. Exits (killEnemy) at screen bottom.
   */
  private updateSwoopers(
    dt: number,
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    playerX: number,
  ): void {
    // Decrement group countdown timers; trigger group when time is reached
    for (let g = 0; g < 4; g++) {
      if (!this.swooperGroupTriggered[g]) {
        this.swooperGroupTimers[g] -= dt;
        if (this.swooperGroupTimers[g] <= 0) {
          this.swooperGroupTriggered[g] = true;
          this._triggerSwooperGroup(g, formation, enemyBulletPool, activeBullets, playerX);
        }
      }
    }

    // Per-swooper phase updates (skip formation-phase — handled by updateMarch)
    const swoopers = formation.getActiveEnemiesByType('swooper');
    for (const swooper of swoopers) {
      switch (swooper.swooperPhase) {
        case 'diving':
          this._updateSwooperDiving(dt, swooper, formation);
          break;
        case 'looping':
          this._updateSwooperLooping(dt, swooper, formation);
          break;
        case 'returning':
          this._updateSwooperReturning(dt, swooper, formation);
          break;
        default:
          break; // 'formation' — handled by updateMarch
      }
    }
  }

  /** Trigger all swoopers in the specified group to begin diving */
  private _triggerSwooperGroup(
    groupId: number,
    formation: EnemyFormation,
    enemyBulletPool: ObjectPool<Bullet>,
    activeBullets: Bullet[],
    playerX: number,
  ): void {
    const swoopers = formation.getActiveEnemiesByType('swooper');
    for (const swooper of swoopers) {
      if (swooper.instanceIndex % 4 !== groupId) continue;
      if (swooper.swooperPhase !== 'formation') continue;

      // Capture current formation world position
      const pos = formation.getEnemyWorldPos(swooper);
      swooper.x = pos.x;
      swooper.y = pos.y;
      swooper.swooperPhase = 'diving';
      swooper.offScreen = false;

      // Target: random ±30 units around playerX
      swooper.swooperLoopX = playerX + (Math.random() - 0.5) * 60;

      // Fire one bullet at dive start
      const bullet = enemyBulletPool.acquire();
      if (bullet !== null) {
        bullet.init(swooper.x, swooper.y - swooper.height - 10, false);
        activeBullets.push(bullet);
      }
    }
  }

  private _updateSwooperDiving(dt: number, swooper: Enemy, formation: EnemyFormation): void {
    swooper.y -= 220 * dt;

    const dx = swooper.swooperLoopX - swooper.x;
    const moveX = Math.sign(dx) * Math.min(Math.abs(dx), 80 * dt);
    swooper.x += moveX;

    formation.setEnemyWorldPos(swooper, swooper.x, swooper.y);

    if (swooper.y < -350) {
      // Transition to looping — teleport well above screen
      swooper.offScreen = true;
      swooper.swooperPhase = 'looping';
      swooper.swooperLoopY = WORLD_HEIGHT / 2 + 60; // visible re-entry target
      swooper.y = WORLD_HEIGHT / 2 + 120;           // start above that
      formation.setEnemyWorldPos(swooper, swooper.x, swooper.y);
    }
  }

  private _updateSwooperLooping(dt: number, swooper: Enemy, formation: EnemyFormation): void {
    swooper.y -= 180 * dt;
    formation.setEnemyWorldPos(swooper, swooper.x, swooper.y);

    if (swooper.y <= swooper.swooperLoopY) {
      swooper.offScreen = false;
      swooper.swooperPhase = 'returning';
    }
  }

  private _updateSwooperReturning(dt: number, swooper: Enemy, formation: EnemyFormation): void {
    swooper.y -= 140 * dt;
    formation.setEnemyWorldPos(swooper, swooper.x, swooper.y);

    // Swooper exits the bottom — deactivate (no re-dive for rest of wave)
    if (swooper.y < -(WORLD_HEIGHT / 2) - 50) {
      formation.killEnemy(swooper.instanceIndex);
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration helpers
  // ---------------------------------------------------------------------------

  /**
   * Set fire rate multiplier from WaveConfig.
   * Higher multiplier = faster fire rate (shorter interval).
   */
  public setFireRateMultiplier(multiplier: number): void {
    this.fireInterval = BASE_FIRE_INTERVAL / multiplier;
  }

  // ---------------------------------------------------------------------------
  // Reset (call on wave start)
  // ---------------------------------------------------------------------------

  /** Reset all accumulators and state for a new wave. */
  public reset(): void {
    this.fireAccumulator = 0;
    this.fireInterval = BASE_FIRE_INTERVAL;
    this.sniperFireAccumulator = 0;
    this.flankerTimer = 0;
    this.flankersTriggered = false;
    this.flankerChargeTimer = 0;
    this.swooperGroupTimers = [8, 18, 28, 38];
    this.swooperGroupTriggered = [false, false, false, false];
  }
}
