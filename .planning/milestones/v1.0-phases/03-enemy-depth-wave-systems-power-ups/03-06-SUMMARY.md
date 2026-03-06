---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "06"
subsystem: collision-weapon-powerups
tags: [three.js, collision, weapon, power-up, spread-shot, rapid-fire, shielder]

# Dependency graph
requires:
  - phase: 03-03
    provides: PowerUpManager (trySpawnDrop, collectPickup, isActive, consumeShieldCharge, getActiveTokens), PickupToken
  - phase: 03-04
    provides: AISystem, Enemy.shieldActive/shieldHp fields, EnemyFormation.getEnemyWorldPos

provides:
  - CollisionSystem with Shielder two-phase shield destruction (shieldHp decrement before body damage)
  - CollisionSystem SID currency drops on every enemy kill via runState.addCurrency(def.sidDropAmount)
  - CollisionSystem pickup token AABB collision + consumePickupName() auto-reset-on-read
  - CollisionSystem shield power-up absorb (consumeShieldCharge intercepts before loseLife())
  - CollisionSystem.setPowerUpManager() setter injection
  - WeaponSystem spread shot (3 angled bullets at -0.25, 0, +0.25 rad, blue 0x0088ff)
  - WeaponSystem rapid fire (0.08s cooldown override via player.setFireCooldown)
  - Player.setFireCooldown(v) direct cooldown override method
  - PlayingStateContext with weaponSystem and powerUpManager fields
  - Game.ts fully wired: WeaponSystem, PowerUpManager constructed and injected

affects:
  - 03-07 (ShopSystem, PickupFeedback — consumePickupName hook ready)
  - 03-08 (PlayingState integration, powerUpManager.update already called)
  - 03-09 (human verification of full power-up + Shielder gameplay)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - WeaponSystem is now canonical player fire path (PlayingState no longer inlines firing)
    - Spread shot: vx/vy decomposition from angle offset — same bullet pool, vx overridden post-init()
    - Shield absorb: consumeShieldCharge() returns bool — CollisionSystem uses continue to skip loseLife()
    - Shielder phasing: shield burst uses 0xff00ff magenta distinct from death burst palette color
    - PowerUpManager setter injection on CollisionSystem mirrors setParticleManager pattern

key-files:
  created: []
  modified:
    - src/systems/CollisionSystem.ts
    - src/systems/WeaponSystem.ts
    - src/entities/Player.ts
    - src/states/PlayingState.ts
    - src/core/Game.ts

key-decisions:
  - "WeaponSystem.update() replaces PlayingState inline fire block — Phase 3 canonical fire path with optional particleManager and powerUpManager params"
  - "Shielder shield pop burst uses 0xff00ff (magenta hardcoded) — distinct from wave palette death burst, visually indicates shield not kill"
  - "Rapid fire uses player.setFireCooldown(0.08) after recordFire() — overrides standard cooldown without touching fireCooldownMultiplier (shop stat)"
  - "Spread center bullet keeps default white color; only angled bullets get blue tint — center shot visually matches standard fire"
  - "Pickup AABB collision gated by playerInvincibility <= 0 — prevents collecting pickup during invincibility flash frames"

patterns-established:
  - "consumePickupName() auto-reset-on-read matches wasHitThisStep() pattern — single poll per step, no separate clear call"
  - "powerUpManager.update(dt) called in PlayingState.update() for token drift + duration tick (not in Game loop directly)"

requirements-completed: [ENEMY-02, PWR-01, PWR-02, PWR-03, PWR-04]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 3 Plan 06: Collision and Weapon Power-Up Wiring Summary

**CollisionSystem extended with Shielder two-phase destruction, pickup token AABB detection, shield hit absorption, and SID currency drops; WeaponSystem refactored as canonical fire path with spread shot (3-way angled blue bullets) and rapid fire (0.08s cooldown override)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T03:57:44Z
- **Completed:** 2026-03-03T04:01:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- CollisionSystem wired with PowerUpManager via setter injection: Shielder shield phasing (shieldHp decrements before body damage; magenta burst on shield destruction), SID drops via runState.addCurrency on every kill, trySpawnDrop probabilistic pickup spawning, pickup AABB detection with consumePickupName() auto-reset hook, shield absorb intercepting enemy bullets before loseLife()
- WeaponSystem refactored to canonical player fire path: spread shot fires 3 angled bullets with vx decomposition (blue 0x0088ff tint on angled bullets), rapid fire overrides cooldown to 0.08s via Player.setFireCooldown(); PlayingState removes inline fire block and delegates to weaponSystem.update()
- Game.ts fully wired: WeaponSystem and PowerUpManager constructed, powerUpManager injected into collisionSystem.setPowerUpManager() and bloom registration; PlayingStateContext extended with weaponSystem and powerUpManager

## Task Commits

1. **Task 1: Extend CollisionSystem** - `4b38002` (feat)
2. **Task 2: Extend WeaponSystem with spread shot and rapid fire** - `55a4191` (feat)

## Files Created/Modified

- `src/systems/CollisionSystem.ts` - Shielder phasing, pickup collision, shield absorb, SID drops; setPowerUpManager(), consumePickupName()
- `src/systems/WeaponSystem.ts` - Canonical fire path; spread shot (3-way, vx decomposition, blue tint); rapid fire (0.08s cooldown override); optional particleManager and powerUpManager params
- `src/entities/Player.ts` - Added setFireCooldown(v) for direct cooldown override without touching fireCooldownMultiplier
- `src/states/PlayingState.ts` - PlayingStateContext + weaponSystem/powerUpManager fields; inline fire removed; weaponSystem.update() call; powerUpManager.update(dt) for token drift
- `src/core/Game.ts` - WeaponSystem and PowerUpManager constructed; setPowerUpManager wiring; powerUpManager bloom registration; ctx extended

## Decisions Made

- WeaponSystem.update() replaces PlayingState inline fire block — Phase 3 canonical fire path with optional params (no signature break for callers that don't have powerUpManager yet)
- Shielder shield pop burst uses 0xff00ff magenta hardcoded — distinct from wave palette death burst, visually signals shield destruction not enemy kill
- Rapid fire uses player.setFireCooldown(0.08) after recordFire() — overrides standard cooldown without disrupting fireCooldownMultiplier (shop upgrade stat)
- Spread center bullet keeps default white color; only angled bullets get blue tint — center shot matches standard fire behavior visually
- Pickup AABB collision gated by playerInvincibility <= 0 — prevents accidental pickup collection during invincibility frames after getting hit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CollisionSystem.consumePickupName() hook ready for Plan 03-07 PickupFeedback.showPickup() wiring
- powerUpManager.update(dt) already called in PlayingState — token drift and duration tick active
- Plan 03-07 (ShopSystem + ShopUI + HUD) can wire shopPending trigger into PlayingState without CollisionSystem/WeaponSystem changes
- Plan 03-08 integration: powerUpManager and weaponSystem already in ctx — no wiring changes needed

---
*Phase: 03-enemy-depth-wave-systems-power-ups*
*Completed: 2026-03-03*
