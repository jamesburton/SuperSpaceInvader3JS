import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { FIXED_STEP, MAX_DELTA } from '../utils/constants';

export class Game {
  public readonly scene: SceneManager;
  public readonly input: InputManager;

  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(container: HTMLElement) {
    this.scene = new SceneManager(container);
    this.input = new InputManager();
  }

  public init(): void {
    // Subsystems initialized here as they are added in later plans
    // SceneManager and InputManager are ready
    console.log('[Game] Engine initialized');
    console.log(`[Game] Draw calls on init: ${this.scene.renderer.info.render.calls}`);
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.scene.renderer.setAnimationLoop((time: number) => this.loop(time));
  }

  public stop(): void {
    this.running = false;
    this.scene.renderer.setAnimationLoop(null);
  }

  private loop(time: number): void {
    if (!this.running) return;

    // Delta capped at MAX_DELTA (200ms) to prevent spiral-of-death on tab switch
    const delta = Math.min((time - this.lastTime) / 1000, MAX_DELTA);
    this.lastTime = time;

    // Fixed-timestep accumulator: run physics at exactly 60Hz
    this.accumulator += delta;
    while (this.accumulator >= FIXED_STEP) {
      this.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    // Render every frame (variable rate) with interpolation alpha for smooth visuals
    const alpha = this.accumulator / FIXED_STEP;
    this.render(alpha);
  }

  /**
   * Fixed-rate update — all physics, movement, collision, AI happens here.
   * Called at exactly FIXED_STEP (1/60s) regardless of frame rate.
   * @param dt Fixed timestep (always 1/60)
   */
  protected update(_dt: number): void {
    // Placeholder — PlayingState and systems populate this in Plans 02-05
    this.input.clearJustPressed();
  }

  /**
   * Variable-rate render — called every animation frame.
   * @param _alpha Interpolation factor (0-1) for smooth rendering between physics steps
   */
  protected render(_alpha: number): void {
    this.scene.render();
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
  }
}
