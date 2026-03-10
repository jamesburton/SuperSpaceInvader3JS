import type { EnemyType } from './enemies';

/**
 * Data-driven wave configuration.
 * Each wave defines formation dimensions, difficulty multipliers, and
 * which enemy archetypes are allowed to appear in that wave.
 */
export interface WaveConfig {
  waveNumber: number;
  rows: number;
  cols: number;
  speedMultiplier: number;
  fireRateMultiplier: number;
  hpMultiplier: number;
  allowedTypes: EnemyType[];
  shopAfterThisWave: boolean;
}

/**
 * Pluggable formation layout interface.
 * GridFormationLayout (the only current implementation) will implement this in Enemy.ts.
 * Plan 03-02 will provide the concrete implementation.
 */
export interface FormationLayout {
  rows: number;
  cols: number;
  colSpacing: number;
  rowSpacing: number;
  getPosition(row: number, col: number, formationX: number, formationY: number): { x: number; y: number };
}

const ALL_TYPES: EnemyType[] = ['grunt', 'shielder', 'flanker', 'sniper', 'charger', 'swooper'];

/**
 * Wave definitions for waves 1-12.
 * Waves 1-2 are easy starter waves. Waves 3-12 are the original 1-10 content.
 * Beyond wave 12, getWaveConfig() derives from the wave-12 template with escalating multipliers.
 */
export const WAVE_CONFIGS: readonly WaveConfig[] = [
  // Wave 1 — tutorial: single row of 4 grunts, very slow
  {
    waveNumber: 1,
    rows: 1,
    cols: 4,
    speedMultiplier: 0.5,
    fireRateMultiplier: 0.4,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt'],
    shopAfterThisWave: false,
  },
  // Wave 2 — two rows, introduce Shielder at low difficulty
  {
    waveNumber: 2,
    rows: 2,
    cols: 5,
    speedMultiplier: 0.65,
    fireRateMultiplier: 0.55,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt', 'shielder'],
    shopAfterThisWave: false,
  },
  // Wave 3 — grunt only, standard starting formation
  {
    waveNumber: 3,
    rows: 3,
    cols: 8,
    speedMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt'],
    shopAfterThisWave: false,
  },
  // Wave 4 — slight escalation
  {
    waveNumber: 4,
    rows: 3,
    cols: 9,
    speedMultiplier: 1.1,
    fireRateMultiplier: 1.1,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt'],
    shopAfterThisWave: false,
  },
  // Wave 5 — introduce Shielder, first shop
  {
    waveNumber: 5,
    rows: 4,
    cols: 9,
    speedMultiplier: 1.2,
    fireRateMultiplier: 1.2,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt', 'shielder'],
    shopAfterThisWave: true,
  },
  // Wave 6 — more Shielders
  {
    waveNumber: 6,
    rows: 4,
    cols: 9,
    speedMultiplier: 1.3,
    fireRateMultiplier: 1.25,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt', 'shielder'],
    shopAfterThisWave: false,
  },
  // Wave 7 — introduce Flanker
  {
    waveNumber: 7,
    rows: 4,
    cols: 10,
    speedMultiplier: 1.4,
    fireRateMultiplier: 1.3,
    hpMultiplier: 1.2,
    allowedTypes: ['grunt', 'shielder', 'flanker'],
    shopAfterThisWave: false,
  },
  // Wave 8 — introduce Sniper
  {
    waveNumber: 8,
    rows: 4,
    cols: 10,
    speedMultiplier: 1.5,
    fireRateMultiplier: 1.35,
    hpMultiplier: 1.2,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper'],
    shopAfterThisWave: false,
  },
  // Wave 9 — introduce Charger
  {
    waveNumber: 9,
    rows: 4,
    cols: 10,
    speedMultiplier: 1.6,
    fireRateMultiplier: 1.4,
    hpMultiplier: 1.4,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper', 'charger'],
    shopAfterThisWave: false,
  },
  // Wave 10 — larger formation, second shop
  {
    waveNumber: 10,
    rows: 5,
    cols: 10,
    speedMultiplier: 1.7,
    fireRateMultiplier: 1.5,
    hpMultiplier: 1.4,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper', 'charger'],
    shopAfterThisWave: true,
  },
  // Wave 11 — introduce Swooper
  {
    waveNumber: 11,
    rows: 5,
    cols: 10,
    speedMultiplier: 1.8,
    fireRateMultiplier: 1.6,
    hpMultiplier: 1.6,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper', 'charger', 'swooper'],
    shopAfterThisWave: false,
  },
  // Wave 12 — all types, max formation
  {
    waveNumber: 12,
    rows: 5,
    cols: 10,
    speedMultiplier: 2.0,
    fireRateMultiplier: 1.8,
    hpMultiplier: 1.6,
    allowedTypes: ALL_TYPES,
    shopAfterThisWave: false,
  },
];

/**
 * Returns the wave configuration for the given wave number.
 * Waves 1-12 return pre-defined entries.
 * Waves beyond 12 are derived from the wave-12 template with escalating multipliers:
 *   - speedMultiplier scales by +5% per wave beyond 12
 *   - fireRateMultiplier scales by +4% per wave beyond 12
 *   - hpMultiplier scales by +3% per wave beyond 12
 *   - shopAfterThisWave is true every 5th wave
 *   - rows/cols are capped at 5/10
 */
export function getWaveConfig(wave: number): WaveConfig {
  if (wave <= WAVE_CONFIGS.length) {
    return WAVE_CONFIGS[wave - 1];
  }

  // Beyond wave 10: derive from wave-10 template
  const base = WAVE_CONFIGS[WAVE_CONFIGS.length - 1];
  const extraWaves = wave - WAVE_CONFIGS.length;

  return {
    waveNumber: wave,
    rows: Math.min(5, base.rows),
    cols: Math.min(10, base.cols),
    speedMultiplier: base.speedMultiplier * (1 + extraWaves * 0.05),
    fireRateMultiplier: base.fireRateMultiplier * (1 + extraWaves * 0.04),
    hpMultiplier: base.hpMultiplier * (1 + extraWaves * 0.03),
    allowedTypes: ALL_TYPES,
    shopAfterThisWave: wave % 5 === 0,
  };
}
