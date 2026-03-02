# Project Research Summary

**Project:** Super Space Invaders X
**Domain:** Browser-based arcade space shooter with roguelite meta-progression (Neon Tokyo cyberpunk aesthetic)
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

Super Space Invaders X is a WebGL arcade shooter built with Three.js in TypeScript, differentiated by a neon cyberpunk visual identity and a layered roguelite progression system. Research confirms this is a well-trodden architecture domain — Three.js community patterns for game loops, InstancedMesh formation rendering, object pooling, and post-processing pipelines are thoroughly documented and validated. The stack is locked: Three.js 0.183.2 with the pmndrs/postprocessing library for bloom, Zustand 5 for state management, Vite 7 for tooling, and three.quarks for particle effects. The key technical differentiator over generic browser shooters is the full WebGL pipeline enabling bloom/glow effects impossible with Canvas2D.

The recommended build order is strict: establish the performance-critical architecture patterns first (object pooling, InstancedMesh, fixed-timestep game loop) before any gameplay content, because retrofitting these onto existing code is a significant rewrite. Core feel — responsive movement, satisfying kill feedback, particle explosions — must be validated in an endless mode before meta-progression systems are touched. The research is clear that developers consistently overbuild meta systems before core feel is proven, producing technically correct roguelite wrappers around gameplay that isn't fun. The "fun bar" milestone — 10 minutes of play without meta unlocks feels engaging — must gate all meta-progression work.

The principal risks are performance-related and architectural. Dynamic point lights per bullet can halve frame rate on integrated GPUs; additive-blended sprites replace them with no visual cost. Global bloom without layer separation washes out the scene. O(n) draw calls from individual enemy meshes must be caught at architecture time, not tuned later. Meta shop currency balance requires designing the full unlock tree before implementing drop rates, and localStorage save data requires schema versioning from day one to survive build redeployments on Itch.io. None of these risks are novel — all have documented solutions.

---

## Key Findings

### Recommended Stack

The stack is a coherent, production-validated combination for 2026 browser game development. Three.js 0.183.2 with TypeScript provides the rendering foundation; named imports (not `import * as THREE`) are mandatory for tree-shaking. Vite 7.3.1 is the correct build tool — native ESM and sub-second HMR for shader iteration are non-negotiable for development velocity on this type of project.

The rendering pipeline relies on `pmndrs/postprocessing` 6.38.3 (not Three.js built-in EffectComposer) because it merges multiple effects into a single shader pass, enabling bloom + glitch + scanline without the 3x fullscreen render cost. WebGL 2 over WebGPU is the correct decision for v1 — WebGPU performance is inconsistent across hardware in 2026 and this game's entity counts are achievable at 60fps with WebGL 2. Migrate to WebGPU only if particle counts need to exceed ~50,000 simultaneous (GPU-side simulation via compute shaders).

**Core technologies:**
- **Three.js 0.183.2**: WebGL renderer, scene graph, InstancedMesh for bulk entities — committed stack choice, no alternative considered
- **TypeScript 5.9.3**: Type safety for complex game systems (roguelite state, artifact definitions, wave scripting) — runtime type errors during a portfolio demo are unacceptable
- **Vite 7.3.1**: Build tool with native ESM, HMR for shader iteration — requires Node.js 20.19+
- **pmndrs/postprocessing 6.38.3**: Single-pass bloom, glitch, and scanline effects — outperforms Three.js built-in EffectComposer at equal visual quality
- **three.quarks 0.17.0**: Batch-rendered particle systems for explosions, trails, muzzle flash — has visual editor at quarks.art
- **Zustand 5.0.11**: Minimal-boilerplate state management with persist middleware for localStorage serialization — domain-sliced stores (MetaState separate from RunState)
- **OrthographicCamera**: Required for 2D-plane gameplay — eliminates depth distortion, makes hitbox math exact

**Critical version note:** `@types/three` must be locked to the same minor version as `three` (0.183.x). Mismatch causes phantom TypeScript errors.

See `.planning/research/STACK.md` for full patterns and installation details.

### Expected Features

Research identifies a clear split between table stakes (genre expectations) and differentiators (what makes this portfolio-worthy). The most important finding: 60fps is not optional — browser shooter research documents a 31% session-length increase at 60fps vs sub-60fps.

