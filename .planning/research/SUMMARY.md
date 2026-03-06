# Project Research Summary

**Project:** Super Space Invaders X v1.1
**Domain:** Browser-based arcade space shooter — Three.js/WebGL with roguelite meta-progression (v1.1 feature additions)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Super Space Invaders X v1.1 adds six feature categories to a fully-working v1.0 codebase: audio, gamepad input, ship skins, new laser power-ups, meta shop expansion, and CRT post-processing. The research is unusually clean because the existing stack is production-validated and the v1.1 additions slot into existing architecture without requiring foundational changes. Only two new npm packages are needed (howler@2.2.4 + @types/howler@2.2.12); everything else — CRT scanlines, gamepad TypeScript types, particle effects — already exists in the installed dependencies. The architectural approach is purely additive and dependency-ordered: MetaStore schema v4 migration gates skins, difficulty unlocks, and CRT features, so it must be completed first.

The recommended build order is: MetaStore v4 schema first, then low-coupling features (audio, gamepad) that wire into existing system boundaries via setter injection and input set synthesis, then isolated visual features (skins, CRT), then ballistic power-up modifiers (additive changes to existing systems), then beam weapons (new BeamSystem + BeamEffect pair — the most technically complex feature category), and finally the meta shop UI expansion that aggregates all prior work. Three laser types — continuous beam, charged burst, sweeping laser — require a dedicated phase because they cannot use the bullet pool model and introduce a new damage domain that does not fit CollisionSystem's existing bullet loop.

The primary risk category is subtle silent failures that pass automated testing and only appear in specific runtime conditions. AudioContext autoplay suspension silently drops all audio without any error (only manifests in a fresh browser tab on Chrome). Zustand field hydration silently produces `undefined` without a schema version bump (only manifests when loading a v3 save file). Gamepad axes produce constant drift without a radial deadzone (only manifests on consumer hardware with loose sticks). The mitigation is explicit "looks done but isn't" checklists per phase — each phase has specific verification conditions that must be confirmed before proceeding.

## Key Findings

### Recommended Stack

The v1.1 stack adds exactly two packages to the existing production stack. Howler.js (2.2.4) handles all audio via a 7KB library that wraps AudioContext lifecycle, audio sprite scheduling, and cross-browser quirks — the alternative (raw Web Audio API) requires 200+ lines of boilerplate for the same result. The Web Gamepad API requires no npm install; TypeScript types are already available via `lib.dom.d.ts` because the project's tsconfig already includes `"lib": ["ESNext", "DOM"]`. CRT scanline effects (ScanlineEffect, VignetteEffect, ChromaticAberrationEffect) are all already exported from the installed pmndrs/postprocessing@6.38.3 — zero new install cost.

**Core technologies (v1.1 additions only):**
- **howler@2.2.4**: BGM loop + all SFX playback — 7KB gzipped; handles AudioContext unlock, audio sprite scheduling, cross-browser quirks automatically; zero dependencies
- **@types/howler@2.2.12**: TypeScript types for howler — dev dependency only, no runtime cost
- **Web Gamepad API (built-in browser standard)**: Controller input — zero install; poll via `navigator.getGamepads()` in the fixed-timestep loop; `Gamepad` and `GamepadButton` types already in `lib.dom.d.ts`
- **ScanlineEffect / VignetteEffect / ChromaticAberrationEffect (pmndrs/postprocessing@6.38.3)**: CRT post-processing — already installed; add to existing EffectPass at zero additional draw-call cost
- **three.quarks@0.17.0 (already installed)**: New power-up particle trails — extend existing ParticleManager configs; no new dependency

**What not to add:** Tone.js (100KB synthesis framework — overkill for playback), gamecontroller.js (unnecessary abstraction over already-normalized Standard Gamepad API), any second EffectPass for CRT blended with bloom in the same pass (see Pitfall 6 below), any physics engine for homing missiles (atan2-based steering is 10 lines).

### Expected Features

