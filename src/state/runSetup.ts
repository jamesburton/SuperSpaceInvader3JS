import type { PowerUpType } from '../config/powerups';

export type DifficultySetting = 'normal' | 'hard' | 'nightmare';

const LEGACY_STARTING_LIFE_ID = 'passive_startingLife';
const STARTING_LIFE_TIER_IDS = ['passive_startingLife_1', 'passive_startingLife_2'] as const;
const STARTING_SLOT_ID = 'starting_powerup_slot';
export const HARD_CLEAR_MARKER = 'milestone_hard_clear';

const STARTING_POWER_UP_UNLOCKS: Record<PowerUpType, string | null> = {
  spreadShot: 'loadout_spread_start',
  rapidFire: 'loadout_rapid_start',
  shield: null,
  piercingShot: STARTING_SLOT_ID,
  homingMissile: STARTING_SLOT_ID,
  timeSlow: STARTING_SLOT_ID,
};

const STARTING_POWER_UP_ORDER: readonly PowerUpType[] = [
  'spreadShot',
  'rapidFire',
  'piercingShot',
  'homingMissile',
  'timeSlow',
];

export function normalizePurchasedUpgrades(purchasedUpgrades: string[]): string[] {
  const normalized = new Set(purchasedUpgrades);
  if (normalized.delete(LEGACY_STARTING_LIFE_ID)) {
    normalized.add('passive_startingLife_1');
  }
  return [...normalized];
}

export function countOwnedStartingLifeTiers(purchasedUpgrades: string[]): number {
  const owned = new Set(normalizePurchasedUpgrades(purchasedUpgrades));
  return STARTING_LIFE_TIER_IDS.reduce((count, id) => count + (owned.has(id) ? 1 : 0), 0);
}

export function hasStartingPowerUpSlot(purchasedUpgrades: string[]): boolean {
  return normalizePurchasedUpgrades(purchasedUpgrades).includes(STARTING_SLOT_ID);
}

export function getUnlockedDifficultyOptions(purchasedUpgrades: string[]): DifficultySetting[] {
  const owned = new Set(normalizePurchasedUpgrades(purchasedUpgrades));
  const options: DifficultySetting[] = ['normal'];
  if (owned.has('difficulty_hard_unlock')) options.push('hard');
  if (owned.has('difficulty_nightmare_unlock')) options.push('nightmare');
  return options;
}

export function hasHardCampaignClear(purchasedUpgrades: string[]): boolean {
  return normalizePurchasedUpgrades(purchasedUpgrades).includes(HARD_CLEAR_MARKER);
}

export function getUnlockedStartingPowerUps(purchasedUpgrades: string[]): PowerUpType[] {
  const owned = new Set(normalizePurchasedUpgrades(purchasedUpgrades));
  return STARTING_POWER_UP_ORDER.filter((type) => {
    const unlockId = STARTING_POWER_UP_UNLOCKS[type];
    return unlockId !== null && owned.has(unlockId);
  });
}

export function normalizeStartingPowerUp(value: unknown): PowerUpType | null {
  if (typeof value !== 'string') return null;
  if (value === null || value === undefined) return null;

  switch (value) {
    case 'spreadShot':
    case 'rapidFire':
    case 'shield':
    case 'piercingShot':
    case 'homingMissile':
    case 'timeSlow':
      return value;
    case 'loadout_spread_start':
      return 'spreadShot';
    case 'loadout_rapid_start':
      return 'rapidFire';
    default:
      return null;
  }
}
