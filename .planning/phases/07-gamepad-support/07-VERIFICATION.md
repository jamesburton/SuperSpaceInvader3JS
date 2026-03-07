---
phase: 07-gamepad-support
verified: 2026-03-07T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Plug in a gamepad and move the left analog stick"
    expected: "Ship moves smoothly; no drift when stick is centered at rest"
    why_human: "Deadzone math and binary threshold produce live analog behavior that cannot be verified without hardware"
  - test: "Press A button on gamepad while in gameplay"
    expected: "Ship fires; in menus A confirms selection"
    why_human: "Real gamepad event firing and button index mapping requires physical hardware"
  - test: "Unplug gamepad mid-game"
    expected: "Ship stops; keyboard input takes over immediately with no phantom movement"
    why_human: "gamepaddisconnected event and _clearSynthesizedKeys() behavior requires live hardware"
  - test: "Connect a non-standard controller (e.g. generic USB pad not mapped as 'standard')"
    expected: "Amber warning toast appears after cyan connect toast"
    why_human: "gamepad.mapping !== 'standard' branch requires a controller that browsers identify as non-standard"
  - test: "Open the between-wave shop with a gamepad connected; use D-pad to navigate"
    expected: "Cursor highlight moves up/down through items; A buys; B closes"
    why_human: "ShopUI.update() cursor behavior in context of live gameplay requires hardware"
  - test: "Open MetaShopUI (UPGRADES menu) with gamepad; navigate cards"
    expected: "White-glow highlight moves across purchasable cards; A purchases"
    why_human: "MetaShopUI purchasableIds traversal requires visual inspection of rendered card grid"
  - test: "Switch from gamepad to keyboard on the GameOver screen"
    expected: "Hint text changes from 'A: RESTART / B: MENU' to 'PRESS R TO RESTART / PRESS M FOR MENU'"
    why_human: "Dynamic DOM text swap on activeInputDevice change requires live device switching"
---

# Phase 7: Gamepad Support Verification Report

**Phase Goal:** Players with a gamepad plugged in can play the complete game without touching the keyboard
**Verified:** 2026-03-07
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Player moves ship with left analog stick and ship responds with no phantom drift at rest | VERIFIED | `_synthesizeStick()` applies radial deadzone of 0.20 before any directional logic; stick at rest clears all arrow keys and resets prevStick* flags (InputManager.ts:252-265) |
| 2 | Player fires with A button (or RB) and pauses with Start button | VERIFIED | `_buttonToCode()`: index 0 (A) -> 'Space', index 5 (RB) -> 'Space', index 9 (Start) -> 'KeyP'; synthesized into justPressedKeys/heldKeys (InputManager.ts:229-233) |
| 3 | D-pad left/right moves the ship during gameplay | VERIFIED | `_buttonToCode()`: indices 12-15 -> ArrowUp/Down/Left/Right; PlayingState reads `isDown('ArrowLeft'/'ArrowRight')` (PlayingState.ts:130-131) |
| 4 | A toast notification appears when a gamepad connects or disconnects showing controller name | VERIFIED | `gamepadconnected` handler strips hex prefix from `e.gamepad.id` and calls `toast.show('CONTROLLER CONNECTED — ${name}', 'connect')`; `gamepaddisconnected` calls `toast.show('CONTROLLER DISCONNECTED', 'disconnect')` (InputManager.ts:133-157) |
| 5 | Non-standard controller shows a compatibility warning toast | VERIFIED | `if (e.gamepad.mapping !== 'standard')` branch calls `toast.show('WARNING: non-standard controller...', 'warning')` with 100ms delay (InputManager.ts:136-143) |
| 6 | When gamepad disconnects mid-game the ship does not drift and keyboard works immediately | VERIFIED | `gamepaddisconnected` handler calls `_clearSynthesizedKeys()` which removes all GAMEPAD_CODES from heldKeys and resets prevStick* booleans; `activeInputDevice` set to 'keyboard' (InputManager.ts:148-155, 310-318) |
| 7 | Player can navigate all menus and shop UI with gamepad D-pad and face buttons; hint text switches dynamically | VERIFIED | ShopUI.update(), MetaShopUI.update() called before clearJustPressed() in respective guards; GameOverState/PausedState/TitleState read activeInputDevice for hints and update via DOM IDs on device change |

**Score:** 7/7 truths verified

---

### Required Artifacts

