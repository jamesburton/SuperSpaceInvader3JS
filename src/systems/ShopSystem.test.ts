import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShopSystem, SHOP_ITEMS } from './ShopSystem';
import { runState } from '../state/RunState';

describe('ShopSystem phase 9 power-ups', () => {
  beforeEach(() => {
    runState.reset();
  });

  it('registers the new phase 9 shop items', () => {
    expect(SHOP_ITEMS.map((item) => item.id)).toEqual(expect.arrayContaining([
      'piercingShot',
      'homingMissile',
      'timeSlow',
    ]));
  });

  it('activates timed power-up purchases immediately', () => {
    const shop = new ShopSystem();
    const player = {
      setFireCooldownMultiplier: vi.fn(),
      setSpeedMultiplier: vi.fn(),
    } as never;
    const activate = vi.fn();
    shop._onTimedPowerUpPurchased = activate;
    runState.addGold(100);

    const result = shop.purchaseItem(SHOP_ITEMS.find((item) => item.id === 'timeSlow')!, player);

    expect(result).toBe(true);
    expect(activate).toHaveBeenCalledWith('timeSlow');
  });
});
