# Phase 9 Research: Power-Ups

## Scope and Intent

Phase 9 adds three mid-run power-ups for v1.1:

- Piercing shot (`PWR-01`, `PWR-02`)
- Homing missiles (`PWR-03`, `PWR-04`)
- Time slow (`PWR-05`, `PWR-06`)
- Shop exposure for all new power-ups (`PWR-07`)
- Distinct pickup visuals for all new power-ups (`PWR-08`)

The phase context constrains this work to base implementations only. Do not expand into weapon switching, additive secondary-fire loadouts, permanent unlock gating, or progression variants.

## Current Architecture Baseline

The existing power-up flow is simple and opinionated:

- `src/systems/PowerUpManager.ts` owns pickup token pooling, random drop spawning, timed duration ticking, and shield charges.
- Only one non-shield timed power-up can be active at once. Last collected wins.
- `src/systems/WeaponSystem.ts` reads `PowerUpManager.isActive()` and currently only branches for `spreadShot` and `rapidFire`.
- `src/systems/CollisionSystem.ts` assumes player projectiles are single-hit bullets. On first enemy overlap, the bullet is consumed.
- `src/entities/PickupToken.ts` currently renders every pickup as the same diamond mesh with per-type color only.
- `src/ui/HUD.ts` already supports timed power-up label + duration bar and shield charge display.
- `src/ui/PickupFeedback.ts` already shows pickup names on collection.
- `src/states/PlayingState.ts` is the orchestration point for weapon fire, bullet movement, AI, boss updates, collision, particles, pickup feedback, and HUD sync.

This means the phase is not starting from zero, but all three new power-ups cross existing assumptions in different ways.

## Hard Constraints for Planning

### 1. Preserve the current active-power-up model

The repo explicitly keeps one non-shield timed power-up active at a time. Phase 9 should extend that model, not replace it with stacking or multi-weapon state.

Implication:

- Piercing, homing, and time slow should behave like `spreadShot` and `rapidFire`: timed, mutually exclusive, HUD-visible effects.

### 2. Homing missiles should not reuse the current bullet mesh path

Project state already records this decision:

- Homing missiles should use their own dedicated small `InstancedMesh`.
- The shared `Bullet` mesh path has no rotation support and is a poor fit for a turning missile plus lock-on presentation.

Implication:

- Planner should treat homing as a separate projectile subsystem, not as a minor `Bullet` flag.

### 3. Time slow is selective, not global

Project state also already fixes the direction:

- Enemies and enemy projectiles should receive slowed time.
- Player movement and firing stay on raw time.

Implication:

- Do not introduce a blanket global `runState.timeScale` that affects player, HUD, shop, or power-up durations.
- The slow effect should be applied per system in `PlayingState`.

### 4. Pickup distinction likely requires silhouette changes, not just colors

`PickupToken` currently differentiates power-ups only by emissive color. That is probably insufficient for `PWR-08` because the new requirement says each new power-up must be distinguishable at a glance.

Implication:

- Planner should assume at least one of: per-type geometry, scale/aspect changes, extra child mesh, icon overlay, or materially different rotation/profile.

### 5. The shop currently sells stat upgrades, not timed power-ups

`src/systems/ShopSystem.ts` currently exposes permanent-for-run stat modifiers and callbacks like shield charge / bunker repair. It does not currently sell timed power-up activations.

Implication:

- Phase 9 needs a bridge from shop purchase to temporary power-up activation.
- The planner should verify whether context requires backfilling the original timed power-ups into the shop family as well, because the context says the new three should be peer options beside spread shot, rapid fire, and shield.

## Affected Systems and Likely Changes

## Core Type and Data Layer

- `src/config/powerups.ts`
  - Extend `PowerUpType` union with `piercingShot`, `homingMissile`, and `timeSlow`.
  - Add display names, durations, and colors for HUD/pickup feedback/token tint.
  - This file becomes the central registry for Phase 9 naming and timing.

- `src/systems/PowerUpManager.ts`
  - No major model rewrite needed.
  - Extend random drop selection and activation queries to the three new types.
  - Keep timed activation semantics and shield special-case intact.
  - Likely add a helper for shop activation callbacks so `ShopSystem` does not hard-import power-up logic directly.

## Piercing Shot

- `src/systems/WeaponSystem.ts`
  - Add a piercing fire branch for player fire.
  - The simplest fit is still to spawn standard player bullets but mark them as piercing-capable.

- `src/entities/Bullet.ts`
  - Likely needs extra projectile metadata for Phase 9 if piercing continues to use `Bullet`:
  - projectile kind / visual variant
  - remaining penetrations
  - damage scalar for second hit
  - possible elongation or axis scale metadata for visual trail