**Plan 07-01 Artifacts**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/ui/GamepadToast.ts` | Bottom-center neon toast DOM element for notifications | VERIFIED | 103 lines; exports `GamepadToast`; cyan/amber styling; double-rAF fade-in; pointer-events:none; white-space:nowrap |
| `src/core/InputManager.ts` | Gamepad polling, deadzone, button synthesis, connect/disconnect handlers, activeInputDevice | VERIFIED | 319 lines; `initGamepad()`, `_pollGamepad()`, `_synthesizeStick()`, `_clearSynthesizedKeys()`, `_buttonToCode()`; `activeInputDevice` public property; all GAMEPAD_CODES defined |
| `src/core/Game.ts` | Wires initGamepad after hudRoot available | VERIFIED | `this.input.initGamepad(hudRoot)` on line 66, after `hudRoot` acquired on line 62 |

**Plan 07-02 Artifacts**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/ui/ShopUI.ts` | `selectedIndex`, `update(input)`, visual highlight on selected row | VERIFIED | `selectedIndex` field (line 22); `update(InputManager)` method (line 97); cyan left-border highlight in `_render()` (lines 147-149); `selectedIndex` reset in `show()` and clamped after purchase |
| `src/ui/MetaShopUI.ts` | `selectedIndex`, `purchasableIds[]`, `update(input)`, visual highlight on selected card | VERIFIED | Both fields present (lines 11-13); `update()` method (line 65); `purchasableIds` rebuilt each `render()` (line 111-121); white border + `0 0 16px #fff` box-shadow on selected card (lines 124-127); cursor clamped (lines 212-213) |
| `src/states/GameOverState.ts` | Dynamic hint text based on activeInputDevice | VERIFIED | `lastHintDevice` field; `enter()` sets initial hints; `update()` detects device change and updates DOM elements by `hint-restart`, `hint-menu`, `hint-continue` IDs; A=Space restart, B=Escape menu, Y=KeyC continue |
| `src/states/TitleState.ts` | Dynamic nav hint text based on activeInputDevice | VERIFIED | `_renderMenu()` reads `this.input.activeInputDevice === 'gamepad'` inline; `metaShopUI.update(this.input)` called in metaShopUI guard (line 98) |
| `src/states/PausedState.ts` | Dynamic resume hint text based on activeInputDevice | VERIFIED | `lastHintDevice` tracking; `id="hint-resume"` on hint paragraph (line 28); `update()` swaps text; Space (A button) added as third resume condition (line 73) |

---

### Key Link Verification

**Plan 07-01 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `InputManager.ts` | `navigator.getGamepads()` | `_pollGamepad()` called from `clearJustPressed()` | VERIFIED | `clearJustPressed()` line 99: `this._pollGamepad()`; `_pollGamepad()` line 173: `navigator.getGamepads()` |
| `InputManager.ts` | `GamepadToast.ts` | `toast.show()` in connect/disconnect handlers | VERIFIED | Line 133: `this.toast?.show(...)` on connect; line 156: `this.toast?.show('CONTROLLER DISCONNECTED', 'disconnect')` on disconnect |
| `InputManager.ts` | `heldKeys/justPressedKeys` | Gamepad button/stick state synthesized into existing Sets | VERIFIED | Button loop: `justPressedKeys.add(code)` on rising edge, `heldKeys.add(code)` while held, `heldKeys.delete(code)` on release (lines 188-197); stick synthesis in `_synthesizeStick()` adds/deletes Arrow keys |
| `Game.ts` | `InputManager.ts` | `initGamepad(hudRoot)` called in `Game.init()` | VERIFIED | Game.ts line 66: `this.input.initGamepad(hudRoot)` — after hudRoot assignment on line 62 |

**Plan 07-02 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `PlayingState.ts` | `ShopUI.ts` | `ctx.shopUI.update(input)` called before `clearJustPressed()` in shop-open guard | VERIFIED | PlayingState.ts lines 99-102: update() called on line 100, clearJustPressed() on line 101 |
| `TitleState.ts` | `MetaShopUI.ts` | `metaShopUI.update(this.input)` called in metaShopUI-visible guard | VERIFIED | TitleState.ts lines 97-100: update() called on line 98, clearJustPressed() on line 99 |
| `GameOverState.ts` | `InputManager.ts` | `this.input.activeInputDevice` read for dynamic hint strings | VERIFIED | Lines 57, 95-96: device read at enter() and on each update() frame to detect transitions |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PAD-01 | 07-01 | Player can move ship with left analog stick with deadzone filtering | SATISFIED | `_synthesizeStick()` implements radial deadzone 0.20; binary threshold synthesizes ArrowLeft/ArrowRight into heldKeys |
| PAD-02 | 07-01 | Player can shoot with A button and pause with Start button | SATISFIED | `_buttonToCode()`: A(0)->Space, RB(5)->Space, Start(9)->KeyP; WeaponSystem reads `isDown('Space')`, PausedState reads `justPressed('KeyP')` |
| PAD-03 | 07-02 | Player can navigate all menus and shop UI with gamepad | SATISFIED | ShopUI.update() + MetaShopUI.update() with cursor selection; TitleState/GameOverState/PausedState dynamic hints + A/B button handling |
| PAD-04 | 07-01 | Game displays notification on gamepad connect/disconnect | SATISFIED | GamepadToast.show() called in both `gamepadconnected` and `gamepaddisconnected` handlers with controller name |
| PAD-05 | 07-01 | Game gracefully falls back to keyboard when gamepad disconnects mid-game | SATISFIED | `_clearSynthesizedKeys()` removes all synthesized keys; `activeInputDevice` reverts to 'keyboard'; keyboard listeners unaffected |

