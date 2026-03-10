---
created: 2026-03-10T14:09:32.2236956+00:00
title: Move to damage and shields instead of shields and lives
area: general
files:
  - src/systems/CollisionSystem.ts:79
  - src/states/PlayingState.ts:231
  - src/systems/PowerUpManager.ts:54
  - src/entities/Player.ts:52
  - src/states/GameOverState.ts:10
---

## Problem

The current survivability model is built around shield charges plus discrete lives. That keeps the game closer to classic arcade structure, but it may be limiting the roguelite feel. A damage-and-shields model could support more granular attrition, healing, mitigation, and build variety than the current lose-a-life flow.

## Solution

Redesign player survivability around health or damage intake protected by shields, instead of shield charges plus lives. This would likely require reworking hit resolution, HUD feedback, game-over thresholds, shield behavior, balance around pickups/upgrades, and how boss damage pacing feels. Define whether shields are a regenerating buffer, a breakable layer, a timed mitigation effect, or some combination.
