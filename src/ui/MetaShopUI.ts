import { META_UPGRADES } from '../config/metaUpgrades';
import type { MetaUpgrade } from '../config/metaUpgrades';
import { useMetaStore } from '../state/MetaState';

export class MetaShopUI {
  private readonly el: HTMLElement;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  private onCloseCallback: (() => void) | null = null;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'meta-shop-overlay';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'inset:0',
      'background:rgba(0,0,0,0.92)',
      'flex-direction:column',
      'align-items:center',
      'justify-content:flex-start',
      'padding-top:40px',
      'font-family:"Courier New",monospace',
      'color:#fff',
      'z-index:200',
      'overflow-y:auto',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyU') {
        this.onCloseCallback?.();
      }
    };
  }

  public show(onClose: () => void): void {
    this.onCloseCallback = onClose;
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

  private render(): void {
    const state = useMetaStore.getState();
    const balance = state.metaCurrency;
    const owned = new Set(state.purchasedUpgrades);

    const cyan = '#00ffff';
    const gold = '#ffd700';
    const glow = `0 0 10px ${cyan}`;

    const makeCard = (upg: MetaUpgrade): string => {
      const isOwned = owned.has(upg.id);
      const canAfford = balance >= upg.cost;
      const borderColor = isOwned ? '#444' : cyan;
      const nameColor = isOwned ? '#666' : cyan;
      const categoryLabel = upg.category === 'loadout' ? 'Loadout' : `Passive Tier ${upg.tier}`;

      return `
        <div style="border:1px solid ${borderColor};box-shadow:${isOwned ? 'none' : glow};padding:14px 18px;margin:6px;min-width:200px;max-width:220px;text-align:center;opacity:${isOwned ? 0.6 : 1};">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">${categoryLabel}</div>
          <div style="font-size:17px;color:${nameColor};margin:6px 0;text-shadow:${isOwned ? 'none' : glow};">${upg.displayName}</div>
          <div style="font-size:11px;color:#999;margin-bottom:10px;">${upg.description}</div>
          ${isOwned
            ? `<div style="font-size:13px;color:#444;letter-spacing:2px;">[ OWNED ]</div>`
            : `<button
                onclick="window.__metaShopBuy('${upg.id}')"
                style="background:transparent;border:1px solid ${canAfford ? gold : '#555'};color:${canAfford ? gold : '#555'};font-family:'Courier New',monospace;font-size:14px;padding:4px 12px;cursor:${canAfford ? 'pointer' : 'not-allowed'};">
                ${upg.cost} SI$
              </button>`
          }
        </div>
      `;
    };

    const loadouts = META_UPGRADES.filter(u => u.category === 'loadout');
    const passives = META_UPGRADES.filter(u => u.category === 'passive');

    this.el.innerHTML = `
      <h2 style="font-size:30px;color:${cyan};text-shadow:${glow};letter-spacing:0.12em;margin-bottom:4px;">-- META SHOP --</h2>
      <div style="font-size:15px;color:${gold};text-shadow:0 0 8px ${gold};margin-bottom:20px;">SI$ ${balance}</div>
      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">STARTING LOADOUTS</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:16px;">
        ${loadouts.map(makeCard).join('')}
      </div>
      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">PERMANENT UPGRADES</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:24px;">
        ${passives.map(makeCard).join('')}
      </div>
      <div style="font-size:13px;color:#555;letter-spacing:2px;">ESC / U to close</div>
    `;

    // Attach purchase handler via window global (avoids inline onclick scope limitations)
    (window as unknown as Record<string, unknown>)['__metaShopBuy'] = (id: string) => {
      const upg = META_UPGRADES.find(u => u.id === id);
      if (!upg) return;
      const success = useMetaStore.getState().purchaseUpgrade(id, upg.cost);
      if (success) {
        this.render(); // re-render to reflect new state
      }
    };
  }
}
