# Phase 6: Foundation - Research

**Researched:** 2026-03-06
**Domain:** MetaStore schema migration (Zustand persist v3→v4) + Howler.js audio system
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **SFX style:** Synth-electronic — punchy synthesized sounds (laser zaps, digital explosions, electronic whooshes), Geometry Wars / Resogun vibe
- **SFX rate-limiting:** Cap concurrent instances per type (max 3 weapon fire overlaps) to prevent audio mud during intense waves
- **Enemy death SFX:** One shared death SFX for all enemy types (per-type deferred to AUD-08)
- **BGM source:** Royalty-free synthwave loop from free libraries (Pixabay, Freesound, OpenGameArt)
- **SFX source:** Free packs (Freesound/Pixabay/Kenney), light editing (trim, normalize)
- **Audio files location:** Committed to `/public/audio/` — no CDN or external URLs
- **Format:** MP3 + OGG fallback — Howler.js handles format selection automatically
- **Volume control:** Master volume only — single slider + mute toggle (AUD-06 spec)
- **Volume UI placement:** Inline in pause overlay, below "PAUSED" and "PRESS ESC TO RESUME"
- **No HUD volume indicator** — volume only from pause menu
- **M key mute shortcut:** Toggles mute without pausing; M not near movement keys
- **MetaStore v4 fields:** `volume`, `muted`, `selectedSkin { shapeId, colorId }`, `crtTier`, `crtIntensity`, `difficulty`, `startingPowerUp`, `extraLivesPurchased`
- **Migration defaults:** volume 0.8, muted false, skin default + white, CRT null, difficulty 'normal'
- **All v1.1 fields added in one v3→v4 migration** — no incremental v5 needed

### Claude's Discretion
- Exact Howler.js configuration (sprite pooling, audio sprite vs individual files)
- SFX rate-limiting implementation details (max concurrent, cooldown timing)
- AudioContext unlock strategy (first keypress gesture handling)
- Pause overlay layout/styling for volume controls
- Exact volume slider step granularity

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHOP-08 | Existing v1.0 save data migrates to v1.1 schema without loss (MetaStore v3→v4) | Zustand persist migrate() pattern — extend existing v0→v1→v2→v3 chain with v3→v4 block |
| AUD-01 | Player hears a looping synthwave BGM track during gameplay without audible gaps | Howler.js `loop: true` with Web Audio API; seamless loop via clean file prep + WebAudio buffer |
| AUD-02 | Player hears SFX for all combat events (weapon fire, enemy death, player hit, power-up pickup) | AudioManager.playSfx() wired into WeaponSystem, CollisionSystem integration points |
| AUD-03 | Player hears SFX for game flow events (wave start, boss phase transition, game over) | AudioManager.playSfx() called from SpawnSystem/HUD wave announcement, GameOverState |
| AUD-04 | Player hears SFX for UI interactions (menu navigation, shop purchase, pause) | AudioManager injected into PausedState, TitleState, ShopSystem callbacks |
| AUD-05 | Audio plays on first user interaction without requiring page refresh (AudioContext unlock) | Howler auto-resumes on first play(); explicit Howler.ctx.resume() on first keydown for reliability |
| AUD-06 | Player can mute/unmute and adjust master volume from pause menu | Howler.mute(bool), Howler.volume(n) globals; DOM slider + button in pause overlay HTML |
| AUD-07 | Volume preference persists across sessions | MetaStore v4 `volume` + `muted` fields read in AudioManager.init(), updated on change |
</phase_requirements>

---

## Summary

Phase 6 has two independent implementation tracks: (1) MetaStore v3→v4 schema migration adding all v1.1 persistent fields upfront, and (2) a complete Howler.js audio system. Both tracks can be built and merged independently — the migration has zero audio dependencies and the audio system only reads MetaStore for volume/muted preferences.

