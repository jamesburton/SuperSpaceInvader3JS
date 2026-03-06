# Feature Research

**Domain:** Browser-based arcade space shooter — v1.1 additions (audio, gamepad, ship skins, laser power-ups, meta shop expansion, CRT filters)
**Researched:** 2026-03-06
**Confidence:** HIGH for patterns (Web Audio API, Gamepad API are well-documented browser standards); MEDIUM for UX balance (roguelite meta shop expansion, power-up tuning)

---

## Scope Note

This document covers **only the new v1.1 features** being added to the existing v1.0 codebase. The v1.0 feature landscape (movement, combat, enemy archetypes, boss, campaign, meta shop foundation) is documented in the archived v1.0 research. v1.1 adds six feature categories to an already-working game.

**Existing systems to integrate with:**
- WeaponSystem — already handles spread shot, rapid fire, shield; new power-ups extend it
- ShopSystem / ShopUI — between-wave shop already exists; new power-ups are new shop items
- MetaStore (Zustand persist) — already serializes to localStorage at key `ssi-meta-v1`; meta shop expansion writes new fields
- Player entity — already has geometry, material, invincibility frames; skins change geometry/material
- InputManager — keyboard-only; gamepad adds a second input source to the same boolean keymap interface
- pmndrs/postprocessing EffectComposer — already in pipeline; CRT scanline adds to the same EffectPass

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that players now expect given the v1.0 foundation exists. Adding v1.1 without these would feel incomplete or regressive.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Audio: SFX on all combat events | Any polished game has sound; now that audio is in scope, missing key events (shoot, explode, pickup, hit) makes the game feel half-done | MEDIUM | Web Audio API AudioContext; SFX as audio sprites (single file, JSON timing map). Every combat event — shoot, enemy death, player hit, power-up pickup, wave start, boss phase — needs a sound. Silence on any event is immediately noticeable. |
| Audio: BGM loop without audible gap | Looping background music is a baseline expectation; a BGM that clicks or restarts audibly is worse than no music | MEDIUM | AudioBufferSourceNode with `loop: true` and `loopStart`/`loopEnd` set to sample-accurate boundaries. Synthwave loops must be cut on downbeat, not arbitrary. |
| AudioContext user-gesture unlock | Chrome and all modern browsers block audio until first user interaction; silent game on load feels broken even if audio is implemented correctly | LOW | Resume AudioContext in the same click handler that starts the game (title screen button or first keypress). Failure to handle this = no audio on Chrome. |
| Volume control (master) | Any game with audio needs at minimum a master mute toggle; players will mute if they can't control volume | LOW | Global GainNode at the end of the audio graph. Master volume 0–1 float. Persist preference in localStorage. A mute button in the pause menu is the minimum. |
| Gamepad connect/disconnect notification | When a gamepad is plugged in, players expect acknowledgment; plugging a controller into a keyboard-only game and having nothing happen reads as "broken" | LOW | `gamepadconnected` event shows brief on-screen "Controller connected" toast. No acknowledgment = confusion. |
| Ship skin visible in ship select UI | If skins are purchasable, the selection screen must show them — a text list of purchased skins with no preview reads as unfinished | MEDIUM | Mini preview render or DOM canvas thumbnail of each ship geometry at selection. The shape variants must visibly differ. |
| New power-ups visually distinct from existing | Adding 6 new power-ups that look like variants of spread/rapid/shield creates visual noise and confusion; each must have unique pickup iconography | MEDIUM | Distinct geometry/color per power-up type. Existing: spread (blue triangle burst), rapid (orange), shield (green ring). New ones need new shapes/colors occupying different visual language. |
| Laser power-ups feel meaningfully different from bullet weapons | If a "laser" power-up fires a fast stream of bullets, it's not a laser — it's disappointing. Players expect beam width, continuous damage, or charge behavior | HIGH | Continuous beam = thin plane mesh with emissive shader, damage per-tick on contact. Charged burst = visual charge-up anim then instant flash. Sweeping = beam rotates arc. These require distinct rendering approaches vs. bullet pool. |
| CRT filter actually visible at default intensity | If the CRT effect is too subtle at its default setting, players will never notice it was added | LOW | Default intensity at a perceptible level (density ~1.2, opacity ~0.4–0.6). Ship it slightly aggressive, let players tune down. An invisible effect that costs a shop unlock is worse than no effect. |

### Differentiators (Competitive Advantage)

