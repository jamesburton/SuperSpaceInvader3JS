import type { IGameState } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { PlayingStateContext } from './PlayingState';
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';
import { audioManager } from '../systems/AudioManager';
import { profileManager } from '../state/ProfileManager';

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
  /** Track last hint device to detect changes in update() */
  private lastHintDevice: 'keyboard' | 'gamepad' = 'keyboard';

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
    audioManager.stopBgm();           // Phase 6: stop BGM when game ends (AUD-01)
    audioManager.playSfx('gameOver'); // Phase 6: game over SFX (AUD-03)

    // Record high score for current player profile
    const playerName = profileManager.getActiveProfileName();
    if (playerName) {
      profileManager.recordScore(playerName, this.finalScore, this.finalWave, runState.mode);
    }
    profileManager.saveCurrentState();
    const isVictory = this.type === 'victory';
    const titleColor = isVictory ? '#ffd700' : '#f44';
    const titleGlow = isVictory ? '#ffd700' : '#f44';
    const titleText = isVictory ? 'VICTORY!' : 'GAME OVER';

    // Initialize hint device tracking
    this.lastHintDevice = this.input.activeInputDevice;
    const isGamepad = this.lastHintDevice === 'gamepad';

    // Continue hint: only for defeats (can't continue after winning)
    let continueHint = '';
    if (!isVictory && this.onContinue !== null) {
      const continueUnlocked = useMetaStore.getState().purchasedUpgrades.includes('extra_continue');
      if (continueUnlocked) {
        const continueText = this.continueAvailable
          ? (isGamepad ? 'Y: CONTINUE' : 'PRESS C TO CONTINUE')
          : (isGamepad ? 'Y: CONTINUE (USED)' : 'CONTINUE USED');
        const continueStyle = this.continueAvailable
          ? 'font-size:18px;margin-top:16px;letter-spacing:2px;color:#00ff88;'
          : 'font-size:18px;margin-top:16px;letter-spacing:2px;opacity:0.35;';
        continueHint = `<p id="hint-continue" style="${continueStyle}">${continueText}</p>`;
      }
    }

    const restartText = isGamepad ? `A: ${isVictory ? 'PLAY AGAIN' : 'RESTART'}` : `PRESS R TO ${isVictory ? 'PLAY AGAIN' : 'RESTART'}`;
    const menuText = isGamepad ? 'B: MENU' : 'PRESS M FOR MENU';

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
      <p id="hint-restart" style="font-size:18px;margin-top:${continueHint ? '8' : '40'}px;opacity:0.7;letter-spacing:2px;">${restartText}</p>
      <p id="hint-menu" style="font-size:18px;margin-top:8px;opacity:0.7;letter-spacing:2px;">${menuText}</p>
    `);
  }

  update(_dt: number): void {
    // Update hint text dynamically when player switches input device
    if (this.input.activeInputDevice !== this.lastHintDevice) {
      this.lastHintDevice = this.input.activeInputDevice;
      const isGamepad = this.lastHintDevice === 'gamepad';
      const isVictory = this.type === 'victory';

      const restartEl = document.getElementById('hint-restart');
      if (restartEl) {
        restartEl.textContent = isGamepad
          ? `A: ${isVictory ? 'PLAY AGAIN' : 'RESTART'}`
          : `PRESS R TO ${isVictory ? 'PLAY AGAIN' : 'RESTART'}`;
      }

      const menuEl = document.getElementById('hint-menu');
      if (menuEl) {
        menuEl.textContent = isGamepad ? 'B: MENU' : 'PRESS M FOR MENU';
      }

      const continueEl = document.getElementById('hint-continue');
      if (continueEl) {
        if (this.continueAvailable) {
          continueEl.textContent = isGamepad ? 'Y: CONTINUE' : 'PRESS C TO CONTINUE';
        } else {
          continueEl.textContent = isGamepad ? 'Y: CONTINUE (USED)' : 'CONTINUE USED';
        }
      }
    }

    if (this.continueAvailable && this.input.justPressed('KeyC')) {
      this.input.clearJustPressed();
      this.onContinue!();
      return;
    }

    // A button (Space) = restart
    if (this.input.justPressed('Space')) {
      this.input.clearJustPressed();
      this.restartGame();
      return;
    }

    if (this.input.justPressed('KeyR')) {
      this.input.clearJustPressed();
      this.restartGame();
      return;
    }

    // B button (Escape) = return to menu
    if (this.input.justPressed('Escape')) {
      this.input.clearJustPressed();
      this.returnToMenu();
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
