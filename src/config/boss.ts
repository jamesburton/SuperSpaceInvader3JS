/** Boss configuration — data-driven, planner's discretion per CONTEXT.md */
export interface BossPhaseConfig {
  /** HP threshold at which this phase begins (fraction: 1.0 = full, 0.0 = dead) */
  startFraction: number;
  /** Emissive color (hex) for boss mesh during this phase */
  color: number;
  /** Emissive color during phase transition flash (briefly shown) */
  flashColor: number;
  /** Attack fire rate (shots per second) */
  fireRate: number;
}

export interface BossConfig {
  totalHp: number;
  /** Width for mesh and AABB (half-width = meshW / 2) */
  meshW: number;
  /** Height for mesh and AABB (half-height = meshH / 2) */
  meshH: number;
  /** Score award on defeat */
  scoreValue: number;
  /** SI$ meta currency awarded when boss is defeated */
  metaCurrencyReward: number;
  phases: [BossPhaseConfig, BossPhaseConfig]; // exactly 2 phases for v1
}

export const BOSS_DEF: BossConfig = {
  totalHp: 120,
  meshW: 80,
  meshH: 60,
  scoreValue: 2000,
  metaCurrencyReward: 50,  // SI$ earned on boss defeat
  phases: [
    {
      startFraction: 1.0,  // Phase 1: full HP down to 50%
      color: 0xFF1133,     // neon red (cyberpunk aggressive)
      flashColor: 0xFFFFFF,
      fireRate: 0.8,       // aimed spread shots, 0.8/sec
    },
    {
      startFraction: 0.5,  // Phase 2: 50% HP down to 0
      color: 0xFF6600,     // neon orange (intensified threat)
      flashColor: 0xFFFFFF,
      fireRate: 1.4,       // sweeping beam, faster
    },
  ],
};
