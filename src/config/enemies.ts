export type EnemyType = 'grunt' | 'shielder' | 'flanker' | 'sniper' | 'charger' | 'swooper';

export interface EnemyDef {
  readonly hp: number;
  readonly scoreValue: number;
  readonly halfWidth: number;   // AABB half-width for collision
  readonly halfHeight: number;  // AABB half-height
  readonly meshWidth: number;   // visual size
  readonly meshHeight: number;
  readonly dropChance: number;  // power-up drop probability
  readonly sidDropAmount: number; // SI$ dropped on kill
  readonly shieldHp?: number;   // Shielder only: separate shield health
}

// Row sizing: larger enemies on lower rows (heavier enemies = more threatening)
// Row 0 = top (small), Row 3 = bottom (large)
const ROW_SIZES: Array<{ meshW: number; meshH: number; halfW: number; halfH: number }> = [
  { meshW: 24, meshH: 18, halfW: 12, halfH: 9 },  // row 0: small
  { meshW: 28, meshH: 20, halfW: 14, halfH: 10 }, // row 1: medium-small
  { meshW: 32, meshH: 22, halfW: 16, halfH: 11 }, // row 2: medium-large
  { meshW: 36, meshH: 24, halfW: 18, halfH: 12 }, // row 3: large (bottom)
];

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  grunt: {
    hp: 1,
    scoreValue: 10,
    halfWidth: 16,    // use largest row for collision (conservative bound)
    halfHeight: 12,
    meshWidth: 32,    // will be overridden per-row by EnemyFormation
    meshHeight: 22,
    dropChance: 0.05, // 5% drop chance
    sidDropAmount: 5,
  },

  shielder: {
    hp: 1,            // body HP (shield is separate)
    scoreValue: 25,
    halfWidth: 20,    // wide enemy
    halfHeight: 14,
    meshWidth: 40,
    meshHeight: 28,
    dropChance: 0.12,
    sidDropAmount: 15,
    shieldHp: 2,      // shield must be broken before body can be hit
  },

  flanker: {
    hp: 1,
    scoreValue: 20,
    halfWidth: 15,    // narrow, fast-looking silhouette
    halfHeight: 10,
    meshWidth: 30,
    meshHeight: 20,
    dropChance: 0.10,
    sidDropAmount: 12,
  },

  sniper: {
    hp: 1,
    scoreValue: 30,
    halfWidth: 14,    // tall, narrow sniper
    halfHeight: 17,
    meshWidth: 28,
    meshHeight: 34,
    dropChance: 0.15,
    sidDropAmount: 20,
  },

  charger: {
    hp: 2,            // takes two hits
    scoreValue: 35,
    halfWidth: 19,    // large aggressive frame
    halfHeight: 13,
    meshWidth: 38,
    meshHeight: 26,
    dropChance: 0.18,
    sidDropAmount: 25,
  },

  swooper: {
    hp: 1,
    scoreValue: 15,
    halfWidth: 13,    // small, agile
    halfHeight: 10,
    meshWidth: 26,
    meshHeight: 20,
    dropChance: 0.08,
    sidDropAmount: 10,
  },
};

export { ROW_SIZES };
