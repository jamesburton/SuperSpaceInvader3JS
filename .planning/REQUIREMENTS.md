# Requirements: Super Space Invaders X

**Defined:** 2026-03-02
**Core Value:** The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.

---

## v1 Requirements

### Engine & Performance (ENG)

- [x] **ENG-01**: Game renders at stable 60fps using Three.js/WebGL with OrthographicCamera
- [x] **ENG-02**: Fixed-timestep accumulator game loop prevents bullet tunneling and FPS-dependent movement
- [x] **ENG-03**: Object pooling system pre-allocates enemies, bullets, and particle effects (no runtime GC spikes)
- [x] **ENG-04**: InstancedMesh rendering for enemy groups batches draw calls (target: under 100 draw calls per frame)
- [x] **ENG-05**: Three.js geometry and materials explicitly disposed on scene teardown (no VRAM leaks)

### Core Gameplay (CORE)

- [x] **CORE-01**: Player can move ship horizontally across full screen width using keyboard (arrows / WASD)
- [x] **CORE-02**: Player can fire projectiles with spacebar; input response is under 100ms
- [x] **CORE-03**: Player projectiles collide with and destroy enemy ships using AABB collision detection
- [x] **CORE-04**: Enemy projectiles collide with and damage the player ship
- [x] **CORE-05**: Player ship has a lives system displayed as a HUD counter
- [x] **CORE-06**: Player ship flashes and receives 1-2 seconds of invincibility frames after taking damage
- [x] **CORE-07**: All lives exhausted triggers game over state and shows run summary screen
- [x] **CORE-08**: Game can be paused and resumed with ESC or P key; pause shows overlay menu
- [x] **CORE-09**: Live score increments on enemy kill and is displayed on HUD
- [x] **CORE-10**: Current wave number is visible on HUD at all times during play
- [x] **CORE-11**: Game over screen shows: final score, wave reached, and enemies killed

### Game Feel (FEEL)

- [ ] **FEEL-01**: Screen shake triggers on hit events (boss impact = large shake; standard hit = small shake; never obscures readability)
- [ ] **FEEL-02**: Particle burst fires on enemy death, color-matched to the enemy's type palette
- [ ] **FEEL-03**: Muzzle flash particle effect plays at barrel position on every player shot fired
- [ ] **FEEL-04**: Power-up pickup triggers visual swell effect and brief text display of power-up name
- [ ] **FEEL-05**: Wave transition displays "Wave X" with 2-3 seconds of breathing room before enemies spawn
- [ ] **FEEL-06**: Boss health bar is segmented with visible phase indicator boundaries
- [x] **FEEL-07**: Player projectile visually distinguishes weapon type via emissive color (spread = blue, rapid = orange, etc.)

### Enemy System (ENEMY)

- [ ] **ENEMY-01**: Grunt enemy type moves in formation grid and fires basic projectiles at random intervals
- [ ] **ENEMY-02**: Shielder enemy type has a destructible front shield that must be destroyed before the enemy can be killed
- [ ] **ENEMY-03**: Flanker enemy type detects player position and breaks formation to charge laterally
- [ ] **ENEMY-04**: Sniper enemy type maintains distance at rear of formation and fires targeted precision shots at player
- [ ] **ENEMY-05**: Charger enemy type triggers a direct dive at the player when its health drops below a threshold
- [ ] **ENEMY-06**: Swooper enemy type dives in a swooping chain pattern (leader-follower formation arc)
- [ ] **ENEMY-07**: Each enemy type has a visually distinct design (unique shape, size, and neon color identity)
- [ ] **ENEMY-08**: Enemies spawn in grid-based formations that can break into dynamic individual behavior mid-wave
- [ ] **ENEMY-09**: Wave escalation increases enemy count, movement speed, and firing rate across waves
- [ ] **ENEMY-10**: Enemy formation-breaking behavior is triggered by conditions (player position, health threshold, wave timer)

### Visual & Aesthetic (VIS)

- [x] **VIS-01**: Neon Tokyo cyberpunk aesthetic with glowing emissive materials on all enemy and player sprites
- [x] **VIS-02**: Each wave is assigned a distinct neon color palette; enemy materials update per wave
- [x] **VIS-03**: Selective bloom post-processing (pmndrs/postprocessing) applied to neon elements; non-emissive elements excluded
- [ ] **VIS-04**: Particle explosion system fires per-enemy-type burst profiles with matching colors on kill
- [ ] **VIS-05**: Player ship displays an engine trail particle effect during horizontal movement

