import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { META_STORAGE_KEY } from '../utils/constants';

const SAVE_VERSION = 1;

export interface MetaStore {
  saveVersion: number;
  metaCurrency: number;
  highScore: number;
  // Phase 4 will add: unlocks, cosmetics, startingArtifacts, permanentBonuses
  updateHighScore: (score: number) => void;
  addMetaCurrency: (amount: number) => void;
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      saveVersion: SAVE_VERSION,
      metaCurrency: 0,
      highScore: 0,

      updateHighScore: (score: number) => {
        if (score > get().highScore) {
          set({ highScore: score });
        }
      },

      addMetaCurrency: (amount: number) => {
        set((s) => ({ metaCurrency: s.metaCurrency + amount }));
      },
    }),
    {
      name: META_STORAGE_KEY,
      // Future migration hook: if saveVersion mismatch, reset or migrate
      // Phase 4 will implement migrateSave() here
    },
  ),
);
