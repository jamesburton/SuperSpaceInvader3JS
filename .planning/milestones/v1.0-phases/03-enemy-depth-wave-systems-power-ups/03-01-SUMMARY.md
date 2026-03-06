---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "01"
subsystem: config
tags: [enemy-types, wave-config, run-state, currency, formation-layout, typescript]

# Dependency graph
requires:
  - phase: 01-engine-core-combat
    provides: RunState singleton, EnemyType, EnemyDef, constants, types — all extended here
  - phase: 02-visual-identity-game-feel
    provides: Per-row InstancedMesh pattern and EnemyFormation shape contracts used by ENEMY_DEFS sizes
provides:
  - "EnemyType union: grunt | shielder | flanker | sniper | charger | swooper"
  - "ENEMY_DEFS with 6 entries: hp, scoreValue, halfW/H, meshW/H, dropChance, sidDropAmount, optional shieldHp"
  - "WaveConfig interface and WAVE_CONFIGS (10-wave array) with getWaveConfig(n) for infinite scaling"
  - "FormationLayout pluggable interface (GridFormationLayout impl goes in Plan 03-02)"
  - "RunState.inRunCurrency with addCurrency()/resetCurrency() — SI$ accumulates and resets per run"
  - "constants: ENEMY_POOL_SIZE=512, MAX_LIVES_CAP=9, SHOP_TRIGGER_INTERVAL=5, SID_SYMBOL"
  - "EnemyEntity.type broadened from literal 'grunt' to EnemyType"
affects:
  - "03-02: Enemy.ts — reads EnemyType, EnemyDef, ROW_SIZES, FormationLayout"
  - "03-03: PowerUpManager — reads dropChance, sidDropAmount from ENEMY_DEFS"
  - "03-04: AISystem — reads EnemyType to branch AI behavior per archetype"
  - "03-05: SpawnSystem — calls getWaveConfig(wave) for formation sizing and allowedTypes"
  - "03-07: ShopSystem — reads runState.inRunCurrency as shop budget"
  - "03-08: Game.ts — reads runState.reset() to zero currency on run end"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Data-driven wave config: WAVE_CONFIGS array + getWaveConfig(n) with infinite scaling beyond 10"
    - "Optional interface fields for archetype-specific data (shieldHp on shielder only)"
    - "SI$ currency as integer-only accumulator (Math.floor on addCurrency)"
    - "FormationLayout pluggable interface pattern for Plan 03-02 GridFormationLayout"

key-files:
  created:
    - src/config/waveConfig.ts
    - src/config/enemies.test.ts
    - src/config/waveConfig.test.ts
    - src/state/RunState.test.ts
  modified:
    - src/config/enemies.ts
    - src/state/RunState.ts
    - src/utils/constants.ts
    - src/utils/types.ts

key-decisions:
  - "EnemyDef.sidDropAmount: number is non-optional — every enemy type must declare how much SI$ it drops"
  - "EnemyDef.shieldHp?: number is optional — only Shielder needs it; type system enforces this constraint"
  - "getWaveConfig beyond wave 10: +5% speed, +4% fireRate, +3% HP per wave; shop on every 5th wave"
  - "EnemyEntity.type broadened to EnemyType now (not in Plan 03-02) — types.ts is the single source of truth and deferring would create a broken intermediate state"
  - "ENEMY_POOL_SIZE increased from 256 to 512 to accommodate 5-row × 10-col formations plus Swooper off-screen pool"

patterns-established:
  - "WaveConfig pattern: waveNumber, rows, cols, multipliers, allowedTypes[], shopAfterThisWave"
  - "FormationLayout interface: rows/cols/colSpacing/rowSpacing + getPosition(row, col, fx, fy) => {x,y}"
  - "TDD for pure data modules: test completeness/values/edge-cases without mocking anything"

requirements-completed: [ENEMY-01, ENEMY-07, ENEMY-08, ENEMY-09, INRUN-01, INRUN-03]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 3 Plan 01: Data Layer Foundation Summary