Features that elevate the v1.1 release beyond a checkbox addition. These align with the project's portfolio goal and neon cyberpunk identity.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Synthwave BGM with combat-reactive intensity | Static BGM is expected; BGM that subtly shifts (volume/filter) based on combat intensity or boss phase is memorable and technically impressive | HIGH | Web Audio API DynamicsCompressorNode + BiquadFilterNode cutoff modulation. Boss phase could raise filter cutoff gradually for tension. This is a differentiator only if implemented; plain static loop is table stakes. |
| Per-weapon SFX with distinct tonal identity | Spread shot, laser, and rapid fire should each "sound like themselves" — different timbres make the weapon feel different without reading a tooltip | MEDIUM | Frequency/attack envelope per weapon type. Continuous beam gets a sustained drone (start sound, loop sound, stop sound). Piercing has a "zip" character. Homing gets a missile whoosh. |
| Audio sprite pooling for high-rate SFX | Rapid fire firing 10 shots/second with howler.js naively creates 10 concurrent AudioBufferSourceNodes; poor implementations cause stutter or silence | MEDIUM | Rate-limit SFX trigger per event type (e.g., fire SFX max 4/sec even if fire rate is 20/sec). Use Web Audio API's ability to cancel/restart nodes rather than layering unbounded instances. |
| Gamepad left-stick analog movement | D-pad gamepad movement (digital) works but feels worse than keyboard; analog stick with deadzone gives smoother movement feel | MEDIUM | Left stick X axis → player velocity (with 0.15 deadzone). A button = shoot. Start = pause. Right trigger or B = secondary fire. Map must be displayed in settings. |
| Gamepad rumble on player hit | Haptic feedback on damage is a minor implementation (GamepadHapticActuator.playEffect) but punches way above its weight in feel | MEDIUM | Chrome supports `gamepad.vibrationActuator.playEffect('dual-rumble')`. Firefox uses `hapticActuators[0].pulse()`. Wrap in try/catch; not all gamepads support it. Duration 150ms, weak magnitude 0.3 on hit. |
| Ship skin shapes with functional flavor text | Pure cosmetic skins are fine; skins that also hint at a stat flavor ("sleek wing — feels faster") add perceived depth even if the stats are identical | LOW | Flavor text only, no actual stat changes per skin shape (keep balance). Color variants don't affect stats. The story-telling justifies the meta shop purchase. |
| Color variants with palette integration | The neon Tokyo per-wave color palette system should respect the player's chosen ship color; a mismatch between player ship color and wave palette breaks the aesthetic | MEDIUM | Ship color variant stored in MetaStore; applied via `material.color.set()` at spawn. Must not clash with wave enemy palettes — test all combinations. |
| Piercing shot visual trail | Piercing bullet needs a visual cue that it penetrates — a tracer trail or glow elongation behind the projectile that says "this goes through things" | LOW | Stretch the bullet mesh along velocity axis (scaleY proportional to speed). Additive blend; bright white core with colored fringe. Taller/thinner than a standard bullet. |
| Homing missile lock-on visual | Homing missiles without targeting cues are confusing — player can't tell if it's homing until they see it curve | LOW | Small targeting reticle on the nearest enemy when homing missile is active. Reticle opacity pulses at lock-on rate. This communicates the mechanic passively. |
| Time slow: whole-world visual treatment | Time slow that only slows enemy movement but doesn't change rendering feels disconnected. Desaturation + vignette + audio pitch shift during slow-mo makes it feel like a game state | MEDIUM | Multiply all delta values by timeScale (0.3–0.4) during slow-mo. Apply desaturation via ColorAverageEffect (pmndrs), or a tinted EffectPass. Pitch-shift BGM down via AudioContext playbackRate. |
| Charged burst laser: telegraphed charge + release | A charge weapon where you can't see charge progress is frustrating. Visible charge bar or ship glow-up animation that intensifies with charge level is expected for this mechanic | MEDIUM | Ship mesh emissiveIntensity ramps from 1.0 to 4.0 over charge duration. Optional: small expanding ring particles. Release fires instant-travel bright beam (LineSegments mesh or PlaneGeometry scaled to screen width). |
| Sweeping laser: arc sweep with enemy position weighting | A predictable sweep direction makes the sweep trivial to dodge or exploit. Weight the sweep direction toward the current highest-density enemy cluster | HIGH | Raycast along sweep arc to count enemies per angular band; start sweep from sparse end toward dense end. This is the "smart" behavior that makes sweeping feel rewarding rather than random. |
| CRT intensity slider: real-time preview | An intensity slider that updates CRT effect live (not apply-then-see) lets players find their preferred aesthetic. Portfolio tech demo value — shows real-time shader parameter control | LOW | ScanlineEffect density/opacity uniforms update directly via lil-gui or DOM slider input event. No scene rebuild required. No restart required. |
| Meta shop unlocking CRT presets named as visual eras | "ARCADE 1983 / CONSUMER 1991 / HIGH-DEF 2003" presets as unlock tiers have more perceived value than "CRT Level 1/2/3" | LOW | Named presets map to specific density + curvature + opacity combinations. Unlock tier 1 = lighter effect, tier 3 = heavy curvature + interlace. Pure UX framing, zero extra implementation. |
| Starting power-up slot: pre-run selection with preview | If the starting power-up slot just says "pick one" with text names, it's less compelling than a small preview showing the power-up visual | MEDIUM | At run start, show mini-previews of available power-up pickups from the unlocked pool. Same pickup art used in-game. Single-click selection before entering wave 1. |
| Difficulty unlock: Hard mode changes more than numbers | A "Hard mode" that only increases enemy HP and speed is boring to unlock. Hard mode that changes enemy patterns, adds new enemy behaviors, or enables otherwise-disabled archetypes is worth buying in the meta shop | MEDIUM | Hard: +20% enemy speed, +1 enemy per wave, enable Sniper archetype earlier. Nightmare: formation breaks occur more aggressively, boss adds new attack phase. Tied to waveConfig difficulty multipliers. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural v1.1 additions but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiple BGM tracks that change per level | "More variety in music" | Significantly increases audio asset production scope; licensing multiple synthwave tracks for a portfolio project is a rabbit hole | One high-quality looping synthwave BGM that covers the whole game. Boss phase can intensify it dynamically via audio graph manipulation rather than swapping tracks. |
| 3D positional audio for SFX (PannerNode per entity) | "Bullets should sound like they're passing by" | Space Invaders is a flat-screen 2D game. Spatial audio adds implementation cost for zero gameplay benefit. | Stereo panning on enemy fire (enemy X position maps to left/right) is enough spatial cue without full 3D panning node per entity. |
| Dynamic music that adapts to score multiplier | "Music tempo changes as you get more kills" | Dynamic music that adapts in real-time requires stem-based multi-track audio (separate drums/bass/melody stems). This requires audio production of separate stems, not just one loop. | Reserve this for a future audio deep-dive. Ship one great static loop with subtle filter modulation on boss phase. |
| Full button remapping UI for gamepad | "Players want to customize controls" | Implementation cost is high (serialized binding map, UI for reassignment, conflict detection). Most players use defaults. | Hardcode standard gamepad layout with documentation. Xbox A = shoot, stick = move, Start = pause. PS controller maps identically via standard layout API. |
| Analog aim with right stick | "More control feel" | Space Invaders is fixed horizontal movement — analog aim direction breaks the game design. Free-aim turns it into a twin-stick shooter which is a different genre. | Left stick X only for horizontal movement. No aim direction. Fire is always up (toward enemies). |
| Per-ship audio themes (different sounds per skin) | "Each ship could have its own SFX flavor" | Requires separate SFX sets per ship; significant audio asset scope for a cosmetic feature | Use one SFX set. Cosmetic skins are purely visual. |
| Laser power-ups using THREE.Line or LineSegments | "A line primitive is the obvious choice for a laser" | THREE.Line has no hit volume — can't be used for collision detection. Thickness control is limited. Inconsistent render across WebGL implementations. | Use a thin PlaneGeometry (flat scaled quad) with emissive material + additive blending. Scales predictably, controllable width, works with existing collision AABB system. |
| Time slow + homing + piercing all active simultaneously | "Player stacking all power-ups is fun" | Three simultaneous power-ups with strong screen effects (desaturation + homing reticles + long piercing trails) creates visual chaos that undermines readability | Power-up slot limit (1-2 active at once), or power-ups that override rather than stack. Stacking is the common mistake — override-on-pickup is cleaner. |
| Homing missiles that never miss | "If they home, they should always connect" | A homing weapon that guarantees kills removes all skill from the power-up. It feels like a cheat, not a reward. | Homing missiles have a turn-rate limit (max angular velocity per tick), a lifetime cap, and break lock when target leaves the playfield. Miss is possible and expected on fast enemies. |
| CRT effect that bends/warps game world coordinates | "Real CRT had barrel distortion" | Screen curvature / barrel distortion applied to the WebGL canvas distorts the HUD, hitbox readability, and creates motion sickness risk. Gameplay impact outweighs authenticity. | Apply scanlines + bloom + chromatic aberration only. Skip barrel distortion. If curvature is desired, only apply to the background layer, not the game layer. |
| Saving mid-run when gamepad is unplugged | "Fairness when controller disconnects" | Roguelite design assumes complete runs. Mid-run save state introduces state management complexity and breaks roguelite tension by design. | On gamepad disconnect: pause the game and show "Controller disconnected — reconnect to continue or press Enter to use keyboard." Resume without saving. |
| Permanent extra-life meta upgrade stacking to 10+ | "More extra lives = more fun" | Unlimited extra lives make the game trivially easy and remove tension. Players who buy 10 lives feel no danger. | Cap at 2 extra lives in meta shop (base 3 + max 2 = 5 lives). Or implement as per-run rather than stacking. Hades model: each additional life costs more SI$ exponentially. |

