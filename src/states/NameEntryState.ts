import type { IGameState, StateManager } from '../core/StateManager';
import type { HUD } from '../ui/HUD';
import { profileManager } from '../state/ProfileManager';

/**
 * NameEntryState — shows before main menu if no player name is set.
 * Simple text input for the player name with a neon-styled form.
 * Also used as "Change Player" flow from the title screen.
 */
export class NameEntryState implements IGameState {
  private inputEl: HTMLInputElement | null = null;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(
    _stateManager: StateManager,
    private readonly hud: HUD,
    private readonly onComplete: (name: string) => void,
    private readonly mode: 'new' | 'switch' = 'new',
  ) {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && this.mode === 'switch') {
        this._close();
      }
    };
  }

  enter(): void {
    const existingProfiles = profileManager.getAllProfiles();
    const showProfileList = this.mode === 'switch' && existingProfiles.length > 0;

    const profileCards = showProfileList
      ? existingProfiles.map(name => {
          const isActive = name === profileManager.getActiveProfileName();
          return `<button
            onclick="window.__selectProfile('${name.replace(/'/g, "\\'")}')"
            style="display:block;width:100%;background:${isActive ? 'rgba(0,255,255,0.1)' : 'transparent'};border:1px solid ${isActive ? '#0ff' : '#444'};color:${isActive ? '#0ff' : '#aaa'};font-family:'Courier New',monospace;font-size:16px;padding:10px 20px;margin:4px 0;cursor:pointer;letter-spacing:2px;text-align:left;">
            ${isActive ? '> ' : '  '}${name.toUpperCase()}
          </button>`;
        }).join('')
      : '';

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;max-width:400px;">
        <h1 style="font-size:36px;color:#0ff;text-shadow:0 0 20px #0ff;letter-spacing:4px;margin-bottom:8px;">
          ${this.mode === 'new' ? 'ENTER YOUR NAME' : 'CHANGE PLAYER'}
        </h1>

        ${showProfileList ? `
          <div style="font-size:12px;color:#666;letter-spacing:2px;margin-bottom:4px;">SELECT EXISTING</div>
          <div style="width:100%;max-height:200px;overflow-y:auto;margin-bottom:16px;">
            ${profileCards}
          </div>
          <div style="font-size:12px;color:#666;letter-spacing:2px;">OR CREATE NEW</div>
        ` : ''}

        <div style="position:relative;width:100%;">
          <input id="name-input" type="text" maxlength="16" autocomplete="off" spellcheck="false"
            placeholder="YOUR NAME"
            style="width:100%;background:rgba(0,0,0,0.8);border:1px solid #0ff;color:#0ff;font-family:'Courier New',monospace;font-size:24px;padding:12px 16px;text-align:center;letter-spacing:3px;outline:none;text-transform:uppercase;box-shadow:0 0 10px rgba(0,255,255,0.3);" />
        </div>

        <button id="name-submit-btn"
          onclick="window.__submitPlayerName()"
          style="background:transparent;border:1px solid #0ff;color:#0ff;font-family:'Courier New',monospace;font-size:18px;padding:10px 40px;cursor:pointer;letter-spacing:3px;text-shadow:0 0 8px #0ff;margin-top:8px;">
          ${this.mode === 'new' ? 'START' : 'CREATE'}
        </button>

        ${this.mode === 'switch' ? `
          <p style="font-size:12px;color:#555;letter-spacing:2px;margin-top:8px;">ESC TO CANCEL</p>
        ` : ''}
      </div>
    `;

    this.hud.showOverlay(html);

    // Focus the input
    this.inputEl = document.getElementById('name-input') as HTMLInputElement;
    if (this.inputEl) {
      this.inputEl.focus();
      // Enter key submits
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this._submit();
        }
      });
    }

    // Wire handlers
    (window as unknown as Record<string, unknown>)['__submitPlayerName'] = () => this._submit();
    (window as unknown as Record<string, unknown>)['__selectProfile'] = (name: string) => {
      profileManager.switchProfile(name);
      this.hud.hideOverlay();
      this.onComplete(name);
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  private _submit(): void {
    const name = this.inputEl?.value.trim();
    if (!name || name.length === 0) return;
    const upperName = name.toUpperCase();

    if (this.mode === 'new' && !profileManager.hasActiveProfile()) {
      // First time — adopt existing data under this name
      profileManager.adoptExistingData(upperName);
    } else {
      // Create new profile (saves current first)
      profileManager.createProfile(upperName);
    }

    this.hud.hideOverlay();
    this.onComplete(upperName);
  }

  private _close(): void {
    this.hud.hideOverlay();
    window.removeEventListener('keydown', this.keyHandler);
    // Return to title without changing profile
    this.onComplete(profileManager.getActiveProfileName());
  }

  update(_dt: number): void {
    // Input is handled by DOM events
  }

  render(_alpha: number): void {
    // No WebGL rendering needed
  }

  exit(): void {
    window.removeEventListener('keydown', this.keyHandler);
    (window as unknown as Record<string, unknown>)['__submitPlayerName'] = undefined;
    (window as unknown as Record<string, unknown>)['__selectProfile'] = undefined;
  }
}
