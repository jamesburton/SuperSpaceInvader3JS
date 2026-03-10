import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayingState } from './PlayingState';
import { runState } from '../state/RunState';

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
    getState: () => ({
      purchasedUpgrades: [],
      selectedSkin: { shapeId: 'default', colorId: 'white' },
      metaCurrency: 0,
      addMetaCurrency: vi.fn(),
      updateHighScore: vi.fn(),
      bunkersEnabled: false,
    }),
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
      bossSystem: { update: vi.fn(), reset: vi.fn(), phaseJustChanged: false },
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
});
