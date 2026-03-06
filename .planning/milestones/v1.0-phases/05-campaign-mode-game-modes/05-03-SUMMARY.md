---
phase: 05-campaign-mode-game-modes
plan: "03"
subsystem: ui
tags: [titlestate, menu, mode-select, campaign, endless, game-modes]

# Dependency graph
requires:
  - phase: 05-01
    provides: "runState.setMode(), runState.setCampaignLevel() added to RunState"
  - phase: 05-02
    provides: "GameOverState.returnToMenu() bug fix, infrastructure primitives"
provides:
  - "Three-option main menu (Campaign/Endless/Upgrades) with arrow-key nav and letter shortcuts"
  - "_resetAllSystems() ensures full clean slate before any new run from title screen"
  - "runState.setMode() and setCampaignLevel(0) wired into launch path"
affects:
  - "05-04 (level select resume logic builds on TitleState._launchSelected)"
  - "05-05 (campaign progression display on title screen)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OPTIONS array + indexOf for O(n) cycle navigation with modulo wrap"
    - "_renderMenu() re-renders full overlay on each navigation event (stateless HTML rebuild)"
    - "_launchSelected() handles both upgrade-open and game-launch branches"

key-files:
  created: []
  modified:
    - "src/states/TitleState.ts"

key-decisions:
  - "selectedOption persists on TitleState instance — remembered when returning from a run, Campaign is default on fresh instance"
  - "OPTIONS array drives arrow-key cycle order: campaign, endless, upgrades — avoids hardcoded index arithmetic"
  - "Arrow navigation re-renders via _renderMenu() on every change — simplest update model, no DOM diffing needed"
  - "clearJustPressed() called inside _launchSelected() before stateManager.replace() — prevents key ghost from leaking into PlayingState"

patterns-established:
  - "MenuOption union type + const OPTIONS array: extensible for adding more modes without touching cycle logic"
  - "_resetAllSystems() mirrors GameOverState.restartGame() exactly — canonical reset sequence for all launch paths"

requirements-completed: [MODE-03, MODE-01, MODE-04]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 5 Plan 03: TitleState Mode Selection Summary

**Arrow-key-navigable three-option main menu (Campaign/Endless/Upgrades) with neon styling, letter shortcuts, and full system reset before every new run**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T19:26:09Z
- **Completed:** 2026-03-03T19:28:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Rewrote TitleState with Campaign/Endless/Upgrades menu replacing the old "PRESS SPACE TO START" screen
- ArrowUp/ArrowDown navigation with wrap-around; C/E/U letter shortcuts; Space/Enter launches selected
- `_resetAllSystems()` mirrors GameOverState.restartGame() exactly — ensures every title-screen launch starts clean
- `runState.setMode()` and `runState.setCampaignLevel(0)` called before PlayingState construction
- Default selection is Campaign; persists across TitleState instances created on return-from-run

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite TitleState with mode selection UI and system reset** - `beaaf6c` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/states/TitleState.ts` - Full rewrite: three-option neon menu, arrow nav, letter shortcuts, _resetAllSystems(), _launchSelected() with mode routing

## Decisions Made
- `selectedOption` persists on instance — Campaign is default on fresh TitleState; remembered when returning from a run (user's return path rebuilds `new TitleState()` so it resets to Campaign, which is the expected behavior)
- `clearJustPressed()` called inside `_launchSelected()` before `stateManager.replace()` to prevent key ghost bleeding into PlayingState
- `OPTIONS` array drives cycle navigation — easily extensible when mode 4 is added

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled clean on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- TitleState fully wired for campaign/endless branching — ready for Plan 05-04 (level select / resume-from-progress logic in `_launchSelected()`)
- `runState.setCampaignLevel(0)` placeholder in `_launchSelected()` — Plan 05-05 will replace with level-select routing based on `campaignProgress`

## Self-Check: PASSED

- `src/states/TitleState.ts` — FOUND
- `.planning/phases/05-campaign-mode-game-modes/05-03-SUMMARY.md` — FOUND
- Commit `beaaf6c` — FOUND

---
*Phase: 05-campaign-mode-game-modes*
*Completed: 2026-03-03*
