// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import { META_STORAGE_KEY } from '../utils/constants';
import type { StoreApi } from 'zustand/vanilla';

type MetaStoreState = {
  crtIntensity: number;
  setSkin: (shapeId: string, colorId: string) => void;
  setCrtTier: (tier: number | null) => void;
  setCrtIntensity: (value: number) => void;
};

type MetaStoreApi = StoreApi<MetaStoreState> & {
  getInitialState: () => MetaStoreState;
  persist?: {
    getOptions?: () => { storage?: { getItem?: (name: string) => unknown } };
  };
};

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

describe('MetaState Phase 8 persistence actions', () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorage(),
      configurable: true,
    });
    ({ useMetaStore } = await import('./MetaState'));
    useMetaStore.setState(useMetaStore.getInitialState());
  });

  it('persists selected skin and CRT settings to storage', () => {
    useMetaStore.getState().setSkin('delta', 'magenta');
    useMetaStore.getState().setCrtTier(2);
    useMetaStore.getState().setCrtIntensity(0.75);

    const raw = useMetaStore.persist?.getOptions?.().storage?.getItem?.(META_STORAGE_KEY);
    const serialized = typeof raw === 'string' ? raw : JSON.stringify(raw);

    expect(serialized).toContain('"shapeId":"delta"');
    expect(serialized).toContain('"colorId":"magenta"');
    expect(serialized).toContain('"crtTier":2');
    expect(serialized).toContain('"crtIntensity":0.75');
  });

  it('clamps CRT intensity through the action', () => {
    useMetaStore.getState().setCrtIntensity(2);
    expect(useMetaStore.getState().crtIntensity).toBe(1);

    useMetaStore.getState().setCrtIntensity(-1);
    expect(useMetaStore.getState().crtIntensity).toBe(0);
  });
});
