# Phase 1: Engine + Core Combat - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Bootstrap the entire project from scratch: Vite + TypeScript + Three.js scaffolding, core engine systems (game loop, input, object pooling, InstancedMesh rendering), and a fully playable Space Invaders combat loop. Player moves, shoots, and kills enemies. Enemies march in formation and fire back. Lives, score, wave counter, HUD, game over, and pause all work. Visual polish (neon, bloom, particles) is Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Project Scaffolding
- Vite + TypeScript with strict mode enabled
- No framework (React, Vue, etc.) — pure DOM + Three.js
- Entry point: `src/main.ts` bootstraps the game scene

### Folder Structure
```
src/
  core/        — GameLoop, SceneManager, InputManager, ObjectPool
  entities/    — Player, Enemy (base), Bullet classes
  systems/     — CollisionSystem, SpawnSystem, ScoreSystem
  state/       — RunState (volatile per-run module), MetaState (Zustand persist)
  ui/          — HUD class (HTML overlay)
  utils/       — math helpers, constants, types
  main.ts      — entry point
```

### State Management
- **RunState**: Plain TypeScript module-level object — holds score, lives, wave, game phase (playing/paused/gameover). Resets on new run. No Zustand needed — it's volatile.
- **MetaState**: Zustand 5.x with persist middleware — holds meta currency, unlocks, high score. Wired from Phase 1 so the foundation is correct. Only a minimal schema for v1 (meta currency + schema version).
- localStorage schema versioned as `ssix_v1` from day one (migration-safe).

### Game Loop
- `renderer.setAnimationLoop()` wraps requestAnimationFrame
- Fixed-timestep accumulator pattern: `UPDATE_STEP = 1/60`; accumulate delta, run N fixed updates, render with interpolation alpha
- Delta capped at 200ms to prevent spiral-of-death on tab-switch
- InputManager polls keyboard state each frame (Set of held keys via keydown/keyup) — never event-driven for movement decisions

### Enemy Formation
- Classic Space Invaders synchronized march: all enemies move as a unified block
- Direction: left → right; when right edge is reached, drop one row and reverse to left
- March speed: base 60px/s; increases by 8% each time one enemy is destroyed (classic feel)
- Formation grid: 10 columns × 4 rows in Phase 1 (40 enemies)
- Enemies fire randomly: Poisson process, ~1.5 shots/second across the whole formation (increases per wave)
- Enemy base class with `type` field so Phase 3 can extend with archetype behaviors

### Rendering
- OrthographicCamera with visible area matched to a fixed logical resolution (e.g., 800×600 units)
- Enemies rendered as `InstancedMesh` (one InstancedMesh per enemy type, pre-allocated to max wave size)
- Player and bullets as individual `Mesh` objects (low count, not worth instancing)
- Object pool pre-allocated at startup: 64 player bullets, 128 enemy bullets, 256 enemy death placeholder markers
- All geometry/materials stored centrally and reused — no per-instance allocations

### Collision Detection
- AABB (axis-aligned bounding box) — explicit hitbox size per entity type
- Simple O(n²) check per frame in Phase 1 (fine for ≤40 enemies + ~10 bullets)
- CollisionSystem iterates player bullets × enemies, enemy bullets × player
- Spatial partitioning deferred to Phase 3 if needed at higher entity counts

### HUD Rendering
- HTML/CSS overlay (absolutely positioned divs over the canvas)
- Reason: simpler, naturally responsive, Phase 2 can apply CSS neon styling via custom properties
- Three.js TextGeometry avoided — slow, requires async font loading, not worth it for HUD text
- HUD elements: score (top-left), lives (top-right), wave (top-center)
- Game over screen: full-screen HTML overlay with score, wave reached, kills count
- Pause: CSS overlay with semi-transparent background

### Player Ship (Phase 1 Placeholder Visuals)
- Flat `BoxGeometry` chevron shape — recognizable as a ship without any neon polish
- White/light emissive material so it's visible on black background
- Horizontal movement only (left/right within ±360 units from center), no vertical movement
- Movement speed: 300 units/second; instant (no acceleration/deceleration in Phase 1)

### Phase 1 Enemy Visuals
- Simple `BoxGeometry` rectangles, different sizes per row (larger bottom row = heavier enemies)
- Flat white material — readable on black background, easy to distinguish
- No color differentiation yet — Phase 2 assigns neon palettes

### Bullet Visuals
- Tall thin `BoxGeometry` (4×16 units)
- Player bullets: white/bright
- Enemy bullets: slightly different aspect ratio to distinguish at a glance
- No color coding by weapon type yet — Phase 2

### Win/Lose Conditions (Phase 1)
- Player loses a life when hit by an enemy bullet (1-2s invincibility window after hit)
- All lives lost → game over state → show run summary → return to title (or restart)
- Enemies reach the bottom of the screen → immediate game over (classic rule)
- All enemies cleared → next wave spawns with same grid, +1 wave number, increased speed

### Claude's Discretion
- Exact timing of invincibility frames (1-2 seconds — pick what feels right)
- Ship bounding box sizes for collision detection
- Title/main menu implementation detail (can be minimal in Phase 1 — just a "Press Space to Start" overlay)
- Enemy bullet firing distribution (random enemy vs. front-row preference vs. column-based)
- Whether to show a simple "Press Space to Start" title or skip to game loop for Phase 1

</decisions>

<specifics>
## Specific Ideas

- Classic Space Invaders march authenticity matters for Phase 1 — the "speeding up as enemies die" mechanic is core to the tension arc and should be in from the start
- MetaState/Zustand wired in Phase 1 even though meta shop is Phase 4 — the localStorage schema key (`ssix_v1`) must be right from day one to avoid migration pain
- InstancedMesh architecture for enemies is a Phase 1 commitment — cannot retrofit later without rewriting all enemy code

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — completely greenfield. Everything built from scratch.

### Established Patterns
- None yet — Phase 1 establishes all patterns for downstream phases.

### Integration Points
- Phase 2 connects to: Three.js materials on all entities (will swap to emissive neon), HUD CSS classes (will add neon glow), game loop (will add EffectComposer to render pipeline)
- Phase 3 connects to: Enemy base class (will extend with archetype behaviors), SpawnSystem (will add formation-breaking triggers), RunState (will add in-run currency tracking)
- Phase 4 connects to: MetaState (will add meta shop purchases), run-end flow (will add meta currency award)

</code_context>

<deferred>
## Deferred Ideas

- None captured during discussion — smart defaults applied.

</deferred>

---

*Phase: 01-engine-core-combat*
*Context gathered: 2026-03-02*
