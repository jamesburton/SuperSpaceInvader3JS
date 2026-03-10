import { profileManager } from '../state/ProfileManager';
import type { InputManager } from '../core/InputManager';

/**
 * HighScoreUI — displays high score table as a DOM overlay.
 * Shows all player scores (except hidden ones) alongside default AI entries.
 * Provides Hide/Show functionality per player name.
 */
export class HighScoreUI {
  private readonly el: HTMLElement;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  private onCloseCallback: (() => void) | null = null;
  private showingHidden: boolean = false;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'highscore-overlay';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'inset:0',
      'background:rgba(0,0,0,0.94)',
      'flex-direction:column',
      'align-items:center',
      'justify-content:flex-start',
      'padding-top:40px',
      'font-family:"Courier New",monospace',
      'color:#fff',
      'z-index:200',
      'overflow-y:auto',
      'pointer-events:auto',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (this.showingHidden) {
          this.showingHidden = false;
          this.render();
        } else {
          this.onCloseCallback?.();
        }
      }
    };
  }

  public show(onClose: () => void): void {
    this.onCloseCallback = onClose;
    this.showingHidden = false;
    this.render();
    this.el.style.display = 'flex';
    window.addEventListener('keydown', this.keyHandler);
  }

  public hide(): void {
    this.el.style.display = 'none';
    window.removeEventListener('keydown', this.keyHandler);
    this.onCloseCallback = null;
  }

  public get isVisible(): boolean {
    return this.el.style.display !== 'none';
  }

  public update(input: InputManager): void {
    if (!this.isVisible) return;
    if (input.justPressed('Escape')) {
      if (this.showingHidden) {
        this.showingHidden = false;
        this.render();
      } else {
        this.onCloseCallback?.();
      }
    }
  }

  private render(): void {
    if (this.showingHidden) {
      this._renderHiddenPlayers();
      return;
    }

    const scores = profileManager.getHighScores();
    const hidden = new Set(profileManager.getHiddenProfiles());
    const activePlayer = profileManager.getActiveProfileName();

    // Filter out hidden player entries
    const visibleScores = scores.filter(s => !hidden.has(s.name));

    const cyan = '#00ffff';
    const gold = '#ffd700';
    const glow = `0 0 10px ${cyan}`;

    const rows = visibleScores.slice(0, 20).map((entry, i) => {
      const rank = i + 1;
      const isCurrentPlayer = entry.name === activePlayer;
      const rankStr = String(rank).padStart(2, ' ');
      const nameColor = isCurrentPlayer ? cyan : '#fff';
      const scoreColor = gold;
      const isDefaultEntry = entry.date.startsWith('19'); // default entries are from the 80s/90s

      const hideBtn = !isDefaultEntry
        ? `<span onclick="window.__hideScorePlayer('${entry.name.replace(/'/g, "\\'")}')" style="color:#555;cursor:pointer;font-size:11px;margin-left:8px;">[HIDE]</span>`
        : '';

      return `
        <tr style="border-bottom:1px solid #222;">
          <td style="padding:6px 12px;color:#666;font-size:14px;">${rankStr}</td>
          <td style="padding:6px 12px;color:${nameColor};font-size:16px;letter-spacing:2px;${isCurrentPlayer ? `text-shadow:${glow};` : ''}">${entry.name}${hideBtn}</td>
          <td style="padding:6px 12px;color:${scoreColor};font-size:16px;text-align:right;">${entry.score.toLocaleString()}</td>
          <td style="padding:6px 12px;color:#888;font-size:13px;text-align:center;">W${entry.wave}</td>
          <td style="padding:6px 12px;color:#555;font-size:12px;text-align:right;">${entry.mode.toUpperCase()}</td>
        </tr>
      `;
    }).join('');

    const hasHidden = hidden.size > 0;

    this.el.innerHTML = `
      <h2 style="font-size:30px;color:${cyan};text-shadow:${glow};letter-spacing:0.12em;margin-bottom:16px;">-- HIGH SCORES --</h2>

      <table style="border-collapse:collapse;min-width:500px;margin-bottom:24px;">
        <thead>
          <tr style="border-bottom:2px solid #444;">
            <th style="padding:8px 12px;color:#666;font-size:12px;text-align:left;">#</th>
            <th style="padding:8px 12px;color:#666;font-size:12px;text-align:left;">NAME</th>
            <th style="padding:8px 12px;color:#666;font-size:12px;text-align:right;">SCORE</th>
            <th style="padding:8px 12px;color:#666;font-size:12px;text-align:center;">WAVE</th>
            <th style="padding:8px 12px;color:#666;font-size:12px;text-align:right;">MODE</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      ${hasHidden ? `
        <button onclick="window.__showHiddenPlayers()"
          style="background:transparent;border:1px solid #555;color:#888;font-family:'Courier New',monospace;font-size:12px;padding:6px 16px;cursor:pointer;letter-spacing:1px;margin-bottom:16px;">
          SHOW HIDDEN PLAYERS (${hidden.size})
        </button>
      ` : ''}

      <div style="font-size:13px;color:#555;letter-spacing:2px;">ESC TO CLOSE</div>
    `;

    // Wire handlers
    (window as unknown as Record<string, unknown>)['__hideScorePlayer'] = (name: string) => {
      profileManager.hideProfile(name);
      this.render();
    };
    (window as unknown as Record<string, unknown>)['__showHiddenPlayers'] = () => {
      this.showingHidden = true;
      this.render();
    };
  }

  private _renderHiddenPlayers(): void {
    const hidden = profileManager.getHiddenProfiles();
    const cyan = '#00ffff';
    const glow = `0 0 10px ${cyan}`;

    const rows = hidden.map(name => `
      <div style="display:flex;align-items:center;gap:12px;margin:4px 0;">
        <span style="color:#888;font-size:16px;letter-spacing:2px;min-width:160px;">${name}</span>
        <button onclick="window.__unhidePlayer('${name.replace(/'/g, "\\'")}')"
          style="background:transparent;border:1px solid #0ff;color:#0ff;font-family:'Courier New',monospace;font-size:12px;padding:4px 12px;cursor:pointer;letter-spacing:1px;">
          SHOW
        </button>
      </div>
    `).join('');

    this.el.innerHTML = `
      <h2 style="font-size:30px;color:${cyan};text-shadow:${glow};letter-spacing:0.12em;margin-bottom:16px;">-- HIDDEN PLAYERS --</h2>
      ${hidden.length === 0
        ? '<p style="color:#666;font-size:14px;margin-bottom:24px;">No hidden players.</p>'
        : `<div style="margin-bottom:24px;">${rows}</div>`
      }
      <div style="font-size:13px;color:#555;letter-spacing:2px;">ESC TO GO BACK</div>
    `;

    (window as unknown as Record<string, unknown>)['__unhidePlayer'] = (name: string) => {
      profileManager.showProfile(name);
      this.render();
    };
  }
}
