export type EnemyType = 'grunt';  // Phase 3 will add: 'shielder' | 'flanker' | 'sniper' | 'charger'

export interface EnemyDef {
  readonly hp: number;
  readonly scoreValue: number;
  readonly halfWidth: number;   // AABB half-width for collision
  readonly halfHeight: number;  // AABB half-height
  readonly meshWidth: number;   // visual size
  readonly meshHeight: number;
  readonly dropChance: number;  // power-up drop probability (Phase 3 uses this)
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
    dropChance: 0.05, // 5% drop chance (Phase 3 activates)
  },
};

export { ROW_SIZES };
