---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "05"
subsystem: SpawnSystem / AISystem
tags: [spawn, wave-config, data-driven, shop-trigger, fire-rate]
dependency_graph:
  requires: ["03-01 (waveConfig.ts, getWaveConfig)", "03-02 (EnemyFormation.spawnWave(config))"]
  provides: ["SpawnSystem data-driven wave spawning", "SpawnSystem.shopPending flag", "AISystem.setFireRateMultiplier"]
  affects: ["03-06 (CollisionSystem wiring)", "03-07 (ShopSystem triggered by shopPending)", "03-08 (Game.ts integration)"]
tech_stack:
  added: []
  patterns: ["data-driven config consumption", "flag-based inter-system signalling"]
key_files:
  created: []
  modified:
    - src/systems/AISystem.ts
    - src/systems/SpawnSystem.ts
    - src/states/PlayingState.ts
decisions:
  - "BASE_FIRE_INTERVAL module constant extracted from ENEMY_FIRE_RATE; reset() restores to BASE not 1.0"
  - "shopPending captured from currentConfig BEFORE runState.nextWave() — shopAfterThisWave belongs to wave just cleared"
  - "aiSystem.reset() called before setFireRateMultiplier() in startNextWave() to clear accumulator; multiplier re-applied after"
  - "fireRateMultiplier not stored as field in AISystem — fireInterval is the derived state that matters"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-03"
  tasks_completed: 3
  files_modified: 3
---

# Phase 3 Plan 5: SpawnSystem Data-Driven Wave Config Summary

**One-liner:** SpawnSystem reads WaveConfig per wave, passes formation config to EnemyFormation.spawnWave(), applies fire rate escalation to AISystem, and signals shop availability via a readable shopPending flag.

## What Was Built

SpawnSystem was refactored from hardcoded wave logic to a data-driven system that reads `WaveConfig` via `getWaveConfig(wave)` at each wave transition. Three targeted changes across two systems and one call site:

1. **AISystem.setFireRateMultiplier(multiplier)** — adjusts `fireInterval = BASE_FIRE_INTERVAL / multiplier` so higher multipliers produce faster enemy fire. `reset()` restores interval to `BASE_FIRE_INTERVAL`.

2. **SpawnSystem (full refactor)** — now reads `getWaveConfig(runState.wave)` in two places:
   - In `update()`: captures `currentConfig` before `nextWave()` to check `shopAfterThisWave` (the flag belongs to the wave just cleared, not the next one)
   - In `startNextWave()`: fetches config for the new wave and passes it to `formation.spawnWave(config)` so formation dimensions and archetype distribution are wave-driven
   - `shopPending` getter + `clearShopPending()` method expose the shop signal to PlayingState
   - `reset()` now clears `_shopPending` flag

3. **PlayingState.ts** — `spawnSystem.update()` call updated to pass `ctx.aiSystem` as 7th argument. Commented stub added for the Phase 03-07 shop wiring.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused fireRateMultiplier field from AISystem**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** TypeScript `noUnusedLocals: true` rejected a `private fireRateMultiplier` field that was written but never read — the plan's pseudocode included it but the derived `fireInterval` is the actual stateful value
- **Fix:** Removed the redundant field; `setFireRateMultiplier()` directly sets `this.fireInterval`
- **Files modified:** `src/systems/AISystem.ts`
- **Commit:** 8da0c5c

## Self-Check: PASSED

- FOUND: src/systems/AISystem.ts
- FOUND: src/systems/SpawnSystem.ts
- FOUND: src/states/PlayingState.ts
- FOUND: commit 8da0c5c (AISystem setter)
- FOUND: commit c42fef5 (SpawnSystem refactor)
- FOUND: commit f761ec6 (PlayingState call site)
