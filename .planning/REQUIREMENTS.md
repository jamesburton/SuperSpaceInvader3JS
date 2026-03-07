# Requirements: Super Space Invaders X

**Defined:** 2026-03-06
**Core Value:** The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.

## v1.1 Requirements

Requirements for v1.1 Polish & Depth. Each maps to roadmap phases.

### Audio

- [x] **AUD-01**: Player hears a looping synthwave BGM track during gameplay without audible gaps
- [x] **AUD-02**: Player hears SFX for all combat events (weapon fire, enemy death, player hit, power-up pickup)
- [x] **AUD-03**: Player hears SFX for game flow events (wave start, boss phase transition, game over)
- [x] **AUD-04**: Player hears SFX for UI interactions (menu navigation, shop purchase, pause)
- [x] **AUD-05**: Audio plays on first user interaction without requiring page refresh (AudioContext unlock)
- [x] **AUD-06**: Player can mute/unmute and adjust master volume from pause menu
- [x] **AUD-07**: Volume preference persists across sessions

### Gamepad

- [x] **PAD-01**: Player can move ship with left analog stick with deadzone filtering
- [x] **PAD-02**: Player can shoot with A button and pause with Start button
- [x] **PAD-03**: Player can navigate all menus and shop UI with gamepad
- [x] **PAD-04**: Game displays notification on gamepad connect/disconnect
- [x] **PAD-05**: Game gracefully falls back to keyboard when gamepad disconnects mid-game

### Ship Skins

- [x] **SKIN-01**: Player can view and select from 3-4 distinct ship geometry shapes in a selection UI
- [x] **SKIN-02**: Player can choose from 6 color variants per ship shape
- [x] **SKIN-03**: Ship skins are purchasable with SI$ in the meta shop
- [x] **SKIN-04**: Selected skin and color persist across sessions
- [x] **SKIN-05**: Ship selection shows visual preview of each option

### Power-Ups

- [ ] **PWR-01**: Piercing shot passes through enemies, damaging multiple targets in a line
- [ ] **PWR-02**: Piercing shot has a distinct visual trail indicating penetration
- [ ] **PWR-03**: Homing missiles track nearest enemy with limited turn rate and lifetime cap
- [ ] **PWR-04**: Homing missiles display a lock-on reticle on the targeted enemy
- [ ] **PWR-05**: Time slow reduces all enemy and bullet speed for a limited duration
- [ ] **PWR-06**: Time slow applies a visual treatment (desaturation/tint) to communicate the state
- [ ] **PWR-07**: All three new power-ups appear as purchasable options in the between-wave shop
- [ ] **PWR-08**: Each new power-up has a visually distinct pickup appearance

### Meta Shop

- [ ] **SHOP-01**: Player can purchase extra starting lives in meta shop (capped at +2)
- [ ] **SHOP-02**: Player can unlock a starting power-up slot in meta shop
- [ ] **SHOP-03**: Player can select a starting power-up from unlocked pool before each run
- [ ] **SHOP-04**: Player can unlock Hard difficulty mode in meta shop
- [ ] **SHOP-05**: Hard mode increases enemy speed, adds +1 enemy per wave, enables earlier Sniper spawns
- [ ] **SHOP-06**: Player can unlock Nightmare difficulty mode after completing Hard
- [ ] **SHOP-07**: Nightmare mode has aggressive formation breaks and an additional boss attack phase
- [x] **SHOP-08**: Existing v1.0 save data migrates to v1.1 schema without loss (MetaStore v3→v4)

### CRT / Visual

- [x] **CRT-01**: Player can unlock CRT Tier 1 "HIGH-DEF 2003" (light scanlines) in meta shop
- [x] **CRT-02**: Player can unlock CRT Tier 2 "CONSUMER 1991" (moderate scanlines + chromatic aberration)
- [x] **CRT-03**: Player can unlock CRT Tier 3 "ARCADE 1983" (heavy scanlines + strong chromatic aberration)
- [x] **CRT-04**: Player can adjust CRT effect intensity with a slider
- [x] **CRT-05**: CRT effect updates in real-time as settings change (no restart required)

