# Roadmap: Super Space Invaders X

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-06)
- 🚧 **v1.1 Polish & Depth** — Phases 6-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-06</summary>

- [x] **Phase 1: Engine + Core Combat** (6/6 plans) — completed 2026-03-02
- [x] **Phase 2: Visual Identity + Game Feel** (5/5 plans) — completed 2026-03-02
- [x] **Phase 3: Enemy Depth + Wave Systems + Power-Ups** (9/9 plans) — completed 2026-03-03
- [x] **Phase 4: Boss Encounter + Meta Progression** (6/6 plans) — completed 2026-03-03
- [x] **Phase 5: Campaign Mode + Game Modes** (6/6 plans) — completed 2026-03-06

</details>

### 🚧 v1.1 Polish & Depth (In Progress)

**Milestone Goal:** Add audio, gamepad support, ship customization, six new power-ups, expanded meta shop, and unlockable CRT visual filters to deepen the gameplay loop and player expression.

- [x] **Phase 6: Foundation** - MetaStore v4 schema migration + full audio system (completed 2026-03-07)
- [x] **Phase 7: Gamepad Support** - Controller input synthesized into existing input layer (completed 2026-03-07)
- [ ] **Phase 8: Visual Customization** - Ship skins + CRT post-processing effects
- [ ] **Phase 9: Power-Ups** - Piercing shot, homing missiles, and time slow
- [ ] **Phase 10: Meta Shop Expansion** - Extra lives, difficulty unlocks, starting power-up slot, CRT tiers

## Phase Details

### Phase 6: Foundation
**Goal**: Players upgrading from v1.0 have their save data intact and can hear full audio in every game session
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: SHOP-08, AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, AUD-06, AUD-07
**Success Criteria** (what must be TRUE):
  1. Player loads v1.0 save data and all previously unlocked items are preserved with no data loss
  2. BGM synthwave loop plays continuously during gameplay with no audible gap or click at the loop boundary
  3. Every combat event (weapon fire, enemy death, player hit, power-up pickup) produces an SFX
  4. Player can mute audio and adjust master volume from the pause menu, and the setting persists after closing and reopening the browser
  5. Audio begins playing on first keypress in a fresh browser tab without a page refresh
**Plans:** 4/4 plans complete

Plans:
- [x] 06-01-PLAN.md — MetaStore v4 schema migration (SAVE_VERSION bump, migration block, new persistent fields) — completed 2026-03-07
- [ ] 06-02-PLAN.md — AudioManager singleton (Howler.js setup, BGM loop, AudioContext unlock on first gesture)
- [ ] 06-03-PLAN.md — SFX integration (combat SFX wired into WeaponSystem, CollisionSystem, HUD, game states)
- [ ] 06-04-PLAN.md — UI SFX + volume control in pause menu + M-key mute + AUD-07 persistence

### Phase 7: Gamepad Support
**Goal**: Players with a gamepad plugged in can play the complete game without touching the keyboard
**Depends on**: Phase 6
**Requirements**: PAD-01, PAD-02, PAD-03, PAD-04, PAD-05
**Success Criteria** (what must be TRUE):
  1. Player moves the ship with the left analog stick and the ship responds smoothly with no phantom drift when the stick is at rest
  2. Player can fire with A and pause with Start, and navigate all menus and the shop UI using the D-pad and face buttons
  3. A toast notification appears when a gamepad connects or disconnects
  4. If a gamepad disconnects mid-game, the game continues without crashing and keyboard input takes over immediately
  5. A non-standard controller (e.g. PS5 in Firefox) shows a compatibility warning rather than silently producing wrong inputs
**Plans:** 2/2 plans complete

Plans:
- [x] 07-01-PLAN.md — InputManager gamepad polling, radial deadzone, button-to-keycode synthesis, connect/disconnect toast, compatibility warning — completed 2026-03-07
- [ ] 07-02-PLAN.md — ShopUI/MetaShopUI D-pad cursor navigation + dynamic input hint text in all game state overlays

### Phase 8: Visual Customization
**Goal**: Players can express their identity through a ship skin they chose and see an optional CRT filter applied across the whole game
**Depends on**: Phase 6
**Requirements**: SKIN-01, SKIN-02, SKIN-03, SKIN-04, SKIN-05, CRT-01, CRT-02, CRT-03, CRT-04, CRT-05
**Success Criteria** (what must be TRUE):
  1. Player opens a ship selection UI showing 3-4 distinct ship geometry shapes with a visual preview, and can purchase each with SI$ in the meta shop
  2. Player chooses a color variant per ship shape and the selected skin and color appear in-game during the next run
  3. Selected skin and color are preserved after closing and reopening the browser
  4. Player unlocks CRT Tier 1 in the meta shop and sees light scanlines applied across the entire game canvas
  5. Player adjusts the CRT intensity slider and the effect updates immediately without restarting
