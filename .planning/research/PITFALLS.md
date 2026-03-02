# Pitfalls Research

**Domain:** Three.js/WebGL Browser Space Shooter with Roguelite Progression
**Researched:** 2026-03-02
**Confidence:** MEDIUM-HIGH (Three.js performance pitfalls HIGH from official sources; roguelite balance pitfalls MEDIUM from community sources; scope/solo-dev pitfalls HIGH from documented patterns)

---

## Critical Pitfalls

### Pitfall 1: No Object Pooling for Bullets and Enemies

**What goes wrong:**
Every bullet fired and every enemy destroyed creates a new JavaScript object and adds it to the scene. When the object is removed, it enters JavaScript's garbage collector. In a fast-paced space shooter with rapid fire, 100+ bullets per second triggers GC pauses that cause visible frame stutters — 1-5 frame hitches that feel like lag spikes at the worst possible moments (boss fights, bullet-dense waves).

**Why it happens:**
Three.js's `scene.add()` / `scene.remove()` pattern feels natural and clean. Developers prototype with direct creation, it works fine at low volumes, and pooling feels like premature optimization. But a space shooter is uniquely high-volume — bullets and explosions are the core loop, not edge cases.

**How to avoid:**
Implement object pools for every frequently-created/destroyed entity before writing game logic. Create a `BulletPool`, `EnemyPool`, and `ParticlePool` class during the architecture phase. Pre-instantiate N objects (bullets: 200, particles: 500), keep them in the scene as invisible, activate/deactivate instead of add/remove. Never call `new THREE.Mesh()` in the game loop.

**Warning signs:**
- Chrome DevTools Performance tab shows GC events ("Minor GC", "Major GC") during gameplay
- `renderer.info.memory.geometries` or `renderer.info.memory.textures` climbing continuously during play
- Frame time spikes that appear rhythmic (GC runs on a schedule)
- Noticeable hitching that correlates with firing rate or enemy density

**Phase to address:** Core game loop / architecture phase (before enemy and bullet systems are built)

---

### Pitfall 2: Not Disposing Three.js Resources — VRAM Leaks

**What goes wrong:**
Three.js uploads geometry and textures to the GPU when objects are added to the scene. Unlike JavaScript heap memory, GPU VRAM is NOT managed by the garbage collector. When you do `scene.remove(mesh)` or let a variable go out of scope, the geometry data stays uploaded to the GPU. In a game with wave progression, enemy variety, and VFX, this accumulates over a 30-minute session and eventually crashes the tab or causes severe GPU memory pressure.

**Why it happens:**
Developers assume JavaScript's garbage collection handles everything. The mental model breaks because Three.js has a split memory model: JS heap (GC-managed) + GPU VRAM (manually managed). Three.js requires explicit `geometry.dispose()`, `material.dispose()`, and `texture.dispose()` calls to free VRAM. This is documented but easy to overlook when focused on gameplay.

**How to avoid:**
Establish a disposal pattern at project start. Any object created and destroyed during gameplay must have an explicit dispose path. Add a `destroy()` method to every game entity that calls `geometry.dispose()`, `material.dispose()`, and removes from scene. Monitor `renderer.info.memory` during development — `geometries` and `textures` counts should not grow unboundedly during a run. For textures shared across enemies, use a shared `TextureLoader` cache and only dispose when truly done with that asset type.

**Warning signs:**
- `renderer.info.memory.geometries` increases as waves progress and never decreases
- Browser memory (Task Manager) climbs across runs without stabilizing
- GPU memory warnings in Chrome's `chrome://gpu`
- Performance degrading over a 15-30 minute session when it was fine at the start

**Phase to address:** Architecture phase — establish dispose pattern before enemy variety is built

---

### Pitfall 3: Too Many Draw Calls — Missing InstancedMesh for Enemy Waves

**What goes wrong:**
Each distinct mesh in a Three.js scene = one draw call (one GPU command). A scene with 50 individual enemy meshes = 50 draw calls. Add 100 bullets + 200 particle effects + UI elements and you're at 400+ draw calls per frame. The Three.js community benchmark is to stay under 100 draw calls for consistent 60fps. Beyond that, CPU-to-GPU command overhead becomes the bottleneck, not rendering complexity.

