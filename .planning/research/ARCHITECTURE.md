# Architecture Research

**Domain:** Browser space-shooter ECS-like architecture — v1.1 integration patterns
**Researched:** 2026-03-06
**Confidence:** HIGH (based on direct codebase reading + official docs verification)

> **Note:** This document supersedes the v1.0 architecture research. It focuses on
> how the six v1.1 feature areas (audio, gamepad, skins, power-ups, shop, CRT)
> integrate with the existing architecture. The v1.0 structural patterns remain
> valid — see the original SUMMARY.md for general design rationale.

---

## System Overview (v1.1 additions highlighted)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Browser DOM Layer                                 │
│  ┌────────────┐  ┌──────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  HUD.ts    │  │ ShopUI.ts│  │  MetaShopUI.ts │  │  AudioManager    │   │
│  │ (DOM over.)│  │(DOM over)│  │  (DOM overlay) │  │  [NEW v1.1]      │   │
│  └────────────┘  └──────────┘  └────────────────┘  └──────────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│                        Core Orchestration Layer                             │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  ┌───────────┐  │
│  │  Game.ts   │  │StateManager│  │  InputManager        │  │SceneMgr   │  │
│  │(init/loop) │  │(state stack│  │  (kbd + gamepad v1.1)│  │(Three.js) │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  └───────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│                          Game State Layer                                   │
│  ┌───────────┐  ┌─────────────────────────────────────────┐  ┌──────────┐ │
│  │TitleState │  │  PlayingState (PlayingStateContext)      │  │Paused/   │ │
│  └───────────┘  │  + audioManager [NEW]                   │  │GameOver  │ │
│                 │  + beamSystem   [NEW]                   │  └──────────┘ │
│                 └─────────────────────────────────────────┘               │
├────────────────────────────────────────────────────────────────────────────┤
│                           Systems Layer                                     │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌───────────────┐ │
│  │Weapon    │ │AI System │ │ Collision  │ │ Shop     │ │ BeamSystem    │ │
│  │System    │ │          │ │ System     │ │ System   │ │ [NEW v1.1]    │ │
│  └──────────┘ └──────────┘ └────────────┘ └──────────┘ └───────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐                                 │
│  │PowerUp   │ │ Boss     │ │ Spawn      │                                 │
│  │Manager   │ │ System   │ │ System     │                                 │
│  └──────────┘ └──────────┘ └────────────┘                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                            Entities Layer                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Player   │ │ Enemy    │ │  Boss    │ │  Bullet  │ │  BeamEffect    │  │
│  │ (skin    │ │Formation │ │ (Mesh)   │ │(+ homing │ │  [NEW v1.1]    │  │
│  │ swap v11)│ │          │ │          │ │ piercing)│  │                │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│                          Rendering Pipeline                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  EffectComposer                                                       │  │
│  │   RenderPass → EffectPass(SelectiveBloomEffect [+ CRTEffect v1.1])   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│                           Persistence Layer                                 │
│  ┌───────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  MetaStore (Zustand persist v4)   │  │  RunState (plain TS singleton)│  │
│  │  + activeShipSkin [NEW]           │  │  + timeScale [NEW]           │  │
│  │  + activeShipColor [NEW]          │  │  volatile, reset each run    │  │
│  │  + activeDifficulty [NEW]         │  └──────────────────────────────┘  │
│  │  + crtIntensity [NEW]             │                                     │
│  └───────────────────────────────────┘                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | v1.1 Change |
|-----------|----------------|-------------|
| `Game.ts` | Constructs all systems, wires deps, starts loop | Add AudioManager, BeamSystem, BeamEffect; wire CRT |
| `SceneManager` | Three.js renderer, camera, BloomEffect, resize | Expose `addCRTEffect()` |
| `InputManager` | Keyboard held/just-pressed state | Add `updateGamepad()` — synthesizes to same key sets |
| `PlayingState` | Main gameplay loop | Add beamSystem + audioManager to context |
| `PlayingStateContext` | Dependency bag passed to all states | Add `beamSystem`, `audioManager` fields |
| `WeaponSystem` | Player fire input, bullet pool, spread/rapid fire | Handle 6 new power-up fire modes |
| `CollisionSystem` | AABB tests, kills, pickup, bunker hits | Piercing bullet logic (skip consume) |
| `PowerUpManager` | PickupToken pool, active power-up state | Extend `PowerUpType` union |
| `ShopSystem` | In-run upgrade purchases, stat multipliers | Add new item IDs for v1.1 power-ups |
| `BeamSystem` | Beam weapon lifecycle, damage interval | **NEW** — owns BeamEffect, beam collision |
| `AudioManager` | Web Audio API, BGM loop, SFX trigger | **NEW** — standalone, not in ctx |
| `MetaStore` | Zustand persist — SI$, unlocks, progress | Schema v4: skin/color/difficulty/CRT fields |
| `RunState` | Volatile per-run — score, lives, wave, gold | Add `timeScale: number` |
| `BloomEffect` | pmndrs EffectComposer + SelectiveBloomEffect | Add `addCRTEffect()` method |
| `CRTEffect` | CRT scanline post-processing shader | **NEW** — extends `Effect` from postprocessing |

---

## Feature Integration Details

### Feature 1: Audio System (Web Audio API)

**New component:** `src/audio/AudioManager.ts`

AudioManager is a singleton constructed in `Game.init()` and passed by reference to systems via setter injection — the same pattern already used for `ParticleManager` and `BunkerManager`. It does NOT live in `PlayingStateContext` because audio is needed across all states (title music, UI SFX, pause).

**Data flow:**
```
Game.init()
  └─ AudioManager.init()  [called on first user gesture — deferred AudioContext creation]
        ├─ bgm: AudioBufferSourceNode, loop=true, loopEnd=buffer.duration
        └─ sfx: Map<string, AudioBuffer>  pre-decoded at init time

Systems call:
  weaponSystem.setAudioManager(audioManager)  [setter injection]
  collisionSystem.setAudioManager(audioManager)
  powerUpManager.setAudioManager(audioManager)
  shopSystem.setAudioManager(audioManager)

At runtime (fixed step):
  audioManager.playSfx('enemyDie')  // fire-and-forget, Web Audio schedules internally
```

**SFX trigger map:**

| Event | Call site | Key |
|-------|-----------|-----|
| Player fires | `WeaponSystem.update()` | `playerFire` |
| Enemy killed | `CollisionSystem.update()` | `enemyDie` |
| Player hit | `CollisionSystem.update()` | `playerHit` |
| Power-up collected | `PowerUpManager.collectPickup()` | `powerupPickup` |
| Wave starts | `PlayingState` wave transition | `waveStart` |
| Boss phase change | `BossSystem` | `bossPhase` |
| Shop purchase | `ShopSystem.purchaseItem()` | `purchase` |
| UI navigate | `TitleState`, `ShopUI` keyHandler | `uiNav` / `uiConfirm` |
| BGM | `Game.init()` after first gesture | looping buffer |

**Critical constraint — AudioContext autoplay policy:**

`AudioContext` is blocked by Chrome and Safari until a user gesture. Never create it in a constructor or module init. The pattern:

```typescript
// AudioManager.ts
export class AudioManager {
  private ctx: AudioContext | null = null;
  private _ready = false;

  /** Must be called from a user gesture handler (keydown, gamepad button) */
  public init(): void {
    if (this._ready) return;
    this.ctx = new AudioContext();
    this._ready = true;
    this._loadAll();          // fetch and decode all audio files
    this._startBGM();
  }

  public playSfx(key: string): void {
    if (!this._ready || !this.ctx) return;  // silently no-ops before init
    const buf = this.sfxMap.get(key);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.masterGain);
    src.start(0);
    // src is GC'd automatically after playback ends — no pool needed for SFX
  }

  public suspend(): void { this.ctx?.suspend(); }   // called by PausedState.enter()
  public resume(): void  { this.ctx?.resume(); }    // called by PausedState.exit()
}
```

**Pause/resume:** Call `AudioContext.suspend()` / `AudioContext.resume()` — not `source.stop()`. Wire into `PausedState.enter()` and `PausedState.exit()`.

**Modified files:** `Game.ts`, `WeaponSystem.ts`, `CollisionSystem.ts`, `PowerUpManager.ts`, `ShopSystem.ts`, `PlayingState.ts`, `PausedState.ts`

---

### Feature 2: Gamepad Support

**Modified component:** `src/core/InputManager.ts` only.

The Gamepad API is poll-based. `navigator.getGamepads()` must be called each frame in the game loop — not just in `gamepadconnected` events. The key architectural decision is to **synthesize gamepad state into the existing `heldKeys` and `justPressedKeys` sets** so that every downstream consumer (WeaponSystem, PlayingState, TitleState, ShopUI, etc.) gains gamepad support for free without modification.

**Pattern:**
```typescript
// InputManager.ts — add to existing class
private readonly _gpHeldButtons: Set<number> = new Set();

public updateGamepad(): void {
  const pads = navigator.getGamepads();
  const pad = pads[0];
  if (!pad || !pad.connected) return;

  // Axes → synthetic key codes
  const axisX = pad.axes[0] ?? 0;
  if (axisX < -0.3) this.heldKeys.add('ArrowLeft');
  else              this.heldKeys.delete('ArrowLeft');  // only if no keyboard is holding it

  if (axisX > 0.3)  this.heldKeys.add('ArrowRight');
  else              this.heldKeys.delete('ArrowRight');

  // Buttons → justPressed (detect rising edge)
  const BUTTON_MAP: Record<number, string> = {
    0: 'Space',       // A / Cross — fire
    9: 'Escape',      // Start — pause
    12: 'ArrowUp',    // D-Pad up
    13: 'ArrowDown',  // D-Pad down
    14: 'ArrowLeft',  // D-Pad left
    15: 'ArrowRight', // D-Pad right
  };
  for (const [idx, code] of Object.entries(BUTTON_MAP)) {
    const btn = pad.buttons[Number(idx)];
    if (!btn) continue;
    if (btn.pressed && !this._gpHeldButtons.has(Number(idx))) {
      this.justPressedKeys.add(code);
      this._gpHeldButtons.add(Number(idx));
    }
    if (!btn.pressed) this._gpHeldButtons.delete(Number(idx));
  }
}
```

**Wire-in point:** Call `inputManager.updateGamepad()` at the START of each fixed step in `PlayingState.update()`, before any system reads input. Also call it in `TitleState.update()` and other states that read input.

**AudioManager init trigger:** First gamepad button press should also trigger `audioManager.init()` — add this call in the gamepad handler or in InputManager.

**Modified files:** `InputManager.ts` only. All existing consuming files unchanged.

---

### Feature 3: Ship Skins

**Architecture:**

`Player` uses a plain `Mesh` (not InstancedMesh) with a custom `BufferGeometry`. Swapping skins means replacing the geometry and updating material colors **in place on the same Mesh object**. The Mesh reference held by `bloom.bloomEffect.selection` stays valid — geometry replacement does not invalidate the object reference.

**New file:** `src/config/shipSkins.ts`

```typescript
export interface ShipSkin {
  id: string;
  displayName: string;
  makeGeometry: () => BufferGeometry;
}

export const SHIP_SKINS: readonly ShipSkin[] = [
  { id: 'default', displayName: 'CHEVRON', makeGeometry: makeChevronGeometry },
  { id: 'wedge',   displayName: 'WEDGE',   makeGeometry: makeWedgeGeometry   },
  { id: 'delta',   displayName: 'DELTA',   makeGeometry: makeDeltaGeometry   },
  { id: 'arrow',   displayName: 'ARROW',   makeGeometry: makeArrowGeometry   },
];

export const SKIN_COLORS: readonly { id: string; hex: number }[] = [
  { id: 'cyan',    hex: 0x00ffff },
  { id: 'magenta', hex: 0xff00ff },
  { id: 'gold',    hex: 0xffd700 },
  { id: 'green',   hex: 0x00ff88 },
];
```

**Player.ts addition:**
```typescript
public applySkin(skinId: string, colorId: string): void {
  const skin  = SHIP_SKINS.find(s => s.id === skinId)  ?? SHIP_SKINS[0];
  const color = SKIN_COLORS.find(c => c.id === colorId) ?? SKIN_COLORS[0];

  // Dispose old geometry to prevent GPU memory leak
  this.mesh.geometry.dispose();
  this.mesh.geometry = skin.makeGeometry();

  // Update material color in-place (same MeshStandardMaterial object)
  const mat = this.mesh.material as MeshStandardMaterial;
  mat.color.setHex(color.hex);
  mat.emissive.setHex(color.hex);

  // mesh reference in bloom selection is unchanged — no re-registration
}
```

**When applied:** `PlayingState.enter()` reads `useMetaStore.getState()` for `activeShipSkin` and `activeShipColor`, then calls `player.applySkin()` before the run starts.

**MetaStore v4 additions:**
- `activeShipSkin: string` (default: `'default'`)
- `activeShipColor: string` (default: `'cyan'`)
- New upgrade IDs in `META_UPGRADES`: `skin_wedge`, `skin_delta`, `skin_arrow`, `skin_color_magenta`, `skin_color_gold`, `skin_color_green`
- MetaShopUI adds a "SHIP" category section for skin/color selection

**Modified files:** `Player.ts`, `MetaState.ts` (schema v4), `metaUpgrades.ts`, `MetaShopUI.ts`, new `src/config/shipSkins.ts`

---

### Feature 4: New Power-Up Types

The six new power-ups split into two categories with different integration depths.

#### Category A: Ballistic Modifiers (Piercing, Homing, Time Slow)

These extend the existing `PowerUpType` union. Minimal new code — changes are additive to existing systems.

**`src/config/powerups.ts` change:**
```typescript
export type PowerUpType = 'spreadShot' | 'rapidFire' | 'shield'
  | 'piercing' | 'homing' | 'timeSlow';  // v1.1 additions
```

**Piercing shot:**
- `Bullet.ts`: Add `isPiercing: boolean = false`
- `WeaponSystem.fireShot()`: Set `bullet.isPiercing = true` when `powerUpManager.isActive('piercing')`
- `CollisionSystem.update()`: When `bullet.isPiercing`, do NOT push bullet to `bulletsToRelease` on enemy hit (bullet continues through). Still deduct `enemy.health` and trigger kill effects.

**Homing missiles:**
- `Bullet.ts`: Add `isHoming: boolean = false`, `homingTarget: Enemy | null = null`
- `WeaponSystem.fireShot()`: Set `bullet.isHoming = true`. Target assigned by WeaponSystem: pick closest active enemy to player at fire time.
- `MovementSystem.update()`: For each `bullet.isHoming`, if target is still active: compute `(target.x - bullet.x, target.y - bullet.y)`, normalize, lerp `bullet.vx/vy` toward that direction at turn rate (e.g., 6 rad/s). If target becomes inactive, pick nearest active enemy or fly straight.

**Time slow:**
- `RunState`: Add `timeScale: number = 1.0`
- `PowerUpManager.collectPickup()`: For `timeSlow`, set `runState.timeScale = 0.3` in addition to activating the timed duration.
- `PowerUpManager.update()`: When `timeSlow` expires (duration hits 0), restore `runState.timeScale = 1.0`.
- `AISystem.update()`: Multiply `dt` by `runState.timeScale` for all enemy movement + fire accumulator updates. Player movement is intentionally exempt (preserves power fantasy).
- `MovementSystem.update()`: Multiply enemy bullet `vy` advancement by `runState.timeScale`.

#### Category B: Beam Weapons (Continuous Beam, Charged Burst, Sweeping Laser)

These require a new entity and system. They do not fit the Bullet pool model because they:
- Are rendered as a single stretched Mesh, not a point projectile
- Deal damage at intervals over an area, not on single collision
- Have unique input semantics (hold-to-fire, hold-to-charge, time-limited sweep)

**New entity:** `src/entities/BeamEffect.ts`
```typescript
export class BeamEffect {
  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    const geo = new PlaneGeometry(8, 1);
    const mat = new MeshBasicMaterial({
      color: 0xff2266,
      transparent: true, opacity: 0.85,
      blending: AdditiveBlending, depthWrite: false,
    });
    this.mesh = new Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Stretch beam from (x, fromY) up to worldTop */
  public activate(x: number, fromY: number, worldTop: number, color: number): void {
    const height = worldTop - fromY;
    this.mesh.scale.y = height;
    this.mesh.position.set(x, fromY + height / 2, 0);
    (this.mesh.material as MeshBasicMaterial).color.setHex(color);
    this.mesh.visible = true;
  }

  public deactivate(): void { this.mesh.visible = false; }
}
```

**New system:** `src/systems/BeamSystem.ts`

BeamSystem owns three `BeamEffect` instances (one per beam type) and is responsible for:
- Detecting when a beam power-up is active and the fire key is held/released
- Activating/deactivating the correct `BeamEffect`
- Ticking damage intervals and applying them to overlapping enemies (vertical strip AABB)
- Handling the charged burst charge-up state
- Moving the sweeping laser beam position left/right over its duration

BeamSystem is added to `PlayingStateContext` and called in `PlayingState.update()` after `WeaponSystem.update()`.

**Collision model for beams:** BeamSystem performs its own overlap check (NOT routed through CollisionSystem's bullet loop). A beam hits any active enemy whose AABB overlaps the beam's vertical strip:
```typescript
// Beam strip AABB: x = beamX, halfWidth = 4, y = from player to world top
const beamHalfW = 4;
for (const enemy of formation.enemies) {
  if (!enemy.active) continue;
  const pos = formation.getEnemyWorldPos(enemy);
  if (Math.abs(pos.x - beamX) < beamHalfW + enemy.width) {
    // hit — apply damage and particles
  }
}
```

**Bloom registration:** Both BeamEffect meshes are registered with `bloom.bloomEffect.selection.add(beamEffect.mesh)` in `Game.init()`.

**Modified files:** `powerups.ts`, `Bullet.ts`, `WeaponSystem.ts`, `MovementSystem.ts`, `CollisionSystem.ts`, `PowerUpManager.ts`, `RunState.ts`, `PlayingStateContext`, `Game.ts`
**New files:** `src/entities/BeamEffect.ts`, `src/systems/BeamSystem.ts`

---

### Feature 5: Meta Shop Expansion

**Architecture — purely additive to existing data model:**

MetaStore's `purchasedUpgrades: string[]` already handles arbitrary upgrade IDs. New items are appended to the `META_UPGRADES` array. Effects are applied in `PlayingState.applyMetaBonuses()` via `purchasedUpgrades.includes(id)` checks — the same pattern as all existing upgrades.

**New upgrade categories:**

| Category | Upgrade IDs | Application point |
|----------|-------------|-------------------|
| Extra lives | `meta_extraLife_1`, `_2`, `_3` | `applyMetaBonuses()` — increments RunState initial lives |
| Alt ships | `skin_wedge`, `skin_delta`, `skin_arrow` | `PlayingState.enter()` — gates `player.applySkin()` |
| Starting power-up slot | `loadout_piercing`, `loadout_homing`, `loadout_timeSlow` | `applyMetaBonuses()` — calls `powerUpManager.activate(type, duration)` |
| Difficulty unlocks | `difficulty_hard`, `difficulty_nightmare` | `TitleState` mode select — gates difficulty choice in UI |
| CRT tiers | `crt_tier1`, `crt_tier2`, `crt_tier3` | `Game.init()` — gates `bloom.addCRTEffect(new CRTEffect(intensity))` |

**MetaStore schema v4 additions:**
```typescript
// New fields in MetaStore interface
activeShipSkin: string;             // 'default' | 'wedge' | 'delta' | 'arrow'
activeShipColor: string;            // 'cyan' | 'magenta' | 'gold' | 'green'
activeDifficulty: string;           // 'normal' | 'hard' | 'nightmare'
crtIntensity: number;               // 0=off, 1=low(0.2), 2=medium(0.4), 3=high(0.7)

// New actions
setActiveShipSkin: (id: string) => void;
setActiveShipColor: (id: string) => void;
setActiveDifficulty: (mode: string) => void;
setCrtIntensity: (level: number) => void;
```

**Migration:** Increment `SAVE_VERSION` to 4. Add a `version < 4` migration block that sets default values for all new fields.

**MetaShopUI** receives two new section groups: "SHIP SKINS" (skin + color selection, not just purchase) and "SETTINGS" (difficulty + CRT intensity slider).

**In-run ShopSystem** gains three new `SHOP_ITEMS` entries for the starting power-up type choice (available only if the corresponding meta loadout is unlocked):
- `loadout_choose_piercing`, `loadout_choose_homing`, `loadout_choose_timeSlow`
These replace the existing `loadout_spread`/`loadout_rapid` items in the starting slot flow.

**Modified files:** `MetaState.ts` (v4 schema + migration), `metaUpgrades.ts`, `MetaShopUI.ts`, `PlayingState.ts` (`applyMetaBonuses` extension), `ShopSystem.ts` (new SHOP_ITEMS)

---

### Feature 6: CRT/Scanline Post-Processing

**Architecture — extend existing EffectComposer pipeline:**

The current pipeline:
```
RenderPass → EffectPass(SelectiveBloomEffect)
```

The target pipeline:
```
RenderPass → EffectPass(SelectiveBloomEffect, CRTEffect)
```

pmndrs/postprocessing merges multiple `Effect` instances passed to a single `EffectPass` into one shader draw call. This is more efficient than a second EffectPass.

**New component:** `src/effects/CRTEffect.ts`

```typescript
import { Effect, BlendFunction } from 'postprocessing';
import { Uniform } from 'three';

const FRAGMENT = /* glsl */`
  uniform float scanlineIntensity;
  uniform float scanlineDensity;
  uniform float vignetteStrength;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Scanlines: periodic darkening on screen-space Y coordinate
    float line = sin(uv.y * scanlineDensity * 3.14159265) * 0.5 + 0.5;
    float darken = 1.0 - scanlineIntensity * (1.0 - line);

    // Vignette: radial darkening at screen corners
    vec2 c = uv - 0.5;
    float vignette = 1.0 - dot(c, c) * vignetteStrength;

    outputColor = vec4(inputColor.rgb * darken * vignette, inputColor.a);
  }
`;

export class CRTEffect extends Effect {
  constructor(intensity: number = 0.25) {
    super('CRTEffect', FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['scanlineIntensity', new Uniform(intensity)],
        ['scanlineDensity',   new Uniform(800.0)],
        ['vignetteStrength',  new Uniform(1.8)],
      ]),
    });
  }

  public setIntensity(v: number): void {
    (this.uniforms.get('scanlineIntensity') as Uniform).value = v;
  }
}
```

**BloomEffect.ts change:**

The current `BloomEffect` class stores a private `EffectPass`. To add CRTEffect, the EffectPass must be reconstructed with both effects. Expose a method:

```typescript
// BloomEffect.ts additions
private effectPass: EffectPass;  // promote from inline to stored reference

public addCRTEffect(crt: CRTEffect): void {
  this.composer.removePass(this.effectPass);
  this.effectPass = new EffectPass(this.camera, this.bloomEffect, crt);
  this.composer.addPass(this.effectPass);
}
```

**Game.init() wire-in:**
```typescript
const bloom = this.scene.initBloom();
// ... existing bloom registrations ...

// Apply CRT if any tier is unlocked
const meta = useMetaStore.getState();
const crtLevel = meta.crtIntensity;
if (crtLevel > 0) {
  const intensities = [0.0, 0.2, 0.4, 0.7];
  bloom.addCRTEffect(new CRTEffect(intensities[crtLevel]));
}
```

**Intensity slider in MetaShopUI:** CRT intensity is a step-selector (not continuous), bound to three purchasable tiers plus a free toggle. The DOM slider maps to `useMetaStore.setCrtIntensity(level)`. On next game launch (or on a settings-apply button), `Game.init()` re-reads and applies it.

**Modified files:** `BloomEffect.ts`, `SceneManager.ts` (expose `bloom` reference for external addCRTEffect call), `Game.ts`, `MetaState.ts`, `MetaShopUI.ts`
**New files:** `src/effects/CRTEffect.ts`

---

## Recommended Project Structure (v1.1 additions)

```
src/
├── audio/
│   └── AudioManager.ts          # NEW — Web Audio API, BGM loop, SFX trigger map
├── config/
│   ├── powerups.ts              # MODIFY — extend PowerUpType union with 6 new types
│   ├── shipSkins.ts             # NEW — skin geometry factories, color variants
│   ├── metaUpgrades.ts          # MODIFY — add skin/difficulty/CRT/loadout upgrades
│   └── waveConfig.ts            # unchanged
├── core/
│   ├── InputManager.ts          # MODIFY — add updateGamepad(), _gpHeldButtons set
│   ├── SceneManager.ts          # MODIFY — expose addCRTEffect() path through bloom ref
│   └── Game.ts                  # MODIFY — wire AudioManager, BeamSystem, CRTEffect
├── effects/
│   ├── BloomEffect.ts           # MODIFY — store effectPass ref, add addCRTEffect()
│   └── CRTEffect.ts             # NEW — pmndrs/postprocessing Effect subclass
├── entities/
│   ├── Player.ts                # MODIFY — add applySkin(skinId, colorId)
│   ├── Bullet.ts                # MODIFY — add isPiercing, isHoming, homingTarget
│   └── BeamEffect.ts            # NEW — stretched Mesh for beam rendering
├── systems/
│   ├── BeamSystem.ts            # NEW — beam lifecycle, damage intervals, sweep logic
│   ├── WeaponSystem.ts          # MODIFY — handle beam modes, homing assignment
│   ├── MovementSystem.ts        # MODIFY — homing steering, timeScale application
│   └── CollisionSystem.ts       # MODIFY — piercing bullet skip-consume logic
├── state/
│   └── MetaState.ts             # MODIFY — v4 schema + migration (skin/color/diff/crt)
│   └── RunState.ts              # MODIFY — add timeScale field
└── ui/
    └── MetaShopUI.ts            # MODIFY — new skin/difficulty/CRT sections
```

---

## Architectural Patterns

### Pattern 1: Setter Injection for Optional Collaborators

**What:** Systems receive optional references (`private audioManager: AudioManager | null = null`) via `setAudioManager(am)` setter. Game.ts calls setters after all systems are constructed.
**When to use:** When a collaborator is optional (audio may not be initialized yet) or when systems predate the collaborator (avoids constructor signature breaking changes).
**Trade-offs:** Null checks required at every call site. Prefer over constructor parameters for optional/late-wired dependencies.

```typescript
// WeaponSystem.ts
private audioManager: AudioManager | null = null;

public setAudioManager(am: AudioManager): void {
  this.audioManager = am;
}

// In update():
this.audioManager?.playSfx('playerFire');
```

### Pattern 2: Synthesize Gamepad Into Existing Input Sets

**What:** `InputManager.updateGamepad()` maps gamepad axes/buttons to the same `heldKeys` and `justPressedKeys` sets keyboard already uses. All consumers call unchanged `isDown()` / `justPressed()` APIs.
**When to use:** When adding a new input device to an existing input system with many consumers.
**Trade-offs:** Axis-to-key mapping loses analog precision (acceptable for this game — left/right is binary). Simpler than forking the input API.

### Pattern 3: Geometry Swap In-Place on Existing Mesh

**What:** `player.mesh.geometry.dispose()` then `player.mesh.geometry = newGeo`. Mesh object reference stays constant.
**When to use:** Changing shape of a regularly-Meshed entity without disrupting external references (bloom selection, collision AABB based on entity properties, not mesh).
**Trade-offs:** Must dispose old geometry to prevent GPU memory leak. AABB half-extents in Player are defined as class properties (not computed from geometry) — update them if skin changes hitbox size.

### Pattern 4: Effect Subclass for Post-Processing

**What:** Extend `Effect` from pmndrs/postprocessing. Implement `mainImage(inputColor, uv, outputColor)` GLSL function. Pass to same `EffectPass` as existing bloom.
**When to use:** Screen-space shader effects that should compose with existing effects in one draw call.
**Trade-offs:** Requires GLSL knowledge. Uniforms are updated per-frame via `(this.uniforms.get('key') as Uniform).value = newValue`.

### Pattern 5: BeamSystem as Self-Contained Damage Domain

**What:** BeamSystem owns BeamEffect rendering AND damage collision. Does not route through CollisionSystem's bullet loop.
**When to use:** When a new mechanic has fundamentally different collision semantics (area/interval vs point/instant).
**Trade-offs:** Slight duplication of kill-enemy logic. Acceptable — CollisionSystem is already complex; adding beam conditionals would degrade readability more than a separate system.

---

## Data Flow

### Audio SFX (fire-and-forget)
```
Game event occurs in fixed step
    ↓
System detects event (enemy die, player fire, etc.)
    ↓
this.audioManager?.playSfx('key')  [optional chaining — safe before init]
    ↓
AudioManager decodes key → AudioBuffer
    ↓
Creates AudioBufferSourceNode, connects to masterGain, calls .start(0)
    ↓
Web Audio API schedules playback on audio thread (decoupled from main thread)
```

### Gamepad Input Synthesis
```
Game.loop() [rAF callback — runs before fixed step accumulator]
    ↓
inputManager.updateGamepad()
    └─ navigator.getGamepads() → reads pad.axes and pad.buttons
    └─ Writes to heldKeys (axes) and justPressedKeys (button rising edge)
    ↓
stateManager.update(FIXED_STEP)  [consumes same heldKeys/justPressedKeys as keyboard]
```

### Ship Skin Application
```
Player opens MetaShopUI, selects skin/color
    ↓
useMetaStore.setActiveShipSkin('wedge')  [persisted to localStorage immediately]
    ↓
[Next run start]  PlayingState.enter()
    ↓
reads useMetaStore.getState().activeShipSkin, .activeShipColor
    ↓
player.applySkin('wedge', 'magenta')
    ↓
Player.ts: dispose old geo → assign new geo → update material color
    └─ bloom.bloomEffect.selection still contains same Mesh ref → no re-registration
```

### CRT Effect Pipeline
```
Player purchases crt_tier2 in MetaShopUI
    ↓
useMetaStore.purchaseUpgrade('crt_tier2', cost) → crtIntensity = 2
    ↓
[Page reload or settings-apply trigger]  Game.init()
    ↓
reads useMetaStore.getState().crtIntensity === 2
    ↓
bloom.addCRTEffect(new CRTEffect(0.4))
    ↓
BloomEffect removes old EffectPass, creates new EffectPass(bloom, crt)
    ↓
EffectComposer: RenderPass → EffectPass(bloom + crt merged) → canvas
```

### Beam Weapon Damage
```
Player has active beam power-up, holds fire key
    ↓
WeaponSystem.update() detects beam mode → delegates to BeamSystem.activateBeam()
    ↓
BeamSystem: BeamEffect.mesh becomes visible, positioned from player barrel to worldTop
    ↓
BeamSystem.update() ticks damageInterval (e.g., every 0.1s)
    ↓
Strip AABB overlap check: beam X ± 4 units vs each active enemy AABB
    ↓
On hit: enemy.health -= beamDamage; if <=0: formation.killEnemy(); particleManager.spawnBurst()
         audioManager.playSfx('beamHit')
    ↓
Power-up expires or key released → BeamSystem.deactivateBeam()
```

---

## Anti-Patterns

### Anti-Pattern 1: Creating AudioContext Before User Gesture

**What people do:** `this.audioManager = new AudioManager()` in Game constructor, which internally calls `new AudioContext()`.
**Why it's wrong:** Chrome and Safari block AudioContext construction until the user has interacted with the page. The context is created in a suspended state and audio silently fails. A DOMException is logged.
**Do this instead:** `AudioManager.init()` is called from the first keydown or gamepad button event. The Game constructor creates the AudioManager object but does not call init. All `playSfx` calls null-check `this._ready` and silently no-op until init runs.

### Anti-Pattern 2: Separate isGamepadDown() Alongside Existing Input API

**What people do:** Add `input.isGamepadDown(buttonIndex)` as a parallel method. All consuming systems must call both `input.isDown(code) || input.isGamepadDown(btn)`.
**Why it's wrong:** Every system (WeaponSystem, PlayingState, TitleState, PausedState, ShopUI keyHandler) needs to be updated. Doubles input-reading code throughout the codebase.
**Do this instead:** Synthesize gamepad into `heldKeys` and `justPressedKeys`. All consumers get gamepad support without any changes to their input-reading code.

### Anti-Pattern 3: Replacing player.mesh Object for Skin Swap

**What people do:** `scene.remove(player.mesh); player.mesh = new Mesh(newGeo, newMat); scene.add(player.mesh);`
**Why it's wrong:** Breaks `bloom.bloomEffect.selection` (which holds the OLD Mesh reference). The new mesh does not glow. Also invalidates any other code that cached `player.mesh`.
**Do this instead:** Dispose and reassign `player.mesh.geometry` in-place. Update `player.mesh.material` color. The Mesh object identity is preserved.

### Anti-Pattern 4: Routing Beam Damage Through CollisionSystem's Bullet Loop

**What people do:** Add a `isBeam: boolean` flag to Bullet, put a BeamEffect into the bullet pool, check `bullet.isBeam` inside CollisionSystem.update().
**Why it's wrong:** CollisionSystem's bullet loop assumes bullets are point entities with velocity. Beams have area extent, continuous damage, custom collision logic, and unique visual lifecycle. Cramming beam conditionals into CollisionSystem creates a maintenance hazard.
**Do this instead:** BeamSystem owns beam damage detection. It performs its own strip AABB check each step. CollisionSystem remains responsible for projectile bullets only.

### Anti-Pattern 5: Two EffectPass Instances for CRT + Bloom

**What people do:** `composer.addPass(new EffectPass(cam, bloom)); composer.addPass(new EffectPass(cam, crt));`
**Why it's wrong:** Each EffectPass is a full-screen draw call. pmndrs/postprocessing's optimization is that multiple Effects passed to one EffectPass are merged into a single shader — eliminating the extra draw call overhead.
**Do this instead:** `new EffectPass(cam, bloom, crt)`. One pass, both effects merged. If EffectPass was already constructed, reconstruct it with both effects.

### Anti-Pattern 6: Writing New MetaStore Fields Without Migration

**What people do:** Add `activeShipSkin` to the MetaStore interface and set a default in the store creator, but forget to add a migration block.
**Why it's wrong:** Existing saves (version 3) do not have the new field. Zustand persist's `migrate` function is the only place to handle this. Omitting it means the field defaults to `undefined` for existing players, causing null-reference errors in `applySkin`.
**Do this instead:** Add a `version < 4` migration block that sets `activeShipSkin: 'default', activeShipColor: 'cyan', activeDifficulty: 'normal', crtIntensity: 0`. Increment `SAVE_VERSION` and the persist `version` number.

---

## Integration Points Summary

### Internal Boundaries (v1.1 additions)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `Game.ts` → `AudioManager` | Construct in init, pass via setter to systems | Not in PlayingStateContext — spans all states |
| `InputManager` → gamepad | Internal — `updateGamepad()` synthesizes to existing sets | Called from each state's update, not from Game.loop |
| `PlayingState` → `BeamSystem` | Via PlayingStateContext | Mirrors WeaponSystem pattern |
| `BeamSystem` ↔ `BeamEffect` | Ownership — BeamSystem constructs and controls | BeamEffect is a dumb visual; all logic in BeamSystem |
| `BeamSystem` → `EnemyFormation` | Direct read via formation.enemies[] | Same access pattern as CollisionSystem |
| `WeaponSystem` → `BeamSystem` | Delegation — WeaponSystem detects beam mode, delegates | WeaponSystem remains the single entry point for player fire |
| `BloomEffect` ↔ `CRTEffect` | BloomEffect reconstructs EffectPass to include CRT | CRTEffect has no knowledge of bloom internals |
| `MetaStore` → `Player.applySkin()` | PlayingState.enter() reads store, calls player method | No direct coupling between persistence and entity |
| `CollisionSystem` ↔ `Bullet.isPiercing` | Direct field read on Bullet entity | No interface change needed — Bullet already accessed directly |
| `MovementSystem` ↔ `RunState.timeScale` | Direct import of runState singleton | Consistent with existing `runState.addScore()` usage |

### Build Order for v1.1 (dependency-ordered)

```
1. MetaStore v4 schema + migration
   — prerequisite for: skins, difficulty, CRT unlock gating

2. AudioManager (standalone, no feature dependencies)
   — low-risk, high-value; SFX wired into existing systems

3. Gamepad input (InputManager.ts only)
   — all existing consumers gain gamepad support immediately

4. Ship Skins (requires MetaStore v4)
   — Player.ts geometry swap + new config; isolated change

5. CRT Effect (requires MetaStore v4 for intensity field)
   — BloomEffect + new CRTEffect.ts; contained rendering change

6. PowerUpType extensions: piercing, homing, time slow
   — touches powerups.ts, Bullet.ts, WeaponSystem, MovementSystem, CollisionSystem

7. Meta shop UI expansion (requires MetaStore v4, new upgrade IDs)
   — additive to MetaShopUI; depends on items defined in steps 1, 4, 5, 6

8. BeamSystem + BeamEffect (most complex; requires PowerUpType extended)
   — new entity + system; isolated from existing systems except formation read
```

---

## Sources

- Direct codebase reading: `Game.ts`, `InputManager.ts`, `WeaponSystem.ts`, `CollisionSystem.ts`, `PowerUpManager.ts`, `BloomEffect.ts`, `Player.ts`, `MetaState.ts`, `ShopSystem.ts`, `PlayingState.ts` — HIGH confidence
- [MDN: Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) — poll-based pattern, navigator.getGamepads() — HIGH confidence
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — AudioContext, AudioBufferSourceNode.loop, autoplay policy — HIGH confidence
- [MDN: AudioBufferSourceNode.loop](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop) — loop, loopStart, loopEnd properties — HIGH confidence
- [pmndrs/postprocessing Custom Effects wiki](https://github.com/pmndrs/postprocessing/wiki/Custom-Effects) — Effect subclass pattern, `mainImage` GLSL signature, built-in uniforms — HIGH confidence
- [pmndrs/postprocessing EffectComposer docs](https://pmndrs.github.io/postprocessing/public/docs/) — EffectPass multi-effect merging — HIGH confidence
- [TresJS ScanlinePmndrs](https://post-processing.tresjs.org/guide/pmndrs/scanline) — confirms scanline support in library; density/opacity params — MEDIUM confidence (wrapper, not core lib)
- [Three.js forum: InstancedMesh color per instance](https://discourse.threejs.org/t/how-to-change-texture-color-per-object-instance-in-instancedmesh/11271) — confirms geometry swap valid for regular Mesh — MEDIUM confidence
- [Gamepad polling at 250Hz (Chrome Status)](https://chromestatus.com/feature/5666929154981888) — poll rate context for Gamepad API — MEDIUM confidence

---
*Architecture research for: Super Space Invaders X v1.1 integration*
*Researched: 2026-03-06*
