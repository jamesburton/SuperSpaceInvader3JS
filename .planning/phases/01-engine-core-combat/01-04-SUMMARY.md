---
phase: 01-engine-core-combat
plan: 04
subsystem: combat-loop
tags: [collision, run-state, meta-state, hud, spawn-system, aabb, zustand]

# Dependency graph
requires:
  - 01-02 (Player entity, Bullet entity, ObjectPool, activeBullets list)
  - 01-03 (EnemyFormation, getEnemyAABB, killEnemy, AISystem)
provides:
  - CollisionSystem: AABB player-bullet×enemy and enemy-bullet×player each fixed step
  - RunState: volatile module-level singleton (score, lives, wave, kills, gamePhase)
  - MetaState: Zustand 5 persist store (highScore, metaCurrency) at localStorage key ssix_v1
  - HUD: DOM overlay controller (score top-left, wave top-center, lives top-right) + showOverlay/hideOverlay
  - SpawnSystem: wave-clear detection, 2.5s transition, next wave spawning
  - Game.ts: fully wired combat loop — shoot enemies, take damage, clear waves, game over
affects:
  - 01-05 (StateManager extends Game.ts isGameOver/isPaused flags; uses HUD.showOverlay/hideOverlay)
  - 04 (Phase 4 MetaState extended with unlocks, cosmetics, permanentBonuses)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AABB overlap: Math.abs(ax-bx) < aw+bw && Math.abs(ay-by) < ah+bh
    - Player invincibility flash: Math.floor(timer / 0.1) % 2 === 0 toggles mesh.visible
    - RunState: plain TS module object — never Zustand, never localStorage
    - MetaState: Zustand 5 create+persist, name=ssix_v1, versioned saveVersion field
    - HUD: direct DOM mutations on pre-queried HTMLElements — no framework overhead
    - SpawnSystem returns boolean (isTransitioning) — Game pauses AI during transition

key-files:
  created:
    - src/systems/CollisionSystem.ts
    - src/state/RunState.ts
    - src/state/MetaState.ts
    - src/ui/HUD.ts
    - src/systems/SpawnSystem.ts
  modified:
    - src/core/Game.ts (full rewrite — wired all Phase 1 systems into combat loop)

key-decisions:
  - "RunState is plain TS module singleton — volatile, no Zustand, no localStorage"
  - "MetaState uses Zustand 5 persist middleware (ssix_v1) with saveVersion=1 for future migrations"
  - "HUD is DOM overlay absolutely positioned within #hud div — no Three.js TextGeometry"
  - "CollisionSystem owns playerInvincibility timer — not Player entity — keeps entity clean"
  - "SpawnSystem.update() returns isTransitioning bool — Game.ts skips AI during wave gap"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 1 Plan 04: Combat Loop Wiring Summary

**AABB collision (player bullets kill enemies, enemy bullets hit player), RunState, MetaState, DOM HUD, SpawnSystem wave sequencing — fully playable combat loop wired into Game.ts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T16:15:54Z
- **Completed:** 2026-03-02T16:18:05Z
- **Tasks:** 2
- **Files created/modified:** 6

## Accomplishments

- CollisionSystem: O(n) player-bullet × enemy AABB loop, O(m) enemy-bullet × player check each fixed step; hit bullets spliced from activeBullets and released to pool atomically
- Player invincibility: 1.5s countdown after hit, mesh.visible flickers (Math.floor(timer/0.1) % 2) for visual feedback
- RunState: module-level singleton with getters + mutator methods (addScore, loseLife, nextWave, recordKill, setPhase, reset, snapshot) — volatile, no persistence
- MetaState: Zustand 5 `create + persist` at key `ssix_v1`, `saveVersion=1`; updateHighScore and addMetaCurrency actions; structured for Phase 4 extension
- HUD: DOM overlay injected into `#hud` div; direct textContent mutation on pre-queried elements; showOverlay/hideOverlay for pause/game-over screens; showWaveAnnouncement with 2s auto-dismiss
- SpawnSystem: detects `formation.activeCount === 0`, increments wave, waits 2.5s, clears all active bullets, calls `formation.spawnWave()`; returns `isTransitioning` to pause AI during gap
- Game.ts fully wired: fire input → player move → spawn check → AI (if not transitioning) → bullet movement → collision → lives check → HUD sync → clearJustPressed
- triggerGameOver: sets isGameOver flag, updates MetaState highScore, shows GAME OVER overlay with score/wave/kills; R key restarts
- restart(): resets runState, clears bullets, resets all systems; fully functional from any game-over state

## Exported API Reference

### AABB Function (CollisionSystem.ts internal)
```typescript
function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh): boolean
// true if Math.abs(ax-bx) < aw+bw AND Math.abs(ay-by) < ah+bh
```

### RunState Interface
```typescript
// Getters: score, lives, wave, enemiesKilled, gamePhase
runState.addScore(amount: number): void
runState.loseLife(): void
runState.nextWave(): void
runState.recordKill(): void
runState.setPhase(phase: GamePhase): void
runState.reset(): void           // resets all fields to initial values
runState.snapshot(): RunStateData  // returns shallow copy for HUD sync
```

