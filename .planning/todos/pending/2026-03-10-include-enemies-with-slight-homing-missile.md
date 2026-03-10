---
created: 2026-03-10T14:06:14.1112316+00:00
title: Include enemies with slight homing missile
area: general
files:
  - src/systems/AISystem.ts:277
  - src/entities/Bullet.ts:45
  - src/systems/CollisionSystem.ts:191
  - src/config/enemies.ts:24
  - src/systems/BossSystem.ts:13
---

## Problem

The current enemy roster and projectile patterns do not include a proper homing-missile threat. Adding one could improve encounter variety, but it needs to stay readable and fair. Too much homing would make it feel unavoidable rather than skill-based.

## Solution

Design an enemy attack or enemy type that fires missiles with only slight tracking. Keep turn rate, lifetime, spawn cadence, and telegraphing conservative so the projectile pressures movement without becoming unavoidable. Likely touches enemy definitions, AI attack selection, projectile behavior/state, collision handling, and possibly boss encounter patterns if the mechanic fits better there than on standard enemies.
