---
phase: 08-visual-customization
plan: "04"
subsystem: ui
tags: [crt, meta-shop, ui, zustand, post-processing, scanlines, chromatic-aberration]

dependency_graph:
  requires:
    - 08-02  # MetaShopUI with SkinShopUI section, MetaState with selectedSkin
    - 08-03  # CRTManager, SceneManager.initCrt(), CRTManager.setIntensity()
  provides:
    - CRT FILTER section in MetaShopUI with 3 sequential tier cards
    - CRT intensity slider with real-time preview (CRTManager.setIntensity)
    - setCrtTier and setCrtIntensity actions in MetaStore (persisted)
    - SceneManager.initCrt() reinit-safe (disposes old CRT pass before creating new)
    - CRTManager.dispose() calls removePass() for clean EffectComposer removal
  affects:
    - Phase 09-10  # Full CRT unlock loop is now player-facing and functional

tech-stack:
  added: []
  patterns:
    - Sequential tier unlock via makeSeqCard (prereqId chain: null -> crt_tier_1 -> crt_tier_2)
    - Live DOM slider wired after innerHTML assignment (same pattern as volume slider in PausedState)
    - CRT reinit via initCrt() idempotent call (dispose old + create new) on tier purchase

key-files:
  created: []
  modified:
    - src/state/MetaState.ts
    - src/config/metaUpgrades.ts
    - src/effects/CRTManager.ts
    - src/core/SceneManager.ts
    - src/ui/MetaShopUI.ts
    - src/states/TitleState.ts

key-decisions:
  - "CRTManager stores composer ref in init() — enables dispose() to call removePass() for clean EffectComposer state before next initCrt()"
  - "SceneManager.initCrt() disposes existing CRTManager first — makes the method idempotent for tier upgrade purchases"
  - "Intensity slider only rendered when crtTier !== null — avoids dead UI element before any CRT tier is unlocked"
  - "audioManager.playSfx('purchase') used (not 'shopPurchase') — consistent with 08-02 SkinShopUI SFX key decision"

patterns-established:
  - "CRT purchase flow: purchaseUpgrade() -> find maxTier from purchasedUpgrades -> setCrtTier() -> initCrt()"
  - "Sequential CRT unlocks: tier 2 prereq = crt_tier_1, tier 3 prereq = crt_tier_2 (makeSeqCard enforces)"

requirements-completed: [CRT-01, CRT-02, CRT-03, CRT-04, CRT-05]

duration: "~3 min"
completed: "2026-03-07"
---

# Phase 8 Plan 04: CRT Filter Meta Shop UI Summary

**CRT tier purchase cards and live-preview intensity slider in MetaShopUI, backed by setCrtTier/setCrtIntensity in MetaStore and clean EffectComposer reinit in SceneManager**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-07T13:02:55Z
- **Completed:** 2026-03-07T13:05:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- CRT tier 1/2/3 unlock cards in MetaShopUI CRT FILTER section (sequential — tier 2 locked until tier 1 owned, tier 3 locked until tier 2 owned)
- Intensity slider appears once any tier is owned; dragging calls CRTManager.setIntensity() live with no restart
- Purchasing a CRT tier auto-computes max owned tier, updates MetaStore.crtTier, and reinitializes CRT via SceneManager.initCrt()
- CRTManager.dispose() now calls removePass() before dispose() — EffectComposer does not retain stale pass reference across reinit
- SceneManager.initCrt() disposes previous CRTManager before creating new one — safe to call multiple times

## Task Commits

1. **Task 1: CRT MetaState actions + upgrade defs + CRTManager reinit support** - `8966b2a` (feat)
2. **Task 2: CRT FILTER section in MetaShopUI + intensity slider** - `31b2c96` (feat)

## Files Created/Modified

- `src/state/MetaState.ts` - Added setCrtTier and setCrtIntensity actions to interface and store
- `src/config/metaUpgrades.ts` - Added 'crt' category, 'crt_tier' effectType, and 3 CRT tier upgrade entries
- `src/effects/CRTManager.ts` - Stores composer ref in init(); dispose() calls removePass() before dispose()
- `src/core/SceneManager.ts` - initCrt() disposes existing crtManager before creating a new one
- `src/ui/MetaShopUI.ts` - CRT FILTER section with sequential tier cards + intensity slider + _buyById CRT handling + optional SceneManager parameter
- `src/states/TitleState.ts` - Passes ctx.scene to MetaShopUI constructor for live CRT preview

## Decisions Made

- **CRTManager stores composer ref**: Needed so dispose() can call `composer.removePass(this.pass)` before `this.pass.dispose()`. Without removePass, the EffectComposer retains a disposed pass reference, causing rendering errors on next initCrt() call.
- **SceneManager.initCrt() is now idempotent**: Disposes old crtManager before creating new one. This allows tier upgrade purchases to call initCrt() safely without accumulating dead passes.
- **Intensity slider only shown when crtTier >= 1**: Avoids a visible but non-functional slider before any CRT tier is purchased. The placeholder `<div style="margin-bottom:16px;"></div>` preserves spacing.
- **audioManager.playSfx('purchase') key**: Consistent with the 08-02 decision — AudioManager SfxKey union has 'purchase', not 'shopPurchase'.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 5 CRT requirements (CRT-01 through CRT-05) are complete
- Phase 08-visual-customization is fully done (4/4 plans)
- Phase 09 (Power-Ups: Piercing, Homing, Time Slow) can begin

## Self-Check: PASSED

- FOUND: src/state/MetaState.ts (setCrtTier, setCrtIntensity)
- FOUND: src/config/metaUpgrades.ts (crt_tier_1/2/3)
- FOUND: src/effects/CRTManager.ts (removePass in dispose)
- FOUND: src/core/SceneManager.ts (initCrt reinit)
- FOUND: src/ui/MetaShopUI.ts (CRT FILTER section)
- FOUND: src/states/TitleState.ts (passes ctx.scene)
- Commit 8966b2a: feat(08-04): add CRT MetaState actions, upgrade defs, and CRTManager reinit support
- Commit 31b2c96: feat(08-04): add CRT FILTER section to MetaShopUI with tier cards and intensity slider
- `npx tsc --noEmit`: PASS
- `npx vite build`: PASS (no new warnings)

---
*Phase: 08-visual-customization*
*Completed: 2026-03-07*
