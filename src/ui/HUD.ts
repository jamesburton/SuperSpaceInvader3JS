import type { RunStateData } from '../state/RunState';

export class HUD {
  private readonly scoreEl: HTMLElement;
  private readonly livesEl: HTMLElement;
  private readonly waveEl: HTMLElement;
  private readonly overlayEl: HTMLElement;

  constructor(hudRoot: HTMLElement) {
    // Create HUD elements inside the #hud container
    hudRoot.innerHTML = `
      <div id="hud-score" style="position:absolute;top:16px;left:16px;font-size:18px;font-family:'Courier New',monospace;color:#fff;text-shadow:0 0 8px #fff;">SCORE: 0</div>
      <div id="hud-wave" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);font-size:18px;font-family:'Courier New',monospace;color:#fff;text-shadow:0 0 8px #fff;">WAVE 1</div>
      <div id="hud-lives" style="position:absolute;top:16px;right:16px;font-size:18px;font-family:'Courier New',monospace;color:#fff;text-shadow:0 0 8px #fff;">LIVES: 3</div>
      <div id="hud-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.7);flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;color:#fff;"></div>
    `;

    this.scoreEl = hudRoot.querySelector('#hud-score') as HTMLElement;
    this.livesEl = hudRoot.querySelector('#hud-lives') as HTMLElement;
    this.waveEl = hudRoot.querySelector('#hud-wave') as HTMLElement;
    this.overlayEl = hudRoot.querySelector('#hud-overlay') as HTMLElement;
  }

  /** Sync HUD text from RunState. Called after each fixed update step. */
  public sync(state: RunStateData): void {
    this.scoreEl.textContent = `SCORE: ${state.score}`;
    this.livesEl.textContent = `LIVES: ${state.lives}`;
    this.waveEl.textContent = `WAVE ${state.wave}`;
  }

  /** Show full-screen overlay (pause, game over, title) */
  public showOverlay(html: string): void {
    this.overlayEl.innerHTML = html;
    this.overlayEl.style.display = 'flex';
  }

  public hideOverlay(): void {
    this.overlayEl.style.display = 'none';
  }

  /** Show "WAVE X" for a brief moment — called by SpawnSystem */
  public showWaveAnnouncement(wave: number): void {
    this.showOverlay(`<h1 style="font-size:48px;text-shadow:0 0 20px #fff;">WAVE ${wave}</h1>`);
    setTimeout(() => this.hideOverlay(), 2000); // 2 second announcement
  }
}
