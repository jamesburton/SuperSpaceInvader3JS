// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../systems/AudioManager', () => ({
  audioManager: {
    playSfx: vi.fn(),
  },
}));

import type { StoreApi } from 'zustand/vanilla';

type MetaStoreState = {
  metaCurrency: number;
  purchasedUpgrades: string[];
  selectedSkin: { shapeId: string; colorId: string };
  setSkin: (shapeId: string, colorId: string) => void;
  purchaseUpgrade: (id: string, cost: number) => boolean;
};

type MetaStoreApi = StoreApi<MetaStoreState> & {
  getInitialState: () => MetaStoreState;
};

let SkinShopUIClass: typeof import('./SkinShopUI').SkinShopUI;
let useMetaStore: MetaStoreApi;

const createStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

describe('SkinShopUI', () => {
  let hudRoot: HTMLElement;
  let ui: InstanceType<typeof import('./SkinShopUI').SkinShopUI>;

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorage(),
      configurable: true,
    });
    ({ SkinShopUI: SkinShopUIClass } = await import('./SkinShopUI'));
    ({ useMetaStore } = await import('../state/MetaState'));
    document.body.innerHTML = '<div id="hud"></div>';
    hudRoot = document.getElementById('hud') as HTMLElement;
    useMetaStore.setState(useMetaStore.getInitialState());
    useMetaStore.setState({
      metaCurrency: 100,
      purchasedUpgrades: [],
      selectedSkin: { shapeId: 'default', colorId: 'white' },
    });
    ui = new SkinShopUIClass(hudRoot);
  });

  it('renders all ship shapes, svg previews, and color swatches', () => {
    ui.show(() => ui.hide());

    const overlay = document.getElementById('skin-shop-overlay') as HTMLElement;
    expect(overlay.textContent).toContain('CHEVRON');
    expect(overlay.textContent).toContain('DELTA');
    expect(overlay.textContent).toContain('DART');
    expect(overlay.textContent).toContain('CRUISER');
    expect(overlay.querySelectorAll('svg polygon')).toHaveLength(4);
    expect(overlay.textContent).toContain('GHOST');
    expect(overlay.textContent).toContain('CYBER');
    expect(overlay.textContent).toContain('NEON');
    expect(overlay.textContent).toContain('SOLAR');
    expect(overlay.textContent).toContain('VENOM');
    expect(overlay.textContent).toContain('FIRE');
  });

  it('purchases and auto-equips a ship shape', () => {
    ui.show(() => ui.hide());

    (window as unknown as Record<string, (id: string, cost: number) => void>).__skinShopBuy('skin_shape_delta', 25);

    const state = useMetaStore.getState();
    expect(state.purchasedUpgrades).toContain('skin_shape_delta');
    expect(state.metaCurrency).toBe(75);
    expect(state.selectedSkin.shapeId).toBe('delta');
  });

  it('updates the selected color and svg preview fill', () => {
    ui.show(() => ui.hide());

    (window as unknown as Record<string, (colorId: string) => void>).__skinShopColor('magenta');

    expect(useMetaStore.getState().selectedSkin.colorId).toBe('magenta');
    const polygon = document.querySelector('#skin-shop-overlay svg polygon');
    expect(polygon?.getAttribute('fill')).toBe('#ff00ff');
  });
});
