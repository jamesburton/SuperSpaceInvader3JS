---
phase: 06-foundation
plan: 03
subsystem: audio
tags: [howler, audio, sfx, bgm, wiring, typescript]

# Dependency graph
requires:
  - phase: 06-02
    provides: "AudioManager singleton (init/playBgm/stopBgm/playSfx API)"
provides:
  - "AudioManager initialized in Game.ts — called once on startup"
  - "BGM plays during gameplay (PlayingState.enter), stops on game over and menu return"
  - "7 SFX triggers wired: shoot, enemyDeath, playerHit, pickup, waveStart, bossPhase, gameOver"
affects:
  - "06-04 (volume controls in pause overlay — audioManager.setVolume/setMuted already available)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SFX triggered at signal read sites (wasHitThisStep, consumePickupName, phaseJustChanged) — not per-frame"
    - "BGM lifecycle: playBgm() on PlayingState.enter(), stopBgm() on GameOverState.enter() + TitleState.enter()"
    - "AudioManager singleton import pattern — direct module import at each callsite"

key-files:
  created: []
  modified:
    - src/core/Game.ts (audioManager.init() call in init())
    - src/states/PlayingState.ts (audioManager import + playBgm + playerHit + pickup + bossPhase SFX)
    - src/states/GameOverState.ts (audioManager import + stopBgm + playSfx('gameOver'))
    - src/states/TitleState.ts (audioManager import + stopBgm in enter())
    - src/systems/WeaponSystem.ts (audioManager import + playSfx('shoot') after recordFire())
    - src/systems/CollisionSystem.ts (audioManager import + playSfx('enemyDeath') in kill block)
    - src/ui/HUD.ts (audioManager import + playSfx('waveStart') in showWaveAnnouncement())

key-decisions:
  - "gameOver SFX placed in GameOverState.enter() not in PlayingState.triggerGameOver() — avoids duplicate call since both victory and defeat route through GameOverState"
  - "BGM starts in PlayingState.enter() after _spawnBunkers() — always follows a user gesture so AudioContext is already unlocked"
  - "TitleState.enter() calls stopBgm() defensively — handles BGM cleanup if user navigates back mid-run"

requirements-completed: [AUD-02, AUD-03]

# Metrics
duration: ~3min
completed: 2026-03-07
---

# Phase 6 Plan 03: AudioManager Wiring Summary

**AudioManager wired into 7 game systems — game transforms from silent to sonically alive with BGM during gameplay and SFX on all combat and flow events**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-07T10:11:55Z
- **Completed:** 2026-03-07T10:14:34Z
- **Tasks:** 2
- **Files modified:** 7 (Game.ts, PlayingState.ts, GameOverState.ts, TitleState.ts, WeaponSystem.ts, CollisionSystem.ts, HUD.ts)

## Accomplishments

- AudioManager.init() called once in Game.ts init() — registers AudioContext unlock listener
- BGM starts on PlayingState.enter() after _spawnBunkers() — user gesture already occurred
- BGM stops in GameOverState.enter() (defeat and victory paths) and TitleState.enter() (return to menu)
- playSfx('gameOver') triggers in GameOverState.enter() on both defeat and victory
- playSfx('shoot') triggers in WeaponSystem.update() inside canFire() guard — once per actual shot
- playSfx('enemyDeath') triggers in CollisionSystem.update() inside enemy.health <= 0 block
- playSfx('playerHit') triggers in PlayingState.update() on wasHitThisStep() — both normal and boss mode
- playSfx('pickup') triggers in PlayingState.update() on consumePickupName()
- playSfx('waveStart') triggers in HUD.showWaveAnnouncement() at start of wave announcement
- playSfx('bossPhase') triggers in PlayingState.update() on bossSystem.phaseJustChanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize AudioManager and wire BGM lifecycle** - `00f23c4` (feat)
2. **Task 2: Wire SFX into combat and game flow events** - `e8dc748` (feat)

## Files Created/Modified

- `src/core/Game.ts` — audioManager.init() added before TitleState launch
- `src/states/PlayingState.ts` — audioManager import + playBgm() in enter() + 4 playSfx() calls in update()
- `src/states/GameOverState.ts` — audioManager import + stopBgm() + playSfx('gameOver') in enter()
- `src/states/TitleState.ts` — audioManager import + stopBgm() in enter()
- `src/systems/WeaponSystem.ts` — audioManager import + playSfx('shoot') after recordFire()
- `src/systems/CollisionSystem.ts` — audioManager import + playSfx('enemyDeath') in kill block
- `src/ui/HUD.ts` — audioManager import + playSfx('waveStart') in showWaveAnnouncement()

## Decisions Made

- **gameOver SFX in GameOverState.enter()** — Both triggerVictory() and triggerGameOver() in PlayingState route to GameOverState, so placing the SFX here ensures it fires for both outcomes without needing to be called twice. The plan's guidance to not add it in triggerGameOver() was followed exactly.
- **TitleState defensive stopBgm()** — Calling stopBgm() in TitleState.enter() is safe even when no BGM is playing (Howler handles no-op gracefully) and correctly stops BGM if a user somehow navigates back without triggering GameOverState.

## Deviations from Plan

### Observed During Execution

**1. [Pre-existing] M-key mute toggle already present in PlayingState.update()**
- **Found during:** Task 2 implementation review
- **Context:** PlayingState.ts was automatically modified (likely by a previous code generation pass) to include an M-key mute shortcut block (`audioManager.setMuted(!audioManager.isMuted)`) in update() — this is plan 06-04 content
- **Action:** Kept as-is since it compiles cleanly and is correct behavior. No fix needed.
- **Impact:** 06-04 M-key wiring is already done — that task in 06-04 can be skipped or is a no-op

**2. [Pre-existing] PausedState.ts already has playSfx('pause')**
- **Found during:** Grep verification of audioManager.playSfx across src/
- **Context:** PausedState.ts already imports audioManager and calls playSfx('pause') — this is 06-04 work done previously
- **Action:** No change needed — already correct
- **Impact:** 06-04 pause SFX wiring is already done

No deviations from this plan's scope. Both observed items are pre-existing work from another execution.

---
*Phase: 06-foundation*
*Completed: 2026-03-07*
