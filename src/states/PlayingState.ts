import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { SceneManager } from '../core/SceneManager';
import type { ObjectPool } from '../core/ObjectPool';
import type { Player } from '../entities/Player';
import type { Bullet } from '../entities/Bullet';
import type { EnemyFormation } from '../entities/Enemy';
import type { MovementSystem } from '../systems/MovementSystem';
import type { WeaponSystem } from '../systems/WeaponSystem';
import type { AISystem } from '../systems/AISystem';
import type { CollisionSystem } from '../systems/CollisionSystem';
import type { SpawnSystem } from '../systems/SpawnSystem';
import type { ParticleManager } from '../effects/ParticleManager';
import type { CameraShake } from '../effects/CameraShake';
import type { BossHealthBar } from '../ui/BossHealthBar';
import type { PickupFeedback } from '../ui/PickupFeedback';
import type { PowerUpManager } from '../systems/PowerUpManager';
import type { ShopSystem } from '../systems/ShopSystem';
import type { ShopUI } from '../ui/ShopUI';
import type { BossEnemy } from '../entities/Boss';
import type { BossSystem } from '../systems/BossSystem';
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';
import { FIXED_STEP } from '../utils/constants';
import { BOSS_DEF } from '../config/boss';
import { PausedState } from './PausedState';
import { GameOverState } from './GameOverState';

/** All dependencies PlayingState needs — passed from Game.ts */
export interface PlayingStateContext {
  scene: SceneManager;
  player: Player;
  formation: EnemyFormation;
  playerBulletPool: ObjectPool<Bullet>;
  enemyBulletPool: ObjectPool<Bullet>;
  activeBullets: Bullet[];
  movementSystem: MovementSystem;
  weaponSystem: WeaponSystem;         // Phase 3: canonical player fire path
  aiSystem: AISystem;
  collisionSystem: CollisionSystem;
  spawnSystem: SpawnSystem;
  // Phase 2 additions
  particleManager: ParticleManager;
  cameraShake: CameraShake;
  bossHealthBar: BossHealthBar;       // Phase 4 stub — present but not called in Phase 2
  pickupFeedback: PickupFeedback;     // Phase 3: activates on power-up pickup
  // Phase 3 additions (Plan 03-08 final wiring)
  powerUpManager: PowerUpManager;
  shopSystem: ShopSystem;
  shopUI: ShopUI;
  // Phase 4 additions (Plan 04-03 boss wiring)
  boss: BossEnemy;
  bossSystem: BossSystem;
}

