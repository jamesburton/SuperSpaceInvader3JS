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
  gold: 0,
  siEarnedThisRun: 0,
};

/** Tracks total gold earned during this run (for shop balance history). Resets on reset(). */
let _goldEarnedThisRun = 0;

export const runState = {
  get score() { return _state.score; },
  get lives() { return _state.lives; },
  get wave() { return _state.wave; },
  get enemiesKilled() { return _state.enemiesKilled; },
  get gamePhase() { return _state.gamePhase; },
  get gold() { return _state.gold; },
  get goldEarnedThisRun() { return _goldEarnedThisRun; },
  get siEarnedThisRun() { return _state.siEarnedThisRun; },

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

  /** Add Gold in-run currency (floors to integer). Tracks goldEarnedThisRun for positive amounts. */
  addGold(amount: number): void {
    const floored = Math.floor(amount);
    _state.gold += floored;
    if (floored > 0) _goldEarnedThisRun += floored;
  },

  /** Zero the in-run gold balance (called explicitly or via reset()) */
  resetGold(): void {
    _state.gold = 0;
  },

  /** Called each time a wave is cleared — earns 1 SI$ per wave (META-01) */
  recordWaveSI(): void {
    _state.siEarnedThisRun += 1;
  },

  /** Reset for new run */
  reset(): void {
    _state.score = 0;
    _state.lives = PLAYER_LIVES;
    _state.wave = 1;
    _state.enemiesKilled = 0;
    _state.gamePhase = 'playing';
    _state.gold = 0;
    _goldEarnedThisRun = 0;
    _state.siEarnedThisRun = 0;
  },

  snapshot(): RunStateData {
    return { ..._state };
  },
};

export type RunState = typeof runState;
export type { RunStateData };
