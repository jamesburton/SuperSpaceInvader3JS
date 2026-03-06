# Stack Research

**Domain:** Browser-based arcade space shooter — v1.1 additions: audio, gamepad, ship skins, new power-ups, CRT post-processing
**Researched:** 2026-03-06
**Confidence:** HIGH (all new additions verified; CRT/Scanline confirmed built into already-installed postprocessing@6.38.3)

---

## Context: What Already Exists (Do Not Re-research)

The following are committed, validated, and in production. This file only covers **new additions** needed for v1.1.

| Already In Stack | Version | Status |
|-----------------|---------|--------|
| Three.js | 0.183.2 | Production — InstancedMesh, OrthographicCamera, WebGL |
| postprocessing (pmndrs) | 6.38.3 | Production — SelectiveBloomEffect, EffectComposer |
| Zustand | 5.0.11 | Production — MetaState persist, RunState volatile |
| TypeScript | 5.9.3 | Production — `"lib": ["ESNext", "DOM"]` |
| Vite | 7.3.1 | Production |
| three.quarks | 0.17.0 | Production — particle effects |

---

## New Additions Required for v1.1

### Audio

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Howler.js | 2.2.4 | BGM loop + all SFX playback | 7KB gzipped, zero dependencies, single API for both Web Audio (primary) and HTML5 Audio (fallback). Audio sprites pack all SFX into one file/one `<audio>` tag — critical because browsers limit simultaneous `<audio>` elements. Web Audio API directly is achievable but requires building sprite scheduling, volume management, AudioContext unlock-on-interaction, and cross-browser quirks by hand. Howler handles all of this. @types/howler 2.2.12 covers TypeScript. Used by hundreds of browser games. No external deps align well with the zero-backend constraint. |

**Why not raw Web Audio API:** The Web Audio API is powerful but low-level. For this project (BGM loop + ~15 SFX) the required primitives — AudioContext unlock on first user gesture, audio sprite scheduling, looping with correct loop points, volume control, pause/resume — are all boilerplate that Howler.js encapsulates cleanly. Raw Web Audio saves 7KB but costs 200+ lines of plumbing. Not worth it for a portfolio scope game.

**Why not Tone.js:** Tone.js is a music synthesis/sequencing framework (~100KB gzipped). This project needs playback and looping, not synthesis. Tone.js is the right tool for a music creation app; Howler.js is the right tool for a game.

### Gamepad

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Web Gamepad API (built-in) | — | Read controller buttons and axes | Zero install — `navigator.getGamepads()` is W3C standard, baseline-supported across all modern browsers. TypeScript types ship with `lib.dom.d.ts` which the project already includes (`"lib": ["ESNext", "DOM"]` in tsconfig.json). No npm package needed. Polling integrates directly into the existing fixed-timestep game loop. |

**Pattern:** Gamepad API is polled (not event-driven) — call `navigator.getGamepads()` once per fixed-update frame and read button/axes state. This is the same model as the existing `InputManager` which already reads `Set<string>` for held keys per frame. Extend `InputManager` with a `pollGamepad()` method; the rest of the game consumes the same `isDown()`/`justPressed()` interface.

**No third-party library needed.** Libraries like `gamecontroller.js` add gamepad mapping and vibration APIs, but the project needs Standard Gamepad layout only (Xbox/PS4/Switch Pro all map to the standard 16-button layout in modern browsers). The TypeScript `Gamepad` and `GamepadButton` interfaces in `lib.dom.d.ts` are complete.

**Dead-zone:** Analog stick axes require a dead-zone threshold (typically ±0.15) to suppress drift noise. This is 3 lines of code, not a library.

### CRT / Scanline Post-Processing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ScanlineEffect` (pmndrs/postprocessing) | Already installed — 6.38.3 | CRT scanline overlay | **Zero new install.** `ScanlineEffect` is already exported from the `postprocessing` package that is installed and in use. Just import and add to the existing `EffectPass`. Merges into the single-pass pipeline at no extra GPU cost. |
| `VignetteEffect` (pmndrs/postprocessing) | Already installed — 6.38.3 | Screen edge darkening for CRT feel | Same package — zero install cost. Adds authenticity to CRT preset without any extra render pass. |
| `ChromaticAberrationEffect` (pmndrs/postprocessing) | Already installed — 6.38.3 | RGB fringe for CRT aberration | Same package — zero install cost. Optional addition to higher-tier CRT unlocks. |

