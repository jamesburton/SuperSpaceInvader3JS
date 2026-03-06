---
plan: 01-06
phase: 01-engine-core-combat
status: complete
completed: "2026-03-02"
verified_by: human
---

# Summary: 01-06 — Human Verification Checkpoint

## Result: APPROVED

Human play-test confirmed. Phase 1 combat loop is playable and meets all stated acceptance criteria.

## Issues Found and Fixed During Verification

Four bugs were caught during play-test and fixed before sign-off:

### 1. Zustand React peer-dep error (runtime crash)
`import { create } from 'zustand'` resolved to the React-bound entry point in Zustand 5.x,
crashing the game before the title screen appeared.
**Fix:** Changed to `import { createStore } from 'zustand/vanilla'` in MetaState.ts.

### 2. All enemies invisible after first kill
`updateAllMatrices()` used the shared `tmpMatrix` instance with `setPosition()`, which only
updates the translation columns — leaving the scale at 0,0,0 after `killEnemy()` called
`makeScale(0,0,0)`. Every subsequent active enemy was rendered with zero scale.
**Fix:** Changed `tmpMatrix.setPosition()` → `tmpMatrix.makeTranslation()` so the full matrix
resets to identity+translation on every active-enemy write.

### 3. Camera mismatch — enemies marching in centre third of screen
The OrthographicCamera adapted its width to the viewport aspect ratio (`halfW = halfH * aspect`),
showing ±533 world units on a 16:9 display while all game logic used `WORLD_WIDTH/2 = 400`.
Enemies appeared to reverse in a small central zone with ~163 units of dead space each side.
**Fix:** Locked camera to a fixed `WORLD_WIDTH × WORLD_HEIGHT` (4:3) viewport with CSS
letterboxing. Also added a dim `#333366` border LineLoop at world edges so the play area is
always visually clear. HUD moved inside `#game-viewport` so it stays aligned with the canvas.

### 4. Fixed march bounds — enemies reverse at a fixed anchor, not the screen edge
March reversal used pre-computed anchor bounds (`400 - halfFormation - 30 = 118`), which
produced a fixed swing regardless of which enemies were still alive. Killing the right half of
the formation had no effect on when the remainder turned around.
**Fix:** Replaced with per-frame active-enemy edge detection. The formation now reverses when
the outermost *live* enemy edge reaches the world boundary, with overshoot clamped flush to the
wall. Clearing one side extends the travel range of survivors — classic skill/reward.

### 5. Difficulty curve too aggressive
`ENEMY_BASE_MARCH_SPEED = 60` with `ENEMY_MARCH_SPEEDUP = 0.08` (8% per kill) reached
~280 u/s at 20 kills (unplayable). Halved both: base 30, speedup 3.5%.
At 20 kills: ~60 u/s (2× start). Last enemy peaks at ~116 u/s (exciting, not impossible).

## Verified Acceptance Criteria

All 5 Phase 1 success criteria confirmed:

- [x] Player moves left/right with keyboard and fires projectiles that visibly destroy enemies at stable 60fps
- [x] Enemies march in formation, fire back, player loses a life on hit with 1.5s invincibility flash
- [x] All lives exhausted → game over screen shows final score, wave reached, enemies killed
- [x] ESC/P pauses and freezes all action; resume continues exactly where left off
- [x] Score, lives counter, and wave number always visible on HUD during play

## Additional Observations

- Wave escalation confirmed: clearing all 40 enemies triggers 2.5s delay, wave announcement, new formation at increased speed
- High score persistence confirmed: survives browser refresh via `localStorage` key `ssix_v1`
- Formation edge-reversal confirmed: clearing one side of the grid causes survivors to march further before turning
- TypeScript compiles with zero errors across all Phase 1 source files
