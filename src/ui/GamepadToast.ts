/**
 * GamepadToast — bottom-center neon toast notifications for gamepad connect/disconnect events.
 *
 * Appends a single div to the provided hudRoot. All styling is inline to avoid
 * any external CSS dependency. Uses the same DOM construction pattern as HUD.ts.
 *
 * Usage:
 *   const toast = new GamepadToast(hudRoot);
 *   toast.show('CONTROLLER CONNECTED — Xbox Wireless Controller', 'connect');
 *   toast.show('WARNING: non-standard controller — inputs may be incorrect', 'warning');
 *   toast.show('CONTROLLER DISCONNECTED', 'disconnect');
 */
export class GamepadToast {
  private readonly el: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(hudRoot: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = [
      'position:absolute',
      'bottom:48px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:999',
      'display:none',
      'opacity:0',
      'padding:8px 18px',
      'font-family:\'Courier New\',monospace',
      'font-size:13px',
      'letter-spacing:1px',
      'white-space:nowrap',
      'pointer-events:none',
      'background:rgba(0,0,0,0.85)',
      'border:1px solid #00ffff',
      'color:#00ffff',
      'text-shadow:0 0 8px #00ffff,0 0 16px #00ffff',
      'box-shadow:0 0 12px rgba(0,255,255,0.4)',
      'transition:opacity 0.3s ease',
    ].join(';');
    hudRoot.appendChild(this.el);
  }

  /**
   * Show the toast with the given message and type.
   * If already visible, clears pending timers and resets with the new message.
   *
   * @param message  Text to display (kept short via white-space:nowrap)
   * @param type     'connect' | 'disconnect' => cyan (neon default)
   *                 'warning' => amber (#ffaa00) for compatibility warnings
   */
  public show(message: string, type: 'connect' | 'disconnect' | 'warning'): void {
    // Cancel any in-flight hide/fade timers from a previous call
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.fadeTimer !== null) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    // Apply type-specific colouring
    if (type === 'warning') {
      this.el.style.borderColor = '#ffaa00';
      this.el.style.color = '#ffaa00';
      this.el.style.textShadow = '0 0 8px #ffaa00,0 0 16px #ffaa00';
      this.el.style.boxShadow = '0 0 12px rgba(255,170,0,0.4)';
    } else {
      // connect / disconnect — cyan
      this.el.style.borderColor = '#00ffff';
      this.el.style.color = '#00ffff';
      this.el.style.textShadow = '0 0 8px #00ffff,0 0 16px #00ffff';
      this.el.style.boxShadow = '0 0 12px rgba(0,255,255,0.4)';
    }

    this.el.textContent = message;

    // Reset opacity to 0, make visible, then use rAF to trigger CSS transition
    this.el.style.opacity = '0';
    this.el.style.display = 'block';

    // rAF trick: browser must paint with opacity:0 before we transition to opacity:1
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.el.style.transition = 'opacity 0.3s ease';
        this.el.style.opacity = '1';
      });
    });

    // Hold ~2s then fade out over 0.5s (total visible ~2.8s)
    this.hideTimer = setTimeout(() => {
      this.el.style.transition = 'opacity 0.5s ease';
      this.el.style.opacity = '0';
      this.fadeTimer = setTimeout(() => {
        this.el.style.display = 'none';
        this.hideTimer = null;
        this.fadeTimer = null;
      }, 500);
    }, 2000);
  }
}
