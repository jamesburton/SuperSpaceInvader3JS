/**
 * PickupFeedback — DOM overlay component for Phase 3 power-up pickup visual.
 * Stub: shows power-up name with a CSS swell animation. Phase 3 activates.
 */
export class PickupFeedback {
  private readonly el: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'pickup-feedback';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%) scale(0.5)',
      'font-family:"Courier New",monospace',
      'font-size:28px',
      'color:#00ffff',
      'text-shadow:0 0 16px #00ffff',
      'pointer-events:none',
      'transition:transform 0.15s ease-out, opacity 0.3s ease-in',
      'opacity:0',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;

    // Inject keyframe animation for swell
    if (!document.getElementById('pickup-keyframes')) {
      const style = document.createElement('style');
      style.id = 'pickup-keyframes';
      style.textContent = `
        @keyframes pickup-swell {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity:0; }
          30%  { transform: translate(-50%,-50%) scale(1.2); opacity:1; }
          70%  { transform: translate(-50%,-50%) scale(1.0); opacity:1; }
          100% { transform: translate(-50%,-50%) scale(0.8); opacity:0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Show pickup feedback for a power-up.
   * @param name Display name (e.g., "SPREAD SHOT", "RAPID FIRE", "SHIELD")
   */
  public showPickup(name: string): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.el.textContent = name;
    this.el.style.display = 'block';
    this.el.style.animation = 'none';
    // Force reflow to restart animation
    void this.el.offsetHeight;
    this.el.style.animation = 'pickup-swell 0.8s ease-out forwards';
    this.hideTimer = setTimeout(() => {
      this.el.style.display = 'none';
      this.hideTimer = null;
    }, 800);
  }
}
