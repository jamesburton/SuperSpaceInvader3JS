# Phase 7: Gamepad Support - Research

**Researched:** 2026-03-07
**Domain:** Web Gamepad API (browser-native, no third-party library)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Analog Movement Feel**
- Binary threshold: stick past deadzone = full speed, same as keyboard. No proportional speed.
- Diagonal input: always read the horizontal component. Pushing stick at 45 degrees still moves the ship.
- D-pad also works for ship movement during gameplay.

**Button Mapping**
- Button 0 (A / Cross) = fire + confirm in menus
- Button 1 (B / Circle) = back/cancel in menus
- Button 9 (Start / Menu) = pause (in-game)
- Button 5 (RB / R1) = alternate fire button
- D-pad (buttons 12-15) = menu navigation; left stick also works for menu navigation
- Left stick = ship movement

**Notification Style**
- Bottom-center toast, glowing cyan border, Courier New monospace, text-shadow glow
- Fade in 0.3s, hold ~2s, fade out 0.5s
- Reuse existing `menuNav` SFX for connect/disconnect chime
- Show controller name in toast (from `gamepad.id`)

**Disconnect Behavior**
- Toast only on disconnect, no auto-pause
- Game continues without crashing, keyboard input takes over immediately
- On reconnect: show connect toast, gamepad works again

**Shop & Menu Gamepad Navigation**
- ShopUI: D-pad cursor highlight between items, A to purchase, B to close
- MetaShopUI: same D-pad cursor pattern
- GameOver screen: A = Restart, B = Return to Menu, Y = Continue (if available)
- Dynamic button hint text (show gamepad hints vs keyboard hints based on last-used device)

**Input Prompt Switching**
- Show gamepad button hints when gamepad was last input
- Show keyboard hints when keyboard was last input
- Updates in real-time when player switches devices
- Affects: TitleState nav hints, GameOverState action hints, ShopUI close hints, PausedState resume hint

### Claude's Discretion
- Exact deadzone radius (0.15–0.25 range, standard ~0.20)
- Gamepad polling implementation (requestAnimationFrame vs game loop integration)
- How to synthesize gamepad input into existing InputManager heldKeys/justPressedKeys
- Toast DOM implementation details (absolute positioning, z-index)
- D-pad cursor highlight visual treatment in ShopUI/MetaShopUI
- Non-standard controller compatibility warning approach (PAD-05)
- SFX asset choice for connect/disconnect chime

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAD-01 | Player can move ship with left analog stick with deadzone filtering | Gamepad API axes[0]/axes[1], radial deadzone algorithm, binary threshold synthesis into heldKeys |
| PAD-02 | Player can shoot with A button and pause with Start button | Standard button indices 0 (A) and 9 (Start), justPressed synthesis via prev/curr frame diff |
| PAD-03 | Player can navigate all menus and shop UI with gamepad | D-pad buttons 12-15, cursor state in ShopUI/MetaShopUI, GameOverState dynamic hints |
| PAD-04 | Game displays notification on gamepad connect/disconnect | gamepadconnected / gamepaddisconnected events, toast DOM element, CSS fade animation |
| PAD-05 | Game gracefully falls back to keyboard when gamepad disconnects mid-game | gamepaddisconnected clears synthesized heldKeys, non-standard detection via gamepad.mapping |
</phase_requirements>

---

## Summary

The Web Gamepad API is a browser-native API with wide support (available since March 2017, baseline widely available). It requires polling via `navigator.getGamepads()` — buttons and axes produce no DOM events. The API provides `gamepadconnected` and `gamepaddisconnected` window events for connect/disconnect notifications.

The integration strategy for this codebase is to synthesize gamepad state directly into `InputManager`'s existing `heldKeys` and `justPressedKeys` Sets. The game loop already drains `justPressedKeys` via `clearJustPressed()` once per fixed step; gamepad polling slots into the same `clearJustPressed()` call, reading the current gamepad snapshot and diffing it against the previous frame's state to generate just-pressed edges. All existing game states automatically benefit from gamepad input with no state-layer changes for basic input. Only the shop UIs and GameOver screen need additional cursor-selection logic.

The key implementation split across two plans is: (1) `InputManager` gamepad polling + radial deadzone + synthesis into `heldKeys`/`justPressedKeys` + toast notification DOM element + connect/disconnect events, and (2) `ShopUI`/`MetaShopUI` D-pad cursor state + `GameOverState`/`TitleState`/`PausedState` dynamic hint text.

