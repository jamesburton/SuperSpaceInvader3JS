---
phase: 08-visual-customization
plan: "03"
subsystem: crt-effects
tags: [crt, post-processing, scanlines, chromatic-aberration, bloom, rendering]
dependency_graph:
  requires:
    - 08-01  # BloomEffect must exist before CRTManager adds second pass
  provides:
    - CRTManager class with init/setIntensity/dispose
    - BloomEffect.composer exposed as public
    - SceneManager.initCrt() + crt getter
    - CRT effects across all game states via SceneManager.render()
  affects:
    - 08-04  # CRT settings UI will call scene.crt.setIntensity()
tech_stack:
  added: []
  patterns:
    - Separate EffectPass after bloom (critical — merged pass suppresses bloom)
    - Tier-parameterized effect config via const lookup table
    - Intensity clamped to [0.01, 1.0] minimum so effects remain visible once unlocked
key_files:
  created:
    - src/effects/CRTManager.ts
  modified:
    - src/effects/BloomEffect.ts
    - src/core/SceneManager.ts
    - src/core/Game.ts
decisions:
  - Minimum intensity clamped to 0.01 (not 0.0) — avoids invisible CRT effect while paying GPU cost
  - SceneManager.render() now routes through EffectComposer (not just renderWithEffects) — single change covers TitleState + GameOverState
  - CRT tier params in const lookup object (not if/else chain) — clean extension point for future tiers
metrics:
  duration: "~3 min"
  completed: "2026-03-07"
  tasks_completed: 2
  files_modified: 4
---

# Phase 8 Plan 03: CRT Post-Processing Pipeline Summary

CRT scanline + chromatic aberration pipeline as a separate EffectPass after bloom, wired into all game state render paths via SceneManager.render().

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create CRTManager + expose BloomEffect composer | 89eb075 | src/effects/CRTManager.ts, src/effects/BloomEffect.ts |
| 2 | Wire CRT into rendering pipeline + all states | 485699b | src/core/SceneManager.ts, src/core/Game.ts |

## What Was Built

### CRTManager (src/effects/CRTManager.ts)

New class that wraps `ScanlineEffect` + `ChromaticAberrationEffect` from pmndrs/postprocessing in a single `EffectPass`. Key design:

- Three-tier parameter table:
  - Tier 1: `density = 1.5 * intensity`, no chromatic aberration (scanlines only)
  - Tier 2: `density = 2.5 * intensity`, CA offset `0.003 * intensity`
  - Tier 3: `density = 4.0 * intensity`, CA offset `0.006 * intensity`
- `init(composer, camera, tier, intensity)`: validates tier (returns early if null/out-of-range), creates effects, adds EffectPass to the EXISTING composer — pass order guarantees CRT executes after bloom
- `setIntensity(intensity)`: clamps to [0.01, 1.0], updates `scanline.density` and `chromatic.offset` in-place — no restart required
- `dispose()`: disposes pass, nulls references

### BloomEffect.ts — composer exposed

Changed `composer` from `private readonly` to `public readonly`. CRTManager calls `bloom.composer.addPass()` via `SceneManager.initCrt()` which receives the composer reference.

### SceneManager — CRT init + universal render routing

- Added `private crtManager: CRTManager | null = null` field
- `initCrt(tier, intensity)`: guard-checks bloomEffect exists, creates CRTManager, calls init with composer + camera. Returns null if CRT not unlocked.
- `get crt()`: exposes crtManager for Plan 08-04's settings UI to call `setIntensity()`
- `render()`: now routes through `bloomEffect.render()` when bloom is active — previously bypassed EffectComposer, meaning TitleState/GameOverState never received post-processing. Now both `render()` and `renderWithEffects()` go through the same EffectComposer, so CRT applies globally.
- `dispose()`: calls `crtManager?.dispose()` before bloomEffect

### Game.ts — CRT initialization

After all bloom mesh registrations, reads `crtTier` and `crtIntensity` from `useMetaStore.getState()` and calls `this.scene.initCrt(crtTier, crtIntensity)`. If `crtTier` is null (default, not yet unlocked), no CRT pass is added and visual parity with pre-Phase 8 is maintained.

## Decisions Made

- **Minimum intensity 0.01**: Prevents unlocked CRT from becoming completely invisible while still paying the GPU cost of the EffectPass. User expectation once unlocked is that something is always visible.
- **SceneManager.render() routing**: The cleanest minimal-change approach — no state file touches needed. TitleState and GameOverState call `scene.render()`, PausedState and LevelBriefingState render nothing (their overlays cover the full canvas), so this single change covers all applicable states.
- **Tier lookup table vs conditionals**: `CRT_TIER_PARAMS` const object enables O(1) access and clean future extensibility. TypeScript `as const` ensures the type is narrowed to the literal tier union.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/effects/CRTManager.ts
- FOUND: src/effects/BloomEffect.ts (composer public)
- FOUND: src/core/SceneManager.ts (initCrt, crt getter, render routing)
- FOUND: src/core/Game.ts (initCrt wired)
- Commit 89eb075: feat(08-03): create CRTManager + expose BloomEffect.composer
- Commit 485699b: feat(08-03): wire CRT pipeline into rendering + all game states
- `npx tsc --noEmit`: PASS
- `npx vite build`: PASS (no new warnings)