**Six enemy archetype definitions, data-driven 10-wave config with infinite scaling, and SI$ in-run currency on RunState — all contracts Phase 3 plans build on**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-03T00:28:38Z
- **Completed:** 2026-03-03T00:32:04Z
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- Extended EnemyType to all 6 archetypes (grunt/shielder/flanker/sniper/charger/swooper) with full ENEMY_DEFS stats and new sidDropAmount/shieldHp fields
- Created waveConfig.ts with WaveConfig interface, 10-entry WAVE_CONFIGS array, and getWaveConfig() that scales infinitely beyond wave 10
- Defined FormationLayout pluggable interface (Plan 03-02 will provide GridFormationLayout implementation)
- Added RunState.inRunCurrency with addCurrency()/resetCurrency(), reset() zeroes it (INRUN-03)
- Updated constants (ENEMY_POOL_SIZE 256->512, MAX_LIVES_CAP, SHOP_TRIGGER_INTERVAL, SID_SYMBOL) and broadened EnemyEntity.type from literal 'grunt' to EnemyType

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend EnemyType, EnemyDef, and add all six ENEMY_DEFS entries** - `698af9e` (feat)
2. **Task 2: Create WaveConfig data structure and wave definitions file** - `f4a5722` (feat)
3. **Task 3: Add SI$ currency to RunState and update constants** - `b68c15f` (feat)

_Note: All tasks used TDD pattern (failing test first, then implementation)_

## Files Created/Modified
- `src/config/enemies.ts` - Extended EnemyType union, EnemyDef interface, and ENEMY_DEFS for all 6 archetypes
- `src/config/enemies.test.ts` - TDD tests: completeness, shieldHp optionality, per-type stat values
- `src/config/waveConfig.ts` - WaveConfig interface, FormationLayout interface, WAVE_CONFIGS[10], getWaveConfig(n)
- `src/config/waveConfig.test.ts` - TDD tests: structure, known waves, beyond-10 scaling, FormationLayout duck typing
- `src/state/RunState.ts` - Added inRunCurrency getter, addCurrency(), resetCurrency(), reset() zeroing
- `src/state/RunState.test.ts` - TDD tests: accumulation, floor rounding, reset zeroing, snapshot inclusion
- `src/utils/constants.ts` - ENEMY_POOL_SIZE 256->512, add MAX_LIVES_CAP/SHOP_TRIGGER_INTERVAL/SID_SYMBOL
- `src/utils/types.ts` - EnemyEntity.type: EnemyType (not 'grunt'), RunStateData adds inRunCurrency field

## Decisions Made
- EnemyDef.shieldHp is optional (?) — only Shielder defines it; the TypeScript type system communicates the archetype-specific nature without runtime overhead
- getWaveConfig beyond wave 10 uses +5%/+4%/+3% scaling for speed/fireRate/HP, shop on every 5th wave (same interval as waves 5 and 10)
- EnemyEntity.type broadened to EnemyType in this plan rather than Plan 03-02 — types.ts is the canonical source of truth; having it as literal 'grunt' while ENEMY_DEFS defines 6 types would be an inconsistent intermediate state

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Minor: TypeScript flagged unused `WaveConfig` type import in test file (`TS6133`). Fixed by removing the type-only import (the interface was duck-typed via conforming object literal, so the named import wasn't needed).

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All data contracts established. Plans 03-02 through 03-08 can proceed.
- 03-02 (Enemy.ts archetypes) unblocked — EnemyType, EnemyDef, FormationLayout interface all ready
- 03-03 (PowerUpManager) unblocked — dropChance, sidDropAmount on ENEMY_DEFS
- 03-05 (SpawnSystem) unblocked — getWaveConfig() returns WaveConfig with allowedTypes and formation dims

## Self-Check: PASSED

- src/config/enemies.ts: FOUND
- src/config/waveConfig.ts: FOUND
- src/state/RunState.ts: FOUND
- src/utils/constants.ts: FOUND
- src/utils/types.ts: FOUND
- .planning/phases/03-enemy-depth-wave-systems-power-ups/03-01-SUMMARY.md: FOUND
- Commit 698af9e (Task 1): FOUND
- Commit f4a5722 (Task 2): FOUND
- Commit b68c15f (Task 3): FOUND

---
*Phase: 03-enemy-depth-wave-systems-power-ups*
*Completed: 2026-03-03*
