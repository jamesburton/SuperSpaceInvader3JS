import type { EnemyType } from './enemies';
import type { WaveConfig } from './waveConfig';
import type { DifficultySetting } from '../state/runSetup';

export interface DifficultyAITuning {
  flankerChargeDelay: number;
  sniperFireInterval: number;
  swooperGroupTimers: [number, number, number, number];
}

const NIGHTMARE_SNIPER_WAVE = 6;
const HARD_SNIPER_WAVE = 7;

export function applyDifficultyToWaveConfig(base: WaveConfig, difficulty: DifficultySetting): WaveConfig {
  const next: WaveConfig = {
    ...base,
    allowedTypes: [...base.allowedTypes],
  };

  if (difficulty === 'normal') {
    return next;
  }

  next.cols = Math.min(10, next.cols + 1);
  next.speedMultiplier = round2(next.speedMultiplier * 1.15);
  next.fireRateMultiplier = round2(next.fireRateMultiplier * 1.08);

  if (base.waveNumber >= HARD_SNIPER_WAVE && !next.allowedTypes.includes('sniper')) {
    next.allowedTypes.push('sniper');
  }

  if (difficulty === 'nightmare') {
    next.speedMultiplier = round2(next.speedMultiplier * 1.08);
    next.fireRateMultiplier = round2(next.fireRateMultiplier * 1.1);
    next.hpMultiplier = round2(next.hpMultiplier * 1.08);
    if (base.waveNumber >= NIGHTMARE_SNIPER_WAVE && !next.allowedTypes.includes('sniper')) {
      next.allowedTypes.push('sniper');
    }
  }

  return next;
}

export function getDifficultyAiTuning(difficulty: DifficultySetting): DifficultyAITuning {
  if (difficulty === 'nightmare') {
    return {
      flankerChargeDelay: 10,
      sniperFireInterval: 2.4,
      swooperGroupTimers: [6, 14, 22, 30],
    };
  }

  return {
    flankerChargeDelay: 15,
    sniperFireInterval: 3,
    swooperGroupTimers: [8, 18, 28, 38],
  };
}

export function getBossPhaseCount(difficulty: DifficultySetting): number {
  return difficulty === 'nightmare' ? 3 : 2;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function includesEnemyType(allowedTypes: EnemyType[], type: EnemyType): boolean {
  return allowedTypes.includes(type);
}
