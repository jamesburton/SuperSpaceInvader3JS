---
phase: 01-engine-core-combat
plan: 01
subsystem: engine
tags: [three.js, vite, typescript, webgl, orthographic-camera, object-pool, game-loop]

# Dependency graph
requires: []
provides:
  - Vite + TypeScript project scaffold with all v1 dependencies installed
  - SceneManager: WebGLRenderer + OrthographicCamera (800x600 logical units) with resize handling and dispose()
  - InputManager: Set-based keyboard poll map with isDown/justPressed/clearJustPressed
  - ObjectPool<T>: Generic pre-allocated pool with visible-flag toggling (no scene.add/remove)
  - Game: Fixed-timestep accumulator loop (60Hz physics, delta capped at 200ms) with setAnimationLoop
  - src/utils/constants.ts: All tunable game constants as named exports
  - src/utils/types.ts: Shared TypeScript interfaces (Entity, BulletEntity, EnemyEntity, RunStateData, EnemyInstancedRenderer)
affects:
  - 01-02 (player entity depends on InputManager + Game loop)
  - 01-03 (enemy InstancedMesh depends on SceneManager + ObjectPool)
  - 01-04 (collision system depends on Entity interface from types.ts)
  - All subsequent plans in all phases

# Tech tracking
tech-stack:
  added:
    - three@0.183.2
    - vite@7.3.1
    - typescript@5.9.3
    - zustand@5.0.11
    - postprocessing@6.38.3
    - three.quarks@0.17.0
    - "@types/three@0.183.1"
  patterns:
    - Named Three.js imports (import { Scene, WebGLRenderer } from 'three' — never import *)
    - ObjectPool visible-flag toggling (objects added to scene once at creation, visibility toggled on acquire/release)
    - Fixed-timestep accumulator (physics at 60Hz, render at display refresh rate)
    - OrthographicCamera with logical world units (800x600) decoupled from screen pixels

key-files:
  created:
    - package.json
    - tsconfig.json
    - vite.config.ts
    - index.html
    - src/vite-env.d.ts
    - src/main.ts
    - src/utils/constants.ts
    - src/utils/types.ts
    - src/core/SceneManager.ts
    - src/core/InputManager.ts
    - src/core/ObjectPool.ts
    - src/core/Game.ts
  modified: []

key-decisions:
  - "OrthographicCamera viewport: halfH = WORLD_HEIGHT/2, halfW = halfH * aspect — preserves aspect ratio on resize"
  - "ObjectPool uses visible-flag toggling not scene.add/remove — zero GC pressure during gameplay"
  - "Fixed-timestep delta capped at MAX_DELTA (200ms) to prevent spiral-of-death on tab switches"
  - "import.meta.env requires src/vite-env.d.ts with /// <reference types='vite/client' /> for TypeScript"
  - "Game.ts constructor parameter 'container' must not use private readonly — TypeScript strict noUnusedLocals would flag it since SceneManager is passed it directly"

patterns-established:
  - "Named Three.js imports: import { Scene, WebGLRenderer, Color } from 'three' throughout all files"
  - "Constants: all tunable values in src/utils/constants.ts as named exports — no magic numbers inline"
  - "Pool pattern: factory() creates objects in constructor, acquire()/release() toggle visible only"
  - "Game loop: setAnimationLoop with accumulator += delta; while accumulator >= FIXED_STEP"

requirements-completed: [ENG-01, ENG-02, ENG-03, ENG-04, ENG-05]

# Metrics
duration: 12min
completed: 2026-03-02
---

# Phase 1 Plan 01: Engine Scaffold Summary

