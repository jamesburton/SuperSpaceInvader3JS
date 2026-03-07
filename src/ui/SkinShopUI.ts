import {
  SHIP_SHAPES,
  SHIP_SHAPE_NAMES,
  SKIN_COLORS,
  SKIN_COLOR_NAMES,
  SHAPE_SVG_PATHS,
  SKIN_UPGRADE_DEFS,
} from '../config/skinConfig';
import { useMetaStore } from '../state/MetaState';
import type { InputManager } from '../core/InputManager';
import { audioManager } from '../systems/AudioManager';

export class SkinShopUI {
  private readonly el: HTMLElement;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  private onCloseCallback: (() => void) | null = null;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'skin-shop-overlay';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'inset:0',
      'background:rgba(0,0,0,0.95)',
      'flex-direction:column',
      'align-items:center',
      'justify-content:flex-start',
      'padding-top:40px',
      'font-family:"Courier New",monospace',
      'color:#fff',
      'z-index:210',
      'overflow-y:auto',
      'pointer-events:auto',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
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

  /** Handle ESC to close from gamepad/keyboard input polling. */
  public update(input: InputManager): void {
    if (!this.isVisible) return;
    if (input.justPressed('Escape')) {
      this.onCloseCallback?.();
    }
  }

  private render(): void {
    const state = useMetaStore.getState();
    const balance = state.metaCurrency;
    const purchasedUpgrades = state.purchasedUpgrades;
    const selectedShapeId = state.selectedSkin.shapeId;
    const selectedColorId = state.selectedSkin.colorId;

    const cyan = '#00ffff';
    const gold = '#ffd700';
    const glow = `0 0 10px ${cyan}`;

    // Resolve current color hex string for SVG fill
    const colorHex = (colorId: string): string => {
      const num = SKIN_COLORS[colorId] ?? 0xffffff;
      return '#' + num.toString(16).padStart(6, '0');
    };

    const currentFillColor = colorHex(selectedColorId);

    // Build shape cards
    const shapeIds = Object.keys(SHIP_SHAPES);

    const shapeCards = shapeIds.map((shapeId) => {
      const isDefault = shapeId === 'default';
      const isOwned = isDefault || purchasedUpgrades.includes('skin_shape_' + shapeId);
      const isEquipped = shapeId === selectedShapeId;
      const borderColor = isEquipped ? cyan : '#444';
      const boxShadow = isEquipped ? `box-shadow:0 0 12px ${cyan}` : 'box-shadow:none';
      const svgPath = SHAPE_SVG_PATHS[shapeId] ?? '';
      const shapeDef = SKIN_UPGRADE_DEFS.find(d => d.shapeId === shapeId);
      const cost = shapeDef?.cost ?? 0;
      const canAfford = balance >= cost;
      const upgradeId = 'skin_shape_' + shapeId;

      const actionHtml = isEquipped
        ? `<div style="font-size:12px;color:${cyan};letter-spacing:2px;text-shadow:${glow};margin-top:8px;">[ EQUIPPED ]</div>`
        : isOwned
          ? `<button
              onclick="window.__skinShopSelect('${shapeId}')"
              style="background:transparent;border:1px solid ${cyan};color:${cyan};font-family:'Courier New',monospace;font-size:13px;padding:4px 12px;cursor:pointer;margin-top:8px;letter-spacing:1px;">
              SELECT
            </button>`
          : `<button
              onclick="window.__skinShopBuy('${upgradeId}',${cost})"
              style="background:transparent;border:1px solid ${canAfford ? gold : '#555'};color:${canAfford ? gold : '#555'};font-family:'Courier New',monospace;font-size:13px;padding:4px 12px;cursor:${canAfford ? 'pointer' : 'not-allowed'};margin-top:8px;">
              ${cost} SI$
            </button>`;

      const ownedLabel = isDefault
        ? `<div style="font-size:10px;color:#888;letter-spacing:1px;margin-bottom:4px;">FREE</div>`
        : isOwned
          ? `<div style="font-size:10px;color:#666;letter-spacing:1px;margin-bottom:4px;">OWNED</div>`
          : `<div style="font-size:10px;color:#555;letter-spacing:1px;margin-bottom:4px;">LOCKED</div>`;

      return `
        <div style="border:2px solid ${borderColor};${boxShadow};padding:14px 16px;margin:6px;text-align:center;min-width:100px;opacity:${isOwned || isEquipped ? 1 : 0.7};">
          ${ownedLabel}
          <div style="font-size:14px;color:${isEquipped ? cyan : '#ccc'};text-shadow:${isEquipped ? glow : 'none'};margin-bottom:8px;letter-spacing:1px;">${SHIP_SHAPE_NAMES[shapeId] ?? shapeId}</div>
          <svg viewBox="0 0 80 48" width="80" height="48" style="display:block;margin:0 auto 8px;">
            <polygon points="${svgPath}" fill="${currentFillColor}" opacity="0.9"/>
          </svg>
          ${actionHtml}
        </div>
      `;
    }).join('');

    // Build color swatches
    const colorIds = Object.keys(SKIN_COLORS);

    const colorSwatches = colorIds.map((colorId) => {
      const isSelected = colorId === selectedColorId;
      const hex = colorHex(colorId);
      const border = isSelected ? `2px solid ${cyan}` : '1px solid #555';
      const swatchGlow = isSelected ? `box-shadow:0 0 8px ${cyan}` : 'box-shadow:none';

      return `
        <div
          onclick="window.__skinShopColor('${colorId}')"
          title="${SKIN_COLOR_NAMES[colorId] ?? colorId}"
          style="display:inline-flex;flex-direction:column;align-items:center;margin:4px;cursor:pointer;">
          <div style="width:32px;height:32px;background:${hex};border:${border};${swatchGlow};"></div>
          <div style="font-size:9px;color:${isSelected ? cyan : '#888'};margin-top:3px;letter-spacing:1px;">${SKIN_COLOR_NAMES[colorId] ?? colorId}</div>
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <h2 style="font-size:26px;color:${cyan};text-shadow:${glow};letter-spacing:0.12em;margin-bottom:4px;">-- SHIP SKINS --</h2>
      <div style="font-size:14px;color:${gold};text-shadow:0 0 8px ${gold};margin-bottom:20px;">SI$ ${balance}</div>

      <h3 style="font-size:13px;color:#aaa;letter-spacing:2px;margin-bottom:10px;">SHIP SHAPE</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:24px;">
        ${shapeCards}
      </div>

      <h3 style="font-size:13px;color:#aaa;letter-spacing:2px;margin-bottom:10px;">COLOR PALETTE</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-bottom:24px;">
        ${colorSwatches}
      </div>

      <div style="font-size:12px;color:#555;letter-spacing:2px;margin-top:8px;">ESC to close</div>
    `;

    // Wire global handlers — re-attached on every render to avoid stale closures
    (window as unknown as Record<string, unknown>)['__skinShopSelect'] = (shapeId: string) => {
      useMetaStore.getState().setSkin(shapeId, useMetaStore.getState().selectedSkin.colorId);
      audioManager.playSfx('menuNav');
      this.render();
    };

    (window as unknown as Record<string, unknown>)['__skinShopBuy'] = (upgradeId: string, cost: number) => {
      const success = useMetaStore.getState().purchaseUpgrade(upgradeId, cost);
      if (success) {
        audioManager.playSfx('purchase');
        // Auto-equip purchased shape
        const shapeId = upgradeId.replace('skin_shape_', '');
        useMetaStore.getState().setSkin(shapeId, useMetaStore.getState().selectedSkin.colorId);
        this.render();
      }
    };

    (window as unknown as Record<string, unknown>)['__skinShopColor'] = (colorId: string) => {
      const currentShapeId = useMetaStore.getState().selectedSkin.shapeId;
      useMetaStore.getState().setSkin(currentShapeId, colorId);
      audioManager.playSfx('menuNav');
      this.render();
    };
  }
}
