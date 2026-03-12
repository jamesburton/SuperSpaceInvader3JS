import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import { POWER_UP_DEFS, type PowerUpType } from '../config/powerups';
import { PlayingState } from './PlayingState';
import type { PlayingStateContext } from './PlayingState';
import { NameEntryState } from './NameEntryState';
import { MetaShopUI } from '../ui/MetaShopUI';
import { HighScoreUI } from '../ui/HighScoreUI';
import { runState } from '../state/RunState';
import { CAMPAIGN_CHAPTER_1 } from '../config/campaign';
import { useMetaStore } from '../state/MetaState';
import {
  getUnlockedDifficultyOptions,
  getUnlockedStartingPowerUps,
  hasStartingPowerUpSlot,
  type DifficultySetting,
} from '../state/runSetup';
import { audioManager } from '../systems/AudioManager';
import { profileManager } from '../state/ProfileManager';

type MenuOption = 'campaign' | 'endless' | 'upgrades' | 'scores';
type LaunchMode = 'campaign' | 'endless';
type RunSetupRow = 'difficulty' | 'powerup' | 'confirm';

interface RunSetupState {
  mode: LaunchMode;
  campaignLevelIndex: number;
  difficultyOptions: DifficultySetting[];
  powerUpOptions: Array<PowerUpType | null>;
  difficultyIndex: number;
  powerUpIndex: number;
  selectedRow: number;
}

const OPTIONS: MenuOption[] = ['campaign', 'endless', 'upgrades', 'scores'];