- `src/systems/CollisionSystem.ts`
  - This is the main implementation seam for `PWR-01`.
  - Current logic always consumes player bullets on the first enemy overlap.
  - Piercing requires:
  - not consuming the bullet on first valid enemy hit
  - tracking which enemies a bullet has already hit
  - applying full damage to the first target and half damage to the second
  - consuming the projectile only after its pierce budget is exhausted or it exits bounds
  - preserving Shielder behavior correctly

- `src/effects/ParticleManager.ts`
  - Good place to add the brief connected beam / through-line hit feedback requested by context.

Risk:

- Shielder logic is currently tightly embedded in first-hit bullet consumption. Piercing through a shielded enemy must not accidentally skip the shield phase or double-hit the same target.

## Homing Missiles

- New subsystem likely required, for example:
  - `src/entities/HomingMissile.ts`
  - `src/systems/HomingMissileSystem.ts`

- `src/systems/WeaponSystem.ts`
  - On active `homingMissile`, route player fire into missile spawning instead of standard bullet spawning.
  - Each shot should acquire nearest enemy at fire time only.

- `src/states/PlayingState.ts`
  - Needs to update the missile subsystem every frame.
  - Needs to integrate missile collisions and cleanup into the same loop as other projectiles.

- `src/systems/CollisionSystem.ts` or dedicated missile collision path
  - Planner should decide whether missile collision lives inside `CollisionSystem` or inside a dedicated missile system.
  - A dedicated path is cleaner because missiles have lifetime, turn rate, target references, and reticle coupling.

- `src/entities/Enemy.ts` / formation accessors
  - Missiles need robust read access to live enemy world positions.
  - Target invalidation on enemy death must be handled explicitly.

- Visual layer
  - Add a subtle reticle attached to the currently locked target.
  - Register missile and reticle meshes with bloom if they use emissive materials.

Risk:

- Reusing `activeBullets: Bullet[]` for missiles will create avoidable coupling with culling, collision, and boss-hit assumptions.
- The phase context specifies imperfect tracking, nearest-target lock at fire time, and single-missile stream. The planner should not drift into retargeting swarms or secondary-fire behavior.

## Time Slow

- `src/states/PlayingState.ts`
  - This is the correct orchestration point.
  - Derive a slow factor from `powerUpManager.isActive('timeSlow')`.
  - Feed slowed dt only to enemy-facing systems.

- `src/systems/AISystem.ts`
  - Enemy movement, fire timers, dive timers, and special enemy behavior already scale by `dt`.
  - Passing a scaled `dt` here will slow normal enemy behavior cleanly.

- `src/systems/BossSystem.ts`
  - Boss movement, attack timer, and phase flash timer also scale by `dt`.
  - Boss behavior should likely be slowed as part of "all enemy speed" unless planning explicitly excludes boss encounter behavior.

- `src/systems/MovementSystem.ts`
  - Current bullet movement updates all bullets uniformly.
  - Time slow requires selective scaling:
  - player bullets stay raw-speed
  - enemy bullets use slowed dt
  - likely best implemented inside `updateBullets()` by branching on `bullet.isPlayerBullet`

- Visual treatment
  - Should be controlled from `PlayingState` or a small UI/scene helper.
  - The repo already has CSS-based viewport effects (`CRTManager`) and HUD overlays, so a lightweight overlay or filter is lower-risk than changing the render pipeline.

Risks:

- Slowing `SpawnSystem` transition timers would unintentionally lengthen wave transitions and shop delay. Avoid that unless intentionally desired.
- Slowing `PowerUpManager.update()` would extend time slow duration in game-time rather than real-time. That is probably wrong for a pickup timer.

## Shop and Pickup Presentation

- `src/systems/ShopSystem.ts`
  - Add shop items for the new power-ups and decide whether the original timed power-ups must also become shop items for parity with context.
  - Current system applies stat multipliers directly; temporary power-up purchases should instead delegate into `PowerUpManager`.
  - Best fit is callback injection similar to shield charge / bunker repair.

- `src/core/Game.ts`
  - Wire any new shop callbacks for timed power-up purchase activation.
  - Register new projectile meshes / reticles with bloom.

- `src/ui/ShopUI.ts`
  - Likely no structural rewrite needed if new shop items fit the current list.
  - Planner should still watch list growth and readability.

- `src/entities/PickupToken.ts`
  - Implement distinct visuals for the three new pickups.
  - If Phase 9 also revisits old timed power-ups in shop/drop parity, planner may want a broader pickup visual taxonomy rather than special-casing only new types.

- `src/ui/HUD.ts`
  - Existing timed power-up bar should work unchanged once new defs are added.
  - Only adjust if longer display names need layout consideration.

- `src/ui/PickupFeedback.ts`
  - Existing name-only feedback path is sufficient for this phase.

## Sequencing Guidance

Recommended planning order:

