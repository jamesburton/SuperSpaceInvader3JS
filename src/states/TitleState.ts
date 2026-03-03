import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import { PlayingState } from './PlayingState';
import type { PlayingStateContext } from './PlayingState';
import { MetaShopUI } from '../ui/MetaShopUI';

export class TitleState implements IGameState {
  private metaShopUI: MetaShopUI | null = null;

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

    this.hud.showOverlay(`
      <h1 style="font-size:56px;margin-bottom:8px;text-shadow:0 0 20px #fff;letter-spacing:4px;">SUPER SPACE INVADERS X</h1>
      <p style="font-size:20px;margin-top:32px;opacity:0.8;letter-spacing:2px;">PRESS SPACE TO START</p>
      <p style="font-size:14px;margin-top:16px;opacity:0.6;letter-spacing:2px;">PRESS U FOR UPGRADES</p>
    `);
  }

  update(_dt: number): void {
    // While MetaShopUI is open, only handle close key (ESC handled by MetaShopUI internally)
    if (this.metaShopUI?.isVisible) {
      this.input.clearJustPressed();
      return;
    }

    if (this.input.justPressed('Space')) {
      this.input.clearJustPressed();
      this.stateManager.replace(
        new PlayingState(this.stateManager, this.input, this.hud, this.ctx),
      );
      return;
    }

    if (this.input.justPressed('KeyU')) {
      this.input.clearJustPressed();
      this.metaShopUI?.show(() => {
        this.metaShopUI!.hide();
        // Title overlay remains visible behind MetaShopUI; no re-render needed
      });
      return;
    }

    this.input.clearJustPressed();
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
