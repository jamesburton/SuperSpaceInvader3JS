/**
 * Tests for MetaState v4 migration.
 * Verifies:
 *   - v3 save data survives migration with all existing fields intact
 *   - new v1.1 fields have correct defaults after migration
 *   - full chain v0->v4 migration produces fully populated state
 *   - setVolume clamps to [0, 1]
 *   - setMuted sets the muted flag
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { _migrate, useMetaStore } from './MetaState';

beforeEach(() => {
  useMetaStore.setState(useMetaStore.getInitialState());
});

// ---------------------------------------------------------------------------
// Migration helper tests (pure unit — no DOM/WebGL required)
// ---------------------------------------------------------------------------

describe('MetaState — v3->v4 migration preserves existing data', () => {
  it('keeps metaCurrency, highScore, purchasedUpgrades, campaignProgress from v3 snapshot', () => {
    const v3Snapshot = {
      saveVersion: 3,
      metaCurrency: 500,
      highScore: 12000,
      purchasedUpgrades: ['passive_fireRate_1'],
      bunkersEnabled: true,
      campaignProgress: { 1: 2 },
      briefingAutoDismiss: false,
    };

    const result = _migrate(v3Snapshot, 3);

    expect(result.metaCurrency).toBe(500);
    expect(result.highScore).toBe(12000);
    expect(result.purchasedUpgrades).toEqual(['passive_fireRate_1']);
    expect(result.campaignProgress).toEqual({ 1: 2 });
    expect(result.bunkersEnabled).toBe(true);
    expect(result.briefingAutoDismiss).toBe(false);
  });
});

describe('MetaState — v3->v4 migration adds new fields with correct defaults', () => {
  it('adds all v1.1 fields with correct default values', () => {
    const v3Snapshot = {
      saveVersion: 3,
      metaCurrency: 500,
      highScore: 12000,
      purchasedUpgrades: ['passive_fireRate_1'],
      bunkersEnabled: true,
      campaignProgress: { 1: 2 },
      briefingAutoDismiss: false,
    };

    const result = _migrate(v3Snapshot, 3);

    expect(result.volume).toBe(0.8);
    expect(result.muted).toBe(false);
    expect(result.selectedSkin).toEqual({ shapeId: 'default', colorId: 'white' });
    expect(result.crtTier).toBeNull();
    expect(result.crtIntensity).toBe(0.5);
    expect(result.difficulty).toBe('normal');
    expect(result.startingPowerUp).toBeNull();
    expect(result.extraLivesPurchased).toBe(0);
    expect(result.saveVersion).toBe(4);
  });
});

describe('MetaState — full chain v0->v4 migration', () => {
  it('migrates a bare v0 snapshot through the entire chain with all fields populated', () => {
    // v0 = no fields at all
    const result = _migrate({}, 0);

    // v0->v1 fields
    expect(result.purchasedUpgrades).toEqual([]);
    // v1->v2 fields
    expect(result.bunkersEnabled).toBe(true);
    // v2->v3 fields
    expect(result.campaignProgress).toEqual({});
    expect(result.briefingAutoDismiss).toBe(false);
    // v3->v4 fields
    expect(result.volume).toBe(0.8);
    expect(result.muted).toBe(false);
    expect(result.selectedSkin).toEqual({ shapeId: 'default', colorId: 'white' });
    expect(result.crtTier).toBeNull();
    expect(result.crtIntensity).toBe(0.5);
    expect(result.difficulty).toBe('normal');
    expect(result.startingPowerUp).toBeNull();
    expect(result.extraLivesPurchased).toBe(0);
    expect(result.saveVersion).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Store action tests (via Zustand store API)
// ---------------------------------------------------------------------------

describe('MetaState — setVolume action', () => {
  it('sets volume to a value within [0, 1]', () => {
    useMetaStore.getState().setVolume(0.5);
    expect(useMetaStore.getState().volume).toBe(0.5);
  });

  it('clamps volume below 0 to 0', () => {
    useMetaStore.getState().setVolume(-0.5);
    expect(useMetaStore.getState().volume).toBe(0);
  });

  it('clamps volume above 1 to 1', () => {
    useMetaStore.getState().setVolume(1.5);
    expect(useMetaStore.getState().volume).toBe(1);
  });
});

describe('MetaState — setMuted action', () => {
  it('sets muted to true', () => {
    useMetaStore.getState().setMuted(true);
    expect(useMetaStore.getState().muted).toBe(true);
  });

  it('sets muted to false', () => {
    useMetaStore.getState().setMuted(true);
    useMetaStore.getState().setMuted(false);
    expect(useMetaStore.getState().muted).toBe(false);
  });
});