---

## Feature Dependencies

```
[Audio System]
    └──requires──> [AudioContext unlock (first user gesture)]
    └──requires──> [Audio sprite file (SFX) + BGM loop file loaded before wave 1]

[SFX playback]
    └──requires──> [Audio System]
    └──requires──> [WeaponSystem fire events, collision events, pickup events]

[BGM BGM playback + dynamic intensity]
    └──requires──> [Audio System]
    └──enhances──> [Boss phase transitions] (filter modulation on phase change)

[Gamepad Input]
    └──requires──> [InputManager interface extended to accept gamepad button state]
    └──requires──> [gamepadconnected / gamepaddisconnected events]
    └──enhances──> [Player movement, shoot, pause] (same boolean map as keyboard)
    └──conflicts with──> [Keyboard-only assumptions in InputManager] (must support simultaneous keyboard + gamepad)

[Gamepad Rumble]
    └──requires──> [Gamepad Input]
    └──requires──> [Player hit event from CollisionSystem]

[Ship Skins]
    └──requires──> [MetaStore: purchased skin IDs persisted]
    └──requires──> [Ship skin selection UI in meta shop]
    └──requires──> [Player entity: swap geometry + material on skin change]
    └──conflicts with──> [InstancedMesh for player ship] (player ship is a single entity, not instanced — OK to swap directly)

[Ship Color Variants]
    └──requires──> [Ship Skins]
    └──requires──> [Color palette compatibility check vs wave enemy palettes]

[Piercing Shot power-up]
    └──requires──> [WeaponSystem bullet penetration flag]
    └──requires──> [CollisionSystem: penetrating bullets do not deactivate on first hit]
    └──enhances──> [Between-wave shop] (new item in rotation)

[Homing Missile power-up]
    └──requires──> [WeaponSystem: homing bullet type with angular steering]
    └──requires──> [EnemyManager: nearest-enemy query per tick]
    └──enhances──> [Between-wave shop]

[Time Slow power-up]
    └──requires──> [Game loop timeScale multiplier] (global delta scalar, currently fixed at 1.0)
    └──requires──> [VisualEffect: desaturation pass or ColorAverageEffect]
    └──requires──> [Audio: AudioContext playbackRate scaling during slow-mo]
    └──enhances──> [Between-wave shop]

[Continuous Beam Laser power-up]
    └──requires──> [WeaponSystem: beam weapon type (continuous damage, no bullet pool)]
    └──requires──> [PlaneGeometry beam mesh with emissive + additive blending]
    └──requires──> [CollisionSystem: line-vs-AABB intersection for beam damage]

[Charged Burst Laser power-up]
    └──requires──> [WeaponSystem: charge state + release trigger]
    └──requires──> [Player entity: emissiveIntensity ramp during charge]
    └──requires──> [CollisionSystem: instant-travel beam hit detection (full-column)]

[Sweeping Laser power-up]
    └──requires──> [WeaponSystem: arc sweep state machine]
    └──requires──> [Continuous Beam Laser] (shares beam rendering approach)
    └──requires──> [EnemyManager: density query per angular band for smart sweep direction]

[All new power-ups]
    └──requires──> [Between-wave shop item pool expansion]
    └──requires──> [Power-up pickup sprite variants (distinct visuals)]
    └──requires──> [ShopSystem: extended item type registry]

[Meta Shop Expansion: extra lives]
    └──requires──> [MetaStore: lives modifier field]
    └──requires──> [RunState: apply lives bonus at run start]

[Meta Shop Expansion: alt ships]
    └──requires──> [Ship Skins] (alt ships are skins with shape + stat flavor text)
    └──requires──> [MetaStore: selected ship ID]

[Meta Shop Expansion: starting power-up slot]
    └──requires──> [MetaStore: starting power-up selection persisted]
    └──requires──> [Pre-run selection UI (power-up preview)]
    └──requires──> [All new power-ups unlocked in pool before this is meaningful]

[Meta Shop Expansion: difficulty unlocks]
    └──requires──> [MetaStore: difficulty unlock flags]
    └──requires──> [waveConfig: difficulty multiplier parameters]
    └──requires──> [Difficulty selection UI at run start]

[CRT Scanline Effect]
    └──requires──> [pmndrs/postprocessing ScanlineEffect already in EffectPass]
    └──requires──> [MetaStore: CRT preset unlock tier + current intensity]
    └──requires──> [Settings UI: intensity slider with live preview]
    └──conflicts with──> [barrel distortion on HUD layer] (avoid; apply only to game layer)

[CRT Unlock Tiers]
    └──requires──> [CRT Scanline Effect]
    └──requires──> [Meta shop purchase gating per tier]
```

