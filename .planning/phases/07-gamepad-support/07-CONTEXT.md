# Phase 7: Gamepad Support - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Controller input synthesized into existing input layer so players with a gamepad can play the complete game without touching the keyboard. Covers analog stick movement, button mapping, menu/shop navigation, connect/disconnect notifications, and graceful keyboard fallback. No button remapping UI (out of scope). No analog aim/right stick (out of scope — fixed horizontal movement is core design).

</domain>

<decisions>
## Implementation Decisions

### Analog Movement Feel
- Binary threshold: stick past deadzone = full speed, same as keyboard. No proportional speed — keeps gameplay parity between input methods and matches arcade heritage
- Diagonal input: always read the horizontal component. Pushing stick at 45 degrees still moves the ship — players shouldn't have to push perfectly sideways
- D-pad also works for ship movement during gameplay (both stick and D-pad supported)

### Button Mapping
- A (Cross) = fire + confirm in menus
- B (Circle) = back/cancel in menus
- Start = pause (in-game)
- RB (R1) = alternate fire button alongside A — ergonomic shoulder position for rapid shooting
- D-pad = menu navigation (up/down to move selection, left/right where applicable)
- Left stick = also works for menu navigation (both D-pad and stick supported in menus)

### Notification Style
- Bottom-center toast position — non-intrusive, away from HUD (score/lives at top)
- Neon cyberpunk aesthetic: glowing cyan border, monospace Courier New font, text-shadow glow — matches existing HUD and overlay styling
- Fade in 0.3s, hold ~2s, fade out 0.5s
- Subtle UI chime SFX on connect/disconnect — reuse existing menuNav SFX or a simple variant
- Show controller name if available (e.g., "Xbox Wireless Controller")

### Disconnect Behavior
- Toast only on disconnect — no auto-pause. Game continues without crashing, keyboard input takes over immediately (PAD-05)
- If gamepad reconnects: show connect toast, gamepad works again seamlessly

### Shop & Menu Gamepad Navigation
- Between-wave ShopUI: D-pad cursor highlight moves between items, A to purchase, B to close. Keyboard digit-keys (1-9) still work alongside
- MetaShopUI: same D-pad cursor pattern — consistent gamepad navigation across all UIs (required by PAD-03)
- GameOver screen: A = Restart, B = Return to Menu, Y = Continue (if available). Dynamic text hints

### Input Prompt Switching
- Dynamic switching: show gamepad button hints when gamepad was last input, keyboard hints when keyboard was last input
- Updates in real-time when player switches between input devices
- Affects: Title screen nav hints, GameOver action hints, Shop close hints, Pause resume hint

### Claude's Discretion
- Exact deadzone radius (0.15-0.25 range, standard ~0.20)
- Gamepad polling implementation (requestAnimationFrame vs game loop integration)
- How to synthesize gamepad input into existing InputManager heldKeys/justPressedKeys
- Toast DOM implementation details (absolute positioning, z-index)
- D-pad cursor highlight visual treatment in ShopUI/MetaShopUI
- Non-standard controller compatibility warning approach (PAD-05)
- SFX asset choice for connect/disconnect chime

</decisions>

<specifics>
## Specific Ideas

- Movement should feel identical to keyboard — binary threshold preserves the classic arcade snap-movement feel
- ShopUI highlight cursor should make the currently selected item visually obvious (border glow or arrow indicator)
- Controller name in toast adds a nice touch of polish (e.g., "CONTROLLER CONNECTED — Xbox Wireless Controller")
- GameOver screen dynamically showing "A: RESTART" vs "R: RESTART" based on last input is a modern PC game convention

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InputManager`: Simple `heldKeys`/`justPressedKeys` Sets with `isDown()`, `justPressed()`, `clearJustPressed()` — gamepad polling can synthesize directly into these Sets
- `audioManager.playSfx('menuNav')`: existing menu navigation SFX — can reuse for connect/disconnect chime
- `HUD.showOverlay()` / `hideOverlay()`: DOM overlay pattern — toast can use similar approach or a dedicated toast element

### Established Patterns
- All game states (TitleState, PlayingState, PausedState, GameOverState) read input via `input.justPressed()` and `input.isDown()` — if gamepad synthesizes into these, all states work automatically for basic input
- ShopUI and MetaShopUI have their own `window.addEventListener('keydown')` handlers — gamepad nav needs to either synthesize keyboard events or add parallel gamepad-aware selection logic
- PlayingState reads `ArrowLeft`/`ArrowRight`/`KeyA`/`KeyD` for movement and `Space` for fire — these are the keycodes gamepad should synthesize

### Integration Points
- `InputManager.constructor()`: add gamepad polling setup here
- `InputManager.clearJustPressed()`: poll gamepad state here (called once per fixed update step)
- `ShopUI`: needs D-pad cursor selection state + highlight rendering
- `MetaShopUI`: needs D-pad cursor selection state + highlight rendering
- `GameOverState.enter()`: needs dynamic button hint text based on active input device
- `TitleState._renderMenu()`: needs dynamic nav hint text based on active input device
- `PausedState.enter()`: needs dynamic resume hint text

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-gamepad-support*
*Context gathered: 2026-03-07*
