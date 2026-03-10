---
phase: 09-power-ups
verified: 2026-03-10T16:20:00Z
status: human_needed
score: 8/8 requirements implemented
human_verification:
  - test: "Activate piercing shot and fire through two vertically aligned enemies"
    expected: "One elongated rail-style projectile damages the first enemy fully, damages the second enemy at reduced strength, then expires"
    why_human: "Projectile readability and in-motion penetration feel require a running game"
  - test: "Activate homing missile near a mixed formation"
    expected: "A single missile locks the nearest enemy, curves toward it with limited steering, shows a lock reticle, and can still expire before impact"
    why_human: "Targeting feel and reticle readability require a running game"
  - test: "Activate time slow during active enemy fire"
    expected: "Enemies and hostile bullets slow visibly while the player ship and player shots remain crisp at full speed; cool tint fades in and out smoothly"
    why_human: "Selective time-scale feel and renderer/HUD treatment require a running game"
  - test: "Open the between-wave shop after clearing a wave"
    expected: "Piercing shot, homing missile, and time slow appear in the shop, purchasing one activates it immediately, and pickup drops are visually distinguishable in gameplay"
    why_human: "Shop flow and pickup readability require browser gameplay"
---

# Phase 9: Power-Ups Verification Report

**Phase Goal:** Players discover three new power-ups mid-run that each feel mechanically distinct and are clearly communicated through visual feedback
**Verified:** 2026-03-10T16:20:00Z
**Status:** human_needed

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PWR-01 | IMPLEMENTED | `Bullet` now carries piercing metadata and `CollisionSystem` supports a two-hit line-penetration path |
| PWR-02 | IMPLEMENTED | `WeaponSystem` spawns an elongated piercing shot and `ParticleManager` adds a piercing impact streak |
| PWR-03 | IMPLEMENTED | `HomingMissileManager` selects the nearest enemy, applies a capped turn rate, and expires missiles after a fixed lifetime |
| PWR-04 | IMPLEMENTED | `HomingMissileManager` creates and updates a pooled lock reticle per active missile |
| PWR-05 | IMPLEMENTED | `PlayingState` routes hostile systems through `combatTimeScale` while player control and player projectile updates remain on raw dt |
| PWR-06 | IMPLEMENTED | `SceneManager.setTimeSlowEffect()` and `HUD.setTimeSlowEffect()` provide the cool-tinted/desaturated slowdown treatment |
| PWR-07 | IMPLEMENTED | `ShopSystem` exposes piercing shot, homing missile, and time slow as shop purchases and `Game` activates them immediately via callback |
| PWR-08 | IMPLEMENTED | `PickupToken` applies distinct scale/rotation silhouettes for the three new power-ups |

## Automated Verification

- `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts src/systems/HomingMissileManager.test.ts src/state/RunState.test.ts src/ui/HUD.test.ts src/states/PlayingState.test.ts src/systems/ShopSystem.test.ts src/systems/PowerUpManager.test.ts src/entities/PickupToken.test.ts`
- `npx tsc --noEmit`

## Human Verification Required

The code implementation is complete, but the phase still needs browser playtesting for tuning and visual confirmation:

1. Piercing shot readability and two-enemy line behavior
2. Homing missile steering feel, lock readability, and expiry tuning
3. Time slow readability under bloom/CRT with real combat pacing
4. Shop activation flow and pickup recognition in a live run

## Gaps Summary

No code gaps found against the Phase 9 requirements. Remaining work is human verification only.