The feature research establishes a clear MVP boundary for v1.1 launch. Every major category must be present at minimum depth — missing a full category (e.g., no audio at all, no skins at all) is worse than having all categories at shallow depth.

**Must have (table stakes):**
- Audio: BGM loop + core SFX coverage (shoot, enemy death, player hit, power-up pickup, wave start, boss phase, game over) — silence on any key event reads as broken after audio is in scope
- Audio: AudioContext unlock on first gesture + master mute toggle — Chrome requires gesture; no mute means no way to silence
- Gamepad: connect detection + left stick move + A=shoot + Start=pause + disconnect fallback to keyboard — minimum viable controller support
- Ship skins: 3 distinct geometry shapes + 3-4 color variants per shape — shape variety is the actual differentiator; color-only variants feel cosmetically shallow
- All 6 power-ups: piercing shot, homing missile, time slow, continuous beam, charged burst, sweeping laser — all must ship in v1.1
- Meta shop: extra lives (hard cap 2) + starting power-up slot unlock + difficulty Hard unlock
- CRT scanline: tier 1 unlock in meta shop + real-time intensity slider — at least one preset; slider makes it usable

**Should have (competitive differentiators for v1.1):**
- Gamepad rumble on player hit — 150ms haptic feedback (GamepadHapticActuator) punches above its implementation cost
- BGM dynamic intensity on boss phase — subtle filter cutoff modulation during boss transitions
- Per-weapon SFX with distinct tonal identity — each weapon sounds like itself without reading tooltips
- Homing missile lock-on reticle — communicates the mechanic passively without UI text
- Time slow: whole-world visual treatment — desaturation effect + audio cue signals the game state, not just a slowdown
- CRT tiers 2 and 3 with heavier chromatic aberration
- Sweeping laser: smart sweep direction weighted toward highest enemy density cluster

**Defer (v1.1.x patch / v2+):**
- Multiple BGM tracks or stems for dynamic music — significant audio production scope; ship one great loop first
- Full gamepad button remapping UI — low value relative to implementation complexity; hardcoded Standard layout is sufficient
- Touch/mobile controls — entirely separate UX redesign
- Online leaderboards — requires backend; out of scope for client-only portfolio piece

**Anti-features to avoid:**
- Barrel distortion/screen curvature on game canvas — distorts hitbox readability and introduces motion sickness risk; scanlines + chromatic aberration are sufficient CRT feel
- Power-up stacking (all three active simultaneously) — implement override-on-pickup instead; visual chaos from combined effects undermines readability
- Homing missiles that never miss — turn-rate cap + lifetime limit preserves skill expression and prevents trivial kills
- Analog aim with right stick — breaks Space Invaders game design; left stick X for horizontal movement only, fire always upward

### Architecture Approach

The v1.1 architecture is purely additive to the existing ECS-like layered design. Six integration points cover all six feature categories: AudioManager (new singleton, setter-injected into systems that need to trigger SFX), InputManager extension (gamepad synthesized into existing `heldKeys`/`justPressedKeys` sets so all consumers get gamepad support without modification), Player geometry/material swap in-place (preserves bloom selection registration on the same Mesh object), BloomEffect extended with `addCRTEffect()` method that adds a second EffectPass, MetaStore schema v4 with migration block, and a new BeamSystem+BeamEffect pair that owns laser rendering and damage outside the CollisionSystem bullet loop.