### Dependency Notes

- **AudioContext requires user gesture before ANY sound plays:** The AudioContext must be created (or resumed) inside the first user interaction handler. Attempting to create it on page load results in a suspended context and silence. In this game, the title screen "Press Enter / Click to Start" button IS the gesture — create/resume AudioContext there.

- **Gamepad shares the InputManager interface:** The existing InputManager uses a `boolean[]` keymap polled each frame. Gamepad integration should translate gamepad button/axis state INTO the same keymap entries each frame, so all downstream systems (PlayerSystem, PauseSystem) need zero changes. Gamepad does NOT replace keyboard — both active simultaneously.

- **Beam lasers cannot use the bullet object pool:** Continuous beam lasers require a persistent mesh that exists while the power-up is active, not a pooled bullet that activates on fire. The beam mesh is attached to the player and scaled/repositioned each frame. Collision is a vertical AABB strip the width and height of the beam, checked once per fixed update tick. Charged burst is an instant-travel "flash" — a full-column quad that appears for 1-2 frames, does damage, then disappears.

- **Time slow requires a global timeScale:** The existing fixed-timestep loop uses a literal constant `1/60` delta. To implement time slow, this must become a mutable `timeScale` float (default 1.0) that multiplies the effective delta passed to all systems. Audio pitch shift maps to `AudioContext.playbackRate`. Particle systems, AI, bullets, enemies all scale automatically since they use the passed delta.

