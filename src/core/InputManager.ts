export class InputManager {
  private readonly heldKeys: Set<string> = new Set();
  private readonly justPressedKeys: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.heldKeys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.heldKeys.add(e.code);
      // Prevent spacebar from scrolling the page
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
    });
  }

  /** True while key is held down */
  public isDown(code: string): boolean {
    return this.heldKeys.has(code);
  }

  /**
   * True only on the frame the key was first pressed.
   * MUST call clearJustPressed() at end of each game update step.
   */
  public justPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  /** Call once per fixed update step, AFTER all input reads */
  public clearJustPressed(): void {
    this.justPressedKeys.clear();
  }
}
