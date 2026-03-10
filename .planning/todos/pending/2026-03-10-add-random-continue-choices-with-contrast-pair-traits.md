---
created: 2026-03-10T14:11:11.8325799+00:00
title: Add random continue choices with contrast pair traits
area: general
files:
  - src/states/GameOverState.ts:18
  - src/state/RunState.ts:84
  - src/states/PlayingState.ts:413
  - src/config/metaUpgrades.ts:129
  - src/state/MetaState.ts:26
---

## Problem

The current continue flow is mostly binary: either the player has a continue or they do not. That restores the run but does not add much variation or decision-making. A more roguelite continue system could make each recovery feel different and create run identity even when the player is behind.

## Solution

Add a continue-choice system that offers a random selection of modifiers or "children" when continuing. Early on this may mostly force the player to pick which weakness to accept, while later unlocks add stronger or more positive variants and more interesting type combinations. Contrast-pair traits should be common, such as a meaningful boost paired with a downside. Likely touches continue availability, run-state modifiers, unlock progression, GameOverState continue UI, and persistence for which variant pools have been unlocked.
