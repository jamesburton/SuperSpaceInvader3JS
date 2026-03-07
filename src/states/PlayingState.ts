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
import type { BunkerManager } from '../entities/BunkerManager';
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';
import { audioManager } from '../systems/AudioManager';
import { FIXED_STEP } from '../utils/constants';
import { BOSS_DEF } from '../config/boss';
import { CAMPAIGN_CHAPTER_1, getAlgorithmicWaves } from '../config/campaign';
import { PausedState } from './PausedState';
import { GameOverState } from './GameOverState';
import { LevelBriefingState } from './LevelBriefingState';

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
  // Phase 5: bunkers
  bunkerManager: BunkerManager;
}

export class PlayingState implements IGameState {
  /** Tracks previous isTransitioning state to detect wave-end moment for releaseAll() */
  private lastWasTransitioning: boolean = false;

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
    private readonly onReturnToMenu: () => void = () => {},
  ) {}

  enter(): void {
    this.lastWasTransitioning = false;
    runState.setPhase('playing');
    // Apply start-run SI$ tax (skip if this is a continue — currency already taxed)
    if (!runState.continueUsed) this._applyStartTax();
    this.hud.hideOverlay();
    this.ctx.cameraShake.reset(); // Phase 2: clear any residual shake
    this.applyMetaBonuses();      // Phase 4: apply persistent meta upgrades at run start
    this._spawnBunkers();         // Spawn bunkers if enabled and slots purchased
    audioManager.playBgm();       // Phase 6: start BGM on gameplay enter (AUD-01)

    // Phase 5: Campaign mode — feed the current level's waves to SpawnSystem
    if (runState.mode === 'campaign') {
      this._setupCampaignLevel(runState.campaignLevelIndex);
    } else {
      // Endless mode — ensure SpawnSystem uses getWaveConfig() (no level override)
      this.ctx.spawnSystem.setLevelWaves(null);
    }
  }

  update(dt: number): void {
    const { ctx, input, stateManager, hud } = this;

    // Phase 3: while shop is visible, pause all gameplay logic
    if (ctx.shopUI.isVisible) {
      ctx.shopUI.update(input);  // gamepad/keyboard cursor navigation (07-02)
      input.clearJustPressed();
      return;
    }

    // M-key mute toggle (AUD-06 quality-of-life shortcut, does not pause)
    if (input.justPressed('KeyM')) {
      audioManager.setMuted(!audioManager.isMuted);
      // No clearJustPressed() here — fall through to normal input processing
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

    // Phase 5: Campaign mode — check if the current level's waves are all exhausted
    if (runState.mode === 'campaign' && ctx.spawnSystem.levelCompletePending) {
      ctx.spawnSystem.clearLevelCompletePending();
      this._onLevelComplete();
      return;
    }

    // Release uncollected tokens when a new wave starts — active effects carry over
    if (wasTransitioning && !isTransitioning) {
      ctx.powerUpManager.releaseTokensOnly();
    }

    // Shop trigger — open shop when shopPending flag is set after wave clear
    if (ctx.spawnSystem.shopPending) {
      ctx.spawnSystem.clearShopPending();

      // Build live callbacks for multi-buy shop
      const getItems = () => {
        const all = ctx.shopSystem.getAvailableItems();
        // Hide repairBunker if no bunkers are damaged
        if (!ctx.bunkerManager.hasDamagedBunker()) {
          return all.filter(i => i.id !== 'repairBunker');
        }
        return all;
      };

      ctx.shopUI.show(
        getItems,
        () => runState.gold,
        (item) => ctx.shopSystem.purchaseItem(item, ctx.player),
        () => ctx.shopUI.hide(),
      );
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
        audioManager.playSfx('bossPhase'); // Phase 6: boss phase transition SFX (AUD-03)
      }

      // Bullet movement + culling (still needed for boss bullets)
      ctx.movementSystem.updateBullets(dt, ctx.activeBullets, ctx.playerBulletPool, ctx.enemyBulletPool);

      // Collision: player bullets vs boss AABB
      this.updateBossCollision();

      // Camera shake on player hit
      if (ctx.collisionSystem.wasHitThisStep()) {
        ctx.cameraShake.triggerSmall();
        audioManager.playSfx('playerHit'); // Phase 6: player hit SFX in boss mode (AUD-02)
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
      audioManager.playSfx('playerHit'); // Phase 6: player hit SFX (AUD-02)
    }

    // Phase 2: update all active particles
    ctx.particleManager.update(dt);

    // Phase 3: update power-up token drift and duration ticking
    ctx.powerUpManager.update(dt);

    // Phase 3: activate PickupFeedback when a power-up token is collected
    const pickedUpName = ctx.collisionSystem.consumePickupName();
    if (pickedUpName) {
      ctx.pickupFeedback.showPickup(pickedUpName); // FEEL-04: activates Phase 2 stub
      audioManager.playSfx('pickup'); // Phase 6: pickup SFX (AUD-02)
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

  /** Award SI$ meta currency, update high score, then enter GameOverState (victory variant). */
  private triggerVictory(): void {
    const { ctx } = this;
    runState.addScore(BOSS_DEF.scoreValue);

    // Phase 5: Campaign victory — record the final level complete before showing victory screen
    if (runState.mode === 'campaign') {
      const meta = useMetaStore.getState() as unknown as Record<string, unknown>;
      if (typeof meta['recordLevelComplete'] === 'function') {
        (meta['recordLevelComplete'] as (chapter: number, levelIndex: number) => void)(
          CAMPAIGN_CHAPTER_1.chapterNumber,
          runState.campaignLevelIndex,
        );
      }
    }

    // Gold → SI$ conversion at end of run
    const convRate = this._getConversionRate();
    runState.convertGoldToSI(convRate);

    useMetaStore.getState().addMetaCurrency(runState.siEarnedThisRun);
    useMetaStore.getState().updateHighScore(runState.score);
    runState.setPhase('gameover');

    this.stateManager.replace(
      new GameOverState(
        this.input,
        this.hud,
        ctx,
        () => {
          this.stateManager.replace(
            new PlayingState(this.stateManager, this.input, this.hud, ctx, this.onReturnToMenu),
          );
        },
        null, // no continue after a win
        this.onReturnToMenu,
        'victory',
      ),
    );
  }

  private triggerGameOver(): void {
    runState.setPhase('gameover');
    useMetaStore.getState().updateHighScore(runState.score);

    // Gold → SI$ conversion at end of run
    const convRate = this._getConversionRate();
    runState.convertGoldToSI(convRate);

    // Award SI$ earned this run to MetaStore (META-01) — must happen before GameOverState reads it
    const siEarned = runState.siEarnedThisRun;
    if (siEarned > 0) {
      useMetaStore.getState().addMetaCurrency(siEarned);
    }

    const onContinue = () => {
      runState.useContinue(); // marks used + restores lives to PLAYER_LIVES
      this.ctx.player.active = true;
      this.ctx.player.mesh.visible = true;
      this.ctx.activeBullets.forEach((b) => {
        if (b.isPlayerBullet) this.ctx.playerBulletPool.release(b);
        else this.ctx.enemyBulletPool.release(b);
      });
      this.ctx.activeBullets.length = 0;
      this.ctx.collisionSystem.reset();
      this.ctx.spawnSystem.reset();
      this.ctx.aiSystem.reset();
      this.ctx.shopSystem.reset();
      this.ctx.powerUpManager.releaseAll();
      this.ctx.boss.deactivate();
      this.ctx.bossSystem.reset();
      this.ctx.bossHealthBar.hide();
      // Reset and re-spawn bunkers for the continue
      this.ctx.bunkerManager.reset();
      runState.setPhase('playing');
      this.ctx.formation.spawnWave();
      const newState = new PlayingState(this.stateManager, this.input, this.hud, this.ctx, this.onReturnToMenu);
      this.stateManager.replace(newState);
    };

    this.stateManager.replace(
      new GameOverState(
        this.input,
        this.hud,
        this.ctx,
        () => {
          this.stateManager.replace(
            new PlayingState(this.stateManager, this.input, this.hud, this.ctx, this.onReturnToMenu),
          );
        },
        onContinue,
        this.onReturnToMenu,
        'defeat',
      ),
    );
  }

  /**
   * Compute the gold→SI$ conversion rate from owned meta upgrades.
   * Base rate: 5%. Each passive_siConversion_N tier adds 5%.
   */
  private _getConversionRate(): number {
    const { purchasedUpgrades } = useMetaStore.getState();
    const convTier = [3, 2, 1].find(t => purchasedUpgrades.includes(`passive_siConversion_${t}`)) ?? 0;
    return 0.10 + convTier * 0.05; // 10% base, up to 25% at tier 3
  }

  /**
   * Apply SI$ start-run tax. Players keep only a fraction of their SI$ balance.
   * Base: keep 10% (90% tax). Each passive_siTax_N tier adds 10% kept.
   * Skipped on continue (continueUsed is true at entry time).
   */
  private _applyStartTax(): void {
    const { purchasedUpgrades, metaCurrency } = useMetaStore.getState();
    if (metaCurrency <= 0) return;
    const maxTier = [4, 3, 2, 1].find(t => purchasedUpgrades.includes(`passive_siTax_${t}`)) ?? 0;
    const keepFraction = 0.15 + maxTier * 0.10; // tier 0 = 15% keep (85% tax), tier 4 = 55% keep
    const taxAmount = Math.floor(metaCurrency * (1 - keepFraction));
    if (taxAmount > 0) {
      useMetaStore.getState().addMetaCurrency(-taxAmount);
    }
  }

  /**
   * Phase 5: Campaign mode — set up SpawnSystem with the given level's waves.
   * Called from enter() at level start and from _onLevelComplete's onDismiss callback.
   */
  private _setupCampaignLevel(levelIndex: number): void {
    const chapter = CAMPAIGN_CHAPTER_1;
    const level = chapter.levels[levelIndex];
    if (!level) return; // safety guard — out of bounds level index
    const waves = level.waves ?? getAlgorithmicWaves(levelIndex, level.waveCount ?? 3);
    this.ctx.spawnSystem.setLevelWaves(waves);
  }

  /**
   * Phase 5: Called when SpawnSystem signals levelCompletePending (campaign level waves exhausted).
   * Routes to either boss encounter (hasBoss: true) or next level briefing.
   */
  private _onLevelComplete(): void {
    const { ctx } = this;
    const chapter = CAMPAIGN_CHAPTER_1;
    const currentLevelIndex = runState.campaignLevelIndex;
    const currentLevel = chapter.levels[currentLevelIndex];

    // Record this level as completed in MetaStore (method added in Plan 05-05)
    const meta = useMetaStore.getState() as unknown as Record<string, unknown>;
    if (typeof meta['recordLevelComplete'] === 'function') {
      (meta['recordLevelComplete'] as (chapter: number, levelIndex: number) => void)(
        chapter.chapterNumber,
        currentLevelIndex,
      );
    }

    if (currentLevel?.hasBoss) {
      // Final level: trigger boss encounter — same as endless boss trigger
      ctx.spawnSystem.clearBossPending(); // prevent duplicate trigger if bossPending also set
      ctx.boss.activate();
      ctx.bossHealthBar.show(2, 1);
      return;
    }

    const nextLevelIndex = currentLevelIndex + 1;
    if (nextLevelIndex >= chapter.levels.length) {
      // All levels complete without boss — Chapter 1 always ends on boss, but handle gracefully
      this.triggerVictory();
      return;
    }

    // Advance campaign level index and show briefing for next level
    runState.setCampaignLevel(nextLevelIndex);
    const nextLevel = chapter.levels[nextLevelIndex];

    this.stateManager.push(
      new LevelBriefingState(
        this.stateManager,
        this.input,
        this.hud,
        nextLevel,
        () => {
          // After briefing dismissed, set up next level waves in SpawnSystem
          // The next update() cycle will detect empty formation and spawn the first wave
          this._setupCampaignLevel(nextLevelIndex);
        },
      ),
    );
  }

  /**
   * Spawn bunkers at run start if bunkersEnabled and at least one bunker slot is owned.
   */
  private _spawnBunkers(): void {
    const { purchasedUpgrades, bunkersEnabled } = useMetaStore.getState();
    if (!bunkersEnabled) return;
    // Count highest owned bunker_slot_N tier
    const slotCount = [4, 3, 2, 1].find(t => purchasedUpgrades.includes(`bunker_slot_${t}`)) ?? 0;
    if (slotCount > 0) {
      this.ctx.bunkerManager.spawnForRun(slotCount);
    }
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

    // Apply bullet cap from highest owned passive_maxBullets_N tier
    const maxBulletTier = [7, 6, 5, 4, 3, 2].find(t => purchasedUpgrades.includes(`passive_maxBullets_${t}`)) ?? 1;
    player.setMaxBulletsInFlight(maxBulletTier);

    // Apply starting loadout power-ups (timed, 30s duration)
    if (purchasedUpgrades.includes('loadout_spread_start')) {
      powerUpManager.activate('spreadShot', 30); // spread shot for 30s at run start
    }
    if (purchasedUpgrades.includes('loadout_rapid_start')) {
      powerUpManager.activate('rapidFire', 30);  // rapid fire for 30s at run start
    }

    // Wire bunker auto-repair: restore 1 segment per wave if upgrade owned
    if (purchasedUpgrades.includes('bunker_autorepair')) {
      this.ctx.spawnSystem.onWaveCleared = () => {
        this.ctx.bunkerManager.autoRepairBetweenWaves(1);
      };
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