### Power-Ups (PWR)

- [ ] **PWR-01**: Spread shot power-up drops from enemy kills at a chance rate; fires 3-way spread
- [ ] **PWR-02**: Rapid fire power-up drops from enemy kills; significantly increases fire rate for duration
- [ ] **PWR-03**: Shield power-up drops from enemy kills; absorbs one hit before expiring
- [ ] **PWR-04**: All power-up effects are time-limited and expire after a fixed duration

### In-Run Progression (INRUN)

- [ ] **INRUN-01**: Enemies drop in-run currency (distinct from meta currency) on kill
- [ ] **INRUN-02**: Between-wave upgrade shop presents 3 random upgrade choices costing in-run currency
- [ ] **INRUN-03**: In-run currency resets to zero at run end (not carried to meta)
- [ ] **INRUN-04**: Between-wave shop upgrades persist for the current run only

### Meta Progression (META)

- [ ] **META-01**: Meta currency is earned at run end (based on score/waves reached) and persists via localStorage
- [ ] **META-02**: Main menu provides access to the meta shop UI
- [ ] **META-03**: Meta shop offers at least 2 starting weapon loadout unlocks (purchasable alternatives to default weapon)
- [ ] **META-04**: Meta shop offers a limited set of passive stat upgrades (small % bonuses to fire rate, speed, or shield capacity; capped to prevent balance inflation)
- [ ] **META-05**: All meta shop purchases persist across browser sessions via localStorage
- [ ] **META-06**: Run-end screen displays meta currency earned this run alongside total meta currency
- [ ] **META-07**: localStorage schema is versioned (v1) to enable future migration without data loss

### Game Modes (MODE)

- [ ] **MODE-01**: Endless mode — infinite procedurally escalating waves, score-chase focused, always available
- [ ] **MODE-02**: Campaign mode — handcrafted Chapter 1 with 3-4 levels followed by boss fight
- [ ] **MODE-03**: Main menu clearly presents mode selection (Campaign, Endless)
- [ ] **MODE-04**: Campaign progress is saved to localStorage and resumable from main menu

### Boss Encounter (BOSS)

- [ ] **BOSS-01**: Chapter 1 boss is visually distinct and significantly larger than normal enemies
- [ ] **BOSS-02**: Boss fight has at least 2 distinct attack phases with telegraphed phase transitions
- [ ] **BOSS-03**: Boss health bar is displayed throughout the encounter with segmented phase indicators
- [ ] **BOSS-04**: Boss phase transition triggers a visual and behavioral change (new attack patterns, movement)

### Campaign Structure (CAMP)

- [ ] **CAMP-01**: Campaign wave scripts are data-driven (TypeScript objects/arrays, not hardcoded logic)
- [ ] **CAMP-02**: Chapter 1 contains 3-4 handcrafted levels before the boss encounter
- [ ] **CAMP-03**: Brief atmospheric text overlay displays between campaign levels (mission briefing style)

---

## v2 Requirements

Deferred — build after v1 is validated.

### Extended Meta Shop

- **META-V2-01**: Starting power-up selection — lock in 1-2 power-ups at run start from unlocked pool
- **META-V2-02**: Extra lives unlock — purchase additional starting lives
- **META-V2-03**: Artifact slots unlock — add build slots for in-run artifact selection
- **META-V2-04**: Artifact pool expansion — curated artifacts with distinct run modifiers
- **META-V2-05**: Alternate ships (2-3) with distinct stat profiles (speed vs. fire rate vs. health tradeoffs)
- **META-V2-06**: Higher difficulty mode unlocks (purchased via meta shop)
- **META-V2-07**: Additional game mode unlocks

### Cosmetics

- **COS-V2-01**: Ship skin unlocks
- **COS-V2-02**: Neon color theme options for UI and effects
- **COS-V2-03**: Trail effect variants for player ship

### Graphics Options Layer

- **GFX-V2-01**: CRT/scanline overlay option
- **GFX-V2-02**: Pixel-art rendering mode
- **GFX-V2-03**: Gothic/dark mode aesthetic variant

### Audio

