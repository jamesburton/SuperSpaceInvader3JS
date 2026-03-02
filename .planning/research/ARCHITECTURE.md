# Architecture Research

**Domain:** Three.js/WebGL browser space shooter with roguelite progression
**Researched:** 2026-03-02
**Confidence:** HIGH (Three.js render loop and scene structure), MEDIUM (game state machine patterns, ECS vs OOP tradeoffs), LOW (collision detection performance at scale without benchmarks)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Entry Point (main.js)                        │
│                    Bootstraps engine, mounts to DOM                   │
├──────────────────────────────────────────────────────────────────────┤
│                         Game (game.js)                                │
│         Top-level orchestrator — owns loop, scene, renderer           │
├───────────────────┬──────────────────────────────────────────────────┤
│   SceneManager    │              StateManager                         │
│  Owns Three.js    │   FSM: MainMenu → Playing → Paused →             │
│  Scene, Camera,   │          RunOver → MetaShop                      │
│  Renderer, Lights │                                                   │
├───────────────────┴────────────┬─────────────────────────────────────┤
│         Game World (in-run)    │       UI Layer (HTML overlay)        │
│  ┌──────────┐  ┌────────────┐  │  ┌──────────────┐  ┌─────────────┐  │
│  │ Entity   │  │ Systems    │  │  │  HUD (in-run)│  │  Menus      │  │
│  │ Manager  │  │ (update    │  │  │  health, wave│  │  meta shop  │  │
│  │ (enemies,│  │  collision,│  │  │  score, timer│  │  main menu  │  │
│  │  bullets,│  │  movement, │  │  └──────────────┘  └─────────────┘  │
│  │  player) │  │  AI, spawn)│  │                                      │
│  └──────────┘  └────────────┘  │                                      │
├────────────────────────────────┴─────────────────────────────────────┤
│                         Data Layer                                    │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  RunState      │  │  MetaState   │  │  GameConfig              │  │
│  │  (in-run only, │  │  (persisted  │  │  (static: enemy defs,    │  │
│  │   volatile)    │  │  localStorage│  │   level defs, upgrade    │  │
│  │                │  │  )           │  │   tables)                │  │
│  └────────────────┘  └──────────────┘  └──────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                       Render Pipeline                                 │
│  WebGLRenderer → RenderPass → UnrealBloomPass → OutputPass            │
│  (EffectComposer — pmndrs/postprocessing recommended over built-in)   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Game** | Top-level orchestrator. Starts the render loop, wires all subsystems together, handles resize events | Class with `init()`, `start()`, `update(delta)` |
| **SceneManager** | Owns the Three.js `Scene`, `WebGLRenderer`, `Camera`, and `EffectComposer`. Knows nothing about game logic | Class exposing `scene`, `camera`, `renderer`, `addObject()`, `removeObject()` |
| **StateManager** | FSM for high-level game screens: MainMenu, Playing, Paused, RunOver, MetaShop | State pattern — each state implements `enter()`, `update(delta)`, `exit()` |
| **EntityManager** | Tracks all live game entities (player, enemies, bullets, pickups, particles). Manages their lifecycle | Array-based with object pooling for high-churn types |
| **Systems** | Stateless logic processors: movement, AI, collision, spawning, wave escalation. Operate on entities | Plain functions or classes called each frame from Game.update() |
| **ObjectPool** | Pre-allocates reusable Three.js objects (bullets, particle meshes, enemy instances). Avoids GC spikes | `acquire()` / `release()` pattern; objects toggled via `visible` flag |
| **RunState** | Ephemeral in-run data: current wave, score, player health, active upgrades, currency, artifacts | Plain JS object; discarded at run end |
| **MetaState** | Persistent cross-run data: unlocks, meta-currency, cosmetics. Survives browser refresh | Serialized to `localStorage` as JSON; loaded on startup |
| **GameConfig** | Static data definitions: enemy types, wave templates, upgrade trees, boss phases, level maps | Imported JSON or TS const objects; never mutated at runtime |
| **InputManager** | Captures keyboard state (`keydown`/`keyup` events → boolean map). Polled each frame | Singleton with `isDown(key)` API; decouples input from game logic |
| **PostProcessor** | EffectComposer pipeline: bloom, color grading for neon aesthetic | Configured once; `composer.render()` replaces `renderer.render()` |
| **HUD** | In-run overlay: wave indicator, score, health, currency, artifact slots | HTML/CSS overlay, not Three.js objects — simpler and performant |
| **MetaShop UI** | Between-run unlock screen | HTML/CSS, driven by MetaState reads/writes |

