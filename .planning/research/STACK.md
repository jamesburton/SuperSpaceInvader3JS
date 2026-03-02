# Stack Research

**Domain:** Browser-based arcade space shooter with roguelite meta-progression and neon cyberpunk visual effects
**Researched:** 2026-03-02
**Confidence:** HIGH (core stack verified via npm registry + official Three.js docs + multiple corroborating sources)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Three.js | 0.183.2 | WebGL renderer, 3D scene graph, post-processing | Committed stack choice; provides InstancedMesh for bulk enemies/bullets, EffectComposer for bloom pipeline, built-in OrthographicCamera for 2.5D gameplay. Current as of March 2026. |
| TypeScript | 5.9.3 | Type safety across game systems | Game state (roguelite progression, artifact slots, wave scripting) is complex enough that type errors at compile time — not runtime mid-demo — are non-negotiable. Named Three.js imports work cleanly with TS. |
| Vite | 7.3.1 | Build tool, dev server, HMR | Industry standard for Three.js TypeScript projects in 2025-26; faster than Webpack, native ESM support for Three.js tree-shaking, sub-second HMR for shader/scene iteration. Node.js 20.19+ required. |
| Zustand | 5.0.11 | Game state management (meta-progression, UI state) | Minimal boilerplate for non-React state; persist middleware handles localStorage serialization out of the box; state slices map cleanly to game domains (meta shop, run state, settings). |

### Rendering Pipeline

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| postprocessing (pmndrs) | 6.38.3 | Bloom, glitch, scanline effects | Outperforms Three.js built-in EffectComposer by merging multiple effects into a single shader pass; single-triangle fullscreen rendering; BloomEffect with luminanceThreshold controls exactly which neon elements glow. Latest: Feb 2026. |
| three.quarks | 0.17.0 | Particle systems (explosions, trails, muzzle flash) | High-performance batch-rendered particle system for Three.js; handles billboard, stretched-billboard, trail, and mesh render modes; visual editor at quarks.art for designing VFX without code iteration; MIT licensed, actively maintained. |

### State & Persistence

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand persist middleware | (bundled with zustand 5.x) | localStorage auto-save/restore for meta-progression | Meta shop currency, unlocks, cosmetics, high scores — anything that must survive browser close. Use JSON serialization; stays within 5MB localStorage limit easily. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| stats-gl | Frame rate + GPU timing display | Use during development to profile actual bottlenecks — target under 100 draw calls per frame. Install as dev dep; strip from production build via Vite env flags. |
| lil-gui | 0.21.0 | Runtime parameter tweaking | Tune bloom threshold/intensity, particle counts, enemy speed, wave timing during dev without code restarts. Strip from prod build. |
| @types/three | 0.183.1 | TypeScript types for Three.js | Version-locked to three 0.183.x; critical — version mismatch between three and @types/three causes phantom TS errors. |

---

## Three.js Patterns for This Project

### Game Loop Pattern

Use `renderer.setAnimationLoop()` — not `requestAnimationFrame()` directly. It's the official Three.js pattern, handles XR integration (future-proof), and works correctly with both WebGL and WebGPU backends.

```typescript
// Correct: Three.js-idiomatic game loop
let lastTime = 0;
const FIXED_STEP = 1 / 60; // 60Hz fixed update
let accumulator = 0;

renderer.setAnimationLoop((time: number) => {
  const delta = Math.min((time - lastTime) / 1000, 0.1); // cap at 100ms to avoid spiral of death
  lastTime = time;

  accumulator += delta;
  while (accumulator >= FIXED_STEP) {
    update(FIXED_STEP); // fixed timestep for physics/movement
    accumulator -= FIXED_STEP;
  }

  render(accumulator / FIXED_STEP); // interpolation alpha for smooth visuals
  composer.render(); // postprocessing renders last
});
```

**Why fixed timestep:** Enemy movement, bullet physics, and collision detection must be deterministic. Variable delta causes bullets to tunnel through enemies at low frame rates. The accumulator pattern costs nothing and prevents an entire class of frame-rate-dependent bugs.

### Import Pattern (Three.js 0.160+)

