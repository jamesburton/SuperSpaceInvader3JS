import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import { PlayingState } from './PlayingState';
import type { PlayingStateContext } from './PlayingState';
import { MetaShopUI } from '../ui/MetaShopUI';
import { runState } from '../state/RunState';

type MenuOption = 'campaign' | 'endless' | 'upgrades';

const OPTIONS: MenuOption[] = ['campaign', 'endless', 'upgrades'];

export class TitleState implements IGameState {
  private metaShopUI: MetaShopUI | null = null;
  private selectedOption: MenuOption = 'campaign'; // default: Campaign

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
  ) {}

  enter(): void {
    if (!this.metaShopUI) {
      const hudRoot = document.getElementById('hud') as HTMLElement;
      this.metaShopUI = new MetaShopUI(hudRoot);
    }

    this._renderMenu();
  }

  private _renderMenu(): void {
    const optionStyle = (opt: MenuOption): string => {
      const isSelected = this.selectedOption === opt;
      return isSelected
        ? 'opacity:1;text-shadow:0 0 20px #fff,0 0 8px #fff;color:#ffffff;'
        : 'opacity:0.45;text-shadow:none;color:#ffffff;';
    };

    const campaignSelected = this.selectedOption === 'campaign';
    const endlessSelected = this.selectedOption === 'endless';
    const upgradesSelected = this.selectedOption === 'upgrades';

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
        <h1 style="font-size:48px;margin-bottom:32px;text-shadow:0 0 20px #fff;letter-spacing:4px;color:#fff;">
          SUPER SPACE INVADERS X
        </h1>

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

        </div>

        <p style="font-size:13px;opacity:0.5;letter-spacing:2px;margin-top:8px;">
          ARROW KEYS TO NAVIGATE &nbsp;|&nbsp; ENTER TO SELECT
        </p>
      </div>
    `;

    this.hud.showOverlay(html);
  }

  update(_dt: number): void {
    // While MetaShopUI is open, only handle close key (ESC handled by MetaShopUI internally)
    if (this.metaShopUI?.isVisible) {
      this.input.clearJustPressed();
      return;
    }

    const currentIndex = OPTIONS.indexOf(this.selectedOption);

    if (this.input.justPressed('ArrowDown')) {
      this.selectedOption = OPTIONS[(currentIndex + 1) % OPTIONS.length];
      this._renderMenu();
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('ArrowUp')) {
      this.selectedOption = OPTIONS[(currentIndex - 1 + OPTIONS.length) % OPTIONS.length];
      this._renderMenu();
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

    if (this.input.justPressed('Space') || this.input.justPressed('Enter')) {
      this._launchSelected();
      return;
    }

    this.input.clearJustPressed();
  }

  private _launchSelected(): void {
    if (this.selectedOption === 'upgrades') {
      this.metaShopUI?.show(() => { this.metaShopUI!.hide(); });
      this.input.clearJustPressed();
      return;
    }
    this._resetAllSystems();
    runState.setMode(this.selectedOption);  // 'campaign' or 'endless'
    runState.setCampaignLevel(0);           // start at level index 0
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
    // Scene still renders (black canvas visible behind overlay)
    this.ctx.scene.render();
  }

  exit(): void {
    this.hud.hideOverlay();
    this.metaShopUI?.hide();
  }
}
