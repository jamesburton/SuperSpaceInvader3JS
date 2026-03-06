---
phase: 01-engine-core-combat
plan: 02
subsystem: combat-core
tags: [player, bullet-pool, weapon-system, movement-system, tdd, three.js]

# Dependency graph
requires:
  - 01-01 (SceneManager, InputManager, ObjectPool, Game loop, types.ts, constants.ts)
provides:
  - Player entity: position, movement clamping, fire cooldown, BoxGeometry mesh
  - Bullet entity: pool-compatible with visible/active sync, init(), syncMesh()
  - createBulletPools(): pre-allocates 64 player + 128 enemy bullets in scene
  - WeaponSystem: fire input handling, pool acquisition, activeBullets management
  - MovementSystem: updateBullets() with out-of-bounds culling and pool release
  - Game.ts: fully wired fixed-step loop with player, weapon, and movement systems
affects:
  - 01-03 (enemy formation depends on activeBullets list for collision target)
  - 01-04 (collision system depends on Player, Bullet, activeBullets structures)
  - All subsequent plans using bullet pools or player entity

# Tech tracking
tech-stack:
  added:
    - vitest@4.0.18 (unit testing)
    - "@vitest/coverage-v8@4.0.18"
    - jsdom@28.1.0
  patterns:
    - TDD: RED-GREEN cycle for entity unit tests
    - Object.defineProperty to sync Bullet.visible ↔ mesh.visible ↔ active flag
    - Three.js mock via src/__mocks__/three.ts (BoxGeometry, Mesh, MeshBasicMaterial, Scene stubs)
    - WeaponSystem holds activeBullets reference — systems own the list they modify
    - MovementSystem iterates backwards for safe in-place splice

key-files:
  created:
    - src/entities/Player.ts
    - src/entities/Bullet.ts
    - src/systems/WeaponSystem.ts
    - src/systems/MovementSystem.ts
    - src/__mocks__/three.ts
    - src/entities/Player.test.ts
    - src/entities/Bullet.test.ts
    - vitest.config.ts
  modified:
    - src/core/Game.ts (full rewrite — wired Player, pools, systems into fixed-step loop)
    - package.json (added test/test:watch scripts, vitest devDependencies)

key-decisions:
  - "Bullet.visible via Object.defineProperty — pool calls obj.visible, getter/setter forwards to mesh.visible and active; no separate sync call needed"
  - "WeaponSystem.update() receives activeBullets ref — system pushes acquired bullets directly, keeping list management co-located"
  - "Game.update() calls WeaponSystem then Player.update() then MovementSystem — weapon before movement preserves justPressed frame window"
  - "Three.js mock in src/__mocks__/three.ts — Vitest resolves vi.mock('three') to this stub, enabling unit tests without WebGL"
  - "Vitest configured with environment: node — no jsdom needed for entity math tests; Three.js mocked out entirely"

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 1 Plan 02: Player + Bullet Systems Summary

**Player entity (movement + fire cooldown) and bullet ObjectPool systems — TDD-driven entity unit tests, WeaponSystem/MovementSystem implementations, and full Game loop wiring**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T16:04:01Z
- **Completed:** 2026-03-02T16:07:27Z
- **Tasks:** 2 (Task 1: TDD entity impl, Task 2: systems + Game wiring)
- **Files created/modified:** 10

## Accomplishments

- Player entity: horizontal movement at 300 units/s, ±360 unit bound clamping, `canFire()`/`recordFire()` 0.25s cooldown (4 shots/second max), BoxGeometry mesh synced on update
- Bullet entity: `init(x, y, isPlayerBullet)` sets position/velocity, `syncMesh()` for hot-path mesh sync, `visible` getter/setter via `Object.defineProperty` keeps `mesh.visible` and `active` flag in sync with zero extra calls
- `createBulletPools(scene)`: pre-allocates 64 white player bullets + 128 red enemy bullets in scene once — pool only toggles visibility
- WeaponSystem: polls `input.justPressed('Space')`, acquires from pool, initializes bullet, pushes to `activeBullets`, calls `player.recordFire()`
- MovementSystem: `updateBullets()` integrates `vy*dt`, calls `syncMesh()`, culls at ±(300 + 16) = ±316 from world edge, releases to correct pool
- Game.ts fully wired: fixed-step loop calls weapon → player movement → bullet movement → clearJustPressed in correct order
- Test infrastructure: Vitest 4.0.18 + Three.js mock (BoxGeometry, Mesh, MeshBasicMaterial, Scene stubs) enables unit testing without WebGL
- 24 unit tests pass; `tsc --noEmit` zero errors

## Task Commits

TDD RED-GREEN cycle produced 3 commits for Task 1, 1 commit for Task 2:

