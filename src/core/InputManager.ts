import { audioManager } from '../systems/AudioManager';
import { GamepadToast } from '../ui/GamepadToast';

/**
 * InputManager — handles keyboard input and gamepad polling, synthesizing
 * all controller state into the same heldKeys/justPressedKeys Sets that
 * keyboard events write to.
 *
 * This means every game state (TitleState, PlayingState, PausedState, GameOverState)
 * automatically responds to gamepad input with zero state-layer changes.
 *
 * Gamepad polling is driven by clearJustPressed(), called once per fixed update
 * step by the game loop — no separate requestAnimationFrame needed.
 *
 * Usage:
 *   const input = new InputManager();          // constructor (keyboard only)
 *   input.initGamepad(hudRoot);                // call in Game.init() after hudRoot exists
 */
export class InputManager {
  private readonly heldKeys: Set<string> = new Set();
  private readonly justPressedKeys: Set<string> = new Set();

  // ----- Gamepad public state -----
  /** Tracks the last device that produced any input. */
  public activeInputDevice: 'keyboard' | 'gamepad' = 'keyboard';

  // ----- Gamepad private state -----
  private toast: GamepadToast | null = null;
  private activeGamepadIndex: number | null = null;
  private prevGamepadButtons: boolean[] = [];

  // Per-axis edge-detection — track previous stick direction for justPressed synthesis
  private prevStickLeft = false;
  private prevStickRight = false;
  private prevStickUp = false;
  private prevStickDown = false;

  // ----- Constants -----
  /** Radial deadzone radius. Values within this distance from centre are ignored. */
  private static readonly DEADZONE = 0.20;

