import type { ShopItem } from '../systems/ShopSystem';

/**
 * ShopUI — DOM modal overlay for the between-wave upgrade shop.
 *
 * show() renders 3 upgrade cards with keyboard hints (1/2/3 to buy, ESC to skip).
 * hide() removes the key listener and hides the overlay.
 * PlayingState pauses AI/collision logic while isVisible is true (wired in Plan 03-08).
 */
export class ShopUI {
  private readonly el: HTMLElement;
  private onSelectCallback: ((index: number) => void) | null = null;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'shop-overlay';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'inset:0',
      'background:rgba(0,0,0,0.88)',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'font-family:"Courier New",monospace',
      'color:#fff',
      'z-index:100',
      'pointer-events:auto',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Digit1') this.onSelectCallback?.(0);
      else if (e.code === 'Digit2') this.onSelectCallback?.(1);
      else if (e.code === 'Digit3') this.onSelectCallback?.(2);
      else if (e.code === 'Escape') this.onSelectCallback?.(-1); // -1 = skip
    };
  }

  /**
   * Display the shop with the given choices.
   * @param choices   Array of 1–3 ShopItem options to present
   * @param sidBalance Current Gold balance shown in the header
   * @param onSelect  Callback: receives index (0/1/2) of chosen item, or -1 for skip
   */
  public show(choices: ShopItem[], sidBalance: number, onSelect: (index: number) => void): void {
    this.onSelectCallback = onSelect;

    const cyan = '#00ffff';
    const glow = `0 0 12px ${cyan}`;

    const cardsHtml = choices.map((item, i) => `
      <div style="border:1px solid ${cyan};box-shadow:${glow};padding:16px 24px;margin:8px;min-width:180px;text-align:center;cursor:default;">
        <div style="font-size:13px;color:#888;">[${i + 1}]</div>
        <div style="font-size:20px;color:${cyan};text-shadow:${glow};margin:8px 0;">${item.displayName}</div>
        <div style="font-size:12px;color:#aaa;margin-bottom:8px;">${item.description}</div>
        <div style="font-size:16px;color:#ffd700;">${item.price} Gold</div>
      </div>
    `).join('');

    this.el.innerHTML = `
      <h2 style="font-size:28px;color:${cyan};text-shadow:${glow};letter-spacing:0.1em;margin-bottom:8px;">-- UPGRADE SHOP --</h2>
      <div style="font-size:14px;color:#aaa;margin-bottom:20px;">Balance: ${sidBalance} Gold &nbsp;|&nbsp; Press 1/2/3 to buy &nbsp;|&nbsp; ESC to skip</div>
      <div style="display:flex;flex-direction:row;gap:8px;">${cardsHtml}</div>
    `;
    this.el.style.display = 'flex';
    window.addEventListener('keydown', this.keyHandler);
  }

  /** Hide the shop modal and remove the keyboard listener. */
  public hide(): void {
    this.el.style.display = 'none';
    window.removeEventListener('keydown', this.keyHandler);
    this.onSelectCallback = null;
  }

  /** True while the shop overlay is visible (used by PlayingState to gate gameplay). */
  public get isVisible(): boolean {
    return this.el.style.display !== 'none';
  }
}
