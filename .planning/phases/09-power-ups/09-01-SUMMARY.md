---
phase: 09-power-ups
plan: "01"
subsystem: piercing-shot
tags: [powerups, combat, bullets, collision, particles]
dependency_graph:
  requires: [08-04]
  provides: [piercing-shot, bullet-metadata, piercing-collision]
  affects: [WeaponSystem, Bullet, CollisionSystem, ParticleManager]
tech_stack:
  added: []
  patterns:
    - Pooled bullet metadata with explicit reset on init
    - Two-hit collision sequencing with per-bullet enemy hit tracking
    - Lightweight particle reuse for piercing impact streaks
key_files:
  created: []
  modified:
    - src/config/powerups.ts
    - src/entities/Bullet.ts
    - src/systems/WeaponSystem.ts
    - src/systems/CollisionSystem.ts
    - src/effects/ParticleManager.ts
    - src/entities/Bullet.test.ts
    - src/systems/CollisionSystem.test.ts
decisions:
  - "Piercing shot stays on the existing Bullet pool instead of introducing another generic projectile type"
  - "Bullets now own shotKind, remainingHits, damage falloff, and per-enemy hit tracking so pooling remains safe"
  - "Second-hit damage uses a scalar path (1.0 then 0.5) instead of a hard-coded special case in CollisionSystem"
  - "Piercing visuals use an elongated bullet mesh plus a lightweight trail/impact helper from ParticleManager"
metrics:
  duration: "~20 min"
  completed: "2026-03-10"
  tasks: 2
  files: 7
---

# Phase 9 Plan 01: Piercing Shot Summary

**One-liner:** Added a dedicated piercing-shot branch on the existing player bullet path with two-hit falloff, per-enemy overlap protection, and a clearer rail-style visual read.

## What Was Built

1. `src/config/powerups.ts`
   - Expanded `PowerUpType` and definitions to include `piercingShot`, `homingMissile`, and `timeSlow`
   - Added durations and colors so later plans can wire shop, HUD, and pickup visuals against a single typed registry

2. `src/entities/Bullet.ts` and `src/systems/WeaponSystem.ts`
   - Added explicit bullet metadata for `shotKind`, remaining hits, damage falloff, and per-enemy hit tracking
   - Reset all new fields in `init()` so pooled bullets cannot leak prior piercing state
   - Added a dedicated piercing fire branch that spawns one elongated rail-style shot instead of the spread pattern

3. `src/systems/CollisionSystem.ts` and `src/effects/ParticleManager.ts`
   - Collision now lets piercing bullets survive the first hit, apply reduced damage on the second, and then release
   - Added per-bullet enemy hit tracking so overlap on adjacent frames cannot damage the same enemy twice
   - Added a lightweight piercing impact/trail helper to reinforce the shot identity without a new particle pool

## Verification

- `npx vitest run src/entities/Bullet.test.ts src/systems/CollisionSystem.test.ts`
- `npx tsc --noEmit`

## Deviations from Plan

None.

## Self-Check: PASSED

Commits:
- `20f5fd4` - feat(phase-09): add piercing shot bullet path
- `e1b2ea5` - feat(phase-09): add piercing collision falloff