**Why it happens:**
Three.js's default API creates individual Mesh objects. It's intuitive and correct for unique objects. The mistake is applying the same pattern to repeated objects — 50 enemies of the same type should be one `InstancedMesh` with 50 instances, not 50 Mesh objects. Developers reach for the simple API first and only discover the draw call problem when the game is already structured around individual meshes.

**How to avoid:**
Use `THREE.InstancedMesh` for any entity type that can have multiple simultaneous instances: enemy types (shielders, flankers, snipers), bullet types, background particles. One InstancedMesh per enemy type with capacity for max wave size. Update instance matrices each frame instead of individual mesh transforms. Reserve individual Mesh objects for the player, bosses, and unique scene elements.

**Warning signs:**
- `renderer.info.render.calls` in Stats panel exceeds 150+
- Frame time scales with number of enemies, not visual complexity
- Spector.js shows hundreds of draw calls per frame for similar geometry

**Phase to address:** Core architecture phase — InstancedMesh must be designed in from the start; retrofitting is a significant rewrite

---

### Pitfall 4: Variable-Rate Delta Time Without Capped Maximum

**What goes wrong:**
`requestAnimationFrame` pauses when the browser tab loses focus, the frame rate drops, or the user minimizes the window. When it resumes, `delta` (time since last frame) can be enormous — 2, 5, even 30+ seconds. With a naive `position += velocity * delta` update, bullets and enemies teleport across the screen, collision detection misses, and game state becomes corrupted. Also: on 144Hz monitors, physics and game logic run at twice the speed of a 60Hz machine if delta is not properly handled.

**Why it happens:**
Developers see `requestAnimationFrame` docs and implement `const delta = (timestamp - lastTime) / 1000`. This is correct, but the crucial capping step is often omitted because it only manifests in edge cases during development (tab switching).

**How to avoid:**
Always cap delta: `const delta = Math.min((timestamp - lastTime) / 1000, 0.05)` (capping at 50ms = 20fps minimum). Consider a fixed-timestep accumulator pattern for physics/collision, with variable rendering. The game loop should separate update (fixed step) from render (variable). This prevents 144Hz machines from running physics faster.

**Warning signs:**
- Enemies or bullets "jump" position when switching browser tabs and returning
- Testers on high-refresh-rate monitors report faster bullet speeds
- Collision detection misses when frame rate drops below 30fps

**Phase to address:** Core game loop (first thing built)

---

### Pitfall 5: Bloom/Post-Processing Killing Performance Without Detection System

**What goes wrong:**
The Neon Tokyo aesthetic relies on bloom/glow effects. These effects are visually core but computationally expensive: each post-processing pass renders the entire scene again. Unreal Bloom in Three.js at full resolution can halve frame rate. Developers implement the effect, it looks great at 60fps on their machine, ship it, and users on mid-range laptops see 20-30fps. The effect that defines the aesthetic becomes the thing that makes the game unplayable.

**Why it happens:**
Post-processing is developed on a developer's GPU (capable), tested in isolation (not during heavy enemy waves), and the performance cost only compounds when combined with particle effects, many enemies, and a complex background — the exact scenario of an intense wave fight.

**How to avoid:**
Use the `pmndrs/postprocessing` library (better performance than Three.js built-in EffectComposer). Implement a performance tier system from day one: HIGH (full bloom + all particles), MEDIUM (reduced bloom radius + fewer particles), LOW (no post-processing, simulated glow via sprite textures). Auto-detect tier based on GPU capability using a benchmark frame at startup, with manual override. Never treat post-processing as "always on" — it must be optional.

**Warning signs:**
- Frame time doubles between gameplay screenshot and the same scene with effects disabled
- The game uses more than 2 render passes per frame
- `renderer.info.render.calls` spikes when effects are active

**Phase to address:** Visual effects phase — design the performance tier system before implementing effects

---

### Pitfall 6: Meta Shop Currency Balance Designed Too Late

