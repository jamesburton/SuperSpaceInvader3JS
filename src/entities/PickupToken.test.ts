import { describe, expect, it, vi } from 'vitest';

vi.mock('three', () => import('../__mocks__/three'));

import { Scene } from 'three';
import { PickupToken } from './PickupToken';

function makeScene() {
  return new Scene() as unknown as import('three').Scene;
}

describe('PickupToken phase 9 visuals', () => {
  it('gives piercing shot a narrow elongated silhouette', () => {
    const token = new PickupToken(makeScene());
    token.init(0, 0, 'piercingShot');

    expect(token.mesh.scale.x).toBe(0.45);
    expect(token.mesh.scale.y).toBe(1.7);
  });

  it('resets the pooled token shape before applying a new type', () => {
    const token = new PickupToken(makeScene());
    token.init(0, 0, 'homingMissile');
    token.init(0, 0, 'timeSlow');

    expect(token.mesh.scale.x).toBe(1.25);
    expect(token.mesh.scale.y).toBe(1.25);
  });
});
