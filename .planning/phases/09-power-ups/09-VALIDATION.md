---
phase: 09
slug: power-ups
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-10
updated: 2026-03-13
---

# Phase 09 — Validation Strategy

> Retroactively validated against the shipped Phase 9 implementation on 2026-03-13.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts src/systems/HomingMissileManager.test.ts src/state/RunState.test.ts src/ui/HUD.test.ts src/states/PlayingState.test.ts src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts src/entities/PickupToken.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds for the targeted Phase 9 suite in the current workspace |

## Sampling Rate

- **After every task commit:** Run the targeted Phase 9 Vitest command
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** <30 seconds for the phase-targeted suite in the current setup

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PWR-01 | unit | `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts` | ✅ | ✅ green |
| 09-01-02 | 01 | 1 | PWR-02 | unit + integration | `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts` | ✅ | ✅ green |
| 09-02-01 | 02 | 2 | PWR-03 | unit | `npx vitest run src/systems/HomingMissileManager.test.ts` | ✅ | ✅ green |
| 09-02-02 | 02 | 2 | PWR-04 | unit + integration | `npx vitest run src/systems/HomingMissileManager.test.ts src/states/PlayingState.test.ts` | ✅ | ✅ green |
| 09-03-01 | 03 | 2 | PWR-05 | unit | `npx vitest run src/state/RunState.test.ts src/states/PlayingState.test.ts` | ✅ | ✅ green |
| 09-03-02 | 03 | 2 | PWR-06 | unit + DOM integration | `npx vitest run src/ui/HUD.test.ts src/states/PlayingState.test.ts` | ✅ | ✅ green |
| 09-04-01 | 04 | 3 | PWR-07 | unit | `npx vitest run src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts` | ✅ | ✅ green |
| 09-04-02 | 04 | 3 | PWR-08 | unit | `npx vitest run src/entities/PickupToken.test.ts` | ✅ | ✅ green |

## Wave 0 Requirements

Existing infrastructure covers all Phase 9 requirements.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Piercing rail trail is readable at gameplay speed | PWR-02 | visual feel and bloom readability | Start a run, activate piercing shot, fire through a two-enemy line, confirm elongated trail and connected hit read |
| Homing missile curve and reticle feel readable without feeling fully sticky | PWR-03, PWR-04 | target readability and tuning | Activate homing missiles, fire near mixed formations, confirm visible lock marker and conservative steering |
| Time slow tint/desaturation communicates state without obscuring bullets | PWR-06 | aesthetic quality | Trigger time slow during a busy wave, confirm enemies/projectiles slow while player remains crisp and readable |
| Shop card set remains scannable with added power-ups | PWR-07 | UX density | Reach between-wave shop, confirm new entries fit without awkward overflow or unclear purchase state |

## Validation Audit 2026-03-13

| Metric | Count |
|--------|-------|
| Gaps found | 8 |
| Resolved | 8 |
| Escalated | 0 |

### Tests Confirmed

- `src/entities/Bullet.test.ts`
- `src/systems/CollisionSystem.test.ts`
- `src/systems/HomingMissileManager.test.ts`
- `src/state/RunState.test.ts`
- `src/ui/HUD.test.ts`
- `src/states/PlayingState.test.ts`
- `src/systems/ShopSystem.test.ts`
- `src/systems/PowerUpManager.test.ts`
- `src/entities/PickupToken.test.ts`

### Notes

- The earlier validation file was an execution-time draft. It has now been reconciled against the shipped code and the existing green test suite.
- Targeted validation passed on 2026-03-13:
  - `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts src/systems/HomingMissileManager.test.ts src/state/RunState.test.ts src/ui/HUD.test.ts src/states/PlayingState.test.ts src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts src/entities/PickupToken.test.ts`
  - `npx tsc --noEmit`
- Vitest emitted two non-blocking environment warnings during the rerun:
  - object pool exhaustion warning from an intentional test case in `src/entities/Bullet.test.ts`
  - Node `--localstorage-file` warning from the current test environment

## Validation Sign-Off

- [x] All phase requirements have automated verification
- [x] Sampling continuity maintained across all four plans
- [x] Existing infrastructure covered all missing references
- [x] No watch-mode flags
- [x] Feedback latency is acceptable for a targeted retro-validation run
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-13
