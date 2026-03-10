import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('three', () => import('../__mocks__/three'));

vi.mock('../state/MetaState', () => ({
  useMetaStore: {
    getState: () => ({
      purchasedUpgrades: [],
    }),
  },
}));

vi.mock('./AudioManager', () => ({
  audioManager: {
    playSfx: vi.fn(),
  },
}));

import { Scene } from 'three';
import { Bullet, createBulletPools } from '../entities/Bullet';
import { CollisionSystem } from './CollisionSystem';
import { runState } from '../state/RunState';

function makeScene() {
  return new Scene() as unknown as import('three').Scene;
}

function spawnPlayerBullet(playerPool: ReturnType<typeof createBulletPools>['playerPool']): Bullet {
  const bullet = playerPool.acquire()!;
  bullet.init(0, 0, true);
  return bullet;
}

function makeEnemy(instanceIndex: number) {
  return {
    active: true,
    instanceIndex,
    type: 'grunt',
    width: 12,
    height: 9,
    health: 1,
    shieldActive: false,
    shieldHp: 0,
  };
}

describe('CollisionSystem piercing bullets', () => {
  beforeEach(() => {
    runState.reset();
  });

  it('piercing bullets damage two enemies with falloff before releasing', () => {
    const scene = makeScene();
    const { playerPool, enemyPool } = createBulletPools(scene);
    const collision = new CollisionSystem();
    const player = { x: 999, y: 999, width: 10, height: 10, active: true, mesh: { visible: true } } as never;
    const activeBullets: Bullet[] = [];

    const firstEnemy = makeEnemy(0);
    const secondEnemy = makeEnemy(1);
    firstEnemy.health = 1;
    secondEnemy.health = 1;
    const formation = {
      enemies: [firstEnemy, secondEnemy],
      getEnemyAABB: (enemy: ReturnType<typeof makeEnemy>) => ({
        x: 0,
        y: enemy.instanceIndex === 0 ? 0 : 20,
        w: 12,
        h: 9,
      }),
      getEnemyWorldPos: () => ({ x: 0, y: 0 }),
      killEnemy(instanceIndex: number) {
        const enemy = this.enemies.find((candidate: ReturnType<typeof makeEnemy>) => candidate.instanceIndex === instanceIndex);
        if (enemy) enemy.active = false;
      },
    };

    const bullet = spawnPlayerBullet(playerPool);
    bullet.configurePiercingShot();
    activeBullets.push(bullet);

    collision.update(1 / 60, activeBullets, player, formation as never, playerPool, enemyPool);

    expect(firstEnemy.active).toBe(false);
    expect(secondEnemy.health).toBe(1);
    expect(activeBullets).toContain(bullet);

    bullet.y = 20;
    collision.update(1 / 60, activeBullets, player, formation as never, playerPool, enemyPool);

    expect(secondEnemy.health).toBe(0.5);
    expect(activeBullets).not.toContain(bullet);
  });

  it('does not damage the same enemy twice on overlapping frames', () => {
    const scene = makeScene();
    const { playerPool, enemyPool } = createBulletPools(scene);
    const collision = new CollisionSystem();
    const player = { x: 999, y: 999, width: 10, height: 10, active: true, mesh: { visible: true } } as never;
    const activeBullets: Bullet[] = [];

    const enemy = makeEnemy(0);
    enemy.health = 3;
    const formation = {
      enemies: [enemy],
      getEnemyAABB: () => ({ x: 0, y: 0, w: 12, h: 9 }),
      getEnemyWorldPos: () => ({ x: 0, y: 0 }),
      killEnemy() {},
    };

    const bullet = spawnPlayerBullet(playerPool);
    bullet.configurePiercingShot();
    bullet.remainingHits = 3;
    bullet.damageFalloff = 1;
    activeBullets.push(bullet);

    collision.update(1 / 60, activeBullets, player, formation as never, playerPool, enemyPool);
    collision.update(1 / 60, activeBullets, player, formation as never, playerPool, enemyPool);

    expect(enemy.health).toBe(2);
    expect(activeBullets).toContain(bullet);
  });
});