```typescript
// Named imports — tree-shakeable, TypeScript-friendly
import {
  Scene,
  PerspectiveCamera,
  OrthographicCamera,
  WebGLRenderer,
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Matrix4,
  Color,
  LoadingManager,
  TextureLoader,
} from 'three';

// Addons use three/addons path (NOT three/examples/jsm — that path is deprecated since r150+)
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
```

**Do not use:** `import * as THREE from 'three'` — imports the entire 600KB+ library, defeats tree-shaking.

### Camera Setup for This Game

Use **OrthographicCamera** — Space Invaders is a 2D-plane game. OrthographicCamera eliminates perspective distortion, making hit detection and grid-based formation positioning trivial. Set Z-depth to position layering (background, enemies, player, UI).

```typescript
const aspect = window.innerWidth / window.innerHeight;
const viewHeight = 20; // world units visible vertically
const camera = new OrthographicCamera(
  -viewHeight * aspect / 2, // left
  viewHeight * aspect / 2,  // right
  viewHeight / 2,            // top
  -viewHeight / 2,           // bottom
  0.1,
  100
);
camera.position.z = 10;
```

### InstancedMesh for Performance

Use `InstancedMesh` for enemies, bullets, and particles that share the same geometry/material. Reduces draw calls from O(n) to O(1).

```typescript
// Pre-allocate pool for 200 enemies (max simultaneous in any wave)
const enemyMesh = new InstancedMesh(
  new PlaneGeometry(1, 1),
  new MeshBasicMaterial({ map: enemyTexture, transparent: true }),
  200
);
scene.add(enemyMesh);

// Per-frame: update only active slots
const matrix = new Matrix4();
for (let i = 0; i < activeCount; i++) {
  matrix.setPosition(enemies[i].x, enemies[i].y, 0);
  enemyMesh.setMatrixAt(i, matrix);
  enemyMesh.setColorAt(i, enemies[i].color);
}
enemyMesh.instanceMatrix.needsUpdate = true;
enemyMesh.instanceColor.needsUpdate = true;
```

### Post-Processing Pipeline (Bloom for Neon Aesthetic)

Use `pmndrs/postprocessing` — not Three.js built-in `UnrealBloomPass`. The pmndrs library merges multiple effects into one shader pass, critical for hitting 60fps with bloom + glitch + scanline all active.

```typescript
import { EffectComposer, RenderPass, EffectPass, BloomEffect, GlitchEffect } from 'postprocessing';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(
  camera,
  new BloomEffect({
    luminanceThreshold: 0.8,  // only surfaces emitting > 0.8 brightness bloom
    luminanceSmoothing: 0.025,
    intensity: 2.5,           // strong glow for neon Tokyo aesthetic
    radius: 0.75,
  }),
  // Additional effects in SAME pass = single shader = no extra draw call
));
```

**Neon emissive pattern:** All neon-glowing objects use `MeshBasicMaterial` (or `MeshStandardMaterial` with `emissiveIntensity > 1.0`). Colors above 1.0 luminance threshold glow through bloom. Enemy wave color palettes are assigned at wave spawn time.

### Asset Loading Pattern

Use `THREE.LoadingManager` for coordinated preloading before game starts. All textures load before first frame renders — no pop-in during play.

```typescript
const manager = new LoadingManager();
const textureLoader = new TextureLoader(manager);

manager.onProgress = (url, loaded, total) => {
  updateLoadingBar(loaded / total);
};
manager.onLoad = () => {
  hideLoadingScreen();
  startGame();
};

// Queue all assets
const shipTexture = textureLoader.load('/assets/ship.png');
const enemySheet = textureLoader.load('/assets/enemies.png');
```

### State Management Pattern

Zustand with domain slices — not one monolithic store. Each domain is an independent store slice.

```typescript
// Meta-progression store (persisted to localStorage)
const useMetaStore = create(
  persist(
    (set, get) => ({
      currency: 0,
      unlocks: {} as Record<string, boolean>,
      addCurrency: (amount: number) => set(s => ({ currency: s.currency + amount })),
      unlock: (id: string) => set(s => ({ unlocks: { ...s.unlocks, [id]: true } })),
    }),
    { name: 'super-space-invaders-meta' } // localStorage key
  )
);

// In-run state (NOT persisted — resets on browser close by design)
const useRunStore = create((set) => ({
  score: 0,
  lives: 3,
  wave: 1,
  inRunCurrency: 0,
  // ...
}));
```