- **Ship skins do not conflict with InstancedMesh:** Enemies use InstancedMesh (multiple instances per type). The player ship is a single Three.js Mesh — no instancing. Skin changes swap the player's geometry and material directly. No instancing refactor needed.

- **CRT ScanlineEffect already exists in pmndrs/postprocessing:** `ScanlineEffect` has `density` (default ~1.25), `opacity` (default ~0.15), and `scrollSpeed` parameters. Adding it to the existing EffectPass (where BloomEffect lives) adds zero draw calls. The intensity slider maps directly to `opacity` uniform.

- **Starting power-up slot requires both meta shop purchase AND in-run choice:** Unlock the slot in meta shop (one-time cost). At run start, the pre-run selection screen shows available power-ups from the purchased pool. This is two separate features: slot unlock + power-up pool unlock. Don't conflate them.

---

## MVP Definition

### Launch With (v1.1)

The minimum cohesive v1.1 release — all categories must be present, even if minimal depth in each.

- [ ] Audio: BGM loop + minimum SFX coverage (shoot, enemy death, player hit, power-up pickup, wave start, boss phase, game over) — silent events after audio launch feel broken
- [ ] Audio: AudioContext unlock on first gesture + master mute toggle — without these, Chrome users hear nothing
- [ ] Gamepad: connect detection + left stick move + A = shoot + Start = pause + disconnect fallback to keyboard — minimum viable controller support
- [ ] Ship skins: 3 distinct shapes + 3 color variants per shape — shape variety is the actual differentiator; minimum 3 shapes reads as "selection"
- [ ] Piercing shot + homing missiles — two mechanically distinct bullet power-ups before adding laser types
- [ ] Continuous beam laser — the laser that ships with the most obvious "laser feel"; foundation for charged + sweeping
- [ ] Charged burst laser — distinct charge mechanic; paired with beam makes laser category feel complete
- [ ] Sweeping laser — rare power-up requiring the beam renderer; sweep angle should be wide enough to be satisfying
- [ ] Time slow — completes the non-laser power-ups; simple timeScale multiplier; high-impact game feel with minimal code
- [ ] Meta shop: extra lives (capped at 2) + starting power-up slot unlock + difficulty Hard unlock — these three expand the meta loop meaningfully
- [ ] CRT scanline: tier 1 unlock in meta shop + intensity slider in settings — at least one CRT preset must ship; the slider makes the feature usable

### Add After Validation (v1.1.x)

Add once v1.1 launch is confirmed stable and audio/gamepad issues are resolved.

- [ ] CRT tiers 2 and 3 with heavier curvature/chromatic aberration — add only if tier 1 usage in playtests is positive
- [ ] BGM dynamic intensity on boss phase — add after BGM loop is confirmed working cleanly
- [ ] Gamepad rumble — add after gamepad movement/fire is stable; test requires physical hardware
- [ ] Nightmare difficulty unlock — add after Hard mode balance is validated in playtest
- [ ] Alt ship stat flavors — add if meta shop purchase rate suggests players want more differentiation
- [ ] Sweeping laser: smart sweep direction weighting — base sweep ships first, smart weighting adds depth

### Future Consideration (v2+)

- [ ] Multiple BGM stems for dynamic music — significant audio production scope; defer until v1.1 audio is validated
- [ ] Full button remapping — low value relative to implementation complexity; hardcoded standard layout is sufficient for portfolio
- [ ] Touch/mobile — entirely separate control/UX redesign
- [ ] Online leaderboards — requires backend; out of scope for client-only portfolio piece
- [ ] Second campaign chapter with new enemy behaviors — scope for v2.0 milestone

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Audio: BGM loop + core SFX | HIGH | MEDIUM | P1 |
| AudioContext gesture unlock + master mute | HIGH | LOW | P1 |
| Gamepad: connect + move + shoot + pause | HIGH | MEDIUM | P1 |
| Ship skins: 3 shapes + color variants | HIGH | MEDIUM | P1 |
| Ship skin select UI (preview) | HIGH | LOW | P1 |
| Piercing shot power-up | HIGH | LOW | P1 |
| Homing missile power-up | HIGH | MEDIUM | P1 |
| Time slow power-up | HIGH | MEDIUM | P1 |
| Continuous beam laser | HIGH | HIGH | P1 |
| Charged burst laser | HIGH | HIGH | P1 |
| Sweeping laser | MEDIUM | HIGH | P1 |
| Meta shop: extra lives | HIGH | LOW | P1 |
| Meta shop: starting power-up slot | HIGH | MEDIUM | P1 |
| Meta shop: difficulty unlock (Hard) | MEDIUM | MEDIUM | P1 |
| CRT scanline effect (tier 1) + slider | MEDIUM | LOW | P1 |
| Gamepad rumble on player hit | MEDIUM | LOW | P2 |
| BGM dynamic intensity on boss | MEDIUM | MEDIUM | P2 |
| CRT tiers 2 and 3 | LOW | LOW | P2 |
| Meta shop: Nightmare difficulty | LOW | LOW | P2 |
| Sweeping laser: smart sweep direction | MEDIUM | HIGH | P2 |
| Audio: stereo panning on enemy fire | LOW | LOW | P3 |
| Full gamepad button remapping | LOW | HIGH | P3 |

