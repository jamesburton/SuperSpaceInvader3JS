import { PLAYER_LIVES } from '../utils/constants';
import type { GamePhase, RunStateData } from '../utils/types';

// Singleton module-level state — intentionally NOT using Zustand
// RunState is volatile: discarded at run end, never written to localStorage
const _state: RunStateData = {
  score: 0,
  lives: PLAYER_LIVES,
  wave: 1,
  enemiesKilled: 0,
  gamePhase: 'playing' as GamePhase,
};

export const runState = {
  get score() { return _state.score; },
  get lives() { return _state.lives; },
  get wave() { return _state.wave; },
  get enemiesKilled() { return _state.enemiesKilled; },
  get gamePhase() { return _state.gamePhase; },

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

  /** Reset for new run */
  reset(): void {
    _state.score = 0;
    _state.lives = PLAYER_LIVES;
    _state.wave = 1;
    _state.enemiesKilled = 0;
    _state.gamePhase = 'playing';
  },

  snapshot(): RunStateData {
    return { ..._state };
  },
};

export type RunState = typeof runState;
export type { RunStateData };