## Recommended Project Structure

```
src/
├── main.js                  # Entry point — mounts canvas, creates Game
├── Game.js                  # Top-level orchestrator, render loop
│
├── core/
│   ├── SceneManager.js      # Three.js Scene, Renderer, Camera, EffectComposer
│   ├── StateManager.js      # High-level FSM (menu, playing, paused, etc.)
│   ├── InputManager.js      # Keyboard polling abstraction
│   └── ObjectPool.js        # Generic pool — acquire() / release()
│
├── states/                  # One file per top-level game screen
│   ├── MainMenuState.js     # Main menu logic and setup
│   ├── PlayingState.js      # Delegates to EntityManager + Systems
│   ├── PausedState.js       # Pause overlay, resume/quit
│   ├── RunOverState.js      # Run summary, meta-currency award
│   └── MetaShopState.js     # Unlock shop between runs
│
├── entities/                # Game object classes
│   ├── Player.js            # Player ship — position, health, weapons
│   ├── Enemy.js             # Base enemy class
│   ├── EnemyShielder.js     # Role-specific subclass
│   ├── EnemyFlanker.js
│   ├── EnemySniper.js
│   ├── EnemyCharger.js
│   ├── Boss.js              # Multi-phase boss entity
│   ├── Bullet.js            # Pooled projectile
│   ├── Pickup.js            # Power-up drop
│   └── Particle.js          # Pooled explosion/impact particle
│
├── systems/                 # Pure logic, operates on entities
│   ├── MovementSystem.js    # Translates velocity → position each frame
│   ├── AISystem.js          # Enemy AI FSMs, formation logic
│   ├── CollisionSystem.js   # AABB broad-phase + sphere narrow-phase
│   ├── SpawnSystem.js       # Wave templates → enemy spawns
│   ├── WeaponSystem.js      # Fire rate, bullet emission
│   ├── PickupSystem.js      # Drop chance, collection, effect application
│   └── EscalationSystem.js  # Endless mode difficulty ramp
│
├── progression/
│   ├── RunState.js          # In-run ephemeral state (score, wave, HP, currency)
│   ├── MetaState.js         # Persistent localStorage state (unlocks, meta-currency)
│   ├── MetaShop.js          # Unlock cost/benefit definitions and transaction logic
│   └── ArtifactRegistry.js  # Artifact definitions and effect application
│
├── config/
│   ├── enemies.js           # Enemy stat templates (speed, HP, patterns)
│   ├── waves.js             # Wave definitions (enemy types, counts, timing)
│   ├── upgrades.js          # In-run upgrade tree definitions
│   ├── artifacts.js         # Artifact definitions
│   ├── levels.js            # Campaign level/boss definitions
│   └── metashop.js          # Meta shop unlock catalog and costs
│
├── rendering/
│   ├── PostProcessor.js     # EffectComposer + bloom + color grading setup
│   ├── NeonMaterials.js     # Shared emissive/neon material factory
│   ├── ParticleSystem.js    # GPU particle system (custom shader or Points)
│   └── BackgroundSystem.js  # Scrolling star field / neon city backdrop
│
├── ui/
│   ├── HUD.js               # In-run DOM overlay controller
│   ├── MetaShopUI.js        # Meta shop DOM rendering
│   └── MainMenuUI.js        # Main menu DOM
│
└── utils/
    ├── math.js              # Shared math helpers (lerp, clamp, random)
    ├── poolFactory.js       # Creates typed pools for specific entity types
    └── logger.js            # Debug logging wrapper
```

### Structure Rationale

