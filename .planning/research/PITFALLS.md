# Pitfalls Research

**Domain:** Three.js/WebGL Browser Space Shooter — v1.1 Feature Additions (Audio, Gamepad, Ship Skins, Laser Power-Ups, Expanded Meta Shop, CRT Post-Processing)
**Researched:** 2026-03-06
**Confidence:** HIGH (audio autoplay, post-processing pipeline, Zustand migration — official docs confirmed), MEDIUM (gamepad quirks, beam rendering, economy balance — community + MDN sources), LOW (time-slow integration pitfalls — inference from fixed-timestep theory)

---

## Critical Pitfalls

### Pitfall 1: AudioContext Created Before User Gesture — Always Suspended

**What goes wrong:**
The game creates an `AudioContext` at startup to load and decode audio assets. Chrome, Firefox, and Safari all enforce the autoplay policy: any `AudioContext` created before a user gesture (click, keypress, gamepad button) starts in the `"suspended"` state. Calling `.play()` or `.start()` on any node in a suspended context silently does nothing — no error, no sound, no feedback. The BGM never plays. SFX for the title screen fire button also silently fail. The developer tests with DevTools open (which counts as user interaction in some browser builds) and never sees the bug.

**Why it happens:**
Developers load audio during `Game.init()` alongside textures and geometry — a natural "load everything before the game starts" approach. The `AudioContext` is instantiated there, before the player has clicked anything. The browser suspends it. `decodeAudioData()` works fine (decoding doesn't require the context to be running), so assets load, everything looks ready, and the bug only manifests when the game actually tries to play sound.

**How to avoid:**
Create the `AudioContext` lazily — inside the first user-gesture handler, or call `audioContext.resume()` inside it. The existing `TitleState` already captures the first keypress to start a run; hook audio unlock into that same gesture. Pattern:

```typescript
// AudioManager.ts
class AudioManager {
  private ctx: AudioContext | null = null;

  /** Call from inside a user gesture handler (keydown, click) */
  public unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Check before playing anything */
  public get isRunning(): boolean {
    return this.ctx?.state === 'running';
  }
}
```

A single unlock call in the title screen's "press any key" handler covers all subsequent audio for the session. Do not unlock in a `mousedown` listener only — the game uses keyboard-only controls; use `keydown` or `gamepadconnected` + first button press.

**Warning signs:**
- `audioContext.state === 'suspended'` in the console after the game loads
- BGM starts playing in DevTools but not in a normal browser tab
- SFX callback fires (confirmed via `console.log`) but no sound plays
- Chrome console warning: `"The AudioContext was not allowed to start. It must be resumed after a user gesture."`

**Phase to address:** Audio phase (first feature added in v1.1) — audio unlock architecture must be established before any BGM or SFX is wired

---

### Pitfall 2: BGM Loop Gap — Seamless Loop Requires Exact Loop Points

**What goes wrong:**
The synthwave BGM is set to `loop: true` on an `AudioBufferSourceNode`. When using a standard MP3 or OGG with `loop = true`, Web Audio inserts a silence gap at the loop boundary. This is an encoding artifact: MP3 adds encoder delay at the start; OGG adds priming silence. The gap is 26–80ms depending on encoder. It sounds like a rhythmic click or skip every time the track loops — extremely audible in a sparse synthwave arrangement.

**Why it happens:**
`AudioBufferSourceNode.loop = true` loops the entire buffer. Encoder silence is part of the buffer. Developers test with a short loop, notice the glitch, assume it's a timing bug in their code, and spend hours debugging the wrong thing.

**How to avoid:**
Use `loopStart` and `loopEnd` properties to trim encoder padding. Alternatively, author the BGM as a WAV or FLAC (lossless, no encoder delay). If using MP3/OGG, analyze the track with Audacity or a DAW to find the exact sample-accurate loop points, then set:

```typescript
source.loop = true;
source.loopStart = 0.046; // trim encoder delay (seconds)
source.loopEnd = bufferDuration - 0.020; // trim tail silence
```

The safest approach: deliver BGM as a WAV file decrypted into an `AudioBuffer`. WAV has no encoder padding. File size is larger but acceptable for a single BGM track (2-3 MB for a 2-minute loop in 44100Hz mono/stereo).

**Warning signs:**
- Audible click or stutter every 60-120 seconds when the track loops
- Loop sounds perfectly seamless in Audacity playback but glitches in-browser
- Loop boundary timing shifts slightly between browser refreshes

**Phase to address:** Audio phase — select audio format and set loop points before shipping BGM

---

### Pitfall 3: Gamepad API — Buttons Not Visible Until First Hardware Interaction

**What goes wrong:**
The game checks `navigator.getGamepads()` in the game loop to read controller input. Even with a gamepad physically connected, the array returns empty objects (or null entries) until the user presses a button. This is a privacy protection in all modern browsers. Consequence: the "gamepad connected" indicator shows nothing, players press buttons and nothing happens, they assume the game does not support their controller.

**Why it happens:**
Developers test on their own machine where the gamepad was already "seen" by the browser from previous interactions. The first-run experience for a fresh browser profile reveals the bug. The `gamepadconnected` event also does not fire until the first button press — reading `navigator.getGamepads()` eagerly is not enough.

**How to avoid:**
Show a clear "press any button on your gamepad to connect" prompt in the title screen or settings. Listen for `gamepadconnected` event to detect activation, then begin polling:

```typescript
window.addEventListener('gamepadconnected', (e) => {
  this.gamepadIndex = e.gamepad.index;
  this.gamepadActive = true;
  hud.showGamepadConnected();
});

window.addEventListener('gamepaddisconnected', (e) => {
  if (e.gamepad.index === this.gamepadIndex) {
    this.gamepadActive = false;
    hud.showKeyboardFallback();
  }
});
```

Poll only after `gamepadconnected` fires. Never rely on `navigator.getGamepads()` returning non-null at game start.

**Warning signs:**
- Gamepad input works after first test run but not after clearing browser storage
- `navigator.getGamepads()` returns `[null, null, null, null]` array despite gamepad connected
- `gamepadconnected` event logs the gamepad correctly but input polling finds empty buttons array

**Phase to address:** Gamepad phase — input architecture decision; also add the "press any button" prompt to UI

---

### Pitfall 4: Gamepad Axis Drift Without Deadzone — Constant Phantom Movement

**What goes wrong:**
The left stick axis values are read raw from `gamepad.axes[0]` and `gamepad.axes[1]`. Even at rest, cheap controllers (and many mid-range ones) return values like 0.032, -0.018, 0.003 — never exactly 0.0. The player ship drifts constantly without touching the controller. On Hall Effect sticks this value is smaller (0.001–0.005) but still nonzero. The game becomes unplayable without a deadzone filter.

**Why it happens:**
The developer tests with their own controller (probably a newer Xbox or PS5 pad with tight tolerances) and the raw value is close enough to 0 that drift is unnoticeable at their game's movement speed. Players with older controllers report constant drift. The `gamepad.axes` array has no built-in deadzone — it is purely raw hardware data.

**How to avoid:**
Apply a radial deadzone (not axial) to both stick axes together before converting to player movement:

```typescript
function applyDeadzone(x: number, y: number, deadzone = 0.12): [number, number] {
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude < deadzone) return [0, 0];
  // Rescale to 0-1 range outside the deadzone
  const scale = (magnitude - deadzone) / (1 - deadzone);
  return [(x / magnitude) * scale, (y / magnitude) * scale];
}
```

A radial deadzone of 0.10–0.15 covers all consumer controllers without sacrificing responsiveness. Axial deadzones (separate X and Y checks) create diagonal dead corridors that feel wrong for analogue movement.

**Warning signs:**
- Ship moves slowly in a direction when no stick input is applied
- Movement varies with controller brand in testing
- Raw `gamepad.axes[0]` logs non-zero values at controller rest

**Phase to address:** Gamepad phase — apply deadzone at the input layer, not at the movement system level

---

### Pitfall 5: Gamepad Button Mapping — Non-Standard Controllers Return `mapping: ""`

**What goes wrong:**
The Gamepad API Standard Gamepad mapping (modeled on Xbox 360 layout) works correctly for Xbox controllers and most PS5 controllers in Chrome. However, Firefox does not correctly map PS5 DualSense controllers — `gamepad.mapping` returns `""` (empty string) instead of `"standard"`, meaning `buttons[0]` is not guaranteed to be the south button. D-pad inputs appear as axis values instead of button indices 12-15. The game's button bindings work in Chrome but are completely wrong in Firefox with a PS5 pad.

**Why it happens:**
The W3C Standard Gamepad spec exists, but browser implementation of hardware-specific mappings is inconsistent. Chrome implements the most controller profiles; Firefox has a known PS5 DualSense mapping bug (Bugzilla issue #1922925 as of early 2026). Safari has historically had the worst Gamepad API support.

**How to avoid:**
Always check `gamepad.mapping === 'standard'` before using button index assumptions. If mapping is empty, fall back to a remapping screen or display a warning that the controller may not be fully supported. For v1.1 scope, explicitly support `mapping === 'standard'` controllers (Xbox, most PS controllers in Chrome) and warn on others. Do not silently fail — show the user which buttons are detected. Alternatively, provide a gamepad button remapping UI (though this is significant scope; a simpler "we detected a non-standard controller, button mapping may be incorrect" warning is acceptable for v1.1).

**Warning signs:**
- Gamepad input works in Chrome but not Firefox with the same controller
- `gamepad.mapping` logs as empty string in console
- D-pad movement triggers in unexpected directions or not at all

**Phase to address:** Gamepad phase — mapping check belongs in the gamepad input handler before any button binding

---

### Pitfall 6: CRT/Scanline Effect Breaks SelectiveBloom — Wrong EffectPass Order

**What goes wrong:**
The existing bloom pipeline uses `SelectiveBloomEffect` in an `EffectPass` — the selective variant works by rendering the scene to an internal buffer with only bloom-registered objects visible, then compositing. Adding a `ScanlineEffect` (or a custom CRT shader) in a separate `EffectPass` after the bloom pass processes the final composited output — scanlines appear on top of the bloom glow, which is visually correct. However, if `ScanlineEffect` is placed in the same `EffectPass` as `SelectiveBloomEffect`, the merge order within pmndrs/postprocessing may cause the scanlines to be drawn before the bloom is composited, making bloom invisible on scanline rows. Additionally, some CRT shaders sample the input buffer directly — if they run before `SelectiveBloomEffect` finishes its internal passes, they read un-bloomed pixel data.

**Why it happens:**
pmndrs/postprocessing merges all effects in a single `EffectPass` into one shader for performance. The merge order within the pass matters — effects are applied top-to-bottom in the order they are passed to the constructor. Developers add `ScanlineEffect` alongside `SelectiveBloomEffect` in the same `EffectPass` call for efficiency, not realizing the ordering conflict.

**How to avoid:**
Keep `SelectiveBloomEffect` in its own dedicated `EffectPass`. Add `ScanlineEffect` (and any other CRT effects) in a subsequent `EffectPass`:

```typescript
// Correct: bloom resolves first, CRT applies to the bloomed result
const bloomPass = new EffectPass(camera, selectiveBloomEffect);
const crtPass = new EffectPass(camera, scanlineEffect, vignetteEffect);

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(crtPass); // runs after bloom is fully composited
```

This costs one additional render operation but ensures the CRT scanlines are applied to the final post-bloom image, which is the correct visual result. Test with intensity slider at maximum to verify scanlines do not interact with bloom halos.

**Warning signs:**
- Bloom glow disappears or weakens when CRT effect is enabled
- Scanlines appear to "cut through" the bloom halo on neon elements
- Disabling one effect makes the other look correct but they conflict when both active

**Phase to address:** CRT phase — established before CRT effect is iterated on visually

---

### Pitfall 7: Zustand Meta Store Schema Migration — v4 Bump Required for Every New Persistent Field

**What goes wrong:**
v1.1 adds ship skins, starting power-up slot, extra lives (meta unlockable), difficulty unlocks, and CRT preset progression to the meta store. Each of these adds new fields to the `MetaStore` interface. Players upgrading from v1.0 have a v3 save in localStorage. If the `version` field in the persist middleware is not bumped to 4 and a migration step is not added, Zustand will either: (a) ignore the stored data and start fresh (losing all SI$, purchases, and campaign progress) if the version mismatch exceeds what Zustand's `merge` strategy handles, or (b) hydrate with missing fields as `undefined`, causing TypeScript runtime errors when the new skin/difficulty code reads those fields.

**Why it happens:**
The code already has a working migration pattern (v0 → v1 → v2 → v3 in `MetaState.ts`). The pitfall is adding new fields without incrementing `version` in the persist options, assuming "Zustand will just use defaults." Zustand's default merge behavior is a shallow merge — it does add new fields from the initial state, but it does NOT call the `migrate` function if the version number matches. Only a version bump triggers migration. Missing the bump means the code is correct but untested against the live save format.

**How to avoid:**
For every new persistent field added in v1.1: (1) add the field to the `MetaStore` interface with its type, (2) set its initial value in the store initializer, (3) bump `version` in persist options from 3 to 4, and (4) add a `version < 4` migration block that sets all new v1.1 fields to their defaults:

```typescript
// In migrate function
if (version < 4) {
  state = {
    ...state,
    equippedSkin: 'default',
    ownedSkins: [],
    startingPowerUpSlot: null,
    difficultyUnlocks: [],
    crtPresetLevel: 0,
    saveVersion: 4,
  };
}
```

Test migration by manually setting the localStorage key to a v3 JSON blob, refreshing, and verifying the v3 data survives intact while v1.1 fields initialize to defaults.

**Warning signs:**
- Persistent `undefined` errors in TypeScript for new meta fields during dev
- Test with a v3 save blob: new fields are `undefined` instead of their defaults
- `SAVE_VERSION` constant in source still reads 3 when v1.1 features are in the store

**Phase to address:** Meta shop expansion phase — version bump on first new persistent field, before any new shop logic reads the field

---

### Pitfall 8: Beam Laser Rendering — Continuous Mesh Update Per Frame Breaks Object Pool Assumptions

**What goes wrong:**
Continuous beam laser, charged burst laser, and sweeping laser all require a visible "beam" — a elongated shape that originates at the player ship and extends to the first hit target (or screen edge). This beam is not a bullet (point moving through space); it is a persistent shape that must update its length, rotation, and terminus position every frame while active. The existing `ObjectPool` and `InstancedMesh` architecture assumes pooled objects have fixed geometry that is repositioned — not geometry that changes shape (length, angle). The naive implementation creates a new `PlaneGeometry` every frame as the beam scales, generating geometry GC pressure and exactly the kind of allocation the pool was designed to prevent.

**Why it happens:**
Beams are not bullets. Developers reuse the bullet architecture ("acquire from pool, set position, release on deactivation") but a beam's visual length depends on collision distance, which changes every frame. They resize by calling `geometry.scale()` or creating a new geometry — both wrong. Scale changes distort UVs and the visual texture. New geometry creates allocations.

**How to avoid:**
Implement beams as a **separate rendering path** from bullets. Use a single non-pooled `Mesh` with a `PlaneGeometry` whose vertices are updated directly, or more simply: use a thin `BoxGeometry` (width = beam visual width, height updated via `mesh.scale.y` — scale on a fixed geometry is acceptable since the beam texture should tile, not stretch). The beam mesh is a singleton per beam type (at most 1 continuous beam active at a time), not pooled. Its visibility is toggled on/off; its `scale.y` (or equivalent length axis) is set each frame to reflect hit distance:

```typescript
// BeamRenderer: pre-allocated mesh, reused via scale
class BeamRenderer {
  private readonly mesh: THREE.Mesh;
  constructor(scene: THREE.Scene) {
    // 1 unit tall; scale.y = beam length in world units each frame
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(BEAM_WIDTH, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, blending: THREE.AdditiveBlending, transparent: true }),
    );
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public update(originX: number, originY: number, hitY: number): void {
    const length = hitY - originY;
    this.mesh.position.set(originX, originY + length / 2, 1);
    this.mesh.scale.set(1, length, 1);
    this.mesh.visible = true;
  }

  public deactivate(): void { this.mesh.visible = false; }
}
```

Register the beam mesh with `bloomEffect.selection` to make it glow. Draw calls: +1 per active beam type, which is acceptable.

**Warning signs:**
- `renderer.info.memory.geometries` increases when beams are active and firing
- GC events visible in DevTools during continuous beam fire
- Beam visual texture stretches or distorts when length changes

**Phase to address:** Power-up implementation phase — establish beam renderer pattern before any of the three laser types are built

---

### Pitfall 9: Time-Slow Power-Up — Slowing Only Game Objects While Audio Continues at Normal Rate

**What goes wrong:**
Time slow affects enemy movement, enemy AI, and enemy projectile speeds. If implemented by scaling the fixed timestep `dt` passed to all systems, it also slows the player ship (unintended), particle effects (they hang in the air unnaturally), and audio playback speed does not match the visual slowdown (enemies are slow-motion but weapon sounds fire at normal speed). The result is deeply dissonant: the player fires at full speed into a slow-motion field, and the SFX timing is wrong.

**Why it happens:**
The simplest implementation: multiply `dt` by `timeScale` before passing to all systems. This is what the fixed-timestep theory literature recommends for global time scaling (see Gaffer on Games). But a space shooter time-slow power-up should slow enemies specifically, not the player or audio. Treating `timeScale` as global collapses all the distinctions that make time-slow feel like a power rather than lag.

**How to avoid:**
Do not scale the global `dt`. Instead, pass a per-system time scale multiplier. Enemies receive `dt * timeSlowFactor` (0.3 for strong time slow). Player receives full `dt`. Particles receive full `dt` (they look better at normal speed anyway, maintaining the contrast). Audio: the Web Audio API has no easy "slow BGM pitch without stopping" that sounds good; just let audio run at normal rate. Players accept the audio/visual desync in time-slow power-ups as a design convention (it is universal across the genre). If audio sync is critical, consider a filter (low-pass / reverb wet increase) to suggest slowdown without pitch-shifting the BGM.

Implementation: add a `timeScale: number` property to `RunState` (default 1.0). `AISystem`, `MovementSystem` for enemies, and enemy weapon systems read `runState.timeScale * dt` instead of raw `dt`. Player's `MovementSystem` uses raw `dt`.

**Warning signs:**
- Player movement feels sluggish during time slow
- Particles appear to freeze in place during time slow
- Enemy AI state machine transitions slow down (they fire significantly less often than expected outside time slow)

**Phase to address:** Power-up phase (time-slow) — design the time-scale approach in the phase plan before coding begins

---

### Pitfall 10: Homing Missile Rotation in InstancedMesh — needsUpdate Overhead

**What goes wrong:**
Homing missiles must rotate each frame to face their target. The existing bullet system uses `InstancedMesh` — all bullets share the same geometry/material in a single draw call. Updating per-instance rotation in `InstancedMesh` requires calling `setMatrixAt(i, matrix)` and setting `instanceMatrix.needsUpdate = true` every frame for every active homing missile. This upload cost for the matrix buffer is acceptable at low counts (< 20 missiles), but if homing missiles stack with other in-flight bullets, uploading the entire instance matrix buffer (including all non-homing bullets) every frame for a rotation change is wasteful. Worse: the existing bullet `InstancedMesh` does not store rotation — bullets are always vertical (pointing up). Adding rotation to the shared bullet `InstancedMesh` requires restructuring how all bullets are updated.

**Why it happens:**
Developers attempt to add homing logic to the existing `BulletPool` / `InstancedMesh` bullet architecture. The pool stores bullet state in a JS array; the `InstancedMesh` matrix only encodes position (with identity rotation). To add per-instance rotation, the matrix update loop must be changed — but this touches all bullet rendering, not just homing missiles.

**How to avoid:**
Give homing missiles their own dedicated small `InstancedMesh` (max 10 instances — homing missiles are rare and expensive). This keeps the player standard bullet `InstancedMesh` unchanged (no rotation needed, cheaper matrix update). The homing missile `InstancedMesh` updates rotation every frame only for the active count. Matrix composition for rotation uses a pre-allocated `THREE.Matrix4` and a temporary `THREE.Object3D` (the standard dummy object pattern):

```typescript
const dummy = new THREE.Object3D();
// Per active homing missile:
dummy.position.set(missile.x, missile.y, 0);
dummy.rotation.z = Math.atan2(missile.vy, missile.vx) - Math.PI / 2;
dummy.updateMatrix();
homingMesh.setMatrixAt(i, dummy.matrix);
homingMesh.instanceMatrix.needsUpdate = true;
```

Keep the `dummy` object as a class-level field — do not create it in the update loop.

**Warning signs:**
- `new THREE.Object3D()` or `new THREE.Matrix4()` inside the game loop update function
- All bullets' `InstancedMesh` matrix buffer is marked `needsUpdate = true` even when no homing missiles are active
- Homing missiles always point straight up regardless of their velocity direction

**Phase to address:** Power-up phase (homing) — architecture decision before homing logic is written

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single global `AudioContext` created at module load | Simple audio API | Always suspended in Chrome; silent failure with no error | Never — create lazily in user gesture handler |
| `gamepad.axes[0]` read raw without deadzone | Less code | Constant drift on consumer hardware; unplayable | Never — always apply deadzone at read site |
| CRT scanline in same `EffectPass` as bloom | One fewer render op | Bloom and CRT visually conflict; hours of debugging | Never — the performance difference is negligible |
| Scale bullet `InstancedMesh` to also serve as laser beam | Reuses existing pool | Geometry scaling distorts textures; pool semantics break | Never — beams need their own dedicated mesh |
| Global `dt * timeSlowFactor` for time slow | Simple one-liner | Slows player + audio + particles; feels like a frame rate drop not a power | Never for player-affecting time slow; acceptable for cutscene global slow |
| Skip version bump in Zustand persist on "minor" field addition | Less code | Existing saves hydrate with `undefined` new fields; runtime crash | Never — always bump version on any new persistent field |
| Raw `navigator.getGamepads()` polling at startup | Immediate controller state | Returns null/empty until first button press; silent no-op | Acceptable as a fallback after `gamepadconnected` fires, not as primary detection |
| Add ship skin as color tint on existing player geometry | Fast to implement | Skins feel cosmetically shallow; geometry shapes need separate meshes | Only if shipping "color variant" as a subset of skins; not acceptable as the full skin system |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Web Audio + game loop | Calling `context.play()` inside `Game.init()` or the render loop setup | Create `AudioContext` lazily; unlock in first user gesture; play BGM in `AudioManager.startBGM()` called after unlock |
| Web Audio + BGM loop | Using default `AudioBufferSourceNode.loop = true` on a compressed audio file | Set `loopStart`/`loopEnd` to trim encoder silence, or use WAV format which has no encoder padding |
| Gamepad API + keyboard | Assuming only one input source is active | InputManager must merge keyboard state and gamepad state into the same action map; player can switch mid-session |
| Gamepad API + pause | Gamepad polling continues when game is paused | Guard gamepad reads with `if (!isPaused)` or stop polling entirely when the game loop is suspended |
| Gamepad API + page visibility | Controller drift if polling resumes after tab switch with stale axis values | Reset axis memory and snap position to previous on `visibilitychange` resume |
| pmndrs `SelectiveBloomEffect` + new CRT pass | Adding CRT effects to the same `EffectPass` as `SelectiveBloomEffect` | Separate `EffectPass` per stage: bloom first, CRT second; pmndrs merges within a pass, not across passes |
| CRT unlock progression + Zustand | Reading CRT intensity from MetaStore before v4 migration runs | Initialize `crtPresetLevel: 0` in the v4 migration block; guard all CRT reads with nullish coalescing |
| Ship skin + player InstancedMesh | The player is a single `Mesh` (not `InstancedMesh`); skins require swapping geometry + material | Create a skin-indexed array of pre-built player geometries; swap `player.mesh.geometry` and `player.mesh.material` on run start, not mid-run |
| Homing missile + bloom selection | Homing missiles are a new `InstancedMesh`; bloom selection is not automatically updated | Register the homing `InstancedMesh` with `bloomEffect.selection.add(homingMesh)` at construction |
| Continuous beam + collision system | Beam uses raycasting for hit detection (not AABB); adds a Raycaster call per frame | Use a single `THREE.Raycaster` pre-allocated instance; call once per active beam per fixed-step tick, not every render frame |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Web Audio `decodeAudioData()` on the main thread during gameplay | Audio decode freezes main thread for 50-200ms; frame stutter when SFX triggers | Pre-decode all audio assets during loading screen; store `AudioBuffer` objects; call `createBufferSource()` at play time | Every SFX trigger if assets are decoded lazily |
| Creating `AudioBufferSourceNode` objects and never stopping them | `AudioContext.destination` accumulates connected nodes; memory and CPU leak over session | Call `source.disconnect()` and release the reference after `source.onended` fires | After ~200+ SFX plays (30+ minutes of gameplay) |
| CRT scanline shader at native resolution | CRT + bloom doubles post-processing cost; both are fullscreen | The CRT `EffectPass` runs at render target resolution; for heavy CRT, reduce `EffectComposer` resolution to 75% and upscale | Always on mid-range integrated graphics |
| Sweeping laser with per-frame raycasting | Raycaster fires every frame across all enemies (O(n) per enemy); at peak wave density this is 50+ ray tests per frame | Fire raycaster at fixed 15Hz (every 4 physics ticks) for sweep collision; interpolate hit result for visual smoothness | At 30+ simultaneous enemies during sweep |
| Ship skin geometry swap mid-run | Disposing and creating geometry mid-session causes GC spike and momentary frame drop | Pre-create all 3-4 skin geometries at startup; swap references only; never dispose/recreate during gameplay | If swap happens mid-wave rather than between runs |
| Gamepad polling calling `navigator.getGamepads()` twice per frame | Minor but redundant allocation; `getGamepads()` returns a new snapshot array each call | Cache result once per tick: `const pads = navigator.getGamepads();` at the top of input update | Noticeable only in profiler; not a gameplay concern at this scale |
| Meta shop expansion — new items loaded into shop UI every shop-open | If shop item pool grows to 30+ items and is rebuilt from scratch each shop open | Build shop item DOM elements once; toggle visibility; update counts/prices in-place | With 40+ shop items and frequent shop visits |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| BGM starts instantly when game begins (no volume ramp) | Jarring, audio punch on first play | Fade BGM in from 0 gain over 1-2 seconds using `GainNode.gain.linearRampToValueAtTime()` |
| No audio volume control exposed anywhere | Players cannot adjust BGM vs SFX balance | Add master volume and BGM/SFX separate sliders to settings; persist via MetaStore |
| Gamepad connected but no visual indicator | Player plugs in controller, game doesn't respond to it, player assumes no support | Show "Gamepad connected" toast and button hint overlay when `gamepadconnected` fires |
| Gamepad D-pad for menu navigation maps incorrectly | D-pad left/right does not move menu cursor, or moves it 10x per press | Implement button edge detection (justPressed equivalent) for gamepad buttons; `buttons[i].pressed` is stateful — track previous frame state |
| Time-slow visual without audio cue | Player cannot tell time slow activated (it looks like enemies are lagging) | Add a subtle low-pass filter or reverb increase to BGM during time slow; play a distinct "time warp" SFX on activation |
| Ship skin selection in meta shop shows only color swatches | Players cannot tell skins have distinct shapes until they buy one | Show a ship silhouette preview next to each skin option; clicking/hovering shows the shape in the meta shop UI |
| CRT intensity at maximum causes text readability issues | HUD score and wave number become hard to read through heavy scanlines | HUD is DOM-based (outside WebGL); CRT only affects the canvas — HUD text is always crisp regardless of CRT intensity |
| Meta shop grows to 40+ items with no grouping | Players overwhelmed; cannot find newly added items | Group items into tabs (Weapons, Ships, Upgrades, Visual); new v1.1 items appear in appropriate tabs, not just appended to a flat list |
| Extra lives in meta shop feel required, not optional | If early game is too hard without the extra life unlock, it gates access to the fun | Tune base difficulty so a fresh player with zero meta unlocks can still reach wave 5+ on the first run |
| Starting power-up selection shown before run | Players spend time agonizing over one starting choice before seeing any enemies | Default to no starting power-up if the player skips/dismisses; do not require selection to proceed |

---

## "Looks Done But Isn't" Checklist

- [ ] **Audio autoplay unlock:** BGM plays on first run — verify in a fresh incognito tab with no prior browser interaction with the game
- [ ] **BGM loop seam:** Loop plays for 3+ full cycles — verify there is no audible click or gap at the loop boundary in Chrome, Firefox, and Safari
- [ ] **Gamepad first connection:** Open fresh browser tab, plug in controller, press button — verify `gamepadconnected` fires and "press any button" prompt disappears
- [ ] **Gamepad deadzone:** Leave controller untouched for 5 seconds — verify ship does not drift from its position
- [ ] **Non-standard gamepad warning:** Connect PS5 DualSense in Firefox — verify the game shows a "controller may not be fully mapped" warning rather than silently failing
- [ ] **CRT pass ordering:** Enable maximum CRT intensity AND bloom simultaneously — verify bloom glow is fully visible on neon elements (not suppressed by scanlines)
- [ ] **Zustand migration v3 → v4:** Manually paste a v3 JSON save to localStorage key, refresh page — verify all v1.0 data (SI$, campaign progress, purchased upgrades) survives; verify new v1.1 fields initialize to defaults
- [ ] **Beam laser no geometry allocation:** Run a continuous beam for 30 seconds — verify `renderer.info.memory.geometries` does not increase
- [ ] **Homing missile rotation:** Fire homing missiles at enemies moving perpendicular to player — verify missiles rotate to track targets rather than flying straight up
- [ ] **Time slow player speed:** Activate time slow power-up — verify player ship moves at full speed while enemies slow; verify particles continue at normal speed
- [ ] **Ship skin persist:** Purchase and equip a skin in meta shop, close and reopen browser — verify equipped skin is restored on the next run start
- [ ] **SFX resource cleanup:** Play for 20+ minutes with heavy combat — verify `AudioContext` has no accumulating disconnected nodes (check via Web Audio Inspector in DevTools)
- [ ] **Meta shop v4 new items:** Items for extra lives, alt ships, difficulty unlocks, CRT presets appear in correct shop categories — verify they are not duplicating existing item IDs

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AudioContext always suspended at launch | LOW | Add `audioContext.resume()` call in existing "press any key" TitleState handler; test in incognito |
| BGM loop gap audible | LOW | Re-export BGM as WAV and set `loopStart`/`loopEnd` in AudioBufferSourceNode config |
| Gamepad buttons not detected on first connect | LOW | Wrap all polling in `gamepadActive` flag; add `gamepadconnected` event to set flag |
| Deadzone drift | LOW | Add `applyDeadzone()` function to gamepad input read site; 30 minutes |
| CRT breaks bloom | LOW-MEDIUM | Separate the `EffectPass` calls; move `ScanlineEffect` to its own pass after bloom pass |
| Zustand fields undefined after release | MEDIUM | Emergency patch: bump version to 5, add migration block; deploy; users' saves survive |
| Beam laser causing GC pressure | MEDIUM | Refactor to use scale-based single mesh; requires touching all three laser types |
| Homing missile points wrong direction | LOW | Fix `Math.atan2(vy, vx)` call and rotation offset in matrix composition; 1-2 hour fix |
| Time slow slows player | LOW | Split `timeScale` application per-system; player's `MovementSystem` call gets raw `dt` |
| Meta shop 40+ flat items overwhelming | MEDIUM | Add tab/category navigation to `MetaShopUI`; requires UI restructure but no state changes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AudioContext suspended at startup | Audio phase (first audio feature) | Incognito tab, no prior interaction: BGM plays after first keypress |
| BGM loop gap | Audio phase (BGM implementation) | Loop 3+ full cycles in Chrome and Firefox: no audible gap |
| Gamepad not visible until first button press | Gamepad phase | Fresh browser profile: "press any button" prompt dismisses on first button press |
| Gamepad axis drift | Gamepad phase | Controller at rest for 10 seconds: ship stationary |
| Gamepad non-standard mapping | Gamepad phase | PS5 controller in Firefox: warning message displays |
| CRT breaks bloom ordering | CRT phase | CRT max + bloom active simultaneously: neon elements glow correctly |
| Zustand meta schema v4 migration | Meta shop expansion phase (first new field) | v3 JSON save in localStorage: all v1.0 data intact after upgrade |
| Beam laser geometry allocation | Power-up phase (lasers) | `renderer.info.memory.geometries` flat during 30s beam fire |
| Time slow affects player | Power-up phase (time slow) | Player speed identical inside and outside time slow window |
| Homing missile rotation | Power-up phase (homing) | Homing missile visibly rotates to track laterally-moving enemy |
| Meta shop overwhelming | Meta shop expansion phase | 10-second glance test: new player can locate "extra lives" item within 10s |
| SFX node accumulation | Audio phase + end-of-milestone verification | DevTools Web Audio Inspector after 20-min session: no accumulated disconnected nodes |

---

## Sources

- [Web Audio, Autoplay Policy and Games — Chrome for Developers](https://developer.chrome.com/blog/web-audio-autoplay) — HIGH confidence, official Chrome policy documentation
- [Web Audio API best practices — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — HIGH confidence, official MDN documentation
- [AudioContext: resume() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume) — HIGH confidence, official MDN documentation
- [AudioBufferSourceNode: loopStart/loopEnd — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loopStart) — HIGH confidence, official MDN documentation
- [Using the Gamepad API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) — HIGH confidence, official MDN documentation
- [Implementing controls using the Gamepad API — MDN Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Controls_Gamepad_API) — HIGH confidence, official MDN
- [PS5 DualSense mapping incorrect in Firefox — Bugzilla #1922925](https://bugzilla.mozilla.org/show_bug.cgi?id=1922925) — HIGH confidence, official Mozilla bug tracker
- [The HTML5 Gamepad API: A Developer's Guide (2026) — gamepadtester.pro](https://gamepadtester.pro/the-html5-gamepad-api-a-developers-guide-to-browser-controllers/) — MEDIUM confidence, community guide
- [Controller Deadzones: Axial vs Radial (2026) — gamepadtester.pro](https://gamepadtester.pro/controller-deadzones-explained-axial-vs-radial-how-to-test-2026-guide/) — MEDIUM confidence, community resource
- [pmndrs/postprocessing — GitHub](https://github.com/pmndrs/postprocessing) — HIGH confidence, official library source
- [ScanlineEffect API — pmndrs/postprocessing docs](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/ScanlineEffect.js~ScanlineEffect.html) — HIGH confidence, official docs
- [Persisting store data — Zustand official docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — HIGH confidence, official Zustand documentation
- [Persist middleware: migrate multiple versions — pmndrs/zustand issue #984](https://github.com/pmndrs/zustand/issues/984) — MEDIUM confidence, official repo discussion
- [How to migrate Zustand local storage store — DEV Community](https://dev.to/diballesteros/how-to-migrate-zustand-local-storage-store-to-a-new-version-njp) — MEDIUM confidence, community guide consistent with official API
- [Fix Your Timestep! — Gaffer on Games](https://gafferongames.com/post/fix_your_timestep/) — HIGH confidence, canonical game loop reference
- [InstancedMesh rotation update — Three.js forum](https://discourse.threejs.org/t/rotation-instancedmesh/41304) — MEDIUM confidence, community; consistent with Three.js InstancedMesh official docs
- [Three.js InstancedMesh docs — setMatrixAt](https://threejs.org/docs/#api/en/objects/InstancedMesh.setMatrixAt) — HIGH confidence, official Three.js docs
- [AdditiveBlending for laser glow — Three.js forum](https://discourse.threejs.org/t/does-three-js-support-additive-blending-for-opaque/36190) — MEDIUM confidence, community discussion

---
*Pitfalls research for: Three.js Browser Space Shooter v1.1 Feature Additions (Super Space Invaders X)*
*Researched: 2026-03-06*
