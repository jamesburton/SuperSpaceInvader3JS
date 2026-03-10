---
created: 2026-03-10T14:38:12.316Z
title: Gate some unlocks behind power-up discovery
area: general
files:
  - src/systems/PowerUpManager.ts
  - src/systems/ShopSystem.ts
  - src/state/MetaState.ts
  - src/config/powerups.ts
  - src/config/metaUpgrades.ts
---

## Problem

Meta unlocks are currently driven primarily by direct purchase flow. There is no progression layer where the player must first discover or collect a power-up in-run before it becomes eligible for permanent unlock. There is also no mechanism for rare or special variants to act as higher-tier discovery gates, or for the end-of-run flow to convert a discovery into a single new purchasable unlock choice.

## Solution

Explore a progression system where selected items must first be encountered or collected as run power-ups before they appear as purchasable meta unlocks. Some unlocks should require rare or special variants rather than the base pickup. At run end, present a constrained reward choice where the player can unlock only one newly discovered item as purchasable. This likely touches power-up definitions, run-end reward flow, persistent discovery state, meta shop availability rules, and how rare/special variants are communicated to the player.
