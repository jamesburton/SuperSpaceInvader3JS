import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { CampaignLevel } from '../config/campaign';
import { useMetaStore } from '../state/MetaState';

/**
 * Atmospheric level briefing overlay shown between campaign levels.
 * Pushed onto the state stack by PlayingState when a non-boss level completes.
 * Dismissed by any keypress (or auto-dismiss timer if enabled in MetaStore).
 *
 * NOTE: briefingAutoDismiss and toggleBriefingAutoDismiss are added to MetaStore
 * in Plan 05-05. Until then, auto-dismiss is disabled (timer stays at Infinity).
 */
export class LevelBriefingState implements IGameState {
  private autoDismissTimer: number = 0;
  private readonly AUTO_DISMISS_DURATION = 6; // seconds

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly level: CampaignLevel,
    private readonly onDismiss: () => void,
  ) {}

  enter(): void {
    // briefingAutoDismiss added in Plan 05-05 — guard with optional access
    const meta = useMetaStore.getState() as unknown as Record<string, unknown>;
    const autoDismiss = typeof meta['briefingAutoDismiss'] === 'boolean'
      ? (meta['briefingAutoDismiss'] as boolean)
      : false;

    this.autoDismissTimer = autoDismiss ? this.AUTO_DISMISS_DURATION : Infinity;

    const timerHint = autoDismiss
      ? `<p style="font-size:12px;opacity:0.35;margin-top:12px;letter-spacing:1px;">AUTO-ADVANCING... | PRESS F TO DISABLE</p>`
      : `<p style="font-size:12px;opacity:0.35;margin-top:12px;letter-spacing:1px;">PRESS F TO ENABLE AUTO-ADVANCE</p>`;

    this.hud.showOverlay(`
      <p style="font-size:12px;letter-spacing:4px;opacity:0.5;margin-bottom:8px;text-transform:uppercase;">
        Chapter 1 — Level ${this.level.levelNumber}
      </p>
      <h1 style="font-size:36px;letter-spacing:3px;text-shadow:0 0 20px #0ff;margin-bottom:24px;text-transform:uppercase;">
        ${this.level.title}
      </h1>
      <p style="font-size:16px;max-width:520px;line-height:1.7;opacity:0.85;margin:0 auto 32px;">
        ${this.level.briefingText}
      </p>
      <p style="font-size:14px;opacity:0.55;letter-spacing:2px;">PRESS ANY KEY TO BEGIN</p>
      ${timerHint}
    `);
  }

  update(dt: number): void {
    if (isFinite(this.autoDismissTimer)) {
      this.autoDismissTimer -= dt;
      if (this.autoDismissTimer <= 0) {
        this._dismiss();
        return;
      }
    }

    // Toggle auto-dismiss preference with F key (requires Plan 05-05 MetaStore addition)
    if (this.input.justPressed('KeyF')) {
      const meta = useMetaStore.getState() as unknown as Record<string, unknown>;
      if (typeof meta['toggleBriefingAutoDismiss'] === 'function') {
        (meta['toggleBriefingAutoDismiss'] as () => void)();
        // Refresh overlay to update the toggle hint text
        this.enter();
      }
      this.input.clearJustPressed();
      return;
    }

    if (this.input.anyKeyJustPressed()) {
      this._dismiss();
      return;
    }

    this.input.clearJustPressed();
  }

  private _dismiss(): void {
    this.input.clearJustPressed();
    // pop() calls exit() on this state, then resume() on PlayingState below
    this.stateManager.pop();
    // onDismiss() runs after pop() — PlayingState.resume() has already fired
    this.onDismiss();
  }

  render(_alpha: number): void {
    // Scene renders behind the overlay; no custom render needed
  }

  exit(): void {
    this.hud.hideOverlay();
  }
}
