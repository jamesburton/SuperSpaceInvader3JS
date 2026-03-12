---
phase: 09
slug: power-ups
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/entities/Bullet.test.ts src/state/RunState.test.ts src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts src/entities/PickupToken.test.ts src/systems/HomingMissileManager.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~8 seconds once Phase 9 targeted tests exist |

---

## Sampling Rate

- **After every task commit:** Run the Phase 9 targeted Vitest command
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** <15 seconds for phase-targeted feedback

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | PWR-01 | unit | `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | PWR-02 | unit + integration | `npx vitest run src/entities/Bullet.test.ts src/effects/ParticleManager.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | PWR-03 | unit | `npx vitest run src/systems/HomingMissileManager.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | PWR-04 | unit + integration | `npx vitest run src/systems/HomingMissileManager.test.ts src/states/PlayingState.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | PWR-05 | unit | `npx vitest run src/state/RunState.test.ts src/states/PlayingState.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-02 | 03 | 2 | PWR-06 | unit + DOM integration | `npx vitest run src/states/PlayingState.test.ts src/ui/HUD.test.ts` | ❌ W0 | ⬜ pending |
| 09-04-01 | 04 | 3 | PWR-07 | unit | `npx vitest run src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts` | ❌ W0 | ⬜ pending |
| 09-04-02 | 04 | 3 | PWR-08 | unit | `npx vitest run src/entities/PickupToken.test.ts src/config/powerups.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/systems/CollisionSystem.test.ts` - piercing collision sequencing and release rules
- [ ] `src/systems/HomingMissileManager.test.ts` - target acquisition, steering, expiry, retarget/cleanup
- [ ] `src/systems/PowerUpManager.test.ts` - timed activation, non-stacking behavior, activation callbacks
- [ ] `src/systems/ShopSystem.test.ts` - new shop items and activation purchase flow
- [ ] `src/entities/PickupToken.test.ts` - per-type visual config and token initialization
- [ ] `src/states/PlayingState.test.ts` - selective time scaling orchestration
- [ ] `src/ui/HUD.test.ts` - time slow / power-up indicator behavior if UI logic changes materially

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Piercing rail trail is readable at gameplay speed | PWR-02 | visual feel and bloom readability | Start a run, activate piercing shot, fire through a two-enemy line, confirm elongated trail and connected hit read |
| Homing missile curve and reticle feel readable without feeling fully sticky | PWR-03, PWR-04 | target readability and tuning | Activate homing missiles, fire near mixed formations, confirm visible lock marker and conservative steering |
| Time slow tint/desaturation communicates state without obscuring bullets | PWR-06 | aesthetic quality | Trigger time slow during a busy wave, confirm enemies/projectiles slow while player remains crisp and readable |
| Shop card set remains scannable with added power-ups | PWR-07 | UX density | Reach between-wave shop, confirm new entries fit without awkward overflow or unclear purchase state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
