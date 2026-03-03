---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "02"
subsystem: entities
tags: [enemy-archetypes, instanced-mesh, geometry, formation-layout, wave-config, typescript]

# Dependency graph
requires:
  - phase: 03-enemy-depth-wave-systems-power-ups
    provides: EnemyType union, ENEMY_DEFS (6 entries), WaveConfig interface, FormationLayout interface, getWaveConfig()
  - phase: 02-visual-identity-game-feel
    provides: Per-row InstancedMesh pattern, MeshStandardMaterial emissive, bloom registration via rowMeshes
  - phase: 01-engine-core-combat
    provides: ROW_SIZES, ENEMY_POOL_SIZE, ENEMY_BASE_MARCH_SPEED, ENEMY_MARCH_SPEEDUP constants

provides:
  - "Enemy class with 9 archetype-specific state fields (shieldActive/Hp, offScreen, swooperPhase, flankerCharging, chargerDive*, meshSlot)"
  - "Six geometry factories: makeShielderGeometry, makeFlankerGeometry, makeSniperGeometry, makeChargerGeometry, makeSwooperGeometry, makeGruntGeometry"
  - "GridFormationLayout implementing FormationLayout — exported for SpawnSystem use"
  - "EnemyFormation.spawnWave(config: WaveConfig) — data-driven, row-type assignment via allowedTypes array"
  - "EnemyFormation.typeMeshes: Map<EnemyType, InstancedMesh> — 6 meshes with distinct geometries and emissive colors"
  - "EnemyFormation.getActiveEnemiesByType(type) — AISystem dispatch hook"
  - "Backward-compatible rowMeshes getter and zero-arg spawnWave() default"

affects:
  - "03-04: AISystem — calls getActiveEnemiesByType(type) for per-archetype behavior dispatch; reads enemy.type, shieldActive, swooperPhase, flankerCharging, chargerDiving"
  - "03-05: SpawnSystem — calls formation.spawnWave(getWaveConfig(n)); bloom registration via rowMeshes getter"
  - "03-06: CollisionSystem — reads enemy.shieldActive/shieldHp for Shielder shield mechanic"
  - "03-08: Game.ts — EnemyFormation constructor creates 6 type meshes (up from 4 row meshes)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-type InstancedMesh: 6 meshes keyed by EnemyType (replaces 4 row-based meshes)"
    - "meshSlot: sequential index within type's InstancedMesh, assigned during spawnWave()"
    - "Row-homogeneous type assignment: row % allowedTypes.length fills each formation row with one archetype"
    - "applyPalette blend: 70% wave palette + 30% type accent preserves archetype identifiability across wave transitions"
    - "Backward-compat getter pattern: rowMeshes returns Array.from(typeMeshes.values()) for existing bloom iteration"

key-files:
  created: []
  modified:
    - src/entities/Enemy.ts

key-decisions:
  - "typeMeshes Map<EnemyType, InstancedMesh> replaces rowMeshes[] — 6 archetype meshes vs 4 row meshes; rowMeshes getter preserves bloom registration API"
  - "meshSlot assigned per-type sequentially in spawnWave() — tracks InstancedMesh slot index within each type mesh"
  - "Row-homogeneous archetype assignment: row % allowedTypes.length — each row is one type; clean visual grouping"
  - "Grunt InstancedMesh uses row-0 geometry (smallest diamond) as its single-geometry slot — Grunt visual variety was a Phase 2 pattern that Phase 3 trades for type diversity"
  - "spawnWave() default param getWaveConfig(1) — zero-arg call still works for Game.ts constructor path"
  - "applyPalette preserves type identity: non-grunt blends 70/30 rather than full overwrite"

patterns-established:
  - "Archetype state fields on Enemy: each type's AI-relevant mutable state lives directly on Enemy (not on external system)"
  - "Geometry factory per archetype: each type has a dedicated function returning a flat BufferGeometry"
  - "ARCHETYPE_GEOMETRY_FACTORIES partial map: grunt excluded (uses row param variant); all other types keyed"

requirements-completed: [ENEMY-02, ENEMY-03, ENEMY-04, ENEMY-05, ENEMY-06, ENEMY-07, ENEMY-08, ENEMY-10]

# Metrics
duration: 44min
completed: 2026-03-03
---

# Phase 3 Plan 02: Enemy Archetypes and Formation Summary

**Six distinct enemy geometries with per-archetype state fields, GridFormationLayout, and data-driven EnemyFormation.spawnWave(WaveConfig) — AI and SpawnSystem contracts delivered**

## Performance

