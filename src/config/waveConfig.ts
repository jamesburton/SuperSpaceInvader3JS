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
 * Wave definitions for waves 1-10.
 * Beyond wave 10, getWaveConfig() derives from the wave-10 template with escalating multipliers.
 */
export const WAVE_CONFIGS: readonly WaveConfig[] = [
  // Wave 1 — intro wave: grunt only, small formation
  {
    waveNumber: 1,
    rows: 3,
    cols: 8,
    speedMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt'],
    shopAfterThisWave: false,
  },
  // Wave 2 — slight escalation
  {
    waveNumber: 2,
    rows: 3,
    cols: 9,
    speedMultiplier: 1.1,
    fireRateMultiplier: 1.1,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt'],
    shopAfterThisWave: false,
  },
  // Wave 3 — introduce Shielder
  {
    waveNumber: 3,
    rows: 4,
    cols: 9,
    speedMultiplier: 1.2,
    fireRateMultiplier: 1.2,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt', 'shielder'],
    shopAfterThisWave: false,
  },
  // Wave 4 — more Shielders
  {
    waveNumber: 4,
    rows: 4,
    cols: 9,
    speedMultiplier: 1.3,
    fireRateMultiplier: 1.25,
    hpMultiplier: 1.0,
    allowedTypes: ['grunt', 'shielder'],
    shopAfterThisWave: false,
  },
  // Wave 5 — introduce Flanker, first shop
  {
    waveNumber: 5,
    rows: 4,
    cols: 10,
    speedMultiplier: 1.4,
    fireRateMultiplier: 1.3,
    hpMultiplier: 1.2,
    allowedTypes: ['grunt', 'shielder', 'flanker'],
    shopAfterThisWave: true,
  },
  // Wave 6 — introduce Sniper
  {
    waveNumber: 6,
    rows: 4,
    cols: 10,
    speedMultiplier: 1.5,
    fireRateMultiplier: 1.35,
    hpMultiplier: 1.2,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper'],
    shopAfterThisWave: false,
  },
  // Wave 7 — introduce Charger
  {
    waveNumber: 7,
    rows: 4,
    cols: 10,
    speedMultiplier: 1.6,
    fireRateMultiplier: 1.4,
    hpMultiplier: 1.4,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper', 'charger'],
    shopAfterThisWave: false,
  },
  // Wave 8 — larger formation
  {
    waveNumber: 8,
    rows: 5,
    cols: 10,
    speedMultiplier: 1.7,
    fireRateMultiplier: 1.5,
    hpMultiplier: 1.4,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper', 'charger'],
    shopAfterThisWave: false,
  },
  // Wave 9 — introduce Swooper
  {
    waveNumber: 9,
    rows: 5,
    cols: 10,
    speedMultiplier: 1.8,
    fireRateMultiplier: 1.6,
    hpMultiplier: 1.6,
    allowedTypes: ['grunt', 'shielder', 'flanker', 'sniper', 'charger', 'swooper'],
    shopAfterThisWave: false,
  },
  // Wave 10 — all types, second shop, max formation
  {
    waveNumber: 10,
    rows: 5,
    cols: 10,
    speedMultiplier: 2.0,
    fireRateMultiplier: 1.8,
    hpMultiplier: 1.6,
    allowedTypes: ALL_TYPES,
    shopAfterThisWave: true,
  },
];

/**
 * Returns the wave configuration for the given wave number.
 * Waves 1-10 return pre-defined entries.
 * Waves beyond 10 are derived from the wave-10 template with escalating multipliers:
 *   - speedMultiplier scales by +5% per wave beyond 10
 *   - fireRateMultiplier scales by +4% per wave beyond 10
 *   - hpMultiplier scales by +3% per wave beyond 10
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
