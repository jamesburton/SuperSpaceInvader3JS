---
phase: 08-visual-customization
plan: "01"
subsystem: ship-skins
tags: [skins, geometry, materials, meta-store, player]
dependency_graph:
  requires: [06-01, 07-02]
  provides: [PlayerSkinManager, skinConfig, SHIP_SHAPES, SKIN_COLORS, skin-wiring]
  affects: [PlayingState, Player, MetaStore]
tech_stack:
  added: []
  patterns:
    - BufferGeometry factory functions (one per ship shape)
    - In-place mesh geometry + material swap (no bloom re-registration)
    - Module-level singleton PlayerSkinManager in PlayingState
key_files:
  created:
    - src/config/skinConfig.ts
    - src/entities/PlayerSkinManager.ts
  modified:
    - src/states/PlayingState.ts
decisions:
  - "PlayerSkinManager is a module-level singleton in PlayingState — one instance reused across all runs"
  - "applySkin() disposes old geometry/material before assigning new ones to free GPU memory"
  - "Bloom re-registration not needed — Selection set holds Mesh Object3D reference, not geometry/material"
  - "SKIN_UPGRADE_DEFS excludes 'default' chevron (always free) — only 3 purchasable shapes listed"
  - "SHAPE_SVG_PATHS uses pre-computed polygon coordinates scaled to 80x48 SVG viewBox — no second WebGL context"
  - "selectedSkin destructured alongside purchasedUpgrades in applyMetaBonuses() — single getState() call"
metrics:
  duration: "~3 min"
  completed: "2026-03-07"
  tasks: 2
  files: 3
---

# Phase 8 Plan 01: Ship Skin Data Layer + PlayerSkinManager Summary

**One-liner:** 4-shape BufferGeometry factory registry + in-place material swap PlayerSkinManager wired to MetaStore.selectedSkin at run start.

## What Was Built

Created the ship skin data layer and geometry/material swap mechanism for SKIN-01, SKIN-02, and SKIN-04:

1. `src/config/skinConfig.ts` — complete data registry:
   - `SHIP_SHAPES`: 4 geometry factory functions (default chevron, delta arrowhead, dart, cruiser)
   - `SKIN_COLORS`: 6 neon palette entries (white/GHOST, cyan/CYBER, magenta/NEON, yellow/SOLAR, green/VENOM, orange/FIRE)
   - `SKIN_COLOR_NAMES`, `SHIP_SHAPE_NAMES`: display name maps for UI
   - `SHAPE_SVG_PATHS`: pre-computed SVG polygon point strings for UI preview thumbnails (80x48 viewBox)
   - `SKIN_UPGRADE_DEFS`: cost definitions for 3 purchasable shapes (delta=25, dart=35, cruiser=50 SI$)

2. `src/entities/PlayerSkinManager.ts` — geometry/material swap class:
   - `applySkin(player, shapeId, colorId)`: disposes old geometry + material, builds new ones, assigns in-place
   - Falls back to 'default' shape and 'white' color for unknown IDs
   - Does NOT re-register with bloom (mesh Object3D identity unchanged)

3. `src/states/PlayingState.ts` — skin wiring:
   - Module-level `PlayerSkinManager` singleton
   - `applyMetaBonuses()` now reads `selectedSkin` from MetaStore and calls `applySkin()` at run start

## Decisions Made

- **In-place swap, not mesh replace**: Swapping `mesh.geometry` and `mesh.material` directly preserves the bloom Selection registration. Removing/re-adding the mesh would lose bloom glow.
- **Module-level singleton**: `const playerSkinManager = new PlayerSkinManager()` at module scope — shared across all `PlayingState` instances (new run, restart, continue). No state is held between calls.
- **Geometry disposal before assign**: `mesh.geometry.dispose()` called before each swap to free GPU buffer memory. Pitfall 2 (null reference on double-dispose) is non-issue since `applySkin()` is only called once per run in `applyMetaBonuses()`.
- **SVG paths not WebGL**: Preview thumbnails use pre-computed SVG polygon coordinates — zero additional WebGL context overhead.
- **Default chevron unchanged**: `Player.ts` constructor still creates the default chevron with cyan (backward compatible). `PlayerSkinManager` overrides at run start based on MetaStore.

## Verification

- `npx tsc --noEmit`: passes with zero errors
- `npx vite build`: succeeds (700 kB bundle, chunk size warning is pre-existing from Three.js)
- Default gameplay unchanged: Player constructor still produces cyan chevron; `applySkin('default', 'white')` produces white chevron at run start

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files created:
- `src/config/skinConfig.ts` — FOUND
- `src/entities/PlayerSkinManager.ts` — FOUND

Files modified:
- `src/states/PlayingState.ts` — FOUND

Commits:
- `c8e0410` — feat(08-01): add skinConfig.ts data layer and PlayerSkinManager class
- `be5435e` — feat(08-01): wire PlayerSkinManager into PlayingState.applyMetaBonuses