1. Extend power-up definitions and manager support.
2. Implement piercing shot on the existing bullet path first.
3. Implement homing missiles as a separate projectile subsystem.
4. Implement time slow in `PlayingState` with selective dt routing.
5. Add shop purchase activation for new power-ups.
6. Finish pickup visual differentiation and lock-on / slow-state presentation polish.
7. Validate all three effects together for active-power-up override behavior.

Why this order:

- Piercing is the least architectural change and clarifies how far the existing bullet path can stretch.
- Homing is the largest structural addition and should not be mixed into the piercing work.
- Time slow depends on understanding which update loops must remain raw-time.
- Shop registration should happen after the runtime behaviors exist, otherwise purchases cannot be validated meaningfully.

## Planner Watchouts

- Boss path is special-cased in `PlayingState.updateBossCollision()`. If piercing or homing should affect boss damage, planner must explicitly cover that path.
- `activeBullets` is the shared projectile list for both player and enemy bullets. Adding more projectile kinds into that list raises collision and culling complexity quickly.
- `CollisionSystem` currently uses a simple release-after-loop model. Piercing or mixed projectile types may require a more explicit projectile outcome model.
- `PowerUpManager.releaseTokensOnly()` runs on wave transition. Pickup drops do not survive between waves, but active effects do. New systems should match that behavior.
- `PowerUpManager.releaseAll()` is used on continue / full reset. Any new projectile subsystem must also fully reset there.

## Open Decisions the Planner Should Lock Early

- Whether shop parity requires adding existing spread/rapid/shield as explicit shop items alongside the new three.
- Whether homing missiles can target the boss, and whether the boss gets a reticle.
- Whether time slow affects boss behavior and boss bullets. The requirement wording suggests yes.
- Exact implementation of pickup silhouette differentiation for `PWR-08`.
- Whether piercing should use integer damage plus special-case second-hit half damage, or a per-hit scalar path in collision.
- Whether homing missiles should disappear on target death, continue straight, or reacquire. Context implies lock at fire time and imperfect tracking, so no aggressive reacquire by default.

## Validation Architecture

This repo already uses `vitest`, `jsdom`, and mocked `three` entities. Phase 9 validation should follow the same split:

### 1. Pure unit tests

- `src/config/powerups.ts`
  - coverage for new defs and type registration

- `src/systems/PowerUpManager.ts`
  - activation semantics
  - active-power-up override behavior
  - shield remains separate from timed power-ups
  - drop selection includes new types

- `src/systems/ShopSystem.ts`
  - temporary power-up purchase callbacks fire correctly
  - purchase limits / prices / availability stay correct

- `src/systems/MovementSystem.ts`
  - enemy bullets slow under time slow
  - player bullets remain unaffected

### 2. System tests with mocked Three.js

- Piercing collision tests
  - one piercing projectile can hit two enemies in sequence
  - first target takes full damage
  - second target takes half damage
  - bullet is consumed after allowed penetrations
  - Shielder interaction stays correct

- Homing missile steering tests
  - nearest enemy chosen at fire time
  - turn rate is capped
  - missile expires at lifetime cap
  - dead target handling is deterministic

- Time slow orchestration tests
  - `PlayingState` passes slowed dt to AI / boss / enemy projectile movement only
  - player movement and player firing remain raw-time
  - power-up duration still counts down in real time

### 3. DOM/UI tests

- `src/ui/HUD.ts`
  - new power-up names render correctly
  - timer bar color still follows `POWER_UP_DEFS`

- pickup / visual-state helpers
  - time slow overlay toggles and eases in/out
  - lock-on reticle visibility follows current target state

### 4. Manual acceptance pass mapped to requirements

- `PWR-01`, `PWR-02`: collect/buy piercing, fire through aligned enemies, verify elongated trail and two-hit behavior.
- `PWR-03`, `PWR-04`: collect/buy homing, fire near multiple enemies, verify nearest lock, visible curve, reticle, and lifetime expiry without guaranteed hit.
- `PWR-05`, `PWR-06`: collect/buy time slow, verify enemies and enemy bullets visibly slow while player speed stays normal, and visual tint/desaturation eases in.
- `PWR-07`: confirm all new power-ups appear in the between-wave shop and can be purchased.
- `PWR-08`: confirm all new pickup drops are distinguishable at a glance from existing pickups.

## Recommended Plan Shape

The roadmap split still makes sense, but planning should reflect the real architecture:

- 09-01: Piercing shot on current bullet path, including collision semantics and trail feedback
- 09-02: Homing missile subsystem, dedicated rendering path, target lock reticle, and collision/lifetime handling
- 09-03: Time slow selective dt routing plus visual treatment
- 09-04: Shop activation flow, pickup visual differentiation, and final cross-feature validation

That keeps the largest architectural change isolated and leaves shop/presentation work for the point where all runtime behaviors already exist.