The MetaStore migration follows an identical pattern to the three migrations already in the codebase. The risk is near-zero: bump `SAVE_VERSION` to 4, bump Zustand persist `version` to 4, add a `version < 4` migration block with sensible defaults, and extend the `MetaStore` TypeScript interface. The new v4 fields (`selectedSkin`, `crtTier`, `crtIntensity`, `difficulty`, `startingPowerUp`, `extraLivesPurchased`) are not used by Phase 6 code — they are dormant data fields that Phases 8, 9, and 10 will activate. Only `volume` and `muted` are consumed by Phase 6.

The audio system uses Howler.js 2.2.4, which is already listed as a runtime dependency in the project memory (not yet installed). The standard approach is an `AudioManager` singleton that wraps Howler, exposes `playSfx(key)` and `playBgm()` methods, reads MetaStore for initial volume/muted state, and provides a `setVolume(n)` / `setMuted(bool)` API that simultaneously updates Howler globals and persists to MetaStore. The AudioContext unlock problem (AUD-05) is solved by a one-time `keydown` listener in `AudioManager.init()` that calls `Howler.ctx?.resume()` if the context is suspended, fired before the first `bgm.play()` call.

**Primary recommendation:** Build Plan 06-01 (MetaStore v4) first — it is a prerequisite for AUD-07. AudioManager (06-02) then reads the v4 fields on init. SFX wiring (06-03, 06-04) follows AudioManager.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| howler | 2.2.4 | Audio playback — BGM loop, SFX, AudioContext management | Already in project memory as chosen dep; Web Audio API with HTML5 fallback; handles format selection, pooling, and mobile unlock |
| @types/howler | 2.2.12 | TypeScript type definitions for Howler | DefinitelyTyped package, updated 2024, covers Howl + Howler globals |
| zustand/middleware `persist` | (already installed, zustand 5.0.11) | localStorage persistence with versioned migration | Already proven by v0→v1→v2→v3 migrations in MetaState.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| audiosprite CLI | (dev tool, not bundled) | Generates audio sprite + JSON manifest from individual SFX files | Useful for combining SFX into single file — optional for v1.1 given small SFX count; individual files per SFX is simpler |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Individual SFX files | Audio sprite (all SFX in one file) | Sprite reduces HTTP requests but requires manifest sync and offline toolchain. With Vite and ~6 SFX files, individual files are simpler for v1.1. AUD-09 (sprite pooling) explicitly deferred to v1.2. |
| Howler.mute(true) global | Per-Howl `sound.mute()` | Global mute is the right level for "mute all" — per-sound mute is for selective silencing |

**Installation:**
```bash
npm install howler
npm install --save-dev @types/howler
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── systems/
│   └── AudioManager.ts      # NEW — Howler singleton (BGM + SFX dispatch)
├── state/
│   └── MetaState.ts         # MODIFY — v4 migration, new fields, setVolume/setMuted actions
public/
└── audio/
    ├── bgm-synthwave.mp3    # BGM loop (sourced externally)
    ├── bgm-synthwave.ogg    # OGG fallback
    ├── sfx-shoot.mp3        # Player weapon fire
    ├── sfx-shoot.ogg
    ├── sfx-enemy-death.mp3  # Enemy death (shared all types)
    ├── sfx-enemy-death.ogg
    ├── sfx-player-hit.mp3   # Player takes damage
    ├── sfx-player-hit.ogg
    ├── sfx-pickup.mp3       # Power-up collected
    ├── sfx-pickup.ogg
    ├── sfx-wave-start.mp3   # Wave announcement
    ├── sfx-wave-start.ogg
    ├── sfx-boss-phase.mp3   # Boss phase transition
    ├── sfx-boss-phase.ogg
    ├── sfx-game-over.mp3    # Game over
    ├── sfx-game-over.ogg
    ├── sfx-pause.mp3        # Pause toggle
    ├── sfx-pause.ogg
    ├── sfx-purchase.mp3     # Shop purchase
    └── sfx-purchase.ogg
```

### Pattern 1: AudioManager Singleton
**What:** A class exported as a module-level singleton (same as `runState`), wrapping Howler. Loaded once in `Game.init()`, passed into states via `PlayingStateContext` or called globally.
**When to use:** Always — audio is a cross-cutting concern accessed from 6+ callsites

