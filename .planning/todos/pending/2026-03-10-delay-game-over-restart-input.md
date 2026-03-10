---
created: 2026-03-10T19:03:49.697Z
title: Delay Game Over restart input
area: general
files:
  - src/states/GameOverState.ts
---

## Problem

The Game Over screen currently treats Space as an immediate restart input as soon as the state opens. Because Space is also the fire/A-button path during active play, it is easy to carry the held input into Game Over and restart before the player has even registered that the run ended.

## Solution

Add a short input lockout on the Game Over screen, likely around 1-2 seconds, before restart inputs are accepted. Keep the delay scoped to restart/play-again actions so the screen remains readable and deliberate without making menu exit or continue handling feel unresponsive.