**Must have (table stakes):**
- Responsive ship movement with sub-100ms input response — poll keyboard state each frame, not event-driven
- Shooting with muzzle flash, projectile travel, and impact effects
- Enemy death animations and explosion particles — killing into void registers as "broken"
- Score, wave indicator, and lives HUD — genre DNA
- Game over screen with run summary — closure and retry motivation
- Power-up drops during waves (spread shot, rapid fire, shield)
- Boss encounter with distinct health bar
- Wave difficulty escalation — same-difficulty waves cause boredom by wave 3
- Persistent meta-progression via localStorage — demo sessions must survive browser refresh
- Between-wave upgrade shop (3-choice, in-run currency)
- Main menu with clear entry points
- Screen shake and hit flash on player damage
- Pause functionality

**Should have (competitive differentiators):**
- Neon Tokyo multi-hue enemy waves — per-wave color palette assignments with emissive bloom materials
- Enemy type archetypes with distinct combat roles: shielders, flankers, snipers, chargers
- Formation-breaking behavior mid-wave (enemies that charge out of formation)
- Multi-phase boss fight with telegraphed pattern transitions
- In-run artifact system locked at run start (creates pre-run strategic identity)
- Full meta shop with functional and cosmetic unlocks (ship skins, color themes, weapon loadouts, artifact slots)
- Bloom/glow post-processing on projectiles and ships
- Campaign mode with handcrafted chapter 1 (3-4 levels + boss)
- Endless mode for always-playable demo sessions

**Defer (v2+):**
- Audio (BGM + SFX) — significant scope, visual feedback compensates in v1
- Gamepad support — keyboard is sufficient for v1 portfolio demos
- Touch/mobile controls — separate UX design problem
- Online leaderboards — requires backend infrastructure
- Multiplayer — doubles networking complexity

**Anti-features to avoid:** Permanent stat power stacking (breaks balance over time — prefer unlocking sidegrades), physics-based movement (introduces input lag in an arcade shooter), procedural campaign levels (less satisfying than handcrafted), mid-run save state (breaks roguelite tension).

See `.planning/research/FEATURES.md` for full dependency tree and prioritization matrix.

### Architecture Approach

The architecture follows an ECS-lite pattern: entities hold data (position, velocity, health, mesh reference), systems are stateless processors that iterate entity arrays each frame, and the game loop uses a fixed-timestep accumulator for physics/collision with variable rendering. A pushdown automaton StateManager (stack-based FSM) handles screen transitions: MainMenu → Playing → Paused → RunOver → MetaShop. This pattern enables pause without destroying game state.

State is strictly segregated: RunState (volatile, discarded on run end) holds in-run data (score, wave, HP, active power-ups); MetaState (persisted to localStorage) holds cross-run data (unlocks, currency, cosmetics, high scores). Systems never access localStorage directly — only MetaState.save() writes to it, only on deliberate save points (run end, shop purchase, beforeunload). Config is read-only data objects in `config/` — entities copy values on spawn, never mutate shared config.

**Major components:**
1. **Game** — top-level orchestrator, owns the render loop, wires all subsystems
2. **SceneManager** — owns Three.js Scene, WebGLRenderer, OrthographicCamera, EffectComposer; ignorant of game logic
3. **StateManager** — pushdown FSM for high-level screens (enter/update/exit per state)
4. **EntityManager** — tracks all live entities, manages lifecycle with object pools
5. **Systems** (MovementSystem, AISystem, CollisionSystem, SpawnSystem, WeaponSystem, PickupSystem, EscalationSystem) — stateless processors called in order each frame
6. **ObjectPool** — pre-allocated acquire/release pattern for bullets (200 slots), particles (500-1000 slots), enemies
7. **RunState** — ephemeral in-run data; discarded at run end
8. **MetaState** — persistent cross-run data; serialized to localStorage with schema version field
9. **GameConfig** — static data definitions for enemy types, wave templates, upgrade trees, boss phases; never mutated at runtime
10. **InputManager** — boolean keymap polled each frame; decouples input from game logic
11. **PostProcessor** — EffectComposer pipeline; bloom on Layer 1 only (selective bloom via Three.js layers)
12. **HUD/UI** — DOM overlay for in-run HUD and menus; not Three.js objects (faster for 2D UI)

**Build order from architecture research (strict dependencies):**
SceneManager → InputManager → ObjectPool → Player + basic bullet → Basic enemy + collision → RunState + HUD → SpawnSystem + waves → Enemy AI → Boss → PostProcessor → In-run shop → MetaState + MetaShop → Campaign mode → Cosmetics

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams and pattern examples.