**Primary recommendation:** Implement gamepad support entirely within InputManager using the browser-native Gamepad API. No third-party gamepad library is needed — the API surface is small, the project has no existing wrapper to conflict with, and adding a library would be disproportionate to the feature scope.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Gamepad API | Browser-native (no version) | Polling controller state, connect/disconnect events | Zero dependencies, Baseline widely available (2017+), already available in Chrome/Firefox/Safari |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | No supporting library needed; Gamepad API surface is small enough to use directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Gamepad API | gamepad.js, joypad.js | Third-party wrappers add bundle weight and an extra dependency for minimal gain; project already hand-rolls all input |
| Raw Gamepad API | mmk.gamepad (TypeScript) | Active GitHub project but overkill for a single controller type; mapping tables are already known |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files or directories required beyond the new `GamepadToast` UI element inline in InputManager or a dedicated `src/ui/GamepadToast.ts`.

```
src/
├── core/
│   └── InputManager.ts        # ADD gamepad polling, deadzone, synthesis, last-input tracking
├── ui/
│   ├── GamepadToast.ts        # NEW: toast DOM element for connect/disconnect (small, standalone)
│   ├── ShopUI.ts              # ADD cursor selection state + D-pad navigation support
│   ├── MetaShopUI.ts          # ADD cursor selection state + D-pad navigation support
│   └── HUD.ts                 # No change needed
├── states/
│   ├── GameOverState.ts       # ADD dynamic button hints based on activeInputDevice
│   ├── TitleState.ts          # ADD dynamic nav hints based on activeInputDevice
│   └── PausedState.ts         # ADD dynamic resume hint based on activeInputDevice
```

### Pattern 1: Gamepad Polling in clearJustPressed()

**What:** `clearJustPressed()` is already called once per fixed update step after all input reads. Gamepad polling belongs here — diff previous frame buttons against current frame buttons to generate just-pressed edges, then synthesize into `heldKeys`/`justPressedKeys`.

**When to use:** Always. The existing contract of "clearJustPressed() is called once per step" is preserved. No new polling loop needed — the game loop already ticks at fixed intervals.

**Why this is better than rAF polling:** The game already has a fixed-step loop driven by `setAnimationLoop`. Adding a separate `requestAnimationFrame` for gamepad polling would create a second update cadence that races the game loop, causing inconsistent input frame counts. Polling inside `clearJustPressed()` keeps everything on the same clock.

**Example:**
```typescript
// Source: MDN Gamepad API (https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)

// In InputManager — poll once per fixed step (called from clearJustPressed)
private pollGamepad(): void {
  const gamepads = navigator.getGamepads();
  // Use the first connected gamepad (index from gamepadconnected event)
  const gp = this.activeGamepadIndex !== null ? gamepads[this.activeGamepadIndex] : null;
  if (!gp) {
    // Clear any synthesized held keys so they don't stick
    this.clearSynthesizedKeys();
    return;
  }

  const prev = this.prevGamepadButtons;
  const curr = gp.buttons;

  // Synthesize button just-pressed edges
  for (let i = 0; i < curr.length; i++) {
    const wasPressed = prev[i] ?? false;
    const isPressed = curr[i].pressed;
    if (isPressed && !wasPressed) {
      this.justPressedKeys.add(this.gamepadButtonToCode(i, gp));
    }
    if (isPressed) {
      this.heldKeys.add(this.gamepadButtonToCode(i, gp));
    } else {
      this.heldKeys.delete(this.gamepadButtonToCode(i, gp));
    }
    prev[i] = isPressed;
  }

  // Synthesize left stick as ArrowLeft/ArrowRight held keys (binary threshold)
  this.synthesizeStick(gp.axes[0], gp.axes[1]);
}
```

### Pattern 2: Radial Deadzone (Scaled)

**What:** Check magnitude of the 2D stick vector. If below threshold, treat as zero. For this game's binary-threshold movement (stick past deadzone = full speed), the scaled variant is not needed — we only care whether magnitude exceeds the threshold, not the scaled output value.

**When to use:** For the analog stick axes[0] (horizontal) and axes[1] (vertical).

**Example:**
```typescript
// Source: Minimuino/thumbstick-deadzones (https://github.com/Minimuino/thumbstick-deadzones)
// Deadzone radius of 0.20 is a safe default for most controllers

private static readonly DEADZONE = 0.20;

private synthesizeStick(axisX: number, axisY: number): void {
  const magnitude = Math.sqrt(axisX * axisX + axisY * axisY);

  if (magnitude < InputManager.DEADZONE) {
    // Within deadzone — treat stick as centered, clear synthesized movement
    this.heldKeys.delete('ArrowLeft');
    this.heldKeys.delete('ArrowRight');
    return;
  }

  // Binary: stick outside deadzone → full-speed movement based on horizontal component
  if (axisX < 0) {
    this.heldKeys.add('ArrowLeft');
    this.heldKeys.delete('ArrowRight');
  } else {
    this.heldKeys.add('ArrowRight');
    this.heldKeys.delete('ArrowLeft');
  }
}
```

