import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';

export class PausedState implements IGameState {
  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
  ) {}

  enter(): void {
    this.hud.showOverlay(`
      <h1 style="font-size:48px;margin-bottom:32px;text-shadow:0 0 20px #fff;letter-spacing:4px;">PAUSED</h1>
      <p style="font-size:18px;opacity:0.7;letter-spacing:2px;">PRESS ESC or P TO RESUME</p>
    `);
  }

  update(_dt: number): void {
    // Only listen for resume input — ALL other game logic is frozen
    if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) {
      this.input.clearJustPressed();
      this.stateManager.pop(); // restores PlayingState via resume()
      return;
    }
    this.input.clearJustPressed();
  }

  render(_alpha: number): void {
    // Scene renders in background behind pause overlay — no update to game objects
  }

  exit(): void {
    // HUD overlay is hidden by PlayingState.resume()
  }
}
