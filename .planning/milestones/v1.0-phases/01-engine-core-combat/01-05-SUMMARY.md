---
phase: 01-engine-core-combat
plan: 05
subsystem: game-state
tags: [state-machine, fsm, pushdown-automaton, pause, game-over, title-screen]

# Dependency graph
requires:
  - 01-04 (CollisionSystem, RunState, MetaState, HUD showOverlay/hideOverlay, SpawnSystem, fully wired Game.ts combat loop)
provides:
  - StateManager: pushdown automaton FSM with push/pop/replace and enter/update/render/exit/resume lifecycle
  - TitleState: title screen overlay — 'Press SPACE to Start', transitions to PlayingState
  - PlayingState: active gameplay delegator, ESC/P pushes PausedState, lives=0/reachedBottom triggers GameOverState
  - PausedState: pause overlay — freezes all game logic, pops back to PlayingState via resume()
  - GameOverState: final stats screen (score, wave, kills), R key triggers restart via factory callback
  - Game.ts: thin orchestrator — initializes resources, builds PlayingStateContext, starts at TitleState
affects:
  - 02 (Phase 2 visual systems hook into PlayingStateContext.scene and PlayingState.render)
  - 03 (Phase 3 enemy types extend EnemyFormation — wired through same PlayingStateContext)
  - 04 (Phase 4 meta progression — MetaState.updateHighScore already called in PlayingState.triggerGameOver)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pushdown automaton FSM: push preserves current state (no exit), pop restores via resume(), replace clears stack
    - Factory callback to break circular imports — GameOverState receives () => void instead of importing PlayingState
    - PlayingStateContext: single interface bundles all shared entity/system refs, passed to all states
    - State enter()/exit() for overlay show/hide; resume() for overlay hide on unpause

key-files:
  created:
    - src/core/StateManager.ts
    - src/states/TitleState.ts
    - src/states/PlayingState.ts
    - src/states/PausedState.ts
    - src/states/GameOverState.ts
  modified:
    - src/core/Game.ts (rewritten as thin orchestrator — all game logic moved to PlayingState)

key-decisions:
  - "Factory callback pattern in PlayingState.triggerGameOver() eliminates circular import: GameOverState has no import of PlayingState"
  - "PausedState.exit() does NOT hide overlay — PlayingState.resume() handles it, keeping exit/resume responsibilities clean"
  - "StateManager.push() does not call exit() on current state — preserves PlayingState intact for resume"
  - "GameOverState captures final score/wave/kills in constructor before runState.reset() — avoids snapshot timing issue"
  - "Game.ts constructor does NOT declare container as property — it's passed only to SceneManager (TS6138 avoidance from Plan 04)"

patterns-established:
  - "IGameState interface: enter/update/render/exit/resume — all game screens implement this"
  - "PlayingStateContext interface: shared entity/system bundle — future phases extend this for new systems"
  - "State transition diagram: TitleState --SPACE--> PlayingState <--pop-- PausedState; PlayingState --replace--> GameOverState --onRestart--> PlayingState"

requirements-completed: [CORE-06, CORE-07, CORE-08, CORE-11]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 1 Plan 05: StateManager + Game States Summary

**Pushdown automaton FSM with Title/Playing/Paused/GameOver states — complete Phase 1 game loop with pause-resume, invincibility flash, and final stats overlay**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T16:21:04Z
- **Completed:** 2026-03-02T16:23:16Z
- **Tasks:** 2
- **Files created/modified:** 6

## Accomplishments

- StateManager pushdown automaton: push() preserves PlayingState on stack (no exit called), pop() calls exit on PausedState then resume() on PlayingState below — game resumes exactly where it left off
- TitleState: full-screen overlay 'SUPER SPACE INVADERS X / PRESS SPACE TO START', hides overlay on exit (transition to PlayingState)
- PlayingState: all game system delegation (fire input, player movement, spawn, AI, bullet movement, collision, lives check, HUD sync); ESC/P pause gate; triggerGameOver() replaces stack with GameOverState
- PausedState: PAUSED overlay shown in enter(), all game logic frozen (no systems called in update()), ESC/P pops back to PlayingState via resume()
- GameOverState: CORE-11 compliant — final score + wave reached + enemies killed shown; R key restarts via factory callback; no circular import with PlayingState
- Game.ts reduced from 215 lines to 90 lines — purely an orchestrator; all game logic removed to states

## State Transition Diagram

```
TitleState --SPACE--> PlayingState
                      |    ^
                 ESC/P|    |ESC/P (pop + resume)
                      v    |
                      PausedState

PlayingState --lives=0/reachedBottom--> GameOverState --R (onRestart)--> PlayingState (fresh)
```

