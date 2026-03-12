import { describe, expect, it } from 'vitest';
import { getDifficultyAiTuning, applyDifficultyToWaveConfig, getBossPhaseCount } from './difficultyRules';
import { WAVE_CONFIGS } from './waveConfig';

describe('difficultyRules', () => {
  it('leaves normal wave configs unchanged and non-mutating', () => {
    const base = WAVE_CONFIGS[6];
    const snapshot = JSON.stringify(base);
    const result = applyDifficultyToWaveConfig(base, 'normal');

    expect(result).not.toBe(base);
    expect(result).toEqual(base);
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('hard increases speed, formation width, and advances sniper access', () => {
    const result = applyDifficultyToWaveConfig(WAVE_CONFIGS[6], 'hard');

    expect(result.cols).toBe(Math.min(10, WAVE_CONFIGS[6].cols + 1));
    expect(result.speedMultiplier).toBeGreaterThan(WAVE_CONFIGS[6].speedMultiplier);
    expect(result.allowedTypes).toContain('sniper');
  });

  it('nightmare layers extra pressure and adds a third boss phase', () => {
    const result = applyDifficultyToWaveConfig(WAVE_CONFIGS[5], 'nightmare');
    const tuning = getDifficultyAiTuning('nightmare');

    expect(result.speedMultiplier).toBeGreaterThan(WAVE_CONFIGS[5].speedMultiplier);
    expect(result.allowedTypes).toContain('sniper');
    expect(tuning.flankerChargeDelay).toBeLessThan(getDifficultyAiTuning('normal').flankerChargeDelay);
    expect(tuning.swooperGroupTimers[0]).toBeLessThan(getDifficultyAiTuning('normal').swooperGroupTimers[0]);
    expect(getBossPhaseCount('nightmare')).toBe(3);
  });
});
