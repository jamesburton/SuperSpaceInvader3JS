import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import { audioManager } from '../systems/AudioManager';
import { useMetaStore } from '../state/MetaState';

export class PausedState implements IGameState {
  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
  ) {}

  enter(): void {
    // Pause SFX plays immediately on entering pause state
    audioManager.playSfx('pause');

    const { volume, muted } = useMetaStore.getState();

    this.hud.showOverlay(`
      <h1 style="font-size:48px;margin-bottom:32px;text-shadow:0 0 20px #fff;letter-spacing:4px;">PAUSED</h1>
      <p style="font-size:18px;opacity:0.7;letter-spacing:2px;">PRESS ESC or P TO RESUME</p>
      <div style="margin-top:32px;display:flex;flex-direction:column;align-items:center;gap:16px;">
        <label style="font-family:'Courier New',monospace;color:#fff;font-size:14px;display:flex;align-items:center;gap:12px;">
          VOLUME
          <input id="vol-slider" type="range" min="0" max="1" step="0.05"
                 value="${volume}"
                 style="width:160px;accent-color:#0ff;cursor:pointer;" />
        </label>
        <button id="mute-btn" style="font-family:'Courier New',monospace;font-size:14px;cursor:pointer;
                background:transparent;border:1px solid #fff;color:#fff;padding:6px 16px;letter-spacing:2px;">
          ${muted ? 'UNMUTE' : 'MUTE'}
        </button>
      </div>
    `);

    const slider = document.getElementById('vol-slider') as HTMLInputElement | null;
    const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement | null;

    slider?.addEventListener('input', () => {
      audioManager.setVolume(parseFloat(slider.value));
    });

    muteBtn?.addEventListener('click', () => {
      const nowMuted = !useMetaStore.getState().muted;
      audioManager.setMuted(nowMuted);
      muteBtn.textContent = nowMuted ? 'UNMUTE' : 'MUTE';
    });
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