1. **Task 1 RED — Failing tests** - `24b9f11` (test): Player movement/bounds/cooldown, Bullet init/sync/pool
2. **Task 1 GREEN — Entity implementation** - `095f56d` (feat): Player.ts + Bullet.ts, all 24 tests pass
3. **Task 2 — Systems + Game wiring** - `76a838f` (feat): WeaponSystem, MovementSystem, Game.ts rewrite

## Files Created/Modified

- `src/entities/Player.ts` — Player entity with position, 300 u/s movement, ±360 clamping, 0.25s fire cooldown
- `src/entities/Bullet.ts` — Bullet entity, visible↔active sync via defineProperty, createBulletPools factory
- `src/systems/WeaponSystem.ts` — Fire input, pool acquire, activeBullets push
- `src/systems/MovementSystem.ts` — Bullet position integration, out-of-bounds cull + pool release
- `src/core/Game.ts` — Rewritten to wire Player, bullet pools, WeaponSystem, MovementSystem into fixed-step loop
- `src/entities/Player.test.ts` — 12 tests: initial state, movement, bound clamping, fire cooldown
- `src/entities/Bullet.test.ts` — 12 tests: default state, init(), visible/active sync, createBulletPools()
- `src/__mocks__/three.ts` — Minimal Three.js stub for Vitest (no WebGL needed)
- `vitest.config.ts` — Vitest config with node environment, globals, src test file discovery
- `package.json` — Added test/test:watch scripts, vitest/jsdom/coverage devDependencies

## Decisions Made

- **Bullet.visible via Object.defineProperty:** Pool calls `obj.visible = true/false`; getter/setter forwards to `mesh.visible` and syncs `active` flag — no separate sync step anywhere
- **WeaponSystem receives activeBullets:** System pushes acquired bullets directly into the shared list — co-locates fire logic with pool acquisition
- **Update order:** `weaponSystem` → `player.update()` → `movementSystem` → `clearJustPressed()` — weapon runs first so `justPressed('Space')` is captured before it's cleared
- **Three.js mock in src/__mocks__/three.ts:** Vitest auto-resolves `vi.mock('three')` to this file; entity tests run in ~10ms total with zero WebGL
- **node environment for Vitest:** Entity math tests don't need DOM; avoids jsdom overhead (jsdom installed but unused — available for future UI tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] WeaponSystem updated to accept activeBullets parameter**
- **Found during:** Task 2 implementation
- **Issue:** Plan's WeaponSystem.update() signature did not include `activeBullets: Bullet[]` — bullet acquisition without pushing to active list means bullets exist in pool but MovementSystem never sees them
- **Fix:** Added `activeBullets: Bullet[]` parameter to WeaponSystem.update(); system pushes acquired bullets directly. Game.ts passes the shared `activeBullets` array.
- **Files modified:** `src/systems/WeaponSystem.ts`, `src/core/Game.ts`
- **Committed in:** `76a838f` (Task 2)

**2. [Rule 1 - Bug] Removed void IIFE pattern from Game.update()**
- **Found during:** Task 2 implementation, reviewing plan's Game.ts code
- **Issue:** Plan used `const firedBullet = (() => { ... })(); void firedBullet;` — IIFE returns void, assignment to `firedBullet` is vacuous, and the `void` suppression is noise
- **Fix:** Delegated fire logic entirely to `this.weaponSystem.update()` call — cleaner and correctly routes through WeaponSystem
- **Files modified:** `src/core/Game.ts`
- **Committed in:** `76a838f` (Task 2)

---

**Total deviations:** 2 auto-fixed (Rule 2: missing array param for correctness, Rule 1: dead code cleanup)
**Impact on plan:** Both fixes improve correctness. No behavioral changes to observable game behavior. No scope creep.

## Issues Encountered

None beyond auto-fixed deviations above.

## User Setup Required

None — run `npm run dev` to launch Vite dev server. Expected behavior in browser:
- White rectangle at bottom center of black canvas (player ship)
- ArrowLeft / A: move left; ArrowRight / D: move right
- Ship stops at screen edges (±360 units)
- Spacebar: fires white bullet rectangles upward (max 4/second)
- Bullets disappear when they exit the top of the screen
- Console shows: `[Game] Player bullet pool: 64 slots` and `Enemy bullet pool: 128 slots`

## Next Phase Readiness

- `activeBullets: Bullet[]` array is the live collision target list for Plan 03 (enemy entities)
- `Player` entity's x/y/width/height are AABB-ready for Plan 04 (collision detection)
- `Bullet.isPlayerBullet` flag is set — Plan 04 uses it for hit discrimination
- `ObjectPool.releaseAll()` available for wave resets in Plan 05+
- `WeaponSystem` receives `activeBullets` reference — Plan 04 enemy fire reuses same pattern

---
*Phase: 01-engine-core-combat*
*Completed: 2026-03-02*
