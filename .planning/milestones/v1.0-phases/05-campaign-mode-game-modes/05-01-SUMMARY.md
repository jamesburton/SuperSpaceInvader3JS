---
phase: "05-campaign-mode-game-modes"
plan: "01"
subsystem: "campaign-data-foundation"
tags: ["campaign", "game-mode", "run-state", "config", "types"]
dependency_graph:
  requires: []
  provides: ["GameMode type", "runState.mode getter/setter", "runState.campaignLevelIndex getter/setter", "CampaignLevel interface", "CampaignChapter interface", "CAMPAIGN_CHAPTER_1 data", "getAlgorithmicWaves() function"]
  affects: ["src/state/RunState.ts", "src/utils/types.ts", "src/config/campaign.ts"]
tech_stack:
  added: []
  patterns: ["data-driven campaign config", "module-level private vars (not RunStateData interface)", "readonly WAVE_CONFIGS direct reference"]
key_files:
  created:
    - src/config/campaign.ts
  modified:
    - src/utils/types.ts
    - src/state/RunState.ts
decisions:
  - "mode and campaignLevelIndex stored as module-level private vars in RunState (not on RunStateData) — mode is internal routing state, not HUD display data, so snapshot() correctly omits it"
  - "CAMPAIGN_CHAPTER_1 uses direct WAVE_CONFIGS array index references, not getWaveConfig() — ensures campaign wave data is a pointer to existing config not a copy with diverged values"
  - "getAlgorithmicWaves() uses levelIndex*0.15 escalation multiplier — campaign levels become progressively harder without manually authoring each wave set"
metrics:
  duration_seconds: 216
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
requirements_satisfied:
  - MODE-01
  - MODE-02
  - CAMP-01
  - CAMP-02
---

# Phase 05 Plan 01: Campaign Data Foundation Summary

**One-liner:** GameMode type + RunState mode/campaignLevelIndex fields + CAMPAIGN_CHAPTER_1 with 4 authored levels referencing existing WAVE_CONFIGS entries.

## What Was Built

Established the data contracts that all other Phase 5 plans depend on:

1. **`src/utils/types.ts`** — Added `GameMode = 'endless' | 'campaign'` type alias
2. **`src/state/RunState.ts`** — Added `_mode` and `_campaignLevelIndex` module-level vars with `mode` and `campaignLevelIndex` getters, `setMode()` and `setCampaignLevel()` mutators, and reset() integration
3. **`src/config/campaign.ts`** (new) — `CampaignLevel` and `CampaignChapter` interfaces, `getAlgorithmicWaves()` algorithmic fallback, and `CAMPAIGN_CHAPTER_1` with Chapter 1's 4 authored levels

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add GameMode type and mode fields to RunState | e0a1fa1 | src/utils/types.ts, src/state/RunState.ts |
| 2 | Create campaign.ts with Chapter 1 data | edc6a3a | src/config/campaign.ts |

## Campaign Chapter 1 Level Breakdown

| Level | Title | Waves | hasBoss | WAVE_CONFIGS used |
|-------|-------|-------|---------|-------------------|
| 1 | Breach Point | 3 | false | [0], [1], [2] |
| 2 | Shield Wall | 4 | false | [3], [4], [5], [6] |
| 3 | Precision Strike | 3 | false | [7], [8], [9] |
| 4 | The Sentinel | 2 | true | [10], [11] |

## Decisions Made

1. **mode stored outside RunStateData** — The `RunStateData` interface drives the HUD snapshot. Mode is routing logic, not display state. Storing mode as module-level vars (`_mode`, `_campaignLevelIndex`) keeps `snapshot()` and HUD unchanged while giving RunState the authority to track game mode.

2. **Direct WAVE_CONFIGS references** — Campaign levels use `WAVE_CONFIGS[n]` direct array access rather than `getWaveConfig()`. This is correct because `getWaveConfig()` returns a derived object for waves beyond index 12; direct access returns the exact authored config, which is what campaign levels should reference.

3. **getAlgorithmicWaves() escalation formula** — `1 + levelIndex * 0.15` gives 15% difficulty step per level, ensuring algorithmic levels (for future chapters or un-authored content) remain proportionally challenging without manual tuning.

## Deviations from Plan

**Pre-existing errors in SpawnSystem.ts (out of scope):**
- TS6133: `levelWaves` declared but never read (SpawnSystem WIP field from earlier campaign work-in-progress)
- TS6133: `levelWaveIndex` declared but never read (same)
- These errors exist in the codebase before this plan and are not caused by my changes
- Deferred to the plan that wires campaign level routing (05-02 or 05-03)

No deviations to the plan's authored tasks.

## Self-Check

Verifying created files and commits exist...

## Self-Check: PASSED

- FOUND: src/config/campaign.ts
- FOUND: src/utils/types.ts
- FOUND: src/state/RunState.ts
- FOUND commit e0a1fa1 (Task 1)
- FOUND commit edc6a3a (Task 2)