**What goes wrong:**
The meta shop unlock system requires careful balance: the player should feel meaningful progress after 3-5 runs, not 30. If currency drops are tuned late (or based on feel after a few test runs), the progression curve will be wrong at launch. Too slow: players feel stuck in an underpowered starting state for too long and quit. Too fast: the meta shop is exhausted in 2 hours and there's nothing to work toward.

**Why it happens:**
Currency economy feels like a content/tuning concern, so developers defer it. But the shop's unlock tree and the currency drop rates are tightly coupled — you can't tune one without the other. This requires playtesting at the full-game scale, which only happens late.

**How to avoid:**
Design the full meta shop unlock tree (all items, all prices) before implementing currency drops. Then work backward: how many runs should each tier of upgrades take? Set currency drop values to hit those targets. Implement a dev currency cheat toggle early so the shop can be tested independently of run balance. Track "runs to first win" and "runs to full meta unlock" as explicit targets.

**Warning signs:**
- Currency values are set to "feels right" numbers without a target unlock-rate calculation
- The meta shop is implemented before its full item list is finalized
- Playtesting time is measured in individual runs rather than 10+ run sessions

**Phase to address:** Meta progression phase — balance model must precede implementation

---

### Pitfall 7: Particle Effects Complexity Exceeding CPU Budget

**What goes wrong:**
Every explosion, every bullet impact, and every ship death spawns particles. The Neon Tokyo aesthetic rewards visual density. But particles updated per-particle in JavaScript (position, velocity, lifetime, color) on the CPU can easily hit 50,000+ particle updates per frame during intense wave fights, causing significant CPU frame budget overruns that manifest as input lag and choppy movement.

**Why it happens:**
Individual explosions look fine and run at 60fps in isolation. The problem compounds multiplicatively: 10 enemies dying simultaneously = 10 explosion effects = 10x particle load. The breaking point only appears when wave density peaks.

**How to avoid:**
Use Points geometry (single draw call, all particles as vertices) rather than individual Sprite objects (one draw call per particle). Apply object pooling to particle systems, not just individual particles. Cap particle count globally (max 1000 simultaneous particles) with a priority queue that culls lowest-priority effects when over budget. For the most complex effects (large boss explosions), pre-compute particle animations as sprite sheet flipbooks on a GPU texture rather than CPU simulation. Profile at maximum wave density, not average.

**Warning signs:**
- Using individual `THREE.Sprite` objects for particles instead of `THREE.Points`
- No global particle budget cap
- Profiling shows particle update loops consuming >4ms of the 16ms frame budget
- FPS drops specifically when multiple enemies die simultaneously

**Phase to address:** Visual effects / particle system phase

---

### Pitfall 8: Overbuilding the Roguelite Systems Before Core Feel Is Fun

**What goes wrong:**
The meta shop, artifact system, run currency, and between-wave upgrade shop are all compelling to design. Developers spend weeks building the meta-progression loop infrastructure before the core 10-second gameplay loop (shoot things, feel impact, dodge bullets) is satisfying. The result is a technically correct roguelite system wrapped around gameplay that doesn't feel good — and because the meta layer is so invested, the temptation is to keep adding meta features rather than fixing core feel.

**Why it happens:**
Meta progression is intellectually interesting and feels like "real game design." Core feel (particle scale, hitpause duration, bullet speed, enemy movement weight) requires rapid iteration and feels like tweaking numbers. Developers optimize for the kind of work they find engaging, not the work the game actually needs first.

**How to avoid:**
Gate all roguelite progression work behind a "fun bar" milestone: the game must pass a subjective test — 10 minutes of play without meta progression feels engaging — before the meta layer is built. The test: can you play the endless mode for 10 minutes in a flow state, without unlocks or progression, and want to keep going? If yes, build the meta. If no, fix core feel first.

**Warning signs:**
- Meta shop UI is being designed before the basic shooting feels satisfying
- Bug reports say "it's functional but not fun" and the response is adding more features
- The first 30 seconds of a fresh run (no meta unlocks, default weapon) feel weak or boring

**Phase to address:** Core gameplay phase must be complete and feel-validated before meta systems phase begins

---

