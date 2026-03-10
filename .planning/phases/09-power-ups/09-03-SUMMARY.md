---
phase: 09-power-ups
plan: "03"
subsystem: time-slow
tags: [powerups, timeslow, pacing, visuals, hud]
dependency_graph:
  requires: [09-01]
  provides: [time-slow, combat-time-scale, time-slow-visuals]
  affects: [PlayingState, RunState, MovementSystem, SceneManager, HUD]
tech_stack:
  added: []
  patterns:
    - Selective dt routing for hostile systems only
    - Renderer CSS filter plus HUD overlay for readable slowdown feedback
    - Runtime time-scale exposure through RunState and PowerUpManager
key_files:
  created: []
  modified:
    - src/state/RunState.ts
    - src/systems/PowerUpManager.ts
    - src/systems/MovementSystem.ts
    - src/states/PlayingState.ts
    - src/core/SceneManager.ts
    - src/ui/HUD.ts
decisions:
  - "Time slow uses selective hostile dt routing instead of a global game clock reduction"
  - "Player bullets and input remain on raw dt; enemy movement, boss logic, and hostile bullets receive scaled dt"
  - "Visual communication combines a cool HUD tint with scene desaturation/brightness filtering and eased interpolation"
metrics:
  duration: "~20 min"
  completed: "2026-03-10"
  tasks: 2
  files: 6
---

# Phase 9 Plan 03: Time Slow Summary

**One-liner:** Added a selective time-slow effect that reduces enemy and hostile projectile speed while the player remains on full-speed controls, with a cool-tinted eased visual treatment.

## What Was Built

1. Runtime time-scale state
   - Added `timeScale` to `RunState` snapshots for visibility and verification
   - Added `combatTimeScale` to `PowerUpManager` so gameplay systems can read a single source of truth for slowdown strength

2. Selective hostile slowdown
   - Updated `MovementSystem` to accept separate player and enemy bullet deltas
   - Updated `PlayingState` to route slowed dt into AI, boss logic, and enemy bullets while keeping player movement, firing, and power-up timers on raw dt
   - Cleared time-slow state on continue/reset flows

3. Visual treatment
   - Added `SceneManager.setTimeSlowEffect()` to desaturate and slightly dim the renderer output during the effect
   - Added an eased cool tint overlay in `HUD` so the slowdown state reads immediately without obscuring the playfield

## Verification

- `npx vitest run src/state/RunState.test.ts src/ui/HUD.test.ts src/states/PlayingState.test.ts`
- `npx tsc --noEmit`

## Deviations from Plan

None.

## Self-Check: PASSED

Commits:
- `073579f` - feat(phase-09): add homing, time slow, and shop power-ups
