---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "07"
subsystem: shop-system-ui-hud
tags: [shop, upgrade, HUD, SI$, power-up-bar, in-run-currency]
dependency_graph:
  requires: [03-01, 03-05]
  provides: [ShopSystem, ShopUI, HUD.syncPowerUp, runState.addLife, Player.setFireCooldownMultiplier, Player.setSpeedMultiplier]
  affects: [03-08]
tech_stack:
  added: []
  patterns:
    - DOM modal overlay (no Three.js) for shop UI, consistent with HUD approach
    - Callback injection pattern (_onShieldChargePurchased) to avoid circular imports
    - Fisher-Yates shuffle for random shop choice selection
key_files:
  created:
    - src/systems/ShopSystem.ts
    - src/ui/ShopUI.ts
  modified:
    - src/state/RunState.ts
    - src/entities/Player.ts
    - src/ui/HUD.ts
decisions:
  - ShopSystem holds all stat multipliers (fireRate, spread, bulletSpeed, moveSpeed) as public fields — PlayingState reads them directly in 03-08 rather than through method calls, keeping the wiring simple
  - _onShieldChargePurchased callback injected by PlayingState to avoid ShopSystem importing PowerUpManager (circular dep: ShopSystem -> PowerUpManager -> nothing, but cleaner to keep systems decoupled)
  - HUD.syncPowerUp() takes explicit (type, remaining, full, shieldCharges) params rather than a PowerUpManager ref — keeps HUD decoupled from PowerUpManager class
metrics:
  duration: 2 min
  completed: "2026-03-03"
  tasks_completed: 3
  files_changed: 5
---

# Phase 3 Plan 7: Between-Wave Shop System Summary

Between-wave upgrade shop with SI$ economy, DOM modal UI, and HUD extensions for balance display and power-up countdown.

## What Was Built

**ShopSystem** (`src/systems/ShopSystem.ts`): 6-item upgrade pool with `generateChoices()` (random 3 non-maxed items) and `purchaseItem()` (deduct SI$, apply effect, track purchase count). Holds run-persistent stat multipliers: `fireRateMultiplier`, `spreadCount`, `bulletSpeedMultiplier`, `moveSpeedMultiplier`. `reset()` clears all state at run end (INRUN-04).

**ShopUI** (`src/ui/ShopUI.ts`): DOM overlay modal. `show(choices, sidBalance, onSelect)` renders 3 neon cyan upgrade cards with SI$ prices and keyboard hints (1/2/3 to buy, ESC to skip). `hide()` removes keyboard listener. `isVisible` getter used by PlayingState to gate gameplay during shop (03-08).

**RunState.addLife()** (`src/state/RunState.ts`): `lives = Math.min(MAX_LIVES_CAP, lives + 1)` — caps at 9. Called by ShopSystem on `extraLife` purchase.

**Player multiplier methods** (`src/entities/Player.ts`):
- `setFireCooldownMultiplier(m)`: scales `FIRE_COOLDOWN` in `recordFire()` so fire rate upgrade shortens cooldown
- `setSpeedMultiplier(m)`: scales `PLAYER_SPEED` in `update()` so move speed upgrade applies immediately

**HUD extensions** (`src/ui/HUD.ts`):
- SI$ counter element (yellow, top-left below score) — updated in `sync()` from `state.inRunCurrency`
- Power-up timer bar (centered, top-mid) — `syncPowerUp(type, remaining, full, shieldCharges)` shows SHIELD label with full bar or proportional countdown bar colored per power-up def

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add runState.addLife() and create ShopSystem | e813306 | RunState.ts, Player.ts, ShopSystem.ts |
| 2 | Create ShopUI DOM modal | 42f9492 | ShopUI.ts |
| 3 | Extend HUD with SI$ counter and power-up timer bar | 9de6b4b | HUD.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files created/modified:
- src/systems/ShopSystem.ts — FOUND
- src/ui/ShopUI.ts — FOUND
- src/state/RunState.ts — modified (addLife added)
- src/entities/Player.ts — modified (multiplier methods added)
- src/ui/HUD.ts — modified (SI$ element + syncPowerUp)

Commits verified:
- e813306 — FOUND
- 42f9492 — FOUND
- 9de6b4b — FOUND

Build: `npm run build` — SUCCESS (zero TypeScript errors, Vite bundle complete)
