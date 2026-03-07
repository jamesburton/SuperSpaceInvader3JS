/** A purchasable meta upgrade available in the persistent meta shop. */
export interface MetaUpgrade {
  /** Unique ID — stored in MetaStore.purchasedUpgrades on purchase */
  id: string;
  displayName: string;
  description: string;
  /** Cost in SI$ */
  cost: number;
  /** Category for grouping in the shop UI */
  category: 'loadout' | 'passive' | 'bunker' | 'skin' | 'crt';
  /**
   * Effect type for PlayingState to read on run start.
   * 'loadout_spread': start with 30s spread shot active
   * 'loadout_rapid': start with 1 rapid fire charge
   * 'passive_fireRate': +10% fire rate per tier (stacks multiplicatively)
   * 'passive_moveSpeed': +8% move speed per tier
   * 'passive_startingLife': +1 starting life (once)
   * 'passive_maxBullets': raise in-flight bullet cap (sequential tiers)
   * 'passive_siConversion': % of end-run gold converted to SI$
   * 'passive_siTaxReduction': reduce the SI$ start-run tax
   * 'bunker_slot': deploy N bunkers per run
   * 'bunker_autorepair': auto-repair 1 segment/wave on most damaged bunker
   * 'bunker_forceshield': player bullets pass through bunkers (enemy bullets still destroy)
   */
  effectType:
    | 'loadout_spread' | 'loadout_rapid'
    | 'passive_fireRate' | 'passive_moveSpeed' | 'passive_startingLife' | 'passive_continue'
    | 'passive_maxBullets'
    | 'passive_siConversion' | 'passive_siTaxReduction'
    | 'bunker_slot' | 'bunker_autorepair' | 'bunker_forceshield'
    | 'skin_shape'
    | 'crt_tier';
  /** Tier within its effect group (1, 2, or 3) — 0 for loadouts/once-only upgrades */
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

  // --- Continue (META-04) ---
  {
    id: 'extra_continue',
    displayName: 'EMERGENCY RECALL',
    description: 'Once per run: restore full lives instead of game over',
    cost: 80,
    category: 'passive',
    effectType: 'passive_continue',
    tier: 0,
  },

  // --- Bullet Capacity (Fibonacci SI$ costs: 1, 1, 2, 3, 5, 8) ---
  {
    id: 'passive_maxBullets_2',
    displayName: 'DUAL STREAM',
    description: 'Raise bullet cap to 2 in-flight',
    cost: 1,
    category: 'passive',
    effectType: 'passive_maxBullets',
    tier: 2,
  },
  {
    id: 'passive_maxBullets_3',
    displayName: 'TRIPLE STREAM',
    description: 'Raise bullet cap to 3 in-flight',
    cost: 1,
    category: 'passive',
    effectType: 'passive_maxBullets',
    tier: 3,
  },
  {
    id: 'passive_maxBullets_4',
    displayName: 'QUAD STREAM',
    description: 'Raise bullet cap to 4 in-flight',
    cost: 2,
    category: 'passive',
    effectType: 'passive_maxBullets',
    tier: 4,
  },
  {
    id: 'passive_maxBullets_5',
    displayName: 'PENTA STREAM',
    description: 'Raise bullet cap to 5 in-flight',
    cost: 3,
    category: 'passive',
    effectType: 'passive_maxBullets',
    tier: 5,
  },
  {
    id: 'passive_maxBullets_6',
    displayName: 'HEXA STREAM',
    description: 'Raise bullet cap to 6 in-flight',
    cost: 5,
    category: 'passive',
    effectType: 'passive_maxBullets',
    tier: 6,
  },
  {
    id: 'passive_maxBullets_7',
    displayName: 'HEPTA STREAM',
    description: 'Raise bullet cap to 7 in-flight',
    cost: 8,
    category: 'passive',
    effectType: 'passive_maxBullets',
    tier: 7,
  },

  // --- SI$ Conversion (gold-at-death → SI$) ---
  {
    id: 'passive_siConversion_1',
    displayName: 'SMELTER I',
    description: 'Raise end-run gold conversion to 15%',
    cost: 10,
    category: 'passive',
    effectType: 'passive_siConversion',
    tier: 1,
  },
  {
    id: 'passive_siConversion_2',
    displayName: 'SMELTER II',
    description: 'Raise end-run gold conversion to 20%',
    cost: 25,
    category: 'passive',
    effectType: 'passive_siConversion',
    tier: 2,
  },
  {
    id: 'passive_siConversion_3',
    displayName: 'SMELTER III',
    description: 'Raise end-run gold conversion to 25%',
    cost: 40,
    category: 'passive',
    effectType: 'passive_siConversion',
    tier: 3,
  },