```typescript
// src/systems/AudioManager.ts
import { Howl, Howler } from 'howler';
import { useMetaStore } from '../state/MetaState';

// SFX keys — union type prevents typos at callsites
export type SfxKey =
  | 'shoot' | 'enemyDeath' | 'playerHit' | 'pickup'
  | 'waveStart' | 'bossPhase' | 'gameOver' | 'pause' | 'purchase';

class AudioManagerClass {
  private bgm: Howl | null = null;
  private sfxMap: Map<SfxKey, Howl> = new Map();
  private _unlocked = false;

  public init(): void {
    const { volume, muted } = useMetaStore.getState();

    // Apply persisted preferences to Howler globals
    Howler.volume(volume ?? 0.8);
    if (muted) Howler.mute(true);

    // BGM Howl — loop: true, Web Audio by default
    this.bgm = new Howl({
      src: ['/audio/bgm-synthwave.mp3', '/audio/bgm-synthwave.ogg'],
      loop: true,
      volume: 1.0,  // Master volume is set globally; per-Howl volume stays at 1
    });

    // SFX Howls — pool: 3 caps concurrent instances (rate-limiting per CONTEXT.md)
    const sfxDefs: [SfxKey, string][] = [
      ['shoot',       '/audio/sfx-shoot'],
      ['enemyDeath',  '/audio/sfx-enemy-death'],
      ['playerHit',   '/audio/sfx-player-hit'],
      ['pickup',      '/audio/sfx-pickup'],
      ['waveStart',   '/audio/sfx-wave-start'],
      ['bossPhase',   '/audio/sfx-boss-phase'],
      ['gameOver',    '/audio/sfx-game-over'],
      ['pause',       '/audio/sfx-pause'],
      ['purchase',    '/audio/sfx-purchase'],
    ];
    for (const [key, base] of sfxDefs) {
      this.sfxMap.set(key, new Howl({
        src: [`${base}.mp3`, `${base}.ogg`],
        pool: 3,  // max 3 concurrent instances of this SFX (rate-limiting)
      }));
    }

    // AUD-05: AudioContext unlock on first keydown (before first user-initiated play)
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      // Resume AudioContext if suspended (Chrome autoplay policy)
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        void Howler.ctx.resume();
      }
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('keydown', unlock);
  }

  public playBgm(): void {
    this.bgm?.play();
  }

  public stopBgm(): void {
    this.bgm?.stop();
  }

  public playSfx(key: SfxKey): void {
    this.sfxMap.get(key)?.play();
  }

  /** AUD-06 + AUD-07: Set master volume, persist to MetaStore */
  public setVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    Howler.volume(clamped);
    useMetaStore.getState().setVolume(clamped);
  }

  /** AUD-06 + AUD-07: Toggle global mute, persist to MetaStore */
  public setMuted(muted: boolean): void {
    Howler.mute(muted);
    useMetaStore.getState().setMuted(muted);
  }

  public get isMuted(): boolean {
    return useMetaStore.getState().muted;
  }
}

export const audioManager = new AudioManagerClass();
```

### Pattern 2: MetaStore v3→v4 Migration
**What:** Extend the existing Zustand persist migration chain with a `version < 4` block. Bump `SAVE_VERSION` constant and persist `version` option to 4. Add new fields to the interface.
**When to use:** Any time the schema changes — the chain style is already established

```typescript
// src/state/MetaState.ts — extend existing pattern

const SAVE_VERSION = 4;  // was 3

// Add to MetaStore interface:
export interface MetaStore {
  // ... existing fields ...
  volume: number;               // 0.0–1.0, default 0.8
  muted: boolean;               // default false
  selectedSkin: { shapeId: string; colorId: string };  // default: { 'default', 'white' }
  crtTier: number | null;       // null = not unlocked; 1/2/3 = tier
  crtIntensity: number;         // 0.0–1.0, default 0.5
  difficulty: 'normal' | 'hard' | 'nightmare';  // default 'normal'
  startingPowerUp: string | null;  // upgrade ID or null
  extraLivesPurchased: number;  // 0, 1, or 2

  // New actions for Phase 6:
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
}

// In migrate function, add after existing v2→v3 block:
if (version < 4) {
  state = {
    ...state,
    volume: 0.8,
    muted: false,
    selectedSkin: { shapeId: 'default', colorId: 'white' },
    crtTier: null,
    crtIntensity: 0.5,
    difficulty: 'normal',
    startingPowerUp: null,
    extraLivesPurchased: 0,
    saveVersion: 4,
  };
}

// In persist options:
{
  name: META_STORAGE_KEY,
  version: 4,   // was 3
  migrate: ...
}
```

