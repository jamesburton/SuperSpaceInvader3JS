# Super Space Invaders X

## What This Is

A browser-based Space Invaders remake built with Three.js/WebGL, now expanded beyond the v1.0 arcade core with full audio wiring, controller support, ship customization, three additional power-ups, unlockable difficulty tiers, and a broader meta-progression loop across Campaign and Endless modes.

## Core Value

The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.

## Current State

- **Latest shipped milestone:** v1.1 Polish & Depth (shipped 2026-03-13)
- **Codebase:** 10,990 LOC TypeScript
- **Tech stack:** Three.js 0.183.2, TypeScript, Vite, pmndrs/postprocessing, Zustand 5.x
- **Shipping caveat:** Audio systems are implemented, but placeholder assets still need to be replaced with final BGM/SFX files for a fully polished release

## Requirements

### Validated

- ✓ Three.js/WebGL renderer at stable 60fps with object pooling and InstancedMesh — v1.0
- ✓ Fixed-timestep game loop preventing bullet tunneling — v1.0
- ✓ Player movement, firing, lives, invincibility frames, pause — v1.0
- ✓ Score, wave, and lives HUD — v1.0
- ✓ Neon Tokyo cyberpunk aesthetic with selective bloom post-processing — v1.0
- ✓ Per-wave color palettes with emissive materials on all entities — v1.0
- ✓ Particle effects: death bursts, muzzle flash, engine trail, pickup swell — v1.0
- ✓ Screen shake, wave announcements, weapon-type visual distinction — v1.0
- ✓ Six enemy archetypes with distinct geometry, AI, and visual identity — v1.0
- ✓ Formation-breaking behavior (flanking, charging, diving, swooping) — v1.0
- ✓ Wave escalation with increasing enemy count, speed, and fire rate — v1.0
- ✓ Spread shot, rapid fire, and shield power-ups with duration expiry — v1.0
- ✓ In-run Gold currency, between-wave upgrade shop with 3 random choices — v1.0
- ✓ Persistent SI$ meta currency earned at run end via localStorage — v1.0
- ✓ Meta shop with weapon loadout unlocks and capped passive stat upgrades — v1.0
- ✓ Multi-phase boss encounter with telegraphed transitions and segmented health bar — v1.0
- ✓ Campaign Chapter 1: 4 handcrafted levels + boss with atmospheric briefings — v1.0
- ✓ Endless mode with infinite wave escalation — v1.0
- ✓ Mode selection UI (Campaign/Endless/Upgrades) with keyboard navigation — v1.0
- ✓ Campaign progress saved to localStorage and resumable — v1.0
- ✓ Audio system with gameplay/UI/flow hooks, pause-menu controls, and persisted volume/mute settings — v1.1
- ✓ Gamepad support across gameplay, menus, and shops with connect/disconnect feedback — v1.1
- ✓ Ship skins: unlockable shapes, colors, and persisted selection — v1.1
- ✓ New power-ups: piercing shot, homing missiles, and time slow — v1.1
- ✓ Starting power-up selection from unlocked pool before each run — v1.1
- ✓ Extra lives and expanded meta shop structure — v1.1
- ✓ Difficulty mode unlocks (Hard/Nightmare) with gameplay changes and boss escalation — v1.1
- ✓ CRT/scanline presets with unlockable tiers and live intensity control — v1.1

### Active

- [ ] Replace placeholder audio assets with final BGM and SFX files
- [ ] New power-ups: continuous beam laser, charged burst laser, sweeping laser
- [ ] Ship flavor text and richer identity/per-ship progression
- [ ] Audio polish: per-weapon identity, multi-track BGM, boss intensity shifts
- [ ] Gamepad polish: rumble/haptics and higher-fidelity controller support
- [ ] Meta progression follow-ups from backlog (unlock gating, economy tuning, alternate run choices)

### Out of Scope

- Online leaderboards / multiplayer — no backend infrastructure for portfolio scope
- Mobile / touch controls — desktop-first design
- Mid-run save / load — breaks roguelite tension by design
- Permanent stat inflation (uncapped) — creates "solved" meta state
- Dynamic PointLights per bullet — performance trap; additive-blended sprites sufficient

## Context

Shipped v1.1 with 10,990 LOC TypeScript and a broader player-expression loop built on top of the v1.0 arcade foundation.
The game now supports keyboard and gamepad input, persistent ship cosmetics, CRT visual filters, run-start loadout setup, and a deeper power-up/difficulty ladder.
Known production debt is mostly asset and planning hygiene, not missing core game systems.

## Constraints

- **Tech Stack**: Three.js/WebGL — committed, not up for debate
- **Platform**: Browser-first, desktop-first
- **Infrastructure**: None — fully client-side, no server/backend
- **Readability**: Combat clarity takes priority over overly aggressive visual distortion or UI density

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three.js over Phaser/Canvas | WebGL effects are the portfolio-worthy visual differentiator | ✓ Good — neon bloom aesthetic achieved |
| OrthographicCamera for 2D plane | Exact hitbox math, consistent visual scale | ✓ Good — AABB collision works perfectly |
| InstancedMesh + object pooling from Phase 1 | Cannot be retrofitted; zero-GC gameplay critical | ✓ Good — stable 60fps with 50+ entities |
| pmndrs/postprocessing selective bloom | Three.js UnrealBloomPass too broad; selective control needed | ✓ Good — neon elements glow without washing HUD |
| Zustand persist for meta state with versioned migrations | Enables long-lived meta progression without React dependency | ✓ Good — migrations supported both v1.0 and v1.1 evolution |
| DOM overlay HUD and menu UI | Faster iteration and better readability than 3D text | ✓ Good — all menu/shop overlays stayed legible and easy to extend |
| Per-system time slow instead of global clock reduction | Keeps player controls crisp while slowing hostile systems only | ✓ Good — delivered readable slowdown without harming input feel |
| CRT as a separate pass / overlay rather than merged with bloom | Preserves glow readability and keeps visual stack controllable | ✓ Good — CRT customization shipped without losing bloom identity |
| Dedicated subsystem for homing missiles instead of overloading Bullet | Keeps projectile logic bounded and testable | ✓ Good — missile steering and reticle behavior stayed isolated |
| Expanded meta shop via categories and pre-run setup | Makes the larger unlock tree scannable and supports loadout decisions before a run | ✓ Good — Phase 10 shipped with clearer browsing and setup flow |

## Next Milestone Goals

- Decide the next milestone scope and define fresh requirements
- Replace placeholder audio assets if v1.1 is being treated as fully player-facing
- Choose whether the next push is combat depth (beam weapons, new choices) or progression/economy cleanup

---
*Last updated: 2026-03-13 after v1.1 milestone completion*