**Major components (v1.1 additions):**
1. **AudioManager** (`src/audio/AudioManager.ts`, NEW) — Web Audio API singleton; BGM loop + SFX sprite map; initialized lazily on first user gesture; injected via setter into WeaponSystem, CollisionSystem, PowerUpManager, ShopSystem
2. **InputManager** (MODIFY only) — `updateGamepad()` synthesizes gamepad axis/button state into existing `heldKeys`/`justPressedKeys` sets; all consumers (WeaponSystem, PlayingState, TitleState, ShopUI) unchanged
3. **BeamSystem + BeamEffect** (`src/systems/BeamSystem.ts` + `src/entities/BeamEffect.ts`, both NEW) — owns all three laser weapon types; persistent PlaneGeometry mesh with `scale.y = beamLength`; strip AABB damage collision separate from CollisionSystem's bullet loop
4. **CRTEffect** (`src/effects/CRTEffect.ts`, NEW) — pmndrs/postprocessing Effect subclass; added in a second EffectPass AFTER the bloom EffectPass (not the same pass — see Pitfall 6)
5. **MetaStore v4** (MODIFY) — schema bump with migration block; new fields: activeShipSkin, activeShipColor, activeDifficulty, crtIntensity
6. **RunState** (MODIFY) — add `timeScale: number = 1.0`; AISystem and MovementSystem (enemies) multiply dt by timeScale; player movement uses raw dt

**Key patterns:**
- Setter injection for optional collaborators (AudioManager wired after construction, not in constructors)
- Gamepad synthesized into existing input sets (not a parallel API — no `isGamepadDown()` method)
- Geometry swap in-place on player Mesh (dispose old, assign new — Mesh object reference stays constant)
- BeamSystem as self-contained damage domain (never route beam damage through CollisionSystem)
- Separate EffectPass per post-processing stage (bloom pass then CRT pass — do not merge into one)

**Dependency-ordered build sequence:**
1. MetaStore v4 schema + migration (prerequisite for skins, difficulty, CRT gating)
2. AudioManager (standalone, no feature dependencies)
3. Gamepad input extension to InputManager (no feature dependencies)
4. Ship skins (requires MetaStore v4)
5. CRTEffect (requires MetaStore v4 for intensity field)
6. Power-up type extensions: piercing, homing, time slow (additive to existing systems)
7. Meta shop UI expansion (requires MetaStore v4, new upgrade IDs from steps 4-6)
8. BeamSystem + BeamEffect (requires extended power-up type registry from step 6)

### Critical Pitfalls

1. **AudioContext created at startup — always suspended in Chrome** — Create AudioContext lazily inside the first user-gesture handler (`TitleState` "press any key" flow). Never instantiate in Game constructor or module init. All `playSfx` calls null-check `_ready` and silently no-op until init runs. Verification: fresh incognito tab — BGM plays after first keypress, not before.

2. **Zustand MetaStore new fields hydrate as `undefined` without version bump** — For every new persistent field in v1.1: bump `SAVE_VERSION` to 4, add `version < 4` migration block setting all new fields to defaults. Test by pasting v3 JSON into localStorage key, refreshing, and verifying v1.0 data intact + new fields at defaults. Never assume Zustand's shallow merge handles new fields correctly without a version bump.

3. **BGM loop gap — audible click at loop boundary** — Author BGM as WAV (no encoder padding) or set `AudioBufferSourceNode.loopStart`/`loopEnd` to trim MP3/OGG encoder silence. Verification: 3+ full loop cycles in Chrome and Firefox — no audible click or stutter.

4. **Gamepad axis drift without radial deadzone — constant phantom movement** — Apply radial deadzone of 0.12 in InputManager at the axis read site, not in MovementSystem. Radial (not axial per-axis) deadzone avoids diagonal dead corridors that feel wrong. Verification: controller at rest for 10 seconds — ship stationary.

5. **Gamepad buttons not visible until first hardware button press** — `navigator.getGamepads()` returns empty entries until user presses a button (browser privacy protection). Listen for `gamepadconnected` event to detect activation, then begin polling. Show "press any button on controller to connect" prompt on title screen. Verification: fresh browser profile, plug in controller, verify input only works after first button press, not before.

6. **CRT ScanlineEffect in same EffectPass as SelectiveBloomEffect — bloom disappears** — Keep SelectiveBloomEffect in its own dedicated EffectPass. Add ScanlineEffect and other CRT effects in a subsequent EffectPass after bloom resolves. Merging them in one pass causes ordering conflicts where CRT processes un-bloomed pixel data. Verification: CRT at max intensity + bloom both active simultaneously — neon elements still glow correctly.

