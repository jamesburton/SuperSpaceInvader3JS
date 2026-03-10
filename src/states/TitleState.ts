import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import { PlayingState } from './PlayingState';
import type { PlayingStateContext } from './PlayingState';
import { NameEntryState } from './NameEntryState';
import { MetaShopUI } from '../ui/MetaShopUI';
import { HighScoreUI } from '../ui/HighScoreUI';
import { runState } from '../state/RunState';
import { CAMPAIGN_CHAPTER_1 } from '../config/campaign';
import { useMetaStore } from '../state/MetaState';
import { audioManager } from '../systems/AudioManager';
import { profileManager } from '../state/ProfileManager';

type MenuOption = 'campaign' | 'endless' | 'upgrades' | 'scores';

const OPTIONS: MenuOption[] = ['campaign', 'endless', 'upgrades', 'scores'];

export class TitleState implements IGameState {
  private metaShopUI: MetaShopUI | null = null;
  private highScoreUI: HighScoreUI | null = null;
  private selectedOption: MenuOption = 'campaign'; // default: Campaign
  private _levelSelectVisible: boolean = false;

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
  ) {}

  enter(): void {
    audioManager.stopBgm(); // Phase 6: stop BGM on return to menu (in case a run was in progress)
    const hudRoot = document.getElementById('hud') as HTMLElement;
    if (!this.metaShopUI) {
      this.metaShopUI = new MetaShopUI(hudRoot, this.ctx.scene);
    }
    if (!this.highScoreUI) {
      this.highScoreUI = new HighScoreUI(hudRoot);
    }

    // Save profile state on return to menu
    profileManager.saveCurrentState();

    this._renderMenu();
  }

  private _renderMenu(): void {
    const playerName = profileManager.getActiveProfileName();
    const optionStyle = (opt: MenuOption): string => {
      const isSelected = this.selectedOption === opt;
      return isSelected
        ? 'opacity:1;text-shadow:0 0 20px #fff,0 0 8px #fff;color:#ffffff;'
        : 'opacity:0.45;text-shadow:none;color:#ffffff;';
    };

    const campaignSelected = this.selectedOption === 'campaign';
    const endlessSelected = this.selectedOption === 'endless';
    const upgradesSelected = this.selectedOption === 'upgrades';
    const scoresSelected = this.selectedOption === 'scores';

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
        <h1 style="font-size:48px;margin-bottom:8px;text-shadow:0 0 20px #fff;letter-spacing:4px;color:#fff;">
          SUPER SPACE INVADERS X
        </h1>

        ${playerName ? `
          <div style="font-size:13px;color:#0ff;letter-spacing:3px;margin-bottom:24px;text-shadow:0 0 8px #0ff;">
            PLAYER: ${playerName}
            <span onclick="window.__changePlayer()" style="color:#555;cursor:pointer;margin-left:12px;font-size:11px;">[CHANGE]</span>
          </div>
        ` : '<div style="margin-bottom:24px;"></div>'}

        <div style="display:flex;flex-direction:column;align-items:center;gap:28px;margin-bottom:40px;">

          <div style="text-align:center;min-height:64px;${optionStyle('campaign')}">
            <div style="font-size:26px;letter-spacing:3px;line-height:1.2;">
              ${campaignSelected ? '&#9654; ' : '  '}CAMPAIGN [C]
            </div>
            <div style="font-size:13px;letter-spacing:2px;margin-top:4px;opacity:${campaignSelected ? '0.75' : '0.4'};">
              Handcrafted Story &mdash; Chapter 1 Available
            </div>
          </div>

          <div style="text-align:center;min-height:64px;${optionStyle('endless')}">
            <div style="font-size:26px;letter-spacing:3px;line-height:1.2;">
              ${endlessSelected ? '&#9654; ' : '  '}ENDLESS [E]
            </div>
            <div style="font-size:13px;letter-spacing:2px;margin-top:4px;opacity:${endlessSelected ? '0.75' : '0.4'};">
              Infinite Waves &mdash; Score Chase
            </div>
          </div>

          <div style="text-align:center;min-height:64px;${optionStyle('upgrades')}">
            <div style="font-size:26px;letter-spacing:3px;line-height:1.2;">
              ${upgradesSelected ? '&#9654; ' : '  '}UPGRADES [U]
            </div>
          </div>

          <div style="text-align:center;min-height:64px;${optionStyle('scores')}">
            <div style="font-size:26px;letter-spacing:3px;line-height:1.2;">
              ${scoresSelected ? '&#9654; ' : '  '}HIGH SCORES [H]
            </div>
          </div>

        </div>

        <p style="font-size:13px;opacity:0.5;letter-spacing:2px;margin-top:8px;">
          ${this.input.activeInputDevice === 'gamepad'
            ? 'D-PAD TO NAVIGATE &nbsp;|&nbsp; A TO SELECT'
            : 'ARROW KEYS TO NAVIGATE &nbsp;|&nbsp; ENTER TO SELECT'}
        </p>
      </div>
    `;

    this.hud.showOverlay(html);

    // Wire change player handler
    (window as unknown as Record<string, unknown>)['__changePlayer'] = () => {
      this.hud.hideOverlay();
      this.stateManager.replace(new NameEntryState(
        this.stateManager, this.hud,
        () => this.stateManager.replace(new TitleState(this.stateManager, this.input, this.hud, this.ctx)),
        'switch',
      ));
    };
  }

  update(_dt: number): void {
    // While MetaShopUI is open, only handle close key (ESC handled by MetaShopUI internally)
    if (this.metaShopUI?.isVisible) {
      this.metaShopUI.update(this.input);  // gamepad/keyboard cursor navigation (07-02)
      this.input.clearJustPressed();
      return;
    }

    // While HighScoreUI is open, delegate input
    if (this.highScoreUI?.isVisible) {
      this.highScoreUI.update(this.input);
      this.input.clearJustPressed();
      return;
    }

    // While level select is open, only handle ESC to cancel
    if (this._levelSelectVisible) {
      if (this.input.justPressed('Escape')) {
        this._levelSelectVisible = false;
        (window as unknown as Record<string, unknown>).__campaignLevelSelect = undefined;
        this._renderMenu(); // return to mode select
        this.input.clearJustPressed();
      } else {
        this.input.clearJustPressed();
      }
      return;
    }

    const currentIndex = OPTIONS.indexOf(this.selectedOption);

    if (this.input.justPressed('ArrowDown')) {
      this.selectedOption = OPTIONS[(currentIndex + 1) % OPTIONS.length];
      this._renderMenu();
      audioManager.playSfx('menuNav');
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('ArrowUp')) {
      this.selectedOption = OPTIONS[(currentIndex - 1 + OPTIONS.length) % OPTIONS.length];
      this._renderMenu();
      audioManager.playSfx('menuNav');
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('KeyC')) {
      this.selectedOption = 'campaign';
      this._launchSelected();
      return;
    }

    if (this.input.justPressed('KeyE')) {
      this.selectedOption = 'endless';
      this._launchSelected();
      return;
    }

    if (this.input.justPressed('KeyU')) {
      this.selectedOption = 'upgrades';
      this._launchSelected();
      return;
    }

    if (this.input.justPressed('KeyH')) {
      this.selectedOption = 'scores';
      this._launchSelected();
      return;
    }

    if (this.input.justPressed('Space') || this.input.justPressed('Enter')) {
      this._launchSelected();
      return;
    }

    this.input.clearJustPressed();
  }

  private _launchSelected(): void {
    audioManager.playSfx('menuNav');
    if (this.selectedOption === 'upgrades') {
      this.metaShopUI?.show(() => { this.metaShopUI!.hide(); });
      this.input.clearJustPressed();
      return;
    }

    if (this.selectedOption === 'scores') {
      this.highScoreUI?.show(() => { this.highScoreUI!.hide(); });
      this.input.clearJustPressed();
      return;
    }

    if (this.selectedOption === 'campaign') {
      const progress = useMetaStore.getState().campaignProgress[CAMPAIGN_CHAPTER_1.chapterNumber] ?? -1;
      const highestUnlockedStart = progress + 1;

      if (highestUnlockedStart > 0 && highestUnlockedStart < CAMPAIGN_CHAPTER_1.levels.length) {
        this._showLevelSelect(highestUnlockedStart);
        return;
      }
    }

    this._resetAllSystems();
    runState.setMode(this.selectedOption as 'campaign' | 'endless');
    runState.setCampaignLevel(0);
    this.input.clearJustPressed();
    this.stateManager.replace(
      new PlayingState(
        this.stateManager, this.input, this.hud, this.ctx,
        () => this.stateManager.replace(
          new TitleState(this.stateManager, this.input, this.hud, this.ctx),
        ),
      ),
    );
  }

  private _showLevelSelect(highestUnlockedStart: number): void {
    const chapter = CAMPAIGN_CHAPTER_1;
    const levels = chapter.levels;

    (window as unknown as Record<string, unknown>).__campaignLevelSelect = (levelIndex: number) => {
      this.hud.hideOverlay();
      this._resetAllSystems();
      runState.setMode('campaign');
      runState.setCampaignLevel(levelIndex);
      this.stateManager.replace(
        new PlayingState(
          this.stateManager, this.input, this.hud, this.ctx,
          () => this.stateManager.replace(
            new TitleState(this.stateManager, this.input, this.hud, this.ctx)
          ),
        )
      );
    };

    const cards = levels.map((level, idx) => {
      const isUnlocked = idx <= highestUnlockedStart;
      const statusLabel = idx === 0 ? 'Start' : isUnlocked ? 'Resume' : 'Locked';
      const lockStyle = isUnlocked ? '' : 'opacity:0.3;pointer-events:none;';
      const clickHandler = isUnlocked ? `onclick="window.__campaignLevelSelect(${idx})"` : '';
      return `
        <div style="
          display:inline-block;width:180px;margin:8px;padding:16px;
          border:1px solid ${isUnlocked ? '#0ff' : '#333'};
          border-radius:4px;cursor:${isUnlocked ? 'pointer' : 'default'};
          vertical-align:top;${lockStyle}
        " ${clickHandler}>
          <p style="font-size:11px;letter-spacing:3px;opacity:0.55;margin-bottom:4px;">LEVEL ${level.levelNumber}</p>
          <p style="font-size:16px;letter-spacing:2px;margin-bottom:8px;">${level.title.toUpperCase()}</p>
          <p style="font-size:12px;color:${isUnlocked ? '#0ff' : '#555'};">${statusLabel.toUpperCase()}</p>
        </div>`;
    }).join('');

    this.hud.showOverlay(`
      <h2 style="font-size:14px;letter-spacing:4px;opacity:0.6;margin-bottom:8px;">CHAPTER 1 — SELECT LEVEL</h2>
      <h1 style="font-size:32px;letter-spacing:3px;text-shadow:0 0 20px #0ff;margin-bottom:24px;">
        ${chapter.title.toUpperCase()}
      </h1>
      <div style="margin-bottom:24px;">${cards}</div>
      <p style="font-size:14px;opacity:0.5;letter-spacing:2px;">ESC TO CANCEL</p>
    `);

    this._levelSelectVisible = true;
  }

  private _resetAllSystems(): void {
    runState.reset();
    const { ctx } = this;
    ctx.player.active = true;
    ctx.player.mesh.visible = true;
    ctx.player.x = 0;
    ctx.activeBullets.forEach(b => b.isPlayerBullet
      ? ctx.playerBulletPool.release(b)
      : ctx.enemyBulletPool.release(b));
    ctx.activeBullets.length = 0;
    ctx.collisionSystem.reset();
    ctx.spawnSystem.reset();
    ctx.aiSystem.reset();
    ctx.shopSystem.reset();
    ctx.powerUpManager.releaseAll();
    ctx.boss.deactivate();
    ctx.bossSystem.reset();
    ctx.bossHealthBar.hide();
    ctx.bunkerManager.reset();
    ctx.formation.spawnWave();
  }

  render(_alpha: number): void {
    this.ctx.scene.render();
  }

  exit(): void {
    this.hud.hideOverlay();
    this.metaShopUI?.hide();
    this.highScoreUI?.hide();
    (window as unknown as Record<string, unknown>).__campaignLevelSelect = undefined;
    (window as unknown as Record<string, unknown>)['__changePlayer'] = undefined;
    this._levelSelectVisible = false;
  }
}
