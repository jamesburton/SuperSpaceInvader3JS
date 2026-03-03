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
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';
import { FIXED_STEP } from '../utils/constants';
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

  private triggerGameOver(): void {
    runState.setPhase('gameover');
    useMetaStore.getState().updateHighScore(runState.score);
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