**Priority key:**
- P1: Must ship in v1.1
- P2: Ship in v1.1 if time, else v1.1.x patch
- P3: v2+ consideration

---

## Complexity Notes by Feature Category

### Audio System (MEDIUM overall)

The hard part of browser game audio is not implementation — it is the AudioContext autoplay restriction and consistent looping. Implementation pattern:

1. Create AudioContext inside first user gesture handler (title screen click/keypress). Store as singleton.
2. Load BGM as ArrayBuffer via `fetch()` → `decodeAudioData()`. Set `AudioBufferSourceNode.loop = true`. Connect to a GainNode (master volume) → destination.
3. Load all SFX into an audio sprite (single MP3/OGG file). Parse the JSON timing manifest. On events, seek to sprite start time and play for sprite duration.
4. Rate-limit high-frequency SFX (fire events) to max 4/sec using a lastPlayed timestamp per SFX type. Without this, rapid fire creates 20 concurrent nodes.
5. Expose `masterVolume` (0.0–1.0) as a GainNode param. Persist in localStorage alongside MetaStore (separate key: `ssi-audio-prefs`).

**Howler.js vs raw Web Audio API:** Howler.js (7KB gzipped) handles cross-browser AudioContext resume, audio sprite playback, mobile quirks, and graceful HTML5 Audio fallback automatically. For this project's scope (one BGM + ~15 SFX), howler.js reduces implementation risk significantly. Recommend using it.

**Confidence: HIGH** (MDN + howler.js docs are authoritative and current)

### Gamepad Input (MEDIUM overall)

The Gamepad API is event-based for connection, polling-based for state. Implementation pattern:

1. Listen for `gamepadconnected` / `gamepaddisconnected` on `window`. Store the connected Gamepad object reference.
2. In the game loop (each fixed-timestep tick), call `navigator.getGamepads()` to get fresh state (API values are not live objects — must re-query each frame).
3. Apply deadzone to analog axes: `const x = Math.abs(raw) > 0.15 ? raw : 0`. Normalize post-deadzone to 0–1 range.
4. Translate gamepad state to the existing InputManager boolean keymap (same as keyboard): `if (axes[0] < -0.15) keys['ArrowLeft'] = true`. Player, pause, and all other systems use the same keymap without modification.
5. Standard layout (mapping === "standard") button indices: 0=A, 1=B, 2=X, 3=Y, 8=Select, 9=Start, 12=DPad-Up, 13=DPad-Down, 14=DPad-Left, 15=DPad-Right. Axes[0]=Left-X, Axes[1]=Left-Y.
6. Haptic: `gamepad.vibrationActuator?.playEffect('dual-rumble', { duration: 150, weakMagnitude: 0.3, strongMagnitude: 0.0 })`. Wrap in try/catch — not all gamepads support it. Firefox uses `hapticActuators[0]?.pulse(0.3, 150)`.

**Confidence: HIGH** (MDN Gamepad API is authoritative; standard layout is well-established)

### Ship Skins (MEDIUM overall)

Three.js material/geometry swapping on a single Mesh is straightforward. The design challenge is making 3–4 shapes visually distinct enough to feel like meaningful choice.

Implementation pattern:
1. Define ship shape variants as separate BufferGeometry instances (or simple THREE.Shape extrusions). Shapes should be named/flavored: e.g., Interceptor (sleek wing), Tank (wide body), Scout (small agile).
2. Color variants are `material.color.set(hexValue)` on the existing emissive material. Store in MetaStore as `selectedShipId` (string) and `selectedColorVariant` (hex).
3. At Player spawn, read MetaStore, apply the correct geometry and color. No runtime swapping during play (swapping geometry mid-run is not needed and adds complexity).
4. Meta shop preview: render a static CanvasTexture miniature for each option (or a dedicated Three.js preview scene rendered to a `canvas` element in the shop DOM overlay).

**Color variant caution:** The neon wave palettes change each wave. Any player ship color must remain readable against all palette backgrounds. High-luminance colors (white, bright yellow, bright cyan) work universally. Deep reds or deep blues may clash with certain wave palettes — test all combinations.

**Confidence: MEDIUM** (Three.js geometry/material swapping is well-documented; color palette compatibility requires playtesting)

### Laser Power-Ups (HIGH overall — the most technically complex v1.1 feature category)

Six power-ups: piercing, homing, time slow, continuous beam, charged burst, sweeping.

