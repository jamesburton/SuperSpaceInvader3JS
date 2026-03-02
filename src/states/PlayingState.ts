import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { SceneManager } from '../core/SceneManager';
import type { ObjectPool } from '../core/ObjectPool';
import type { Player } from '../entities/Player';
import type { Bullet } from '../entities/Bullet';
import type { EnemyFormation } from '../entities/Enemy';
import type { MovementSystem } from '../systems/MovementSystem';
import type { AISystem } from '../systems/AISystem';
import type { CollisionSystem } from '../systems/CollisionSystem';
import type { SpawnSystem } from '../systems/SpawnSystem';
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';
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
  aiSystem: AISystem;
  collisionSystem: CollisionSystem;
  spawnSystem: SpawnSystem;
}

export class PlayingState implements IGameState {
  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
  ) {}

  enter(): void {
    runState.setPhase('playing');
    this.hud.hideOverlay();
  }

  update(dt: number): void {
    const { ctx, input, stateManager, hud } = this;

    // Pause on ESC or P
    if (input.justPressed('Escape') || input.justPressed('KeyP')) {
      input.clearJustPressed();
      stateManager.push(new PausedState(stateManager, input, hud));
      return;
    }

    // 1. Player fire input
    if (ctx.player.active && input.justPressed('Space') && ctx.player.canFire()) {
      const bullet = ctx.playerBulletPool.acquire();
      if (bullet !== null) {
        bullet.init(ctx.player.x, ctx.player.y + ctx.player.height + 10, true);
        ctx.activeBullets.push(bullet);
        ctx.player.recordFire();
      }
    }

    // 2. Player movement
    const left = input.isDown('ArrowLeft') || input.isDown('KeyA');
    const right = input.isDown('ArrowRight') || input.isDown('KeyD');
    ctx.player.update(dt, left, right);

    // 3. Spawn system (wave transitions)
    const isTransitioning = ctx.spawnSystem.update(
      dt,
      ctx.formation,
      ctx.playerBulletPool,
      ctx.enemyBulletPool,
      ctx.activeBullets,
      hud,
    );

    if (!isTransitioning) {
      // 4. Enemy AI
      const reachedBottom = ctx.aiSystem.update(
        dt,
        ctx.formation,
        ctx.enemyBulletPool,
        ctx.activeBullets,
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

    // 7. Check lives
    if (runState.lives <= 0) {
      this.triggerGameOver();
      return;
    }

    // 8. Sync HUD
    hud.sync(runState.snapshot());

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
    this.ctx.scene.render();
    void alpha;
  }

  resume(): void {
    // Called when PausedState pops — game continues exactly where it left off
    runState.setPhase('playing');
    this.hud.hideOverlay();
  }

  exit(): void {}
}
