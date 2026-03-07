import { ScanlineEffect, ChromaticAberrationEffect, EffectPass, BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import type { EffectComposer } from 'postprocessing';
import type { OrthographicCamera } from 'three';

/**
 * Tier parameters for each CRT unlock level.
 * Tier 1: scanlines only (no chromatic aberration).
 * Tier 2: moderate scanlines + mild chromatic aberration.
 * Tier 3: heavy scanlines + strong chromatic aberration.
 */
const CRT_TIER_PARAMS = {
  1: { baseDensity: 1.5, baseCA: 0.0 },
  2: { baseDensity: 2.5, baseCA: 0.003 },
  3: { baseDensity: 4.0, baseCA: 0.006 },
} as const;

type ValidTier = 1 | 2 | 3;

/**
 * CRTManager wraps ScanlineEffect + ChromaticAberrationEffect in a separate EffectPass
 * added AFTER the bloom EffectPass. This separation is critical — merging CRT effects
 * into the bloom pass causes bloom to disappear (confirmed in Phase 8 research, Pitfall 1).
 *
 * Usage:
 *   const crtManager = new CRTManager();
 *   crtManager.init(bloom.composer, camera, crtTier, crtIntensity);
 *   // Later, when user adjusts intensity slider:
 *   crtManager.setIntensity(newIntensity);
 */
export class CRTManager {
  private pass: EffectPass | null = null;
  private scanline: ScanlineEffect | null = null;
  private chromatic: ChromaticAberrationEffect | null = null;
  private activeTier: ValidTier = 1;
  private composer: EffectComposer | null = null;

  /**
   * Initialize CRT effects and attach them to the existing EffectComposer.
   * Must be called after bloom pass has already been added so CRT pass is ordered after bloom.
   *
   * @param composer - The shared EffectComposer (from BloomEffect.composer)
   * @param camera   - The orthographic camera
   * @param tier     - CRT tier (1/2/3) or null if not unlocked
   * @param intensity - Effect intensity in [0.0, 1.0]
   */
  public init(
    composer: EffectComposer,
    camera: OrthographicCamera,
    tier: number | null,
    intensity: number,
  ): void {
    if (tier === null || tier < 1 || tier > 3) {
      // CRT not unlocked — do not add any pass
      return;
    }

    this.activeTier = tier as ValidTier;
    const params = CRT_TIER_PARAMS[this.activeTier];

    // Clamp intensity — minimum 0.01 so scanlines are always slightly visible once unlocked.
    // A zero intensity would make the CRT entirely invisible while still paying the GPU cost.
    const clamped = Math.max(0.01, Math.min(1, intensity));

    // Create scanline effect — uses OVERLAY blend so it darkens between pixel rows
    this.scanline = new ScanlineEffect({
      blendFunction: BlendFunction.OVERLAY,
      density: params.baseDensity * clamped,
    });

    const effects: (ScanlineEffect | ChromaticAberrationEffect)[] = [this.scanline];

    // Chromatic aberration only at tiers 2 and 3
    if (params.baseCA > 0) {
      this.chromatic = new ChromaticAberrationEffect({
        offset: new Vector2(params.baseCA * clamped, params.baseCA * clamped),
        radialModulation: true,
        modulationOffset: 0.15,
      });
      effects.push(this.chromatic);
    }

    // Create a new EffectPass with all CRT effects and add it to the composer.
    // Because bloom was added first, this pass executes after bloom — critical for
    // maintaining bloom output integrity.
    this.composer = composer;
    this.pass = new EffectPass(camera, ...effects);
    composer.addPass(this.pass);
  }

  /**
   * Update CRT effect intensity at runtime (no restart required).
   * Called by the settings UI when the player adjusts the CRT intensity slider.
   *
   * @param intensity - New intensity in [0.0, 1.0]
   */
  public setIntensity(intensity: number): void {
    if (!this.scanline) return;

    const clamped = Math.max(0.01, Math.min(1, intensity));
    const params = CRT_TIER_PARAMS[this.activeTier];

    this.scanline.density = params.baseDensity * clamped;

    if (this.chromatic) {
      const offset = params.baseCA * clamped;
      this.chromatic.offset = new Vector2(offset, offset);
    }
  }

  public dispose(): void {
    // Remove pass from composer BEFORE disposing it — prevents dangling reference in composer's pass list
    if (this.pass && this.composer) {
      this.composer.removePass(this.pass);
    }
    this.pass?.dispose();
    this.pass = null;
    this.composer = null;
    this.scanline = null;
    this.chromatic = null;
  }
}
