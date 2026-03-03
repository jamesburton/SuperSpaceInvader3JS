---
phase: 04-boss-encounter-meta-progression
plan: "05"
subsystem: meta-progression
tags: [meta, currency, si-dollar, run-end, power-up, passive-bonuses]
dependency_graph:
  requires: [04-01, 04-03, 04-04]
  provides: [meta-loop-complete, si-earn-on-wave-clear, run-end-si-display, meta-bonuses-at-run-start]
  affects: [PlayingState, RunState, SpawnSystem, GameOverState, PowerUpManager]
tech_stack:
  added: []
  patterns:
    - "recordWaveSI() side-effect on wave clear — increments siEarnedThisRun each wave"
    - "Award SI$ to MetaStore before GameOverState constructed — so constructor captures correct total"
    - "applyMetaBonuses() in enter() — reads MetaStore.purchasedUpgrades and applies player buffs"
    - "PowerUpManager.activate(type, duration) — direct activation without PickupToken for meta loadouts"
    - "Compound multiplier for tiered passives: Math.pow(1.10, tiers) for fire rate, Math.pow(1.08, tiers) for speed"
key_files:
  created: []
  modified:
    - src/utils/types.ts
    - src/state/RunState.ts
    - src/systems/SpawnSystem.ts
    - src/systems/PowerUpManager.ts
    - src/states/PlayingState.ts
    - src/states/GameOverState.ts
decisions:
  - "SI$ awarded before GameOverState constructed — constructor reads MetaStore after addMetaCurrency() for accurate totalSI display"
  - "triggerVictory() combines waveSI + bossReward into totalSIEarned and calls addMetaCurrency once — avoids double-counting"
  - "applyMetaBonuses() resets player multipliers on every enter() call; if no upgrades purchased, tiers=0 so no multiplier applied"
  - "PowerUpManager.activate() uses same activePowerUp/activeDuration fields as collectPickup() — WeaponSystem.isActive() works unchanged"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 6
---

# Phase 4 Plan 05: Meta Progression Loop — Summary

**One-liner:** SI$ earn rate (1 per wave), run-end award + display, and meta passive bonuses applied at run start to close the full meta progression loop.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add SI$ earn tracking to RunState and SpawnSystem wave-clear hook | abce51b | types.ts, RunState.ts, SpawnSystem.ts |
| 2 | Award SI$ on run end and apply meta bonuses at run start | 9aa0620 | PowerUpManager.ts, PlayingState.ts, GameOverState.ts |

## What Was Built

### Task 1: SI$ Earn Tracking

- **`src/utils/types.ts`**: Added `siEarnedThisRun: number` field to `RunStateData` interface
- **`src/state/RunState.ts`**: Added `siEarnedThisRun` field to `_state`, getter, `recordWaveSI()` method (increments +1 per call), and zeroes field in `reset()`
- **`src/systems/SpawnSystem.ts`**: Calls `runState.recordWaveSI()` when `formation.activeCount === 0` (before `runState.nextWave()`) — each cleared wave earns 1 SI$

### Task 2: Run-End Award + Meta Bonuses

- **`src/systems/PowerUpManager.ts`**: Added `activate(type: PowerUpType, duration: number): void` — directly sets `activePowerUp` and `activeDuration`, skips shield type (which uses charge model). Enables meta loadout power-ups without requiring a PickupToken.

- **`src/states/PlayingState.ts`**:
  - `triggerGameOver()`: Awards `runState.siEarnedThisRun` to `MetaStore.addMetaCurrency()` before constructing GameOverState — so the constructor captures the correct total
  - `triggerVictory()`: Combines wave SI$ (`runState.siEarnedThisRun`) + boss reward (`BOSS_DEF.metaCurrencyReward`) into `totalSIEarned`, awards once, updates victory overlay to show breakdown `(N waves + M boss)`
  - `enter()`: Calls `applyMetaBonuses()` on each run start
  - `applyMetaBonuses()` (new private method): Reads `MetaStore.purchasedUpgrades`, applies:
    - Fire rate: `Math.pow(1.10, tiers)` multiplier → `setFireCooldownMultiplier(1 / multiplier)`
    - Move speed: `Math.pow(1.08, tiers)` multiplier → `setSpeedMultiplier(multiplier)`
    - Starting life: `runState.addLife()` if `'passive_startingLife'` purchased
    - Loadout spread: `powerUpManager.activate('spreadShot', 30)`
    - Loadout rapid: `powerUpManager.activate('rapidFire', 30)`

- **`src/states/GameOverState.ts`**:
  - Added `import { useMetaStore }` from MetaState
  - Added `siEarned: number` and `totalSI: number` private fields
  - Constructor captures `runState.siEarnedThisRun` and `useMetaStore.getState().metaCurrency` (read after award)
  - `enter()` overlay now shows: `SI$ EARNED: N | TOTAL: M` in gold (#ffd700)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All checks passed:
- `npx tsc --noEmit` — zero errors
- `npm run build` — succeeds (1.78s)
- `grep "siEarnedThisRun" src/state/RunState.ts` — present (4 occurrences)
- `grep "recordWaveSI" src/systems/SpawnSystem.ts` — present
- `grep "applyMetaBonuses" src/states/PlayingState.ts` — present
- `grep "siEarned" src/states/GameOverState.ts` — present

## Self-Check: PASSED

Files exist:
- src/utils/types.ts — FOUND (siEarnedThisRun in RunStateData)
- src/state/RunState.ts — FOUND (siEarnedThisRun field + recordWaveSI())
- src/systems/SpawnSystem.ts — FOUND (recordWaveSI() call on wave clear)
- src/systems/PowerUpManager.ts — FOUND (activate() method)
- src/states/PlayingState.ts — FOUND (applyMetaBonuses() + triggerGameOver SI$ award)
- src/states/GameOverState.ts — FOUND (siEarned + totalSI display)

Commits exist:
- abce51b — FOUND (Task 1)
- 9aa0620 — FOUND (Task 2)
