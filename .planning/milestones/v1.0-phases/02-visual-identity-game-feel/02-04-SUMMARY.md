---
phase: 02-visual-identity-game-feel
plan: 04
subsystem: ui
tags: [three.js, camera-shake, particles, dom-overlay, game-feel, playingstate]

# Dependency graph
requires:
  - phase: 02-01
    provides: emissive enemy materials, wave palette system, applyPalette()
  - phase: 02-02
    provides: SelectiveBloomEffect, registerBloom(), SceneManager.camera
  - phase: 02-03
    provides: ParticleManager (spawnDeathBurst, spawnMuzzleFlash, spawnEngineTrail, update, registerBloom), MovementSystem.isMovingHorizontally
provides:
  - CameraShake class with triggerSmall(), triggerLarge() stub, apply(camera, dt), reset()
  - BossHealthBar DOM stub (show/hide/update) hidden by default — Phase 4 hook
  - PickupFeedback DOM stub with CSS swell keyframe animation — Phase 3 hook
  - PlayingStateContext extended with particleManager, cameraShake, bossHealthBar, pickupFeedback
  - PlayingState fully wired: muzzle flash on fire, engine trail on movement, camera shake on hit, particle update each step
  - HUD.showWaveAnnouncement upgraded to neon palette color + 2.5s duration
  - CollisionSystem.wasHitThisStep() flag for camera shake detection
  - All particle meshes registered with bloom selection from Game.init()
affects: [03-enemy-depth-wave-systems, 04-boss-encounter-meta-progression]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CameraShake uses remaining-duration magnitude decay — natural falloff without e^x math
    - wasHitThisStep() auto-reset flag pattern — read once per step, resets on read
    - Stub components constructed in Game.init() even when not yet active — ready for Phase 3/4
    - cameraShake.reset() called in PlayingState.enter() — clean state on restart

key-files:
  created:
    - src/effects/CameraShake.ts
    - src/ui/BossHealthBar.ts
    - src/ui/PickupFeedback.ts
  modified:
    - src/states/PlayingState.ts
    - src/core/Game.ts
    - src/ui/HUD.ts
    - src/systems/CollisionSystem.ts
    - src/systems/SpawnSystem.ts

key-decisions:
  - "CameraShake.apply() called in render() not update() — shake is render-frequency, not fixed-step"
  - "wasHitThisStep() auto-reset-on-read pattern — PlayingState polls once per step without needing a separate clear call"
  - "BossHealthBar and PickupFeedback constructed in Game.init() and held in PlayingStateContext — available for Phase 3/4 without wiring changes"
  - "Removed unused decay constant from CameraShake — Rule 1 auto-fix for TS6133 strict error"

patterns-established:
  - "Render-frequency vs fixed-step separation: CameraShake.apply(camera, FIXED_STEP * alpha) in render(), particles update in update()"
  - "Phase-specific stub pattern: stubs present in ctx but methods only called in later phases"

requirements-completed: [FEEL-01, FEEL-04, FEEL-05, FEEL-06]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 2 Plan 04: PlayingState Wiring — Phase 2 Integration Summary

**CameraShake + DOM stubs wired into PlayingState: muzzle flash, engine trail, camera shake on hit, neon wave banner with palette color for 2.5s**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T18:09:42Z
- **Completed:** 2026-03-02T18:12:42Z
- **Tasks:** 2
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- CameraShake system: triggerSmall() (6 units/0.25s), triggerLarge() stub (18 units/0.45s), apply() per render frame, reset() on state enter
- BossHealthBar and PickupFeedback DOM stubs constructed and in context — Phase 4/3 hooks ready
- PlayingState fully wired for all Phase 2 effects: muzzle flash on bullet fire, engine trail on horizontal movement, camera shake on player hit, particle.update() each step
- Wave announcement upgraded: neon double-glow with palette hex color, 2.5 second display
- CollisionSystem.wasHitThisStep() auto-reset flag — clean, zero-overhead camera shake trigger

## Task Commits

Each task was committed atomically:

1. **Task 1: CameraShake + UI stubs** - `1b9c973` (feat)
2. **Task 2: Wire everything — PlayingState + Game.ts + HUD** - `981fe9d` (feat)

## Files Created/Modified

- `src/effects/CameraShake.ts` — Screen shake system: triggerSmall/Large, apply(camera, dt), reset()
- `src/ui/BossHealthBar.ts` — Phase 4 stub DOM component, hidden by default
- `src/ui/PickupFeedback.ts` — Phase 3 stub with CSS @keyframes swell animation, showPickup(name)
- `src/states/PlayingState.ts` — Extended context interface, wired all Phase 2 effects in update()/render()/enter()
- `src/core/Game.ts` — Constructs ParticleManager, CameraShake, stubs; registers bloom; wires collision
- `src/ui/HUD.ts` — showWaveAnnouncement now takes optional hexColor, renders neon double-glow for 2.5s
- `src/systems/CollisionSystem.ts` — wasHitThisStep() auto-reset flag, sets flag on player hit
- `src/systems/SpawnSystem.ts` — Passes wavePalette.getColor(wave) to showWaveAnnouncement

## Decisions Made

- CameraShake.apply() called in render() not update(): shake is a visual effect at render frequency, not game logic
- wasHitThisStep() auto-resets on read: PlayingState polls once per fixed step without needing a separate clear call; mirrors CollisionSystem's existing invincibility pattern
- Stubs (BossHealthBar, PickupFeedback) constructed at game init and held in PlayingStateContext: Phase 3/4 can call ctx.pickupFeedback.showPickup() without any wiring changes in Game.ts or PlayingState

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `decay` constant from CameraShake**
- **Found during:** Task 1 (CameraShake.ts creation)
- **Issue:** TypeScript strict mode (TS6133) — `decay: number = 12` was declared but never read; plan included it as conceptual documentation but the implementation uses `t` directly
- **Fix:** Removed the unused field; the decay comment was moved into the method jsdoc
- **Files modified:** src/effects/CameraShake.ts
- **Verification:** `npx tsc --noEmit` — zero errors
- **Committed in:** 1b9c973 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript strict compliance)
**Impact on plan:** Trivial cleanup required by TypeScript strict mode. No behavior change.

## Issues Encountered

None — all Phase 2 interfaces from Plans 01-03 were present exactly as documented in the plan's context block.

## Next Phase Readiness

- All Phase 2 requirements (VIS-01 through FEEL-07) are now active and wired
- Phase 3 can call `ctx.pickupFeedback.showPickup(name)` immediately — stub is ready
- Phase 4 can call `ctx.bossHealthBar.show(phases, currentPhase)` and `ctx.cameraShake.triggerLarge()` — both stubs ready
- No blockers

---
*Phase: 02-visual-identity-game-feel*
*Completed: 2026-03-02*