### Critical Pitfalls

Research identified 10 critical pitfalls. The top 5 that must be designed around from day one:

1. **No object pooling for bullets and enemies** — GC pressure from `new THREE.Mesh()` per bullet causes visible frame stutters at 10+ shots/second. Prevention: pre-allocate BulletPool (200), ParticlePool (500-1000) before any game logic is written; toggle `visible` flag, never `scene.remove()` pooled objects. Recovery cost if missed: HIGH (2-3 day rewrite).

2. **InstancedMesh not used for enemy formations** — Individual Mesh per enemy means O(n) draw calls. At 50 enemies + 100 bullets + particles, exceeds the 100-draw-call budget for 60fps. Prevention: InstancedMesh per enemy type at architecture phase; one draw call for entire formation. Recovery cost if missed: HIGH (structural rewrite).

3. **Dynamic PointLight per projectile** — 50 simultaneous lit bullets reduces frame rate 60-80% on integrated GPUs. Prevention: additive-blended sprites (`THREE.AdditiveBlending`) simulate glow at 90% reduced GPU cost; reserve actual lights for player ship (max 2) and boss (max 3).

4. **Variable delta without cap and fixed-timestep physics** — Tab switching causes massive delta values; 144Hz monitors run physics 2.4x faster than 60Hz machines. Prevention: cap delta at 50ms (`Math.min(delta, 0.05)`); separate physics update (fixed 60Hz accumulator) from render update (variable).

5. **Bloom on everything, globally** — Naive global UnrealBloomPass blooms UI text, health bars, backgrounds. Prevention: Three.js Layer separation — neon meshes on Layer 1, bloom pass targets Layer 1 only. Also: use pmndrs/postprocessing not Three.js built-in (performance critical).

**Additional critical pitfalls:**
- **VRAM leaks** from missing `geometry.dispose()` / `material.dispose()` — GPU memory is NOT GC-managed. Monitor `renderer.info.memory` throughout development.
- **Overbuilding meta before core feel is validated** — build meta systems only after 10 minutes of endless play without upgrades feels engaging.
- **localStorage schema without version field** — first save must include `saveVersion: number`; implement `migrateSave()` before any schema change. Use stable key prefix (`ssix_v1_save`) for Itch.io deployment.
- **Meta shop currency unbalanced** — design the full unlock tree and target run-counts before implementing any drop rates; use dev currency cheat toggle for isolated shop testing.
- **Particle CPU budget exceeded** — use `THREE.Points` (single draw call) not individual `THREE.Sprite` objects; cap global particle count at ~1000 with priority queue.

See `.planning/research/PITFALLS.md` for recovery strategies and phase-to-pitfall mapping.

---

## Implications for Roadmap

Based on the architecture build-order dependencies and pitfall phase warnings, a 7-phase structure is recommended. The first two phases are non-negotiable infrastructure — they cannot be skipped or done later without a rewrite. The "fun bar" gate between Phase 3 and Phase 4 is the single most important milestone.

### Phase 1: Engine Foundation
**Rationale:** Everything visual and logical depends on SceneManager, InputManager, and ObjectPool. InstancedMesh and object pooling must be architecture decisions, not afterthoughts. Fixed-timestep game loop must be correct before any physics or collision logic is written.
**Delivers:** Three.js scene with OrthographicCamera, WebGLRenderer, Vite dev server, fixed-timestep game loop with delta cap, keyboard InputManager, ObjectPool infrastructure for bullets/particles/enemies.
**Addresses:** Performance foundation that every subsequent phase builds on.
**Avoids:** Pitfalls 1 (no pooling), 3 (individual meshes → draw calls), 4 (variable delta), and 9 (retroactive rewrite cost).
**Research flag:** Standard patterns — skip `/gsd:research-phase`. Three.js game loop and pool patterns are thoroughly documented.

### Phase 2: Core Combat Loop
**Rationale:** Architecture research defines a strict build order: player + bullet → basic enemy + movement → collision → RunState + HUD. This phase validates game feel before any other feature is built. Nothing else matters if shooting feels wrong.
**Delivers:** Player ship with responsive movement (sub-100ms), shooting with muzzle flash particles, basic enemy grid that moves and fires back, AABB collision detection (bullet-enemy, bullet-player), score/lives/wave HUD as DOM overlay, game over screen.
**Addresses:** All table-stakes features from FEATURES.md — responsive movement, shooting feedback, enemy death particles, score display, hit confirmation.
**Avoids:** Pitfall 8 (overbuilding meta before core feel). Phase 2 must deliver a playable combat loop.
**Research flag:** Standard patterns — skip `/gsd:research-phase`. Collision and movement patterns are well-documented.

