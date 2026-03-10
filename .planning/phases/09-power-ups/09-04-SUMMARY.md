---
phase: 09-power-ups
plan: "04"
subsystem: powerup-shop-and-pickups
tags: [powerups, shop, pickups, ui, readability]
dependency_graph:
  requires: [09-02, 09-03]
  provides: [shop-powerups, pickup-identities]
  affects: [ShopSystem, Game, PickupToken, ShopUI]
tech_stack:
  added: []
  patterns:
    - Shop callback injection for timed power-up activation
    - Pickup silhouette differentiation through pooled mesh transforms
    - Lightweight item metadata enrichment in ShopUI
key_files:
  created: []
  modified:
    - src/systems/ShopSystem.ts
    - src/core/Game.ts
    - src/entities/PickupToken.ts
    - src/ui/ShopUI.ts
decisions:
  - "Timed power-up purchases use a callback injected from Game to avoid a direct ShopSystem/PowerUpManager dependency"
  - "Pickup differentiation is handled through scale/rotation variants so pooled tokens stay simple and cheap"
  - "Shop rows keep the existing layout but now show category/tier metadata to stay readable as the catalog grows"
metrics:
  duration: "~10 min"
  completed: "2026-03-10"
  tasks: 2
  files: 4
---

# Phase 9 Plan 04: Shop + Pickup Presentation Summary

**One-liner:** Added piercing shot, homing missile, and time slow to the between-wave shop and gave each new pickup token a distinct silhouette for faster recognition in motion.

## What Was Built

1. Shop wiring
   - Added three new shop items for piercing shot, homing missile, and time slow
   - Wired timed purchases through a Game-level callback so buying one immediately activates the matching power-up duration via `PowerUpManager`

2. Pickup identity and shop readability
   - Updated `PickupToken` to reset scale/rotation on reuse and apply distinct silhouettes for the three new Phase 9 pickups
   - Added category/tier labels in `ShopUI` so the expanded item list remains easier to parse without redesigning the shop

## Verification

- `npx vitest run src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts src/entities/PickupToken.test.ts`
- `npx tsc --noEmit`

## Deviations from Plan

None.

## Self-Check: PASSED

Commits:
- `073579f` - feat(phase-09): add homing, time slow, and shop power-ups
