---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "03"
subsystem: power-ups
tags: [three.js, object-pool, entity, power-up, pickup-token]

# Dependency graph
requires:
  - phase: 03-01
    provides: ObjectPool contract, RunState, EnemyType, constants (WORLD_HEIGHT)

provides:
  - PowerUpType union type ('spreadShot' | 'rapidFire' | 'shield')
  - PowerUpDef interface and POWER_UP_DEFS config map (durations 5/10/15s, emissive colors)
  - POWER_UP_TYPES readonly array for uniform random selection
  - PickupToken poolable entity (Object.defineProperty visible/active sync, 14-unit diamond, 40-unit/s drift)
  - PowerUpManager (pool of 16, trySpawnDrop, collectPickup, isActive, consumeShieldCharge, update, releaseAll, getActiveTokens, registerBloom)

affects:
  - 03-06 (CollisionSystem and WeaponSystem wiring)
  - 03-07 (PickupFeedback display name from collectPickup)
  - 03-08 (PlayingState integration)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PickupToken uses identical Object.defineProperty visible/active sync pattern as Bullet.ts
    - PowerUpManager follows ParticleManager pool-owner pattern (single owner, getActive* for external iteration)
    - Shield treated as absorb charge (not duration) — isActive('shield') checks shieldCharges > 0

key-files:
  created:
    - src/config/powerups.ts
    - src/entities/PickupToken.ts
    - src/systems/PowerUpManager.ts
  modified: []

key-decisions:
  - "PickupToken.visible uses Object.defineProperty to sync mesh.visible and active flag — identical to Bullet.ts ObjectPool contract"
  - "Shield power-up modelled as absorb charge (shieldCharges=1) not a duration — consumeShieldCharge() returns bool for CollisionSystem"
  - "trySpawnDrop() takes dropChance float — caller (CollisionSystem) owns the enemy-specific drop probability, not PowerUpManager"
  - "getActiveTokens() returns readonly array — prevents CollisionSystem from mutating the pool-internal list directly"
  - "PICKUP_POOL_SIZE=16 — enemy kills are infrequent, 16 tokens is generous headroom"

patterns-established:
  - "PowerUpManager.registerBloom(fn) pre-registers all pool meshes at init time — zero per-frame bloom overhead"
  - "collectPickup() releases token to pool immediately and removes from activeTokens — single call for collect + cleanup"

requirements-completed: [PWR-01, PWR-02, PWR-03, PWR-04]

# Metrics
duration: 27min
completed: 2026-03-03
---

# Phase 3 Plan 03: Power-Up Entity and Management System Summary

**PickupToken (poolable floating diamond collectible) and PowerUpManager (pool of 16, drop spawner, timed active state) with three power-up types: Spread Shot (5s, blue), Rapid Fire (10s, orange), Shield (one-absorb, green)**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-03T00:34:51Z
- **Completed:** 2026-03-03T01:01:47Z
- **Tasks:** 3
- **Files modified:** 3 (all created)

## Accomplishments

- Created `src/config/powerups.ts` with PowerUpType union, PowerUpDef interface, POWER_UP_DEFS map (durations 5/10/15s, emissive hex colors), and POWER_UP_TYPES array for uniform random selection
- Created `src/entities/PickupToken.ts` as a poolable entity following the exact Bullet.ts Object.defineProperty pattern; diamond appearance via 45-degree rotation, 40 units/s downward drift, AABB half-extents of 7
- Created `src/systems/PowerUpManager.ts` owning a 16-token pool, implementing trySpawnDrop (enemy-kill callback), collectPickup (returns display name), isActive (queried each step by WeaponSystem/CollisionSystem), consumeShieldCharge, update, releaseAll, getActiveTokens (readonly for CollisionSystem iteration), and registerBloom

## Task Commits

1. **Task 1: Create powerups config** - `ad52de8` (feat)
2. **Task 2: Create PickupToken poolable entity** - `0efa183` (feat)
3. **Task 3: Create PowerUpManager** - `12968d0` (feat)

## Files Created/Modified

- `src/config/powerups.ts` - PowerUpType, PowerUpDef, POWER_UP_DEFS, POWER_UP_TYPES; sole source of truth for power-up durations and colors
- `src/entities/PickupToken.ts` - Poolable collectible entity; visible/active sync via Object.defineProperty; init() sets color from POWER_UP_DEFS; update() drifts and returns alive bool
- `src/systems/PowerUpManager.ts` - Pool owner and active state tracker; CollisionSystem and WeaponSystem contract surface ready for Plan 03-06 wiring

## Decisions Made

- Shield modelled as absorb charge (`shieldCharges=1`) rather than a duration timer — this simplifies CollisionSystem: call `consumeShieldCharge()` on hit, check `isActive('shield')` for HUD
- `trySpawnDrop(x, y, dropChance)` receives the drop probability from the caller (CollisionSystem knows the enemy type's `sidDropAmount`), keeping PowerUpManager generic
- `getActiveTokens()` returns `readonly PickupToken[]` to prevent external mutation of the pool-internal list
- Token pool size fixed at 16 — enemy kills at a rate of ~1/s, tokens live ~7.5s on screen, so peak simultaneous tokens is well under 16

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PowerUpManager contract is fully stable: `trySpawnDrop`, `collectPickup`, `isActive`, `consumeShieldCharge`, `update`, `releaseAll`, `getActiveTokens` are all wired and ready for Plan 03-06 (CollisionSystem + WeaponSystem integration)
- PickupFeedback hook point established: `collectPickup()` returns display name string, Plan 03-07 passes it to `PickupFeedback.showPickup()`
- Plan 03-04 (AISystem) can proceed in parallel — no dependency on this plan

---
*Phase: 03-enemy-depth-wave-systems-power-ups*
*Completed: 2026-03-03*
