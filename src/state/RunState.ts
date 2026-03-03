import { PLAYER_LIVES, MAX_LIVES_CAP } from '../utils/constants';
import type { GamePhase, RunStateData } from '../utils/types';

// Singleton module-level state — intentionally NOT using Zustand
// RunState is volatile: discarded at run end, never written to localStorage
const _state: RunStateData = {
  score: 0,
  lives: PLAYER_LIVES,
  wave: 1,
  enemiesKilled: 0,
  gamePhase: 'playing' as GamePhase,
  inRunCurrency: 0,
};

export const runState = {
  get score() { return _state.score; },
  get lives() { return _state.lives; },
  get wave() { return _state.wave; },
  get enemiesKilled() { return _state.enemiesKilled; },
  get gamePhase() { return _state.gamePhase; },
  get inRunCurrency() { return _state.inRunCurrency; },

  addScore(amount: number): void {
    _state.score += amount;
  },

  loseLife(): void {
    _state.lives = Math.max(0, _state.lives - 1);
  },

  nextWave(): void {
    _state.wave += 1;
  },

  recordKill(): void {
    _state.enemiesKilled += 1;
  },

  setPhase(phase: GamePhase): void {
    _state.gamePhase = phase;
  },

  /** Add one life, capped at MAX_LIVES_CAP */
  addLife(): void {
    _state.lives = Math.min(MAX_LIVES_CAP, _state.lives + 1);
  },

  /** Add SI$ in-run currency (floors to integer) */
  addCurrency(amount: number): void {
    _state.inRunCurrency += Math.floor(amount);
  },

  /** Zero the in-run currency (called explicitly or via reset()) */
  resetCurrency(): void {
    _state.inRunCurrency = 0;
  },

  /** Reset for new run */
  reset(): void {
    _state.score = 0;
    _state.lives = PLAYER_LIVES;
    _state.wave = 1;
    _state.enemiesKilled = 0;
    _state.gamePhase = 'playing';
    _state.inRunCurrency = 0;
  },

  snapshot(): RunStateData {
    return { ..._state };
  },
};

export type RunState = typeof runState;
export type { RunStateData };