### Pattern 3: Setter Injection for AudioManager
**What:** AudioManager wired into `PlayingStateContext` via setter injection — same pattern as `collisionSystem.setParticleManager()`.
**When to use:** When a system needs access to AudioManager but shouldn't hold a constructor dependency

```typescript
// Game.ts init() — following existing injection pattern:
import { audioManager } from '../systems/AudioManager';

// After constructing systems:
audioManager.init();

// Wire into WeaponSystem:
// Option A: pass audioManager directly to WeaponSystem.update() as optional param
// Option B: WeaponSystem.setAudioManager(audioManager) — matches setParticleManager pattern

// Add to PlayingStateContext:
// audioManager: AudioManager instance (for pause state and other states)
```

### Pattern 4: SFX Integration via Existing Signals
**What:** Piggyback on existing auto-reset-on-read signals — `wasHitThisStep()`, `consumePickupName()` — already being read by `PlayingState.update()`. Add SFX calls at the same read sites.
**When to use:** For hit and pickup SFX — zero new signal infrastructure needed

```typescript
// PlayingState.update() — existing read sites get SFX calls:

// Hit SFX (already reading wasHitThisStep for cameraShake):
if (ctx.collisionSystem.wasHitThisStep()) {
  ctx.cameraShake.triggerSmall();
  audioManager.playSfx('playerHit');  // ADD THIS
}

// Pickup SFX (already reading consumePickupName for PickupFeedback):
const pickedUpName = ctx.collisionSystem.consumePickupName();
if (pickedUpName) {
  ctx.pickupFeedback.showPickup(pickedUpName);
  audioManager.playSfx('pickup');  // ADD THIS
}
```

### Pattern 5: Volume Control in Pause Overlay
**What:** Extend `PausedState.enter()` HTML template with a volume slider and mute button. Read MetaStore for current values. Use DOM event listeners in `PausedState.update()` or inline `oninput`/`onclick` handlers.
**When to use:** Pause overlay is the only volume access point

```typescript
// PausedState.enter() — extend existing showOverlay() call:
const { volume, muted } = useMetaStore.getState();
this.hud.showOverlay(`
  <h1 style="font-size:48px;...">PAUSED</h1>
  <p style="...">PRESS ESC or P TO RESUME</p>
  <div style="margin-top:32px;display:flex;flex-direction:column;align-items:center;gap:16px;">
    <label style="font-family:'Courier New';color:#fff;font-size:14px;">
      VOLUME
      <input id="vol-slider" type="range" min="0" max="1" step="0.05"
             value="${volume}"
             style="margin-left:12px;width:160px;" />
    </label>
    <button id="mute-btn" style="font-family:'Courier New';font-size:14px;cursor:pointer;
            background:transparent;border:1px solid #fff;color:#fff;padding:6px 16px;">
      ${muted ? 'UNMUTE' : 'MUTE'}
    </button>
  </div>
`);

// Wire DOM events after showOverlay():
const slider = document.getElementById('vol-slider') as HTMLInputElement | null;
const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement | null;
slider?.addEventListener('input', () => {
  audioManager.setVolume(parseFloat(slider.value));
});
muteBtn?.addEventListener('click', () => {
  audioManager.setMuted(!useMetaStore.getState().muted);
  muteBtn.textContent = useMetaStore.getState().muted ? 'UNMUTE' : 'MUTE';
});
```

