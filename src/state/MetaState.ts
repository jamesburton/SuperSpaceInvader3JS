import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { META_STORAGE_KEY } from '../utils/constants';

const SAVE_VERSION = 1;

export interface MetaStore {
  saveVersion: number;
  metaCurrency: number;
  highScore: number;
  purchasedUpgrades: string[];  // Array of upgrade IDs purchased in meta shop
  updateHighScore: (score: number) => void;
  addMetaCurrency: (amount: number) => void;
  /**
   * Purchase a meta upgrade. Deducts SI$ cost and records upgrade ID.
   * Idempotent: re-purchasing the same ID has no effect on the upgrades array.
   * Returns false if balance is insufficient.
   */
  purchaseUpgrade: (id: string, cost: number) => boolean;
  /** Zero the meta currency balance (for testing; not called in normal game flow). */
  resetMetaCurrency: () => void;
}

export const useMetaStore = createStore<MetaStore>()(
  persist(
    (set, get) => ({
      saveVersion: SAVE_VERSION,
      metaCurrency: 0,
      highScore: 0,
      purchasedUpgrades: [],

      updateHighScore: (score: number) => {
        if (score > get().highScore) {
          set({ highScore: score });
        }
      },

      addMetaCurrency: (amount: number) => {
        set((s) => ({ metaCurrency: s.metaCurrency + amount }));
      },

      purchaseUpgrade: (id: string, cost: number) => {
        const state = get();
        if (state.metaCurrency < cost) return false;
        set((s) => ({
          metaCurrency: s.metaCurrency - cost,
          purchasedUpgrades: s.purchasedUpgrades.includes(id)
            ? s.purchasedUpgrades  // idempotent — don't double-add
            : [...s.purchasedUpgrades, id],
        }));
        return true;
      },

      resetMetaCurrency: () => {
        set({ metaCurrency: 0 });
      },
    }),
    {
      name: META_STORAGE_KEY,
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // v0 → v1: add purchasedUpgrades if missing (META-07 migration hook)
        if (version < 1) {
          return {
            ...(persistedState as Partial<MetaStore>),
            purchasedUpgrades: [],
            saveVersion: 1,
          };
        }
        return persistedState as MetaStore;
      },
    },
  ),
);
