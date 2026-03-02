# Roadmap: Super Space Invaders X

## Overview

Five phases deliver a complete browser-based roguelite arcade shooter. The build order is strict: performance-critical architecture must precede all gameplay, core combat must feel good before visual polish, and enemy/wave depth must be validated as fun before meta-progression systems are built. Campaign mode and both game modes ship last, when all underlying systems are stable and proven.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Engine + Core Combat** - Three.js foundation with object pooling, fixed-timestep loop, and a fully playable shoot-em-up combat loop
- [ ] **Phase 2: Visual Identity + Game Feel** - Neon Tokyo cyberpunk aesthetic, bloom post-processing, particle effects, and the feedback systems that make the game feel responsive
- [ ] **Phase 3: Enemy Depth + Wave Systems + Power-Ups** - Six enemy archetypes, formation-breaking AI, wave escalation, power-up drops, and in-run between-wave shop (the "fun bar" gate)
- [ ] **Phase 4: Boss Encounter + Meta Progression** - Chapter 1 boss with multi-phase attack patterns, persistent meta shop, and the roguelite economy that connects runs
- [ ] **Phase 5: Campaign Mode + Game Modes** - Handcrafted Campaign Chapter 1 with data-driven wave scripts, full mode selection, and campaign progress persistence

## Phase Details

### Phase 1: Engine + Core Combat
**Goal**: A fully playable Space Invaders combat loop runs at stable 60fps in the browser
**Depends on**: Nothing (first phase)
**Requirements**: ENG-01, ENG-02, ENG-03, ENG-04, ENG-05, CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08, CORE-09, CORE-10, CORE-11
**Success Criteria** (what must be TRUE):
  1. Player can move the ship left and right with keyboard and fire projectiles that visibly destroy enemies, all at a consistent 60fps with no stutter
  2. Enemies move in formation, fire back at the player, and the player loses a life on hit with a brief invincibility window
  3. When all lives are exhausted, a game over screen shows final score, wave reached, and enemies killed
  4. Pausing with ESC or P freezes all action and shows an overlay; resuming continues exactly where it left off
  5. Score, lives counter, and current wave number are always visible on the HUD during play
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold + engine core (SceneManager, InputManager, ObjectPool, game loop)
- [x] 01-02-PLAN.md — Player entity + bullet pool + movement and weapon systems
- [x] 01-03-PLAN.md — Enemy InstancedMesh formation + AI march + enemy firing
- [x] 01-04-PLAN.md — Collision detection + RunState + MetaState + HUD + SpawnSystem
- [x] 01-05-PLAN.md — StateManager FSM + Pause + GameOver + TitleState
- [x] 01-06-PLAN.md — Human verification checkpoint (full Phase 1 playability)

### Phase 2: Visual Identity + Game Feel
**Goal**: The game looks and feels like a Neon Tokyo cyberpunk arcade shooter with satisfying feedback on every action
**Depends on**: Phase 1
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, FEEL-01, FEEL-02, FEEL-03, FEEL-04, FEEL-05, FEEL-06, FEEL-07
**Success Criteria** (what must be TRUE):
  1. All enemies and the player ship glow with emissive neon materials; each wave assigns a distinct color palette and enemies visually update to match
  2. Selective bloom post-processing makes neon elements glow without washing out the HUD or background
  3. Enemy deaths trigger color-matched particle explosions; player shots produce a muzzle flash; power-up pickups display a swell effect and name text
  4. Screen shake responds to hit severity — large shake on boss impact, small shake on standard hits — without obscuring readability
  5. Wave transitions display "Wave X" with 2-3 seconds of breathing room, and the player ship trails particles during horizontal movement
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Entity geometry + neon emissive materials + WavePalette system
- [ ] 02-02-PLAN.md — SelectiveBloom post-processing (EffectComposer replaces bare renderer.render)
- [ ] 02-03-PLAN.md — Particle system: death bursts, muzzle flash, engine trail
- [ ] 02-04-PLAN.md — Full wiring: PlayingState integration, CameraShake, wave announcement, UI stubs
- [ ] 02-05-PLAN.md — Human verification checkpoint (full Phase 2 visual + feel)

### Phase 3: Enemy Depth + Wave Systems + Power-Ups
**Goal**: Six distinct enemy types with intelligent behaviors make the core loop engaging enough to play for 10+ minutes without meta unlocks
**Depends on**: Phase 2
**Requirements**: ENEMY-01, ENEMY-02, ENEMY-03, ENEMY-04, ENEMY-05, ENEMY-06, ENEMY-07, ENEMY-08, ENEMY-09, ENEMY-10, PWR-01, PWR-02, PWR-03, PWR-04, INRUN-01, INRUN-02, INRUN-03, INRUN-04
**Success Criteria** (what must be TRUE):
  1. Each of the six enemy archetypes (Grunt, Shielder, Flanker, Sniper, Charger, Swooper) behaves distinctly and is visually identifiable at a glance
  2. Enemies break formation mid-wave in response to conditions — flankers charge laterally, chargers dive when low health, shielders require shield destruction first
  3. Waves grow noticeably harder over time: more enemies, faster movement, higher fire rate
  4. Spread shot, rapid fire, and shield power-ups drop randomly from kills, activate immediately on pickup, and expire after a fixed duration
  5. Between waves, an upgrade shop offers 3 choices costing in-run currency; selections persist for the run and reset at run end
**Plans**: TBD

### Phase 4: Boss Encounter + Meta Progression
**Goal**: A memorable multi-phase boss encounter caps the run, and a persistent meta shop gives players a reason to play again
**Depends on**: Phase 3
**Requirements**: BOSS-01, BOSS-02, BOSS-03, BOSS-04, META-01, META-02, META-03, META-04, META-05, META-06, META-07
**Success Criteria** (what must be TRUE):
  1. The Chapter 1 boss is visually distinct and significantly larger than normal enemies; its segmented health bar shows phase boundaries and current phase indicator
  2. The boss transitions through at least 2 distinct attack phases with telegraphed visual and behavioral changes
  3. Meta currency earned at run end persists across browser sessions via localStorage with a versioned schema; the main menu provides access to the meta shop
  4. The meta shop offers at least 2 starting weapon loadout unlocks and a set of capped passive stat upgrades that carry into future runs
  5. The run-end screen shows meta currency earned this run alongside the total accumulated balance
**Plans**: TBD

### Phase 5: Campaign Mode + Game Modes
**Goal**: Players can choose between Campaign and Endless modes from the main menu; Campaign Chapter 1 delivers 3-4 handcrafted levels followed by the boss
**Depends on**: Phase 4
**Requirements**: MODE-01, MODE-02, MODE-03, MODE-04, CAMP-01, CAMP-02, CAMP-03
**Success Criteria** (what must be TRUE):
  1. The main menu clearly presents Campaign and Endless as selectable modes; Endless is always available and escalates infinitely for score-chasing
  2. Campaign Chapter 1 contains 3-4 handcrafted levels followed by the boss fight, with a brief atmospheric text overlay between each level
  3. Campaign progress saves to localStorage; returning to the main menu shows a resume option for an in-progress campaign
  4. All wave content is defined in data objects (not hardcoded logic), making future chapters straightforward to add
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Engine + Core Combat | 6/6 | Complete | 2026-03-02 |
| 2. Visual Identity + Game Feel | 2/5 | In Progress|  |
| 3. Enemy Depth + Wave Systems + Power-Ups | 0/TBD | Not started | - |
| 4. Boss Encounter + Meta Progression | 0/TBD | Not started | - |
| 5. Campaign Mode + Game Modes | 0/TBD | Not started | - |
