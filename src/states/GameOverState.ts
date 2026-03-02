import type { IGameState } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { PlayingStateContext } from './PlayingState';
import { runState } from '../state/RunState';

export class GameOverState implements IGameState {
  private readonly finalScore: number;
  private readonly finalWave: number;
  private readonly finalKills: number;

  constructor(
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
    private readonly onRestart: () => void,
  ) {
    // Capture final stats before runState is potentially reset
    this.finalScore = runState.score;
    this.finalWave = runState.wave;
    this.finalKills = runState.enemiesKilled;
  }

  enter(): void {
    this.hud.showOverlay(`
      <h1 style="font-size:48px;margin-bottom:24px;text-shadow:0 0 20px #f44;letter-spacing:4px;color:#f44;">GAME OVER</h1>
      <p style="font-size:28px;margin:12px 0;">SCORE: ${this.finalScore}</p>
      <p style="font-size:28px;margin:12px 0;">WAVE: ${this.finalWave}</p>
      <p style="font-size:28px;margin:12px 0;">KILLS: ${this.finalKills}</p>
      <p style="font-size:18px;margin-top:40px;opacity:0.7;letter-spacing:2px;">PRESS R TO RESTART</p>
    `);
  }

  update(_dt: number): void {
    if (this.input.justPressed('KeyR')) {
      this.input.clearJustPressed();
      this.restartGame();
      return;
    }
    this.input.clearJustPressed();
  }

  private restartGame(): void {
    // Reset all game state
    runState.reset();

    // Reset entities
    this.ctx.player.active = true;
    this.ctx.player.mesh.visible = true;
    this.ctx.player.x = 0;

    // Clear all active bullets
    this.ctx.activeBullets.forEach((b) => {
      if (b.isPlayerBullet) this.ctx.playerBulletPool.release(b);
      else this.ctx.enemyBulletPool.release(b);
    });
    this.ctx.activeBullets.length = 0;

    // Reset systems
    this.ctx.collisionSystem.reset();
    this.ctx.spawnSystem.reset();
    this.ctx.aiSystem.reset();

    // Spawn fresh enemy wave
    this.ctx.formation.spawnWave();

    // Factory callback handles state transition (avoids circular import with PlayingState)
    this.onRestart();
  }

  render(_alpha: number): void {
    this.ctx.scene.render();
  }

  exit(): void {}
}