**Integration:** The existing `BloomEffect.ts` wraps a single `EffectComposer` with a `RenderPass` and one `EffectPass(camera, bloom)`. The CRT effects merge into the same `EffectPass` — add them as additional arguments:

```typescript
const effectPass = new EffectPass(
  camera,
  bloom,          // already present
  scanline,       // new — add when unlocked
  vignette,       // new — add when unlocked
);
```

Multiple effects in a single `EffectPass` compile into **one merged shader** — no extra fullscreen render pass cost per effect added.

**Intensity slider:** `ScanlineEffect` takes `{ density: number }` (higher = tighter scanlines). `VignetteEffect` takes `{ darkness: number, offset: number }`. Both properties are mutable at runtime — no need to rebuild the pipeline, just update `scanlineEffect.density = value` and the effect adjusts immediately.

### New Power-Up Visual Effects

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `three.quarks` (already installed) | 0.17.0 | Beam laser trail, homing missile exhaust, time-slow pulse aura | Already in the stack for particle effects. Extend the existing `ParticleManager` with new `ParticleSystem` configs per power-up type. No new dependency. |
| Custom `Line` / `LineSegments` (Three.js built-in) | 0.183.2 | Continuous beam laser geometry | Three.js `Line` with `LineBasicMaterial` or a thin `PlaneGeometry` quad is the right primitive for a beam laser — cheaper than a particle trail for a sustained line. Add to bloom selection for the neon glow. |

**Time-slow visual:** A full-screen desaturation pulse fits `pmndrs/postprocessing` — either a brief `HueSaturationEffect` (also already in postprocessing) lerped to grayscale, or a simple custom `Effect` subclass. No new library.

---

## Supporting Libraries (New Installs)

| Library | Version | Purpose | Install |
|---------|---------|---------|---------|
| howler | 2.2.4 | Audio playback (BGM + SFX) | `npm install howler` |
| @types/howler | 2.2.12 | TypeScript types for Howler.js | `npm install -D @types/howler` |

**That's it. Two packages.** Everything else (Gamepad API, CRT effects, power-up visuals) uses what is already installed.

---

## Installation

```bash
# New runtime dependency
npm install howler

# New dev dependency (TypeScript types only)
npm install -D @types/howler
```

No other changes to package.json.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tone.js | ~100KB gzipped synthesis/sequencing framework. This project needs playback, not synthesis. Massive overkill. | `howler` (7KB) |
| Raw Web Audio API (no library) | Requires building AudioContext unlock handler, sprite scheduler, looping, and cross-browser quirks from scratch — ~200 lines of plumbing for the same result | `howler` |
| `gamecontroller.js` or `mmk.gamepad` | Adds abstraction over an already-simple polling API. The Standard Gamepad layout is already normalized by modern browsers; no mapping library needed | `navigator.getGamepads()` directly |
| Additional postprocessing passes for CRT | Each new `EffectPass` is a fullscreen render operation. CRT effects must go in the **same** `EffectPass` as bloom, not separate passes. | Combine all effects in one `EffectPass` |
| `three-stdlib` (formerly three/examples/jsm wrappers) | Unnecessary abstraction layer; all needed Three.js add-ons already available via `three/addons/` path | Direct `three/addons/` imports |
| Any physics engine for homing missiles | Homing is a 2D steering/rotation algorithm — angle to target + angular speed cap. Cannon-es or Rapier are not needed. | Atan2-based pure-pursuit in the existing `MovementSystem` |
| A separate audio sprite generation tool | Only needed if building the sprite sheet from scratch. Just use Audacity or online tools to prepare the audio file; Howler accepts manual sprite offset/duration definitions in TypeScript | Manual sprite config |

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Is Better |
|-------------|-------------|---------------------------|
| `howler` 2.2.4 | Raw Web Audio API | When building a music application needing DSP node graphs, custom filters, or synthesis — not a game with fixed SFX clips |
| `howler` 2.2.4 | Tone.js | When building a music sequencer, live instrument interface, or procedurally generated audio — not an arcade game |
| Web Gamepad API (built-in) | `gamecontroller.js` | When needing vibration/haptics across many controller models with different vendor IDs, or remapping non-standard controllers |
| ScanlineEffect (already installed) | Custom GLSL shader `Effect` | When needing effects beyond what pmndrs provides — e.g., pixel-accurate phosphor dot simulation. Not needed here. |

