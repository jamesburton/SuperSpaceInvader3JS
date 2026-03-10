# Phase 9: Power-Ups - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three new mid-run power-ups: piercing shot, homing missiles, and time slow. Each must feel mechanically distinct, appear in the between-wave shop, and communicate its active state clearly through pickup and gameplay visuals. This phase covers the base versions of those power-ups, not future progression systems, weapon switching frameworks, or permanent unlock gating.

</domain>

<decisions>
## Implementation Decisions

### Homing missile feel
- Base homing missiles are an imperfect hunter, not a fully sticky seeker
- Each shot locks the nearest enemy at fire time
- Base homing fires as a single-missile stream, not paired missiles
- The target lock should use a subtle neon reticle rather than a large arcade marker

### Piercing shot identity
- Piercing shot should read as a neon rail shot rather than a plasma blob or generic bullet upgrade
- Its projectile trail should be clearly elongated compared with normal bullets
- Enemy hit feedback should feel like a brief connected beam through the pierced line
- Base piercing behavior should hit up to two targets: full damage to the first, half damage to the second

### Time slow presentation
- Time slow should feel like synthwave drift rather than a cold tactical freeze or unstable overdrive
- The visual treatment should use desaturation plus a cool tint
- The slowdown should be clearly readable on enemies and projectiles
- Activation should ease in with a soft fade rather than a sharp pulse

### Power-up economy
- The three new power-ups should sit in the shop as peer options beside spread shot, rapid fire, and shield
- Their in-run pickup drops should use the same general drop family/cadence as existing power-ups
- They should read as sidegrades with distinct playstyles, not obvious upgrades over the original three
- Early runs should expose players to them reasonably quickly, with mastery developing over repeated runs

### Claude's Discretion
- Exact visual asset implementation for elongated trails, reticles, and slowdown tint
- Exact balancing values for homing lifetime and turn rate within the already noted conservative range
- Exact durations and shop prices, as long as they preserve sidegrade positioning
- Exact wording/styling for pickup feedback and HUD labels

</decisions>

<specifics>
## Specific Ideas

- Homing should start simple and readable: one missile, nearest lock, imperfect tracking
- Piercing should feel premium but not beam-weapon-level overwhelming
- Time slow should remain stylish and atmospheric while still making dodging visibly easier
- The new power-ups should broaden player expression rather than replacing the original set

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/systems/PowerUpManager.ts`: existing active power-up state, pickup spawn/collection flow, and duration ticking
- `src/config/powerups.ts`: current power-up definition table can be extended with the three new entries
- `src/entities/PickupToken.ts`: existing floating token entity can provide distinct colors/visual variants for new pickup types
- `src/systems/ShopSystem.ts`: existing between-wave shop item pipeline can expose the new power-ups as purchasable run upgrades
- `src/ui/HUD.ts`: existing active power-up name/timer bar can communicate timed states without a new HUD system
- `src/ui/PickupFeedback.ts`: existing pickup announcement overlay can surface the new power-up names immediately on collect

### Established Patterns
- Current power-up flow is pickup-driven with one non-shield timed power-up active at once
- Visual differentiation already exists through projectile color and pickup token emissive color
- Shop upgrades and temporary run effects are already separated conceptually in the codebase
- Prior state decisions already constrain two technical directions: homing uses its own mesh path, and time slow affects enemies/projectiles while the player stays at full speed

### Integration Points
- `src/systems/WeaponSystem.ts`: piercing and homing both alter the player fire path
- `src/systems/CollisionSystem.ts`: piercing needs multi-hit bullet logic and homing may interact with target death/retarget rules
- `src/states/PlayingState.ts`: time slow visual treatment and power-up state sync will surface here
- `src/effects/ParticleManager.ts`: likely location for reinforcing projectile or impact feedback

</code_context>

<deferred>
## Deferred Ideas

- Weapon toggling and additive secondary-fire behavior for homing missiles — already aligned with the separate switchable-weapons todo
- Chip-based or rarity-based progression for improving homing quality/count before permanent unlock
- Upgradeable piercing penetration count and damage falloff progression beyond the base two-target behavior
- Discovery-first permanent unlock flow where collected or rare power-up variants become end-of-run unlock choices

</deferred>

---

*Phase: 09-power-ups*
*Context gathered: 2026-03-10*
