import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { META_STORAGE_KEY } from '../utils/constants';

const SAVE_VERSION = 3;

/** Per-chapter record: chapter number → furthest level index completed (0-based) */
export type CampaignProgress = Record<number, number>;

export interface MetaStore {
  saveVersion: number;
  metaCurrency: number;
  highScore: number;
  purchasedUpgrades: string[];  // Array of upgrade IDs purchased in meta shop
  bunkersEnabled: boolean;      // Whether bunkers should spawn each run (toggle in meta shop)
  campaignProgress: CampaignProgress;
  briefingAutoDismiss: boolean;  // true = auto-dismiss briefings after timer; false = keypress only
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
  /** Toggle the bunkersEnabled flag. */
  toggleBunkers: () => void;
  /**
   * Record a campaign level completion. Updates campaignProgress[chapterNumber] to
   * the max of current value and levelIndex. Idempotent.
   */
  recordLevelComplete: (chapterNumber: number, levelIndex: number) => void;
  /** Toggle the briefingAutoDismiss flag. */
  toggleBriefingAutoDismiss: () => void;
}

export const useMetaStore = createStore<MetaStore>()(
  persist(
    (set, get) => ({
      saveVersion: SAVE_VERSION,
      metaCurrency: 0,
      highScore: 0,
      purchasedUpgrades: [],
      bunkersEnabled: true,
      campaignProgress: {},
      briefingAutoDismiss: false,

      updateHighScore: (score: number) => {
        if (score > get().highScore) {
          set({ highScore: score });
        }
      },

      addMetaCurrency: (amount: number) => {
        set((s) => ({ metaCurrency: Math.max(0, s.metaCurrency + amount) }));
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

      toggleBunkers: () => {
        set((s) => ({ bunkersEnabled: !s.bunkersEnabled }));
      },

      recordLevelComplete: (chapterNumber: number, levelIndex: number) => {
        set((s) => {
          const current = s.campaignProgress[chapterNumber] ?? -1;
          if (levelIndex <= current) return {}; // already recorded
          return {
            campaignProgress: { ...s.campaignProgress, [chapterNumber]: levelIndex },
          };
        });
      },

      toggleBriefingAutoDismiss: () => {
        set((s) => ({ briefingAutoDismiss: !s.briefingAutoDismiss }));
      },
    }),
    {
      name: META_STORAGE_KEY,
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        let state = persistedState as Partial<MetaStore>;
        // v0 → v1: add purchasedUpgrades if missing
        if (version < 1) {
          state = { ...state, purchasedUpgrades: [], saveVersion: 1 };
        }
        // v1 → v2: add bunkersEnabled if missing
        if (version < 2) {
          state = { ...state, bunkersEnabled: true, saveVersion: 2 };
        }
        // v2 → v3: add campaignProgress and briefingAutoDismiss
        if (version < 3) {
          state = { ...state, campaignProgress: {}, briefingAutoDismiss: false, saveVersion: 3 };
        }
        return state as MetaStore;
      },
    },
  ),
);