### Pitfall 9: localStorage Save System Without Schema Versioning

**What goes wrong:**
Meta progression data (currency, unlocks, run history) is persisted to `localStorage`. When the game updates — items renamed, currency values rebalanced, new shop categories added — old save data becomes incompatible. Players reload the page after an update and find corrupted state: negative currency, unlocked items that no longer exist, or missing keys that crash the game. For a portfolio project deployed on Itch.io or GitHub Pages, this is especially problematic: build path changes can wipe localStorage data entirely.

**Why it happens:**
Developers implement localStorage saves as a JSON dump of current game state. It works perfectly until the schema changes — which happens constantly during development. The migration path is not thought through because "we'll deal with it when we need to."

**How to avoid:**
Include a `saveVersion: number` field in every save file from day one. Write a `migrateSave(oldVersion, data)` function that handles upgrades. On save load, always check version and migrate forward. Keep a `CURRENT_SAVE_VERSION` constant and increment it deliberately. For Itch.io deployment: use a stable, unique key that won't change with build path (`localstorage key: "ssix_v1_save"` not `"save"`). Test migration explicitly before any major release.

**Warning signs:**
- Save data is stored as direct JSON serialization of runtime objects
- No `version` field in the save schema
- No migration function exists

**Phase to address:** Meta progression phase (implement schema versioning on the first save, not after it breaks)

---

### Pitfall 10: Dynamic Lights for Projectile Glow — GPU Killer

**What goes wrong:**
The Neon Tokyo aesthetic calls for projectiles that appear to emit colored light. The naive implementation is to attach `THREE.PointLight` to each bullet. With 50-100 bullets on screen simultaneously, this creates 50-100 dynamic lights. Three.js (and WebGL generally) has very low overhead for static/baked lighting but very high overhead for dynamic lights — each dynamic light requires re-rendering affected scene geometry. 50 point lights can reduce frame rate by 60-80% on integrated graphics.

**Why it happens:**
`new THREE.PointLight()` is a single line of code. It produces exactly the right visual result in isolation. The performance problem only emerges at scale (many bullets) and on weaker hardware.

**How to avoid:**
Simulate projectile glow entirely with sprites and additive blending — no actual lights. Use `THREE.AdditiveBlending` on a circular glow sprite attached to each bullet. This looks visually similar to a point light effect at 90% reduced GPU cost. Reserve actual dynamic lights for the player ship (max 2), boss encounters (max 3), and environmental mood lighting. This is the technique used by virtually all browser games with glowing projectiles.

**Warning signs:**
- `PointLight` objects are being added per-bullet or per-particle
- The scene has more than 8 dynamic lights simultaneously
- GPU frame time (measured with Spector.js) spikes proportionally to bullet count

**Phase to address:** Visual effects / bullet implementation phase

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Individual Mesh per bullet | Simple to code | O(n) draw calls, GC pressure, forces rewrite | Never — pool from day one |
| `Math.random()` for all enemy behavior | Easy variety | Cannot reproduce bugs, waves feel chaotic not designed | Use seeded RNG for reproducible wave testing |
| Hardcoded wave definitions as JS arrays | Fast to write | Wave editor impossible, content iteration slow | MVP only; move to data-driven config before wave content phase |
| Storing runtime enemy objects directly in save data | No serialization layer needed | Schema coupling, migrations impossible | Never — always serialize to plain primitives |
| Single global game state object | Simple access pattern | Untestable, wave reset bugs, cross-contamination between runs | MVP only; split into RunState and MetaState before meta systems |
| Three.js built-in EffectComposer for post-processing | Familiar API | Lower performance than pmndrs/postprocessing | Only if effects are never player-facing |
| Skipping TypeScript for Three.js vectors | Less setup | `updateMatrix()` call forgotten, transform bugs | Acceptable for solo dev if disciplined; use JSDoc types at minimum |

---

## Integration Gotchas

