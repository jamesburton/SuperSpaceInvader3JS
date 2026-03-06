# Super Space Invaders X

## What This Is

A browser-based Space Invaders remake built with Three.js/WebGL, featuring a Neon Tokyo cyberpunk aesthetic with dense neon color, six enemy archetypes with formation-breaking AI, a roguelite meta-progression economy, and both Campaign and Endless game modes. Shipped v1.0 with 7,486 LOC TypeScript as a portfolio piece showcasing polished game development craft.

## Core Value

The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.

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

### Active

- [ ] Audio: single synthwave BGM loop + full SFX coverage (combat, UI, ambient)
- [ ] Gamepad support with button mapping
- [ ] Ship skins: 3-4 distinct ship shapes + color variants, unlockable in meta shop
- [ ] New power-ups: piercing shot, homing missiles, time slow
- [ ] New power-ups: continuous beam laser, charged burst laser, sweeping laser (rare, busy screens)
- [ ] Starting power-up selection from unlocked pool
- [ ] Extra lives and alternate ships in meta shop
- [ ] Difficulty mode unlocks (Hard/Nightmare) purchasable in meta shop
- [ ] CRT/scanline presets with intensity slider, unlockable in steps via meta shop

### Out of Scope

- Online leaderboards / multiplayer — no backend infrastructure for portfolio scope
- Mobile / touch controls — desktop-first design
- Mid-run save / load — breaks roguelite tension by design
- Permanent stat inflation (uncapped) — creates "solved" meta state
- Dynamic PointLights per bullet — performance trap; additive-blended sprites sufficient

## Context

Shipped v1.0 with 7,486 LOC TypeScript across 140 files.
Tech stack: Three.js 0.183.2 + TypeScript + Vite + pmndrs/postprocessing + Zustand 5.x (no React).
All rendering uses OrthographicCamera, InstancedMesh, and object pooling for zero-GC gameplay.
localStorage persistence via Zustand persist (SAVE_VERSION 3, key: ssi-meta-v1).

## Constraints

- **Tech Stack**: Three.js/WebGL — committed, not up for debate
- **Platform**: Browser-first, desktop keyboard in v1
- **Audio**: Deferred to v2
- **Infrastructure**: None — fully client-side, no server/backend

## Current Milestone: v1.1 Polish & Depth

**Goal:** Add audio, gamepad support, ship customization, six new power-ups, expanded meta shop, and unlockable CRT visual filters to deepen the gameplay loop and player expression.

**Target features:**
- Single synthwave BGM + full SFX coverage
- Gamepad controller support
- Ship skins (shapes + color variants) unlockable in shop
- 6 new power-ups: piercing, homing, time slow, continuous beam, charged burst, sweeping laser
- Meta shop expansion: extra lives, alt ships, starting power-up slot, difficulty unlocks
- CRT/scanline presets with intensity, unlockable in steps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three.js over Phaser/Canvas | WebGL effects are the portfolio-worthy visual differentiator | ✓ Good — neon bloom aesthetic achieved |
| OrthographicCamera for 2D plane | Exact hitbox math, consistent visual scale | ✓ Good — AABB collision works perfectly |
| InstancedMesh + object pooling from Phase 1 | Cannot be retrofitted; zero-GC gameplay critical | ✓ Good — stable 60fps with 50+ entities |
| pmndrs/postprocessing selective bloom | Three.js UnrealBloomPass too broad; selective control needed | ✓ Good — neon elements glow without washing HUD |
| Zustand 5.x persist for meta state | Versioned schema enables migration; no React dependency | ✓ Good — 3 schema versions migrated cleanly |
| RunState as plain TS singleton (volatile) | In-run state must reset completely; no persistence needed | ✓ Good — clean separation from meta |
| Dual currency (Gold + SI$) | In-run economy separate from meta prevents inflation | ✓ Good — shop/meta feel distinct |
| DOM overlay HUD (not Three.js TextGeometry) | Simpler, more readable, no font loading | ✓ Good — crisp text at all resolutions |
| Keyboard-only controls for v1 | Keeps scope tight; gamepad/mouse are v2 | ✓ Good — shipped on time |
| No audio in v1 | Removes significant scope without hurting core game loop | ✓ Good — v1 focused on visuals and gameplay |
| Campaign as data-driven wave configs | TypeScript objects not hardcoded logic; future chapters easy to add | ✓ Good — Chapter 1 defined in single config file |

---
*Last updated: 2026-03-06 after v1.1 milestone start*
