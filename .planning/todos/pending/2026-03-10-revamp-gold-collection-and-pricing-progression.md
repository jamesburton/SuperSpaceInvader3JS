---
created: 2026-03-10T14:17:21.5725700+00:00
title: Revamp gold collection and pricing progression
area: general
files:
  - src/state/RunState.ts:72
  - src/config/metaUpgrades.ts:138
  - src/systems/ShopSystem.ts:96
  - src/config/campaign.ts:50
  - src/config/boss.ts:21
---

## Problem

The current economy curve may be too flat for the longer-term progression you want. Early runs should likely feel small and scrappy, with only a little gold income and modest upgrade access, while later campaigns, bosses, and higher-level progression should scale through many orders of magnitude. Right now the collection and pricing model does not clearly express that kind of exponential growth path.

## Solution

Rework both gold acquisition and shop pricing together. Gold gain should stay low in early runs and only ramp up significantly as the player reaches later levels, campaigns, and bosses, while upgrade prices should scale exponentially to match. Core combat stats like weapon damage, health, shields, and recharge should all use exponential price curves that remain balanced against the gold and SI$ rewards unlocked by careful play at higher tiers. This likely needs coordinated tuning across in-run gold gain, conversion, meta pricing, boss/campaign rewards, and stat progression caps.