**Piercing shot (LOW complexity):** Standard bullet with a `piercing` flag. In CollisionSystem, on bullet-enemy intersection: deal damage, do NOT deactivate the bullet. Continue checking remaining enemies. Bullet deactivates after either (a) leaving the screen, or (b) hitting an enemy with a shield/armor tag if desired. Visually: tall narrow bullet (scaleY = 2.5x normal), bright white core, faint trail behind.

**Homing missile (MEDIUM complexity):** Each frame, find the nearest active enemy (or lowest-health enemy — design choice). Compute angle to target. Rotate velocity vector by `maxTurnRate * delta` toward target. `maxTurnRate` of ~120–180°/sec prevents orbiting while allowing meaningful guidance. Missile has a lifetime cap (e.g., 3 seconds) — if target evades or is destroyed, missile deactivates. Visually: elongated, exhaust particle trail (3–4 particle chain). Lock-on reticle on target.

**Time slow (MEDIUM complexity):** A `timeScale` float (default 1.0) is multiplied against the effective delta in the fixed-timestep loop. `timeScale = 0.35` during slow-mo. All systems using `delta` (movement, AI, weapons, particles) automatically slow. Audio: `audioContext.playbackRate` maps to timeScale (0.35 BGM speed during slow-mo). Visual: pmndrs ColorAverageEffect at low opacity (~0.4 desaturation) or a custom uniform-based vignette. Duration: 5–8 seconds per activation, then returns to 1.0 with a brief easing back.

**Continuous beam laser (HIGH complexity):** Unlike bullets, the beam is a persistent PlaneGeometry mesh parented to (or positioned above) the player, scaled to fill the vertical play area. While active:
- Beam mesh is `visible = true`, scaled to full column width (~0.2 world units) and height (play area height).
- CollisionSystem checks beam AABB (narrow strip) against all enemy AABBs each tick. Damage is continuous: `damagePerSecond * delta * timeScale`.
- Beam has a duration (e.g., 8–12 seconds) or can be "held" with fire button held (design choice).
- Visually: inner white line + outer colored glow (additive blend). Use emissiveIntensity animation (sine wave flicker at ~8Hz) for energy feel.
- Audio: distinct start sound → looping sustained hum → stop sound. Three separate audio events, not one shot.

**Charged burst laser (HIGH complexity):** Charge state machine in WeaponSystem:
- IDLE → (hold fire button) → CHARGING: ramp ship emissiveIntensity 1.0→4.0 over 1.5–2.0 seconds.
- CHARGING → (release fire button or max charge reached) → FIRING: instantaneous full-column beam flash.
- Beam flash is a wide PlaneGeometry (`scaleX = 2.0`, `scaleY = playAreaHeight`) that exists for 2–3 frames, does full damage to all enemies in column, then disappears.
- FIRING → COOLDOWN → IDLE.
- CollisionSystem: during FIRING frame, do one-shot column-vs-all-enemies check (not continuous).

**Sweeping laser (HIGH complexity):** A continuous beam that rotates. Extends the continuous beam implementation:
- Beam parent rotates about the player's position over the sweep arc (e.g., -60° to +60°, or full 180°).
- Sweep duration: 2–3 seconds for full arc.
- CollisionSystem: each tick, check the beam's current angle-bounded AABB (rotated rectangle) vs enemy AABBs. Continuous damage.
- Smart sweep direction (differentiator): before starting sweep, sample enemy density in left vs. right half of play area. Start sweep from low-density end, sweep toward high-density end. This makes the sweep feel responsive rather than random.
- Visually: same beam mesh as continuous laser, rotated via parent object rotation.

**Confidence: MEDIUM-HIGH** (Three.js mesh/collision patterns well-documented; specific laser mechanics require careful tuning for feel)

### Meta Shop Expansion (LOW-MEDIUM overall)

The MetaStore (Zustand persist) already handles schema migrations. Adding new fields is low-risk with the existing `SAVE_VERSION` migration system.

New MetaStore fields needed:
- `extraLives: number` (0–2, purchased per level)
- `startingPowerUpPool: string[]` (IDs of purchased power-up unlocks)
- `selectedStartingPowerUp: string | null`
- `difficultyUnlocks: { hard: boolean, nightmare: boolean }`
- `crtTierUnlocked: 0 | 1 | 2 | 3`
- `crtIntensity: number` (0.0–1.0 float)

Bump `SAVE_VERSION` and add `migrateSave()` case that sets these to their defaults when loading a v1.0 save. **Do not skip migration** — existing players have v1.0 saves.

**Extra lives:** RunState reads `metaStore.extraLives` at run start and adds to initial `lives` count. Hard cap 2. UI shows max 5 life icons (3 base + 2 purchased).

**Starting power-up slot:** At run start, a new screen (between ship select and wave 1) shows power-up options from `startingPowerUpPool`. Player picks one. Selected power-up is injected into wave 1 as an immediate pickup spawn. Alternatively: applied directly to WeaponSystem state. Simpler to apply directly.

**Difficulty selection:** Shown at run start if any difficulty is unlocked. Default = Normal. Flag passed into waveConfig multiplier system.

