---
phase: "05-campaign-mode-game-modes"
plan: "04"
subsystem: "campaign-orchestration"
tags: ["campaign", "level-briefing", "playing-state", "state-machine", "spawn-system"]
dependency_graph:
  requires:
    - "05-01: GameMode type, runState.mode/campaignLevelIndex, CAMPAIGN_CHAPTER_1 data"
    - "05-02: SpawnSystem.setLevelWaves(), levelCompletePending, InputManager.anyKeyJustPressed()"
  provides:
    - "LevelBriefingState: atmospheric overlay between campaign levels"
    - "PlayingState._setupCampaignLevel(): feeds CampaignLevel waves to SpawnSystem"
    - "PlayingState._onLevelComplete(): routes level-complete to boss or next briefing"
  affects:
    - "src/states/PlayingState.ts"
    - "src/states/LevelBriefingState.ts"
tech_stack:
  added: []
  patterns:
    - "LevelBriefingState pushed onto state stack — pop() calls resume() on PlayingState, then onDismiss() callback advances to next level"
    - "Optional chaining pattern for future MetaStore methods (briefingAutoDismiss, recordLevelComplete) added in Plan 05-05"
    - "Campaign/endless dispatch in enter() and update() — additive changes, endless path unchanged"
key_files:
  created:
    - src/states/LevelBriefingState.ts
  modified:
    - src/states/PlayingState.ts
decisions:
  - "LevelBriefingState uses `as unknown as Record<string, unknown>` cast for MetaStore to access Plan 05-05 future fields (briefingAutoDismiss, toggleBriefingAutoDismiss) without TypeScript errors"
  - "onDismiss callback only calls _setupCampaignLevel() — SpawnSystem naturally spawns the first wave on the next update() cycle when formation is empty, no manual wave spawn needed"
  - "Campaign victory calls recordLevelComplete guarded by typeof check — additive, safe when Plan 05-05 adds the method"
  - "setLevelWaves(null) called explicitly for endless mode in enter() — ensures no stale level override if mode switches between runs"
metrics:
  duration_seconds: 198
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
requirements_satisfied:
  - MODE-02
  - CAMP-01
  - CAMP-02
  - CAMP-03
---

# Phase 05 Plan 04: Campaign Mode Orchestration Summary

**One-liner:** LevelBriefingState overlay + PlayingState campaign routing (_setupCampaignLevel, _onLevelComplete) connects data config from Plan 01 and SpawnSystem from Plan 02 into a playable campaign loop.

## What Was Built

### Task 1: LevelBriefingState (`src/states/LevelBriefingState.ts`) — NEW FILE

Atmospheric level briefing overlay pushed by PlayingState between non-boss campaign levels:

- **enter()**: Shows HUD overlay with level number, title (neon glowing h1), briefingText paragraph, and "PRESS ANY KEY TO BEGIN". Reads `briefingAutoDismiss` from MetaStore (future Plan 05-05 field) with safe fallback to `false`.
- **update()**: Counts down auto-dismiss timer; F key toggles `toggleBriefingAutoDismiss` MetaStore method (guarded); any keypress calls `_dismiss()`.
- **_dismiss()**: Clears justPressed, calls `stateManager.pop()` (which fires `PlayingState.resume()` and `HUD.hideOverlay()`), then calls `onDismiss()` callback.
- **exit()**: Calls `hud.hideOverlay()` for clean teardown.

### Task 2: PlayingState Campaign Orchestration (`src/states/PlayingState.ts`) — MODIFIED

Five additive changes to PlayingState; endless mode path unchanged:

1. **New imports**: `CAMPAIGN_CHAPTER_1`, `getAlgorithmicWaves` from `../config/campaign`; `LevelBriefingState` from `./LevelBriefingState`.

2. **`enter()` extension**: After existing setup, checks `runState.mode`:
   - `'campaign'` → calls `_setupCampaignLevel(runState.campaignLevelIndex)`
   - `'endless'` → calls `setLevelWaves(null)` to clear any previous level override