7. **Beam laser creating new geometry each frame — GC pressure** — Implement beams as a singleton Mesh with fixed PlaneGeometry (1 unit tall); update `mesh.scale.y = beamLength` each frame. Never create new PlaneGeometry inside the update loop. Verification: `renderer.info.memory.geometries` does not increase during 30 seconds of continuous beam fire.

8. **Time slow applied globally to all systems — slows player ship** — Apply `timeScale` multiplier per-system selectively. AISystem and MovementSystem (enemies only) receive `dt * runState.timeScale`. Player MovementSystem receives raw `dt`. Particles receive raw `dt`. Verification: player ship moves at full speed inside the time slow window; enemies visibly slower.

9. **Homing missile rotation requiring the shared bullet InstancedMesh to be restructured** — Give homing missiles their own dedicated small InstancedMesh (max 10 instances). The shared player bullet InstancedMesh never stores rotation (bullets are always vertical). Use a pre-allocated `dummy: THREE.Object3D` at class level for matrix composition — never create it inside the update loop. Verification: homing missile visibly rotates to track a laterally-moving enemy.

10. **Non-standard gamepad controllers (Firefox + PS5 DualSense) silent failure** — Always check `gamepad.mapping === 'standard'` before using button index assumptions. Firefox has a confirmed DualSense mapping bug (Bugzilla #1922925). Show a "controller may not be fully supported" warning rather than silently failing. Verification: PS5 controller in Firefox — warning displays rather than silent wrong bindings.

## Implications for Roadmap

Based on research, suggested phase structure for v1.1 (6 phases):

### Phase 1: Foundation — MetaStore v4 + Audio System
**Rationale:** MetaStore v4 migration is the prerequisite for ship skins, difficulty unlocks, and CRT gating — all read new persistent fields. Audio is the highest-visibility v1.1 addition and has no feature dependencies beyond the first-user-gesture pattern established here. Both are foundational; building either later introduces rework risk.
**Delivers:** Persistent save compatibility for v1.0 → v1.1 upgrade, BGM loop with seamless looping, full SFX coverage on all combat events, master mute toggle, audio volume persisted in localStorage.
**Addresses:** Table stakes audio (BGM loop, SFX, AudioContext unlock, volume control), MetaStore schema v4 with migration block for all new fields.
**Avoids:** AudioContext autoplay suspension (Pitfall 1), BGM loop gap (Pitfall 3), Zustand undefined fields on v1.0 save load (Pitfall 2).
**Research flag:** Standard patterns — AudioContext lifecycle is well-documented via MDN + Chrome Developer docs; Zustand migration pattern already used in v1.0. Skip phase research.

### Phase 2: Input Expansion — Gamepad Support
**Rationale:** Gamepad changes only InputManager.ts; all existing consumers get gamepad support for free via the synthesize-into-existing-sets pattern. Low-risk, isolated, high user-visible impact. Once a controller is plugged in, players expect it to work.
**Delivers:** Left stick movement with radial deadzone, A=shoot, Start=pause, D-pad menu navigation, connect/disconnect notification toast, standard mapping check with warning for unsupported controllers, keyboard + gamepad active simultaneously.
**Addresses:** Gamepad connect/disconnect notification, analog movement, basic button mapping, "press any button to connect" prompt.
**Avoids:** Gamepad axis drift (Pitfall 4), first-button-press detection requirement (Pitfall 5), non-standard controller silent failure (Pitfall 10).
**Research flag:** Standard patterns — Web Gamepad API is an authoritative MDN/W3C-documented spec with stable Standard layout. Skip phase research.

### Phase 3: Visual Customization — Ship Skins + CRT Post-Processing
**Rationale:** Both features require MetaStore v4 (Phase 1 prerequisite) and are isolated visual changes with no gameplay logic dependencies on each other. Grouping them avoids a tiny phase for each cosmetic system. CRT must be validated early enough that intensity tuning can be iterated on without being blocked by other features.
**Delivers:** 3 ship geometry shapes + 4 color variants purchasable in meta shop; skin persists across runs and applies at PlayingState.enter(); CRTEffect as pmndrs Effect subclass in a separate EffectPass after bloom; tier 1 CRT unlock in meta shop; real-time intensity slider in settings.
**Addresses:** Ship skin shapes with preview in selection UI, CRT visible at default intensity, CRT intensity real-time preview, meta shop named CRT presets (Arcade 1983 / Consumer 1991).
**Avoids:** Replacing player.mesh object (breaks bloom selection — use geometry dispose + reassign), CRT in wrong EffectPass (Pitfall 6 — separate passes for bloom and CRT), ship geometry creation mid-run (pre-create all skins at startup, swap reference only).
**Research flag:** Standard patterns — Three.js geometry swap in-place and pmndrs Effect subclass both documented officially. Skip phase research.

### Phase 4: Power-Ups Category A — Ballistic Modifiers (Piercing, Homing, Time Slow)
**Rationale:** Three power-ups that extend the existing PowerUpType union with additive changes to Bullet, WeaponSystem, MovementSystem, and CollisionSystem. Lower complexity than beam weapons; establishes the power-up expansion pattern before the harder beam phase. Time slow requires RunState.timeScale; piercing requires CollisionSystem bullet-skip logic; homing requires per-bullet steering in MovementSystem.
**Delivers:** Piercing shot (penetrates enemies, elongated visual trail, scaleY = 2.5x), homing missile with dedicated InstancedMesh and lock-on reticle on nearest enemy, time slow (runState.timeScale = 0.3 on enemies only) with visual desaturation treatment.
**Addresses:** Piercing visual trail, homing lock-on reticle, time slow whole-world visual treatment, between-wave shop item pool expansion.
**Avoids:** Time slow slowing player ship (Pitfall 8 — per-system timeScale application), homing missile rotation in shared bullet InstancedMesh (Pitfall 9 — dedicated small InstancedMesh), homing missiles that never miss (turn-rate cap + lifetime limit).
**Research flag:** Homing missile turn-rate tuning and time-slow per-system timeScale split have multiple valid implementations. Consider light phase research on atan2 steering values and timeScale split architecture before locking implementation.

### Phase 5: Power-Ups Category B — Beam Weapons (Continuous, Charged, Sweeping Laser)
**Rationale:** Beam weapons cannot use the bullet pool — they are persistent meshes with area damage at intervals, fundamentally different collision semantics. A new BeamSystem + BeamEffect pair owns all three laser types. Building Category A first (Phase 4) establishes the extended power-up type registry and shop item patterns that beam weapons depend on.
**Delivers:** Continuous beam laser (PlaneGeometry singleton, scale.y = hit distance, damage every 0.1s, bloom-registered), charged burst (ship emissive ramp 1.0→4.0 over charge duration, instant full-column flash on release), sweeping laser (rotating beam parent, arc over 2-3 seconds, optional smart sweep direction).
**Addresses:** Laser power-ups feel meaningfully different from bullet weapons, charged burst telegraphed charge animation (emissive glow ramp), sweeping laser wide arc satisfaction.
**Avoids:** Beam geometry allocation per frame (Pitfall 7 — scale.y on fixed geometry only, no new PlaneGeometry in update loop), routing beam damage through CollisionSystem (BeamSystem owns its own strip AABB check), beam mesh missing from bloom selection (register at BeamEffect construction).
**Research flag:** Charged burst state machine (IDLE → CHARGING → FIRING → COOLDOWN), sweeping laser rotation collision model (rotated rectangle vs strip AABB), and smart sweep direction density sampling are non-trivial. Run phase research before planning execution.

### Phase 6: Meta Shop Expansion + Run Start Flow
**Rationale:** Meta shop expansion ties together all previous phases — it surfaces extra lives, starting power-up slot, difficulty unlocks, and CRT tiers in a coherent purchase flow. The starting power-up pre-run selection screen requires the power-up pool from Phases 4-5 to be meaningful. Build last because all items must exist before the UI aggregates them.
**Delivers:** Extra lives (capped at 2) purchasable in meta shop; starting power-up slot unlock with pre-run selection screen (default skip allowed — do not require selection); difficulty Hard unlock gating waveConfig multipliers (Hard: +20% enemy speed, +1 enemy per wave, Sniper archetype earlier); CRT tiers 2 and 3; meta shop UI reorganized into categories (Weapons, Ships, Upgrades, Visual) for 10-second glance test navigation.
**Addresses:** Meta shop overwhelming with 40+ flat items (category tabs), extra lives feel required not optional (tune base difficulty for fresh-player wave-5+ without any unlocks), starting power-up default to no selection.
**Avoids:** Extra lives stacking to 10+ (hard cap 2), meta shop 40+ flat items overwhelming (tab/category navigation), starting power-up selection blocking run start.
**Research flag:** Standard patterns — Zustand persist additive upgrade IDs and MetaShopUI extension follow established v1.0 patterns. Skip phase research.

### Phase Ordering Rationale

- MetaStore v4 must be first because three features (skins, CRT gating, difficulty selection) read new persistent fields. Undefined fields cause runtime crashes, not compile errors, and only manifest on save files from players who played v1.0.
- Audio and gamepad have no feature dependencies and can be done in either order, but audio is higher user-visible impact and grouped with MetaStore v4 to make Phase 1 high-value.
- Visual customization (Phase 3) groups two cosmetic systems that share the MetaStore v4 dependency and have zero gameplay logic dependencies on each other or on power-ups.
- Power-ups split by complexity tier: ballistic modifiers (additive to existing systems, lower risk) before beam weapons (new system pair, higher risk). This avoids tackling the hardest feature before the power-up architecture patterns are established.
- Meta shop UI expansion runs last because it aggregates items from all prior phases. Building the UI before the items exist creates partial states and revision churn.

### Research Flags

Needs deeper research during planning:
- **Phase 4 (Homing + Time Slow):** Homing missile turn-rate tuning (120°/sec vs 180°/sec), atan2 rotation offset value (`- Math.PI/2` for upward-facing), and per-system timeScale split have multiple valid implementations with different tradeoffs. Research before planning execution.
- **Phase 5 (Beam Weapons):** Charged burst state machine transitions, sweeping laser rotation collision model, and smart sweep direction density sampling are non-trivial. This is the highest-complexity phase in v1.1. Run `/gsd:research-phase` before planning.

Standard patterns (skip phase research):
- **Phase 1 (Audio + MetaStore):** Web Audio API + Zustand migration both documented from authoritative sources; howler.js API is simple and well-documented; v1.0 migration pattern already implemented in codebase.
- **Phase 2 (Gamepad):** Web Gamepad API is a W3C specification with comprehensive MDN documentation; Standard Gamepad layout is stable across Xbox, PS, and Switch Pro controllers in Chrome.
- **Phase 3 (Skins + CRT):** Three.js geometry swap in-place is documented in official Three.js docs; pmndrs Effect subclass pattern is in the official postprocessing wiki with code examples.
- **Phase 6 (Meta Shop UI):** Purely additive to existing MetaShopUI and MetaStore patterns established in v1.0; no new architectural patterns required.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Two new packages (howler + types) version-verified via npm. Everything else already installed. Gamepad types confirmed present in existing tsconfig lib. CRT effects confirmed exported from installed postprocessing version. |
| Features | HIGH for patterns, MEDIUM for balance | Table stakes from MDN/Chrome official docs (audio, gamepad). Power-up feel and shop economy tuning are MEDIUM — requires playtest iteration; ship conservative values and tune up. |
| Architecture | HIGH | Based on direct codebase reading of all modified files. Integration patterns are additive and follow established v1.0 patterns already used in production. BeamSystem pattern validated against pmndrs postprocessing wiki. |
| Pitfalls | HIGH | Critical pitfalls (AudioContext, Zustand migration, bloom pass ordering) sourced from official Chrome Developers, MDN, and pmndrs docs. Firefox DualSense bug confirmed via official Mozilla Bugzilla. Beam/homing pitfalls from Three.js official docs + Three.js forum. |

**Overall confidence:** HIGH

### Gaps to Address

- **CRT pass ordering conflict between ARCHITECTURE.md and PITFALLS.md:** ARCHITECTURE.md describes adding CRT to the same EffectPass as bloom (for performance); PITFALLS.md recommends separate EffectPass (for correct visual output). These conflict. The PITFALLS recommendation (separate passes) is safer and should be treated as authoritative — validate during Phase 3 with an explicit "CRT max + bloom active simultaneously — neon elements still glow" test. Accept the minor performance cost of one additional render operation.
- **Homing missile turn-rate value:** Research recommends 120–180°/sec but notes this requires tuning. Ship conservative (120°/sec) and tune upward based on playtest feel during Phase 4.
- **Audio asset production scope:** Research documents how to integrate audio but does not include the audio assets themselves (BGM synthwave loop file, SFX sprite file + JSON manifest). These must be sourced or produced before Phase 1 can ship. This is a dependency outside the code implementation — flag it as a blocker for Phase 1 planning.
- **Sweeping laser smart sweep direction:** FEATURES.md lists this as a HIGH-complexity differentiator that is also a valid v1.1.x patch candidate. Ship base sweep first (Phase 5); add density weighting only if base sweep gameplay warrants the additional implementation cost.
- **SFX rate-limiting thresholds:** FEATURES.md recommends max 4 SFX triggers/sec for high-frequency events (rapid fire). The specific threshold requires playtest feedback to determine where concurrent AudioBufferSourceNodes become audible as distortion. Set 4/sec initially and tune.

## Sources

### Primary (HIGH confidence)
- MDN Web Audio API, AudioContext autoplay policy, AudioBufferSourceNode.loop — AudioContext lifecycle and BGM loop patterns
- MDN Gamepad API, W3C Gamepad Specification — Standard layout mapping, polling pattern, deadzone requirement
- Chrome Developers: Web Audio Autoplay Policy — Chrome-specific AudioContext suspension behavior
- pmndrs/postprocessing GitHub and ScanlineEffect official docs — Effect composition, EffectPass merging, density/opacity parameters
- Zustand persist official docs — schema migration pattern, version bump requirement
- Three.js docs: InstancedMesh.setMatrixAt, BlendFunction — homing rotation matrix, beam additive blending
- Direct codebase reading: Game.ts, InputManager.ts, WeaponSystem.ts, CollisionSystem.ts, BloomEffect.ts, Player.ts, MetaState.ts, ShopSystem.ts, PlayingState.ts — first-party verification of integration points
- Mozilla Bugzilla #1922925 — PS5 DualSense mapping bug in Firefox confirmed open as of early 2026
- pmndrs/postprocessing Custom Effects wiki — Effect subclass pattern, `mainImage` GLSL signature

### Secondary (MEDIUM confidence)
- Gaffer on Games: Fix Your Timestep — fixed-timestep timeScale theory (canonical; per-system timeScale split is an inference from this pattern)
- TresJS ScanlinePmndrs guide — density/opacity parameter confirmation (wrapper library, not core pmndrs lib)
- Three.js forum: InstancedMesh rotation, geometry swap for regular Mesh — community-confirmed patterns consistent with official docs
- gamepadtester.pro: deadzone radial vs axial guide (2026) — 0.12 deadzone threshold recommendation
- howler.js npm registry: 700K weekly downloads, March 2024 last release — still dominant browser game audio library

### Tertiary (LOW confidence)
- ResetEra: Meta progression roguelite community thread — extra lives cap community consensus; needs playtest validation for this specific game's balance
- Slynyrd: Shmup laser design philosophy — laser feel principles; subjective; requires tuning against playtester feedback
- Steredenn dev blog: Expandable laser implementation — beam approach from a different engine (2D Unity); useful for philosophy, not direct code patterns

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
