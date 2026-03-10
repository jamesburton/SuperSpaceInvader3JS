import { META_UPGRADES } from '../config/metaUpgrades';
import type { MetaUpgrade } from '../config/metaUpgrades';
import type { InputManager } from '../core/InputManager';
import { useMetaStore } from '../state/MetaState';
import { audioManager } from '../systems/AudioManager';
import { SkinShopUI } from './SkinShopUI';
import type { SceneManager } from '../core/SceneManager';

export class MetaShopUI {
  private readonly el: HTMLElement;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  private onCloseCallback: (() => void) | null = null;
  private selectedIndex: number = 0;
  /** Flat ordered list of purchasable (non-owned, non-locked) upgrade IDs, rebuilt each render. */
  private purchasableIds: string[] = [];
  private readonly skinShopUI: SkinShopUI;

  constructor(hudRoot: HTMLElement, private readonly sceneManager?: SceneManager) {
    this.skinShopUI = new SkinShopUI(hudRoot);
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
    this.selectedIndex = 0;
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

  /**
   * Process gamepad/keyboard navigation for the meta shop.
   * Must be called BEFORE clearJustPressed() in the metaShopUI-visible guard.
   */
  public update(input: InputManager): void {
    if (!this.isVisible) return;

    // Delegate to SkinShopUI when it is open — prevents MetaShopUI from processing input
    if (this.skinShopUI.isVisible) {
      this.skinShopUI.update(input);
      return;
    }

    if (input.justPressed('Escape')) {
      this.onCloseCallback?.();
      return;
    }

    if (this.purchasableIds.length === 0) return;

    if (input.justPressed('ArrowUp') || input.justPressed('ArrowLeft')) {
      this.selectedIndex = (this.selectedIndex - 1 + this.purchasableIds.length) % this.purchasableIds.length;
      this.render();
      audioManager.playSfx('menuNav');
    } else if (input.justPressed('ArrowDown') || input.justPressed('ArrowRight')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.purchasableIds.length;
      this.render();
      audioManager.playSfx('menuNav');
    } else if (input.justPressed('Space')) {
      // A button = purchase selected item
      this._buyById(this.purchasableIds[this.selectedIndex]);
    }
  }

  /** Purchase an upgrade by ID — extracted from window.__metaShopBuy for gamepad use. */
  private _buyById(id: string): void {
    const upg = META_UPGRADES.find(u => u.id === id);
    if (!upg) return;
    const success = useMetaStore.getState().purchaseUpgrade(id, upg.cost);
    if (success) {
      // Handle CRT tier purchase — auto-select the newly purchased tier
      if (upg.effectType === 'crt_tier') {
        const tierNum = parseInt(upg.id.replace('crt_tier_', ''), 10);
        if (!isNaN(tierNum)) {
          useMetaStore.getState().setCrtTier(tierNum);
          if (this.sceneManager) {
            this.sceneManager.initCrt(tierNum, useMetaStore.getState().crtIntensity);
          }
        }
      }
      audioManager.playSfx('purchase');
      this.render();
    }
  }

  /** Render CRT tier selector buttons (OFF + owned tiers). Only shows if at least one tier is owned. */
  private _renderCrtSelector(state: { crtTier: number | null }, owned: Set<string>): string {
    const ownedTiers: number[] = [];
    for (let t = 1; t <= 3; t++) {
      if (owned.has(`crt_tier_${t}`)) ownedTiers.push(t);
    }
    if (ownedTiers.length === 0) return '';

    const cyan = '#00ffff';
    const btnStyle = (active: boolean) =>
      `background:${active ? 'rgba(0,255,255,0.15)' : 'transparent'};border:1px solid ${active ? cyan : '#555'};color:${active ? cyan : '#888'};font-family:'Courier New',monospace;font-size:13px;padding:6px 16px;cursor:pointer;letter-spacing:1px;${active ? `text-shadow:0 0 8px ${cyan};` : ''}`;

    const offActive = state.crtTier === null;
    let html = `<div style="display:flex;gap:8px;justify-content:center;margin-bottom:4px;">`;
    html += `<button onclick="window.__crtSelectTier(0)" style="${btnStyle(offActive)}">OFF</button>`;
    const tierNames = ['', 'TIER 1', 'TIER 2', 'TIER 3'];
    for (const t of ownedTiers) {
      const active = state.crtTier === t;
      html += `<button onclick="window.__crtSelectTier(${t})" style="${btnStyle(active)}">${tierNames[t]}</button>`;
    }
    html += `</div>`;
    return html;
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

    // Rebuild the purchasable IDs list for cursor navigation
    const newPurchasableIds: string[] = [];

    /** Standard upgrade card. */
    const makeCard = (upg: MetaUpgrade, locked = false): string => {
      const isOwned = owned.has(upg.id);
      const canAfford = balance >= upg.cost;
      const isPurchasable = !isOwned && !locked;

      if (isPurchasable) {
        newPurchasableIds.push(upg.id);
      }

      const isSelected = isPurchasable && this.purchasableIds[this.selectedIndex] === upg.id;
      const borderColor = isSelected ? '#ffffff' : isOwned ? '#444' : locked ? '#333' : cyan;
      const boxShadow = isSelected
        ? `box-shadow:0 0 16px #fff,0 0 8px #fff`
        : isOwned || locked ? 'box-shadow:none' : `box-shadow:${glow}`;
      const nameColor = isOwned ? '#666' : locked ? '#444' : cyan;
      const categoryLabel =
        upg.category === 'loadout' ? 'Loadout'
        : upg.category === 'bunker' ? 'Bunker'
        : upg.tier > 0 ? `Tier ${upg.tier}`
        : 'Passive';

      return `
        <div style="border:1px solid ${borderColor};${boxShadow};padding:14px 18px;margin:6px;min-width:190px;max-width:210px;text-align:center;opacity:${isOwned ? 0.6 : locked ? 0.35 : 1};">
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

    // CRT tier cards (sequential: tier 2 requires tier 1, tier 3 requires tier 2)
    const crtUpgrades = META_UPGRADES.filter(u => u.effectType === 'crt_tier');
    const crtCards = crtUpgrades.map((upg, i) => {
      const prereqId = i === 0 ? null : crtUpgrades[i - 1].id;
      return makeSeqCard(upg, prereqId);
    }).join('');

    // Update purchasableIds and clamp cursor
    this.purchasableIds = newPurchasableIds;
    if (this.purchasableIds.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex, this.purchasableIds.length - 1);
    }

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

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">SHIP SKINS</h3>
      <div style="margin-bottom:24px;">
        <button
          onclick="window.__openSkinShop()"
          style="background:transparent;border:1px solid ${cyan};color:${cyan};font-family:'Courier New',monospace;font-size:14px;padding:8px 24px;cursor:pointer;letter-spacing:2px;text-shadow:${glow};">
          CUSTOMIZE SHIP
        </button>
      </div>

      <h3 style="font-size:14px;color:#aaa;letter-spacing:2px;margin-bottom:8px;">CRT FILTER</h3>
      <div style="font-size:11px;color:#666;margin-bottom:8px;letter-spacing:1px;">Retro CRT monitor effects. Higher tiers add more visual distortion.</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:8px;">
        ${crtCards}
      </div>
      ${this._renderCrtSelector(state, owned)}
      ${state.crtTier !== null && state.crtTier >= 1 ? `
        <div style="margin:12px 0 16px;display:flex;align-items:center;gap:12px;">
          <label style="font-family:'Courier New',monospace;color:#fff;font-size:13px;letter-spacing:1px;">INTENSITY</label>
          <input id="crt-intensity-slider" type="range" min="0.01" max="1" step="0.01"
                 value="${state.crtIntensity}"
                 style="width:160px;accent-color:#0ff;cursor:pointer;" />
          <span style="font-size:12px;color:#0ff;min-width:40px;">${Math.round(state.crtIntensity * 100)}%</span>
        </div>
      ` : '<div style="margin-bottom:16px;"></div>'}

      <div style="font-size:13px;color:#555;letter-spacing:2px;">ESC / U / B to close</div>
    `;

    // Wire CRT intensity slider
    const crtSlider = document.getElementById('crt-intensity-slider') as HTMLInputElement | null;
    crtSlider?.addEventListener('input', () => {
      const val = parseFloat(crtSlider.value);
      useMetaStore.getState().setCrtIntensity(val);
      if (this.sceneManager?.crt) {
        this.sceneManager.crt.setIntensity(val);
      }
      // Update the percentage label next to the slider
      const label = crtSlider.nextElementSibling as HTMLElement | null;
      if (label) label.textContent = `${Math.round(val * 100)}%`;
    });

    // Attach purchase handler
    (window as unknown as Record<string, unknown>)['__metaShopBuy'] = (id: string) => {
      this._buyById(id);
    };

    // Attach bunker toggle handler
    (window as unknown as Record<string, unknown>)['__metaToggleBunkers'] = () => {
      useMetaStore.getState().toggleBunkers();
      this.render();
    };

    // Attach CRT tier selector handler
    (window as unknown as Record<string, unknown>)['__crtSelectTier'] = (tier: number) => {
      const newTier = tier === 0 ? null : tier;
      useMetaStore.getState().setCrtTier(newTier);
      if (this.sceneManager) {
        this.sceneManager.initCrt(newTier, useMetaStore.getState().crtIntensity);
      }
      this.render();
    };

    // Attach skin shop open handler
    (window as unknown as Record<string, unknown>)['__openSkinShop'] = () => {
      this.skinShopUI.show(() => {
        this.skinShopUI.hide();
        this.render();
      });
    };
  }
}
