/** A purchasable meta upgrade available in the persistent meta shop. */
export interface MetaUpgrade {
  /** Unique ID — stored in MetaStore.purchasedUpgrades on purchase */
  id: string;
  displayName: string;
  description: string;
  /** Cost in SI$ */
  cost: number;
  /** Category for grouping in the shop UI */
  category: 'loadout' | 'passive';
  /**
   * Effect type for PlayingState to read on run start.
   * 'loadout_spread': start with 30s spread shot active
   * 'loadout_rapid': start with 1 rapid fire charge
   * 'passive_fireRate': +10% fire rate per tier (stacks multiplicatively)
   * 'passive_moveSpeed': +8% move speed per tier
   * 'passive_startingLife': +1 starting life (once)
   */
  effectType: 'loadout_spread' | 'loadout_rapid' | 'passive_fireRate' | 'passive_moveSpeed' | 'passive_startingLife';
  /** Tier within its effect group (1, 2, or 3) — 0 for loadouts */
  tier: number;
}

export const META_UPGRADES: MetaUpgrade[] = [
  // --- Starting Weapon Loadouts (META-03) ---
  {
    id: 'loadout_spread_start',
    displayName: 'SPREAD MATRIX',
    description: 'Start each run with Spread Shot active for 30 seconds',
    cost: 40,
    category: 'loadout',
    effectType: 'loadout_spread',
    tier: 0,
  },
  {
    id: 'loadout_rapid_start',
    displayName: 'RAPID PROTOCOL',
    description: 'Start each run with Rapid Fire active for 30 seconds',
    cost: 40,
    category: 'loadout',
    effectType: 'loadout_rapid',
    tier: 0,
  },

  // --- Passive Stat Upgrades: Fire Rate (META-04) ---
  // 3 tiers — each increases fire rate by 10% (multiplicative, capped at tier 3)
  {
    id: 'passive_fireRate_1',
    displayName: 'TRIGGER TUNE I',
    description: '+10% fire rate (permanent)',
    cost: 20,
    category: 'passive',
    effectType: 'passive_fireRate',
    tier: 1,
  },
  {
    id: 'passive_fireRate_2',
    displayName: 'TRIGGER TUNE II',
    description: '+10% fire rate (stacks with tier I)',
    cost: 35,
    category: 'passive',
    effectType: 'passive_fireRate',
    tier: 2,
  },
  {
    id: 'passive_fireRate_3',
    displayName: 'TRIGGER TUNE III',
    description: '+10% fire rate (max tier)',
    cost: 55,
    category: 'passive',
    effectType: 'passive_fireRate',
    tier: 3,
  },

  // --- Passive Stat Upgrades: Move Speed (META-04) ---
  {
    id: 'passive_moveSpeed_1',
    displayName: 'THRUSTER MOD I',
    description: '+8% move speed (permanent)',
    cost: 20,
    category: 'passive',
    effectType: 'passive_moveSpeed',
    tier: 1,
  },
  {
    id: 'passive_moveSpeed_2',
    displayName: 'THRUSTER MOD II',
    description: '+8% move speed (stacks with tier I)',
    cost: 35,
    category: 'passive',
    effectType: 'passive_moveSpeed',
    tier: 2,
  },
  {
    id: 'passive_moveSpeed_3',
    displayName: 'THRUSTER MOD III',
    description: '+8% move speed (max tier)',
    cost: 55,
    category: 'passive',
    effectType: 'passive_moveSpeed',
    tier: 3,
  },

  // --- Passive: Starting Life (META-04) ---
  {
    id: 'passive_startingLife',
    displayName: 'EXTRA PILOT',
    description: 'Start each run with +1 life',
    cost: 60,
    category: 'passive',
    effectType: 'passive_startingLife',
    tier: 1,
  },
];
