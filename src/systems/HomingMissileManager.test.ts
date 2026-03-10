import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('three', () => import('../__mocks__/three'));

vi.mock('./AudioManager', () => ({
  audioManager: {
    playSfx: vi.fn(),
  },
}));

import { Scene } from 'three';
import { HomingMissileManager } from './HomingMissileManager';
import { runState } from '../state/RunState';

function makeScene() {
  return new Scene() as unknown as import('three').Scene;
}

function makeEnemy(instanceIndex: number, x: number, y: number) {
  return {
    active: true,
    instanceIndex,
    type: 'grunt',
    health: 1,
    height: 9,
    width: 12,
    x,
    y,
  };
}

describe('HomingMissileManager', () => {
  beforeEach(() => {
    runState.reset();
  });

  it('locks the nearest active enemy at fire time', () => {
    const manager = new HomingMissileManager(makeScene());
    const nearEnemy = makeEnemy(1, 0, 80);
    const farEnemy = makeEnemy(2, 120, 220);
    const formation = {
      enemies: [farEnemy, nearEnemy],
      getEnemyWorldPos: (enemy: ReturnType<typeof makeEnemy>) => ({ x: enemy.x, y: enemy.y }),
      getEnemyAABB: (enemy: ReturnType<typeof makeEnemy>) => ({ x: enemy.x, y: enemy.y, w: enemy.width, h: enemy.height }),
      killEnemy() {},
    } as never;

    manager.spawnMissile(0, 0, formation);

    expect(manager.getActiveMissiles()[0]?.targetEnemyId).toBe(1);
  });

  it('expires missiles after their finite lifetime', () => {
    const manager = new HomingMissileManager(makeScene());
    const formation = {
      enemies: [],
      getEnemyWorldPos: () => ({ x: 0, y: 0 }),
      getEnemyAABB: () => ({ x: 0, y: 0, w: 0, h: 0 }),
      killEnemy() {},
    } as never;

    manager.spawnMissile(0, 0, formation);
    manager.update(3, formation);

    expect(manager.getActiveMissiles()).toHaveLength(0);
  });
});