3. **`update()` extension**: After `spawnSystem.update()` and before shop trigger, checks `levelCompletePending` in campaign mode → calls `_onLevelComplete()` and returns.

4. **`_setupCampaignLevel(levelIndex)`**: Resolves level from `CAMPAIGN_CHAPTER_1.levels[levelIndex]`, falls back to `getAlgorithmicWaves()` if `waves` array absent, calls `spawnSystem.setLevelWaves(waves)`.

5. **`_onLevelComplete()`**: Records level complete (guarded), checks `hasBoss`:
   - `hasBoss: true` → clears bossPending, activates boss, shows BossHealthBar
   - Non-boss → advances `runState.campaignLevelIndex`, pushes `LevelBriefingState` with `onDismiss` callback that calls `_setupCampaignLevel(nextLevelIndex)`

6. **`triggerVictory()` extension**: In campaign mode, calls `recordLevelComplete` (guarded for Plan 05-05) before showing victory screen.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create LevelBriefingState | 3cd860b | src/states/LevelBriefingState.ts |
| 2 | Extend PlayingState with campaign mode orchestration | e5aab37 | src/states/PlayingState.ts |

## Campaign Loop Data Flow

```
TitleState → setMode('campaign') → PlayingState.enter()
  → _setupCampaignLevel(0)
  → spawnSystem.setLevelWaves(WAVE_CONFIGS[0,1,2])  [Level 1: Breach Point]
  → [play 3 waves]
  → levelCompletePending = true
  → _onLevelComplete() → hasBoss:false → push LevelBriefingState(level2)
  → [player presses key]
  → LevelBriefingState._dismiss() → pop() → PlayingState.resume() → onDismiss()
  → _setupCampaignLevel(1) → setLevelWaves(WAVE_CONFIGS[3,4,5,6])  [Level 2: Shield Wall]
  → [play 4 waves] → levelCompletePending → _onLevelComplete() → push Level3 briefing
  → [play 3 waves] → levelCompletePending → _onLevelComplete() → push Level4 briefing
  → [play 2 waves (Level 4: The Sentinel)] → levelCompletePending → hasBoss:true
  → boss.activate() → [boss fight] → triggerVictory()
```

## Decisions Made

1. **Safe MetaStore access pattern** — `briefingAutoDismiss` and `toggleBriefingAutoDismiss` are added to MetaStore in Plan 05-05 (not yet present). Used `as unknown as Record<string, unknown>` cast with `typeof` guards to access these future fields without TypeScript errors. When Plan 05-05 adds them, the code will work automatically.

2. **onDismiss only calls _setupCampaignLevel()** — The plan considered manually spawning the first wave in the callback, but since SpawnSystem naturally spawns a wave when `formation.activeCount === 0` and `levelWaves` is set, calling `_setupCampaignLevel()` is sufficient. The next update() tick handles the spawn.

3. **setLevelWaves(null) in endless mode** — Explicit null call in `enter()` prevents a stale level override if the player goes campaign → endless → campaign. Without this, a restarted endless run could inherit the previous campaign's wave list.

4. **clearBossPending() before boss.activate()** — In `_onLevelComplete()` for hasBoss levels, `clearBossPending()` is called before `boss.activate()`. This prevents a double-trigger if `SpawnSystem.update()` also set `bossPending` on the same tick.

## Deviations from Plan

**None** — plan executed exactly as written. The only adjustment was using `as unknown as Record<string, unknown>` instead of direct `as Record<string, unknown>` cast to satisfy TypeScript's strict overlap check for MetaStore future fields.

## Self-Check

Verifying created/modified files and commits exist...

## Self-Check: PASSED

- FOUND: src/states/LevelBriefingState.ts
- FOUND: src/states/PlayingState.ts
- FOUND commit 3cd860b (Task 1 — LevelBriefingState)
- FOUND commit e5aab37 (Task 2 — PlayingState campaign orchestration)
- TypeScript: zero errors (npx tsc --noEmit passed clean)
