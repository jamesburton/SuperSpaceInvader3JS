---
created: 2026-03-10T14:02:52.6801349+00:00
title: Remove junk enemies alongside boss
area: general
files:
  - src/states/PlayingState.ts:193
  - src/systems/SpawnSystem.ts:108
  - src/systems/BossSystem.ts:1
---

## Problem

Some boss encounters are showing extra "junk" enemies alongside the boss. Early boss encounters should not show any companion enemies, and if later encounters intentionally include additional enemies they need to behave correctly instead of appearing as broken or non-working leftovers.

## Solution

Audit the boss encounter flow and enemy spawn lifecycle during boss phases. Confirm whether companion enemies are ever intended for each boss encounter, suppress them entirely for early encounters, and if later encounters should include them, make sure they spawn, update, collide, and clean up through the same gameplay rules as normal working enemies.