No orphaned requirements — all 5 PAD requirements declared in ROADMAP traceability are covered by plans 07-01 and 07-02.

---

### Anti-Patterns Found

No blockers or warnings found. Specific checks:

- `GamepadToast.ts`: No TODO/FIXME, no placeholder returns, substantive implementation (103 lines)
- `InputManager.ts`: No TODO/FIXME; `return null` in `_buttonToCode()` is correct design (unmapped buttons), not a stub
- `ShopUI.ts`: No TODO/FIXME, no empty handlers; update() has real logic
- `MetaShopUI.ts`: No TODO/FIXME; `render()` is a full implementation, not a stub
- `GameOverState.ts`: No placeholder patterns; dynamic hint logic substantive
- `PausedState.ts`: No placeholder patterns; Space as resume is real logic, not stub

---

### Human Verification Required

The following behaviors are correct in code but require a physical gamepad to fully confirm:

**1. Analog stick movement with deadzone**

**Test:** Plug in a gamepad. Move the left analog stick from rest to various angles and speeds.
**Expected:** Ship moves left/right at the same binary speed as keyboard (not proportional). No phantom movement when stick is centered. Diagonal stick input still allows left/right movement.
**Why human:** Radial deadzone at 0.20 and binary threshold are implemented correctly in code, but live feel with real hardware cannot be verified statically.

**2. Button mapping verification (A=fire, Start=pause)**

**Test:** Press A button during gameplay; press Start to pause.
**Expected:** Ship fires on A (same as Space). Pause overlay appears on Start.
**Why human:** The button index table (0=A, 9=Start) is standard but real browser behavior with specific hardware must be confirmed.

**3. Disconnect fallback — no phantom drift**

**Test:** Hold left on the analog stick, then unplug the gamepad.
**Expected:** Ship stops moving immediately. Keyboard arrow keys respond normally.
**Why human:** `_clearSynthesizedKeys()` is verified in code, but the real timing of the `gamepaddisconnected` event and heldKeys cleanup requires live testing.

**4. Non-standard controller warning**

**Test:** Connect a controller that the browser identifies as non-standard mapping (e.g. some generic USB pads in Firefox).
**Expected:** Cyan connect toast appears, then after ~100ms an amber warning toast appears.
**Why human:** The `gamepad.mapping !== 'standard'` branch exists in code; needs a controller that actually triggers it.

**5. Shop D-pad cursor navigation**

**Test:** Enter gameplay, clear a wave to open the shop, use D-pad up/down to move the cursor highlight through items, press A to purchase.
**Expected:** Cyan left-border highlight moves through items; A purchases the highlighted item; B closes the shop.
**Why human:** ShopUI.update() is called in the correct guard order, but live cursor UX and visual highlight need in-game confirmation.

**6. MetaShopUI D-pad navigation across card grid**

**Test:** From TitleState, open UPGRADES (U/A), navigate cards with D-pad.
**Expected:** White-glow highlight moves across purchasable cards in DOM render order; A purchases the highlighted card.
**Why human:** `purchasableIds` flat list ordering and the visual card highlight requires rendering confirmation.

**7. Dynamic hint text switching**

**Test:** On the GameOver screen, switch from gamepad to keyboard by pressing a keyboard key.
**Expected:** Hint text switches from "A: RESTART / B: MENU" to "PRESS R TO RESTART / PRESS M FOR MENU" without re-rendering the overlay.
**Why human:** DOM id lookups and textContent replacement are correct in code, but the real-time switching experience requires live input device swapping.

---

## Gaps Summary

No gaps found. All 7 observable truths are VERIFIED, all artifacts exist with substantive implementations, and all key links are wired correctly. TypeScript compiles clean (zero errors). All 5 phase requirements (PAD-01 through PAD-05) are satisfied with concrete code evidence.

The remaining items are human-verification items that require physical gamepad hardware — they are flagged because the behavior is correct in code but cannot be confirmed statically. None of these block phase completion.

---

*Verified: 2026-03-07*
*Verifier: Claude (gsd-verifier)*
