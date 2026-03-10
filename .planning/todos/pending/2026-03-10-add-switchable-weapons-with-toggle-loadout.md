---
created: 2026-03-10T14:03:42.2907802+00:00
title: Add switchable weapons with toggle loadout
area: general
files:
  - src/systems/WeaponSystem.ts:14
  - src/systems/PowerUpManager.ts:16
  - src/states/PlayingState.ts:560
  - src/state/MetaState.ts:26
  - src/config/metaUpgrades.ts:10
---

## Problem

Current weapons and power-ups behave mostly as single active states or timed bonuses. There is no system for keeping multiple collected or permanently unlocked weapons available at once and letting the player switch between them during a run. That limits long-run build depth and makes permanent weapon unlocks feel more like replacements than an expanding arsenal.

## Solution

Design a switchable-weapon system where collected and/or permanently unlocked weapons are added to an available loadout pool, then can be toggled during play. Decide whether each weapon keeps its own progression, ammo, charge state, or upgrade track when inactive versus sharing a common power level. Likely touches WeaponSystem, PowerUpManager, run-state/loadout state, meta unlock definitions, HUD communication, and input bindings for weapon cycling.
