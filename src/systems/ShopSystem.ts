import { runState } from '../state/RunState';
import type { Player } from '../entities/Player';

// ---------------------------------------------------------------------------
// Shop item definition
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: string;
  displayName: string;
  description: string;
  price: number;        // SI$ cost
  category: 'weapon' | 'defense' | 'movement' | 'life';
  tier: number;         // 1 = basic, 2 = enhanced, 3 = advanced
  maxPurchases: number; // how many times this can be bought per run
}

// ---------------------------------------------------------------------------
// Shop item pool — all upgrades available in the between-wave shop
// ---------------------------------------------------------------------------

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'fireRateUp',
    displayName: 'RAPID TRIGGER',
    description: '+20% fire rate',
    price: 30,
    category: 'weapon',
    tier: 1,
    maxPurchases: 3,
  },
  {
    id: 'spreadCount',
    displayName: 'EXTRA BARREL',
    description: '+1 spread shot (max 5)',
    price: 40,
    category: 'weapon',
    tier: 1,
    maxPurchases: 2,
  },
  {
    id: 'bulletSpeed',
    displayName: 'HYPER CHARGE',
    description: '+15% bullet speed',
    price: 25,
    category: 'weapon',
    tier: 1,
    maxPurchases: 3,
  },
  {
    id: 'moveSpeed',
    displayName: 'AFTERBURNER',
    description: '+10% move speed',
    price: 25,
    category: 'movement',
    tier: 1,
    maxPurchases: 3,
  },
  {
    id: 'shieldCharge',
    displayName: 'SHIELD CELL',
    description: 'Add 1 shield charge',
    price: 50,
    category: 'defense',
    tier: 1,
    maxPurchases: 99,
  },
  {
    id: 'extraLife',
    displayName: 'EXTRA LIFE',
    description: '+1 life (max 9)',
    price: 80,
    category: 'life',
    tier: 1,
    maxPurchases: 6,
  },
  {
    id: 'repairBunker',
    displayName: 'REPAIR BUNKER',
    description: 'Fully repair most damaged bunker',
    price: 30,
    category: 'defense',
    tier: 1,
    maxPurchases: 99,
  },
];

// ---------------------------------------------------------------------------
// ShopSystem — manages purchases and run-persistent stat multipliers
// ---------------------------------------------------------------------------

export class ShopSystem {
  /** Track purchases this run: itemId -> purchase count */
  private purchaseCounts: Map<string, number> = new Map();

  /** In-run stat multipliers — applied to Player/WeaponSystem at runtime */
  public fireRateMultiplier: number = 1.0;
  public spreadCount: number = 1;   // 1 = standard, 3 = spread-3, 5 = spread-5
  public bulletSpeedMultiplier: number = 1.0;
  public moveSpeedMultiplier: number = 1.0;

  /**
   * Optional callback for shield charge purchase — injected by PlayingState
   * to call powerUpManager.shieldCharges++ (avoids direct import cycle).
   */
  public _onShieldChargePurchased: (() => void) | null = null;

  /** Optional callback for bunker repair purchase — injected by Game.ts. */
  public _onBunkerRepairPurchased: (() => void) | null = null;

  /**
   * Returns all non-maxed shop items for multi-buy shop display.
   * Filters out items that have reached maxPurchases for this run.
   */
  public getAvailableItems(): ShopItem[] {
    return SHOP_ITEMS.filter(item => {
      const purchased = this.purchaseCounts.get(item.id) ?? 0;
      return purchased < item.maxPurchases;
    });
  }

  /**
   * @deprecated Use getAvailableItems() instead.
   * Generate 3 random non-maxed shop items.
   */
  public generateChoices(): ShopItem[] {
    const available = this.getAvailableItems();
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  /**
   * Apply purchase. Returns true if successful (sufficient Gold).
   * Deducts price from runState.gold and applies the immediate effect.
   */
  public purchaseItem(item: ShopItem, player: Player): boolean {
    if (runState.gold < item.price) return false;

    runState.addGold(-item.price); // deduct (negative amount)

    const prev = this.purchaseCounts.get(item.id) ?? 0;
    this.purchaseCounts.set(item.id, prev + 1);

    // Apply immediate effect
    switch (item.id) {
      case 'fireRateUp':
        this.fireRateMultiplier *= 1.2;
        // Cooldown multiplier is inverse of fire rate multiplier (shorter cooldown = faster fire)
        player.setFireCooldownMultiplier(1 / this.fireRateMultiplier);
        break;

      case 'spreadCount':
        this.spreadCount = Math.min(5, this.spreadCount + 2);
        break;

      case 'bulletSpeed':
        this.bulletSpeedMultiplier *= 1.15;
        break;

      case 'moveSpeed':
        this.moveSpeedMultiplier *= 1.10;
        player.setSpeedMultiplier(this.moveSpeedMultiplier);
        break;

      case 'shieldCharge':
        // Delegate to PlayingState-injected callback to avoid circular import
        this._onShieldChargePurchased?.();
        break;

      case 'extraLife':
        runState.addLife();
        break;

      case 'repairBunker':
        this._onBunkerRepairPurchased?.();
        break;
    }

    return true;
  }

  /**
   * Reset all purchase counts and multipliers at run end.
   * INRUN-04: upgrades are run-only, never persist across runs.
   */
  public reset(): void {
    this.purchaseCounts.clear();
    this.fireRateMultiplier = 1.0;
    this.spreadCount = 1;
    this.bulletSpeedMultiplier = 1.0;
    this.moveSpeedMultiplier = 1.0;
    // NOTE: do NOT null callbacks — they are wired once in Game.init() and must persist across runs
  }
}
