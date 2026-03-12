import { META_UPGRADES } from '../config/metaUpgrades';
import type { MetaUpgrade } from '../config/metaUpgrades';
import type { InputManager } from '../core/InputManager';
import { useMetaStore } from '../state/MetaState';
import { hasHardCampaignClear, normalizePurchasedUpgrades } from '../state/runSetup';
import { audioManager } from '../systems/AudioManager';
import { SkinShopUI } from './SkinShopUI';
import type { SceneManager } from '../core/SceneManager';

type ShopTab = 'Weapons' | 'Ships' | 'Upgrades' | 'Visual';

interface ShopEntry {
  id: string;
  type: 'upgrade' | 'toggleLocked' | 'toggleBunkers' | 'openSkinShop' | 'selectCrtTier';
  label: string;
  upgrade?: MetaUpgrade;
  locked?: boolean;
  owned?: boolean;
  crtTier?: number | null;
}

const TABS: readonly ShopTab[] = ['Weapons', 'Ships', 'Upgrades', 'Visual'];

export class MetaShopUI {
  private readonly el: HTMLElement;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  private onCloseCallback: (() => void) | null = null;
  private selectedIndex: number = 0;
  private activeTab: ShopTab = 'Weapons';
  private focusZone: 'tabs' | 'content' = 'content';
  private showLocked: boolean = false;
  private entries: ShopEntry[] = [];
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
      'padding-top:32px',
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
    this.activeTab = 'Weapons';
    this.focusZone = 'content';
    this.selectedIndex = 0;
    this.showLocked = false;
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

    if (this.skinShopUI.isVisible) {
      this.skinShopUI.update(input);
      return;
    }

    if (input.justPressed('Escape')) {
      this.onCloseCallback?.();
      return;
    }

    if (this.focusZone === 'tabs') {
      const currentTabIndex = TABS.indexOf(this.activeTab);
      if (input.justPressed('ArrowLeft')) {
        this.activeTab = TABS[(currentTabIndex - 1 + TABS.length) % TABS.length];
        this.focusZone = 'content';
        this.selectedIndex = 0;
        this.render();
        audioManager.playSfx('menuNav');
      } else if (input.justPressed('ArrowRight')) {
        this.activeTab = TABS[(currentTabIndex + 1) % TABS.length];
        this.focusZone = 'content';
        this.selectedIndex = 0;
        this.render();
        audioManager.playSfx('menuNav');
      } else if (input.justPressed('ArrowDown') || input.justPressed('Space')) {
        this.focusZone = 'content';
        this.render();
        audioManager.playSfx('menuNav');
      }
      return;
    }

    if (this.entries.length === 0) return;

    const prevEntry = () => {
      this.selectedIndex = (this.selectedIndex - 1 + this.entries.length) % this.entries.length;
      this.render();
      audioManager.playSfx('menuNav');
    };
    const nextEntry = () => {
      this.selectedIndex = (this.selectedIndex + 1) % this.entries.length;
      this.render();
      audioManager.playSfx('menuNav');
    };