## PlayingStateContext Interface (for Phase 2+)

```typescript
export interface PlayingStateContext {
  scene: SceneManager;           // Phase 2 visual systems hook here
  player: Player;
  formation: EnemyFormation;     // Phase 3 new enemy types added here
  playerBulletPool: ObjectPool<Bullet>;
  enemyBulletPool: ObjectPool<Bullet>;
  activeBullets: Bullet[];
  movementSystem: MovementSystem;
  aiSystem: AISystem;            // Phase 3 extends with new behaviors
  collisionSystem: CollisionSystem;
  spawnSystem: SpawnSystem;      // Phase 3 extends with wave patterns
}
```

## Circular Import Resolution

The plan flagged a potential circular import: `PlayingState → GameOverState → PlayingState`.

**Solution used:** Factory callback pattern — `PlayingState.triggerGameOver()` passes `() => void` lambda to `GameOverState` constructor. `GameOverState` has no import of `PlayingState` at all. The callback closes over `this.stateManager`, `this.input`, `this.hud`, and `this.ctx` from `PlayingState` scope.

This is cleaner than the `require()` hack suggested in the plan as an alternative.

## Task Commits

1. **Task 1: StateManager and game state classes** - `ae39004` (feat)
2. **Task 2: Wire StateManager into Game.ts** - `97321bb` (feat)

## Files Created/Modified

- `src/core/StateManager.ts` — pushdown automaton FSM, IGameState interface
- `src/states/TitleState.ts` — title overlay, SPACE transitions to PlayingState
- `src/states/PlayingState.ts` — game logic delegator, pause gate, game-over trigger, PlayingStateContext interface
- `src/states/PausedState.ts` — pause overlay, ESC/P pops stack
- `src/states/GameOverState.ts` — CORE-11 stats overlay, factory callback restart
- `src/core/Game.ts` — rewritten as thin orchestrator (all game logic removed to PlayingState)

## Decisions Made

- **Factory callback pattern:** `GameOverState` accepts `onRestart: () => void` instead of importing `PlayingState`. Eliminates circular import cleanly. `PlayingState.triggerGameOver()` passes the lambda.
- **PausedState.exit() does not hide overlay:** `PlayingState.resume()` hides it — keeps enter/exit symmetric and resume semantically correct.
- **GameOverState captures stats in constructor:** `finalScore/finalWave/finalKills` captured before any `reset()` call — avoids snapshot timing hazard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stateManager from GameOverState constructor**
- **Found during:** Task 1 (TypeScript compile)
- **Issue:** GameOverState constructor received `stateManager` as parameter (from plan's initial design), but the factory callback pattern means `stateManager` is never directly used inside `GameOverState` — TypeScript strict mode raised TS6138 (declared but never read).
- **Fix:** Removed `stateManager` from `GameOverState` constructor signature. The `onRestart` callback (passed from `PlayingState.triggerGameOver()`) captures `stateManager` via closure — `GameOverState` does not need direct access.
- **Files modified:** `src/states/GameOverState.ts`, `src/states/PlayingState.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `ae39004` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: unnecessary constructor parameter)
**Impact on plan:** Improves the factory callback pattern's clean separation — GameOverState truly has no StateManager dependency.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None - no external service configuration required. Run `npm run dev` to test:
1. Title screen: "SUPER SPACE INVADERS X / PRESS SPACE TO START"
2. SPACE → formation appears, player controllable
3. ESC/P → PAUSED overlay, action frozen
4. ESC/P again → resumes exactly (position/score/formation preserved)
5. Lose all lives → GAME OVER with score/wave/kills
6. R → restarts cleanly from PlayingState

## Next Phase Readiness

- Phase 2 (Visual Identity): Hook new neon materials into `PlayingStateContext.scene` and override `PlayingState.render()` for post-processing
- Phase 2 can add `EffectComposer` to `SceneManager` — `PlayingState.render()` already calls `ctx.scene.render()` which is the right hook point
- All Phase 1 requirements complete: CORE-01 through CORE-11 (engine, entities, systems, state loop)
- MetaState `updateHighScore()` already called in `PlayingState.triggerGameOver()` — Phase 4 meta progression has a hook

## Self-Check: PASSED

- FOUND: src/core/StateManager.ts
- FOUND: src/states/TitleState.ts
- FOUND: src/states/PlayingState.ts
- FOUND: src/states/PausedState.ts
- FOUND: src/states/GameOverState.ts
- FOUND: src/core/Game.ts (modified)
- FOUND commit ae39004 (Task 1)
- FOUND commit 97321bb (Task 2)

---
*Phase: 01-engine-core-combat*
*Completed: 2026-03-02*
