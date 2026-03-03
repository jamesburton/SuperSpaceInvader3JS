---
phase: 04-boss-encounter-meta-progression
plan: "01"
subsystem: currency-system
tags: [currency, meta-progression, runstate, zustand, persistence]
dependency_graph:
  requires: [03-08]
  provides: [04-02, 04-03, 04-04]
  affects: [src/state/RunState.ts, src/state/MetaState.ts, src/utils/types.ts, src/utils/constants.ts, src/ui/HUD.ts, src/systems/ShopSystem.ts, src/ui/ShopUI.ts]
tech_stack:
  added: []
  patterns:
    - Dual currency: Gold (in-run, volatile) vs SI$ (meta, persistent via Zustand persist)
    - Migration hook: Zustand persist version/migrate for schema upgrades
    - goldEarnedThisRun: separate tracker for earned vs current balance (deductions don't affect earned total)
key_files:
  created: []
  modified:
    - src/utils/types.ts
    - src/utils/constants.ts
    - src/state/RunState.ts
    - src/state/RunState.test.ts
    - src/state/MetaState.ts
    - src/ui/HUD.ts
    - src/systems/ShopSystem.ts
    - src/ui/ShopUI.ts
    - src/systems/CollisionSystem.ts
    - src/states/PlayingState.ts
    - src/states/GameOverState.ts
decisions:
  - "[04-01] Dual currency: Gold for in-run shop (volatile), SI$ for meta shop (persistent Zustand)"
  - "[04-01] goldEarnedThisRun tracks cumulative earned gold (not current balance) — negative addGold calls don't decrement earned total"
  - "[04-01] SID_SYMBOL removed; replaced by GOLD_SYMBOL='Gold' and META_CURRENCY_SYMBOL='SI$'"
  - "[04-01] META_STORAGE_KEY changed from ssix_v1 to ssi-meta-v1 — migration hook handles old schema"
  - "[04-01] purchaseUpgrade() is idempotent — re-purchasing same id does not double-add to purchasedUpgrades array"
metrics:
  duration_seconds: 139
  completed_date: "2026-03-03"
  tasks_completed: 3
  files_modified: 11
requirements_satisfied: [META-01, META-05, META-07]
---

# Phase 4 Plan 01: Dual Currency System Summary

**One-liner:** Two-currency system — Gold (in-run, resets each run) replaces SI$ for between-wave shop; SI$ (persistent Zustand) accumulates across runs for meta shop with versioned localStorage schema.

## What Was Built

Redesigned the currency system from Phase 3's single SI$ in-run currency to a proper two-currency model:

1. **Gold (in-run):** `RunStateData.gold` replaces `inRunCurrency` everywhere. `addGold()`/`resetGold()` replace `addCurrency()`/`resetCurrency()`. New `goldEarnedThisRun` tracking field monitors cumulative earnings (not current balance) per run.

2. **SI$ (meta):** `MetaStore` extended with `purchasedUpgrades: string[]`, `purchaseUpgrade(id, cost): boolean` (idempotent, deducts SI$), `resetMetaCurrency()`. Zustand persist updated to `version: 1` with `migrate()` hook for v0→v1 schema migration.

3. **Constants:** `META_STORAGE_KEY` updated to `'ssi-meta-v1'`. `SID_SYMBOL` replaced by `GOLD_SYMBOL = 'Gold'` and `META_CURRENCY_SYMBOL = 'SI$'`.

4. **UI updates:** HUD shows "Gold: N" (gold color `#ffd700`). ShopUI shows "N Gold" pricing. ShopSystem deducts from `runState.gold`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rename inRunCurrency to gold in types, RunState, constants | 4ad2fb5 | types.ts, constants.ts, RunState.ts, RunState.test.ts, HUD.ts, ShopSystem.ts, ShopUI.ts, CollisionSystem.ts, PlayingState.ts, GameOverState.ts |
| 2 | Extend MetaStore with purchasedUpgrades, purchaseUpgrade, migration hook | 83dd92c | MetaState.ts |
| 3 | Update HUD, ShopSystem, ShopUI (Gold terminology) | 4ad2fb5 | Applied inline with Task 1 (required for TS compilation) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] HUD/ShopUI/ShopSystem updated in Task 1 instead of Task 3**
- **Found during:** Task 1 verification
- **Issue:** `HUD.sync()` referenced `state.inRunCurrency` which would cause a TypeScript error after renaming the field in types.ts. Similarly ShopSystem referenced `runState.inRunCurrency` and `runState.addCurrency()`. All three files had to be updated together for `npx tsc --noEmit` to pass Task 1's verification gate.
- **Fix:** Applied all Gold terminology changes (HUD, ShopUI, ShopSystem) during Task 1. Task 3 verification confirmed the changes were already correct.
- **Files modified:** src/ui/HUD.ts, src/ui/ShopUI.ts, src/systems/ShopSystem.ts
- **Commit:** 4ad2fb5

**2. [Rule 2 - Missing functionality] Added goldEarnedThisRun tracker**
- **Found during:** Task 1 implementation
- **Issue:** The plan specified adding `goldEarnedThisRun` to RunState but did not explicitly list it as a RunStateData field. Implemented as a module-level variable (not in the snapshot) to avoid polluting the RunStateData interface with a derived stat.
- **Fix:** `_goldEarnedThisRun` module-level variable, exposed via `runState.goldEarnedThisRun` getter, resets in `reset()`. Negative `addGold()` calls (shop purchases) do not decrement it.
- **Files modified:** src/state/RunState.ts

**3. [Rule 1 - Bug] RunState test file updated to match new API**
- **Found during:** Task 1
- **Issue:** Existing RunState.test.ts used `inRunCurrency`, `addCurrency`, `resetCurrency` — would fail with new API.
- **Fix:** Rewrote test file with new method names, added tests for `goldEarnedThisRun` behavior.
- **Files modified:** src/state/RunState.test.ts
- **Commit:** 4ad2fb5

## Verification Results

- `npx tsc --noEmit` — zero errors
- `npm run build` — successful (2.17s)
- `grep -r "inRunCurrency" src/` — zero results
- `grep -r "ssix_v1" src/` — zero results
- `grep "purchasedUpgrades" src/state/MetaState.ts` — present (lines 11, 30, 47, 48, 49, 66)
- `grep "purchaseUpgrade" src/state/MetaState.ts` — present (lines 19, 42)

## Self-Check: PASSED

All files verified present and commits confirmed:
- 4ad2fb5 exists in git log
- 83dd92c exists in git log
- src/state/MetaState.ts has purchasedUpgrades and purchaseUpgrade
- src/utils/constants.ts has META_STORAGE_KEY = 'ssi-meta-v1'
- src/state/RunState.ts has gold field and addGold method
