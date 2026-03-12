import { describe, expect, it } from 'vitest';
import { BossSystem } from './BossSystem';

describe('BossSystem Phase 10 boss logic', () => {
  it('transitions to phase 2 for the standard boss thresholds', () => {
    const system = new BossSystem();
    const boss = {
      active: true,
      currentPhase: 1,
      x: 0,
      y: 200,
      height: 30,
      healthFraction: () => 0.49,
      applyFlashColor: () => {},
      applyPhaseColor: () => {},
      updateMesh: () => {},
    };
    const pool = { acquire: () => null };
    const bullets: unknown[] = [];

    system.update(0.16, boss as never, 0, pool as never, bullets as never);

    expect(boss.currentPhase).toBe(2);
    expect(system.phaseJustChanged).toBe(true);
  });

  it('supports the nightmare third phase and fires the expanded pattern', () => {
    const system = new BossSystem();
    system.setDifficulty('nightmare');

    const shots: Array<{ vx: number; vy: number }> = [];
    const pool = {
      acquire: () => {
        const bullet = {
          vx: 0,
          vy: 0,
          init: () => {},
        };
        shots.push(bullet);
        return bullet;
      },
    };
    const boss = {
      active: true,
      currentPhase: 1,
      x: 0,
      y: 200,
      height: 30,
      healthFraction: () => 0.2,
      applyFlashColor: () => {},
      applyPhaseColor: () => {},
      updateMesh: () => {},
    };

    system.update(1, boss as never, 0, pool as never, [] as never);

    expect(boss.currentPhase).toBe(3);
    expect(shots).toHaveLength(6);
  });
});
