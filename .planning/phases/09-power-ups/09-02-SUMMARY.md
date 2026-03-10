---
phase: 09-power-ups
plan: "02"
subsystem: homing-missiles
tags: [powerups, missiles, targeting, reticle, combat]
dependency_graph:
  requires: [09-01]
  provides: [homing-missiles, homing-manager, lock-reticle]
  affects: [WeaponSystem, PlayingState, Game, EnemyFormation]
tech_stack:
  added: []
  patterns:
    - Dedicated pooled missile entity and manager
    - Nearest-target lock at fire time with capped turn rate
    - Reticle pool tied to active missiles
key_files:
  created:
    - src/entities/HomingMissile.ts
    - src/systems/HomingMissileManager.ts
  modified:
    - src/systems/WeaponSystem.ts
    - src/states/PlayingState.ts
    - src/core/Game.ts
decisions:
  - "Homing missiles use a dedicated projectile path instead of adding more flags to Bullet"
  - "Missiles lock the nearest active formation enemy when fired and steer with a conservative 120 deg/sec turn cap"
  - "Each missile owns a pooled reticle that clears automatically on expiry or target loss"
metrics:
  duration: "~25 min"
  completed: "2026-03-10"
  tasks: 2
  files: 5
---

# Phase 9 Plan 02: Homing Missiles Summary

**One-liner:** Added a dedicated homing missile subsystem with finite lifetime, limited steering, and a subtle lock reticle that follows the locked target.

## What Was Built

1. `src/entities/HomingMissile.ts` and `src/systems/HomingMissileManager.ts`
   - Added a pooled missile entity with heading, velocity, lifetime, and target tracking
   - Added a manager that picks the nearest active enemy at fire time, steers toward it with a capped turn rate, and expires missiles after a short lifetime
   - Added pooled reticles that follow the current target and clear automatically on release

2. `src/systems/WeaponSystem.ts`, `src/states/PlayingState.ts`, and `src/core/Game.ts`
   - Routed player fire into the missile manager whenever `homingMissile` is the active timed power-up
   - Integrated missile updates and cleanup into gameplay, reset, title, and game-over flows
   - Registered missile and reticle meshes with bloom so they stay visually consistent with the rest of the combat layer

## Verification

- `npx vitest run src/systems/HomingMissileManager.test.ts src/states/PlayingState.test.ts`
- `npx tsc --noEmit`

## Deviations from Plan

- The first implementation targets formation enemies only. Boss lock-on remains a later extension if Phase 9 playtesting shows it is needed.

## Self-Check: PASSED

Commits:
- `073579f` - feat(phase-09): add homing, time slow, and shop power-ups
