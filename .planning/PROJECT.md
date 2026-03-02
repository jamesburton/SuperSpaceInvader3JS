# Super Space Invaders X

## What This Is

A browser-based Space Invaders remake built with Three.js/WebGL, featuring a Neon Tokyo cyberpunk aesthetic with dense color, multi-colored enemy waves, and glowing effects. Combines the pure arcade shooting of the original with modern roguelite progression, a deep meta-unlock shop, dynamic enemy AI, and both campaign and endless modes. Built as a portfolio piece to showcase polished game development craft.

## Core Value

The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Rendering & Visuals**
- [ ] Three.js/WebGL renderer with Neon Tokyo cyberpunk aesthetic
- [ ] Dense multi-color enemy waves with per-wave visual variety and escalating complexity
- [ ] Glowing sprites, neon lighting effects, particle systems for explosions and impacts
- [ ] Cosmetic unlock system: ship skins, color themes, trail effects

**Game Modes**
- [ ] Campaign mode — expandable foundation (1 full chapter: 3-4 levels + boss fight)
- [ ] Endless/arcade mode — infinite wave escalation for score-chasing
- [ ] Difficulty unlock system — higher difficulties and additional game modes unlocked via meta shop

**Enemy Systems**
- [ ] Enemy types with distinct combat roles (shielders, flankers, snipers, chargers)
- [ ] Formation-breaking behavior — enemies that charge, split, flank, and adapt mid-wave
- [ ] Escalating enemy visual variety across waves and levels
- [ ] Boss encounters with unique, multi-phase attack patterns

**In-Run Progression**
- [ ] Mid-wave power-up drops (spread shot, shield, rapid fire, etc.)
- [ ] Between-wave upgrade shop — spend in-run currency on temporary upgrades
- [ ] Selectable permanent artifacts per run (locked-in at run start from meta shop)
- [ ] Artifact slot unlocks — start with 1 slot, unlock more via meta shop

**Meta Progression (Between Runs)**
- [ ] Main menu meta shop — spend persistent currency earned across runs
- [ ] Unlock starting weapon loadouts — choose default weapon before a run
- [ ] Unlock passive stat upgrades — permanent % bonuses to speed, fire rate, shield capacity
- [ ] Unlock starting power-up selection — lock in 1-2 power-ups to start each run with
- [ ] Unlock extra lives
- [ ] Unlock alternate ships with different base stats/abilities
- [ ] Unlock cosmetics (ship skins, color themes, trail effects)
- [ ] Unlock higher difficulties and additional game modes

**Controls**
- [ ] Keyboard controls (WASD / arrows + spacebar) — desktop-first, v1 scope

### Out of Scope

- Audio (BGM + SFX) — deferred to v2, not blocking v1 polish
- Gamepad support — deferred to v2
- Mouse aim/control — TBD post-v1
- Online leaderboards / multiplayer — no backend infrastructure for portfolio scope
- Mobile / touch controls — desktop-first

## Context

- Existing codebase named `SuperSpaceInvader3JS` suggests this may have early Three.js scaffolding — verify before starting
- Portfolio-quality polish matters: visual effects, game feel, and the meta shop depth are the differentiators
- Neon Tokyo direction: think dense layered color, multiple hues per enemy wave, glowing outlines, dynamic lighting from projectiles

## Constraints

- **Tech Stack**: Three.js/WebGL — chosen for WebGL visual capabilities and portfolio impact; committed, not up for debate
- **Platform**: Browser-first, desktop keyboard in v1
- **Audio**: Deferred to post-v1 — don't block other progress on this
- **Infrastructure**: None — fully client-side, no server/backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three.js over Phaser/Canvas | WebGL effects are the portfolio-worthy visual differentiator | — Pending |
| Expandable campaign foundation over full campaign | Ship quality over quantity for portfolio | — Pending |
| Roguelite run structure with meta-progression | Adds replay variety; increases engagement per demo session | — Pending |
| Keyboard-only controls for v1 | Keeps scope tight; gamepad/mouse are v2 additions | — Pending |
| No audio in v1 | Removes significant scope (sourcing, mixing, licensing) without hurting the core game loop demo | — Pending |

---
*Last updated: 2026-03-02 after initialization*
