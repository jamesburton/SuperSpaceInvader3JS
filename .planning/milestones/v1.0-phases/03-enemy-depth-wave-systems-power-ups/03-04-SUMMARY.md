---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "04"
subsystem: ai
tags: [ai-behavior, state-machine, flanker, sniper, charger, swooper, enemy-archetypes, typescript]

# Dependency graph
requires:
  - phase: 03-enemy-depth-wave-systems-power-ups
    provides: "Enemy archetype state fields (flankerCharging, chargerDiving, swooperPhase, etc.), EnemyFormation.getActiveEnemiesByType(), typeMeshes Map"

provides:
  - "AISystem.update(dt, formation, enemyBulletPool, activeBullets, playerX) — 5-arg signature with per-archetype dispatch"
  - "Flanker behavior: time-triggered charge (15s) toward player X at 200 units/s; 1 bullet/s while charging; deactivates off-screen"
  - "Sniper behavior: aimed shot every 3s toward (playerX, approx player Y); vx/vy overridden after init() for direction"
  - "Charger behavior: countdown dive (3-7s cooldown) at 280 units/s with 60 units/s X-homing; fires on dive start; teleports above screen on return"
  - "Swooper behavior: group-based dive trigger at 8/18/28/38s (4 groups); formation→diving→looping→returning state machine; fires on dive start"
  - "EnemyFormation.setEnemyWorldPos(enemy, x, y) — writes enemy.x/y and updates InstancedMesh matrix"
  - "EnemyFormation.getEnemyWorldPos() updated to return stored x/y for independently-moving enemies"

affects:
  - "03-06: CollisionSystem — independently-moving Flanker/Charger/Swooper enemies use stored x/y positions"
  - "03-08: Game.ts — aiSystem.reset() clears all 5 accumulators per wave"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-archetype dispatch pattern: AISystem.update() calls 4 private updateX() methods after shared march/fire"
    - "Field reuse for state: flanker reuses chargerTargetX (target X) and chargerDiveTimer (fire interval) — documented in comments"
    - "Aimed bullet override: bullet.init() then manual vx/vy override (init() sets vy = -ENEMY_BULLET_SPEED, override beats it)"
    - "Group-based trigger: swooper groups assigned by instanceIndex % 4, triggered at 8+10N seconds"
    - "Independent-movement teleport: Charger and Swooper teleport to above-screen Y after bottom exit for clean re-entry"

key-files:
  created: []
  modified:
    - src/systems/AISystem.ts
    - src/entities/Enemy.ts
    - src/states/PlayingState.ts

key-decisions:
  - "Flanker reuses chargerTargetX and chargerDiveTimer fields — avoids adding new Enemy fields for a single use case; documented in comments"
  - "Aimed bullet pattern: call bullet.init() then manually set bullet.vx/vy — init() is the clean allocation hook, vx/vy are public for override"
  - "Swooper group ID = instanceIndex % 4 — computed at dispatch time, no extra field needed on Enemy"
  - "Swooper returns via kill (killEnemy on bottom exit in returning phase) — simpler than re-integrating into tight formation grid; acceptable for v1"
  - "Charger parks at returnX = clamped(chargerTargetX) above screen — visual re-entry from top; avoids abrupt teleportation into formation"

patterns-established:
  - "Independent-movement: AISystem calls formation.setEnemyWorldPos() to move enemies outside grid; getEnemyWorldPos() detects and returns stored x/y"
  - "Archetype state machine transitions in AISystem — all state mutations happen here, not in Enemy or EnemyFormation"

requirements-completed: [ENEMY-03, ENEMY-04, ENEMY-05, ENEMY-06, ENEMY-10]

# Metrics
duration: 8min
completed: 2026-03-03
---

# Phase 3 Plan 04: Enemy AI Archetypes Summary

**Per-archetype AI state machines for Flanker (lateral charge), Sniper (aimed shots), Charger (dive attacks), and Swooper (group dives with looping re-entry), plus setEnemyWorldPos for independent enemy movement**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-03T02:46:00Z
- **Completed:** 2026-03-03T02:54:31Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `setEnemyWorldPos(enemy, x, y)` to EnemyFormation and updated `getEnemyWorldPos()` to return stored positions for independently-moving enemies (Flanker charging, Charger diving, Swooper off-formation)
- Rewrote AISystem with 5-arg `update()` signature and four per-archetype private methods: Flanker time-triggered charge, Sniper aimed shots with vx/vy override, Charger countdown dive with homing and above-screen return, Swooper group-based dives with full formation→diving→looping→returning state machine
- Updated PlayingState to pass `ctx.player.x` as the fifth argument to `aiSystem.update()`; zero TypeScript errors; build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add setEnemyWorldPos and update getEnemyWorldPos** - `eb077cc` (feat)
2. **Task 2: Implement per-archetype AI behaviors in AISystem** - `14e76a7` (feat)
3. **Task 3: Update PlayingState to pass playerX to AISystem** - `adadeac` (feat)

## Files Created/Modified

- `src/entities/Enemy.ts` - Added `setEnemyWorldPos()` method; updated `getEnemyWorldPos()` to detect independently-moving enemies
- `src/systems/AISystem.ts` - Full rewrite: 5-arg update(), Flanker/Sniper/Charger/Swooper behaviors, group-based swooper triggers, reset() covers all state
- `src/states/PlayingState.ts` - Added `ctx.player.x` as fifth arg to `aiSystem.update()`

## Decisions Made

- **Flanker field reuse:** `chargerTargetX` stores flanker's target X; `chargerDiveTimer` acts as flanker fire interval countdown. Avoids adding new Enemy fields; documented with comments in AISystem.
- **Aimed bullet override:** `bullet.init()` sets `vy = -ENEMY_BULLET_SPEED`, `vx = 0`. Sniper overrides both after init to apply aimed direction. This works because `vx`/`vy` are public fields.
- **Swooper group ID computed inline:** `instanceIndex % 4` computed at dispatch time — no new field needed on Enemy for this.
- **Swooper exit by kill:** Swoopers in 'returning' phase that reach the bottom are killed via `formation.killEnemy()` — they do not re-integrate into the formation grid for this wave. Simpler than re-anchoring to formation rows.
- **Charger parks above screen:** After a completed dive, Charger teleports to `(clamped targetX, WORLD_HEIGHT/2 + 60)` and idles there during cooldown, providing a visible above-screen return path before the next dive.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03-06 (CollisionSystem): independently-moving Flanker/Charger/Swooper enemies now store their own x/y, which `getEnemyWorldPos()` returns directly — AABB collision math unchanged
- Plan 03-08 (Game.ts): `aiSystem.reset()` now clears all 5 accumulators (grunt fire, sniper, flanker timer, swooper group timers/triggered flags) — no call-site changes needed
- Concern (pre-existing): Grunt `getRandomFiringEnemy()` may still select Flankers that have broken formation. Their world positions are returned correctly via `getEnemyWorldPos()`, but bullet spawn position will follow them off-screen. This is acceptable for v1 — the front-row check still works correctly.

## Self-Check: PASSED

- src/entities/Enemy.ts: FOUND (setEnemyWorldPos present, getEnemyWorldPos updated)
- src/systems/AISystem.ts: FOUND (updateFlankers, updateSnipers, updateChargers, updateSwoopers present)
- src/states/PlayingState.ts: FOUND (ctx.player.x passed as 5th arg)
- Commit eb077cc: FOUND
- Commit 14e76a7: FOUND
- Commit adadeac: FOUND

---
*Phase: 03-enemy-depth-wave-systems-power-ups*
*Completed: 2026-03-03*