export class PlayingState implements IGameState {
  /** Tracks previous isTransitioning state to detect wave-end moment for releaseAll() */
  private lastWasTransitioning: boolean = false;

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
  ) {}

  enter(): void {
    this.lastWasTransitioning = false;
    runState.setPhase('playing');
    this.hud.hideOverlay();
    this.ctx.cameraShake.reset(); // Phase 2: clear any residual shake
    this.applyMetaBonuses();      // Phase 4: apply persistent meta upgrades at run start
  }

  update(dt: number): void {
    const { ctx, input, stateManager, hud } = this;

    // Phase 3: while shop is visible, pause all gameplay logic
    if (ctx.shopUI.isVisible) {
      input.clearJustPressed();
      return;
    }

    // Pause on ESC or P
    if (input.justPressed('Escape') || input.justPressed('KeyP')) {
      input.clearJustPressed();
      stateManager.push(new PausedState(stateManager, input, hud));
      return;
    }

    // 1. Player fire input — WeaponSystem is canonical fire path (Phase 3 refactor)
    ctx.weaponSystem.update(
      dt,
      input,
      ctx.player,
      ctx.playerBulletPool,
      ctx.activeBullets,
      ctx.particleManager,
      ctx.powerUpManager,
    );

    // 2. Player movement
    const left = input.isDown('ArrowLeft') || input.isDown('KeyA');
    const right = input.isDown('ArrowRight') || input.isDown('KeyD');
    ctx.movementSystem.trackPlayerMovement(left, right); // Phase 2: track for engine trail
    ctx.player.update(dt, left, right);

    // Phase 2: engine trail when moving horizontally
    if (ctx.movementSystem.isMovingHorizontally) {
      ctx.particleManager.spawnEngineTrail(ctx.player.x, ctx.player.y);
    }

    // 3. Spawn system (wave transitions)
    const wasTransitioning = this.lastWasTransitioning;
    const isTransitioning = ctx.spawnSystem.update(
      dt,
      ctx.formation,
      ctx.playerBulletPool,
      ctx.enemyBulletPool,
      ctx.activeBullets,
      hud,
      ctx.aiSystem,
    );
    this.lastWasTransitioning = isTransitioning;

    // Phase 3: release pickup tokens when wave transition ends (new wave is starting)
    if (wasTransitioning && !isTransitioning) {
      ctx.powerUpManager.releaseAll();
    }

    // Phase 3: shop trigger — open shop when shopPending flag is set after wave clear
    if (ctx.spawnSystem.shopPending) {
      ctx.spawnSystem.clearShopPending();
      const choices = ctx.shopSystem.generateChoices();
      ctx.shopUI.show(choices, runState.gold, (selectedIndex: number) => {
        if (selectedIndex >= 0 && selectedIndex < choices.length) {
          ctx.shopSystem.purchaseItem(choices[selectedIndex], ctx.player);
        }
        ctx.shopUI.hide();
      });
      return; // skip rest of update this step — shop is now open
    }

    // Phase 4: check if boss encounter should start
    if (ctx.spawnSystem.bossPending && !ctx.boss.active) {
      ctx.spawnSystem.clearBossPending();
      ctx.boss.activate();
      ctx.bossHealthBar.show(2, 1);
      // No new wave spawns — boss replaces normal wave progression
      return;
    }

    // Phase 4: boss mode — route to BossSystem instead of normal enemy update
    if (ctx.boss.active) {
      // Update boss movement and attacks
      ctx.bossSystem.update(dt, ctx.boss, ctx.player.x, ctx.enemyBulletPool, ctx.activeBullets);

      // Update boss health bar fill and phase label
      ctx.bossHealthBar.update(ctx.boss.healthFraction(), ctx.boss.currentPhase);

      // Camera shake on phase change
      if (ctx.bossSystem.phaseJustChanged) {
        ctx.cameraShake.triggerLarge();
      }

      // Bullet movement + culling (still needed for boss bullets)
      ctx.movementSystem.updateBullets(dt, ctx.activeBullets, ctx.playerBulletPool, ctx.enemyBulletPool);

      // Collision: player bullets vs boss AABB
      this.updateBossCollision();

      // Camera shake on player hit
      if (ctx.collisionSystem.wasHitThisStep()) {
        ctx.cameraShake.triggerSmall();
      }

      ctx.particleManager.update(dt);
      ctx.powerUpManager.update(dt);

      // Lives check — boss fight game over
      if (runState.lives <= 0) {
        ctx.boss.deactivate();
        ctx.bossHealthBar.hide();
        this.triggerGameOver();
        return;
      }

      // Boss defeated — trigger victory
      if (!ctx.boss.isAlive()) {
        ctx.bossHealthBar.hide();
        ctx.boss.deactivate();
        this.triggerVictory();
        return;
      }

      hud.sync(runState.snapshot());
      input.clearJustPressed();
      return; // skip normal enemy update when boss is active
    }

    if (!isTransitioning) {
      // 4. Enemy AI
      const reachedBottom = ctx.aiSystem.update(
        dt,
        ctx.formation,
        ctx.enemyBulletPool,
        ctx.activeBullets,
        ctx.player.x,
      );
      if (reachedBottom) {
        this.triggerGameOver();
        return;
      }
    }

    // 5. Bullet movement + culling
    ctx.movementSystem.updateBullets(
      dt,
      ctx.activeBullets,
      ctx.playerBulletPool,
      ctx.enemyBulletPool,
    );

    // 6. Collision
    ctx.collisionSystem.update(
      dt,
      ctx.activeBullets,
      ctx.player,
      ctx.formation,
      ctx.playerBulletPool,
      ctx.enemyBulletPool,
    );

    // Phase 2: trigger camera shake if player was hit this step
    if (ctx.collisionSystem.wasHitThisStep()) {
      ctx.cameraShake.triggerSmall();
    }

    // Phase 2: update all active particles
    ctx.particleManager.update(dt);

    // Phase 3: update power-up token drift and duration ticking
    ctx.powerUpManager.update(dt);

    // Phase 3: activate PickupFeedback when a power-up token is collected
    const pickedUpName = ctx.collisionSystem.consumePickupName();
    if (pickedUpName) {
      ctx.pickupFeedback.showPickup(pickedUpName); // FEEL-04: activates Phase 2 stub
    }

    // 7. Check lives
    if (runState.lives <= 0) {
      this.triggerGameOver();
      return;
    }

    // 8. Sync HUD
    hud.sync(runState.snapshot());

    // Phase 3: sync power-up timer bar with current power-up state
    hud.syncPowerUp(
      ctx.powerUpManager.activePowerUpType,
      ctx.powerUpManager.activeDurationRemaining,
      ctx.powerUpManager.activeDurationFull,
      ctx.powerUpManager.activeShieldCharges,
    );

    // 9. Clear just-pressed
    input.clearJustPressed();
  }

  /** Detect player bullet vs boss AABB collisions. Damages boss and releases hit bullets. */
  private updateBossCollision(): void {
    const { ctx } = this;
    const boss = ctx.boss;
    if (!boss.active) return;
    const toRelease: Bullet[] = [];
    for (const bullet of ctx.activeBullets) {
      if (!bullet.active || !bullet.isPlayerBullet) continue;
      const dx = Math.abs(bullet.x - boss.x);
      const dy = Math.abs(bullet.y - boss.y);
      if (dx < boss.width + 2 && dy < boss.height + 2) {
        boss.takeDamage(1);
        runState.addScore(5); // small score per hit (main reward is scoreValue on defeat)
        bullet.active = false;
        toRelease.push(bullet);
        ctx.particleManager.spawnDeathBurst(bullet.x, bullet.y, 0xFF1133);
      }
    }
    for (const b of toRelease) {
      ctx.playerBulletPool.release(b);
    }
    // Remove inactive bullets (released bullets have active=false)
    const len = ctx.activeBullets.length;
    let write = 0;
    for (let i = 0; i < len; i++) {
      if (ctx.activeBullets[i].active) {
        ctx.activeBullets[write++] = ctx.activeBullets[i];
      }
    }
    ctx.activeBullets.length = write;
  }

  /** Award SI$ meta currency, update high score, show victory screen, then enter GameOverState for restart flow. */
  private triggerVictory(): void {
    const { ctx } = this;
    // Award SI$ meta currency and score bonus for boss defeat
    const waveSI = runState.siEarnedThisRun;       // SI$ from wave clears
    const bossReward = BOSS_DEF.metaCurrencyReward; // SI$ from boss defeat
    const totalSIEarned = waveSI + bossReward;
    runState.addScore(BOSS_DEF.scoreValue);
    useMetaStore.getState().addMetaCurrency(totalSIEarned);
    useMetaStore.getState().updateHighScore(runState.score);

    const totalSI = useMetaStore.getState().metaCurrency;

    // Show victory overlay — reuse hud.showOverlay (same pattern as GameOverState)
    this.hud.showOverlay(`
      <h1 style="font-size:48px;margin-bottom:24px;text-shadow:0 0 20px #ffd700;letter-spacing:4px;color:#ffd700;">VICTORY!</h1>
      <p style="font-size:24px;margin:8px 0;">SCORE: ${runState.score}</p>
      <p style="font-size:24px;margin:8px 0;">WAVE: ${runState.wave}</p>
      <p style="font-size:24px;margin:8px 0;">KILLS: ${runState.enemiesKilled}</p>
      <p style="font-size:20px;margin:16px 0;color:#ffd700;">SI$ EARNED: ${totalSIEarned} (${waveSI} waves + ${bossReward} boss) | TOTAL: ${totalSI}</p>
      <p style="font-size:18px;margin-top:40px;opacity:0.7;letter-spacing:2px;">PRESS R TO PLAY AGAIN</p>
    `);

    runState.setPhase('gameover');

    // Transition to GameOverState to reuse the restart flow (R key handler)
    this.stateManager.replace(
      new GameOverState(
        this.input,
        this.hud,
        ctx,
        () => {
          this.stateManager.replace(
            new PlayingState(this.stateManager, this.input, this.hud, ctx),
          );
        },
      ),
    );
  }

  private triggerGameOver(): void {
    runState.setPhase('gameover');
    useMetaStore.getState().updateHighScore(runState.score);
    // Award SI$ earned this run to MetaStore (META-01) — must happen before GameOverState reads it
    const siEarned = runState.siEarnedThisRun;
    if (siEarned > 0) {
      useMetaStore.getState().addMetaCurrency(siEarned);
    }
    this.stateManager.replace(
      new GameOverState(
        this.input,
        this.hud,
        this.ctx,
        () => {
          // Restart: go back to PlayingState fresh
          this.stateManager.replace(
            new PlayingState(this.stateManager, this.input, this.hud, this.ctx),
          );
        },
      ),
    );
  }

  /**
   * Apply purchased meta upgrades at run start (META-03, META-04).
   * Reads MetaStore.purchasedUpgrades and applies passive stat bonuses and starting loadouts.
   * Called from enter() each time PlayingState becomes active (new run or restart).
   */
  private applyMetaBonuses(): void {
    const { purchasedUpgrades } = useMetaStore.getState();
    const { player, powerUpManager } = this.ctx;

    // Count tiers for multiplicative passives
    let fireRateTiers = 0;
    let moveSpeedTiers = 0;

    for (const id of purchasedUpgrades) {
      if (id.startsWith('passive_fireRate_')) fireRateTiers++;
      if (id.startsWith('passive_moveSpeed_')) moveSpeedTiers++;
    }

    // Apply passive fire rate: +10% per tier (compound) — shorter cooldown = multiplier < 1
    if (fireRateTiers > 0) {
      const rateMultiplier = Math.pow(1.10, fireRateTiers); // e.g., 3 tiers = 1.331x faster
      player.setFireCooldownMultiplier(1 / rateMultiplier);
    }

    // Apply passive move speed: +8% per tier (compound)
    if (moveSpeedTiers > 0) {
      const speedMultiplier = Math.pow(1.08, moveSpeedTiers);
      player.setSpeedMultiplier(speedMultiplier);
    }

    // Apply starting life bonus (+1 life, capped at MAX_LIVES_CAP)
    if (purchasedUpgrades.includes('passive_startingLife')) {
      runState.addLife();
    }

    // Apply starting loadout power-ups (timed, 30s duration)
    if (purchasedUpgrades.includes('loadout_spread_start')) {
      powerUpManager.activate('spreadShot', 30); // spread shot for 30s at run start
    }
    if (purchasedUpgrades.includes('loadout_rapid_start')) {
      powerUpManager.activate('rapidFire', 30);  // rapid fire for 30s at run start
    }
  }

  render(alpha: number): void {
    // Phase 2: apply camera shake offset each render frame (render-frequency, not fixed-step)
    this.ctx.cameraShake.apply(this.ctx.scene.camera, FIXED_STEP * alpha);
    this.ctx.scene.renderWithEffects(alpha);
  }

  resume(): void {
    // Called when PausedState pops — game continues exactly where it left off
    runState.setPhase('playing');
    this.hud.hideOverlay();
  }

  exit(): void {}
}
