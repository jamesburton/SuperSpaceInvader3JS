/**
 * Tests for RunState — SI$ in-run currency (inRunCurrency field, addCurrency, resetCurrency).
 * RunState is a plain TS singleton — no WebGL or Three.js needed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { runState } from './RunState';

beforeEach(() => {
  runState.reset();
});

describe('RunState — inRunCurrency initial state', () => {
  it('starts at 0 after reset', () => {
    expect(runState.inRunCurrency).toBe(0);
  });
});

describe('RunState — addCurrency', () => {
  it('adds currency correctly', () => {
    runState.addCurrency(50);
    expect(runState.inRunCurrency).toBe(50);
  });

  it('accumulates across multiple calls', () => {
    runState.addCurrency(10);
    runState.addCurrency(25);
    runState.addCurrency(15);
    expect(runState.inRunCurrency).toBe(50);
  });

  it('floors fractional amounts to integer', () => {
    runState.addCurrency(7.9);
    expect(runState.inRunCurrency).toBe(7);
  });

  it('handles zero gracefully', () => {
    runState.addCurrency(0);
    expect(runState.inRunCurrency).toBe(0);
  });
});

describe('RunState — resetCurrency', () => {
  it('zeros inRunCurrency', () => {
    runState.addCurrency(100);
    runState.resetCurrency();
    expect(runState.inRunCurrency).toBe(0);
  });
});

describe('RunState — reset() zeros currency', () => {
  it('reset() resets inRunCurrency to 0 (INRUN-03)', () => {
    runState.addCurrency(200);
    runState.reset();
    expect(runState.inRunCurrency).toBe(0);
  });
});

describe('RunState — snapshot includes inRunCurrency', () => {
  it('snapshot() includes inRunCurrency field', () => {
    runState.addCurrency(42);
    const snap = runState.snapshot();
    expect(snap.inRunCurrency).toBe(42);
  });
});
