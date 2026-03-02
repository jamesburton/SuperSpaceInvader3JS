import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import { PlayingState } from './PlayingState';
import type { PlayingStateContext } from './PlayingState';

export class TitleState implements IGameState {
  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly ctx: PlayingStateContext,
  ) {}

  enter(): void {
    this.hud.showOverlay(`
      <h1 style="font-size:56px;margin-bottom:8px;text-shadow:0 0 20px #fff;letter-spacing:4px;">SUPER SPACE INVADERS X</h1>
      <p style="font-size:20px;margin-top:32px;opacity:0.8;letter-spacing:2px;">PRESS SPACE TO START</p>
    `);
  }

  update(_dt: number): void {
    if (this.input.justPressed('Space')) {
      this.input.clearJustPressed();
      this.stateManager.replace(
        new PlayingState(this.stateManager, this.input, this.hud, this.ctx),
      );
    }
  }

  render(_alpha: number): void {
    // Scene still renders (black canvas visible behind overlay)
    this.ctx.scene.render();
  }

  exit(): void {
    this.hud.hideOverlay();
  }
}