Common mistakes when connecting systems in this project.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Three.js + particle pools | Calling `scene.add()` / `scene.remove()` to activate/deactivate pooled particles | Toggle `mesh.visible` and `mesh.frustumCulled`; never remove pooled objects from the scene |
| InstancedMesh + enemy state | Storing per-enemy state in InstancedMesh instance matrices only | Keep a parallel JS array of enemy state; matrix = transform only |
| Post-processing + UI | Rendering HUD/UI inside EffectComposer pipeline | Render game world through EffectComposer; draw UI on a separate canvas overlay or CSS layer to avoid bloom on text |
| localStorage + Itch.io | Using the default Itch.io iframe embed | Itch.io embeds can reset localStorage on deploy path change; use `<username>.itch.io/game` slug as storage key prefix |
| requestAnimationFrame + visibility | Game loop continues when tab is hidden | Listen to `document.visibilitychange` and pause the loop; prevents massive delta accumulation |

---

## Performance Traps

Patterns that work during development but fail under game conditions.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Individual Sprite for each particle | FPS drops when multiple enemies explode | Use THREE.Points with shared geometry | At 30+ simultaneous particles |
| Dynamic PointLight per projectile | GPU frame time proportional to bullet count | Additive-blended sprites for glow | At 10+ simultaneous lit bullets |
| Raycaster for every bullet/enemy collision pair | CPU frame time O(n*m) each frame | Spatial hash grid or simple AABB math | At 50+ bullets × 30+ enemies |
| Running full bloom pass at full resolution | Post-processing halves frame rate | Half-resolution bloom with upscale, or pmndrs library | Always on mid-range laptops |
| Creating THREE.Vector3 in update loops | GC stutter during intense play | Pre-allocate vectors, use `.set()` to reuse | With >60 entities updating per frame |
| Scene traverse for collision | O(n) scene graph walk every frame | Maintain separate arrays for bullets/enemies | At 100+ scene objects |
| Not batching UI updates | HUD redraws every frame regardless of change | Dirty flag system; only update HUD when values change | Always (wastes budget unnecessarily) |

---

## UX Pitfalls