---

## Integration Points with Existing Stack

### Audio + Game Loop

Howler.js manages its own AudioContext internally. The only integration points are:
1. Call `Howl.play()` on game events (shoot, enemy death, power-up pickup, BGM start/stop)
2. Call `Howler.volume(0)` on pause, restore on resume
3. AudioContext unlock: Howler auto-handles the "AudioContext requires user gesture" restriction — it queues audio until the first click/keypress

No changes to the fixed-timestep game loop. Howler runs independently.

### Gamepad + InputManager

`InputManager` currently tracks keyboard state with `heldKeys: Set<string>` and `justPressedKeys: Set<string>`. The gamepad extension adds:

```typescript
// InputManager.ts additions
private gamepad: Gamepad | null = null;
private prevButtons: readonly GamepadButton[] = [];

public pollGamepad(): void {
  const pads = navigator.getGamepads();
  this.gamepad = pads[0] ?? null; // take first connected gamepad
}

// Map to same interface: isDown(code) accepts both key codes and gamepad virtual codes
// e.g., 'GP_A', 'GP_LEFT', 'GP_RIGHT', 'GP_START'
```

The rest of the game code (states, systems) reads `inputManager.isDown('GP_A')` exactly like `inputManager.isDown('Space')`. The mapping is:

| Gameplay Action | Keyboard | Gamepad (Standard) |
|-----------------|----------|--------------------|
| Move left | ArrowLeft | Axis 0 < -0.15 |
| Move right | ArrowRight | Axis 0 > 0.15 |
| Fire | Space | Button 0 (A/Cross) |
| Pause | Escape | Button 9 (Start) |
| Navigate menus | Arrow keys | D-pad (buttons 12-15) or axis |
| Confirm | Space/Enter | Button 0 (A/Cross) |

`pollGamepad()` is called once per fixed-update step, before input reads, same as the keyboard clear pattern.

### CRT Effects + BloomEffect.ts

The existing `BloomEffect.ts` constructor builds:
```
RenderPass → EffectPass(camera, bloom)
```

The CRT preset adds effects to the same `EffectPass` argument list:
```
RenderPass → EffectPass(camera, bloom, scanline?, vignette?, chromaticAberration?)
```

Since `EffectPass` must be rebuilt when effect composition changes (the library compiles a merged shader), the `BloomEffect` class needs to expose a `setPreset(preset: CRTPreset)` method that rebuilds the `EffectPass` when the player unlocks a new CRT tier. This rebuild is a one-time operation (not per-frame), so performance is not a concern.

**CRT intensity at runtime:** After EffectPass construction, individual effect properties are mutable:
```typescript
scanlineEffect.density = 1.0 + (tier * 0.25);  // tier 0-3
vignetteEffect.darkness = 0.3 + (tier * 0.1);
```

CRT tier is stored in `MetaState.purchasedUpgrades[]` (existing field, same pattern as other unlocks).

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| howler@2.2.4 | All modern browsers (Chrome, Firefox, Safari, Edge) | No Three.js interaction. AudioContext is independent of WebGL context. |
| @types/howler@2.2.12 | TypeScript 5.x | Provides `Howl`, `HowlOptions`, `Howler` global types |
| Web Gamepad API | TypeScript via `lib.dom.d.ts` | Already included — `"lib": ["ESNext", "DOM"]` in tsconfig.json; no `@types/gamepad` needed |
| ScanlineEffect (postprocessing@6.38.3) | Already installed | No version change needed |
| VignetteEffect (postprocessing@6.38.3) | Already installed | No version change needed |
| ChromaticAberrationEffect (postprocessing@6.38.3) | Already installed | No version change needed |

