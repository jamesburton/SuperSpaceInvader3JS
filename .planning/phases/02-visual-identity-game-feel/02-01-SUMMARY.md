---
phase: 02-visual-identity-game-feel
plan: 01
subsystem: rendering
tags: [three.js, MeshStandardMaterial, BufferGeometry, InstancedMesh, emissive, neon, palette]

# Dependency graph
requires:
  - phase: 01-engine-core-combat
    provides: "EnemyFormation, Player, Bullet, ObjectPool, SpawnSystem — all entity and system foundations"

provides:
  - "WavePalette system (src/config/palettes.ts) with cyan-to-crimson 6-entry ramp and reset() stub"
  - "4 distinct per-row enemy geometric shapes using InstancedMesh with MeshStandardMaterial emissive"
  - "Angular 6-vertex chevron player ship with cyan MeshStandardMaterial emissive"
  - "Emissive bullets: white for player, red-orange for enemies, with setColor() Phase 3 hook"
  - "Wave palette wiring: each new wave applies progressive color to enemy formation"

affects:
  - 02-02-bloom (MeshStandardMaterial emissive is prerequisite for SelectiveBloomEffect selection)
  - 02-03-particles (emissive materials define visual identity particles match)
  - 03-enemy-depth (enemy shapes per row inform Phase 3 enemy type visual differentiation)
  - 04-boss-meta (WavePalette.reset() stub wired for boss-defeat palette reset)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-row InstancedMesh: EnemyFormation.rowMeshes[4] — one instanced mesh per enemy row, each with own geometry shape and material"
    - "WavePalette singleton: wavePalette.getColor(wave) returns hex from 6-entry WAVE_PALETTES array, cycling in endless mode"
    - "applyPalette(hex) pattern: updates color+emissive on all row materials atomically"
    - "Enemy.instanceIndex = enemy.col (0-9) within per-row mesh, separate from flat enemies[] array index"
    - "MeshStandardMaterial with emissiveIntensity on all entities — prerequisite for bloom rendering pipeline"

key-files:
  created:
    - src/config/palettes.ts
  modified:
    - src/entities/Enemy.ts
    - src/entities/Player.ts
    - src/entities/Bullet.ts
    - src/systems/SpawnSystem.ts
    - src/core/Game.ts
    - src/__mocks__/three.ts

key-decisions:
  - "Enemy.instanceIndex equals enemy.col (0-9) not flat row*COLS+col — each row has its own InstancedMesh so index within mesh = column"
  - "killEnemy() routes to rowMeshes[enemy.row] using enemy.col as instanceIndex for scale-zero hiding"
  - "Bullet constructor no longer accepts color param — init() sets material emissive based on isPlayerBullet flag"
  - "WavePalette.cycleCount tracks completed cycles for future HUD/analytics use instead of unused cycleIndex"
  - "Three.js mock extended with MeshStandardMaterial, BufferGeometry, and material reference stored in Mesh constructor"
  - "Player AABB unchanged (width=20, height=12 half-extents) — chevron geometry is purely visual, collision box untouched"

patterns-established:
  - "Row geometry factories: separate makeRowNGeometry() functions for each of 4 shapes, using buildGeometry() helper"
  - "applyPalette() called in two places: SpawnSystem.initPalette() at game start, SpawnSystem.startNextWave() on each wave transition"

requirements-completed: [VIS-01, VIS-02, FEEL-07]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 2 Plan 01: Neon Emissive Materials + WavePalette System Summary

