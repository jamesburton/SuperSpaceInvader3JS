---
phase: 03-enemy-depth-wave-systems-power-ups
plan: "09"
subsystem: verification
tags: [verification, human-qa, phase3-complete]
---

## What Was Verified

All 18 Phase 3 requirements confirmed working via gameplay test. Phase 3 is complete.

### Verified Systems
- All 6 enemy types functioning: Grunt, Shielder, Flanker, Sniper, Charger, Swooper
- Flankers now spread-target (not chain-stack) — each gets a unique x offset
- Wave escalation scaling applied correctly via WAVE_CONFIGS
- Power-up drops from kills, tokens drift downward, AABB pickup detection
- Spread shot, rapid fire, and shield active/expire correctly
- Shop opens after wave 5 and 10; all 6 items purchasable with gold
- Pickup feedback overlay shows power-up name on collection
- Invincibility frames after player hit; pickups still collectible during invincibility

### Bug Fixes Applied During Verification
- Spread shot angle decomposition was applying negative vy (firing backwards) — fixed sign
- MovementSystem was not applying `bullet.vx` — added `bullet.x += bullet.vx * dt`
- Power-up pickup blocked during invincibility — removed guard from pickup check
- Flanker chain-targeting converged all flankers to same x — replaced with spread targeting

### Post-Phase Feature Batch (Economy + Bunkers)
After Phase 3 verification, the following were implemented before closing out:
- 2 starter waves added (waves 1-2 easy; original 1-10 become 3-12)
- Max bullets in-flight system (default 1; Fibonacci-priced meta upgrades up to 7)
- SI$ economy rework: gold-at-death conversion (10% base) + 85% start-run tax (reduceable)
- Shop rewritten for multi-buy scrollable list (all available items shown at once)
- Bunker system: BunkerManager, segment AABB collision, meta shop integration
- Power-ups now carry between waves (only tokens released, active effects persist)
- Sequential upgrade ordering enforced in meta shop UI
- Economy rebalanced: base conversion 10%, base tax keep 15%, reduced early upgrade costs
