---
phase: 10
slug: meta-shop-expansion
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-10
updated: 2026-03-13
---

# Phase 10 — Validation Strategy

> Retroactively validated against the shipped Phase 10 implementation on 2026-03-13.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/states/PlayingState.test.ts src/ui/MetaShopUI.test.ts src/config/difficultyRules.test.ts src/config/waveConfig.test.ts src/systems/BossSystem.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~3 seconds for the targeted Phase 10 suite in the current workspace |

## Sampling Rate

- **After every task commit:** Run the targeted Phase 10 Vitest command
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** <5 seconds for the phase-targeted suite in the current setup

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SHOP-01 | unit + integration | `npx vitest run src/state/MetaState.test.ts src/states/PlayingState.test.ts` | ✅ | ✅ green |
| 10-01-02 | 01 | 1 | SHOP-02 | integration | `npx vitest run src/states/TitleState.test.ts src/ui/MetaShopUI.test.ts` | ✅ | ✅ green |
| 10-01-03 | 01 | 1 | SHOP-03 | integration | `npx vitest run src/states/TitleState.test.ts src/states/PlayingState.test.ts` | ✅ | ✅ green |
| 10-02-01 | 02 | 2 | SHOP-04 | unit + integration | `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/ui/MetaShopUI.test.ts` | ✅ | ✅ green |
| 10-02-02 | 02 | 2 | SHOP-05 | unit | `npx vitest run src/config/difficultyRules.test.ts src/states/PlayingState.test.ts src/config/waveConfig.test.ts` | ✅ | ✅ green |
| 10-02-03 | 02 | 2 | SHOP-06 | unit + integration | `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/ui/MetaShopUI.test.ts` | ✅ | ✅ green |
| 10-02-04 | 02 | 2 | SHOP-07 | unit + integration | `npx vitest run src/systems/BossSystem.test.ts src/config/difficultyRules.test.ts src/states/PlayingState.test.ts` | ✅ | ✅ green |
| 10-03-01 | 03 | 3 | SHOP-01, SHOP-02, SHOP-04 | DOM integration | `npx vitest run src/ui/MetaShopUI.test.ts` | ✅ | ✅ green |
| 10-03-02 | 03 | 3 | SHOP-02, SHOP-04 | DOM integration | `npx vitest run src/ui/MetaShopUI.test.ts src/states/TitleState.test.ts` | ✅ | ✅ green |

## Wave 0 Requirements

Existing infrastructure covers all Phase 10 requirements.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meta shop category layout is scannable within ten seconds | SHOP-01, SHOP-02, SHOP-04 | UX scan speed and card density are subjective | Open the meta shop with the expanded catalog, find each category and at least one item in it, and confirm navigation feels faster than the old long-scroll layout |
| Starting power-up chooser feels like a quick pre-run loadout step | SHOP-02, SHOP-03 | menu pacing and wording quality | Start both Campaign and Endless, confirm the chooser appears after mode selection, includes `NONE`, and does not feel buried or interruptive |
| Hard difficulty is clearly harder but still fair | SHOP-05 | tuning/readability judgment | Play early waves on Normal and Hard back to back, confirm faster enemies, extra formation density, and earlier Snipers without immediate frustration |
| Nightmare aggression and extra boss phase are readable | SHOP-07 | encounter feel and visual legibility | Play through a Nightmare boss fight, confirm formation breaks feel more aggressive and the extra boss phase is distinct rather than confusing |

## Validation Audit 2026-03-13

| Metric | Count |
|--------|-------|
| Gaps found | 7 |
| Resolved | 7 |
| Escalated | 0 |

### Tests Confirmed

- `src/state/MetaState.test.ts`
- `src/states/TitleState.test.ts`
- `src/states/PlayingState.test.ts`
- `src/ui/MetaShopUI.test.ts`
- `src/config/difficultyRules.test.ts`
- `src/config/waveConfig.test.ts`
- `src/systems/BossSystem.test.ts`

### Notes

- The earlier validation file was an execution-time draft. It has now been reconciled against the shipped code and the existing green test suite.
- Targeted validation passed on 2026-03-13:
  - `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/states/PlayingState.test.ts src/ui/MetaShopUI.test.ts src/config/difficultyRules.test.ts src/config/waveConfig.test.ts src/systems/BossSystem.test.ts`
  - `npx tsc --noEmit`
- The MetaState tests still emit the expected persist-storage warning in the current test environment, but assertions pass.

## Validation Sign-Off

- [x] All phase requirements have automated verification
- [x] Sampling continuity maintained across all three plans
- [x] Existing infrastructure covered all missing references
- [x] No watch-mode flags
- [x] Feedback latency is acceptable for a targeted retro-validation run
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-13