Common user experience mistakes for this genre.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| First run has no meta unlocks and feels weak | New players quit before reaching the meta loop | Give starting loadout enough punch to feel good; meta upgrades add power, not fix powerlessness |
| Meta shop items are stat upgrades only ("+5% fire rate") | Feels like grinding for numbers, not discovering builds | Mix stat upgrades with new abilities/weapons/mechanics; unlocking a new ship type beats "+3% speed" |
| Run ends without showing what was earned | Player doesn't know if time was well-spent | Post-run screen: currency earned, upgrade discovered, high score delta, "your best vs. this run" |
| Wave starts immediately after upgrade shop closes | No moment to absorb the upgrade, immediately overwhelmed | 1-2 second grace period / brief "wave incoming" warning between shop and next wave |
| Particle effects obscure the player ship during chaos | Player dies without seeing the threat | Player ship and incoming projectiles must be visually distinct (brightness, z-layer, outline) from effects |
| Screen shake without player control | Motion sickness for sensitive players | Provide screen shake intensity slider in options (0-100%), default 50% |
| Between-wave shop times out or has no pause | Anxiety, rushed decisions, poor choices | Between-wave shop pauses game time completely; no pressure timer |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Object Pooling:** Pool is created — verify `renderer.info.memory.geometries` stays flat during a 5-minute play session
- [ ] **Meta Shop Persistence:** Purchases save — verify saves survive a full browser close/reopen cycle and a build redeployment
- [ ] **Wave Progression:** Waves spawn correctly — verify the final wave and post-final-wave state are handled (don't softlock on endless mode)
- [ ] **Run State Reset:** Returning to menu after death works — verify run-state variables (HP, currency, power-ups) are fully reset and don't bleed into next run
- [ ] **Post-Processing:** Bloom looks right — verify on an integrated GPU laptop at 1080p (not just developer's discrete GPU)
- [ ] **Collision Detection:** Bullets hit enemies — verify at 144fps (faster bullets) and at 20fps (tunneling through thin objects)
- [ ] **InstancedMesh Cleanup:** Enemy wave ends — verify all instance slots are reset/hidden between waves, not just count tracking
- [ ] **delta Cap:** Game loop handles tab focus return — verify switching tabs for 30 seconds and returning doesn't teleport enemies

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No object pooling, individual meshes everywhere | HIGH | Identify highest-frequency objects first (bullets); pool those; enemies second; full pool refactor is a 2-3 day rewrite |
| VRAM leaks from missing dispose | MEDIUM | Add `renderer.info.memory` monitor to HUD; traverse all game entity constructors and add dispose methods systematically |
| Too many draw calls | HIGH | Identify top draw call contributors with Spector.js; migrate highest-count entity types to InstancedMesh one type at a time |
| Save schema corruption | MEDIUM | Add migration function + version bump; provide "reset save" option in menu for users with broken saves |
| Meta shop currency completely unbalanced | LOW | Adjust base drop rates and prices in config constants; no code changes needed if designed data-driven |
| Post-processing killing performance | MEDIUM | Implement performance tier system (HIGH/MEDIUM/LOW); tier detection takes 1 day; LOW tier disables EffectComposer entirely |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No object pooling | Core architecture (Phase 1-2) | `renderer.info.memory.geometries` stays flat in 5-min session |
| VRAM leaks from no dispose | Core architecture (Phase 1-2) | Memory profiler shows stable VRAM after 3 wave cycles |
| Too many draw calls | Core architecture (Phase 1-2) | `renderer.info.render.calls` stays under 100 during max-density wave |
| Variable delta without cap | Core game loop (Phase 1) | Tab-switch test: return after 30s, no entity teleportation |
| Bloom performance | Visual effects phase (Phase 3-4) | 60fps on integrated GPU laptop at peak wave density |
| Meta shop balance | Meta progression phase (Phase 5) | Target: first win achievable in 5-8 runs without excessive frustration |
| Overbuilding meta before core feel | Phase gate between core and meta (Phase 4→5) | 10-minute endless session without meta unlocks earns "would play again" |
| localStorage schema versioning | Meta persistence (Phase 5) | Manually corrupt save data, verify migration path, verify Itch.io path-change survival |
| Dynamic lights per projectile | Bullet/visual phase (Phase 3) | GPU frame time stays flat as bullet count increases |
| Particle CPU budget | Visual effects phase (Phase 3-4) | CPU particle update time stays under 2ms at max wave density |

---

## Sources

- [Three.js Forum: Why isn't Three.js considered a serious game dev option?](https://discourse.threejs.org/t/why-isnt-threejs-considered-a-serious-game-development-option-main-shortcomings/63807) — MEDIUM confidence, community discussion
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) — HIGH confidence, comprehensive official-pattern-aligned guide
- [Building Efficient Three.js Scenes (Codrops, Feb 2025)](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) — HIGH confidence, recent authoritative source
- [Three.js Forum: Draw Calls discussion](https://discourse.threejs.org/t/webgl-drawcalls/24476) — HIGH confidence, official forum
- [Three.js Forum: Dispose things correctly](https://discourse.threejs.org/t/dispose-things-correctly-in-three-js/6534) — HIGH confidence, official forum
- [Introduction to Object Pooling in Three.js](https://kingdavvid.hashnode.dev/introduction-to-object-pooling-in-threejs) — MEDIUM confidence
- [Scope Creep: The Silent Killer of Solo Indie Game Development (Wayline)](https://www.wayline.io/blog/scope-creep-solo-indie-game-development) — MEDIUM confidence, community/industry
- [Roguelite progression design discussion (ResetEra)](https://www.resetera.com/threads/do-you-like-meta-progression-in-your-roguelikes-roguelites.1341955/) — LOW confidence, community opinion
- [JavaScript Game Loop timing (Aleksandr Hovhannisyan)](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — HIGH confidence, well-cited technical reference
- [Draw Calls: The Silent Killer (Three.js Roadmap)](https://threejsroadmap.com/blog/draw-calls-the-silent-killer) — MEDIUM confidence
- [Three Nebula particle system](https://github.com/creativelifeform/three-nebula) — HIGH confidence, official GitHub

---
*Pitfalls research for: Three.js Browser Space Shooter (Super Space Invaders X)*
*Researched: 2026-03-02*
