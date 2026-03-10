---
created: 2026-03-10T14:08:09.4236114+00:00
title: Finish level when only barrier enemies remain
area: general
files:
  - src/states/PlayingState.ts:158
  - src/states/PlayingState.ts:493
  - src/entities/Enemy.ts:580
  - src/systems/SpawnSystem.ts:138
  - src/config/enemies.ts:24
---

## Problem

Level or wave completion currently appears to depend on clearing all remaining enemies. If only barrier-style enemies remain, that can drag out the level in a way that may not match the intended pacing or challenge, especially if those enemies are effectively acting more like environmental blockers than meaningful kill targets.

## Solution

Define a completion rule that treats barrier-type enemies differently from normal combatants. Once only barrier enemies remain, finish the level or wave automatically instead of requiring cleanup. This likely needs clear classification of which enemy types count as barriers, plus updates to remaining-enemy checks in wave/level progression so the rule does not accidentally skip encounters that should still be fought.
