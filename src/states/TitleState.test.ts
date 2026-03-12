// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HUD } from '../ui/HUD';
import { runState } from '../state/RunState';
import { TitleState } from './TitleState';

const createMetaState = () => ({
  saveVersion: 5,
  metaCurrency: 0,
  highScore: 0,
  purchasedUpgrades: [] as string[],
  bunkersEnabled: true,
  campaignProgress: {} as Record<number, number>,
  briefingAutoDismiss: false,
  volume: 0.8,
  muted: false,
  selectedSkin: { shapeId: 'default', colorId: 'white' },
  crtTier: null as number | null,
  crtIntensity: 0.5,
  difficulty: 'normal' as const,
  startingPowerUp: null as 'spreadShot' | 'rapidFire' | 'piercingShot' | 'homingMissile' | 'timeSlow' | null,
  extraLivesPurchased: 0,
  setDifficulty: vi.fn((difficulty) => {
    metaState.difficulty = difficulty;
  }),
  setStartingPowerUp: vi.fn((startingPowerUp) => {
    metaState.startingPowerUp = startingPowerUp;
  }),
});

const metaState = createMetaState();

vi.mock('../systems/AudioManager', () => ({
  audioManager: {
    playSfx: vi.fn(),
    stopBgm: vi.fn(),
  },
}));

vi.mock('../ui/MetaShopUI', () => ({
  MetaShopUI: class {
    public isVisible = false;
    show() { this.isVisible = true; }
    hide() { this.isVisible = false; }
    update() {}
  },
}));

vi.mock('../ui/HighScoreUI', () => ({
  HighScoreUI: class {
    public isVisible = false;
    show() { this.isVisible = true; }
    hide() { this.isVisible = false; }
    update() {}
  },
}));

vi.mock('../state/ProfileManager', () => ({
  profileManager: {
    saveCurrentState: vi.fn(),
    getActiveProfileName: vi.fn(() => 'ACE'),
  },
}));

vi.mock('../state/MetaState', () => ({
  useMetaStore: {
    getState: () => metaState,
    setState: (partial: Partial<typeof metaState>) => {
      Object.assign(metaState, partial);
    },
    getInitialState: () => createMetaState(),
  },
}));

describe('TitleState Phase 10 run setup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="hud"></div>';
    Object.assign(metaState, createMetaState());
    runState.reset();
  });

  function createState() {
    const hud = new HUD(document.getElementById('hud') as HTMLElement);
    const input = {
      activeInputDevice: 'keyboard',
      justPressed: vi.fn(() => false),
      isDown: vi.fn(() => false),
      clearJustPressed: vi.fn(),
    };
    const stateManager = {
      push: vi.fn(),
      replace: vi.fn(),
    };
    const ctx = {
      scene: { render: vi.fn() },
      player: { active: true, x: 0, mesh: { visible: true } },
      formation: { spawnWave: vi.fn() },
      playerBulletPool: { release: vi.fn() },
      enemyBulletPool: { release: vi.fn() },
      activeBullets: [],
      movementSystem: {},
      weaponSystem: {},
      aiSystem: { reset: vi.fn() },
      collisionSystem: { reset: vi.fn() },
      spawnSystem: { reset: vi.fn() },
      particleManager: {},
      cameraShake: {},
      bossHealthBar: { hide: vi.fn() },
      pickupFeedback: {},
      powerUpManager: { releaseAll: vi.fn() },
      shopSystem: { reset: vi.fn() },
      shopUI: {},
      boss: { deactivate: vi.fn() },
      bossSystem: { reset: vi.fn() },
      bunkerManager: { reset: vi.fn() },
      homingMissileManager: { releaseAll: vi.fn() },
    };

    const state = new TitleState(stateManager as never, input as never, hud, ctx as never);
    state.enter();

    return { state, hud, input, stateManager };
  }

  it('shows the run-setup overlay with remembered difficulty and NONE option', () => {
    Object.assign(metaState, {
      purchasedUpgrades: ['starting_powerup_slot', 'loadout_spread_start', 'difficulty_hard_unlock'],
      difficulty: 'hard',
      startingPowerUp: 'spreadShot',
    });

    const { state } = createState();
    (state as any)._showRunSetup('endless', 0);

    const overlay = document.getElementById('hud-overlay') as HTMLElement;
    expect(overlay.textContent).toContain('RUN SETUP');
    expect(overlay.textContent).toContain('HARD');
    expect(overlay.textContent).toContain('NONE');
    expect(overlay.textContent).toContain('SPREAD SHOT');
    expect(overlay.textContent).not.toContain('NIGHTMARE');
    expect((state as any).runSetupState.difficultyOptions).toEqual(['normal', 'hard']);
    expect((state as any).runSetupState.powerUpOptions).toEqual([null, 'spreadShot', 'piercingShot', 'homingMissile', 'timeSlow']);
  });

  it('persists the selected run setup and launches PlayingState', () => {
    Object.assign(metaState, {
      purchasedUpgrades: ['starting_powerup_slot', 'loadout_rapid_start'],
      difficulty: 'normal',
      startingPowerUp: null,
    });

    const { state, stateManager } = createState();
    (state as any)._showRunSetup('endless', 0);
    (state as any).runSetupState.powerUpIndex = 1;
    (state as any)._confirmRunSetup();

    expect(metaState.difficulty).toBe('normal');
    expect(metaState.startingPowerUp).toBe('rapidFire');
    expect(runState.mode).toBe('endless');
    expect(stateManager.replace).toHaveBeenCalledTimes(1);
  });
});
