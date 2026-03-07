---
phase: 07-gamepad-support
plan: 02
subsystem: ui
tags: [gamepad, input, ui, shop, hints, dynamic-text]
requirements: [PAD-03]

dependency_graph:
  requires: [gamepad-polling, gamepad-synthesis, activeInputDevice]
  provides: [shop-gamepad-nav, meta-shop-gamepad-nav, dynamic-hint-text]
  affects: [ShopUI, MetaShopUI, PlayingState, TitleState, GameOverState, PausedState]

tech_stack:
  added: []
  patterns:
    - Cursor index state (selectedIndex) maintained per UI component
    - update(input) method pattern — UI consumes justPressed before clearJustPressed()
    - purchasableIds flat list built during render for MetaShopUI D-pad navigation
    - DOM element IDs for dynamic hint text updates (hint-restart, hint-menu, hint-resume, hint-continue)
    - lastHintDevice change detection in update() to minimize DOM mutations

key_files:
  created: []
  modified:
    - src/ui/ShopUI.ts
    - src/ui/MetaShopUI.ts
    - src/states/PlayingState.ts
    - src/states/TitleState.ts
    - src/states/GameOverState.ts
    - src/states/PausedState.ts

decisions:
  - ShopUI.update() called BEFORE clearJustPressed() in PlayingState shop guard — justPressed must be readable at call time
  - MetaShopUI purchasableIds rebuilt each render pass — flat list of non-owned, non-locked upgrade IDs enables linear D-pad navigation across card grid
  - selectedIndex clamped after item list shrinks on purchase — prevents out-of-bounds cursor (Pitfall 5)
  - Dynamic hints via DOM id lookups in update() rather than re-rendering full overlay — avoids flickering and event listener re-attachment
  - A button (Space) = restart in GameOverState — Space was unused there; safe addition alongside existing KeyR
  - B button (Escape) = menu in GameOverState — Escape was unused in GameOverState; safe addition alongside existing KeyM
  - A button (Space) = resume in PausedState — complements existing ESC/P with intuitive confirm button

metrics:
  duration: ~4 min
  completed: 2026-03-07
  tasks_completed: 2
  files_created: 0
  files_modified: 6
---

# Phase 7 Plan 02: Gamepad UI Navigation and Dynamic Hints Summary

**One-liner:** D-pad cursor navigation added to ShopUI and MetaShopUI with per-frame hint text that switches between keyboard and gamepad labels based on activeInputDevice.

## What Was Built

### ShopUI Gamepad Navigation (src/ui/ShopUI.ts)

- `selectedIndex: number` field tracks the currently highlighted shop row
- `update(input: InputManager)` public method processes D-pad/arrow navigation: ArrowUp/Down cycle through items with wrap, Space (A button) purchases, Escape (B button) closes
- `_render()` adds a left cyan border (`border-left: 3px solid #00ffff`) and tinted background (`rgba(0,255,255,0.08)`) to the selected row — visible to both keyboard arrow users and gamepad users
- `selectedIndex` clamped in `_buyItem()` after purchase to prevent cursor going out of bounds when item list shrinks
- `show()` resets `selectedIndex = 0` so cursor starts at first item
- Hint text updated to: `"1-9 / D-PAD to select | A to buy | B / ESC to close"`

### MetaShopUI Gamepad Navigation (src/ui/MetaShopUI.ts)

- `selectedIndex: number` and `purchasableIds: string[]` fields for cursor state
- `purchasableIds` rebuilt each `render()` call: flat ordered list of IDs for upgrades that are not owned and not locked (in DOM render order)
- `update(input: InputManager)` method: ArrowUp/Left decrements, ArrowDown/Right increments (wrap), Space (A) purchases, Escape (B) closes
- `_buyById(id)` private method extracted from window global handler — enables purchase without DOM events
- Selected card gets white border and glow box-shadow (`0 0 16px #fff`) vs normal cyan glow
- `selectedIndex` clamped against `purchasableIds.length - 1` after each render
- Close hint updated to `"ESC / U / B to close"`

### PlayingState Shop Guard (src/states/PlayingState.ts)

`ctx.shopUI.update(input)` called before `input.clearJustPressed()` in the shop-open guard. This ensures justPressed reads in `update()` see the current frame's input before it is cleared.

### TitleState Meta Shop Guard (src/states/TitleState.ts)

`this.metaShopUI.update(this.input)` called before `this.input.clearJustPressed()` in the metaShop-visible guard. Same call-order pattern as ShopUI.

Dynamic hint in `_renderMenu()`: reads `this.input.activeInputDevice` at render time — since `_renderMenu()` is called on every navigation keypress (including synthesized D-pad events), hints update naturally as the player switches devices.

### GameOverState Dynamic Hints (src/states/GameOverState.ts)

- `lastHintDevice` field tracks previously shown hint device
- `enter()` renders hints using current `activeInputDevice`: keyboard shows `PRESS R/M/C`, gamepad shows `A: RESTART / B: MENU / Y: CONTINUE`
- `update()` detects device change via `activeInputDevice !== lastHintDevice`, then updates DOM elements by ID (`hint-restart`, `hint-menu`, `hint-continue`) without re-rendering the entire overlay
- A button (Space) added as restart trigger alongside existing KeyR
- B button (Escape) added as menu trigger alongside existing KeyM
- Y button (KeyC) continue was already functional — just needed dynamic hint

### PausedState Dynamic Hints (src/states/PausedState.ts)

- `lastHintDevice` field and `id="hint-resume"` on the hint paragraph
- `enter()` sets initial hint text based on current device
- `update()` swaps hint between `'A: RESUME'` and `'PRESS ESC or P TO RESUME'` when device changes
- A button (Space) added as third resume condition alongside ESC and KeyP

## Success Criteria Status

- [x] ShopUI has selectedIndex cursor, update() method, visual highlight on selected row
- [x] MetaShopUI has selectedIndex cursor, update() method, visual highlight on selected card
- [x] PlayingState calls shopUI.update(input) in the shop-open guard
- [x] TitleState calls metaShopUI.update(input) in the metaShop-visible guard
- [x] GameOverState dynamically shows "A: RESTART / B: MENU / Y: CONTINUE" vs "PRESS R / PRESS M / PRESS C"
- [x] TitleState dynamically shows "D-PAD TO NAVIGATE | A TO SELECT" vs "ARROW KEYS | ENTER"
- [x] PausedState dynamically shows "A: RESUME" vs "PRESS ESC or P TO RESUME"
- [x] All existing keyboard controls continue to work unchanged
- [x] Hint text switches in real-time when player changes input device
- [x] TypeScript compiles clean
- [x] Vite production build succeeds

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- src/ui/ShopUI.ts: FOUND (modified)
- src/ui/MetaShopUI.ts: FOUND (modified)
- src/states/PlayingState.ts: FOUND (modified)
- src/states/TitleState.ts: FOUND (modified)
- src/states/GameOverState.ts: FOUND (modified)
- src/states/PausedState.ts: FOUND (modified)

### Commits
- 095b4e3: feat(07-02): add gamepad cursor navigation to ShopUI and MetaShopUI
- c778020: feat(07-02): add dynamic input hint text to all game state overlays

## Self-Check: PASSED