**D-pad for movement:** D-pad buttons 12 (Up), 13 (Down), 14 (Left), 15 (Right) are already captured in the button polling loop. Map button 14 → `ArrowLeft`, button 15 → `ArrowRight` in `gamepadButtonToCode()`.

### Pattern 3: Button-to-KeyCode Mapping

**What:** Convert standard gamepad button indices to the key codes the game already reads via `isDown()` / `justPressed()`. This is the synthesis layer — all existing state logic stays unchanged.

**Mapping table (Standard Gamepad layout):**

| Button Index | Xbox Label | PS Label | Synthesize as |
|---|---|---|---|
| 0 | A | Cross | `Space` (fire + menu confirm) |
| 1 | B | Circle | `Escape` (back/cancel) |
| 2 | X | Square | (unused v1.1) |
| 3 | Y | Triangle | `KeyC` (continue on GameOver) |
| 4 | LB | L1 | (unused v1.1) |
| 5 | RB | R1 | `Space` (alternate fire — also maps to Space so WeaponSystem fires) |
| 6 | LT | L2 | (unused v1.1) |
| 7 | RT | R2 | (unused v1.1) |
| 8 | View/Select | Share | (unused v1.1) |
| 9 | Menu/Start | Options | `KeyP` (pause) |
| 10 | L3 (stick click) | L3 | (unused v1.1) |
| 11 | R3 (stick click) | R3 | (unused v1.1) |
| 12 | D-pad Up | D-pad Up | `ArrowUp` (menu nav up) |
| 13 | D-pad Down | D-pad Down | `ArrowDown` (menu nav down) |
| 14 | D-pad Left | D-pad Left | `ArrowLeft` (movement + menu nav) |
| 15 | D-pad Right | D-pad Right | `ArrowRight` (movement + menu nav) |
| 16 | Xbox/Guide | PS button | (unused v1.1) |