**Plans:** 3/4 plans executed

Plans:
- [ ] 08-01-PLAN.md — Ship geometry data (4 shapes, 6 colors) + PlayerSkinManager class + PlayingState wiring
- [ ] 08-02-PLAN.md — SkinShopUI with SVG previews, color swatches, SI$ purchase flow, MetaStore persistence
- [ ] 08-03-PLAN.md — CRTManager (ScanlineEffect + ChromaticAberrationEffect in separate EffectPass) + global render pipeline
- [ ] 08-04-PLAN.md — CRT meta shop tier unlock flow + intensity slider with real-time preview

### Phase 9: Power-Ups
**Goal**: Players discover three new power-ups mid-run that each feel mechanically distinct and are clearly communicated through visual feedback
**Depends on**: Phase 6
**Requirements**: PWR-01, PWR-02, PWR-03, PWR-04, PWR-05, PWR-06, PWR-07, PWR-08
**Success Criteria** (what must be TRUE):
  1. Piercing shot bullets visibly pass through enemies in a line and have a distinct elongated visual trail differentiating them from standard bullets
  2. Homing missiles visibly curve toward the nearest enemy, display a lock-on reticle on their target, and expire after a set lifetime without guaranteeing a hit
  3. Time slow reduces all enemy and projectile speeds while the player ship moves at full speed, and a visual desaturation/tint effect communicates the active state
  4. All three new power-ups appear as purchasable options in the between-wave shop alongside existing power-ups
  5. Each new power-up has a visually distinct pickup appearance distinguishable from existing pickups at a glance
**Plans**: TBD

Plans:
- [ ] 09-01: Piercing shot (CollisionSystem bullet-skip logic, elongated trail visual, PWR-02)
- [ ] 09-02: Homing missiles (dedicated InstancedMesh, atan2 steering, lock-on reticle, lifetime cap)
- [ ] 09-03: Time slow (RunState.timeScale, per-system selective application, desaturation visual treatment)
- [ ] 09-04: Shop item registration for all three power-ups + distinct pickup appearances (PWR-07, PWR-08)

### Phase 10: Meta Shop Expansion
**Goal**: Players returning to the meta shop find a meaningfully expanded upgrade tree that surfaces all v1.1 features and offers a pre-run starting power-up selection
**Depends on**: Phases 6, 8, 9
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07
**Success Criteria** (what must be TRUE):
  1. Player purchases extra starting lives in the meta shop (up to a hard cap of 2) and begins the next run with additional lives
  2. Player unlocks the starting power-up slot, then selects a power-up from their unlocked pool before each run (or skips and starts with none)
  3. Player unlocks Hard difficulty in the meta shop and Hard mode has visibly faster enemies, one additional enemy per wave, and earlier Sniper spawns
  4. Player unlocks Nightmare difficulty after completing Hard, and Nightmare mode adds an extra boss attack phase and more aggressive formation breaks
  5. The meta shop is organized clearly enough that a player can locate any upgrade category within ten seconds of opening the UI
**Plans**: TBD

Plans:
- [ ] 10-01: Extra lives + starting power-up slot unlock + pre-run selection screen (SHOP-01, SHOP-02, SHOP-03)
- [ ] 10-02: Hard and Nightmare difficulty unlocks + waveConfig multipliers (SHOP-04, SHOP-05, SHOP-06, SHOP-07)
- [ ] 10-03: Meta shop UI reorganization into categories (Weapons, Ships, Upgrades, Visual)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Engine + Core Combat | v1.0 | 6/6 | Complete | 2026-03-02 |
| 2. Visual Identity + Game Feel | v1.0 | 5/5 | Complete | 2026-03-02 |
| 3. Enemy Depth + Wave Systems + Power-Ups | v1.0 | 9/9 | Complete | 2026-03-03 |
| 4. Boss Encounter + Meta Progression | v1.0 | 6/6 | Complete | 2026-03-03 |
| 5. Campaign Mode + Game Modes | v1.0 | 6/6 | Complete | 2026-03-06 |
| 6. Foundation | v1.1 | 4/4 | Complete | 2026-03-07 |
| 7. Gamepad Support | 2/2 | Complete   | 2026-03-07 | - |
| 8. Visual Customization | 3/4 | In Progress|  | - |
| 9. Power-Ups | v1.1 | 0/4 | Not started | - |
| 10. Meta Shop Expansion | v1.1 | 0/3 | Not started | - |
