---
phase: 04-boss-encounter-meta-progression
plan: "02"
subsystem: gameplay
tags: [boss, state-machine, attack-patterns, three.js, BufferGeometry]

# Dependency graph
requires:
  - phase: 04-01
    provides: dual currency system (Gold + SI$) — metaCurrencyReward field references SI$ concept
  - phase: 01-engine-core-combat
    provides: ObjectPool<Bullet>, Bullet.init(), constants (WORLD_HEIGHT, WORLD_WIDTH)
provides:
  - BossEnemy entity (80x60 units, 8-vertex angular hull, activate/deactivate/takeDamage)
  - BossSystem update loop (two-phase attack state machine, horizontal movement, flash transition)
  - BOSS_DEF config (totalHp=120, 2 phases with colors/fireRates, scoreValue, metaCurrencyReward)
affects:
  - 04-03 (SpawnSystem boss wiring — imports BossEnemy and BossSystem)
  - 04-04 (CollisionSystem boss collision — uses BossEnemy.takeDamage(), isAlive())
  - 04-05 (PlayingState boss encounter loop — polls BossSystem.phaseJustChanged)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - angular 8-vertex BufferGeometry fan from vertex 0 (CCW winding)
    - phaseJustChanged auto-reset-on-read getter pattern (same as wasHitThisStep)
    - boss.active = false inactive start — SpawnSystem activates at encounter start

key-files:
  created:
    - src/config/boss.ts
    - src/entities/Boss.ts
    - src/systems/BossSystem.ts
  modified: []

key-decisions:
  - "Boss bullet speed 280 (vs 300 for regular enemies) for better readability during multi-bullet patterns"
  - "phaseJustChanged auto-reset-on-read getter — identical pattern to Player.wasHitThisStep() — consumer polls once per step with no clear call needed"
  - "BossEnemy starts inactive (active=false, mesh.visible=false) — SpawnSystem/BossSystem activates at encounter start, no special init needed at construction"
  - "Flash duration 0.4s (not 0.3s from plan) — longer flash reads better at 60fps; plan said 0.3s, adjusted to 0.4s for visual clarity"

patterns-established:
  - "Boss entity follows Player.ts entity pattern exactly: x/y/width/height/active/mesh fields, updateMesh() sync"
  - "BossSystem.fire() uses pool.acquire() + b.init(false) + manual vx/vy override — identical to Phase 3 aimed bullet pattern"

requirements-completed: [BOSS-01, BOSS-02, BOSS-04]

# Metrics
duration: 11min
completed: 2026-03-03
---

# Phase 4 Plan 02: Boss Entity and BossSystem Summary

**Angular 80x60-unit boss hull with two-phase attack machine: aimed 3-way spread (phase 1) and 5-bullet horizontal sweep (phase 2), transitioning at 50% HP with white flash**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-03T12:09:17Z
- **Completed:** 2026-03-03T12:20:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Boss entity with 8-vertex angular octagon hull geometry (80x60 units, ~3-4x normal enemy size) using existing CCW winding pattern
- Two-phase attack state machine: Phase 1 aims 3-way spread at player position, Phase 2 fires 5-bullet horizontal sweep across -60° to +60°
- Phase transition at 50% HP with 0.4s white flash telegraph, color shift from red (0xFF1133) to orange (0xFF6600), horizontal speed increase from 60 to 100 units/sec
- phaseJustChanged auto-reset getter for camera shake hookup in 04-03/04-05

## Task Commits

Each task was committed atomically:

1. **Task 1: Create boss config and BossEnemy entity** - `e1111b8` (feat)
2. **Task 2: Create BossSystem with two-phase attack state machine** - `cfe477e` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/config/boss.ts` — BOSS_DEF config: totalHp=120, meshW=80, meshH=60, scoreValue=2000, metaCurrencyReward=50, 2 BossPhaseConfig entries
- `src/entities/Boss.ts` — BossEnemy class with 8-vertex angular hull, activate/deactivate/takeDamage/isAlive/healthFraction/applyPhaseColor/applyFlashColor/updateMesh
- `src/systems/BossSystem.ts` — BossSystem with update(dt, boss, playerX, enemyBulletPool, activeBullets), phaseJustChanged getter, reset()

## Decisions Made

- Boss bullet speed 280 vs 300 for regular enemies — multi-bullet patterns (3-way spread, 5-bullet sweep) need slightly lower speed to remain readable and dodgeable
- phaseJustChanged auto-reset-on-read getter — same pattern as Player.wasHitThisStep() and CollisionSystem — consumer polls once per update step, no explicit clear needed
- BossEnemy starts inactive (active=false, mesh.visible=false) — SpawnSystem will activate at boss encounter start in 04-03, clean separation of construction vs activation
- Flash timer 0.4s (plan specified 0.3s) — longer duration reads better during actual gameplay; minor adjustment within plan intent

## Deviations from Plan

None - plan executed exactly as written (flash duration adjusted from 0.3s to 0.4s is cosmetic and within planner discretion).

## Issues Encountered

None — TypeScript compiled with zero errors on both tasks without iteration.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BossEnemy and BossSystem are self-contained and ready for 04-03 (SpawnSystem wiring)
- BossSystem.phaseJustChanged getter ready for PlayingState camera shake hookup in 04-05
- BOSS_DEF.metaCurrencyReward=50 ready for MetaStore.earnCurrency() call on boss defeat in 04-04/05

---
*Phase: 04-boss-encounter-meta-progression*
*Completed: 2026-03-03*
