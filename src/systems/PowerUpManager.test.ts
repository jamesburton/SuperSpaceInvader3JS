import { describe, expect, it, vi } from 'vitest';

vi.mock('three', () => import('../__mocks__/three'));

import { Scene } from 'three';
import { PowerUpManager } from './PowerUpManager';

function makeScene() {
  return new Scene() as unknown as import('three').Scene;
}

describe('PowerUpManager time slow', () => {
  it('exposes a reduced hostile time scale while time slow is active', () => {
    const manager = new PowerUpManager(makeScene());

    manager.activate('timeSlow', 8);

    expect(manager.combatTimeScale).toBe(0.45);
  });
});
