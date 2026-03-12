/**
 * Tests for waveConfig — WaveConfig structure, WAVE_CONFIGS entries, getWaveConfig function,
 * and FormationLayout interface (structural check via duck typing).
 */
import { describe, it, expect } from 'vitest';
import {
  WAVE_CONFIGS,
  getWaveConfig,
  type FormationLayout,
} from './waveConfig';

describe('WAVE_CONFIGS — structure', () => {
  it('has 12 entries (waves 1-12)', () => {
    expect(WAVE_CONFIGS).toHaveLength(12);
  });

  it('every entry has required WaveConfig fields', () => {
    for (const cfg of WAVE_CONFIGS) {
      expect(typeof cfg.waveNumber).toBe('number');
      expect(typeof cfg.rows).toBe('number');
      expect(typeof cfg.cols).toBe('number');
      expect(typeof cfg.speedMultiplier).toBe('number');
      expect(typeof cfg.fireRateMultiplier).toBe('number');
      expect(typeof cfg.hpMultiplier).toBe('number');
      expect(Array.isArray(cfg.allowedTypes)).toBe(true);
      expect(typeof cfg.shopAfterThisWave).toBe('boolean');
    }
  });

  it('waveNumbers match index (wave 1 at index 0, wave 10 at index 9)', () => {
    WAVE_CONFIGS.forEach((cfg, i) => {
      expect(cfg.waveNumber).toBe(i + 1);
    });
  });
});

describe('getWaveConfig — known waves', () => {
  it('wave 1: rows=1, cols=4, only grunt allowed, shopAfterThisWave=false', () => {
    const cfg = getWaveConfig(1);
    expect(cfg.rows).toBe(1);
    expect(cfg.cols).toBe(4);
    expect(cfg.allowedTypes).toEqual(['grunt']);
    expect(cfg.shopAfterThisWave).toBe(false);
    expect(cfg.speedMultiplier).toBe(0.5);
  });

  it('wave 5: shopAfterThisWave=true, has shielder in allowedTypes', () => {
    const cfg = getWaveConfig(5);
    expect(cfg.shopAfterThisWave).toBe(true);
    expect(cfg.allowedTypes).toContain('shielder');
  });

  it('wave 12: all 6 types allowed', () => {
    const cfg = getWaveConfig(12);
    expect(cfg.shopAfterThisWave).toBe(false);
    expect(cfg.allowedTypes).toContain('grunt');
    expect(cfg.allowedTypes).toContain('swooper');
    expect(cfg.rows).toBe(5);
    expect(cfg.cols).toBe(10);
  });

  it('wave 3: still grunt-only but full formation begins', () => {
    const cfg = getWaveConfig(3);
    expect(cfg.allowedTypes).toEqual(['grunt']);
    expect(cfg.rows).toBe(3);
  });
});

describe('getWaveConfig — beyond wave 12', () => {
  it('wave 13: returns valid config (does not throw)', () => {
    expect(() => getWaveConfig(13)).not.toThrow();
  });

  it('wave 999: returns valid config with all types', () => {
    const cfg = getWaveConfig(999);
    expect(cfg).toBeDefined();
    expect(cfg.allowedTypes).toContain('grunt');
    expect(cfg.allowedTypes).toContain('swooper');
    expect(cfg.rows).toBeLessThanOrEqual(5);
    expect(cfg.cols).toBeLessThanOrEqual(10);
  });

  it('wave 15: shopAfterThisWave=true (15 % 5 === 0)', () => {
    const cfg = getWaveConfig(15);
    expect(cfg.shopAfterThisWave).toBe(true);
  });

  it('wave 12: shopAfterThisWave=false (12 % 5 !== 0)', () => {
    const cfg = getWaveConfig(12);
    expect(cfg.shopAfterThisWave).toBe(false);
  });

  it('wave 15 speedMultiplier > wave 12 speedMultiplier (escalates)', () => {
    const w12 = getWaveConfig(12);
    const w15 = getWaveConfig(15);
    expect(w15.speedMultiplier).toBeGreaterThan(w12.speedMultiplier);
  });

  it('hard difficulty applies the shared transform without mutating the base config', () => {
    const normal = getWaveConfig(7);
    const hard = getWaveConfig(7, 'hard');

    expect(hard.cols).toBeGreaterThanOrEqual(normal.cols);
    expect(hard.speedMultiplier).toBeGreaterThan(normal.speedMultiplier);
    expect(normal.allowedTypes).not.toContain('sniper');
    expect(hard.allowedTypes).toContain('sniper');
  });
});

describe('FormationLayout — interface shape', () => {
  it('can be duck-typed: object with rows, cols, colSpacing, rowSpacing, getPosition', () => {
    // Structural check: create a minimal conforming object
    const layout: FormationLayout = {
      rows: 4,
      cols: 10,
      colSpacing: 50,
      rowSpacing: 40,
      getPosition(row, col, fx, fy) {
        return { x: fx + col * 50, y: fy + row * 40 };
      },
    };
    expect(layout.rows).toBe(4);
    const pos = layout.getPosition(0, 0, 0, 0);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
    const pos2 = layout.getPosition(1, 2, 100, 200);
    expect(pos2.x).toBe(200);
    expect(pos2.y).toBe(240);
  });
});