### Phase 3: Visual Identity and Effects
**Rationale:** The neon aesthetic is the portfolio differentiator and must be proven early enough to iterate on it. Post-processing performance must be validated on integrated GPU hardware before it becomes load-bearing for all subsequent content. Performance tier system (HIGH/MEDIUM/LOW) must be built now, not after effects are embedded everywhere.
**Delivers:** pmndrs/postprocessing bloom pipeline with selective Layer 1 targeting, NeonMaterials factory with MeshBasicMaterial emissive patterns, per-wave enemy color palette system, particle explosions via three.quarks (pooled, globally capped), scrolling background starfield/neon cityscape, screen shake calibrated by event severity, additive-blended sprite glow for projectiles (no PointLights per bullet).
**Addresses:** Neon Tokyo differentiator, bloom post-processing, particle kill effects from FEATURES.md.
**Avoids:** Pitfall 5 (bloom kills performance), Pitfall 7 (particle CPU budget), Pitfall 10 (dynamic lights per projectile).
**Research flag:** May benefit from `/gsd:research-phase` for performance tier detection implementation and selective bloom layer setup specifics.

### Phase 4: Enemy Depth and Wave System — "Fun Bar" Gate
**Rationale:** Enemy variety and wave progression are the gameplay depth that makes the core loop sustainable. This phase must complete before meta-progression is touched — the pitfalls research is explicit that the "fun bar" gate (10 minutes of endless play without upgrades feels engaging) must be passed before Phase 5. SpawnSystem and wave data-driven config also unlock both campaign and endless mode simultaneously.
**Delivers:** 4-5 enemy type archetypes (shielder, flanker, sniper, charger, basic) with distinct FSM behaviors and visual differentiation, formation-breaking behavior (health-threshold and timer triggers), wave escalation system with data-driven wave definitions in `config/waves.js`, power-up drops (spread shot, rapid fire, shield) with visual pickup feedback, between-wave breathing room (2-3 second pause + "Wave X" display), endless mode functional.
**Addresses:** Enemy archetypes, formation-breaking, wave escalation, power-up drops from FEATURES.md. Resolves the artifact/upgrade dependency chain from FEATURES.md feature dependency tree.
**Avoids:** Pitfall 8 (meta before feel) — this phase IS the "fun bar" validation. Pitfall 4 (frame-count-based logic) — all wave timing is elapsed-time-based.
**Research flag:** Enemy FSM patterns and formation behavior may benefit from `/gsd:research-phase` — moderate complexity, documented but specific to this design.

### Phase 5: Boss Encounter
**Rationale:** Architecture research places boss implementation after all base systems — it depends on AI, spawning, collision, health tracking, and attack pattern library. A multi-phase boss is the portfolio centerpiece and must be isolated in its own phase to give it proper attention. It is also table stakes per FEATURES.md.
**Delivers:** Multi-phase boss with distinct visual identity, segmented health bar with phase transition triggers, attack pattern library (telegraphed phase changes), arena-aware targeting, cinematic entry sequence via atmospheric text overlay, full death animation.
**Addresses:** Boss encounter (table stakes) and multi-phase boss differentiator from FEATURES.md.
**Avoids:** Rushed boss that doesn't feel distinct from normal waves.
**Research flag:** Standard patterns for boss FSM — skip `/gsd:research-phase`. Boss state machine is a straightforward extension of enemy AI patterns.

### Phase 6: Roguelite Progression Layer
**Rationale:** This phase begins only after the fun bar is confirmed. Meta-progression infrastructure requires RunState (already built), MetaState with schema-versioned localStorage persistence, the meta shop unlock tree (designed in full before drop rate implementation), and between-wave upgrade shop. The entire currency economy must be balanced as a system — unlock tree first, then drop rates tuned to target run-counts.
**Delivers:** MetaState with `saveVersion` field and `migrateSave()` function, localStorage persistence that survives browser close and Itch.io redeploy (stable key prefix), meta shop with 6-8 functional and cosmetic items (weapon loadouts, artifact slots, ship skins, color themes, trail effects), in-run between-wave upgrade shop (3-choice, in-run currency spend), run-end summary screen with currency earned and progress deltas, dev currency cheat toggle for isolated testing, alternate ship options (2 additional with stat variance).
**Addresses:** Meta shop, persistent currency, between-wave shop, localStorage persistence from FEATURES.md.
**Avoids:** Pitfall 6 (currency balance designed too late), Pitfall 9 (localStorage schema without versioning).
**Research flag:** Currency balance model needs careful upfront design — consider `/gsd:research-phase` for roguelite economy calibration patterns.

