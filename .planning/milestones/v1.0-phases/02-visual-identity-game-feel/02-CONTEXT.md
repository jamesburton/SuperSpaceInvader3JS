# Phase 2: Visual Identity + Game Feel - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the functional-but-placeholder Phase 1 visuals into a Neon Tokyo cyberpunk arcade game. Replace flat-white box entities with neon emissive materials, add selective bloom post-processing, build a particle system, and wire feedback systems (screen shake, ship trail, wave announcements) so every action feels responsive. No gameplay changes — pure visual and feel layer.

</domain>

<decisions>
## Implementation Decisions

### Entity visual design
- Abstract geometric shapes per row — specific shapes are Claude's discretion (triangles, diamonds, hexagons, etc.). Each row should be visually distinct at a glance.
- Player ship should fit the same angular/geometric aesthetic — specific design is Claude's discretion.
- Phase 1 BoxGeometry placeholders are fully replaced with proper meshes.

### Wave color palettes
- Wave 1 starts at cyan/ice blue (cold).
- Palettes escalate progressively toward crimson (hot peak) as waves increase.
- **Endless mode:** palette cycles back to cyan after reaching peak crimson — continuous loop.
- **Campaign/boss mode (when Phase 4/5 lands):** palette builds up to the boss, resets to cyan after the boss is defeated. The palette system should support a "reset" call for this.

### Background
- Pure black void — no background geometry for Phase 2.
- Background enhancements (scrolling star field, neon grid, scanlines) are deferred to a future style phase.

### Particle system — death explosions
- Geometric shards — angular fragments, ~6–8 per kill (tight burst, not a wide spray).
- Shards tumble/rotate as they radiate outward.
- Shard color matches the current wave palette.

### Particle system — other effects
- Muzzle flash on each player bullet fired.
- Player ship engine trail during horizontal movement.
- All particles added to bloom selection so they glow.

### Bloom
- Selective bloom (pmndrs/postprocessing `SelectiveBloomEffect`) — only 3D emissive objects glow.
- HUD (DOM overlay) does not glow — it sits outside the Three.js canvas.

### Screen shake
- Small shake on player hit.
- Large shake stub present for boss impact (boss arrives in Phase 4).
- Shake must not obscure readability.

### UI feedback
- Wave announcement: neon-styled "WAVE X" banner colored with the incoming wave's palette, shown for 2–3 seconds.
- BossHealthBar component: stub exists, shown/hidden for Phase 4.
- PickupFeedback component: stub exists, shows swell animation + power-up name text for Phase 3.

### Claude's Discretion
- Specific abstract shapes per enemy row
- Player ship silhouette
- Exact particle shard geometry and tumble physics
- Bloom intensity / threshold values
- Shake duration and falloff curve
- Number of wave palettes before cycle repeats (in Endless mode)

</decisions>

<specifics>
## Specific Ideas

- Palette should feel like a temperature ramp: cyan → teal → green → yellow → orange → crimson. Not random jumps.
- "Tight burst" for death shards — closer to a sharp pop than a wide scatter. Think glass breaking rather than confetti.
- Player ship trail during horizontal movement only (not when stationary).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EnemyFormation` (src/entities/Enemy.ts): uses a single `InstancedMesh` — Phase 2 needs per-row sub-meshes or instance color to differentiate shapes/rows. Comment in Enemy.ts already flags: "Phase 2 will replace with per-row sub-meshes."
- `ObjectPool<T>` (src/core/ObjectPool.ts): particle objects should be pooled through this — no new allocation pattern needed.
- `HUD` (src/ui/HUD.ts): DOM-based, independent of Three.js canvas — style upgrades here don't require bloom changes.
- `SceneManager.render()` (src/core/SceneManager.ts): single `renderer.render(scene, camera)` call — EffectComposer slots in as a drop-in replacement.

### Established Patterns
- Fixed-timestep loop in `Game.ts` — particle `update(dt)` is called on fixed steps; visual interpolation in `render(alpha)`.
- `MeshBasicMaterial` everywhere (Phase 1) → must upgrade to `MeshStandardMaterial` with `emissive` for bloom to pick up the materials.
- State machine renders via `StateManager.render(alpha)` → `PlayingState.render()` calls `ctx.scene.render()` — bloom render replaces this call.

### Integration Points
- `CollisionSystem.ts`: enemy kill events fire here — this is where `particleManager.spawnDeathBurst()` should be called.
- `WeaponSystem.ts` or `SpawnSystem.ts`: bullet spawn events — muzzle flash hooks here.
- `MovementSystem.ts`: player horizontal movement — engine trail start/stop signals come from here.
- `SpawnSystem.ts`: wave spawn events — palette switch and wave announcement trigger here.
- `PlayingState.ts`: render method — must call `renderWithEffects(alpha)` instead of `render()` to route through EffectComposer.

</code_context>

<deferred>
## Deferred Ideas

- **Distinct organic silhouettes per row** (crabs, squids, etc. — classic Space Invaders style but neon) — future visual refinement phase
- **Scrolling star field background** — future background style option
- **Neon grid / scanline overlay** — future background style option
- **Dense confetti particle style** — future particle style option
- **Orb burst particle style** — future particle style option

</deferred>

---

*Phase: 02-visual-identity-game-feel*
*Context gathered: 2026-03-02*
