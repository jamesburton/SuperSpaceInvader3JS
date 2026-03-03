---
phase: 04-boss-encounter-meta-progression
plan: "04"
subsystem: ui
tags: [zustand, meta-shop, dom-overlay, typescript, upgrades]

# Dependency graph
requires:
  - phase: 04-01
    provides: MetaStore.purchaseUpgrade(id, cost) Zustand action and purchasedUpgrades array

provides:
  - META_UPGRADES catalog (9 items: 2 loadouts + 7 passives)
  - MetaShopUI DOM overlay with purchase, owned-state, and SI$ balance display
  - TitleState UPGRADES button (U key) wired to MetaShopUI

affects:
  - 04-05 (boss integration / PlayingState run-start meta effects application)
  - 05-x (future campaign modes that read purchasedUpgrades at run start)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window.__metaShopBuy global for inline onclick handlers in innerHTML-rendered cards"
    - "MetaShopUI lazy-init in TitleState.enter() using document.getElementById('hud')"
    - "re-render on purchase: render() called again after successful purchaseUpgrade()"
    - "isVisible getter on DOM overlay: style.display !== 'none' check"

key-files:
  created:
    - src/config/metaUpgrades.ts
    - src/ui/MetaShopUI.ts
  modified:
    - src/states/TitleState.ts

key-decisions:
  - "window.__metaShopBuy global used for onclick handlers in innerHTML — avoids event delegation complexity in statically-rendered card HTML"
  - "MetaShopUI lazy-init in enter() not constructor — TitleState constructor does not have document.getElementById available in all contexts"
  - "MetaShopUI appended to #hud element at z-index:200 — sits above hud-overlay (no z-index) without HUD API changes"

patterns-established:
  - "MetaShopUI follows ShopUI keyboard pattern: add listener in show(), remove in hide()"
  - "purchaseUpgrade idempotency: MetaStore ignores re-purchase of same ID (established in 04-01)"

requirements-completed: [META-02, META-03, META-04]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 4 Plan 04: Meta Shop UI Summary

**DOM meta shop overlay with 9-item upgrade catalog (2 loadout unlocks + 7 passive stat tiers), purchase flow deducting SI$ via Zustand, and TitleState UPGRADES button**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-03T12:23:51Z
- **Completed:** 2026-03-03T12:25:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- META_UPGRADES catalog with 2 starting loadouts (SPREAD MATRIX, RAPID PROTOCOL) and 7 passive tiers (3x fire rate, 3x move speed, 1x starting life)
- MetaShopUI overlay renders loadout and passive sections; owned items show [OWNED] with no buy button; SI$ balance displayed at top
- TitleState shows "PRESS U FOR UPGRADES" hint and opens MetaShopUI on U key; ESC/U closes; exit() hides on state transition

## Task Commits

Each task was committed atomically:

1. **Task 1: Create meta upgrade catalog** - `22cbbeb` (feat)
2. **Task 2: Create MetaShopUI and wire to TitleState** - `7cf88db` (feat)

## Files Created/Modified

- `src/config/metaUpgrades.ts` - MetaUpgrade interface + META_UPGRADES array (9 items: 2 loadouts + 7 passives)
- `src/ui/MetaShopUI.ts` - DOM overlay with render(), show(onClose), hide(), isVisible; purchase via useMetaStore.purchaseUpgrade
- `src/states/TitleState.ts` - Added MetaShopUI lazy-init in enter(), U key handler in update(), PRESS U hint in overlay

## Decisions Made

- Used `window.__metaShopBuy` global for inline onclick handlers in innerHTML-rendered cards rather than event delegation — simpler for a static list
- MetaShopUI lazy-init in `enter()` using `document.getElementById('hud')` — constructor can't guarantee DOM is ready in all code paths
- MetaShopUI appended to `#hud` element with `z-index:200` — renders above existing HUD overlay without requiring HUD API changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- META-02/03/04 complete: meta shop catalog + UI + TitleState button fully wired
- META_UPGRADES effectType discriminated union ready for PlayingState to read purchasedUpgrades on run start (Phase 5 or remaining Phase 4 plans)
- purchaseUpgrade is idempotent; Zustand persist writes to localStorage on every purchase

## Self-Check: PASSED

- FOUND: src/config/metaUpgrades.ts
- FOUND: src/ui/MetaShopUI.ts
- FOUND: src/states/TitleState.ts
- FOUND: .planning/phases/04-boss-encounter-meta-progression/04-04-SUMMARY.md
- FOUND: commit 22cbbeb (Task 1)
- FOUND: commit 7cf88db (Task 2)

---
*Phase: 04-boss-encounter-meta-progression*
*Completed: 2026-03-03*