  /**
   * All key codes that can be synthesized from gamepad input.
   * Used by _clearSynthesizedKeys() on disconnect to prevent phantom drift.
   */
  private static readonly GAMEPAD_CODES: readonly string[] = [
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'Escape', 'KeyP', 'KeyC',
  ];

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.heldKeys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.heldKeys.add(e.code);
      this.activeInputDevice = 'keyboard';
      // Prevent spacebar from scrolling the page
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
    });
  }

  // =========================================================================
  // Public API (unchanged from v1.0 — backward compatible)
  // =========================================================================

  /** True while key (or synthesized gamepad code) is held down */
  public isDown(code: string): boolean {
    return this.heldKeys.has(code);
  }

  /**
   * True only on the frame the key (or button/stick) was first pressed.
   * MUST call clearJustPressed() at end of each game update step.
   */
  public justPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  /**
   * True if any key/button was pressed this step (justPressedKeys is non-empty).
   * Used by LevelBriefingState to dismiss on any keypress.
   * MUST call clearJustPressed() after reading, same as justPressed().
   */
  public anyKeyJustPressed(): boolean {
    return this.justPressedKeys.size > 0;
  }

  /**
   * Call once per fixed update step, AFTER all input reads.
   * Clears justPressedKeys and then polls the gamepad so synthesized
   * inputs are ready for the next step.
   */
  public clearJustPressed(): void {
    this.justPressedKeys.clear();
    this._pollGamepad();
  }

  // =========================================================================
  // Gamepad initialisation (call in Game.init() after hudRoot is available)
  // =========================================================================

  /**
   * Set up gamepad event listeners and create the toast notification element.
   * Must be called after the HUD root element exists in the DOM.
   *
   * Kept separate from the constructor so InputManager can be created in
   * Game.constructor() before the DOM is ready, then wired up in Game.init().
   */
  public initGamepad(hudRoot: HTMLElement): void {
    this.toast = new GamepadToast(hudRoot);

    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.activeGamepadIndex = e.gamepad.index;

      // Pre-populate prevGamepadButtons to match current state.
      // This prevents a "double input" on the very first poll frame (Pitfall 3
      // from research: browser fires gamepadconnected with the button that connected
      // already marked as pressed; treating it as an edge from false→true would
      // synthesize a spurious justPressed).
      this.prevGamepadButtons = Array.from(e.gamepad.buttons, (b) => b.pressed);

      this.activeInputDevice = 'gamepad';

      // Strip raw vendor/product hex prefix from gamepad id to get readable name.
      // Browser id format: "Vendor: XXXX Product: YYYY Name Here (Gamepad)"
      // or "XXXX-XXXX-Name Here". Trim to 40 chars to keep toast compact.
      const name = e.gamepad.id.replace(/^[\da-f]+-[\da-f]+-/i, '').slice(0, 40);

      this.toast?.show(`CONTROLLER CONNECTED \u2014 ${name}`, 'connect');

      // Non-standard mapping warning — delayed 100ms so it appears after connect toast
      if (e.gamepad.mapping !== 'standard') {
        setTimeout(() => {
          this.toast?.show(
            'WARNING: non-standard controller \u2014 inputs may be incorrect',
            'warning',
          );
        }, 100);
      }

      audioManager.playSfx('menuNav');
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null;
        this.prevGamepadButtons = [];
        this._clearSynthesizedKeys();
        this.activeInputDevice = 'keyboard';
      }

      this.toast?.show('CONTROLLER DISCONNECTED', 'disconnect');
      audioManager.playSfx('menuNav');
    });
  }

  // =========================================================================
  // Private gamepad internals
  // =========================================================================

  /**
   * Poll the active gamepad and synthesize its state into heldKeys/justPressedKeys.
   * Called once per fixed step via clearJustPressed(). Never cache the getGamepads()
   * result — the Gamepad object is a snapshot and must be re-fetched each frame.
   */
  private _pollGamepad(): void {
    if (this.activeGamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.activeGamepadIndex];
    if (!gp) return;

    // Detect any active gamepad input for device-tracking
    let anyGamepadInput = false;

    // ----- Button polling -----
    for (let i = 0; i < gp.buttons.length; i++) {
      const isPressed = gp.buttons[i].pressed;
      const wasPressed = this.prevGamepadButtons[i] ?? false;
      const code = InputManager._buttonToCode(i);

      if (code !== null) {
        if (isPressed && !wasPressed) {
          // Rising edge — justPressed
          this.justPressedKeys.add(code);
          anyGamepadInput = true;
        }
        if (isPressed) {
          this.heldKeys.add(code);
          anyGamepadInput = true;
        } else {
          this.heldKeys.delete(code);
        }
      }

      this.prevGamepadButtons[i] = isPressed;
    }

    // ----- Left stick -----
    const axisX = gp.axes[0] ?? 0;
    const axisY = gp.axes[1] ?? 0;
    if (Math.sqrt(axisX * axisX + axisY * axisY) > InputManager.DEADZONE) {
      anyGamepadInput = true;
    }
    this._synthesizeStick(axisX, axisY);

    if (anyGamepadInput) {
      this.activeInputDevice = 'gamepad';
    }
  }

  /**
   * Map standard gamepad button indices to the key codes used by game states.
   * Buttons not in this map return null (ignored).
   *
   * Standard gamepad layout (https://w3c.github.io/gamepad/#remapping):
   *  0 = A/Cross       1 = B/Circle     2 = X/Square   3 = Y/Triangle
   *  4 = LB/L1         5 = RB/R1        6 = LT/L2      7 = RT/R2
   *  8 = Select/Share  9 = Start/Options
   * 10 = L3            11 = R3
   * 12 = D-Up         13 = D-Down      14 = D-Left    15 = D-Right
   */
  private static _buttonToCode(index: number): string | null {
    switch (index) {
      case 0:  return 'Space';      // A / Cross       — fire + confirm
      case 1:  return 'Escape';     // B / Circle      — back / cancel
      case 3:  return 'KeyC';       // Y / Triangle    — continue on GameOver
      case 5:  return 'Space';      // RB / R1         — alternate fire
      case 9:  return 'KeyP';       // Start / Options — pause
      case 12: return 'ArrowUp';    // D-pad Up
      case 13: return 'ArrowDown';  // D-pad Down
      case 14: return 'ArrowLeft';  // D-pad Left
      case 15: return 'ArrowRight'; // D-pad Right
      default: return null;
    }
  }

  /**
   * Synthesize left-stick axes into arrow key codes.
   *
   * Movement is binary (not proportional) — past the deadzone the ship moves at
   * full keyboard speed. This matches the arcade heritage and keeps gameplay parity
   * between input methods.
   *
   * Horizontal is always read even at diagonal angles so players don't have to push
   * perfectly sideways. Vertical is included for menu navigation.
   */
  private _synthesizeStick(x: number, y: number): void {
    const magnitude = Math.sqrt(x * x + y * y);

    if (magnitude < InputManager.DEADZONE) {
      // Stick at rest — remove all synthesized arrow keys and reset edge state
      this.heldKeys.delete('ArrowLeft');
      this.heldKeys.delete('ArrowRight');
      this.heldKeys.delete('ArrowUp');
      this.heldKeys.delete('ArrowDown');
      this.prevStickLeft = false;
      this.prevStickRight = false;
      this.prevStickUp = false;
      this.prevStickDown = false;
      return;
    }

    // ----- Horizontal (always active when past deadzone) -----
    const goLeft = x < 0;
    const goRight = x > 0;

    if (goLeft) {
      this.heldKeys.add('ArrowLeft');
      this.heldKeys.delete('ArrowRight');
      if (!this.prevStickLeft) this.justPressedKeys.add('ArrowLeft'); // rising edge
    } else {
      this.heldKeys.add('ArrowRight');
      this.heldKeys.delete('ArrowLeft');
      if (!this.prevStickRight) this.justPressedKeys.add('ArrowRight');
    }

    this.prevStickLeft = goLeft;
    this.prevStickRight = goRight;

    // ----- Vertical (for menu navigation) -----
    const goUp = y < -InputManager.DEADZONE;
    const goDown = y > InputManager.DEADZONE;

    if (goUp) {
      this.heldKeys.add('ArrowUp');
      this.heldKeys.delete('ArrowDown');
      if (!this.prevStickUp) this.justPressedKeys.add('ArrowUp');
    } else if (goDown) {
      this.heldKeys.add('ArrowDown');
      this.heldKeys.delete('ArrowUp');
      if (!this.prevStickDown) this.justPressedKeys.add('ArrowDown');
    } else {
      this.heldKeys.delete('ArrowUp');
      this.heldKeys.delete('ArrowDown');
    }

    this.prevStickUp = goUp;
    this.prevStickDown = goDown;
  }

  /**
   * Remove all gamepad-synthesized key codes from heldKeys and reset stick state.
   * Called on disconnect to prevent phantom drift — keyboard-held keys remain intact.
   */
  private _clearSynthesizedKeys(): void {
    for (const code of InputManager.GAMEPAD_CODES) {
      this.heldKeys.delete(code);
    }
    this.prevStickLeft = false;
    this.prevStickRight = false;
    this.prevStickUp = false;
    this.prevStickDown = false;
  }
}