## v1.2+ Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Audio (v1.1.5+)

- **AUD-08**: Per-weapon distinct SFX with unique tonal identity
- **AUD-09**: Audio sprite pooling for high-rate SFX (rate-limited playback)
- **AUD-10**: Boss phase BGM intensity shift via filter modulation (v1.2)
- **AUD-11**: Per-mode BGM tracks (menu, campaign, endless, boss) (v1.2)
- **AUD-12**: Dynamic per-wave mood shifts (v1.3+)

### Gamepad (v1.2.5+)

- **PAD-06**: Gamepad rumble/haptic feedback on player hit (v1.2.5)
- **PAD-07**: Stereo SFX panning based on enemy position (v1.3)

### Ship Skins (v1.1.x+)

- **SKIN-06**: Ship shapes have named flavor text descriptions (v1.1.x)
- **SKIN-07**: Ship colors tested against wave palettes for aesthetic harmony (v1.2)
- **SKIN-08**: Ship stat differences and upgrade paths (v1.3+)

### Power-Ups (v1.2)

- **PWR-09**: Continuous beam laser — hold fire for constant beam with per-tick damage
- **PWR-10**: Charged burst laser — hold to charge, release for instant-travel beam
- **PWR-11**: Sweeping laser — wide arc beam, rare, weighted toward enemy density clusters

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiple BGM tracks | Audio production scope; ship one great loop first |
| Barrel distortion CRT | Distorts hitbox readability and causes motion sickness |
| Power-up stacking (multiple active) | Visual chaos; override-on-pickup is cleaner |
| Full gamepad button remapping UI | Low value vs. complexity; standard layout sufficient |
| Analog aim / right stick | Fixed horizontal movement is core design; free-aim changes genre |
| Per-ship audio themes | Significant audio asset scope for cosmetic feature |
| Touch / mobile controls | Desktop-first design |
| Online leaderboards | Requires backend infrastructure |
| Mid-run save on disconnect | Breaks roguelite tension by design |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUD-01 | Phase 6 | Complete |
| AUD-02 | Phase 6 | Complete |
| AUD-03 | Phase 6 | Complete |
| AUD-04 | Phase 6 | Complete |
| AUD-05 | Phase 6 | Complete |
| AUD-06 | Phase 6 | Complete |
| AUD-07 | Phase 6 | Complete |
| SHOP-08 | Phase 6 | Complete |
| PAD-01 | Phase 7 | Complete |
| PAD-02 | Phase 7 | Complete |
| PAD-03 | Phase 7 | Complete |
| PAD-04 | Phase 7 | Complete |
| PAD-05 | Phase 7 | Complete |
| SKIN-01 | Phase 8 | Complete |
| SKIN-02 | Phase 8 | Complete |
| SKIN-03 | Phase 8 | Complete |
| SKIN-04 | Phase 8 | Complete |
| SKIN-05 | Phase 8 | Complete |
| CRT-01 | Phase 8 | Complete |
| CRT-02 | Phase 8 | Complete |
| CRT-03 | Phase 8 | Complete |
| CRT-04 | Phase 8 | Complete |
| CRT-05 | Phase 8 | Complete |
| PWR-01 | Phase 9 | Pending |
| PWR-02 | Phase 9 | Pending |
| PWR-03 | Phase 9 | Pending |
| PWR-04 | Phase 9 | Pending |
| PWR-05 | Phase 9 | Pending |
| PWR-06 | Phase 9 | Pending |
| PWR-07 | Phase 9 | Pending |
| PWR-08 | Phase 9 | Pending |
| SHOP-01 | Phase 10 | Pending |
| SHOP-02 | Phase 10 | Pending |
| SHOP-03 | Phase 10 | Pending |
| SHOP-04 | Phase 10 | Pending |
| SHOP-05 | Phase 10 | Pending |
| SHOP-06 | Phase 10 | Pending |
| SHOP-07 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