- **AUD-V2-01**: Synthwave BGM tracks (reactive to gameplay pacing)
- **AUD-V2-02**: Sound effects: weapon fire, enemy death, power-up pickup, boss hits

### Controls

- **CTRL-V2-01**: Gamepad support with button mapping
- **CTRL-V2-02**: Mouse aim/control scheme

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Online leaderboards | Requires backend infrastructure; no server/database for portfolio scope |
| Multiplayer / co-op | Networking complexity is a separate project; single-player is complete |
| Mobile / touch controls | Desktop-first design; touch UX requires separate design effort |
| Mid-run save / load | Breaks roguelite tension by design; meta-progression persists, run state resets |
| Physics-based movement | Adds input latency; arcade shooters need direct kinematic movement |
| Narrative cutscenes / voiced dialogue | Content production cost; atmospheric text overlays sufficient |
| Randomized enemy placement in campaign | Destroys handcrafted pacing; procedural escalation belongs in endless mode only |
| Permanent stat inflation (uncapped) | Creates "solved" meta state; small capped bonuses only |
| Dynamic PointLights per bullet | Performance trap — additive-blended sprites achieve neon look at fraction of cost |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENG-01 | Phase 1 | Complete |
| ENG-02 | Phase 1 | Complete |
| ENG-03 | Phase 1 | Complete |
| ENG-04 | Phase 1 | Complete |
| ENG-05 | Phase 1 | Complete |
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 1 | Complete |
| CORE-05 | Phase 1 | Complete |
| CORE-06 | Phase 1 | Complete |
| CORE-07 | Phase 1 | Complete |
| CORE-08 | Phase 1 | Complete |
| CORE-09 | Phase 1 | Complete |
| CORE-10 | Phase 1 | Complete |
| CORE-11 | Phase 1 | Complete |
| VIS-01 | Phase 2 | Complete |
| VIS-02 | Phase 2 | Complete |
| VIS-03 | Phase 2 | Complete |
| VIS-04 | Phase 2 | Pending |
| VIS-05 | Phase 2 | Pending |
| FEEL-01 | Phase 2 | Pending |
| FEEL-02 | Phase 2 | Pending |
| FEEL-03 | Phase 2 | Pending |
| FEEL-04 | Phase 2 | Pending |
| FEEL-05 | Phase 2 | Pending |
| FEEL-06 | Phase 2 | Pending |
| FEEL-07 | Phase 2 | Complete |
| ENEMY-01 | Phase 3 | Pending |
| ENEMY-02 | Phase 3 | Pending |
| ENEMY-03 | Phase 3 | Pending |
| ENEMY-04 | Phase 3 | Pending |
| ENEMY-05 | Phase 3 | Pending |
| ENEMY-06 | Phase 3 | Pending |
| ENEMY-07 | Phase 3 | Pending |
| ENEMY-08 | Phase 3 | Pending |
| ENEMY-09 | Phase 3 | Pending |
| ENEMY-10 | Phase 3 | Pending |
| PWR-01 | Phase 3 | Pending |
| PWR-02 | Phase 3 | Pending |
| PWR-03 | Phase 3 | Pending |
| PWR-04 | Phase 3 | Pending |
| INRUN-01 | Phase 3 | Pending |
| INRUN-02 | Phase 3 | Pending |
| INRUN-03 | Phase 3 | Pending |
| INRUN-04 | Phase 3 | Pending |
| BOSS-01 | Phase 4 | Pending |
| BOSS-02 | Phase 4 | Pending |
| BOSS-03 | Phase 4 | Pending |
| BOSS-04 | Phase 4 | Pending |
| META-01 | Phase 4 | Pending |
| META-02 | Phase 4 | Pending |
| META-03 | Phase 4 | Pending |
| META-04 | Phase 4 | Pending |
| META-05 | Phase 4 | Pending |
| META-06 | Phase 4 | Pending |
| META-07 | Phase 4 | Pending |
| MODE-01 | Phase 5 | Pending |
| MODE-02 | Phase 5 | Pending |
| MODE-03 | Phase 5 | Pending |
| MODE-04 | Phase 5 | Pending |
| CAMP-01 | Phase 5 | Pending |
| CAMP-02 | Phase 5 | Pending |
| CAMP-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 64 total
- Mapped to phases: 64
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 — traceability updated after roadmap creation (5-phase structure)*