### Anti-Patterns to Avoid
- **Creating Howl instances per frame:** Howl instances are heavy. Create once in `init()`, call `play()` repeatedly. Each `play()` call on an existing Howl creates a new internal Sound node from the pool.
- **HTML5 Audio for BGM loop:** Howler defaults to Web Audio API which gives seamless looping. HTML5 Audio has a gap at the loop boundary (browser bug). Do NOT pass `html5: true` to the BGM Howl.
- **Calling `bgm.play()` before AudioContext is unlocked:** The BGM call must happen inside or after a user gesture handler. Call `playBgm()` from `PlayingState.enter()` (which is always triggered by a user action — pressing start/confirm from TitleState).
- **Storing AudioContext reference separately:** Always use `Howler.ctx` — Howler manages its own AudioContext lifecycle. Creating a second AudioContext causes resource waste.
- **Direct MetaStore mutation for volume:** Always call `audioManager.setVolume()` which updates both Howler and MetaStore atomically. Never call `useMetaStore.getState().setVolume()` without also calling `Howler.volume()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio format fallback | Custom MP3/OGG detection | Howler's `src` array | Howler tests codec support automatically (canPlayType) |
| AudioContext lifecycle | Manual AudioContext creation/resume | Howler.ctx + Howler's _autoResume | Howler handles suspend-on-idle (30s timeout) and resume on play |
| Audio pooling | Custom array of Audio elements | Howler `pool` option | `pool: N` on a Howl instance limits concurrent instances — Howler manages the pool |
| BGM seamless loop | `onend` callback re-playing same sound | `loop: true` on a Howl (Web Audio path) | Web Audio buffers loop with exact sample precision; HTML5 Audio has gap |
| localStorage schema migration | Custom JSON parse/migrate code | Zustand persist `migrate` | Zustand handles versioning, JSON parse errors, and partial state gracefully |
| Volume persistence | Separate localStorage key | MetaStore v4 `volume` + `muted` fields | All persistent state lives in one versioned store |

**Key insight:** Howler's Web Audio path (`html5: false`, the default) uses `AudioBufferSourceNode` for looping, which loops without any gap. HTML5 Audio's `loop` attribute has a browser-dependent gap (50-200ms). The distinction matters only for BGM; SFX are non-looping so either path works.

---

## Common Pitfalls

### Pitfall 1: BGM gap at loop boundary
**What goes wrong:** BGM has an audible click or gap when the loop restarts
**Why it happens:** Usually caused by (a) non-zero start/end in the audio file, (b) using HTML5 Audio path (`html5: true`), or (c) MP3 encoder silence padding
**How to avoid:**
1. Use OGG Vorbis for BGM if possible — OGG has reliable gapless looping in Web Audio
2. Alternatively: prepare MP3 with `--nogap` flag in LAME encoder, or use Audacity to trim exact silence at start/end
3. Never pass `html5: true` to the BGM Howl
4. Test loop boundary by listening at the seam — if gap exists, switch to OGG as primary format: `src: ['bgm.ogg', 'bgm.mp3']`
**Warning signs:** Can only hear gap when headphones are on; silent in speaker test

### Pitfall 2: AudioContext suspended on fresh tab
**What goes wrong:** BGM and SFX silently fail on the very first keypress that starts the game; player must press a second key for audio to work
**Why it happens:** `bgm.play()` is called in `PlayingState.enter()` but the AudioContext is still "suspended" — Chrome creates all new AudioContexts in suspended state until a user gesture occurs in the browser event loop
**How to avoid:**
- Add a `keydown` listener in `AudioManager.init()` that calls `Howler.ctx?.resume()` — this runs synchronously in a trusted event handler, satisfying Chrome's autoplay policy
- The resume should be a one-shot listener (remove after first fire)
- Howler's own `_autoResume` is triggered by `play()` calls but may not fire synchronously on first gesture
**Warning signs:** First game session after a hard refresh has no audio; second run (same tab) has audio

### Pitfall 3: MetaStore migration clobbers existing v3 fields
**What goes wrong:** A v1.0 player loads the game and finds their high score reset to 0 and SI$ balance zeroed
**Why it happens:** The `version < 4` migration block spread `...state` BEFORE adding new fields — but if the logic is written incorrectly (e.g., `{ ...newFields, ...state }` instead of `{ ...state, ...newFields }`), new field defaults overwrite persisted values
**How to avoid:** Always spread existing state first: `state = { ...state, volume: 0.8, muted: false, ... }` — new fields get defaults only, existing fields (`metaCurrency`, `highScore`, etc.) are preserved
**Warning signs:** Unit test: deserialize a v3 snapshot, run migrate(v3Snapshot, 3), assert `metaCurrency` and `highScore` are unchanged

### Pitfall 4: SFX called on every frame for continuous-fire events
**What goes wrong:** Weapon fire SFX triggers while Space is held, producing a wall of audio that saturates the 3-instance pool within one game tick
**Why it happens:** `WeaponSystem.update()` fires on `justPressed('Space')` (once per keypress), but if a caller ever accidentally puts SFX on an `isDown()` check instead, it fires every fixed step
**How to avoid:** Wire weapon SFX inside the `if (wantsToFire && player.canFire())` branch in `WeaponSystem.update()` — same location as the muzzle flash. The fire cooldown (0.15s or 0.08s rapid) already rate-limits actual shots
**Warning signs:** Weapon SFX sounds like a sustained buzz rather than individual pops

### Pitfall 5: Volume slider not reflecting M-key mute state
**What goes wrong:** Player presses M to mute during gameplay, opens pause, and the mute button still shows "MUTE" (not "UNMUTE")
**Why it happens:** Pause overlay HTML is generated once in `enter()` using a snapshot of MetaStore state — if M key fires after `enter()` is called, the button text is stale
**How to avoid:** Read MetaStore in `enter()` to generate the initial HTML (correct), AND update the button text in `PausedState.update()` each frame (or re-read MetaStore state on each render of the overlay). Simpler: generate overlay HTML from MetaStore on every `enter()` call and trust that M key won't fire while paused
**Warning signs:** Inconsistent mute button label after toggling M key during play then pausing

---

## Code Examples

Verified patterns from official sources:

### Howler BGM Setup (loop, no HTML5, MP3+OGG)
```typescript
// Source: https://github.com/goldfire/howler.js#documentation
const bgm = new Howl({
  src: ['/audio/bgm-synthwave.ogg', '/audio/bgm-synthwave.mp3'],
  loop: true,
  volume: 1.0,
  // html5: false (default) — Web Audio API ensures gapless loop
});
bgm.play();
```

### Howler SFX with Pool Rate-Limiting
```typescript
// Source: https://github.com/goldfire/howler.js#documentation
// pool: 3 = max 3 concurrent playbacks of this sound
const sfxShoot = new Howl({
  src: ['/audio/sfx-shoot.ogg', '/audio/sfx-shoot.mp3'],
  pool: 3,
});
// Each call to play() reuses or creates a sound node from the pool (capped at 3)
sfxShoot.play();
```

### Howler Global Volume and Mute
```typescript
// Source: https://github.com/goldfire/howler.js#documentation
Howler.volume(0.7);      // set global volume 0.0–1.0
Howler.volume();         // get current global volume

