import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayingState } from './PlayingState';
import { runState } from '../state/RunState';

const metaState = {
  purchasedUpgrades: [] as string[],
  selectedSkin: { shapeId: 'default', colorId: 'white' },
  metaCurrency: 0,
  addMetaCurrency: vi.fn(),
  updateHighScore: vi.fn(),
  bunkersEnabled: false,
  startingPowerUp: null as string | null,
};

vi.mock('../systems/AudioManager', () => ({
  audioManager: {
    playSfx: vi.fn(),
    playBgm: vi.fn(),
    stopBgm: vi.fn(),
    setMuted: vi.fn(),
    isMuted: false,
  },
}));

vi.mock('../state/MetaState', () => ({
  useMetaStore: {
    getState: () => metaState,
  },
}));

vi.mock('../entities/PlayerSkinManager', () => ({
  PlayerSkinManager: class {
    applySkin() {}
  },
}));

describe('PlayingState time slow routing', () => {
  beforeEach(() => {
    runState.reset();
    metaState.purchasedUpgrades = [];
    metaState.selectedSkin = { shapeId: 'default', colorId: 'white' };
    metaState.metaCurrency = 0;
    metaState.bunkersEnabled = false;
    metaState.startingPowerUp = null;
    metaState.addMetaCurrency.mockReset();
    metaState.updateHighScore.mockReset();
  });

  it('keeps player updates on raw dt while hostile systems get slowed dt', () => {
    const movementSystem = {
      isMovingHorizontally: false,
      trackPlayerMovement: vi.fn(),
      updateBullets: vi.fn(),
    };
    const aiSystem = {
      update: vi.fn(() => false),
      reset: vi.fn(),
      setDifficulty: vi.fn(),
    };
    const player = {
      active: true,
      x: 0,
      y: 0,
      height: 12,
      width: 20,
      mesh: { visible: true },
      update: vi.fn(),
      canFire: vi.fn(() => false),
      setFireCooldownMultiplier: vi.fn(),
      setSpeedMultiplier: vi.fn(),
      setMaxBulletsInFlight: vi.fn(),
    };
    const ctx = {
      scene: { setTimeSlowEffect: vi.fn(), renderWithEffects: vi.fn(), camera: {} },
      player,
      formation: {},
      playerBulletPool: {},
      enemyBulletPool: {},
      activeBullets: [],
      movementSystem,
      weaponSystem: { update: vi.fn() },
      aiSystem,
      collisionSystem: { update: vi.fn(), wasHitThisStep: vi.fn(() => false), consumePickupName: vi.fn(() => null), reset: vi.fn() },
      spawnSystem: {
        update: vi.fn(() => false),
        shopPending: false,
        clearShopPending: vi.fn(),
        bossPending: false,
        clearBossPending: vi.fn(),
        levelCompletePending: false,
        clearLevelCompletePending: vi.fn(),
        setLevelWaves: vi.fn(),
        setDifficulty: vi.fn(),
        reset: vi.fn(),
      },
      particleManager: { spawnEngineTrail: vi.fn(), update: vi.fn() },
      cameraShake: { reset: vi.fn(), triggerSmall: vi.fn(), triggerLarge: vi.fn(), apply: vi.fn() },
      bossHealthBar: { show: vi.fn(), update: vi.fn(), hide: vi.fn() },
      pickupFeedback: { showPickup: vi.fn() },
      powerUpManager: {
        combatTimeScale: 0.45,
        update: vi.fn(),
        activePowerUpType: 'timeSlow',
        activeDurationRemaining: 5,
        activeDurationFull: 8,
        activeShieldCharges: 0,
        releaseTokensOnly: vi.fn(),
        releaseAll: vi.fn(),
      },
      shopSystem: { reset: vi.fn() },
      shopUI: { isVisible: false },
      boss: { active: false, deactivate: vi.fn(), isAlive: vi.fn(() => true) },
      bossSystem: { update: vi.fn(), reset: vi.fn(), phaseJustChanged: false, setDifficulty: vi.fn() },
      bunkerManager: { hasDamagedBunker: vi.fn(() => false), reset: vi.fn(), spawnForRun: vi.fn(), autoRepairBetweenWaves: vi.fn() },
      homingMissileManager: { update: vi.fn(), releaseAll: vi.fn() },
    };
    const input = {
      justPressed: vi.fn(() => false),
      isDown: vi.fn(() => false),
      clearJustPressed: vi.fn(),
    };
    const hud = {
      hideOverlay: vi.fn(),
      setTimeSlowEffect: vi.fn(),
      sync: vi.fn(),
      syncPowerUp: vi.fn(),
    };
    const state = new PlayingState({ push: vi.fn(), replace: vi.fn() } as never, input as never, hud as never, ctx as never);

    state.enter();
    state.update(1);

    expect(player.update).toHaveBeenCalledWith(1, false, false);
    expect(aiSystem.update).toHaveBeenCalledWith(0.45, ctx.formation, ctx.enemyBulletPool, ctx.activeBullets, player.x);
    expect(movementSystem.updateBullets).toHaveBeenCalledWith(1, ctx.activeBullets, ctx.playerBulletPool, ctx.enemyBulletPool, 0.45);
    expect(runState.timeScale).toBe(0.45);
  });

  it('applies extra starting lives and the selected starting power-up only on fresh runs', () => {
    metaState.purchasedUpgrades = ['passive_startingLife_1', 'passive_startingLife_2'];
    metaState.startingPowerUp = 'timeSlow';

    const player = {
      active: true,
      x: 0,
      y: 0,
      height: 12,
      width: 20,
      mesh: { visible: true },
      update: vi.fn(),
      canFire: vi.fn(() => false),
      setFireCooldownMultiplier: vi.fn(),
      setSpeedMultiplier: vi.fn(),
      setMaxBulletsInFlight: vi.fn(),
    };
    const powerUpManager = {
      combatTimeScale: 1,
      update: vi.fn(),
      activePowerUpType: null,
      activeDurationRemaining: 0,
      activeDurationFull: 0,
      activeShieldCharges: 0,
      releaseTokensOnly: vi.fn(),
      releaseAll: vi.fn(),
      activate: vi.fn(),
    };
    const ctx = {
      scene: { setTimeSlowEffect: vi.fn(), renderWithEffects: vi.fn(), camera: {} },
      player,
      formation: { spawnWave: vi.fn() },
      playerBulletPool: { release: vi.fn() },
      enemyBulletPool: { release: vi.fn() },
      activeBullets: [],
      movementSystem: { isMovingHorizontally: false, trackPlayerMovement: vi.fn(), updateBullets: vi.fn() },
      weaponSystem: { update: vi.fn() },
      aiSystem: { update: vi.fn(() => false), reset: vi.fn(), setDifficulty: vi.fn() },
      collisionSystem: { update: vi.fn(), wasHitThisStep: vi.fn(() => false), consumePickupName: vi.fn(() => null), reset: vi.fn() },
      spawnSystem: {
        update: vi.fn(() => false),
        shopPending: false,
        clearShopPending: vi.fn(),
        bossPending: false,
        clearBossPending: vi.fn(),
        levelCompletePending: false,
        clearLevelCompletePending: vi.fn(),
        setLevelWaves: vi.fn(),
        setDifficulty: vi.fn(),
        reset: vi.fn(),
      },
      particleManager: { spawnEngineTrail: vi.fn(), update: vi.fn() },
      cameraShake: { reset: vi.fn(), triggerSmall: vi.fn(), triggerLarge: vi.fn(), apply: vi.fn() },
      bossHealthBar: { show: vi.fn(), update: vi.fn(), hide: vi.fn() },
      pickupFeedback: { showPickup: vi.fn() },
      powerUpManager,
      shopSystem: { reset: vi.fn() },
      shopUI: { isVisible: false },
      boss: { active: false, deactivate: vi.fn(), isAlive: vi.fn(() => true) },
      bossSystem: { update: vi.fn(), reset: vi.fn(), phaseJustChanged: false, setDifficulty: vi.fn() },
      bunkerManager: { hasDamagedBunker: vi.fn(() => false), reset: vi.fn(), spawnForRun: vi.fn(), autoRepairBetweenWaves: vi.fn() },
      homingMissileManager: { update: vi.fn(), releaseAll: vi.fn() },
    };
    const input = {
      justPressed: vi.fn(() => false),
      isDown: vi.fn(() => false),
      clearJustPressed: vi.fn(),
    };
    const hud = {
      hideOverlay: vi.fn(),
      setTimeSlowEffect: vi.fn(),
      sync: vi.fn(),
      syncPowerUp: vi.fn(),
    };

    const state = new PlayingState({ push: vi.fn(), replace: vi.fn() } as never, input as never, hud as never, ctx as never);
    state.enter();

    expect(runState.lives).toBe(5);
    expect(powerUpManager.activate).toHaveBeenCalledWith('timeSlow', 30);

    runState.useContinue();
    powerUpManager.activate.mockClear();
    const continuedState = new PlayingState({ push: vi.fn(), replace: vi.fn() } as never, input as never, hud as never, ctx as never);
    continuedState.enter();

    expect(runState.lives).toBe(3);
    expect(powerUpManager.activate).not.toHaveBeenCalled();
  });
});