---

## Installation

```bash
# Core runtime
npm install three postprocessing three.quarks zustand

# TypeScript support
npm install -D typescript @types/three

# Build tooling
npm install -D vite

# Dev tools (strip from prod)
npm install -D stats-gl lil-gui
```

**Vite config for Three.js:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',        // Three.js 0.160+ requires ES2017+
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false, // enable aggressive Three.js tree-shaking
      },
    },
  },
  server: {
    open: true,
  },
});
```

---

## WebGL vs WebGPU Decision

**Recommendation: Use WebGL 2 (default Three.js renderer) for v1.**

Three.js r171+ has production-ready WebGPU via `three/webgpu` import path with automatic WebGL 2 fallback. However:

- WebGPU performance in 2025 is inconsistent — some benchmarks show 2-4x LESS fps than WebGL on the same scene (GitHub issue #31055, Three.js forum)
- Safari WebGPU (launched Safari 26, September 2025) is new and unproven in production games
- This game's visual requirements (bloom + instanced enemies + particles) are achievable at 60fps with WebGL 2

**When to migrate to WebGPU:** If particle count needs to exceed ~50,000 simultaneous particles (WebGPU compute shaders unlock GPU-side particle simulation at millions). For this game's scale, WebGL 2 is sufficient.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Three.js (committed) | Phaser, PixiJS | WebGL 3D effects and portfolio differentiation require Three.js; Canvas2D alternatives can't match the visual ceiling |
| Vite | Webpack, Parcel | Vite's native ESM dev server enables HMR on Three.js shader changes without full rebuild; Webpack is slower and more complex to configure for Three.js |
| pmndrs/postprocessing | three.js built-in EffectComposer | pmndrs merges multiple effects into one shader pass; built-in stacks passes and pays full cost per effect — bloom + glitch + scanline would be 3 separate fullscreen passes |
| three.quarks | ShaderParticleEngine, custom GPGPU | three.quarks has active maintenance, TypeScript types, and a visual editor; ShaderParticleEngine has not had a commit since 2020; GPGPU is overkill for this particle scale |
| Zustand | Redux, Jotai, plain objects | Redux is overengineered for a single-player game; Jotai is React-centric; plain objects don't give the persist middleware for localStorage. Zustand has the smallest API surface for the most capability |
| OrthographicCamera | PerspectiveCamera | Space Invaders gameplay is on a 2D plane; orthographic removes depth distortion, makes collision hitboxes exact, simplifies formation grid math |
| TypeScript | Plain JavaScript | Game systems (roguelite state, artifact definitions, enemy wave scripts) are complex enough that runtime type errors during a portfolio demo would be catastrophic |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `import * as THREE from 'three'` | Imports entire 600KB+ library, defeats tree-shaking, larger initial bundle | Named imports: `import { Scene, InstancedMesh } from 'three'` |
| `three/examples/jsm/` import path | Deprecated since r150, removed in r160; causes bundler warnings | `three/addons/` path (e.g., `three/addons/controls/OrbitControls.js`) |
| Three.js built-in `UnrealBloomPass` | Each post-processing pass is a full fullscreen render operation; cannot merge with other effects | `BloomEffect` from `pmndrs/postprocessing` which merges into a single EffectPass |
| Physics engine (cannon-es, rapier) | This is a 2D-plane arcade shooter; all "physics" is kinematic: set position directly each frame | Direct position updates in fixed timestep loop; no physics simulation needed |
| React / React Three Fiber | R3F abstracts the Three.js API in ways that complicate direct game loop control; setAnimationLoop, InstancedMesh mutation, and custom post-processing are all harder through R3F | Vanilla Three.js with TypeScript; game engines don't need React's reconciler |
| CSS/HTML for game UI (in-game) | DOM queries in the render loop kill performance; CSS transitions fight with requestAnimationFrame timing | Three.js SpriteMaterial or CanvasTexture for in-world UI; HTML only for main menu and meta shop screens (outside the game loop) |
| `requestAnimationFrame` directly | Bypasses Three.js's render loop management; requires manual cleanup; doesn't handle tab visibility | `renderer.setAnimationLoop()` — the official Three.js pattern |
| Variable-delta game loop without fixed timestep | Bullet speed and enemy movement become frame-rate dependent; collision tunneling at low FPS | Fixed timestep accumulator pattern (see Game Loop Pattern above) |

---

## Stack Patterns by Variant

**In-game rendering (battle loop):**
- Three.js scene with OrthographicCamera
- InstancedMesh for enemies, player bullets, enemy bullets (separate InstancedMesh per group)
- three.quarks ParticleSystem for explosions, trails, muzzle flash
- pmndrs/postprocessing EffectComposer for bloom pipeline
- All UI (score, lives, wave number) via CanvasTexture updated each frame — no DOM

**Meta shop / main menu screens:**
- Plain HTML + CSS (outside the canvas, no Three.js overhead)
- Zustand store drives the UI state (unlocks, currency)
- Transition back to game: dispose HTML overlay, resume game renderer

**Wave scripting (campaign vs. endless):**
- Wave definitions as TypeScript data objects (not inline code)
- Campaign: hand-authored array of wave definition objects
- Endless: procedural wave generator that reads from the same enemy type definitions

**Saving / loading:**
- Zustand persist middleware auto-serializes meta store to localStorage on every state change
- In-run state explicitly excluded from persist — roguelite design: runs don't save mid-run
- localStorage key: `super-space-invaders-meta`; backup to `super-space-invaders-scores` for high scores

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| three@0.183.2 | @types/three@0.183.1 | Keep minor versions in sync. Mismatched @types/three causes phantom TS errors. |
| postprocessing@6.38.3 | three@0.183.x | pmndrs postprocessing tracks Three.js releases closely; check peer deps on upgrade |
| three.quarks@0.17.0 | three@0.17x-0.18x | Verify on install; API stable but check Three.js peer dep requirement |
| vite@7.3.1 | Node.js 20.19+ | Vite 7.x requires Node 20.19 or 22.12+; confirm CI/local Node version |
| zustand@5.0.11 | TypeScript 5.x | Zustand 5 drops React as a required peer dep; works standalone in non-React projects |

---

## Sources

- [Three.js r173 release notes — GitHub](https://github.com/mrdoob/three.js/releases/tag/r173) — Confirmed January 2025 release; r173 current at research time; npm shows 0.183.2 as latest
- [npm registry — three@0.183.2](https://www.npmjs.com/) — Version confirmed via `npm info three version`
- [npm registry — postprocessing@6.38.3](https://github.com/pmndrs/postprocessing) — Confirmed February 2026 release; peer dep reviewed
- [pmndrs/postprocessing GitHub](https://github.com/pmndrs/postprocessing) — Effect list, EffectPass shader merging architecture
- [Three.js InstancedMesh Docs](https://threejs.org/docs/#api/en/objects/InstancedMesh) — setMatrixAt/setColorAt patterns, needsUpdate flag
- [three.quarks GitHub](https://github.com/Alchemist0823/three.quarks) — 367 commits, MIT license, active Discord, quarks.art visual editor
- [WebGPU vs WebGL Three.js forum issue #31055](https://github.com/mrdoob/three.js/issues/31055) — Performance inconsistency evidence; basis for WebGL 2 recommendation for v1
- [Three.js best practices 2026 — utsubo.com](https://www.utsubo.com/blog/threejs-best-practices-100-tips) — "Under 100 draw calls" rule, stats-gl recommendation, particle scaling with WebGPU
- [Vite official docs — build options](https://vite.dev/config/build-options) — Tree-shaking config, esnext target
- [Zustand GitHub — pmndrs/zustand](https://github.com/pmndrs/zustand) — Persist middleware pattern, slice architecture
- [Three.js migration guide — GitHub wiki](https://github.com/mrdoob/three.js/wiki/Migration-Guide) — three/addons path replacing three/examples/jsm since r150+

---

*Stack research for: Browser-based arcade space shooter with roguelite meta-progression (Super Space Invaders X)*
*Researched: 2026-03-02*