**Confidence: HIGH** (Zustand persist pattern is well-established in this codebase; schema migration pattern already used in v1.0)

### CRT Filter (LOW overall)

`ScanlineEffect` from pmndrs/postprocessing already has `density`, `opacity`, and `scrollSpeed` parameters. Adding it to the existing EffectPass (where BloomEffect lives) requires one line in the PostProcessor setup.

The slider is a DOM input element whose `input` event directly updates `effect.density` and `effect.opacity` uniforms — no scene rebuild, no restart. This works because pmndrs effects expose uniform references directly.

Unlock tiers correspond to preset parameter bundles:
- Tier 1 (Arcade 1983): `density: 1.2, opacity: 0.45, scrollSpeed: 0.03`
- Tier 2 (Consumer 1991): `density: 1.5, opacity: 0.65, scrollSpeed: 0.06`
- Tier 3 (High-Def 2003): `density: 2.0, opacity: 0.55, scrollSpeed: 0` (static lines, higher density)

Avoid barrel distortion / curvature on the game canvas — this distorts hitbox readability and introduces motion sickness risk. Scanlines + subtle chromatic aberration (ChromaticAberrationEffect from pmndrs, offset `new Vector2(0.002, 0)`) are sufficient for CRT feel.

**Confidence: HIGH** (ScanlineEffect API is documented in pmndrs/postprocessing; intensity tuning confirmed via search)

---

## Competitor Feature Analysis

| Feature | Steredenn (shmup, expandable laser) | Beat Invaders (Space Invaders roguelite) | Our v1.1 Approach |
|---------|-------------------------------------|------------------------------------------|-------------------|
| Laser weapons | Expandable/upgradeable laser as core weapon | No laser distinction | 3 distinct laser types (beam, charged, sweep); each feels mechanically different |
| Audio | Full SFX + synthwave soundtrack | Rhythm-tied soundtrack | Single looping synthwave BGM + full SFX via audio sprites (howler.js) |
| Gamepad | Full gamepad support | Unknown | Standard layout: left stick move, A shoot, Start pause; haptic on hit |
| Ship variety | Multiple ships with different stats | Not present | 3–4 shapes + color variants; flavor text differentiation; stat-neutral |
| Meta shop depth | Weapon upgrade shop between runs | Basic ship upgrades | Extra lives + starting power-up + difficulty tiers + CRT cosmetics |
| Visual filters | No CRT effect | No CRT effect | Unlockable CRT presets with real-time intensity slider |
| Time manipulation | No time slow | No time slow | Time slow power-up with whole-world visual treatment + audio pitch shift |

---

## Sources

- [MDN: Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) — AudioContext patterns, audio sprite approach, mobile pitfalls. HIGH confidence.
- [MDN: Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — Autoplay policy, user gesture requirements. HIGH confidence.
- [MDN: Implementing Gamepad Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Controls_Gamepad_API) — Polling pattern, button mapping, deadzone handling. HIGH confidence.
- [MDN: Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) — Standard layout button indices, axes normalization. HIGH confidence.
- [Chrome Developers: Autoplay Policy](https://developer.chrome.com/blog/autoplay) — Chrome-specific AudioContext suspension behavior. HIGH confidence.
- [pmndrs/postprocessing GitHub: ScanlineEffect](https://github.com/pmndrs/postprocessing) — density/opacity/scrollSpeed parameters. HIGH confidence.
- [howler.js](https://howlerjs.com/) — Audio sprite support, cross-browser AudioContext resume, 7KB gzipped. HIGH confidence.
- [Shmup Design Part 2 — SLYNYRD](https://www.slynyrd.com/blog/2021/2/15/pixelblog-32-shmup-design-part-2) — Laser weapon design philosophy (narrow area, high power, slow fire rate compensation). MEDIUM confidence.
- [Steredenn: Making an Expandable Laser](https://steredenn-game.tumblr.com/post/98397504410/steredenn-making-an-expandable-laser) — Laser beam implementation approach in 2D shooter. MEDIUM confidence.
- [WebGL CRT Shader (gingerbeardman)](https://blog.gingerbeardman.com/2026/01/04/webgl-crt-shader/) — Current-as-of Jan 2026 CRT shader patterns. MEDIUM confidence.
- [RetroZone: CRT/Scanline Effects (Phaser 2026)](https://phaser.io/news/2026/03/retrozone-open-source-retro-display-engine-phaser) — RetroZone engine confirms Three.js CRT compatibility pattern (any canvas). MEDIUM confidence.
- [ResetEra: Meta Progression Roguelites](https://www.resetera.com/threads/do-you-like-meta-progression-in-your-roguelikes-roguelites.1341955/) — Community consensus on extra lives caps and stat inflation concerns. LOW confidence (community, not academic).
- [W3C Gamepad Specification](https://www.w3.org/TR/gamepad/) — Standard layout index definition. HIGH confidence.

---

*Feature research for: v1.1 additions to Super Space Invaders X (audio, gamepad, skins, laser power-ups, meta shop expansion, CRT filters)*
*Researched: 2026-03-06*
