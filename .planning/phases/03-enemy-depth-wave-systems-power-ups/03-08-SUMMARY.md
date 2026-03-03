---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "08"
subsystem: integration
tags: [wiring, game-loop, shop, power-ups, hud, phase3-final]
dependency_graph:
  requires: [03-04, 03-06, 03-07]
  provides: [fully-integrated-phase3, complete-run-loop]
  affects: [Game.ts, PlayingState.ts, GameOverState.ts, PowerUpManager.ts]
tech_stack:
  added: []
  patterns:
    - PlayingStateContext interface extended with ShopSystem + ShopUI (non-null)
    - Shop guard at top of update() — shopUI.isVisible pauses entire game loop
    - wasTransitioning/isTransitioning delta to detect wave-end for releaseAll()
    - shopPending flag drives shop open from SpawnSystem signal
    - consumePickupName() one-shot per fixed step drives PickupFeedback
    - grantShieldCharge() callback injection avoids circular ShopSystem<->PowerUpManager import
key_files:
  created: []
  modified:
    - src/core/Game.ts
    - src/states/PlayingState.ts
    - src/states/GameOverState.ts
    - src/systems/PowerUpManager.ts
decisions:
  - powerUpManager changed from PowerUpManager|null to non-null in PlayingStateContext — Game.ts always constructs it
  - wasTransitioning+isTransitioning delta in PlayingState tracks wave-end without SpawnSystem API change
  - shopPending check placed after transition delta so releaseAll() fires before shop opens on same wave-clear event
  - grantShieldCharge() added to PowerUpManager with cap of 3 (consistent with shieldCharges max)
  - WeaponSystem.setPowerUpManager() not needed — WeaponSystem receives powerUpManager as optional param in update()
metrics:
  duration: 3 min
  completed_date: "2026-03-03"
  tasks_completed: 3
  files_modified: 4
---

# Phase 3 Plan 08: Phase 3 Final Wiring Summary

**One-liner:** Final integration connecting PowerUpManager, ShopSystem, ShopUI, and PickupFeedback to Game.ts init and PlayingState update loop, completing the full Phase 3 run loop.

## What Was Built

Phase 3 was fully wired in this plan. All systems built across plans 03-01 through 03-07 are now connected to the game loop.

### Task 1: Wire Phase 3 systems in Game.ts (commit ab724b1)

- Added `ShopSystem` and `ShopUI` imports and construction in `Game.init()`
- Wired `shopSystem._onShieldChargePurchased` callback to `powerUpManager.grantShieldCharge()`
- Added `shopSystem` and `shopUI` to `PlayingStateContext`
- Added `grantShieldCharge(): void` to `PowerUpManager` (capped at 3 charges)

### Task 2: Integrate Phase 3 systems into PlayingState update loop (commit d303337)

- Extended `PlayingStateContext` interface: added `ShopSystem`, `ShopUI` fields; removed `| null` from `PowerUpManager`
- Added shop guard at top of `update()` — `shopUI.isVisible` pauses all gameplay including AI and collision
- Added `wasTransitioning`/`isTransitioning` delta tracking to detect wave-end: calls `powerUpManager.releaseAll()` when transition completes
- Added shop trigger block: when `spawnSystem.shopPending`, clears flag, generates choices, calls `shopUI.show()` with purchase callback
- Removed null guard from `powerUpManager.update()` — always non-null
- Added `collisionSystem.consumePickupName()` -> `pickupFeedback.showPickup()` each fixed step
- Added `hud.syncPowerUp()` call after `hud.sync()` each fixed step
- Added `lastWasTransitioning: boolean = false` private field, reset in `enter()`

### Task 3: Reset in-run state on run restart (commit 3c3633c)

- Added `ctx.shopSystem.reset()` to `GameOverState.restartGame()` — clears purchase history and stat multipliers
- Added `ctx.powerUpManager.releaseAll()` to `GameOverState.restartGame()` — clears active tokens and power-up state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing method] Added grantShieldCharge() to PowerUpManager**
- **Found during:** Task 1
- **Issue:** Plan called `powerUpManager.grantShieldCharge()` in the shield charge callback but the method did not exist in PowerUpManager from Plan 03-03
- **Fix:** Added `public grantShieldCharge(): void { this.shieldCharges = Math.min(3, this.shieldCharges + 1); }` to PowerUpManager
- **Files modified:** `src/systems/PowerUpManager.ts`
- **Commit:** ab724b1

**2. [Rule 1 - No-op] WeaponSystem.setPowerUpManager() skipped**
- **Found during:** Task 1
- **Issue:** Plan said "Wire power-up manager into weapon system (if WeaponSystem.setPowerUpManager exists from Plan 03-06)" — it does not exist; WeaponSystem receives powerUpManager as an optional param in `update()`
- **Fix:** Skipped — WeaponSystem already receives powerUpManager correctly via PlayingState calling `ctx.weaponSystem.update(..., ctx.powerUpManager)`
- **Impact:** Zero — the wiring was already in place from Plan 03-06

## Verification

- `npx tsc --noEmit` — zero errors
- `npm run build` — builds successfully (609 kB bundle, pre-existing size warning from Three.js)

## Must-Haves Verified

- [x] PowerUpManager constructed in Game.ts and injected into PlayingStateContext
- [x] ShopSystem and ShopUI constructed in Game.ts and injected into PlayingStateContext
- [x] CollisionSystem has PowerUpManager injected via setPowerUpManager() (from prior plan, confirmed present)
- [x] WeaponSystem receives PowerUpManager via update() optional param
- [x] PlayingState pauses game loop (skips AI + collision) while ShopUI is visible
- [x] ShopUI is shown when spawnSystem.shopPending is true; shop selection applies purchase or skips
- [x] PickupFeedback.showPickup() is called when CollisionSystem.consumePickupName() returns non-null
- [x] HUD.syncPowerUp() is called each fixed step with current PowerUpManager state
- [x] runState.reset() is called on run restart (via GameOverState.restartGame())
- [x] PowerUpManager.releaseAll() and ShopSystem.reset() are called on run restart

## Self-Check: PASSED