### Phase 7: Campaign Mode and Polish
**Rationale:** Campaign chapter 1 depends on the wave scripting system (Phase 4), boss system (Phase 5), and level/chapter state management. Polish — artifact system, cosmetic depth, difficulty unlock system — comes last because it requires all base systems to be stable.
**Delivers:** Campaign chapter 1 with 3-4 handcrafted wave scripts + boss encounter, chapter/level state management, mission briefing atmospheric text overlays, difficulty unlock system via meta shop, in-run artifact system (slots unlocked via meta shop, artifacts modify base behavior not stats), cosmetic unlock depth (skins, trail effects, color themes applied via meta shop), "Looks Done But Isn't" checklist verification (VRAM stability, run state reset, InstancedMesh cleanup, tab-switch delta cap).
**Addresses:** Campaign mode, artifact system, cosmetic unlocks, difficulty unlock system from FEATURES.md.
**Avoids:** All "looks done but isn't" failure modes from PITFALLS.md.
**Research flag:** Artifact system modifier architecture may benefit from `/gsd:research-phase` — how modifiers compose and apply without coupling to entity internals is a non-trivial design decision.

### Phase Ordering Rationale

- **Phases 1-2 are infrastructure-first:** InstancedMesh, object pooling, and fixed-timestep loop must precede all gameplay logic because retrofitting them is a HIGH-cost rewrite. This ordering is derived directly from the architecture build-order dependency chain.
- **Phase 3 (visual identity) is early:** The neon aesthetic requires performance validation before it's embedded in all content. Finding that bloom is too expensive on integrated GPUs in Phase 6 would require painful backtracking.
- **Phase 4 gates Phase 5+:** The fun bar test prevents the most common failure mode in roguelite development — technically correct meta systems wrapped around unsatisfying core gameplay.
- **Phase 6 (meta) comes after feel is proven:** Forced by Pitfall 8 (overbuild meta before core feel). Currency balance model requires the full unlock tree to exist before a single drop rate is set.
- **Phase 7 (campaign + polish) is last:** Campaign handcrafting requires stable wave, boss, and meta systems as foundation. Artifacts and cosmetics are depth layers, not core functionality.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Selective bloom layer setup and performance tier detection implementation — specific Three.js pattern, moderate complexity
- **Phase 6:** Roguelite economy calibration — currency drop rate formulas and unlock-rate targeting patterns are sparse in official docs
- **Phase 7:** Artifact modifier composition architecture — how to apply modifier stacking without coupling to entity internals

Phases with standard patterns (skip research-phase):
- **Phase 1:** Three.js game loop, object pooling, InstancedMesh — thoroughly documented with code examples in official sources
- **Phase 2:** Core combat loop (movement, collision, HUD) — canonical patterns, well-documented
- **Phase 5:** Boss FSM — straightforward extension of enemy AI state machine patterns already researched

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm registry; Three.js, Vite, Zustand, and pmndrs/postprocessing are confirmed current-as-of March 2026. WebGL 2 vs WebGPU decision supported by performance evidence. |
| Features | MEDIUM-HIGH | Table stakes are well-established genre conventions. Differentiator value is research-supported but ultimately requires playtest validation. Anti-feature rationale is solid (scope, balance, complexity arguments). |
| Architecture | HIGH | Three.js render loop, InstancedMesh, EffectComposer, and object pool patterns are from official docs and high-confidence community resources. FSM and ECS-lite patterns are canonical game dev patterns. Collision performance at scale (150+ entities) is LOW confidence — no project-specific benchmarks. |
| Pitfalls | MEDIUM-HIGH | Performance pitfalls (pooling, draw calls, bloom, dynamic lights, delta cap) are HIGH confidence from official Three.js sources. Roguelite balance pitfalls are MEDIUM from community sources. Schema versioning pitfall is HIGH from documented Itch.io deployment patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **Collision detection performance at scale:** Research covers broad-phase and spatial grid strategies theoretically, but no benchmark data exists for this specific project's entity counts (50-150 enemies + 100-200 bullets simultaneously). Validate collision system performance with a stress test during Phase 2 before committing to the AABB approach.
- **three.quarks peer dependency verification:** three.quarks 0.17.0 claims compatibility with three@0.17x-0.18x, but this should be verified on install against Three.js 0.183.2 before Phase 3 begins.
- **Itch.io localStorage behavior:** Itch.io iframe embedding has documented localStorage path-change issues. The stable key prefix mitigation is recommended but should be tested explicitly against the actual deployment target before Phase 6 ships.
- **Fun bar threshold calibration:** The "10 minutes of endless play without upgrades" fun bar test is qualitative. Define specific measurable criteria during Phase 4 planning (e.g., "3 external playtesters complete 10 minutes without prompting").