---

## Stack Patterns by Feature

**If adding audio:**
- Use `Howl` for SFX sprites (one JSON config object with all sound offsets)
- Use a separate looping `Howl` for BGM with `loop: true`
- Store the `Howl` instances in a singleton `AudioManager` class (not in Zustand — audio state is volatile)
- Expose `AudioManager.sfx('shoot')`, `AudioManager.bgm.play()`, `AudioManager.setVolume(v)` — clean interface for all systems

**If adding gamepad:**
- Extend `InputManager.pollGamepad()` — called once per fixed step
- Map gamepad input to virtual action codes (`GP_A`, `GP_LEFT`, etc.)
- All existing `isDown()`/`justPressed()` call sites need no changes if virtual codes are added alongside keyboard codes
- Register `gamepadconnected`/`gamepaddisconnected` events to show/hide a controller icon in HUD

**If adding CRT presets:**
- Add `crtTier: 0 | 1 | 2 | 3` to `MetaState` (new persisted field, add to migration as v4)
- Expose `BloomEffect.setCRTTier(tier)` which rebuilds the `EffectPass` with tier-appropriate effects
- Tier 0 = no CRT; Tier 1 = ScanlineEffect only; Tier 2 = Scanline + Vignette; Tier 3 = Scanline + Vignette + ChromaticAberration
- Call `BloomEffect.setCRTTier()` on state restore (game load) and on meta shop purchase

**If adding new power-up visuals:**
- Homing missile trail: new `three.quarks` `ParticleSystem` config with stretched-billboard mode
- Beam laser: `PlaneGeometry` quad (1px wide, full screen height) with emissive material + bloom selection
- Time-slow pulse: brief `HueSaturationEffect` animation (0 saturation → restore over 0.5s), already in postprocessing@6.38.3

---

## Sources

- [howler.js npm — howler@2.2.4](https://www.npmjs.com/package/howler) — Version 2.2.4, last published March 2024. 700K weekly downloads. MEDIUM confidence (2 year old release but still dominant game audio library)
- [@types/howler npm — 2.2.12](https://www.npmjs.com/package/@types/howler) — TypeScript type definitions, last published ~1 year ago
- [MDN — Web Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) — Authoritative spec; Gamepad, GamepadButton, navigator.getGamepads() documented. HIGH confidence.
- [MDN — Navigator.getGamepads()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads) — Polling pattern; Standard mapping layout. HIGH confidence.
- [pmndrs/postprocessing ScanlineEffect docs](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/ScanlineEffect.js~ScanlineEffect.html) — density parameter, BlendFunction options. MEDIUM confidence (doc page confirmed in search; density: 1.25 usage pattern confirmed from TresJS guide)
- [pmndrs/postprocessing GitHub](https://github.com/pmndrs/postprocessing) — ScanlineEffect, VignetteEffect, ChromaticAberrationEffect all confirmed exported from package. HIGH confidence.
- [TypeScript tsconfig.json — DOM lib](C:/Development/SuperSpaceInvader3JS/tsconfig.json) — `"lib": ["ESNext", "DOM"]` confirmed. Gamepad types in lib.dom.d.ts require no additional install. HIGH confidence (first-party verification).
- [HTML5 Gamepad API Developer Guide 2026](https://gamepadtester.pro/the-html5-gamepad-api-a-developers-guide-to-browser-controllers/) — Standard gamepad layout, polling pattern, dead-zone pattern. MEDIUM confidence.
- [Howler.js vs Tone.js comparison — UIModule](https://uimodule.com/introduction-to-frontend-web-audio-tools-howler-js-and-tone-js/) — Tone.js = synthesis/sequencing; Howler.js = playback/game audio. HIGH confidence.

---

*Stack research for: Super Space Invaders X v1.1 — Audio, Gamepad, CRT shaders, Power-up visuals*
*Researched: 2026-03-06*
