---
phase: 10
slug: meta-shop-expansion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 10 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/states/PlayingState.test.ts src/ui/MetaShopUI.test.ts src/config/difficultyRules.test.ts src/config/waveConfig.test.ts src/systems/BossSystem.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~12 seconds once Phase 10 targeted tests exist |

---

## Sampling Rate

- **After every task commit:** Run the Phase 10 targeted Vitest command
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** <15 seconds for phase-targeted feedback

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SHOP-01 | unit + integration | `npx vitest run src/state/MetaState.test.ts src/states/PlayingState.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SHOP-02 | integration | `npx vitest run src/states/TitleState.test.ts src/ui/MetaShopUI.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | SHOP-03 | integration | `npx vitest run src/states/TitleState.test.ts src/states/PlayingState.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | SHOP-04 | unit + integration | `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/ui/MetaShopUI.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | SHOP-05 | unit | `npx vitest run src/config/difficultyRules.test.ts src/states/PlayingState.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 2 | SHOP-06 | unit + integration | `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/ui/MetaShopUI.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-04 | 02 | 2 | SHOP-07 | unit + integration | `npx vitest run src/systems/BossSystem.test.ts src/config/difficultyRules.test.ts src/states/PlayingState.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | SHOP-01, SHOP-02, SHOP-04 | DOM integration | `npx vitest run src/ui/MetaShopUI.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 3 | SHOP-02, SHOP-04 | DOM integration | `npx vitest run src/ui/MetaShopUI.test.ts src/states/TitleState.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/state/MetaState.test.ts` - persistence and setter coverage for difficulty, starting power-up, and any hard-clear unlock marker
- [ ] `src/states/TitleState.test.ts` - run-setup overlay, unlocked difficulty list, remembered selection, and `NONE` power-up path
- [ ] `src/states/PlayingState.test.ts` - fresh-run-only application of extra lives and selected starting power-up
- [ ] `src/ui/MetaShopUI.test.ts` - category tabs, hidden-locked reveal path, and difficulty purchase gating
- [ ] `src/config/difficultyRules.test.ts` - non-mutating Hard/Nightmare transforms for wave and aggression rules
- [ ] `src/systems/BossSystem.test.ts` - generic multi-phase transition coverage and Nightmare third-phase behavior

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meta shop category layout is scannable within ten seconds | SHOP-01, SHOP-02, SHOP-04 | UX scan speed and card density are subjective | Open the meta shop with the expanded catalog, find each category and at least one item in it, and confirm navigation feels faster than the old long-scroll layout |
| Starting power-up chooser feels like a quick pre-run loadout step | SHOP-02, SHOP-03 | menu pacing and wording quality | Start both Campaign and Endless, confirm the chooser appears after mode selection, includes `NONE`, and does not feel buried or interruptive |
| Hard difficulty is clearly harder but still fair | SHOP-05 | tuning/readability judgment | Play early waves on Normal and Hard back to back, confirm faster enemies, extra formation density, and earlier Snipers without immediate frustration |
| Nightmare aggression and extra boss phase are readable | SHOP-07 | encounter feel and visual legibility | Play through a Nightmare boss fight, confirm formation breaks feel more aggressive and the extra boss phase is distinct rather than confusing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