- **core/**: Engine plumbing that any game would need — no game-specific logic here. Keeps SceneManager ignorant of space shooters.
- **states/**: Screen-level FSM states are heavyweight; one file each avoids a God-class StateManager.
- **entities/**: Game objects that own their Three.js mesh references and state. ECS lite: entities hold data, systems process it.
- **systems/**: Stateless processors called each frame. Separating from entities enables independent testing and easy system add/remove.
- **progression/**: Isolated domain for save/load, meta-shop logic, artifact effects. Nothing in gameplay/ touches localStorage directly.
- **config/**: All game balance and content as data, not logic. Tuning enemy HP means editing config/enemies.js, not a class.
- **rendering/**: Three.js-specific visual construction (materials, post-processing, particles). Isolated so non-rendering code never imports Three.js objects.
- **ui/**: DOM HTML overlays for HUD and menus. Kept separate from Three.js scene objects — DOM is faster for 2D UI than Three.js objects.

## Architectural Patterns

### Pattern 1: Game State Machine (FSM) with Push/Pop

**What:** A StateManager owns a stack of game screens. Each state implements `enter()`, `update(delta)`, `exit()`. Transitioning pushes a new state (preserving the previous) or replaces the stack entirely.

**When to use:** Any transition between major game screens — MainMenu to Playing, Playing to Paused, Playing to RunOver, RunOver to MetaShop. Pushdown automata (stack) enables pausing without destroying the playing state.

**Trade-offs:** Clean separation, easy to add new screens. Slightly more ceremony than an enum switch; worth it once the game has 4+ screens.

**Example:**
```typescript
// StateManager.js
class StateManager {
  constructor() {
    this.stack = [];
  }

  push(state) {
    if (this.current) this.current.exit();
    this.stack.push(state);
    state.enter();
  }

  pop() {
    const old = this.stack.pop();
    old.exit();
    if (this.current) this.current.resume(); // restore paused state
  }

  replace(state) {
    while (this.stack.length) this.stack.pop().exit();
    this.push(state);
  }

  get current() {
    return this.stack[this.stack.length - 1] || null;
  }

  update(delta) {
    if (this.current) this.current.update(delta);
  }
}

// PausedState.js
class PausedState {
  enter() { /* show pause overlay DOM */ }
  update(delta) { /* handle resume/quit input only */ }
  exit() { /* hide pause overlay DOM */ }
}
```

### Pattern 2: Object Pool for Bullets and Particles

**What:** Pre-allocate a fixed count of Bullet and Particle objects at startup. Instead of `new Bullet()` / `scene.remove(bullet)` every shot, call `pool.acquire()` / `pool.release()`. Released objects have `visible = false` and are reset on next acquire.

**When to use:** Any object created/destroyed at high frequency — bullets (potentially 10-30/second), explosion particles (50-200 per explosion), enemy death effects.

**Trade-offs:** Eliminates GC spikes (critical at 60fps). Requires upfront pool sizing — too small causes missed shots/effects; too large wastes memory. Typical bullet pool: 200 slots. Particle pool: 500-1000 slots.

**Example:**
```typescript
// ObjectPool.js
class ObjectPool {
  constructor(factory, size) {
    this.available = [];
    for (let i = 0; i < size; i++) {
      const obj = factory();
      obj.visible = false;
      this.available.push(obj);
    }
  }

  acquire() {
    const obj = this.available.pop();
    if (!obj) return null; // pool exhausted — log warning, don't crash
    obj.visible = true;
    return obj;
  }

  release(obj) {
    obj.visible = false;
    this.available.push(obj);
  }
}

// Usage
const bulletPool = new ObjectPool(
  () => {
    const mesh = new THREE.Mesh(bulletGeo, bulletMat.clone());
    scene.add(mesh); // added once, toggled via visible
    return mesh;
  },
  200
);
```

### Pattern 3: Entity-Light (OOP Lite) with System Processing

**What:** A middle ground between full ECS and pure OOP. Entities are classes with data properties (position, velocity, health, mesh reference). Systems are plain functions/classes that iterate entity arrays each frame.

**When to use:** This project's scale. Full ECS (bitmasked archetypes, sparse sets) is overkill for a space shooter with <200 simultaneous entities. Pure OOP with behavior in entity classes creates tight coupling that makes adding formation-breaking AI or artifact effects painful.

**Trade-offs:** Simpler than full ECS but retains separation of behavior (systems) from data (entities). Artifacts and upgrades modify entity properties — systems read them. No ECS library dependency required.

**Example:**
```typescript
// entities/Enemy.js — data only
class Enemy {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.health = 0;
    this.maxHealth = 0;
    this.type = null;          // 'shielder', 'flanker', 'sniper', 'charger'
    this.aiState = 'patrol';   // current AI FSM state
    this.mesh = null;
    this.active = false;
  }
}

