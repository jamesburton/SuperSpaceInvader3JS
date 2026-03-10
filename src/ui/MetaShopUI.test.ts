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
  crtTier: number | null;
  crtIntensity: number;
  setCrtTier: (tier: number | null) => void;
  setCrtIntensity: (value: number) => void;
};

type MetaStoreApi = StoreApi<MetaStoreState> & {
  getInitialState: () => MetaStoreState;
};

let MetaShopUIClass: typeof import('./MetaShopUI').MetaShopUI;
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

describe('MetaShopUI Phase 8 controls', () => {
  let hudRoot: HTMLElement;

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorage(),
      configurable: true,
    });
    ({ MetaShopUI: MetaShopUIClass } = await import('./MetaShopUI'));
    ({ useMetaStore } = await import('../state/MetaState'));
    document.body.innerHTML = '<div id="hud"></div>';
    hudRoot = document.getElementById('hud') as HTMLElement;
    useMetaStore.setState(useMetaStore.getInitialState());
    useMetaStore.setState({
      metaCurrency: 200,
      purchasedUpgrades: [],
      crtTier: null,
      crtIntensity: 0.5,
    });
  });

  it('renders CRT upgrade cards and keeps higher tiers locked until prior tiers are owned', () => {
    const sceneManager = {
      initCrt: vi.fn(),
      crt: { setIntensity: vi.fn() },
    };
    const ui = new MetaShopUIClass(hudRoot, sceneManager as never);

    ui.show(() => ui.hide());

    const overlay = document.getElementById('meta-shop-overlay') as HTMLElement;
    expect(overlay.textContent).toContain('CRT FILTER');
    expect(overlay.textContent).toContain('HIGH-DEF 2003');
    expect(overlay.textContent).toContain('CONSUMER 1991');
    expect(overlay.textContent).toContain('ARCADE 1983');
    expect(overlay.innerHTML).toMatch(/CONSUMER 1991[\s\S]*?\[ LOCKED \]/);
    expect(overlay.querySelector('#crt-intensity-slider')).toBeNull();
  });

  it('purchases CRT tier 1 and initializes live preview', () => {
    const sceneManager = {
      initCrt: vi.fn(),
      crt: { setIntensity: vi.fn() },
    };
    const ui = new MetaShopUIClass(hudRoot, sceneManager as never);

    ui.show(() => ui.hide());
    (window as unknown as Record<string, (id: string) => void>).__metaShopBuy('crt_tier_1');

    const state = useMetaStore.getState();
    expect(state.purchasedUpgrades).toContain('crt_tier_1');
    expect(state.crtTier).toBe(1);
    expect(sceneManager.initCrt).toHaveBeenCalledWith(1, 0.5);
    expect(document.querySelector('#crt-intensity-slider')).not.toBeNull();
  });

  it('updates CRT intensity immediately from the slider', () => {
    const setIntensity = vi.fn();
    const sceneManager = {
      initCrt: vi.fn(),
      crt: { setIntensity },
    };
    useMetaStore.setState({
      purchasedUpgrades: ['crt_tier_1'],
      crtTier: 1,
      crtIntensity: 0.5,
    });
    const ui = new MetaShopUIClass(hudRoot, sceneManager as never);

    ui.show(() => ui.hide());

    const slider = document.getElementById('crt-intensity-slider') as HTMLInputElement;
    slider.value = '0.73';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(useMetaStore.getState().crtIntensity).toBeCloseTo(0.73, 5);
    expect(setIntensity).toHaveBeenCalledWith(0.73);
    expect(slider.nextElementSibling?.textContent).toBe('73%');
  });
});
