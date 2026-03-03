/**
 * Tests for RunState — Gold in-run currency (gold field, addGold, resetGold).
 * RunState is a plain TS singleton — no WebGL or Three.js needed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { runState } from './RunState';

beforeEach(() => {
  runState.reset();
});

describe('RunState — gold initial state', () => {
  it('starts at 0 after reset', () => {
    expect(runState.gold).toBe(0);
  });
});

describe('RunState — addGold', () => {
  it('adds gold correctly', () => {
    runState.addGold(50);
    expect(runState.gold).toBe(50);
  });

  it('accumulates across multiple calls', () => {
    runState.addGold(10);
    runState.addGold(25);
    runState.addGold(15);
    expect(runState.gold).toBe(50);
  });

  it('floors fractional amounts to integer', () => {
    runState.addGold(7.9);
    expect(runState.gold).toBe(7);
  });

  it('handles zero gracefully', () => {
    runState.addGold(0);
    expect(runState.gold).toBe(0);
  });

  it('tracks goldEarnedThisRun for positive amounts', () => {
    runState.addGold(30);
    runState.addGold(20);
    expect(runState.goldEarnedThisRun).toBe(50);
  });

  it('does not add negative amounts to goldEarnedThisRun', () => {
    runState.addGold(50);
    runState.addGold(-10); // shop purchase deduction
    expect(runState.goldEarnedThisRun).toBe(50);
  });
});

describe('RunState — resetGold', () => {
  it('zeros gold balance', () => {
    runState.addGold(100);
    runState.resetGold();
    expect(runState.gold).toBe(0);
  });
});

describe('RunState — reset() zeros gold', () => {
  it('reset() resets gold to 0 (INRUN-03)', () => {
    runState.addGold(200);
    runState.reset();
    expect(runState.gold).toBe(0);
  });

  it('reset() resets goldEarnedThisRun to 0', () => {
    runState.addGold(100);
    runState.reset();
    expect(runState.goldEarnedThisRun).toBe(0);
  });
});

describe('RunState — snapshot includes gold', () => {
  it('snapshot() includes gold field', () => {
    runState.addGold(42);
    const snap = runState.snapshot();
    expect(snap.gold).toBe(42);
  });
});
