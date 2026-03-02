/**
 * Tests for Player entity — movement, bounds clamping, fire cooldown.
 * Three.js is mocked so no WebGL is needed.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('three', () => import('../__mocks__/three'));

import { Player } from './Player';
import { Scene } from 'three';
import {
  PLAYER_MOVE_BOUNDS,
  PLAYER_SPEED,
  WORLD_HEIGHT,
} from '../utils/constants';

function makeScene() {
  return new Scene() as unknown as import('three').Scene;
}

describe('Player — initial state', () => {
  it('starts at x=0 (horizontal center)', () => {
    const p = new Player(makeScene());
    expect(p.x).toBe(0);
  });

  it('starts at y = -(WORLD_HEIGHT/2) + 40 (near bottom)', () => {
    const p = new Player(makeScene());
    expect(p.y).toBe(-(WORLD_HEIGHT / 2) + 40);
  });

  it('starts with full lives and active=true', () => {
    const p = new Player(makeScene());
    expect(p.active).toBe(true);
  });
});

describe('Player — movement', () => {
  let p: Player;

  beforeEach(() => {
    p = new Player(makeScene());
  });

  it('moves left when leftHeld is true', () => {
    p.update(1, true, false);
    expect(p.x).toBe(-PLAYER_SPEED);
  });

  it('moves right when rightHeld is true', () => {
    p.update(1, false, true);
    expect(p.x).toBe(PLAYER_SPEED);
  });

  it('does not move when neither key held', () => {
    p.update(1, false, false);
    expect(p.x).toBe(0);
  });

  it('clamps position to -PLAYER_MOVE_BOUNDS on the left', () => {
    p.update(100, true, false); // move far left
    expect(p.x).toBe(-PLAYER_MOVE_BOUNDS);
  });

  it('clamps position to +PLAYER_MOVE_BOUNDS on the right', () => {
    p.update(100, false, true); // move far right
    expect(p.x).toBe(PLAYER_MOVE_BOUNDS);
  });
});

describe('Player — fire cooldown', () => {
  let p: Player;

  beforeEach(() => {
    p = new Player(makeScene());
  });

  it('canFire() returns true initially (no cooldown)', () => {
    expect(p.canFire()).toBe(true);
  });

  it('canFire() returns false immediately after recordFire()', () => {
    p.recordFire();
    expect(p.canFire()).toBe(false);
  });

  it('canFire() returns true after cooldown elapses (0.25s)', () => {
    p.recordFire();
    p.update(0.26, false, false); // advance past 0.25s cooldown
    expect(p.canFire()).toBe(true);
  });

  it('canFire() returns false if cooldown not fully elapsed', () => {
    p.recordFire();
    p.update(0.10, false, false); // only 0.10s elapsed, need 0.25s
    expect(p.canFire()).toBe(false);
  });
});