---

## Sources

### Primary (HIGH confidence)
- [Three.js r173+ release notes and npm registry](https://www.npmjs.com/) — Version verification for three@0.183.2, @types/three@0.183.1
- [Three.js InstancedMesh Docs](https://threejs.org/docs/#api/en/objects/InstancedMesh) — setMatrixAt/setColorAt patterns
- [pmndrs/postprocessing GitHub](https://github.com/pmndrs/postprocessing) — Effect list, EffectPass shader merging architecture, version 6.38.3
- [Discover Three.js — Tips and Tricks](https://discoverthreejs.com/tips-and-tricks/) — Performance patterns, scene structure
- [Building Efficient Three.js Scenes (Codrops, Feb 2025)](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) — Draw call budgets, instancing guidance
- [Three.js Forum — Dispose things correctly](https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534) — VRAM management patterns
- [Game Programming Patterns — State](https://gameprogrammingpatterns.com/state.html) — FSM and pushdown automaton patterns
- [MDN — Bounding volume collision detection with Three.js](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection/Bounding_volume_collision_detection_with_THREE.js) — AABB collision approach
- [Vite official docs — build options](https://vite.dev/config/build-options) — Tree-shaking config, esnext target
- [Zustand GitHub — pmndrs/zustand](https://github.com/pmndrs/zustand) — Persist middleware pattern, slice architecture

### Secondary (MEDIUM confidence)
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) — Under-100-draw-calls rule, stats-gl, WebGPU particle guidance
- [WebGPU vs WebGL Three.js forum issue #31055](https://github.com/mrdoob/three.js/issues/31055) — Performance inconsistency evidence
- [three.quarks GitHub](https://github.com/Alchemist0823/three.quarks) — MIT license, active maintenance, quarks.art editor
- [Beat Invaders (comp) — GamingOnLinux review](https://www.gamingonlinux.com/2022/03/space-invaders-gets-reinvented-with-beat-invaders-and-its-slick/) — Competitor feature analysis
- [Game Developer — Designing Enemies With Distinct Functions](https://www.gamedeveloper.com/design/designing-enemies-with-distinct-functions) — Enemy archetype design patterns
- [JavaScript Game Loop timing (Aleksandr Hovhannisyan)](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — Fixed-timestep accumulator pattern
- [WebGL 60fps player retention data — Sonnydickson.com](https://sonnydickson.com/2025/08/23/why-browser-performance-still-matters-for-online-gaming-in-2025/) — 31% session-length increase at 60fps
- [Scope Creep: The Silent Killer of Solo Indie Development (Wayline)](https://www.wayline.io/blog/scope-creep-solo-indie-game-development) — "Fun bar" gate rationale
- [Draw Calls: The Silent Killer (Three.js Roadmap)](https://threejsroadmap.com/blog/draw-calls-the-silent-killer) — Draw call budget guidance

### Tertiary (LOW confidence)
- [Rogueliter.com — Best roguelites 2025](https://rogueliker.com/best-new-roguelikes/) — Meta-progression design conventions (community consensus, no academic backing)
- [Roguelite progression design (ResetEra)](https://www.resetera.com/threads/do-you-like-meta-progression-in-your-roguelikes-roguelites.1341955/) — Player preference for sidegrades over stat stacking
- [Roguelite progression systems academic paper (Theseus.fi)](https://www.theseus.fi/bitstream/handle/10024/881994/Kammonen_Eino.pdf) — Theoretical framework for meta-progression design

---

*Research completed: 2026-03-02*
*Ready for roadmap: yes*
