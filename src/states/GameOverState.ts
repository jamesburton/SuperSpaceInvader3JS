import type { IGameState } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { PlayingStateContext } from './PlayingState';
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';

export class GameOverState implements IGameState {
  private readonly finalScore: number;
  private readonly finalWave: number;
  private readonly finalKills: number;
  private readonly siEarned: number;
  private readonly totalSI: number;
  private readonly goldConverted: number;
  private readonly conversionRate: number;
  /** True if the extra_continue upgrade is owned AND not yet used this run. */
  private readonly continueAvailable: boolean;

  constructor(
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
    private readonly onRestart: () => void,
    /**
     * Called when the player uses their one-per-run continue.
     * Pass null for victory (continue doesn't apply) or when continue is unavailable.
     */
    private readonly onContinue: (() => void) | null,
    private readonly onReturnToMenu: () => void,
    /** Controls the title and colour of the header. */
    private readonly type: 'defeat' | 'victory' = 'defeat',
  ) {
    this.finalScore = runState.score;
    this.finalWave = runState.wave;
    this.finalKills = runState.enemiesKilled;
    this.siEarned = runState.siEarnedThisRun;
    this.totalSI = useMetaStore.getState().metaCurrency;
    this.goldConverted = runState.goldConvertedThisRun;
    this.conversionRate = runState.siConversionRateUsed;

    const continueUnlocked = useMetaStore.getState().purchasedUpgrades.includes('extra_continue');
    this.continueAvailable = onContinue !== null && continueUnlocked && !runState.continueUsed;
  }

  enter(): void {
    const isVictory = this.type === 'victory';
    const titleColor = isVictory ? '#ffd700' : '#f44';
    const titleGlow = isVictory ? '#ffd700' : '#f44';
    const titleText = isVictory ? 'VICTORY!' : 'GAME OVER';

    // Continue hint: only for defeats (can't continue after winning)
    let continueHint = '';
    if (!isVictory && this.onContinue !== null) {
      const continueUnlocked = useMetaStore.getState().purchasedUpgrades.includes('extra_continue');
      if (continueUnlocked) {
        continueHint = this.continueAvailable
          ? `<p style="font-size:18px;margin-top:16px;letter-spacing:2px;color:#00ff88;">PRESS C TO CONTINUE</p>`
          : `<p style="font-size:18px;margin-top:16px;letter-spacing:2px;opacity:0.35;">CONTINUE USED</p>`;
      }
    }

    this.hud.showOverlay(`
      <h1 style="font-size:48px;margin-bottom:24px;text-shadow:0 0 20px ${titleGlow};letter-spacing:4px;color:${titleColor};">${titleText}</h1>
      <p style="font-size:28px;margin:12px 0;">SCORE: ${this.finalScore}</p>
      <p style="font-size:28px;margin:12px 0;">WAVE: ${this.finalWave}</p>
      <p style="font-size:28px;margin:12px 0;">KILLS: ${this.finalKills}</p>
      ${this.goldConverted > 0
        ? `<p style="font-size:16px;margin:8px 0;color:#ffd700;opacity:0.8;">GOLD→SI$: ${this.goldConverted} × ${Math.round(this.conversionRate * 100)}% = ${Math.floor(this.goldConverted * this.conversionRate)}</p>`
        : ''}
      <p style="font-size:20px;margin:12px 0;color:#ffd700;">SI$ EARNED: ${this.siEarned} | TOTAL: ${this.totalSI}</p>
      ${continueHint}
      <p style="font-size:18px;margin-top:${continueHint ? '8' : '40'}px;opacity:0.7;letter-spacing:2px;">PRESS R TO ${isVictory ? 'PLAY AGAIN' : 'RESTART'}</p>
      <p style="font-size:18px;margin-top:8px;opacity:0.7;letter-spacing:2px;">PRESS M FOR MENU</p>
    `);
  }

  update(_dt: number): void {
    if (this.continueAvailable && this.input.justPressed('KeyC')) {
      this.input.clearJustPressed();
      this.onContinue!();
      return;
    }

    if (this.input.justPressed('KeyR')) {
      this.input.clearJustPressed();
      this.restartGame();
      return;
    }

    if (this.input.justPressed('KeyM')) {
      this.input.clearJustPressed();
      this.returnToMenu();
      return;
    }

    this.input.clearJustPressed();
  }

  private restartGame(): void {
    runState.reset();

    this.ctx.player.active = true;
    this.ctx.player.mesh.visible = true;
    this.ctx.player.x = 0;

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
    this.ctx.bunkerManager.reset(); // bunkers re-spawn in PlayingState.enter()
    this.ctx.formation.spawnWave();

    this.onRestart();
  }

  private returnToMenu(): void {
    runState.reset(); // FIX: clear lives/wave/score/gamePhase before returning to menu
    this.ctx.activeBullets.forEach((b) => {
      if (b.isPlayerBullet) this.ctx.playerBulletPool.release(b);
      else this.ctx.enemyBulletPool.release(b);
    });
    this.ctx.activeBullets.length = 0;
    this.ctx.spawnSystem.reset();
    this.ctx.aiSystem.reset();
    this.ctx.shopSystem.reset();
    this.ctx.powerUpManager.releaseAll();
    this.ctx.boss.deactivate();
    this.ctx.bossSystem.reset();
    this.ctx.bossHealthBar.hide();
    this.ctx.bunkerManager.reset();

    this.onReturnToMenu();
  }

  render(_alpha: number): void {
    this.ctx.scene.render();
  }

  exit(): void {}
}
