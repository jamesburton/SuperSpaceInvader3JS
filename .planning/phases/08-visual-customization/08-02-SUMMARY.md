---
phase: 08-visual-customization
plan: 02
subsystem: ui-skins
tags: [ui, skins, persistence, dom-overlay, meta-shop]
dependency_graph:
  requires: [08-01]
  provides: [SkinShopUI, setSkin, skin_shape_upgrades]
  affects: [MetaShopUI, MetaState, metaUpgrades]
tech_stack:
  added: []
  patterns: [dom-overlay, window-global-handlers, zustand-persist]
key_files:
  created:
    - src/ui/SkinShopUI.ts
  modified:
    - src/state/MetaState.ts
    - src/config/metaUpgrades.ts
    - src/ui/MetaShopUI.ts
decisions:
  - "'purchase' SFX key used (not 'shopPurchase') — AudioManager SfxKey union has 'purchase' as the correct identifier"
  - "SkinShopUI auto-equips purchased shape on buy — better UX than requiring a second click to equip"
  - "Color selection requires no purchase and no ownership gate — all 6 colors free to all shapes (SKIN-02)"
  - "Global handlers (__skinShopSelect, __skinShopBuy, __skinShopColor) re-attached every render() call to avoid stale closures"
  - "SVG preview fills with player's currently selected color across all cards — shows consistent color context"
metrics:
  duration: ~4min
  completed: 2026-03-07
  tasks: 2
  files: 4
---

# Phase 8 Plan 2: Ship Skin Selection UI Summary

**One-liner:** SkinShopUI DOM overlay with 4 shape cards (SVG previews), 6 free color swatches, SI$ purchase flow, and full Zustand persist — all accessible from MetaShopUI's new SHIP SKINS section.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add setSkin action to MetaState + skin upgrades to metaUpgrades | b540420 | MetaState.ts, metaUpgrades.ts |
| 2 | Create SkinShopUI + integrate into MetaShopUI | 5dc3398 | SkinShopUI.ts (new), MetaShopUI.ts |

## What Was Built

### MetaState.ts — setSkin action
Added `setSkin(shapeId, colorId)` to the MetaStore interface and store implementation. The action sets `selectedSkin` directly; Zustand persist middleware persists to localStorage automatically on every call (SKIN-04).

### metaUpgrades.ts — skin shape upgrades
- Added `'skin'` to the MetaUpgrade `category` union type
- Added `'skin_shape'` to the `effectType` union type
- Appended 3 upgrade entries: `skin_shape_delta` (25 SI$), `skin_shape_dart` (35 SI$), `skin_shape_cruiser` (50 SI$)
- The `id` format `skin_shape_{shapeId}` is used by SkinShopUI to check `purchasedUpgrades.includes('skin_shape_' + shapeId)`

### SkinShopUI.ts — standalone overlay (z-index 210)
- DOM overlay class following MetaShopUI's pattern (div, position:absolute, inset:0)
- `show(onClose)` / `hide()` / `isVisible` API matching MetaShopUI shape
- `update(input)` handles ESC key via InputManager (gamepad-compatible)
- `render()` builds:
  - SHIP SHAPE section: 4 cards (default/delta/dart/cruiser) each showing:
    - OWNED/LOCKED/FREE label
    - Shape name (CHEVRON/DELTA/DART/CRUISER)
    - SVG polygon preview in player's currently selected color
    - Action button: [EQUIPPED] / SELECT / buy-for-cost
    - Cyan border + glow when equipped
  - COLOR PALETTE section: 6 swatches (32x32px colored squares) with name below
    - Selected swatch has cyan 2px border + glow
    - All colors free — no purchase required
  - ESC to close hint
- Global handlers: `__skinShopSelect`, `__skinShopBuy`, `__skinShopColor`
- Purchase flow: deducts SI$, records upgrade ID in purchasedUpgrades, auto-equips, plays 'purchase' SFX

### MetaShopUI.ts — SHIP SKINS section
- Imports SkinShopUI, creates instance in constructor
- `update()` delegates to `skinShopUI.update()` when SkinShopUI is visible (prevents MetaShopUI from processing input behind the overlay)
- `render()` adds SHIP SKINS section with CUSTOMIZE SHIP button (cyan bordered, styled consistently)
- `__openSkinShop` global handler: calls `skinShopUI.show()` with close callback that hides SkinShopUI and re-renders MetaShopUI

## Requirements Addressed

| ID | Requirement | Status |
|----|-------------|--------|
| SKIN-01 | Ship skin selection screen accessible in meta shop | Done — SHIP SKINS section + CUSTOMIZE SHIP button in MetaShopUI |
| SKIN-02 | 6 color variants per shape | Done — 6 color swatches (GHOST/CYBER/NEON/SOLAR/VENOM/FIRE), all free |
| SKIN-03 | Purchase non-default shapes with SI$ | Done — delta 25 SI$, dart 35 SI$, cruiser 50 SI$; purchaseUpgrade() called |
| SKIN-04 | Skin + color persist across sessions | Done — setSkin() writes to Zustand, persist middleware handles localStorage |
| SKIN-05 | SVG polygon preview per shape | Done — SVG viewBox 0 0 80 48 with polygon element per shape card |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong SFX key 'shopPurchase'**
- **Found during:** Task 2 — TypeScript compile error
- **Issue:** Plan specified `audioManager.playSfx('shopPurchase')` but the AudioManager SfxKey union uses `'purchase'` as the purchase SFX key name
- **Fix:** Changed to `audioManager.playSfx('purchase')`
- **Files modified:** src/ui/SkinShopUI.ts
- **Commit:** 5dc3398

## Self-Check: PASSED

Files verified:
- src/ui/SkinShopUI.ts: FOUND
- src/state/MetaState.ts: FOUND (setSkin added)
- src/config/metaUpgrades.ts: FOUND (skin entries added)
- src/ui/MetaShopUI.ts: FOUND (SkinShopUI integrated)

Commits verified:
- b540420: feat(08-02): add setSkin action to MetaState + skin shape upgrades to metaUpgrades
- 5dc3398: feat(08-02): create SkinShopUI and integrate into MetaShopUI

TypeScript: PASSED (npx tsc --noEmit — no errors)
Vite build: PASSED (built in 5.46s)