    if (input.justPressed('ArrowUp')) {
      if (this.selectedIndex === 0) {
        this.focusZone = 'tabs';
        this.render();
        audioManager.playSfx('menuNav');
      } else {
        prevEntry();
      }
    } else if (input.justPressed('ArrowLeft')) {
      prevEntry();
    } else if (input.justPressed('ArrowDown')) {
      nextEntry();
    } else if (input.justPressed('ArrowRight')) {
      nextEntry();
    } else if (input.justPressed('Space')) {
      this._activateEntry(this.entries[this.selectedIndex]);
    }
  }

  private _activateEntry(entry: ShopEntry): void {
    switch (entry.type) {
      case 'toggleLocked':
        this.showLocked = !this.showLocked;
        audioManager.playSfx('menuNav');
        this.render();
        return;
      case 'toggleBunkers':
        useMetaStore.getState().toggleBunkers();
        audioManager.playSfx('menuNav');
        this.render();
        return;
      case 'openSkinShop':
        this.skinShopUI.show(() => {
          this.skinShopUI.hide();
          this.render();
        });
        audioManager.playSfx('menuNav');
        return;
      case 'selectCrtTier': {
        const nextTier = entry.crtTier ?? null;
        useMetaStore.getState().setCrtTier(nextTier);
        if (this.sceneManager) {
          this.sceneManager.initCrt(nextTier, useMetaStore.getState().crtIntensity);
        }
        audioManager.playSfx('menuNav');
        this.render();
        return;
      }
      case 'upgrade':
        if (entry.upgrade) {
          this._buyUpgrade(entry.upgrade);
        }
        return;
    }
  }

  private _buyUpgrade(upg: MetaUpgrade): void {
    const success = useMetaStore.getState().purchaseUpgrade(upg.id, upg.cost);
    if (!success) return;

    if (upg.effectType === 'crt_tier') {
      useMetaStore.getState().setCrtTier(upg.tier);
      if (this.sceneManager) {
        this.sceneManager.initCrt(upg.tier, useMetaStore.getState().crtIntensity);
      }
    }

    audioManager.playSfx('purchase');
    this.render();
  }

  private render(): void {
    const state = useMetaStore.getState();
    const balance = state.metaCurrency;
    const cyan = '#00ffff';
    const gold = '#ffd700';
    const glow = `0 0 12px ${cyan}`;

    this.entries = this._buildEntries(state);
    if (this.entries.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex, this.entries.length - 1);
    } else {
      this.selectedIndex = 0;
    }

    const tabButtons = TABS.map((tab) => {
      const active = this.activeTab === tab;
      const focused = active && this.focusZone === 'tabs';
      return `
        <button onclick="window.__metaShopTab('${tab}')" style="
          background:${active ? 'rgba(0,255,255,0.12)' : 'transparent'};
          border:1px solid ${focused ? '#ffffff' : active ? cyan : '#444'};
          color:${focused ? '#ffffff' : active ? cyan : '#777'};
          font-family:'Courier New',monospace;
          font-size:14px;
          padding:8px 16px;
          cursor:pointer;
          letter-spacing:2px;">
          ${tab.toUpperCase()}
        </button>
      `;
    }).join('');

    const contentHtml = this.entries.map((entry, index) => this._renderEntry(entry, index === this.selectedIndex && this.focusZone === 'content', balance)).join('');
    const emptyState = this.entries.length === 0
      ? `<div style="font-size:14px;color:#777;letter-spacing:2px;margin-top:28px;">NO ITEMS IN THIS TAB</div>`
      : contentHtml;

    this.el.innerHTML = `
      <h2 style="font-size:28px;color:${cyan};text-shadow:${glow};letter-spacing:0.12em;margin-bottom:4px;">-- META SHOP --</h2>
      <div style="font-size:15px;color:${gold};text-shadow:0 0 8px ${gold};margin-bottom:18px;">SI$ ${balance}</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:18px;">${tabButtons}</div>
      <div style="font-size:12px;color:#666;letter-spacing:2px;margin-bottom:14px;">
        ${this.focusZone === 'tabs' ? 'LEFT / RIGHT TO CHANGE TAB • DOWN TO ENTER TAB' : 'UP TO TABS • LEFT / RIGHT TO MOVE • SPACE TO ACT'}
      </div>
      <div style="width:min(960px,94vw);display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding-bottom:20px;">
        ${emptyState}
      </div>
      <div style="font-size:13px;color:#555;letter-spacing:2px;padding-bottom:24px;">ESC / U / B TO CLOSE</div>
    `;

    this._wireGlobalHandlers();
    this._wireCrtSlider();
  }

  private _buildEntries(state: ReturnType<typeof useMetaStore.getState>): ShopEntry[] {
    const owned = new Set(normalizePurchasedUpgrades(state.purchasedUpgrades));
    const entries: ShopEntry[] = [{
      id: 'toggle-locked',
      type: 'toggleLocked',
      label: this.showLocked ? 'HIDE LOCKED UPGRADES' : 'REVEAL LOCKED UPGRADES',
    }];

    const upgrades = META_UPGRADES
      .filter((upgrade) => this._tabForUpgrade(upgrade) === this.activeTab)
      .filter((upgrade) => {
        const locked = this._isLocked(upgrade, owned, state);
        return this.showLocked || !locked || owned.has(upgrade.id);
      });

    for (const upgrade of upgrades) {
      entries.push({
        id: upgrade.id,
        type: 'upgrade',
        label: upgrade.displayName,
        upgrade,
        locked: this._isLocked(upgrade, owned, state),
        owned: owned.has(upgrade.id),
      });
    }

    if (this.activeTab === 'Ships') {
      entries.push({
        id: 'open-skin-shop',
        type: 'openSkinShop',
        label: 'OPEN SHIP CUSTOMIZER',
      });
    }

    if (this.activeTab === 'Upgrades' && META_UPGRADES.some((upgrade) => upgrade.effectType === 'bunker_slot' && owned.has(upgrade.id))) {
      entries.push({
        id: 'toggle-bunkers',
        type: 'toggleBunkers',
        label: state.bunkersEnabled ? 'BUNKERS ENABLED' : 'BUNKERS DISABLED',
      });
    }

    if (this.activeTab === 'Visual') {
      const ownedCrtTiers = [1, 2, 3].filter((tier) => owned.has(`crt_tier_${tier}`));
      if (ownedCrtTiers.length > 0) {
        entries.push({ id: 'crt-off', type: 'selectCrtTier', label: 'CRT OFF', crtTier: null });
        for (const tier of ownedCrtTiers) {
          entries.push({
            id: `crt-select-${tier}`,
            type: 'selectCrtTier',
            label: `CRT TIER ${tier}`,
            crtTier: tier,
          });
        }
      }
    }

    return entries;
  }

  private _renderEntry(entry: ShopEntry, selected: boolean, balance: number): string {
    const borderColor = selected ? '#ffffff' : entry.type === 'upgrade' && entry.locked ? '#333' : '#0ff';
    const boxShadow = selected ? '0 0 16px #fff,0 0 8px #fff' : entry.type === 'upgrade' && entry.locked ? 'none' : '0 0 10px #0ff';

    if (entry.type === 'toggleLocked' || entry.type === 'toggleBunkers' || entry.type === 'openSkinShop' || entry.type === 'selectCrtTier') {
      const active = entry.type === 'toggleLocked'
        ? this.showLocked
        : entry.type === 'toggleBunkers'
          ? useMetaStore.getState().bunkersEnabled
          : entry.type === 'selectCrtTier'
            ? useMetaStore.getState().crtTier === (entry.crtTier ?? null)
            : false;
      return `
        <button
          onclick="window.__metaShopAction('${entry.id}')"
          style="min-width:220px;max-width:280px;border:1px solid ${active ? '#fff' : borderColor};box-shadow:${boxShadow};background:${active ? 'rgba(255,255,255,0.08)' : 'rgba(0,255,255,0.04)'};color:${active ? '#fff' : '#0ff'};padding:14px 16px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:2px;cursor:pointer;">
          ${entry.label}
        </button>
      `;
    }

    const upgrade = entry.upgrade!;
    const isOwned = entry.owned ?? false;
    const isLocked = entry.locked ?? false;
    const canAfford = balance >= upgrade.cost;
    const stateLabel = isOwned ? 'OWNED' : isLocked ? 'LOCKED' : `${upgrade.cost} SI$`;

    return `
      <div style="width:220px;border:1px solid ${borderColor};box-shadow:${boxShadow};padding:14px 16px;background:rgba(255,255,255,0.03);opacity:${isOwned ? 0.6 : isLocked ? 0.38 : 1};">
        <div style="font-size:11px;color:#666;letter-spacing:2px;margin-bottom:6px;">${this._labelForUpgrade(upgrade)}</div>
        <div style="font-size:15px;color:${isOwned || isLocked ? '#bbb' : '#0ff'};margin-bottom:8px;">${upgrade.displayName}</div>
        <div style="font-size:11px;color:#9aa;line-height:1.4;min-height:44px;">${upgrade.description}</div>
        <button
          onclick="window.__metaShopAction('${entry.id}')"
          style="margin-top:12px;width:100%;background:transparent;border:1px solid ${isOwned ? '#444' : isLocked ? '#333' : canAfford ? '#ffd700' : '#555'};color:${isOwned ? '#666' : isLocked ? '#555' : canAfford ? '#ffd700' : '#666'};font-family:'Courier New',monospace;font-size:12px;padding:8px 0;cursor:${isOwned || isLocked || !canAfford ? 'default' : 'pointer'};letter-spacing:2px;">
          ${stateLabel}
        </button>
      </div>
    `;
  }

  private _wireGlobalHandlers(): void {
    const globals = window as unknown as Record<string, unknown>;
    globals.__metaShopTab = (tab: ShopTab) => {
      this.activeTab = tab;
      this.focusZone = 'content';
      this.selectedIndex = 0;
      this.render();
    };
    globals.__metaShopAction = (entryId: string) => {
      const entry = this.entries.find((candidate) => candidate.id === entryId);
      if (!entry) return;
      if (entry.type === 'upgrade' && (entry.locked || entry.owned)) return;
      this._activateEntry(entry);
    };
  }

  private _wireCrtSlider(): void {
    if (this.activeTab !== 'Visual' || useMetaStore.getState().crtTier === null) return;

    const sliderWrap = document.createElement('div');
    sliderWrap.style.cssText = 'display:flex;align-items:center;gap:12px;padding-bottom:24px;';
    sliderWrap.innerHTML = `
      <label style="font-size:12px;letter-spacing:2px;color:#0ff;">CRT INTENSITY</label>
      <input id="crt-intensity-slider" type="range" min="0.01" max="1" step="0.01" value="${useMetaStore.getState().crtIntensity}" style="width:180px;accent-color:#0ff;cursor:pointer;" />
      <span id="crt-intensity-label" style="font-size:12px;color:#0ff;">${Math.round(useMetaStore.getState().crtIntensity * 100)}%</span>
    `;
    this.el.appendChild(sliderWrap);

    const slider = document.getElementById('crt-intensity-slider') as HTMLInputElement | null;
    const label = document.getElementById('crt-intensity-label') as HTMLElement | null;
    slider?.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      useMetaStore.getState().setCrtIntensity(value);
      this.sceneManager?.crt?.setIntensity(value);
      if (label) label.textContent = `${Math.round(value * 100)}%`;
    });
  }

  private _tabForUpgrade(upgrade: MetaUpgrade): ShopTab {
    switch (upgrade.category) {
      case 'skin':
        return 'Ships';
      case 'crt':
        return 'Visual';
      case 'loadout':
        return 'Weapons';
      default:
        return 'Upgrades';
    }
  }

  private _labelForUpgrade(upgrade: MetaUpgrade): string {
    switch (upgrade.effectType) {
      case 'difficulty_unlock':
        return 'DIFFICULTY';
      case 'passive_startingLife':
        return 'LIVES';
      case 'loadout_startingSlot':
        return 'START SLOT';
      case 'loadout_spread':
      case 'loadout_rapid':
        return 'LOADOUT';
      case 'crt_tier':
        return `CRT TIER ${upgrade.tier}`;
      case 'skin_shape':
        return 'SHIP FRAME';
      default:
        return upgrade.category.toUpperCase();
    }
  }

  private _isLocked(upgrade: MetaUpgrade, owned: Set<string>, state: ReturnType<typeof useMetaStore.getState>): boolean {
    if (upgrade.id === 'difficulty_nightmare_unlock') {
      return !hasHardCampaignClear(state.purchasedUpgrades);
    }

    const sequentialGroups: Record<string, string[]> = {
      passive_fireRate: META_UPGRADES.filter((item) => item.effectType === 'passive_fireRate').map((item) => item.id),
      passive_moveSpeed: META_UPGRADES.filter((item) => item.effectType === 'passive_moveSpeed').map((item) => item.id),
      passive_startingLife: META_UPGRADES.filter((item) => item.effectType === 'passive_startingLife').map((item) => item.id),
      passive_maxBullets: META_UPGRADES.filter((item) => item.effectType === 'passive_maxBullets').map((item) => item.id),
      passive_siConversion: META_UPGRADES.filter((item) => item.effectType === 'passive_siConversion').map((item) => item.id),
      passive_siTaxReduction: META_UPGRADES.filter((item) => item.effectType === 'passive_siTaxReduction').map((item) => item.id),
      bunker_slot: META_UPGRADES.filter((item) => item.effectType === 'bunker_slot').map((item) => item.id),
      crt_tier: META_UPGRADES.filter((item) => item.effectType === 'crt_tier').map((item) => item.id),
    };

    const sequence = sequentialGroups[upgrade.effectType];
    if (sequence) {
      const index = sequence.indexOf(upgrade.id);
      if (index > 0) {
        return !owned.has(sequence[index - 1]);
      }
    }

    if (upgrade.effectType === 'bunker_autorepair' || upgrade.effectType === 'bunker_forceshield') {
      return !owned.has('bunker_slot_1');
    }

    return false;
  }
}
