import type { ShopItem } from '../systems/ShopSystem';
import type { InputManager } from '../core/InputManager';
import { audioManager } from '../systems/AudioManager';

/**
 * ShopUI — DOM modal overlay for the between-wave upgrade shop.
 *
 * Multi-buy rewrite: show() takes live callbacks so balance and available items
 * update after each purchase without reopening the modal.
 *
 * Keys: 1–9 buy the nth visible item, ESC closes.
 * Arrow keys / D-pad navigate selection, A button (Space) purchases selected item.
 * Click: window.__shopBuy(index) is attached for onclick handlers.
 */
export class ShopUI {
  private readonly el: HTMLElement;
  private getItemsFn: (() => ShopItem[]) | null = null;
  private getBalanceFn: (() => number) | null = null;
  private onPurchaseFn: ((item: ShopItem) => boolean) | null = null;
  private onCloseFn: (() => void) | null = null;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  private selectedIndex: number = 0;

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
      'justify-content:flex-start',
      'padding:20px 0 24px',
      'font-family:"Courier New",monospace',
      'color:#fff',
      'z-index:100',
      'pointer-events:auto',
      'overflow-y:auto',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        this.onCloseFn?.();
        return;
      }
      const digit = e.code.match(/^Digit(\d)$/)?.[1];
      if (digit) {
        const idx = parseInt(digit, 10) - 1;
        const items = this.getItemsFn?.() ?? [];
        if (idx >= 0 && idx < items.length) {
          this._buyItem(items[idx]);
        }
      }
    };
  }

  /**
   * Open the shop with live callbacks for items/balance/purchase/close.
   * @param getItems    Returns current list of purchasable items (re-called after each buy)
   * @param getBalance  Returns current gold balance (re-called after each buy)
   * @param onPurchase  Called with the chosen ShopItem; returns true if purchase succeeded
   * @param onClose     Called when ESC is pressed or shop should close
   */
  public show(
    getItems: () => ShopItem[],
    getBalance: () => number,
    onPurchase: (item: ShopItem) => boolean,
    onClose: () => void,
  ): void {
    this.getItemsFn = getItems;
    this.getBalanceFn = getBalance;
    this.onPurchaseFn = onPurchase;
    this.onCloseFn = onClose;
    this.selectedIndex = 0;

    this._render();
    this.el.style.display = 'flex';
    window.addEventListener('keydown', this.keyHandler);

    // Attach click handler via window global
    (window as unknown as Record<string, unknown>)['__shopBuy'] = (index: number) => {
      const items = this.getItemsFn?.() ?? [];
      if (index >= 0 && index < items.length) {
        this._buyItem(items[index]);
      }
    };
  }

  /**
   * Process gamepad/keyboard arrow navigation and A/B button actions.
   * Must be called BEFORE clearJustPressed() in the shop-open guard.
   */
  public update(input: InputManager): void {
    if (!this.isVisible) return;
    const items = this.getItemsFn?.() ?? [];
    if (items.length === 0) return;

    if (input.justPressed('ArrowUp')) {
      this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
      this._render();
      audioManager.playSfx('menuNav');
    } else if (input.justPressed('ArrowDown')) {
      this.selectedIndex = (this.selectedIndex + 1) % items.length;
      this._render();
      audioManager.playSfx('menuNav');
    } else if (input.justPressed('Space')) {
      // A button = confirm/purchase selected item
      this._buyItem(items[this.selectedIndex]);
    } else if (input.justPressed('Escape')) {
      // B button = close shop
      this.onCloseFn?.();
    }
  }

  private _buyItem(item: ShopItem): void {
    const success = this.onPurchaseFn?.(item) ?? false;
    if (success) {
      audioManager.playSfx('purchase');
      // Re-render to update balance and available items
      const items = this.getItemsFn?.() ?? [];
      if (items.length === 0) {
        // Nothing left to buy — auto-close
        this.onCloseFn?.();
      } else {
        // Clamp cursor to prevent out-of-bounds when item list shrinks
        this.selectedIndex = Math.min(this.selectedIndex, items.length - 1);
        this._render();
      }
    }
  }

  private _render(): void {
    const items = this.getItemsFn?.() ?? [];
    const balance = this.getBalanceFn?.() ?? 0;

    const cyan = '#00ffff';
    const glow = `0 0 12px ${cyan}`;
    const gold = '#ffd700';

    const rowsHtml = items.map((item, i) => {
      const keyHint = i < 9 ? `[${i + 1}]` : '';
      const canAfford = balance >= item.price;
      const isSelected = i === this.selectedIndex;
      const selectedBorder = isSelected ? `border-left:3px solid ${cyan}` : 'border-left:3px solid transparent';
      const selectedBg = isSelected ? `background:rgba(0,255,255,0.08)` : '';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid #222;max-width:540px;width:100%;${selectedBorder};${selectedBg};">
          <div style="font-size:13px;color:#555;width:24px;flex-shrink:0;">${keyHint}</div>
          <div style="flex:1;">
            <div style="font-size:17px;color:${cyan};text-shadow:${glow};">${item.displayName}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">${item.description}</div>
          </div>
          <button
            onclick="window.__shopBuy(${i})"
            style="background:transparent;border:1px solid ${canAfford ? gold : '#444'};color:${canAfford ? gold : '#444'};font-family:'Courier New',monospace;font-size:14px;padding:4px 10px;cursor:${canAfford ? 'pointer' : 'not-allowed'};flex-shrink:0;">
            ${item.price}G
          </button>
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <h2 style="font-size:26px;color:${cyan};text-shadow:${glow};letter-spacing:0.1em;margin-bottom:4px;">-- UPGRADE SHOP --</h2>
      <div style="font-size:14px;color:#aaa;margin-bottom:16px;">Balance: <span style="color:${gold};">${balance} Gold</span> &nbsp;|&nbsp; 1-9 / D-PAD to select &nbsp;|&nbsp; A to buy &nbsp;|&nbsp; B / ESC to close</div>
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;max-height:72vh;overflow-y:auto;">
        ${rowsHtml || '<div style="color:#555;margin-top:24px;">No items available</div>'}
      </div>
    `;
  }

  /** Hide the shop modal and remove the keyboard listener. */
  public hide(): void {
    this.el.style.display = 'none';
    window.removeEventListener('keydown', this.keyHandler);
    this.getItemsFn = null;
    this.getBalanceFn = null;
    this.onPurchaseFn = null;
    this.onCloseFn = null;
  }

  /** True while the shop overlay is visible (used by PlayingState to gate gameplay). */
  public get isVisible(): boolean {
    return this.el.style.display !== 'none';
  }
}
