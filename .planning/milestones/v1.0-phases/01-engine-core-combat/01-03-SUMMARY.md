---
phase: 01-engine-core-combat
plan: 03
subsystem: entities
tags: [three.js, instanced-mesh, enemy-formation, ai-system, object-pool]

# Dependency graph
requires:
  - phase: 01-01
    provides: SceneManager, ObjectPool, constants (ENEMY_COLS, ENEMY_ROWS, ENEMY_BASE_MARCH_SPEED, etc.)
  - phase: 01-02
    provides: Bullet entity with init(x, y, isPlayerBullet), ObjectPool<Bullet>, createBulletPools()
provides:
  - EnemyFormation class managing 10x4 grid via single InstancedMesh (1 draw call for all 40 enemies)
  - AISystem class driving formation march and enemy bullet firing
  - ENEMY_DEFS config with per-row sizing for Phase 3 archetype extension
  - getEnemyAABB() and getEnemyWorldPos() interfaces for Plan 04 CollisionSystem
  - killEnemy() with march speed acceleration (8% per kill, recalculated from base)
affects:
  - 01-04 (CollisionSystem uses getEnemyAABB and getEnemyWorldPos)
  - 01-05 (StateManager uses AISystem.update() return value for game-over trigger)
  - 03 (Phase 3 extends EnemyType, ENEMY_DEFS, and AISystem for new archetypes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - InstancedMesh with scale-to-zero for dead enemy hiding (no scene remove/add)
    - Formation-anchor pattern: all enemy positions computed from formationX/formationY offset
    - March speed recalculated from base each kill (avoids floating-point drift)
    - Front-row preference for enemy firing (scan bottom-to-top per column)

key-files:
  created:
    - src/config/enemies.ts
    - src/entities/Enemy.ts
    - src/systems/AISystem.ts
  modified:
    - src/core/Game.ts

key-decisions:
  - "InstancedMesh pre-allocated to ENEMY_POOL_SIZE=256 — formation uses first 40 slots; Wave 2+ reuse same mesh via spawnWave()"
  - "Dead enemies hidden via setMatrixAt(scale=0) not scene.remove — zero GC pressure, consistent with Phase 1 pooling pattern"
  - "March speed = BASE * pow(1.08, killed) recalculated from scratch each kill to prevent float drift over 40 kills"
  - "EnemyFormation.getEnemyAABB() is the canonical collision interface — Plan 04 must not access formationX/Y directly"
  - "WeaponSystem removed from Game.ts (player firing inlined); AISystem handles all enemy fire logic"

patterns-established:
  - "InstancedMesh scale-to-zero: killEnemy() calls tmpMatrix.makeScale(0,0,0) then setMatrixAt — standard hide pattern for this codebase"
  - "Formation anchor: enemy world position = formationX + col offset, formationY - row offset — used in getEnemyWorldPos() and getEnemyAABB()"
  - "Enemy config in src/config/ as read-only Record<EnemyType, EnemyDef> — entities copy values on spawn, never mutate config"

requirements-completed: [CORE-03, CORE-04, ENG-04]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 1 Plan 03: Enemy Formation Summary

**10x4 enemy InstancedMesh formation marching with classic Space Invaders direction reversal, speed escalation on kills, and front-row-preference downward firing via AISystem**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T16:10:00Z
- **Completed:** 2026-03-02T16:12:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- EnemyFormation renders all 40 enemies via a single InstancedMesh (1 draw call — ENG-04 validated)
- Classic Space Invaders march: left-right sweep, drops ENEMY_DROP_DISTANCE=20 per boundary reversal
- March speed escalation: `BASE * pow(1.08, killed)` recalculated from scratch per kill, avoiding float drift
- AISystem fires enemy bullets at ~1.5/second (formation-wide rate, not per-enemy), with front-row preference
- getEnemyAABB() and getEnemyWorldPos() fully implemented and ready for Plan 04 CollisionSystem

## Task Commits

Each task was committed atomically:

1. **Task 1: Enemy config and entity classes** - `ae9e90c` (feat)
2. **Task 2: Implement AISystem and wire enemies into Game** - `b816114` (feat)

## Files Created/Modified
- `src/config/enemies.ts` - EnemyDef interface, ENEMY_DEFS (grunt stats), ROW_SIZES (per-row visual+AABB sizing)
- `src/entities/Enemy.ts` - Enemy data class + EnemyFormation managing InstancedMesh, march logic, kill/firing interfaces
- `src/systems/AISystem.ts` - Formation march update + enemy fire rate scheduling with front-row preference
- `src/core/Game.ts` - Updated to create EnemyFormation and run AISystem in game loop; WeaponSystem removed (firing inlined)

## Decisions Made
- InstancedMesh pre-allocated to ENEMY_POOL_SIZE=256: formation uses first 40 slots; `spawnWave()` resets and reuses the same mesh for Wave 2+
- Dead enemies hidden via `setMatrixAt(scale=0)` — consistent with object-pool visible-flag pattern from Plan 01; zero GC pressure
- `EnemyFormation.getEnemyAABB()` is the canonical collision interface for Plan 04 — the CollisionSystem must not access `formationX`/`formationY` directly (encapsulation)
- `WeaponSystem` removed from Game.ts since player firing was already inlined in Plan 02; AISystem handles all enemy-side weapon logic

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `tmpColor` field and `Color` import in Enemy.ts**
- **Found during:** Task 1 (Enemy entity classes)
- **Issue:** Plan included `private readonly tmpColor = new Color(0xffffff)` which is never read. TypeScript strict mode raised TS6133.
- **Fix:** Removed the field and the `Color` import from three.js
- **Files modified:** `src/entities/Enemy.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `ae9e90c` (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused `WeaponSystem` import and `weaponSystem` field, fixed unused `container` param and `_reachedBottom` variable in Game.ts**
- **Found during:** Task 2 (Game.ts update)
- **Issue:** Plan's Game.ts template had: (a) WeaponSystem import but no usage, (b) `private readonly container` constructor param never used, (c) `_reachedBottom` unused variable binding. TypeScript raised TS6133/TS6138.
- **Fix:** Removed WeaponSystem import and field; changed constructor param to non-shorthand; replaced `const _reachedBottom = ...` with `void ...`
- **Files modified:** `src/core/Game.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `b816114` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug: unused declarations causing TS strict-mode errors)
**Impact on plan:** No functional changes — all fixes were removal of dead code that TypeScript strict mode caught. No scope creep.

## Issues Encountered
None beyond the auto-fixed TypeScript strict-mode errors above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 04 (CollisionSystem) can now use `formation.getEnemyAABB(enemy)` and `formation.killEnemy(instanceIndex)`
- Plan 05 (StateManager) can use AISystem.update() return value (`true` = enemies reached bottom) for game-over trigger
- InstancedMesh architecture committed — cannot be retrofitted. Phase 3 enemy archetype work must extend EnemyType and ENEMY_DEFS, not add individual Mesh per enemy
- Concern: collision detection performance at 150+ entities unvalidated — run stress test in Plan 04 before committing AABB approach

## Self-Check: PASSED

- FOUND: src/config/enemies.ts
- FOUND: src/entities/Enemy.ts
- FOUND: src/systems/AISystem.ts
- FOUND: src/core/Game.ts
- FOUND: .planning/phases/01-engine-core-combat/01-03-SUMMARY.md
- FOUND commit: ae9e90c (Task 1)
- FOUND commit: b816114 (Task 2)
- FOUND commit: a97b8ff (docs/metadata)

---
*Phase: 01-engine-core-combat*
*Completed: 2026-03-02*
