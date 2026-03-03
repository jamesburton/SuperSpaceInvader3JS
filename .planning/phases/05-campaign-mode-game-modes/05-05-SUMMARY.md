---
phase: 05-campaign-mode-game-modes
plan: "05"
subsystem: ui
tags: [zustand, persist, localStorage, campaign, level-select, migration]

# Dependency graph
requires:
  - phase: 05-01
    provides: RunState mode/campaignLevelIndex, CAMPAIGN_CHAPTER_1 config
  - phase: 05-03
    provides: TitleState with _launchSelected() campaign branch
  - phase: 05-04
    provides: PlayingState recordLevelComplete() forward-compatible stubs
provides:
  - MetaStore SAVE_VERSION 3 with campaignProgress and briefingAutoDismiss persistence
  - recordLevelComplete() action (idempotent, per-chapter max-index tracking)
  - toggleBriefingAutoDismiss() action
  - v2->v3 localStorage migration that seeds both new fields
  - TitleState level select overlay shown when campaignProgress[1] >= 0
  - Level cards with unlock state (greyed out locked levels, pointer-events:none)
  - ESC to cancel level select and return to mode menu
  - window.__campaignLevelSelect global onclick handler for level card selection
affects: [05-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-persist-migration, window-global-onclick-handler, level-select-overlay]

key-files:
  created: []
  modified:
    - src/state/MetaState.ts
    - src/states/TitleState.ts

key-decisions:
  - "campaignProgress[chapterNumber] stores highest levelIndex completed (0-based), not levelNumber — consistent with RunState.campaignLevelIndex"
  - "highestUnlockedStart = progress + 1 — completing index 0 unlocks starting at index 1 (Level 2)"
  - "Level select only shown when highestUnlockedStart > 0 AND < CAMPAIGN_CHAPTER_1.levels.length — prevents showing select after all levels complete"
  - "window.__campaignLevelSelect follows MetaShopUI pattern for onclick in innerHTML-rendered cards"
  - "_levelSelectVisible flag in TitleState tracks open/closed state; ESC handled in update() same frame as MetaShopUI pattern"

patterns-established:
  - "Zustand persist migration: sequential if(version < N) blocks, each seeding new fields with defaults"
  - "recordLevelComplete idempotent: early return when levelIndex <= current, spread-assign only when higher"

requirements-completed:
  - MODE-04
  - MODE-03

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 05 Plan 05: MetaStore Campaign Progress + TitleState Level Select Summary

**Zustand persist SAVE_VERSION 3 with campaignProgress/briefingAutoDismiss migration and TitleState level select overlay that resumes campaign from any unlocked level**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-03T19:34:54Z
- **Completed:** 2026-03-03T19:40:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended MetaStore with `campaignProgress: Record<number, number>` and `briefingAutoDismiss: boolean` persistent fields
- Added `recordLevelComplete(chapterNumber, levelIndex)` action with idempotent max-index logic; `toggleBriefingAutoDismiss()` action
- Bumped SAVE_VERSION from 2 to 3 with v2->v3 migration seeding both new fields
- Added `_showLevelSelect()` to TitleState: renders chapter 1 level cards with locked/unlocked visual states (opacity 0.3, pointer-events:none for locked), global onclick handler pattern
- ESC cancels level select and returns to mode select overlay; `exit()` cleans up global handler

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend MetaState with campaignProgress and briefingAutoDismiss (SAVE_VERSION 3)** - `4ce6a04` (feat)
2. **Task 2: Add level select resume flow to TitleState** - `8a70002` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/state/MetaState.ts` - Added CampaignProgress type, campaignProgress + briefingAutoDismiss fields, recordLevelComplete() + toggleBriefingAutoDismiss() actions, SAVE_VERSION 3 + v2->v3 migrate branch
- `src/states/TitleState.ts` - Added CAMPAIGN_CHAPTER_1 + useMetaStore imports, _levelSelectVisible field, campaign progress check in _launchSelected(), _showLevelSelect() method, ESC handling in update(), cleanup in exit()

## Decisions Made
- `campaignProgress[chapterNumber]` stores the highest 0-based levelIndex completed, matching `RunState.campaignLevelIndex` convention
- Level select shown only when `highestUnlockedStart > 0 AND < levels.length` — prevents spurious overlay when all 4 levels are complete (progress[1] = 3 means highestUnlockedStart = 4 = levels.length, falls through to level 0 start)
- `window.__campaignLevelSelect` global handler follows the established `window.__metaShopBuy` pattern for onclick in innerHTML-rendered interactive cards
- `_levelSelectVisible` boolean flag on TitleState instance mirrors MetaShopUI.isVisible pattern for update() guard

## Deviations from Plan

None - plan executed exactly as written.

### Out-of-scope Issue Logged to deferred-items.md

Pre-existing test failures in `src/config/waveConfig.test.ts` (5 failures) caused by uncommitted modifications to `src/config/waveConfig.ts` from a prior plan — WAVE_CONFIGS expanded from 10 to 12 entries for campaign support but tests were not updated. These failures existed before 05-05 execution and are unrelated to MetaState/TitleState changes. See `deferred-items.md`.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MetaStore is now MODE-04 complete: campaign progress persists across browser sessions
- TitleState level select is ready for human verification in 05-06
- PlayingState's forward-compatible `recordLevelComplete` stubs will now resolve correctly (method exists in MetaStore)
- Remaining: 05-06 is the final human verification checkpoint for the full campaign mode

---
*Phase: 05-campaign-mode-game-modes*
*Completed: 2026-03-03*