- **Duration:** 44 min
- **Started:** 2026-03-03T00:34:57Z
- **Completed:** 2026-03-03T01:19:27Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Extended Enemy class with 9 archetype-specific state fields: shieldActive/shieldHp (Shielder), offScreen/swooperPhase/swooperLoopX/Y (Swooper), flankerCharging (Flanker), chargerDiveTimer/chargerDiving/chargerTargetX (Charger), and meshSlot for InstancedMesh slot tracking
- Added five archetype geometry factories (Shielder: tank with frontal shield bar, Flanker: asymmetric arrowhead, Sniper: 12-vertex cross with elongated barrel, Charger: wedge/rhombus pointing down, Swooper: crescent arc) plus makeGruntGeometry(row) delegating to existing row factories
- Refactored EnemyFormation from 4 row-based meshes to 6 type-keyed meshes (typeMeshes Map); spawnWave(config: WaveConfig) builds formation from WaveConfig.allowedTypes with row-homogeneous archetype assignment; getActiveEnemiesByType() exposed for AISystem

## Task Commits

All three tasks committed atomically in one unified commit (all tasks modify the same file):

1. **Task 1: Add per-archetype state fields to Enemy class** - `76e55ac` (feat)
2. **Task 2: Add six geometry factories and FormationLayout implementation** - `76e55ac` (feat)
3. **Task 3: Refactor EnemyFormation to use WaveConfig and per-type meshes** - `76e55ac` (feat)

_Note: Three tasks combined into one commit since all three tasks target the same file (src/entities/Enemy.ts) and were executed atomically._

## Files Created/Modified

- `src/entities/Enemy.ts` - Extended Enemy class with archetype state fields; six geometry factories; GridFormationLayout; refactored EnemyFormation with typeMeshes, spawnWave(WaveConfig), getActiveEnemiesByType()

## Decisions Made

- `typeMeshes Map<EnemyType, InstancedMesh>` replaces `rowMeshes[]` — 6 type meshes with distinct geometries instead of 4 row meshes with uniform shape-per-row. `rowMeshes` getter (Array.from values) preserves bloom registration API in Game.ts.
- `meshSlot` field on Enemy assigned sequentially per-type during spawnWave() — tracks the correct InstancedMesh slot for killEnemy() and matrix updates, since a flat index can no longer be used across mixed-type meshes.
- Row-homogeneous archetype assignment (`row % allowedTypes.length`) chosen for visual clarity — a column of mixed types would be visually confusing; one row = one type creates clear threat groupings.
- Grunt InstancedMesh uses row-0 geometry (smallest diamond) as its single geometry — Phase 2 per-row grunt shape variety is traded for Phase 3 type diversity. Grunt formation rows will all look the same, which is acceptable for grunts.
- `spawnWave()` default param `getWaveConfig(1)` — zero-arg invocations from the Game.ts constructor path remain working with no changes to call sites.
- Sniper geometry simplified from complex overlapping cross (had degenerate triangles) to 3 clean quads (barrel + horizontal bar + base) — Rule 1 auto-fix during Task 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Simplified Sniper geometry from overlapping triangles to clean 3-quad cross**
- **Found during:** Task 2 (Add six geometry factories)
- **Issue:** Initial Sniper cross geometry had overlapping/degenerate triangle indices that could cause rendering artifacts (z-fighting on coincident faces, incorrect normals from computeVertexNormals)
- **Fix:** Replaced 16-vertex complex indexing with clean 12-vertex approach: barrel quad (top arm), horizontal bar quad (full width), base quad (bottom arm) — three non-overlapping rectangles forming a + shape
- **Files modified:** src/entities/Enemy.ts
- **Verification:** `npx tsc --noEmit` zero errors; `npm run build` succeeds
- **Committed in:** 76e55ac (unified task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - geometry correctness)
**Impact on plan:** Auto-fix necessary for correct rendering. No scope change.

## Issues Encountered

None beyond the Sniper geometry simplification documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03-04 (AISystem) is unblocked: `getActiveEnemiesByType(type)` available; all archetype state fields present for AI dispatch
- Plan 03-05 (SpawnSystem) is unblocked: `spawnWave(config: WaveConfig)` signature ready; `GridFormationLayout` exported if SpawnSystem needs direct reference
- Plan 03-06 (CollisionSystem) is unblocked: `enemy.shieldActive` and `enemy.shieldHp` available for Shielder shield mechanic
- Concern: Grunt InstancedMesh now uses a single geometry (row-0 diamond) for all grunt rows — if visual variety per grunt row is desired later, a per-row multi-geometry grunt approach would require additional work. Accepted for v1.

## Self-Check: PASSED

- src/entities/Enemy.ts: FOUND
- .planning/phases/03-enemy-depth-wave-systems-power-ups/03-02-SUMMARY.md: FOUND
- Commit 76e55ac: FOUND

---
*Phase: 03-enemy-depth-wave-systems-power-ups*
*Completed: 2026-03-03*