export class TitleState implements IGameState {
  private metaShopUI: MetaShopUI | null = null;
  private highScoreUI: HighScoreUI | null = null;
  private selectedOption: MenuOption = 'campaign';
  private _levelSelectVisible: boolean = false;
  private runSetupState: RunSetupState | null = null;

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
  ) {}

  enter(): void {
    audioManager.stopBgm();
    const hudRoot = document.getElementById('hud') as HTMLElement;
    if (!this.metaShopUI) {
      this.metaShopUI = new MetaShopUI(hudRoot, this.ctx.scene);
    }
    if (!this.highScoreUI) {
      this.highScoreUI = new HighScoreUI(hudRoot);
    }

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
    if (this.metaShopUI?.isVisible) {
      this.metaShopUI.update(this.input);
      this.input.clearJustPressed();
      return;
    }

    if (this.highScoreUI?.isVisible) {
      this.highScoreUI.update(this.input);
      this.input.clearJustPressed();
      return;
    }

    if (this.runSetupState) {
      this._updateRunSetup();
      return;
    }

    if (this._levelSelectVisible) {
      if (this.input.justPressed('Escape')) {
        this._levelSelectVisible = false;
        (window as unknown as Record<string, unknown>).__campaignLevelSelect = undefined;
        this._renderMenu();
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

      this._showRunSetup('campaign', 0);
      return;
    }

    this._showRunSetup('endless', 0);
  }

  private _showLevelSelect(highestUnlockedStart: number): void {
    const chapter = CAMPAIGN_CHAPTER_1;
    const levels = chapter.levels;

    (window as unknown as Record<string, unknown>).__campaignLevelSelect = (levelIndex: number) => {
      this._levelSelectVisible = false;
      this.hud.hideOverlay();
      this._showRunSetup('campaign', levelIndex);
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

  private _showRunSetup(mode: LaunchMode, campaignLevelIndex: number): void {
    const meta = useMetaStore.getState();
    const difficultyOptions = getUnlockedDifficultyOptions(meta.purchasedUpgrades);
    const hasStartingSlot = hasStartingPowerUpSlot(meta.purchasedUpgrades);
    const unlockedPowerUps = hasStartingSlot ? getUnlockedStartingPowerUps(meta.purchasedUpgrades) : [];
    const powerUpOptions = hasStartingSlot ? [null, ...unlockedPowerUps] : [];
    const difficultyIndex = Math.max(0, difficultyOptions.indexOf(meta.difficulty));
    const preferredPowerUp = meta.startingPowerUp && unlockedPowerUps.includes(meta.startingPowerUp)
      ? meta.startingPowerUp
      : null;
    const powerUpIndex = hasStartingSlot
      ? Math.max(0, powerUpOptions.findIndex((option) => option === preferredPowerUp))
      : 0;

    this.runSetupState = {
      mode,
      campaignLevelIndex,
      difficultyOptions,
      powerUpOptions,
      difficultyIndex,
      powerUpIndex,
      selectedRow: 0,
    };

    this._renderRunSetup();
  }

  private _getRunSetupRows(): RunSetupRow[] {
    if (!this.runSetupState) return [];
    const rows: RunSetupRow[] = ['difficulty'];
    if (this.runSetupState.powerUpOptions.length > 0) {
      rows.push('powerup');
    }
    rows.push('confirm');
    return rows;
  }

  private _updateRunSetup(): void {
    const setup = this.runSetupState;
    if (!setup) return;

    const rows = this._getRunSetupRows();
    const currentRow = rows[setup.selectedRow];

    if (this.input.justPressed('Escape')) {
      this.runSetupState = null;
      this._renderMenu();
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('ArrowUp')) {
      setup.selectedRow = (setup.selectedRow - 1 + rows.length) % rows.length;
      this._renderRunSetup();
      audioManager.playSfx('menuNav');
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('ArrowDown')) {
      setup.selectedRow = (setup.selectedRow + 1) % rows.length;
      this._renderRunSetup();
      audioManager.playSfx('menuNav');
      this.input.clearJustPressed();
      return;
    }

    if (currentRow === 'difficulty' && (this.input.justPressed('ArrowLeft') || this.input.justPressed('ArrowRight'))) {
      const delta = this.input.justPressed('ArrowRight') ? 1 : -1;
      setup.difficultyIndex = (setup.difficultyIndex + delta + setup.difficultyOptions.length) % setup.difficultyOptions.length;
      this._renderRunSetup();
      audioManager.playSfx('menuNav');
      this.input.clearJustPressed();
      return;
    }

    if (currentRow === 'powerup' && setup.powerUpOptions.length > 0 &&
      (this.input.justPressed('ArrowLeft') || this.input.justPressed('ArrowRight'))) {
      const delta = this.input.justPressed('ArrowRight') ? 1 : -1;
      setup.powerUpIndex = (setup.powerUpIndex + delta + setup.powerUpOptions.length) % setup.powerUpOptions.length;
      this._renderRunSetup();
      audioManager.playSfx('menuNav');
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('Space') || this.input.justPressed('Enter')) {
      if (currentRow === 'confirm') {
        this._confirmRunSetup();
      } else {
        setup.selectedRow = Math.min(setup.selectedRow + 1, rows.length - 1);
        this._renderRunSetup();
        audioManager.playSfx('menuNav');
      }
      this.input.clearJustPressed();
      return;
    }

    this.input.clearJustPressed();
  }

  private _renderRunSetup(): void {
    const setup = this.runSetupState;
    if (!setup) return;

    const rows = this._getRunSetupRows();
    const isGamepad = this.input.activeInputDevice === 'gamepad';
    const modeLabel = setup.mode === 'campaign'
      ? `CAMPAIGN — LEVEL ${CAMPAIGN_CHAPTER_1.levels[setup.campaignLevelIndex]?.levelNumber ?? 1}`
      : 'ENDLESS';
    const selectedDifficulty = setup.difficultyOptions[setup.difficultyIndex];
    const selectedPowerUp = setup.powerUpOptions[setup.powerUpIndex] ?? null;

    const renderChoiceRow = (
      row: RunSetupRow,
      label: string,
      options: string[],
      selectedIndex: number,
    ): string => {
      const active = rows[setup.selectedRow] === row;
      const border = active ? '#ffffff' : '#0ff';
      const shadow = active ? '0 0 18px #fff,0 0 8px #fff' : '0 0 12px #0ff';

      return `
        <div style="width:min(720px,92vw);border:1px solid ${border};box-shadow:${shadow};padding:16px 18px;margin-bottom:14px;background:${active ? 'rgba(255,255,255,0.06)' : 'rgba(0,255,255,0.04)'};">
          <div style="font-size:12px;letter-spacing:3px;color:${active ? '#fff' : '#88faff'};margin-bottom:10px;">${label}</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
            ${options.map((option, index) => {
              const optionSelected = index === selectedIndex;
              return `<button
                onclick="window.__runSetup${row === 'difficulty' ? 'Difficulty' : 'Power'}(${index})"
                style="background:${optionSelected ? 'rgba(255,255,255,0.14)' : 'transparent'};border:1px solid ${optionSelected ? '#ffffff' : '#0ff'};color:${optionSelected ? '#ffffff' : '#0ff'};font-family:'Courier New',monospace;font-size:14px;padding:8px 14px;cursor:pointer;letter-spacing:1px;min-width:112px;">
                ${option}
              </button>`;
            }).join('')}
          </div>
        </div>
      `;
    };

    const powerUpLabels = setup.powerUpOptions.map((option) => option ? POWER_UP_DEFS[option].displayName : 'NONE');

    this.hud.showOverlay(`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;padding:24px 0;">
        <div style="font-size:12px;letter-spacing:4px;color:#88faff;opacity:0.8;margin-bottom:10px;">${modeLabel}</div>
        <h1 style="font-size:36px;letter-spacing:4px;text-shadow:0 0 20px #0ff;color:#fff;margin-bottom:8px;">RUN SETUP</h1>
        <p style="font-size:13px;letter-spacing:2px;opacity:0.7;margin-bottom:24px;">
          Choose difficulty and your opening loadout before launch.
        </p>

        ${renderChoiceRow(
          'difficulty',
          'DIFFICULTY',
          setup.difficultyOptions.map((difficulty) => difficulty.toUpperCase()),
          setup.difficultyIndex,
        )}

        ${setup.powerUpOptions.length > 0
          ? renderChoiceRow('powerup', 'STARTING POWER-UP', powerUpLabels, setup.powerUpIndex)
          : `
            <div style="width:min(720px,92vw);border:1px solid #333;padding:16px 18px;margin-bottom:14px;background:rgba(255,255,255,0.03);">
              <div style="font-size:12px;letter-spacing:3px;color:#777;margin-bottom:10px;">STARTING POWER-UP</div>
              <div style="font-size:14px;color:#999;letter-spacing:1px;">PURCHASE TACTICAL SLOT IN THE META SHOP TO UNLOCK THIS CHOICE.</div>
            </div>
          `}

        <div style="width:min(720px,92vw);border:1px solid ${rows[setup.selectedRow] === 'confirm' ? '#ffffff' : '#0ff'};padding:16px 18px;background:${rows[setup.selectedRow] === 'confirm' ? 'rgba(255,255,255,0.08)' : 'rgba(0,255,255,0.04)'};">
          <div style="font-size:12px;letter-spacing:3px;color:${rows[setup.selectedRow] === 'confirm' ? '#fff' : '#88faff'};margin-bottom:10px;">READY</div>
          <div style="font-size:15px;color:#fff;letter-spacing:1px;margin-bottom:14px;">
            ${selectedDifficulty.toUpperCase()}${setup.powerUpOptions.length > 0 ? ` • ${selectedPowerUp ? POWER_UP_DEFS[selectedPowerUp].displayName : 'NONE'}` : ''}
          </div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button onclick="window.__runSetupStart()" style="background:transparent;border:1px solid #fff;color:#fff;font-family:'Courier New',monospace;font-size:14px;padding:8px 18px;cursor:pointer;letter-spacing:2px;">LAUNCH</button>
            <button onclick="window.__runSetupCancel()" style="background:transparent;border:1px solid #555;color:#aaa;font-family:'Courier New',monospace;font-size:14px;padding:8px 18px;cursor:pointer;letter-spacing:2px;">CANCEL</button>
          </div>
        </div>

        <p style="font-size:13px;opacity:0.5;letter-spacing:2px;margin-top:18px;">
          ${isGamepad
            ? 'D-PAD TO MOVE • A TO ADVANCE • B TO CANCEL'
            : 'ARROWS TO MOVE • ENTER TO ADVANCE • ESC TO CANCEL'}
        </p>
      </div>
    `);

    const globals = window as unknown as Record<string, unknown>;
    globals.__runSetupDifficulty = (index: number) => {
      if (!this.runSetupState) return;
      this.runSetupState.difficultyIndex = Math.max(0, Math.min(index, this.runSetupState.difficultyOptions.length - 1));
      this.runSetupState.selectedRow = 0;
      this._renderRunSetup();
    };
    globals.__runSetupPower = (index: number) => {
      if (!this.runSetupState || this.runSetupState.powerUpOptions.length === 0) return;
      this.runSetupState.powerUpIndex = Math.max(0, Math.min(index, this.runSetupState.powerUpOptions.length - 1));
      this.runSetupState.selectedRow = this._getRunSetupRows().indexOf('powerup');
      this._renderRunSetup();
    };
    globals.__runSetupStart = () => this._confirmRunSetup();
    globals.__runSetupCancel = () => {
      this.runSetupState = null;
      this._renderMenu();
    };
  }

  private _confirmRunSetup(): void {
    const setup = this.runSetupState;
    if (!setup) return;

    const selectedDifficulty = setup.difficultyOptions[setup.difficultyIndex] ?? 'normal';
    const selectedPowerUp = setup.powerUpOptions[setup.powerUpIndex] ?? null;
    const meta = useMetaStore.getState();
    meta.setDifficulty(selectedDifficulty);
    meta.setStartingPowerUp(selectedPowerUp);
    this.runSetupState = null;
    this._startRun(setup.mode, setup.campaignLevelIndex);
  }

  private _startRun(mode: LaunchMode, campaignLevelIndex: number): void {
    this._resetAllSystems();
    runState.setMode(mode);
    runState.setCampaignLevel(campaignLevelIndex);
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

  private _resetAllSystems(): void {
    runState.reset();
    const { ctx } = this;
    ctx.player.active = true;
    ctx.player.mesh.visible = true;
    ctx.player.x = 0;
    ctx.activeBullets.forEach((b) => b.isPlayerBullet
      ? ctx.playerBulletPool.release(b)
      : ctx.enemyBulletPool.release(b));
    ctx.activeBullets.length = 0;
    ctx.collisionSystem.reset();
    ctx.spawnSystem.reset();
    ctx.aiSystem.reset();
    ctx.shopSystem.reset();
    ctx.powerUpManager.releaseAll();
    ctx.homingMissileManager.releaseAll();
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
    const globals = window as unknown as Record<string, unknown>;
    globals.__campaignLevelSelect = undefined;
    globals.__changePlayer = undefined;
    globals.__runSetupDifficulty = undefined;
    globals.__runSetupPower = undefined;
    globals.__runSetupStart = undefined;
    globals.__runSetupCancel = undefined;
    this._levelSelectVisible = false;
    this.runSetupState = null;
  }
}
