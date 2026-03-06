---
phase: 02-visual-identity-game-feel
plan: 02
subsystem: rendering
tags: [postprocessing, bloom, SelectiveBloomEffect, EffectComposer, three.js]

# Dependency graph
requires:
  - phase: 02-visual-identity-game-feel
    plan: 01
    provides: "MeshStandardMaterial emissive on all entities — prerequisite for SelectiveBloomEffect selection"

provides:
  - "BloomEffect class (src/effects/BloomEffect.ts) wrapping EffectComposer + SelectiveBloomEffect"
  - "SceneManager.initBloom() — initialises bloom pipeline and returns BloomEffect for mesh registration"
  - "SceneManager.renderWithEffects(alpha) — routes PlayingState frame render through EffectComposer"
  - "ObjectPool.forEach(cb) — iterates all pooled objects for bulk mesh registration"

affects:
  - 02-03-particles (bloom amplifies particle emissive — same SelectiveBloomEffect selection)
  - 03-enemy-depth (new enemy types must register meshes with bloom.bloomEffect.selection.add())

# Tech tracking
tech-stack:
  added:
    - "pmndrs/postprocessing 6.38.3 — EffectComposer, RenderPass, EffectPass, SelectiveBloomEffect (already in package.json, now actually used)"
  patterns:
    - "SelectiveBloomEffect.selection.add(mesh) — register Object3D for bloom; unregistered objects are not affected"
    - "initBloom() returns BloomEffect — caller (Game.ts) registers meshes immediately after entity creation"
    - "renderWithEffects(alpha) pattern — PlayingState uses it; TitleState/PausedState/GameOverState still call render() for zero-bloom states"
    - "ObjectPool.forEach(cb) — bulk iteration over all pooled objects without exposing internal array"

key-files:
  created:
    - src/effects/BloomEffect.ts
  modified:
    - src/core/SceneManager.ts
    - src/core/Game.ts
    - src/core/ObjectPool.ts
    - src/states/PlayingState.ts

key-decisions:
  - "SelectiveBloomEffect.selection.add(mesh) used directly — no custom layer management needed; library handles layer internally"
  - "bloom registered at game init time (not lazily) — all pooled bullet meshes pre-registered so bloom applies immediately on first shot"
  - "renderWithEffects() falls back to renderer.render() if bloom was not initialised — defensive for test harness and non-playing states"
  - "ObjectPool.forEach() iterates this.all (not this.available) — registers both active and inactive pool objects so all bullets bloom from first use"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 2 Plan 02: SelectiveBloom Post-Processing Pipeline Summary

**pmndrs/postprocessing SelectiveBloomEffect wired to neon emissive entities — player, enemies, and bullets glow with visible halos; HUD DOM and border LineLoop are unaffected**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T18:00:15Z
- **Completed:** 2026-03-02T18:02:13Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Created `src/effects/BloomEffect.ts` — thin wrapper around pmndrs/postprocessing `EffectComposer` with `RenderPass` + `SelectiveBloomEffect` (intensity=1.8, luminanceThreshold=0.15, luminanceSmoothing=0.05, radius=0.75, mipmapBlur=true); exposes `bloomEffect.selection` for mesh registration and `render(deltaTime)` / `setSize(w, h)` / `dispose()` lifecycle
- Updated `SceneManager.ts` — added `initBloom()` factory (creates BloomEffect, wires size/dispose hooks) and `renderWithEffects(alpha)` (routes through EffectComposer; falls back to bare `renderer.render()` if bloom absent); `onResize()` propagates to EffectComposer; `dispose()` cleans up composer; existing `render()` unchanged for non-playing states
- Updated `ObjectPool.ts` — added `forEach(cb)` to iterate all pooled objects (active + inactive) for bulk bloom registration
- Updated `Game.ts` — after entity creation, calls `scene.initBloom()`, then registers `player.mesh`, all `formation.rowMeshes[]` (InstancedMesh × 4), and all bullet pool meshes via `forEach()`
- Updated `PlayingState.render()` — now calls `ctx.scene.renderWithEffects(alpha)` instead of `render()`; other states (Title, Paused, GameOver) untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: BloomEffect wrapper + SceneManager.renderWithEffects()** - `775262a` (feat)
2. **Task 2: Wire bloom into Game.init() and PlayingState.render()** - `c7c1535` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/effects/BloomEffect.ts` — BloomEffect class with EffectComposer + SelectiveBloomEffect; selection exposed for entity registration
- `src/core/SceneManager.ts` — initBloom(), renderWithEffects(), onResize() bloom.setSize(), dispose() bloom.dispose()
- `src/core/ObjectPool.ts` — forEach(cb) method for iterating all pooled objects
- `src/core/Game.ts` — bloom initialisation and mesh registration after entity creation
- `src/states/PlayingState.ts` — render() now uses renderWithEffects(alpha)

## Decisions Made

- `SelectiveBloomEffect.selection.add(mesh)` used for registration — no manual Three.js layer management needed; the postprocessing library handles its own render layer (default layer 11) internally
- All bullet pool meshes pre-registered at init time (not lazily per-shot) — ensures bloom applies to bullets immediately on first shot with zero per-frame overhead
- `renderWithEffects()` includes a defensive fallback to `renderer.render()` when bloom is not initialised — safe for test harnesses and future states that may not call `initBloom()`

## Deviations from Plan

None — plan executed exactly as written.

The `SelectiveBloomEffect.selection` API matched the plan description exactly. The `BloomEffectOptions` interface confirmed `radius` and `mipmapBlur` are valid options (plan used both). No API changes required.

## Issues Encountered

None. Zero TypeScript errors throughout. All 24 existing tests pass without modification.

## Next Phase Readiness

- `BloomEffect` class is composable — Phase 3 particle system (02-03) can add particle meshes to `bloom.bloomEffect.selection` if SceneManager exposes the selection
- New enemy types added in Phase 3 must call `bloom.bloomEffect.selection.add(mesh)` after creating their meshes — this is the established pattern
- `WavePalette` color changes to `rowMeshes` materials will automatically apply to already-registered bloom selection meshes — no re-registration needed on wave transition

---
*Phase: 02-visual-identity-game-feel*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: src/effects/BloomEffect.ts
- FOUND: src/core/SceneManager.ts
- FOUND: src/core/ObjectPool.ts
- FOUND: src/core/Game.ts
- FOUND: src/states/PlayingState.ts
- FOUND commit: 775262a (Task 1)
- FOUND commit: c7c1535 (Task 2)