// systems/MovementSystem.js — behavior
function updateMovement(entities, delta) {
  for (const entity of entities) {
    if (!entity.active) continue;
    entity.position.addScaledVector(entity.velocity, delta);
    entity.mesh.position.copy(entity.position);
  }
}
```

### Pattern 4: Fixed-Timestep Physics with Variable Rendering

**What:** Physics/collision runs at a fixed interval (e.g., every 16.67ms = 60hz). Rendering runs every frame at whatever rate the browser provides. An accumulator tracks leftover time between physics ticks.

**When to use:** Collision detection and bullet movement — these must be frame-rate independent or bullets will clip through enemies at high FPS. Three.js `Clock.getDelta()` provides variable delta; accumulator converts it to fixed steps.

**Trade-offs:** Slightly more complexity in the game loop. Essential for consistent collision detection — without it, a 120fps user detects zero collisions that a 30fps user catches (tunneling). For a pure arcade shooter without physics engine, a simpler delta-time multiplication is acceptable but a fixed-step accumulator is preferred.

**Example:**
```typescript
// Game.js
const PHYSICS_STEP = 1 / 60;
let accumulator = 0;

function update() {
  const delta = clock.getDelta();
  accumulator += delta;

  while (accumulator >= PHYSICS_STEP) {
    physicsUpdate(PHYSICS_STEP);  // collision, movement at fixed rate
    accumulator -= PHYSICS_STEP;
  }

  renderUpdate(delta);  // animations, particles — use raw delta
  composer.render();
}
```

### Pattern 5: Data-Driven Config for Balance

**What:** All tunable values (enemy HP, speed, spawn counts, upgrade costs, wave timing) live in `config/` as plain objects — never hardcoded in entity classes or systems.

**When to use:** Always. Game balance requires rapid iteration. Config objects are imported by systems; changing enemy speed means editing one number in `config/enemies.js`.

**Trade-offs:** Adds one level of indirection. Worth every tradeoff — without it, every balance pass requires hunting through class files.

**Example:**
```typescript
// config/enemies.js
export const ENEMY_DEFS = {
  shielder: {
    hp: 80,
    speed: 40,
    scoreValue: 150,
    shieldHP: 50,
    dropChance: 0.15,
  },
  flanker: {
    hp: 30,
    speed: 120,
    scoreValue: 100,
    flankAngle: Math.PI / 4,
    dropChance: 0.10,
  },
};
```

## Data Flow

### Game State Data Flow

```
[Player Action: keyboard input]
        ↓
  InputManager (polls keymap each frame)
        ↓
  PlayingState.update(delta)
        ↓
  ┌─────────────────────────────────────┐
  │  Systems (called in order):         │
  │  1. WeaponSystem → emits bullets    │
  │  2. MovementSystem → moves all      │
  │  3. AISystem → updates enemy FSMs   │
  │  4. CollisionSystem → resolves hits │
  │  5. SpawnSystem → waves / pickups   │
  │  6. PickupSystem → applies effects  │
  └─────────────────────────────────────┘
        ↓
  RunState mutated (score++, hp--, wave#, currency++)
        ↓
  HUD.sync(runState) — updates DOM overlay
        ↓
  SceneManager renders → PostProcessor → Canvas
```

### Meta-Progression Data Flow

```
[Run ends: player dies or campaign complete]
        ↓
  RunOverState receives final RunState snapshot
        ↓
  MetaState.awardCurrency(runState.score)
  MetaState.save() → localStorage
        ↓
  [Player enters MetaShop]
        ↓
  MetaShopUI reads MetaState.unlocks + MetaState.currency
        ↓
  [Player purchases unlock]
        ↓
  MetaShop.purchase(unlockId)
    → validates cost, deducts currency, sets unlock flag
    → MetaState.save()
        ↓
  [Next run start]
        ↓
  RunState.init(MetaState.unlocks)
    → applies permanent bonuses, starting artifacts, weapon loadout
```

### State Separation: RunState vs MetaState

```
RunState (volatile)          MetaState (persistent)
─────────────────────        ──────────────────────
score: 0                     totalMetaCurrency: 450
wave: 1                      unlocks: {extraLife: true, ...}
playerHP: 100                highScore: 84200
playerMaxHP: 100             cosmetics: {shipSkin: 'neon2'}
activePowerUps: []           startingArtifacts: [...]
activeArtifacts: [...]       permanentBonuses: {speed: 0.1}
inRunCurrency: 0

Discarded on run end ─────→  Updated on run end, survives refresh
```

### Build Order Dependencies (what must exist before what)

```
1. SceneManager          — Three.js renderer + scene. Everything visual depends on this.
   ↓
2. InputManager          — Keyboard state. Player entity depends on this.
   ↓
3. ObjectPool            — Bullet/particle pools. Weapon and particle systems depend on this.
   ↓
4. Player + basic bullet  — Core shoot mechanic. Validates game feel before any enemies.
   ↓
5. Basic Enemy + Movement  — Grid of enemies that move. Validates the core loop.
   ↓
6. CollisionSystem        — Bullets hit enemies. Core loop is now playable.
   ↓
7. RunState + HUD         — Score, wave, HP visible. Makes the loop feel like a game.
   ↓
8. SpawnSystem + waves    — Wave sequencing. Replaces static enemies with progression.
   ↓
9. Enemy AI (FSM)         — Flanking, charging, formation breaks. Elevates gameplay.
   ↓
10. Boss encounters        — Multi-phase. Depends on all above systems.
    ↓
11. PostProcessor (bloom)  — Visual polish. Can be added at any point after SceneManager,
                             but validate it doesn't tank performance before relying on it.
    ↓
12. In-run upgrades/shop   — Between-wave screen. Depends on RunState + UI.
    ↓
13. MetaState + MetaShop   — Persistence layer. Depends on RunState (to award currency).
    ↓
14. Campaign mode / levels — Level sequencing. Depends on everything above.
    ↓
15. Cosmetics system       — Visual unlockables. Depends on MetaState.
```

## Three.js-Specific Patterns

### Render Pipeline: EffectComposer for Neon Bloom

Use `pmndrs/postprocessing` (not Three.js built-in `examples/jsm/postprocessing`) — better performance via single-pass processing.

Pipeline order:
```
RenderPass
    ↓
SelectiveBloomPass  (bloom only on emissive/neon objects — avoids blooming UI)
    ↓
ChromaticAberrationPass  (subtle lens distortion for cyberpunk feel — optional)
    ↓
VignettePass  (screen-edge darkening — optional)
    ↓
OutputPass  (sRGB + tone mapping — must be last)
```

Selective bloom is critical: bloom all objects naively and the entire scene glows white. Use layer separation — neon meshes on Layer 1, normal meshes on Layer 0, bloom pass targets Layer 1 only.

### Neon Material Pattern

All neon-glowing enemy/player/bullet materials use `MeshBasicMaterial` with high `color` values, not `MeshStandardMaterial` with emissive — `MeshBasicMaterial` ignores lighting (which is correct for emissive neon in an unlit scene) and renders faster.

```typescript
// NeonMaterials.js
export function neonMaterial(color) {
  return new THREE.MeshBasicMaterial({ color });
}

// Enemies get layered: bright core mesh on bloom layer, dim outer mesh on normal layer
function createNeonEnemy(color) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(geo, neonMaterial(color));
  core.layers.set(1);  // bloom layer
  const body = new THREE.Mesh(geo, darkMaterial(color));
  body.layers.set(0);  // normal layer
  group.add(core, body);
  return group;
}
```

### InstancedMesh for Formation Rendering

For dense enemy formations (30-80 enemies simultaneously), use `THREE.InstancedMesh` to batch them into a single draw call. Update instance matrices each frame via `instancedMesh.setMatrixAt(i, matrix)` + `instancedMesh.instanceMatrix.needsUpdate = true`.

Caveat: InstancedMesh can be slower than individual meshes for very small counts (<10). Switch to instancing when formation size exceeds ~20 enemies of the same type. Different enemy types require separate InstancedMesh objects.

### Scene Graph: Keep It Flat

For a space shooter with objects scattered across the play field, avoid deep hierarchy. Keep bullets, enemies, and player as direct children of the scene. Group children only when they need to move together (e.g., boss sub-components).

Deep scene graphs multiply matrix calculations: Three.js recomputes world matrices by walking the tree every frame. Flat is faster for large counts of independent entities.

### GPU vs CPU Particle System

For explosion particles, use `THREE.Points` with custom shader animation (positions updated in vertex shader via time uniform) rather than CPU-updating each particle position. Reduces per-frame CPU work from O(n) per-particle position updates to a single uniform write.

For simpler explosions (20-50 particles, short-lived), CPU-animated pooled `Mesh` spheres are fine and avoid shader complexity.

## Anti-Patterns

### Anti-Pattern 1: Creating/Destroying Three.js Objects per Bullet

**What people do:** `scene.add(new THREE.Mesh(...))` on every shot; `scene.remove(bullet)` and `bullet.geometry.dispose()` on impact.

**Why it's wrong:** Creates GC pressure that causes frame-time spikes. Geometry and material allocation is expensive. At 10 shots/second with 60fps, this is multiple allocations per second accumulating into noticeable hitches.

**Do this instead:** Object pools. Create bullet meshes once at startup, toggle `visible`, reuse on every shot.

### Anti-Pattern 2: Storing All Game State in Entity Classes

**What people do:** `Player` class holds `metaCurrency`, `unlocks`, `highScore`. `Enemy` class contains AI behavior methods tightly coupled to game state.

**Why it's wrong:** Makes save/load a serialization nightmare. Creates circular dependencies when entities need to read meta-state. Makes testing AI in isolation impossible.

**Do this instead:** Entities hold only local data (position, HP, active state, mesh ref). RunState holds in-run data. MetaState holds persistent data. Systems read/write state without coupling it to entity classes.

### Anti-Pattern 3: Bloom on Everything

**What people do:** Apply `UnrealBloomPass` globally to the entire scene for that neon look.

**Why it's wrong:** Blooms UI text, health bars, backgrounds, anything that has any brightness. Results in a washed-out scene that looks like a white fog over everything.

**Do this instead:** Selective bloom using Three.js `Layers`. Only objects on the designated bloom layer glow. Background stars, UI overlays, and dark hulls stay crisp.

### Anti-Pattern 4: Frame-Count-Based Game Logic

**What people do:** `if (frameCount % 60 === 0) { spawnEnemy(); }` — fire every 60 frames.

**Why it's wrong:** At 30fps the enemy spawns every 2 seconds; at 120fps every 0.5 seconds. Game difficulty becomes hardware-dependent.

**Do this instead:** Always use elapsed time. `if (timeSinceLastSpawn >= SPAWN_INTERVAL_SECONDS) { spawnEnemy(); timeSinceLastSpawn = 0; }`. Scale all logic by `delta`.

### Anti-Pattern 5: Mutating Config at Runtime

**What people do:** Passing config objects around and modifying them as gameplay state: `enemyDef.hp -= damage`.

**Why it's wrong:** Config is shared — the next enemy spawned inherits the modified value. This is a persistent bug that's extremely hard to diagnose.

**Do this instead:** Config is read-only. Entities copy values from config on spawn: `this.hp = ENEMY_DEFS[type].hp`. Mutations happen only on entity instance properties.

### Anti-Pattern 6: localStorage Writes Every Frame

**What people do:** `localStorage.setItem('meta', JSON.stringify(metaState))` inside the game loop.

**Why it's wrong:** localStorage writes are synchronous and block the main thread. At 60fps this tanks performance.

**Do this instead:** Write to localStorage only on deliberate save points: run end, meta shop purchase, game close (`beforeunload` event). Keep in-memory MetaState as the source of truth during a session.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Systems ↔ EntityManager | Direct array access — systems receive entity array ref | Systems never instantiate entities; EntityManager owns lifecycle |
| PlayingState ↔ RunState | RunState passed as parameter to systems | RunState is the single source of truth for in-run score, HP, wave |
| RunOverState ↔ MetaState | MetaState.awardCurrency() called once on run end | Only one write path to MetaState during a run — prevents double-awards |
| MetaShop ↔ MetaState | MetaShop.purchase() → validates + mutates MetaState → MetaState.save() | All meta state mutations go through MetaShop, never directly |
| Rendering ↔ Game Logic | SceneManager exposes scene for object add/remove; systems never import renderer | Game logic never calls composer.render() — only SceneManager/Game.js does |
| UI (HUD) ↔ RunState | HUD.sync(runState) called each frame or on change | HUD is read-only from RunState's perspective — never writes back |
| Entities ↔ Config | Entities import from config/ at spawn time, copy values | Config is never mutated; entities own their runtime copies |

### External Boundaries

| Boundary | Integration | Notes |
|----------|-------------|-------|
| localStorage | MetaState.save() / MetaState.load() | Only persistence mechanism — no backend. Structure version field needed for future migrations |
| `beforeunload` | MetaState.save() on window close | Ensures progress saved if player closes tab mid-meta-shop |
| requestAnimationFrame | Game.js game loop | Three.js `renderer.setAnimationLoop()` wraps rAF — use it for consistency |
| ResizeObserver / window.resize | SceneManager handles — updates renderer size + camera aspect | Systems and entities should never listen to resize directly |

## Scaling Considerations

This is a single-player client-side game with no server. "Scaling" means performance under entity load.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| < 50 simultaneous entities | Individual Mesh objects, AABB collision brute force — baseline approach |
| 50-150 entities (dense waves) | InstancedMesh for same-type enemies, spatial grid for collision broad phase |
| 150+ entities (boss phase + particles) | GPU particle system for particles, InstancedMesh mandatory, object pool critical |

### Performance Priority Order

1. **First bottleneck:** Too many draw calls from individual enemy meshes. Fix: InstancedMesh for each enemy type, bullet pooling.
2. **Second bottleneck:** O(n²) collision detection (every bullet vs every enemy). Fix: spatial grid or simple row-based partitioning (space shooter is axis-aligned, so a simple row-grid is sufficient).
3. **Third bottleneck:** Post-processing pass cost. Fix: selective bloom (layer-based), reduce bloom pass resolution if needed, disable on low-end detection.
4. **Fourth bottleneck:** GC spikes from bullet/particle allocation. Fix: object pooling (should be addressed in Phase 1 of implementation).

## Sources

- Three.js performance tips: [Discover Three.js — Tips and Tricks](https://discoverthreejs.com/tips-and-tricks/) — HIGH confidence (official community resource)
- EffectComposer and post-processing: [Three.js Docs — EffectComposer](https://threejs.org/docs/pages/EffectComposer.html) — HIGH confidence (official docs)
- pmndrs/postprocessing: [GitHub — pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) — HIGH confidence (official repo)
- Object pool pattern for Three.js: [Introduction to Object Pooling in Three.js](https://kingdavvid.hashnode.dev/introduction-to-object-pooling-in-threejs) — MEDIUM confidence (verified against Three.js patterns)
- Building Efficient Three.js Scenes (2025): [Codrops — Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) — HIGH confidence (dated Feb 2025, peer-reviewed publication)
- InstancedMesh performance: [Three.js Docs — InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) — HIGH confidence (official docs)
- Draw calls and instancing: [Draw Calls: The Silent Killer — Three.js Roadmap](https://threejsroadmap.com/blog/draw-calls-the-silent-killer) — MEDIUM confidence (community source, consistent with official guidance)
- Game state machine pattern: [Game Programming Patterns — State](https://gameprogrammingpatterns.com/state.html) — HIGH confidence (canonical game dev resource, widely cited)
- FSM for enemy AI: [Game Developer — Designing AI with FSMs](https://www.gamedeveloper.com/programming/designing-a-simple-game-ai-using-finite-state-machines) — MEDIUM confidence (verified by multiple sources)
- AABB collision detection: [MDN — Bounding volume collision detection with Three.js](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection/Bounding_volume_collision_detection_with_THREE.js) — HIGH confidence (MDN official)
- Three.js project structure: [Discover Three.js — App Structure](https://discoverthreejs.com/book/first-steps/app-structure/) — HIGH confidence (official community resource)
- Fixed timestep game loop: [Three.js Forum — How to update more than 60/second](https://discourse.threejs.org/t/how-to-update-more-than-60-times-second/10797) — MEDIUM confidence (community, consistent with standard game loop patterns)

---
*Architecture research for: Three.js browser space shooter (Super Space Invaders X)*
*Researched: 2026-03-02*
