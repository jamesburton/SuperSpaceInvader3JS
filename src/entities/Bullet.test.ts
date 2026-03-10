/**
 * Tests for Bullet entity — pool factory, init, visible/active sync.
 * Three.js is mocked so no WebGL is needed.
 */
import { vi, describe, it, expect } from 'vitest';

vi.mock('three', () => import('../__mocks__/three'));

import { Bullet, createBulletPools } from './Bullet';
import { Scene } from 'three';
import {
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  PLAYER_BULLET_POOL_SIZE,
  ENEMY_BULLET_POOL_SIZE,
} from '../utils/constants';

function makeScene() {
  return new Scene() as unknown as import('three').Scene;
}

describe('Bullet — default state', () => {
  it('starts inactive and invisible', () => {
    const b = new Bullet(makeScene());
    expect(b.visible).toBe(false);
    expect(b.active).toBe(false);
  });

  it('has correct AABB half-sizes', () => {
    const b = new Bullet(makeScene());
    expect(b.width).toBe(BULLET_WIDTH / 2);
    expect(b.height).toBe(BULLET_HEIGHT / 2);
  });
});

describe('Bullet — init()', () => {
  it('sets position and marks active for player bullet', () => {
    const b = new Bullet(makeScene());
    b.init(10, 20, true);
    expect(b.x).toBe(10);
    expect(b.y).toBe(20);
    expect(b.isPlayerBullet).toBe(true);
    expect(b.active).toBe(true);
  });

  it('sets upward velocity for player bullet', () => {
    const b = new Bullet(makeScene());
    b.init(0, 0, true);
    expect(b.vy).toBe(BULLET_SPEED);
    expect(b.vx).toBe(0);
  });

  it('sets downward velocity for enemy bullet', () => {
    const b = new Bullet(makeScene());
    b.init(0, 0, false);
    expect(b.vy).toBe(-ENEMY_BULLET_SPEED);
    expect(b.vx).toBe(0);
  });

  it('resets piercing metadata on reuse', () => {
    const b = new Bullet(makeScene());
    b.init(0, 0, true);
    b.configurePiercingShot();
    b.markEnemyHit(7);

    b.init(2, 3, true);

    expect(b.shotKind).toBe('standard');
    expect(b.remainingHits).toBe(1);
    expect(b.currentDamageScale).toBe(1);
    expect(b.hitEnemyIds.size).toBe(0);
  });
});

describe('Bullet piercing shot configuration', () => {
  it('configures two-hit falloff for piercing shots', () => {
    const b = new Bullet(makeScene());
    b.init(0, 0, true);

    b.configurePiercingShot();

    expect(b.shotKind).toBe('piercing');
    expect(b.remainingHits).toBe(2);
    expect(b.consumeHit()).toBe(1);
    expect(b.consumeHit()).toBe(0.5);
    expect(b.remainingHits).toBe(0);
  });
});

describe('Bullet — visible/active sync', () => {
  it('setting visible=true sets active=true', () => {
    const b = new Bullet(makeScene());
    b.visible = true;
    expect(b.active).toBe(true);
  });

  it('setting visible=false sets active=false', () => {
    const b = new Bullet(makeScene());
    b.visible = true;
    b.visible = false;
    expect(b.active).toBe(false);
  });
});

describe('createBulletPools()', () => {
  it('creates player pool with correct size', () => {
    const scene = makeScene();
    const { playerPool } = createBulletPools(scene);
    expect(playerPool.totalSize).toBe(PLAYER_BULLET_POOL_SIZE);
  });

  it('creates enemy pool with correct size', () => {
    const scene = makeScene();
    const { enemyPool } = createBulletPools(scene);
    expect(enemyPool.totalSize).toBe(ENEMY_BULLET_POOL_SIZE);
  });

  it('pool starts with all bullets inactive (no acquired items)', () => {
    const scene = makeScene();
    const { playerPool } = createBulletPools(scene);
    expect(playerPool.activeCount).toBe(0);
  });

  it('acquire() returns a Bullet', () => {
    const scene = makeScene();
    const { playerPool } = createBulletPools(scene);
    const b = playerPool.acquire();
    expect(b).not.toBeNull();
    expect(b).toBeInstanceOf(Bullet);
  });

  it('acquire() returns null when pool exhausted', () => {
    const scene = makeScene();
    const { playerPool } = createBulletPools(scene);
    // Exhaust all 64 slots
    for (let i = 0; i < PLAYER_BULLET_POOL_SIZE; i++) {
      playerPool.acquire();
    }
    const result = playerPool.acquire();
    expect(result).toBeNull();
  });
});
