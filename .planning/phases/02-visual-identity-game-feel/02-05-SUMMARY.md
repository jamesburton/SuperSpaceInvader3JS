---
phase: 02-visual-identity-game-feel
plan: 05
subsystem: verification
tags: [human-verify, playtest, bugfix, geometry, winding, collision]

# Dependency graph
requires:
  - phase: 02-visual-identity-game-feel
    provides: "Plans 02-01 through 02-04 — all Phase 2 visual and game-feel systems"

provides:
  - "Human sign-off: Phase 2 visual identity + gameplay verified as basically playable"
  - "Fix: CCW winding order on all custom BufferGeometry (Enemy rows + Player ship were invisible)"
  - "Fix: enemy kill index corrected — instanceIndex now flat (row*ENEMY_COLS+col), rows 1-3 killable"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three.js BufferGeometry winding: must be CCW when viewed from +Z camera — [a,c,b] not [a,b,c] for fan triangles"
    - "InstancedMesh slot addressing uses enemy.col (0-9 within row), flat array lookup uses row*ENEMY_COLS+col"

# Plan outcome
status: complete
self_check: PASSED

## What Was Built

Human verification checkpoint for Phase 2: Visual Identity + Game Feel.

User playtested the complete Phase 2 build. Two bugs were identified and fixed during verification before sign-off was granted.

## Bugs Found and Fixed

### Bug 1 — Invisible Enemies and Player Ship

**Symptom**: Enemies and player ship completely invisible; only engine trail particles and bullets visible.

**Root cause**: All custom `BufferGeometry` in `Enemy.ts` (4 row shapes) and `Player.ts` (ship) had clockwise triangle winding when viewed from the orthographic camera at +Z. Three.js culls clockwise triangles as back-faces.

**Why particles were visible**: The particle diamond geometry happened to be defined counter-clockwise (vertex order top → left → bottom is CCW). Bullets use `BoxGeometry` which Three.js generates with correct winding automatically.

**Fix**: Flipped all triangle indices from `[a, b, c]` → `[a, c, b]` across all 5 geometry functions. Committed as `da9de5c`.

### Bug 2 — Front Row Enemies Unkillable

**Symptom**: Bottom-row (row 3) enemies could not be killed; bullets hit them but they survived indefinitely.

**Root cause**: `spawnWave()` set `enemy.instanceIndex = col` (0–9), treating it as a per-row InstancedMesh slot. But `killEnemy(enemy.instanceIndex)` used that value to index the flat `enemies` array (which is row-major, indices 0–39). So shooting any rows 1–3 enemy passed `instanceIndex = col` (0–9), which silently killed a row-0 enemy instead. Rows 1–3 could never be killed.

**Fix**: Changed `instanceIndex = row * ENEMY_COLS + col` (flat index for array lookup). Changed `updateAllMatrices` and `killEnemy` internals to use `enemy.col` for per-row InstancedMesh slot addressing. Committed as `0ba10bb`.

## Verification Result

After both fixes, user confirmed: *"That's worked, it is basically playable now."*

**Sign-off granted.** v0.5 tagged on commit `0ba10bb`.

## Key Files

### key-files.created
- .planning/phases/02-visual-identity-game-feel/02-05-SUMMARY.md

### key-files.modified
- src/entities/Enemy.ts — CCW winding fix + flat instanceIndex fix
- src/entities/Player.ts — CCW winding fix

## Self-Check: PASSED

- [x] Human playtested and provided feedback
- [x] Bugs found and fixed with committed changes
- [x] User sign-off granted
- [x] v0.5 tagged
