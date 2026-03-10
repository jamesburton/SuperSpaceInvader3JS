import type { RunStateData } from '../state/RunState';
import type { PowerUpType } from '../config/powerups';
import { POWER_UP_DEFS } from '../config/powerups';
import { audioManager } from '../systems/AudioManager';

export class HUD {
  private readonly scoreEl: HTMLElement;
  private readonly livesEl: HTMLElement;
  private readonly waveEl: HTMLElement;
  private readonly overlayEl: HTMLElement;
  private readonly sidEl: HTMLElement;
  private readonly powerupEl: HTMLElement;
  private readonly powerupNameEl: HTMLElement;
  private readonly powerupBarEl: HTMLElement;
  private readonly timeSlowOverlayEl: HTMLElement;

  constructor(hudRoot: HTMLElement) {
    // Create HUD elements inside the #hud container
    hudRoot.innerHTML = `
      <div id="hud-score" style="position:absolute;top:16px;left:16px;font-size:18px;font-family:'Courier New',monospace;color:#fff;text-shadow:0 0 8px #fff;">SCORE: 0</div>
      <div id="hud-sid" style="position:absolute;top:40px;left:16px;font-size:14px;font-family:'Courier New',monospace;color:#ffd700;text-shadow:0 0 8px #ffd700;">Gold: 0</div>
      <div id="hud-wave" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);font-size:18px;font-family:'Courier New',monospace;color:#fff;text-shadow:0 0 8px #fff;">WAVE 1</div>
      <div id="hud-powerup" style="display:none;position:absolute;top:40px;left:50%;transform:translateX(-50%);text-align:center;">
        <div id="hud-powerup-name" style="font-size:12px;font-family:'Courier New',monospace;color:#00ff88;text-shadow:0 0 8px #00ff88;"></div>
        <div style="width:120px;height:6px;background:#333;margin-top:4px;">
          <div id="hud-powerup-bar" style="height:6px;background:#00ff88;width:100%;transition:width 0.1s linear;"></div>
        </div>
      </div>
      <div id="hud-timeslow-overlay" style="display:none;position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg, rgba(120,210,255,0.16), rgba(120,210,255,0.04));mix-blend-mode:screen;opacity:0;"></div>
      <div id="hud-lives" style="position:absolute;top:16px;right:16px;font-size:18px;font-family:'Courier New',monospace;color:#fff;text-shadow:0 0 8px #fff;">LIVES: 3</div>
      <div id="hud-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.7);flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;color:#fff;"></div>
      <div id="hud-controls" style="position:absolute;bottom:8px;right:8px;font-size:11px;font-family:'Courier New',monospace;color:#333;letter-spacing:1px;pointer-events:none;">P / ESC — pause</div>
    `;

    this.scoreEl = hudRoot.querySelector('#hud-score') as HTMLElement;
    this.sidEl = hudRoot.querySelector('#hud-sid') as HTMLElement;
    this.livesEl = hudRoot.querySelector('#hud-lives') as HTMLElement;
    this.waveEl = hudRoot.querySelector('#hud-wave') as HTMLElement;
    this.overlayEl = hudRoot.querySelector('#hud-overlay') as HTMLElement;
    this.powerupEl = hudRoot.querySelector('#hud-powerup') as HTMLElement;
    this.powerupNameEl = hudRoot.querySelector('#hud-powerup-name') as HTMLElement;
    this.powerupBarEl = hudRoot.querySelector('#hud-powerup-bar') as HTMLElement;
    this.timeSlowOverlayEl = hudRoot.querySelector('#hud-timeslow-overlay') as HTMLElement;
  }

  /** Sync HUD text from RunState. Called after each fixed update step. */
  public sync(state: RunStateData): void {
    this.scoreEl.textContent = `SCORE: ${state.score}`;
    this.livesEl.textContent = `LIVES: ${state.lives}`;
    this.waveEl.textContent = `WAVE ${state.wave}`;
    this.sidEl.textContent = `Gold: ${state.gold}`;
  }

  /**
   * Sync the power-up timer bar with the current power-up state.
   * Shows shield charge count or a proportional bar for timed power-ups.
   * Call each fixed step from PlayingState (wired in Plan 03-08).
   *
   * @param type           Currently active timed power-up type, or null
   * @param remaining      Seconds remaining on active timed power-up
   * @param full           Full duration of the active timed power-up (for % calculation)
   * @param shieldCharges  Number of active shield absorb charges (0 or 1)
   */
  public syncPowerUp(
    type: PowerUpType | null,
    remaining: number,
    full: number,
    shieldCharges: number,
  ): void {
    if (type === null && shieldCharges === 0) {
      this.powerupEl.style.display = 'none';
      return;
    }

    this.powerupEl.style.display = 'block';

    if (shieldCharges > 0) {
      // Shield is not timed — show full bar with shield label
      this.powerupNameEl.textContent = `SHIELD (${shieldCharges})`;
      this.powerupBarEl.style.width = '100%';
      this.powerupBarEl.style.background = '#00ff88';
    } else if (type) {
      // Timed power-up — show proportional bar
      const pct = full > 0 ? Math.max(0, remaining / full) * 100 : 0;
      const def = POWER_UP_DEFS[type];
      this.powerupNameEl.textContent = def.displayName;
      this.powerupBarEl.style.width = `${pct}%`;
      this.powerupBarEl.style.background = `#${def.color.toString(16).padStart(6, '0')}`;
    }
  }

  public setTimeSlowEffect(strength: number): void {
    const clamped = Math.max(0, Math.min(1, strength));
    this.timeSlowOverlayEl.style.display = clamped > 0.01 ? 'block' : 'none';
    this.timeSlowOverlayEl.style.opacity = `${clamped * 0.85}`;
  }

  /** Show full-screen overlay (pause, game over, title) */
  public showOverlay(html: string): void {
    this.overlayEl.innerHTML = html;
    this.overlayEl.style.display = 'flex';
    this.overlayEl.style.pointerEvents = 'auto';
  }

  public hideOverlay(): void {
    this.overlayEl.style.display = 'none';
    this.overlayEl.style.pointerEvents = 'none';
  }

  /** Show "WAVE X" neon-styled with the wave palette color, for 2.5 seconds */
  public showWaveAnnouncement(wave: number, hexColor?: number): void {
    audioManager.playSfx('waveStart'); // Phase 6: wave start SFX (AUD-03)
    const colorHex = hexColor !== undefined
      ? `#${hexColor.toString(16).padStart(6, '0')}`
      : '#00ffff'; // fallback cyan
    const glow = colorHex;
    this.showOverlay(
      `<h1 style="font-size:56px;font-family:'Courier New',monospace;color:${colorHex};text-shadow:0 0 24px ${glow},0 0 48px ${glow};letter-spacing:0.1em;">WAVE ${wave}</h1>`,
    );
    setTimeout(() => this.hideOverlay(), 2500); // 2.5 seconds (per spec: 2-3s)
  }
}