**Vite + TypeScript + Three.js engine foundation with OrthographicCamera, generic ObjectPool (visible-flag toggling), and 60Hz fixed-timestep game loop — greenfield from zero files to running scaffold**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-02T15:58:41Z
- **Completed:** 2026-03-02T16:10:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Full Vite + TypeScript + Three.js project installed from scratch — `npm install` resolves 30 packages with zero vulnerabilities
- Engine core implemented: SceneManager (WebGLRenderer + OrthographicCamera), InputManager (keyboard poll map), ObjectPool (generic pre-allocated), Game (fixed-timestep loop)
- `npx tsc --noEmit` passes with zero TypeScript errors in strict mode
- All Three.js imports are named (never `import * as THREE`) — tree-shaking compatible
- Object pooling architecture proven: visible-flag toggling, no scene.add/remove in hot path
- Shared type contracts established in types.ts — Entity, BulletEntity, EnemyEntity, RunStateData for all downstream plans

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold project with Vite + TypeScript + Three.js** - `719e739` (chore)
2. **Task 2: Implement SceneManager, InputManager, ObjectPool, and Game loop** - `281b4ee` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `package.json` — dependency manifest, three@0.183.2, vite@7.3.1, typescript@5.9.3, zustand@5.0.11, postprocessing@6.38.3
- `tsconfig.json` — strict TypeScript with ESNext target, bundler module resolution
- `vite.config.ts` — esnext build target, tree-shaking with moduleSideEffects: false
- `index.html` — minimal shell: game-container div, canvas style, HUD overlay, module script
- `src/vite-env.d.ts` — Vite client types reference for import.meta.env
- `src/main.ts` — entry point: instantiates Game, calls init() and start()
- `src/utils/constants.ts` — FIXED_STEP, MAX_DELTA, WORLD_WIDTH/HEIGHT, pool sizes, player/enemy/bullet tuning
- `src/utils/types.ts` — Entity, PooledObject, BulletEntity, EnemyEntity, GamePhase, RunStateData, EnemyInstancedRenderer interfaces
- `src/core/SceneManager.ts` — Scene + OrthographicCamera (logical units) + WebGLRenderer, resize handler, dispose()
- `src/core/InputManager.ts` — Set-based isDown/justPressed/clearJustPressed keyboard poll
- `src/core/ObjectPool.ts` — Generic T extends {visible: boolean} pool with acquire/release/releaseAll/activeCount
- `src/core/Game.ts` — Fixed-timestep accumulator with setAnimationLoop, update/render hooks for subclassing

## Decisions Made

- **OrthographicCamera sizing:** `halfH = WORLD_HEIGHT / 2; halfW = halfH * aspect` — preserves aspect ratio correctly on any screen size, hitbox math stays exact
- **ObjectPool visible-flag pattern:** Pool items added to scene once at creation by the owning system; acquire/release only toggle `visible` — eliminates scene graph mutations in hot path
- **Fixed-timestep cap:** MAX_DELTA = 0.2 (200ms) prevents runaway accumulator catch-up when browser tab is backgrounded and resumes
- **Named Three.js imports only:** Enforced throughout — `import { Scene, OrthographicCamera, WebGLRenderer, Color } from 'three'` — critical for Vite tree-shaking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: 'container' declared but never read in Game.ts**
- **Found during:** Task 2 (Game loop implementation), verification step
- **Issue:** `constructor(private readonly container: HTMLElement)` stores container but it's never accessed after being passed to SceneManager — TypeScript strict `noUnusedLocals` flags this
- **Fix:** Removed `private readonly` from parameter — `constructor(container: HTMLElement)` passes it directly to SceneManager without storing
- **Files modified:** `src/core/Game.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `281b4ee` (Task 2 commit)

**2. [Rule 3 - Blocking] Missing import.meta.env type definition**
- **Found during:** Task 2 (ObjectPool implementation), verification step
- **Issue:** `import.meta.env.DEV` caused `TS2339: Property 'env' does not exist on type 'ImportMeta'` — Vite client types not included in tsconfig
- **Fix:** Created `src/vite-env.d.ts` with `/// <reference types="vite/client" />` — standard Vite TypeScript pattern
- **Files modified:** `src/vite-env.d.ts` (created)
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `719e739` (Task 1 commit, staged with scaffold files)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug fix, 1 Rule 3 blocking issue)
**Impact on plan:** Both fixes necessary for TypeScript strict mode compliance. Zero scope creep — no behavioral changes.

## Issues Encountered

- `three.quarks@0.17.0` peer dependency warning against Three.js 0.183.2 noted (flagged in STATE.md blockers, verify before Phase 2 particle work)

## User Setup Required

None — no external service configuration required. Run `npm run dev` to start the Vite dev server.

## Next Phase Readiness

- All engine primitives are available for Plan 02 (player entity, movement, shooting)
- InputManager.isDown() ready for ArrowLeft/ArrowRight/Space polling
- ObjectPool ready for bullet pool instantiation
- Game.update() and Game.render() are protected methods — subclass or extend in Plan 02+
- SceneManager.scene is public readonly — any system can add geometry via scene.add()
- types.ts contracts (Entity, BulletEntity, EnemyEntity) are locked — Plan 02 implements them

---
*Phase: 01-engine-core-combat*
*Completed: 2026-03-02*
