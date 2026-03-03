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
      'pointer-events:auto',
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
    const bunkersEnabled = state.bunkersEnabled;

    const cyan = '#00ffff';
    const gold = '#ffd700';
    const green = '#00cc44';
    const glow = `0 0 10px ${cyan}`;

    /** Standard upgrade card. */
    const makeCard = (upg: MetaUpgrade, locked = false): string => {
      const isOwned = owned.has(upg.id);
      const canAfford = balance >= upg.cost;
      const borderColor = isOwned ? '#444' : locked ? '#333' : cyan;
      const nameColor = isOwned ? '#666' : locked ? '#444' : cyan;
      const categoryLabel =
        upg.category === 'loadout' ? 'Loadout'
        : upg.category === 'bunker' ? 'Bunker'
        : upg.tier > 0 ? `Tier ${upg.tier}`
        : 'Passive';

      return `
        <div style="border:1px solid ${borderColor};box-shadow:${isOwned || locked ? 'none' : glow};padding:14px 18px;margin:6px;min-width:190px;max-width:210px;text-align:center;opacity:${isOwned ? 0.6 : locked ? 0.35 : 1};">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">${categoryLabel}</div>
          <div style="font-size:16px;color:${nameColor};margin:6px 0;text-shadow:${isOwned || locked ? 'none' : glow};">${upg.displayName}</div>
          <div style="font-size:11px;color:#999;margin-bottom:10px;">${upg.description}</div>
          ${isOwned
            ? `<div style="font-size:13px;color:#444;letter-spacing:2px;">[ OWNED ]</div>`
            : locked
            ? `<div style="font-size:13px;color:#444;letter-spacing:2px;">[ LOCKED ]</div>`
            : `<button
                onclick="window.__metaShopBuy('${upg.id}')"
                style="background:transparent;border:1px solid ${canAfford ? gold : '#555'};color:${canAfford ? gold : '#555'};font-family:'Courier New',monospace;font-size:14px;padding:4px 12px;cursor:${canAfford ? 'pointer' : 'not-allowed'};">
                ${upg.cost} SI$
              </button>`
          }
        </div>
      `;
    };

    /** Sequential card: locked if prerequisite not owned. */
    const makeSeqCard = (upg: MetaUpgrade, prereqId: string | null): string => {
      const locked = prereqId !== null && !owned.has(prereqId);
      return makeCard(upg, locked);
    };

    const loadouts = META_UPGRADES.filter(u => u.category === 'loadout');
    // Standalone passives (no sequential requirement within their group)
    const standalonePassives = META_UPGRADES.filter(u =>
      u.category === 'passive' &&
      u.effectType !== 'passive_maxBullets' &&
      u.effectType !== 'passive_siConversion' &&
      u.effectType !== 'passive_siTaxReduction' &&
      u.effectType !== 'passive_fireRate' &&
      u.effectType !== 'passive_moveSpeed'
    );
    const fireRateUpgrades = META_UPGRADES.filter(u => u.effectType === 'passive_fireRate');
    const moveSpeedUpgrades = META_UPGRADES.filter(u => u.effectType === 'passive_moveSpeed');
    const maxBulletUpgrades = META_UPGRADES.filter(u => u.effectType === 'passive_maxBullets');
    const siConvUpgrades = META_UPGRADES.filter(u => u.effectType === 'passive_siConversion');
    const siTaxUpgrades = META_UPGRADES.filter(u => u.effectType === 'passive_siTaxReduction');
    const bunkerSlots = META_UPGRADES.filter(u => u.effectType === 'bunker_slot');
    const bunkerExtras = META_UPGRADES.filter(u =>
      u.effectType === 'bunker_autorepair' || u.effectType === 'bunker_forceshield'
    );

    // Bunker toggle: show only if at least one slot is owned
    const anySlotOwned = bunkerSlots.some(u => owned.has(u.id));
    const bunkerToggleHtml = anySlotOwned ? `
      <div style="margin:8px 0 12px;">
        <button
          onclick="window.__metaToggleBunkers()"
          style="background:transparent;border:1px solid ${bunkersEnabled ? green : '#555'};color:${bunkersEnabled ? green : '#888'};font-family:'Courier New',monospace;font-size:13px;padding:6px 18px;cursor:pointer;letter-spacing:1px;">
          BUNKERS: ${bunkersEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    ` : '';

    // Render sequential maxBullet upgrades: each tier requires previous tier
    const maxBulletCards = maxBulletUpgrades.map((upg, i) => {
      const prereqId = i === 0 ? null : maxBulletUpgrades[i - 1].id;
      return makeSeqCard(upg, prereqId);
    }).join('');

    // Render sequential bunker slot upgrades
    const bunkerSlotCards = bunkerSlots.map((upg, i) => {
      const prereqId = i === 0 ? null : bunkerSlots[i - 1].id;
      return makeSeqCard(upg, prereqId);
    }).join('');

    // Render bunker_autorepair (requires bunker_slot_1) and bunker_forceshield (requires bunker_slot_1)
    const bunkerExtraCards = bunkerExtras.map(upg => {
      const prereqId = 'bunker_slot_1';
      return makeSeqCard(upg, prereqId);
    }).join('');

    this.el.innerHTML = `
      <h2 style="font-size:30px;color:${cyan};text-shadow:${glow};letter-spacing:0.12em;margin-bottom:4px;">-- META SHOP --</h2>
      <div style="font-size:15px;color:${gold};text-shadow:0 0 8px ${gold};margin-bottom:20px;">SI$ ${balance}</div>

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">STARTING LOADOUTS</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:16px;">
        ${loadouts.map(u => makeCard(u)).join('')}
      </div>

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">PERMANENT UPGRADES</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:16px;">
        ${fireRateUpgrades.map((u, i) => makeSeqCard(u, i === 0 ? null : fireRateUpgrades[i-1].id)).join('')}
        ${moveSpeedUpgrades.map((u, i) => makeSeqCard(u, i === 0 ? null : moveSpeedUpgrades[i-1].id)).join('')}
        ${standalonePassives.map(u => makeCard(u)).join('')}
      </div>

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">BULLET CAPACITY</h3>
      <div style="font-size:11px;color:#666;margin-bottom:8px;letter-spacing:1px;">Default: 1 bullet in flight. Unlock more with Fibonacci-priced tiers.</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:16px;">
        ${maxBulletCards}
      </div>

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">SI$ ECONOMY</h3>
      <div style="font-size:11px;color:#666;margin-bottom:8px;letter-spacing:1px;">Earn SI$ by converting end-run gold. Reduce the 90% start-tax to carry more.</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:8px;">
        ${siConvUpgrades.map((u, i) => makeSeqCard(u, i === 0 ? null : siConvUpgrades[i-1].id)).join('')}
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:16px;">
        ${siTaxUpgrades.map((u, i) => makeSeqCard(u, i === 0 ? null : siTaxUpgrades[i-1].id)).join('')}
      </div>

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">BUNKERS</h3>
      <div style="font-size:11px;color:#666;margin-bottom:8px;letter-spacing:1px;">Classic barrier shields. Buy REPAIR BUNKER in the in-run shop to restore them.</div>
      ${bunkerToggleHtml}
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:8px;">
        ${bunkerSlotCards}
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:24px;">
        ${bunkerExtraCards}
      </div>

      <div style="font-size:13px;color:#555;letter-spacing:2px;">ESC / U to close</div>
    `;

    // Attach purchase handler
    (window as unknown as Record<string, unknown>)['__metaShopBuy'] = (id: string) => {
      const upg = META_UPGRADES.find(u => u.id === id);
      if (!upg) return;
      const success = useMetaStore.getState().purchaseUpgrade(id, upg.cost);
      if (success) {
        this.render();
      }
    };

    // Attach bunker toggle handler
    (window as unknown as Record<string, unknown>)['__metaToggleBunkers'] = () => {
      useMetaStore.getState().toggleBunkers();
      this.render();
    };
  }
}
