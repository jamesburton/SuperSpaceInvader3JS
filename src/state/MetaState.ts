import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { META_STORAGE_KEY } from '../utils/constants';

const SAVE_VERSION = 4;

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

  // v1.1 fields — added in v4 migration
  volume: number;                                     // 0.0-1.0, default 0.8
  muted: boolean;                                     // default false
  selectedSkin: { shapeId: string; colorId: string }; // default: { shapeId: 'default', colorId: 'white' }
  crtTier: number | null;                             // null = not unlocked; 1/2/3 = tier
  crtIntensity: number;                               // 0.0-1.0, default 0.5
  difficulty: 'normal' | 'hard' | 'nightmare';        // default 'normal'
  startingPowerUp: string | null;                     // upgrade ID or null
  extraLivesPurchased: number;                        // 0, 1, or 2

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
  /** Set volume, clamped to [0, 1]. */
  setVolume: (v: number) => void;
  /** Set muted flag. */
  setMuted: (m: boolean) => void;
  /** Set the selected ship skin (shapeId + colorId). Persisted via Zustand middleware. */
  setSkin: (shapeId: string, colorId: string) => void;
  /** Set the active CRT tier (null = off, 1/2/3 = tier). Persisted via Zustand middleware. */
  setCrtTier: (tier: number | null) => void;
  /** Set CRT intensity, clamped to [0, 1]. Persisted via Zustand middleware. */
  setCrtIntensity: (intensity: number) => void;
}

/**
 * Exported migrate function for testability.
 * Chain: v0 → v1 → v2 → v3 → v4
 */
export const _migrate = (persistedState: unknown, version: number): MetaStore => {
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
  // v3 → v4: add all v1.1 fields (spread existing state first to preserve all prior data)
  if (version < 4) {
    state = {
      ...state,
      volume: 0.8,
      muted: false,
      selectedSkin: { shapeId: 'default', colorId: 'white' },
      crtTier: null,
      crtIntensity: 0.5,
      difficulty: 'normal' as const,
      startingPowerUp: null,
      extraLivesPurchased: 0,
      saveVersion: 4,
    };
  }
  return state as MetaStore;
};

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

      // v1.1 defaults
      volume: 0.8,
      muted: false,
      selectedSkin: { shapeId: 'default', colorId: 'white' },
      crtTier: null,
      crtIntensity: 0.5,
      difficulty: 'normal' as const,
      startingPowerUp: null,
      extraLivesPurchased: 0,

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

      setVolume: (v: number) => {
        set({ volume: Math.max(0, Math.min(1, v)) });
      },

      setMuted: (m: boolean) => {
        set({ muted: m });
      },

      setSkin: (shapeId: string, colorId: string) => {
        set({ selectedSkin: { shapeId, colorId } });
      },

      setCrtTier: (tier: number | null) => {
        set({ crtTier: tier });
      },

      setCrtIntensity: (intensity: number) => {
        set({ crtIntensity: Math.max(0, Math.min(1, intensity)) });
      },
    }),
    {
      name: META_STORAGE_KEY,
      version: 4,
      migrate: _migrate,
    },
  ),
);