**Source:** W3C Standard Gamepad specification and [Adam Jones blog post](https://adamjones.me/blog/gamepad-mapping/) — HIGH confidence.

**Note on axes[1] (vertical):** Left stick vertical is not needed for ship movement (horizontal only) but IS needed for menu navigation. Synthesize axes[1] < -DEADZONE as `ArrowUp` and axes[1] > DEADZONE as `ArrowDown` into heldKeys + justPressed edges.

### Pattern 4: Connect/Disconnect Event Handling

**What:** Listen for `gamepadconnected` / `gamepaddisconnected` on `window`. Store the active gamepad index. On connect: set `activeGamepadIndex`, show toast. On disconnect: clear `activeGamepadIndex`, clear synthesized held keys (so the ship doesn't drift), show toast.

**Example:**
```typescript
// Source: MDN Gamepad API (https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)

// In InputManager constructor:
window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
  this.activeGamepadIndex = e.gamepad.index;
  this.lastActiveInput = 'gamepad';
  this.toast.show(`CONTROLLER CONNECTED — ${this._truncateId(e.gamepad.id)}`, 'connect');
  this._checkCompatibility(e.gamepad);
  audioManager.playSfx('menuNav'); // reuse existing SFX
});

window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
  if (this.activeGamepadIndex === e.gamepad.index) {
    this.activeGamepadIndex = null;
    this.clearSynthesizedKeys();
    this.lastActiveInput = 'keyboard'; // immediate fallback
  }
  this.toast.show(`CONTROLLER DISCONNECTED`, 'disconnect');
  audioManager.playSfx('menuNav');
});
```

**CRITICAL:** After setting `activeGamepadIndex = null` on disconnect, `clearSynthesizedKeys()` must remove ALL gamepad-synthesized codes from `heldKeys` (ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Space, Escape, KeyP, KeyC). If these are not cleared, the ship will drift and menus will malfunction. Keyboard input takes over immediately because it writes to the same `heldKeys`/`justPressedKeys` Sets.

### Pattern 5: Non-Standard Controller Detection (PAD-05)

**What:** Check `gamepad.mapping` on connect. If not `"standard"`, show a compatibility warning toast instead of the normal connect toast.

**When to use:** On every `gamepadconnected` event.

**Example:**
```typescript
private _checkCompatibility(gp: Gamepad): void {
  if (gp.mapping !== 'standard') {
    // Replace connect toast with warning (or show both — warning after connect)
    this.toast.show(
      'CONTROLLER MAY NOT BE COMPATIBLE — standard layout not detected',
      'warning'
    );
  }
}
```

**What "non-standard" means in practice:** Generic/knockoff controllers, some PS controllers in Firefox on Linux, very old DirectInput-only devices. The warning tells the player something may be wrong rather than silently mapping incorrect buttons.

### Pattern 6: Last-Active-Input Tracking for Dynamic Hints

**What:** Track which input device was last used (`'keyboard'` | `'gamepad'`). Update on: any key pressed → `'keyboard'`; any gamepad button/axis active → `'gamepad'`. Expose via `InputManager.activeInputDevice`.

**Integration points:**
- `TitleState._renderMenu()` — replaces "ARROW KEYS TO NAVIGATE | ENTER TO SELECT" with gamepad equivalents
- `GameOverState.enter()` — replaces "PRESS R TO RESTART / PRESS M FOR MENU" with "A: RESTART / B: MENU"
- `PausedState.enter()` — replaces "PRESS ESC or P TO RESUME" with "A: RESUME"
- `ShopUI._render()` — replaces "1–9 to buy | ESC to close" with "D-PAD to select | A to buy | B to close"

**Implementation note:** `TitleState._renderMenu()` already re-renders on every navigation action. On each re-render, read `input.activeInputDevice` and branch the hint string. Similarly `GameOverState.enter()` runs once — render it with the current hint text at that moment, which is fine since the player just transitioned from gameplay (gamepad or keyboard).

### Pattern 7: Shop UI Cursor Selection State

**What:** Both `ShopUI` and `MetaShopUI` currently use keyboard digit shortcuts and mouse clicks. For gamepad: maintain a `selectedIndex` integer. D-pad Up/Down move the cursor. A purchases. B closes.

**ShopUI integration approach:** `ShopUI` already re-renders after each purchase via `_render()`. Add `selectedIndex: number` private field. Expose a `navigateGamepad(direction: 'up' | 'down' | 'confirm' | 'cancel')` method that InputManager or PlayingState can call when the shop is visible and gamepad navigation input fires.

**Alternative:** Since the game loop already gates shop-open state in PlayingState (`if (ctx.shopUI.isVisible)`) and clears justPressed immediately, the cleanest integration is: in that shop-open guard in PlayingState, poll `justPressed` codes from gamepad synthesis and call `shopUI.navigateGamepad()`. Since gamepad synthesizes into the same `justPressedKeys`, the guard already blocks other game logic — the shop just needs to check those keys itself.

**Actually simplest approach:** Since gamepad synthesizes `ArrowUp`/`ArrowDown` into `justPressedKeys`, and `ShopUI`'s `keyHandler` already listens on `window.addEventListener('keydown', ...)`, the synthesized key codes won't fire DOM events — they only exist in `justPressedKeys`. Therefore ShopUI needs to either: (a) also check `justPressedKeys` from InputManager via a passed reference, or (b) have a separate `update(input: InputManager)` method called from PlayingState's shop-open guard. Option (b) is cleaner — add `update(input: InputManager): void` to ShopUI that reads justPressed for navigation and delegates to internal cursor logic.

**MetaShopUI:** Same pattern. TitleState already blocks all input when metaShopUI is visible. TitleState.update() can call `this.metaShopUI.update(this.input)` when visible.

### Anti-Patterns to Avoid

- **Synthesizing `keydown` DOM events:** The web.dev doodle article mentions this approach, but firing synthetic `KeyboardEvent` via `window.dispatchEvent` is fragile (browsers may ignore or partially honor them for security reasons in some contexts, and they bypass the InputManager's dedup logic). Synthesizing directly into `heldKeys`/`justPressedKeys` Sets is the correct approach for this codebase.
- **Polling on a separate rAF loop:** Would race the game's fixed-step loop and produce double inputs on some frames.
- **Caching `navigator.getGamepads()` result across frames:** The returned array is a snapshot at the time of call, but the `Gamepad` objects inside it are live-updated by the browser. Always call `navigator.getGamepads()` fresh each poll cycle.
- **Forgetting to clear synthesized keys on disconnect:** Results in permanent phantom drift. This is the #1 gamepad bug in browser games.
- **Using `gamepad.timestamp` for detecting new frames:** Firefox does not support `Gamepad.timestamp`. Always just poll unconditionally each fixed step.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Controller mapping normalization | Custom per-controller mapping tables | Rely on `gamepad.mapping === "standard"` + warn on non-standard | Browsers handle Xbox/PS normalization; building mapping tables for 100+ controllers is futile |
| Gamepad library | Third-party wrapper | Browser Gamepad API directly | No value added for this project scope |
| Haptic feedback | Custom vibration wrapper | (deferred to v1.2 per REQUIREMENTS.md) | PAD-06 is explicitly out of scope for v1.1 |

**Key insight:** The Gamepad API's "standard" mapping means Chrome and Edge handle Xbox, PS4, PS5, and most common controllers automatically. The only controllers that fall through are obscure/knockoff devices — and for those, showing a compatibility warning is the correct and proportionate response.

---

## Common Pitfalls

### Pitfall 1: Firefox Security Gate — No Gamepad Until User Interaction

**What goes wrong:** `gamepadconnected` never fires in Firefox even with a controller plugged in at page load. The Gamepad API is gated behind a user gesture in Firefox to prevent fingerprinting.

**Why it happens:** Firefox explicitly requires the user to press a button on the controller while the page is focused before exposing the device. Chrome does not have this restriction.

**How to avoid:** No code change needed — this is browser behavior. The toast system handles it correctly: the user presses a button (which also triggers `gamepadconnected`), then the toast fires. The game shouldn't proactively check for gamepads at startup.

**Warning signs:** If you call `navigator.getGamepads()` on page load and always get `[null, null, null, null]` in Firefox — that's expected.

### Pitfall 2: Phantom Drift on Disconnect

**What goes wrong:** When `gamepaddisconnected` fires, any synthesized keys that were `heldKeys` remain held forever. The ship slides to one side or the game remains "paused" with a phantom key held.

**Why it happens:** Keyboard listeners rely on `keyup` to release held keys. Gamepad held-key synthesis adds to `heldKeys` but there is no corresponding "key up" event on disconnect.

**How to avoid:** In the `gamepaddisconnected` handler, call `clearSynthesizedKeys()` which removes every code that could have been synthesized from gamepad: `['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Escape', 'KeyP', 'KeyC']`.

**Warning signs:** Ship drifting after unplugging controller, or game stuck in pause after disconnect.

### Pitfall 3: Double-Input on First Frame After Reconnect

**What goes wrong:** When a gamepad reconnects and the player is already holding a button, the very first poll sees `curr[i].pressed = true` and `prev[i] = false` (prev was reset on disconnect), generating a spurious `justPressed` edge.

**Why it happens:** `prevGamepadButtons` is cleared/reset on disconnect, so on reconnect the first diff treats every held button as newly pressed.

**How to avoid:** On reconnect (`gamepadconnected`), initialize `prevGamepadButtons` from the current gamepad state immediately so the first poll cycle has an accurate baseline: `this.prevGamepadButtons = Array.from(e.gamepad.buttons).map(b => b.pressed)`.

**Warning signs:** Menu item selects itself instantly when controller reconnects.

### Pitfall 4: Multiple Controllers — Wrong Index

**What goes wrong:** With two controllers connected, `navigator.getGamepads()` returns both. Polling index 0 always may read from the wrong controller after one disconnects and re-connects at a different index.

**Why it happens:** Controller indices are stable per session but a disconnect/reconnect can change the index.

**How to avoid:** Store `activeGamepadIndex` from the `gamepadconnected` event (`e.gamepad.index`). Update it if a new `gamepadconnected` fires for a different controller. This project targets the first connected gamepad, so last-connected-wins is acceptable.

**Warning signs:** Input stops working after unplugging and replugging a controller.

### Pitfall 5: ShopUI Cursor Out-of-Bounds

**What goes wrong:** If a purchase causes the item count to decrease (e.g., item is one-time only), the cursor `selectedIndex` may point past the end of the new items array.

**Why it happens:** ShopUI re-renders after each purchase but selectedIndex is not clamped.

**How to avoid:** After each purchase, clamp: `this.selectedIndex = Math.min(this.selectedIndex, items.length - 1)`. If items becomes empty, hide the shop (already handled by `onCloseFn` when items run out).

### Pitfall 6: `gamepad.id` String Format Is Verbose

**What goes wrong:** The toast shows "045e-02fd-Microsoft X-Box One pad (Firmware 2015)" instead of a readable controller name.

**Why it happens:** `gamepad.id` includes USB vendor/product IDs and driver name in a machine-readable format like `XXXX-XXXX-Driver Name`.

**How to avoid:** Truncate to the last part after the second dash, or strip the hex codes. A simple regex: `gp.id.replace(/^[\da-f]+-[\da-f]+-/i, '').slice(0, 40)` gives a human-readable name. Cap at 40 chars to avoid overflow.

---

## Code Examples

Verified patterns from official sources:

### Full InputManager Gamepad Integration Skeleton
```typescript
// Source: MDN Gamepad API + project pattern synthesis

export class InputManager {
  private readonly heldKeys: Set<string> = new Set();
  private readonly justPressedKeys: Set<string> = new Set();

  // Gamepad state
  private activeGamepadIndex: number | null = null;
  private prevGamepadButtons: boolean[] = [];
  public activeInputDevice: 'keyboard' | 'gamepad' = 'keyboard';

  // Codes synthesized from gamepad (must be cleared on disconnect)
  private static readonly GAMEPAD_CODES = [
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'Escape', 'KeyP', 'KeyC',
  ];

  private static readonly DEADZONE = 0.20;

  constructor(private readonly toast: GamepadToast) {
    // Keyboard listeners (existing)
    window.addEventListener('keydown', (e) => {
      this.activeInputDevice = 'keyboard';
      if (!this.heldKeys.has(e.code)) this.justPressedKeys.add(e.code);
      this.heldKeys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
    });

    // Gamepad connect/disconnect
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.activeGamepadIndex = e.gamepad.index;
      this.prevGamepadButtons = e.gamepad.buttons.map(b => b.pressed);
      this.activeInputDevice = 'gamepad';
      const name = InputManager._shortId(e.gamepad.id);
      this.toast.show(`CONTROLLER CONNECTED — ${name}`, 'connect');
      if (e.gamepad.mapping !== 'standard') {
        this.toast.show('WARNING: non-standard controller — inputs may be incorrect', 'warning');
      }
      audioManager.playSfx('menuNav');
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null;
        this.prevGamepadButtons = [];
        this.clearSynthesizedKeys();
        this.activeInputDevice = 'keyboard';
      }
      this.toast.show('CONTROLLER DISCONNECTED', 'disconnect');
      audioManager.playSfx('menuNav');
    });
  }

  public clearJustPressed(): void {
    this.justPressedKeys.clear();
    this._pollGamepad(); // poll once per fixed step
  }

  private _pollGamepad(): void {
    if (this.activeGamepadIndex === null) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.activeGamepadIndex];
    if (!gp) return;

    // Track if any gamepad input is active
    const anyActive = gp.buttons.some(b => b.pressed) ||
      Math.abs(gp.axes[0]) > InputManager.DEADZONE ||
      Math.abs(gp.axes[1]) > InputManager.DEADZONE;
    if (anyActive) this.activeInputDevice = 'gamepad';

    const prev = this.prevGamepadButtons;
    for (let i = 0; i < gp.buttons.length; i++) {
      const code = InputManager._buttonToCode(i);
      if (!code) continue;
      const wasPressed = prev[i] ?? false;
      const isPressed = gp.buttons[i].pressed;
      if (isPressed && !wasPressed) this.justPressedKeys.add(code);
      if (isPressed) this.heldKeys.add(code);
      else this.heldKeys.delete(code);
      prev[i] = isPressed;
    }

    // Left stick: synthesize as held arrow keys (binary threshold)
    this._synthesizeStick(gp.axes[0], gp.axes[1]);
  }

  private _synthesizeStick(x: number, y: number): void {
    const mag = Math.sqrt(x * x + y * y);
    if (mag < InputManager.DEADZONE) {
      this.heldKeys.delete('ArrowLeft');
      this.heldKeys.delete('ArrowRight');
      this.heldKeys.delete('ArrowUp');
      this.heldKeys.delete('ArrowDown');
      return;
    }
    // Horizontal: always read — even at 45 degrees
    if (x < 0) { this.heldKeys.add('ArrowLeft'); this.heldKeys.delete('ArrowRight'); }
    else { this.heldKeys.add('ArrowRight'); this.heldKeys.delete('ArrowLeft'); }
    // Vertical: for menu navigation
    if (y < -InputManager.DEADZONE) { this.heldKeys.add('ArrowUp'); this.heldKeys.delete('ArrowDown'); }
    else if (y > InputManager.DEADZONE) { this.heldKeys.add('ArrowDown'); this.heldKeys.delete('ArrowUp'); }
    else { this.heldKeys.delete('ArrowUp'); this.heldKeys.delete('ArrowDown'); }
  }

  private clearSynthesizedKeys(): void {
    for (const code of InputManager.GAMEPAD_CODES) {
      this.heldKeys.delete(code);
    }
  }

  private static _buttonToCode(index: number): string | null {
    switch (index) {
      case 0: return 'Space';       // A = fire / confirm
      case 1: return 'Escape';      // B = back / cancel
      case 3: return 'KeyC';        // Y = continue (GameOver)
      case 5: return 'Space';       // RB = alternate fire
      case 9: return 'KeyP';        // Start = pause
      case 12: return 'ArrowUp';    // D-pad Up
      case 13: return 'ArrowDown';  // D-pad Down
      case 14: return 'ArrowLeft';  // D-pad Left
      case 15: return 'ArrowRight'; // D-pad Right
      default: return null;
    }
  }

  private static _shortId(id: string): string {
    // Strip "XXXX-XXXX-" prefix from gamepad.id for readable name in toast
    return id.replace(/^[\da-f]+-[\da-f]+-/i, '').slice(0, 40) || id.slice(0, 40);
  }

  // Existing methods unchanged
  public isDown(code: string): boolean { return this.heldKeys.has(code); }
  public justPressed(code: string): boolean { return this.justPressedKeys.has(code); }
  public anyKeyJustPressed(): boolean { return this.justPressedKeys.size > 0; }
}
```

### GamepadToast DOM Element
```typescript
// Source: project DOM pattern (matches HUD/ShopUI construction approach)

export class GamepadToast {
  private readonly el: HTMLElement;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'gamepad-toast';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'bottom:24px',
      'left:50%',
      'transform:translateX(-50%)',
      'font-family:"Courier New",monospace',
      'font-size:13px',
      'color:#00ffff',
      'border:1px solid #00ffff',
      'box-shadow:0 0 12px #00ffff,inset 0 0 8px rgba(0,255,255,0.1)',
      'background:rgba(0,0,0,0.85)',
      'padding:8px 20px',
      'letter-spacing:1px',
      'text-shadow:0 0 8px #00ffff',
      'z-index:999',
      'pointer-events:none',
      'white-space:nowrap',
      'opacity:0',
      'transition:opacity 0.3s ease',
    ].join(';');
    hudRoot.appendChild(el);
    this.el = el;
  }

  public show(message: string, _type: 'connect' | 'disconnect' | 'warning'): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.el.textContent = message;
    this.el.style.display = 'block';
    // Trigger fade-in (next microtask to allow display:block to render first)
    requestAnimationFrame(() => { this.el.style.opacity = '1'; });

    this.hideTimeout = setTimeout(() => {
      this.el.style.opacity = '0';
      setTimeout(() => { this.el.style.display = 'none'; }, 500); // wait for fade-out
    }, 2300); // 2.3s hold before fade-out begins (total visible ~3.1s with transitions)
  }
}
```

### ShopUI Gamepad Navigation (update method)
```typescript
// Source: project pattern — matches existing ShopUI structure

// Add to ShopUI class:
private selectedIndex: number = 0;

public update(input: InputManager): void {
  if (!this.isVisible) return;
  const items = this.getItemsFn?.() ?? [];
  if (items.length === 0) return;

  if (input.justPressed('ArrowUp')) {
    this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
    this._render();
    audioManager.playSfx('menuNav');
  }
  if (input.justPressed('ArrowDown')) {
    this.selectedIndex = (this.selectedIndex + 1) % items.length;
    this._render();
    audioManager.playSfx('menuNav');
  }
  if (input.justPressed('Space')) {  // A button
    this._buyItem(items[this.selectedIndex]);
  }
  if (input.justPressed('Escape')) { // B button
    this.onCloseFn?.();
  }
}

// In _render(), add selection highlight to the selected item row:
// isSelected = (i === this.selectedIndex && input.activeInputDevice === 'gamepad')
// apply border-color: '#fff' or left-border glow indicator
```

### Dynamic Hint Text in GameOverState
```typescript
// Source: project pattern — matches existing GameOverState.enter() structure

// Replace hardcoded hints in enter() with device-conditional strings:
const isGamepad = this.input.activeInputDevice === 'gamepad';
const restartHint = isGamepad ? 'A: RESTART' : 'PRESS R TO RESTART';
const menuHint    = isGamepad ? 'B: MENU'    : 'PRESS M FOR MENU';
const continueKey = isGamepad ? 'Y: CONTINUE' : 'PRESS C TO CONTINUE';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `navigator.webkitGetGamepads()` | `navigator.getGamepads()` | ~2016 (spec standardized) | Use standard unprefixed API |
| Polling via separate rAF | Polling in game loop update | Best practice since ~2018 | Keeps input on same clock as physics |
| Synthesizing DOM keyboard events | Direct Set mutation | Project-specific pattern | Avoids browser restrictions on synthetic events |

**Browser support (March 2026):** Gamepad API is Baseline widely available. Chrome 21+, Firefox 29+, Safari 10.1+, Edge 12+. No polyfill needed.

**Deprecated/outdated:**
- `navigator.webkitGetGamepads`: Chrome-prefixed version, long deprecated — use `navigator.getGamepads()`
- `MozGamepadConnected` / `MozGamepadDisconnected`: Firefox-prefixed events, removed — use standard `gamepadconnected`/`gamepaddisconnected`
- Checking `navigator.webkitGamepads` property: removed from Chrome — use feature detection via `'getGamepads' in navigator`

---

## Open Questions

1. **`audioManager` circular dependency in InputManager**
   - What we know: `InputManager` currently has no imports. Adding `audioManager.playSfx('menuNav')` requires importing from `../systems/AudioManager`.
   - What's unclear: Does importing AudioManager from InputManager create a circular import chain? `AudioManager` imports `useMetaStore` but not InputManager — should be safe.
   - Recommendation: Import `audioManager` directly in InputManager. If a circular dependency appears at build time, pass a SFX callback in the constructor instead (`onGamepadEvent?: () => void`).

2. **ShopUI `update()` call site in PlayingState**
   - What we know: PlayingState already has `if (ctx.shopUI.isVisible) { input.clearJustPressed(); return; }` — this guard prevents all gameplay when the shop is open.
   - What's unclear: Should `shopUI.update(input)` be called before or instead of `clearJustPressed()` in that guard?
   - Recommendation: Call `ctx.shopUI.update(input)` inside the guard, before `clearJustPressed()`. The shop consumes justPressed for navigation, then clearJustPressed clears the rest. This keeps the pattern consistent with other input consumers.

3. **MetaShopUI `update()` call site in TitleState**
   - What we know: TitleState.update() has `if (this.metaShopUI?.isVisible) { this.input.clearJustPressed(); return; }`.
   - Recommendation: Same pattern as ShopUI — call `this.metaShopUI.update(this.input)` before `clearJustPressed()`.

4. **Left stick vertical for menu nav causes stick-holding repeats**
   - What we know: `justPressedKeys` edges for ArrowUp/ArrowDown from stick work correctly for single presses. But if the player holds the stick down, `_synthesizeStick` adds `ArrowDown` to `heldKeys` but NOT to `justPressedKeys` (that only fires on the edge). So menu navigation won't auto-scroll when stick is held.
   - Recommendation: This is actually correct behavior matching keyboard UX (keyboard ArrowDown also only nav-triggers on `justPressed`, not `isDown`). No auto-repeat needed for v1.1 — menus have few items.

---

## Sources

### Primary (HIGH confidence)
- [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) — standard button indices, axes layout, event names, browser support
- [MDN Navigator.getGamepads()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads) — polling API, return value shape
- [W3C Gamepad Specification](https://w3c.github.io/gamepad/) — authoritative button index table, mapping property values
- [Adam Jones blog: Standard W3C Gamepad Mapping](https://adamjones.me/blog/gamepad-mapping/) — complete Xbox button index mapping table (verified against W3C spec)

### Secondary (MEDIUM confidence)
- [Minimuino/thumbstick-deadzones](https://github.com/Minimuino/thumbstick-deadzones) — radial deadzone algorithm variants, scaled deadzone explanation
- [web.dev: Jumping the hurdles with the Gamepad API](https://web.dev/doodles-gamepad/) — Firefox security gate, synthetic event pitfall, cross-browser patterns
- [caniuse.com Gamepad API](https://caniuse.com/gamepad) — browser support matrix

### Tertiary (LOW confidence — informational only)
- [gamepad-api-mappings npm package](https://www.npmjs.com/package/gamepad-api-mappings) — mapping tables reference (not used directly; project relies on "standard" mapping)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Gamepad API is browser-native and stable since 2017
- Button index mapping: HIGH — verified against W3C spec and multiple sources
- Architecture (polling in clearJustPressed): HIGH — matches existing game loop pattern
- Deadzone algorithm: HIGH — radial deadzone is universally documented
- Pitfalls: HIGH — phantom drift and Firefox gate are well-documented failure modes
- ShopUI/MetaShopUI navigation pattern: MEDIUM — design is clear but implementation details need validation at code time

**Research date:** 2026-03-07
**Valid until:** 2026-09-07 (Gamepad API is a stable, slow-moving spec)
