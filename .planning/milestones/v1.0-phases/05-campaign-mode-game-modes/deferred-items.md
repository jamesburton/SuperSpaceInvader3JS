# Deferred Items — Phase 05

## Pre-existing Test Failures (Out of Scope)

**File:** `src/config/waveConfig.ts` + `src/config/waveConfig.test.ts`

**Discovered during:** Plan 05-05 test verification
**Status:** Pre-existing failure from uncommitted changes to waveConfig.ts (modified in working tree before 05-05 execution)
**Failures:**
- `WAVE_CONFIGS has 10 entries` — WAVE_CONFIGS has 12 entries (added for campaign chapter 1)
- `wave 1: rows=3, cols=8, only grunt allowed` — Wave configs have been restructured
- `wave 5: shopAfterThisWave=true, has flanker` — wave compositions changed
- `wave 10: shopAfterThisWave=true, all 6 types` — wave compositions changed
- `wave 3: includes shielder` — wave compositions changed

**Root cause:** waveConfig.ts was modified for campaign support (added entries for chapter 1 levels) but the corresponding test updates were not made. The tests were written to spec the original 10-wave design.

**Action needed:** Update waveConfig.test.ts to match new 12-entry WAVE_CONFIGS array and revised wave compositions, OR lock WAVE_CONFIGS to 10 entries and move campaign-specific wave data elsewhere.
