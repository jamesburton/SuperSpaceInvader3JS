import type { OrthographicCamera } from 'three';

export class CameraShake {
  private intensity: number = 0;  // current shake magnitude (world units)
  private duration: number = 0;   // remaining shake time (seconds)

  /** Small shake — player hit by enemy bullet */
  public triggerSmall(): void {
    this.intensity = Math.max(this.intensity, 6);   // 6 world units max offset
    this.duration = Math.max(this.duration, 0.25);  // 0.25 seconds
  }

  /** Large shake stub — boss impact (Phase 4 activates this fully) */
  public triggerLarge(): void {
    this.intensity = Math.max(this.intensity, 18);  // 18 world units max offset
    this.duration = Math.max(this.duration, 0.45);  // 0.45 seconds
  }

  /**
   * Apply current shake to camera position offset.
   * Call each render frame (not fixed step).
   * @param camera OrthographicCamera to shake
   * @param dt Frame delta in seconds (from render alpha * FIXED_STEP, or raw frame dt)
   */
  public apply(camera: OrthographicCamera, dt: number): void {
    if (this.duration <= 0) {
      camera.position.x = 0;
      camera.position.y = 0;
      return;
    }
    this.duration -= dt;
    // Exponential decay: intensity falls off rapidly
    const t = Math.max(0, this.duration);
    const magnitude = this.intensity * t;
    camera.position.x = (Math.random() - 0.5) * 2 * magnitude;
    camera.position.y = (Math.random() - 0.5) * 2 * magnitude;
    if (this.duration <= 0) {
      this.intensity = 0;
      camera.position.x = 0;
      camera.position.y = 0;
    }
  }

  public reset(): void {
    this.intensity = 0;
    this.duration = 0;
  }
}