Howler.mute(true);       // mute all sounds
Howler.mute(false);      // unmute all sounds
```

### AudioContext Unlock on First Keydown
```typescript
// Source: MDN Web Audio API best practices + Howler.js issue #1105
const unlock = () => {
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    void Howler.ctx.resume();
  }
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('keydown', unlock);
```

### Zustand Persist v3→v4 Migration Chain
```typescript
// Source: existing MetaState.ts pattern + zustand.docs.pmnd.rs
migrate: (persistedState: unknown, version: number) => {
  let state = persistedState as Partial<MetaStore>;
  if (version < 1) {
    state = { ...state, purchasedUpgrades: [], saveVersion: 1 };
  }
  if (version < 2) {
    state = { ...state, bunkersEnabled: true, saveVersion: 2 };
  }
  if (version < 3) {
    state = { ...state, campaignProgress: {}, briefingAutoDismiss: false, saveVersion: 3 };
  }
  // NEW: v3 → v4
  if (version < 4) {
    state = {
      ...state,
      volume: 0.8,
      muted: false,
      selectedSkin: { shapeId: 'default', colorId: 'white' },
      crtTier: null,
      crtIntensity: 0.5,
      difficulty: 'normal' as const,
      startingPowerUp: null,
      extraLivesPurchased: 0,
      saveVersion: 4,
    };
  }
  return state as MetaStore;
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 Audio `<audio loop>` for BGM | Web Audio API via Howler (default) | ~2015–2020 | Eliminates loop gap; same code, just don't pass `html5: true` |
| Manual `new AudioContext()` + resume | Howler.ctx + `_autoResume` | Howler 2.x | Howler manages context lifecycle; check `Howler.ctx.state` for edge cases |
| Audio sprites as primary SFX strategy | Individual Howl per SFX type with `pool` | Howler 2.0+ | Sprites still useful for network optimization; pool: N handles rate-limiting per SFX type natively. Sprites deferred to AUD-09. |

**Deprecated/outdated:**
- `createjs.Sound` / `Buzz.js`: Replaced by Howler across the industry — not relevant here
- `Howler.autoUnlock` property: Removed in 2.x; Howler handles unlock internally via `_autoResume`

---

## Open Questions

1. **BGM asset availability before ship**
   - What we know: BGM must be sourced from Pixabay/Freesound/OpenGameArt (royalty-free synthwave)
   - What's unclear: Asset availability timeline — no code blocker but a ship blocker for Phase 6
   - Recommendation: Plan 06-02 AudioManager task should include a concrete BGM sourcing step as a deliverable, not just a code task. Flag this in PLAN.md as a prerequisite.

2. **OGG vs MP3 primary for BGM gapless loop**
   - What we know: OGG Vorbis has more reliable gapless looping than MP3 (MP3 has encoder silence padding)
   - What's unclear: Whether the sourced BGM will be available in OGG format
   - Recommendation: Request/convert to OGG as primary, MP3 as fallback: `src: ['bgm.ogg', 'bgm.mp3']`. If OGG not available, test the MP3 loop in Chrome and Firefox before shipping.

3. **M key collision with existing keybindings**
   - What we know: CONTEXT.md states M is not near movement keys (WASD/arrows) — low collision risk
   - What's unclear: Whether any existing system checks 'KeyM'
   - Recommendation: Grep `KeyM` in codebase before wiring — likely clean, but verify.

---

## Sources

### Primary (HIGH confidence)
- Howler.js GitHub documentation (https://github.com/goldfire/howler.js#documentation) — Howl options, Howler globals, events
- Existing `MetaState.ts` source — Zustand persist migration chain pattern
- Existing `Game.ts`, `CollisionSystem.ts`, `WeaponSystem.ts`, `PlayingState.ts` — integration points verified by reading source
- npm registry — Howler 2.2.4 confirmed as latest stable; @types/howler 2.2.12

### Secondary (MEDIUM confidence)
- MDN Web Audio API Best Practices (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — AudioContext unlock on user gesture
- Chrome Developers blog Web Audio Autoplay (https://developer.chrome.com/blog/web-audio-autoplay) — `keydown` recognized as user gesture for AudioContext.resume()
- Howler.js GitHub issue #1105 (https://github.com/goldfire/howler.js/issues/1105) — confirmed pattern: call play() from user event handler; manual `Howler.ctx.resume()` as belt-and-suspenders

### Tertiary (LOW confidence, flagged for validation)
- Howler.js BGM loop gap issues (GitHub issues #39, #421, #1426) — community reports OGG more reliable than MP3 for gapless loop; not in official docs. **Test this assumption with actual audio files.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Howler 2.2.4 is confirmed (project memory + npm), Zustand already in use, @types/howler exists
- Architecture: HIGH — AudioManager singleton pattern is identical to RunState (existing code); MetaStore migration extends proven chain
- Pitfalls: MEDIUM — BGM gap pitfall is community-verified (multiple GitHub issues) but OGG-fixes it claim needs per-file validation

**Research date:** 2026-03-06
**Valid until:** 2026-09-06 (Howler 2.2.x stable API, no breaking changes expected; Zustand 5.x stable)