### HUD API (for Plan 05 StateManager)
```typescript
hud.sync(state: RunStateData): void   // update score/lives/wave text
hud.showOverlay(html: string): void   // show full-screen overlay with arbitrary HTML
hud.hideOverlay(): void               // hide overlay
hud.showWaveAnnouncement(wave: number): void  // "WAVE N" + auto-dismiss after 2s
```

### Player Invincibility Flash
```typescript
// In CollisionSystem.update():
player.mesh.visible = Math.floor(this.playerInvincibility / 0.1) % 2 === 0;
// Flickers at 10Hz (visible 0.1s, invisible 0.1s) for 1.5s PLAYER_INVINCIBILITY_DURATION
```

## Task Commits

1. **Task 1: RunState, MetaState, HUD, SpawnSystem** - `a86212c` (feat)
2. **Task 2: CollisionSystem + Game.ts wiring** - `7748a1b` (feat)

## Files Created/Modified

- `src/systems/CollisionSystem.ts` — AABB collision, player invincibility, bullet pool release
- `src/state/RunState.ts` — Volatile run-level state singleton (score, lives, wave, etc.)
- `src/state/MetaState.ts` — Zustand 5 persist store, highScore + metaCurrency
- `src/ui/HUD.ts` — DOM HUD controller with overlay support
- `src/systems/SpawnSystem.ts` — Wave-clear detection and next-wave spawning
- `src/core/Game.ts` — Full rewrite: all Phase 1 systems wired into complete combat loop

## Decisions Made

- **RunState plain TS singleton:** Volatile — discarded on run end, never localStorage. Plain object is simpler, faster, and appropriate for ephemeral run data.
- **MetaState Zustand 5 persist:** Only persistent store in Phase 1. Schema versioned from day one (saveVersion=1) for Phase 4 migration hook.
- **HUD is DOM, not Three.js:** Absolutely-positioned divs in `#hud`. Direct textContent mutation — no framework, no geometry, no draw calls.
- **CollisionSystem owns invincibility:** The 1.5s countdown is collision-system state, not Player entity state — keeps entity layer clean and collision logic self-contained.
- **SpawnSystem returns boolean:** `update()` returns `isTransitioning` so Game.ts can skip AI for the 2.5s wave gap without adding a field to Game.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RunState.ts imports RunStateData from types.ts instead of redefining**
- **Found during:** Task 1 implementation
- **Issue:** types.ts already defines `RunStateData` and `GamePhase`. Plan's RunState.ts defined its own `RunStateData` interface — a duplicate type would cause confusion and potential future divergence.
- **Fix:** RunState.ts imports `RunStateData` and `GamePhase` from `../utils/types` and re-exports `RunStateData` for consumers who import from RunState.
- **Files modified:** `src/state/RunState.ts`
- **Committed in:** `a86212c` (Task 1)

**2. [Rule 1 - Bug] Removed constructor shorthand `private readonly container` in Game.ts**
- **Found during:** Task 2 implementation
- **Issue:** Plan's `constructor(private readonly container: HTMLElement)` declares `container` as a class property via TypeScript parameter shorthand, but the value is never read — TypeScript strict mode raised TS6138.
- **Fix:** Changed to `constructor(container: HTMLElement)` — passes to SceneManager without declaring as property.
- **Files modified:** `src/core/Game.ts`
- **Committed in:** `7748a1b` (Task 2)

---

**Total deviations:** 2 auto-fixed (Rule 1 - Bug: type duplication and unused property)
**Impact:** No behavioral changes. Both fixes improve type hygiene.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None. Run `npm run dev` to launch Vite dev server. Expected combat loop behavior:
- Spacebar fires player bullets (white rectangles) upward
- Bullets that hit enemies: enemy disappears from formation, SCORE increments
- Enemy bullets that hit player: LIVES decrements, player flashes for 1.5s
- Kill all 40 enemies: "WAVE 2" announcement, then new formation spawns
- Lose all 3 lives: GAME OVER overlay with score/wave/kills; press R to restart
- HUD always visible: SCORE top-left, WAVE top-center, LIVES top-right

## Next Phase Readiness

- Plan 05 (StateManager/pause) uses `hud.showOverlay()` / `hud.hideOverlay()` — API provided
- Plan 05 can replace `Game.isGameOver`/`isPaused` boolean flags with proper StateManager
- MetaState `ssix_v1` schema includes `saveVersion` field — Phase 4 migration hook ready
- `runState.snapshot()` provides immutable read for any future UI or analytics consumer
- All Phase 1 requirements CORE-03, CORE-04, CORE-05, CORE-09, CORE-10 implemented

## Self-Check: PASSED

- FOUND: src/systems/CollisionSystem.ts
- FOUND: src/state/RunState.ts
- FOUND: src/state/MetaState.ts
- FOUND: src/ui/HUD.ts
- FOUND: src/systems/SpawnSystem.ts
- FOUND: src/core/Game.ts
- FOUND commit: a86212c (Task 1)
- FOUND commit: 7748a1b (Task 2)

---
*Phase: 01-engine-core-combat*
*Completed: 2026-03-02*