  // --- SI$ Tax Reduction (reduces start-run tax on carried SI$) ---
  {
    id: 'passive_siTax_1',
    displayName: 'TAX SHELTER I',
    description: 'Keep 25% of SI$ at run start (base: 15%)',
    cost: 15,
    category: 'passive',
    effectType: 'passive_siTaxReduction',
    tier: 1,
  },
  {
    id: 'passive_siTax_2',
    displayName: 'TAX SHELTER II',
    description: 'Keep 35% of SI$ at run start',
    cost: 28,
    category: 'passive',
    effectType: 'passive_siTaxReduction',
    tier: 2,
  },
  {
    id: 'passive_siTax_3',
    displayName: 'TAX SHELTER III',
    description: 'Keep 45% of SI$ at run start',
    cost: 45,
    category: 'passive',
    effectType: 'passive_siTaxReduction',
    tier: 3,
  },
  {
    id: 'passive_siTax_4',
    displayName: 'TAX SHELTER IV',
    description: 'Keep 55% of SI$ at run start',
    cost: 65,
    category: 'passive',
    effectType: 'passive_siTaxReduction',
    tier: 4,
  },

  // --- Bunker Slots (deploy N bunkers per run, sequential unlock) ---
  {
    id: 'bunker_slot_1',
    displayName: 'BUNKER I',
    description: 'Deploy 1 bunker per run',
    cost: 35,
    category: 'bunker',
    effectType: 'bunker_slot',
    tier: 1,
  },
  {
    id: 'bunker_slot_2',
    displayName: 'BUNKER II',
    description: 'Deploy 2 bunkers per run',
    cost: 35,
    category: 'bunker',
    effectType: 'bunker_slot',
    tier: 2,
  },
  {
    id: 'bunker_slot_3',
    displayName: 'BUNKER III',
    description: 'Deploy 3 bunkers per run',
    cost: 35,
    category: 'bunker',
    effectType: 'bunker_slot',
    tier: 3,
  },
  {
    id: 'bunker_slot_4',
    displayName: 'BUNKER IV',
    description: 'Deploy 4 bunkers per run',
    cost: 35,
    category: 'bunker',
    effectType: 'bunker_slot',
    tier: 4,
  },

  // --- Ship Skin Shapes (SKIN-03: purchasable with SI$) ---
  {
    id: 'skin_shape_delta',
    displayName: 'DELTA FRAME',
    description: 'Unlock the Delta ship shape',
    cost: 25,
    category: 'skin',
    effectType: 'skin_shape',
    tier: 0,
  },
  {
    id: 'skin_shape_dart',
    displayName: 'DART FRAME',
    description: 'Unlock the Dart ship shape',
    cost: 35,
    category: 'skin',
    effectType: 'skin_shape',
    tier: 0,
  },
  {
    id: 'skin_shape_cruiser',
    displayName: 'CRUISER FRAME',
    description: 'Unlock the Cruiser ship shape',
    cost: 50,
    category: 'skin',
    effectType: 'skin_shape',
    tier: 0,
  },

  // --- Bunker Upgrades ---
  {
    id: 'bunker_autorepair',
    displayName: 'AUTO-REPAIR',
    description: 'Restore 1 bunker segment per wave on most damaged bunker',
    cost: 60,
    category: 'bunker',
    effectType: 'bunker_autorepair',
    tier: 0,
  },
  {
    id: 'bunker_forceshield',
    displayName: 'FORCE SHIELD',
    description: 'Your bullets pass through bunkers; only enemy fire destroys segments',
    cost: 80,
    category: 'bunker',
    effectType: 'bunker_forceshield',
    tier: 0,
  },

  // --- CRT Filter Tiers (SKIN-CRT: sequential unlock) ---
  {
    id: 'crt_tier_1',
    displayName: 'HIGH-DEF 2003',
    description: 'Light scanlines — the new retro',
    cost: 30,
    category: 'crt',
    effectType: 'crt_tier',
    tier: 1,
  },
  {
    id: 'crt_tier_2',
    displayName: 'CONSUMER 1991',
    description: 'Moderate scanlines + chromatic aberration',
    cost: 45,
    category: 'crt',
    effectType: 'crt_tier',
    tier: 2,
  },
  {
    id: 'crt_tier_3',
    displayName: 'ARCADE 1983',
    description: 'Heavy scanlines + strong chromatic aberration',
    cost: 60,
    category: 'crt',
    effectType: 'crt_tier',
    tier: 3,
  },
];