**4 distinct geometric enemy shapes (diamond/hexagon/chevron/crab) with MeshStandardMaterial emissive, cyan chevron player ship, and WavePalette cycling cyan-to-crimson per wave**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T17:52:47Z
- **Completed:** 2026-03-02T17:56:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created `src/config/palettes.ts` with `WavePalette` class and `WAVE_PALETTES` 6-entry hex ramp (cyan → teal → green → yellow → orange → crimson); includes `reset()` stub for Phase 4 boss-defeat hook
- Replaced EnemyFormation's single `InstancedMesh` with `rowMeshes[4]` — 4 per-row InstancedMesh objects each with distinct BufferGeometry: row 0 diamond (4-vert), row 1 elongated hexagon (6-vert), row 2 angular arrowhead chevron (6-vert), row 3 wide crab with pincer notches (8-vert)
- All enemy rows use `MeshStandardMaterial` with cyan emissive (`emissiveIntensity=1.0`) and `applyPalette()` wired into `SpawnSystem` for per-wave color progression
- Rewrote `Player.ts` geometry from `BoxGeometry` to 6-vertex angular chevron (`BufferGeometry`) with `MeshStandardMaterial` cyan emissive (`emissiveIntensity=1.2`); AABB half-extents unchanged
- Upgraded `Bullet.ts` from `MeshBasicMaterial` to `MeshStandardMaterial` emissive — player bullets white (0xffffff), enemy bullets red-orange (0xff4400); added `setColor()` hook for Phase 3 weapon types

## Task Commits

Each task was committed atomically:

1. **Task 1: WavePalette system + enemy geometric meshes** - `795a895` (feat)
2. **Task 2: Player ship geometry + emissive bullets + SpawnSystem palette wiring** - `72170b4` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/config/palettes.ts` — WavePalette class with WAVE_PALETTES, getColor(wave), reset() stub, singleton export
- `src/entities/Enemy.ts` — Per-row rowMeshes[4] replacing single instancedMesh; 4 distinct BufferGeometry shapes; applyPalette() method; killEnemy() routed to correct row mesh
- `src/entities/Player.ts` — 6-vertex angular chevron BufferGeometry; MeshStandardMaterial cyan emissive
- `src/entities/Bullet.ts` — MeshStandardMaterial emissive replacing MeshBasicMaterial; init() sets per-type color; setColor() Phase 3 hook added
- `src/systems/SpawnSystem.ts` — wavePalette import; initPalette() method; applyPalette() called on each wave start
- `src/core/Game.ts` — spawnSystem.initPalette(formation) called before TitleState so Wave 1 is cyan
- `src/__mocks__/three.ts` — Added MeshStandardMaterial, BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Matrix4 stubs; Mesh stores material reference

## Decisions Made

- `Enemy.instanceIndex` equals `enemy.col` (0–9) not the flat `row*COLS+col` value — each row has its own InstancedMesh so the index within each mesh is the column position
- `Bullet` constructor no longer accepts a `color` parameter — `init()` now sets material emissive based on `isPlayerBullet` flag, keeping the pool factory simpler
- `WavePalette._cycleCount` tracks completed cycles for future analytics (satisfies TypeScript's "unused private field" lint while providing a useful future hook)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Three.js mock missing material reference on Mesh**
- **Found during:** Task 2 (after running tests)
- **Issue:** Phase 1 mock `Mesh` constructor didn't store `mat` argument, so `this.mesh.material` was `undefined` in Bullet tests accessing emissive color in `init()`
- **Fix:** Extended `__mocks__/three.ts` — `Mesh` now stores `material` param in constructor; added `MeshStandardMaterial`, `BufferGeometry`, `Float32BufferAttribute`, `Uint16BufferAttribute`, `Matrix4` stubs for new entity types
- **Files modified:** `src/__mocks__/three.ts`
- **Verification:** All 24 tests pass after fix
- **Committed in:** `72170b4` (Task 2 commit)

**2. [Rule 1 - Bug] WavePalette cycleIndex was declared but never read**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** `cycleIndex` private field was set in `getColor()` but never read — TypeScript TS6133 error
- **Fix:** Renamed to `_cycleCount` tracking completed cycles, used as a readable property (`get cycleCount()`) and reset via `reset()` — satisfies strict TS while providing value
- **Files modified:** `src/config/palettes.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `795a895` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Next Phase Readiness

- All entities now use `MeshStandardMaterial` with emissive — Plan 02 (bloom) can immediately target emissive materials via `SelectiveBloomEffect`
- `WavePalette.reset()` stub in place for Phase 4 boss-defeat hook
- `Bullet.setColor()` stub ready for Phase 3 weapon types
- `applyPalette()` API clean and tested — Phase 3 enemy types can call it per enemy type if needed
- 24 Phase 1 unit tests still passing — no regression

---
*Phase: 02-visual-identity-game-feel*
*Completed: 2026-03-02*
