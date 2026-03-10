/**
 * CRTManager — CSS-based CRT overlay that covers the entire game viewport.
 *
 * Uses a repeating linear gradient for scanlines, applied via a full-viewport
 * overlay div with pointer-events:none. This ensures the CRT effect covers
 * both the WebGL canvas AND the DOM-based HUD/overlays.
 *
 * Tier parameters control scanline density and opacity:
 * - Tier 1: light scanlines (subtle retro feel)
 * - Tier 2: moderate scanlines + slight color fringe
 * - Tier 3: heavy scanlines + strong color fringe + vignette
 */

const CRT_TIER_PARAMS = {
  1: { lineHeight: 4, baseOpacity: 0.12, colorFringe: 0, vignette: false },
  2: { lineHeight: 3, baseOpacity: 0.18, colorFringe: 0.4, vignette: false },
  3: { lineHeight: 2, baseOpacity: 0.25, colorFringe: 0.8, vignette: true },
} as const;

type ValidTier = 1 | 2 | 3;

export class CRTManager {
  private overlayEl: HTMLElement | null = null;
  private activeTier: ValidTier = 1;
  // Container ref kept for potential future use (resize handling)

  /**
   * Initialize the CRT CSS overlay inside the given container.
   * The overlay covers the entire container and sits above all content.
   *
   * @param container - The game viewport element (#game-viewport)
   * @param _camera   - Unused (kept for API compat, was needed for EffectComposer)
   * @param tier      - CRT tier (1/2/3) or null if not active
   * @param intensity - Effect intensity in [0.0, 1.0]
   */
  public init(
    container: HTMLElement,
    _camera: unknown,
    tier: number | null,
    intensity: number,
  ): void {
    if (tier === null || tier < 1 || tier > 3) return;

    this.activeTier = tier as ValidTier;

    // Create overlay element
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'crt-overlay';
    this.overlayEl.style.cssText = [
      'position:absolute',
      'inset:0',
      'pointer-events:none',
      'z-index:9999',
      'mix-blend-mode:multiply',
    ].join(';');
    container.appendChild(this.overlayEl);

    this.applyEffect(intensity);
  }

  /**
   * Update CRT effect intensity at runtime.
   */
  public setIntensity(intensity: number): void {
    if (!this.overlayEl) return;
    this.applyEffect(intensity);
  }

  /**
   * Change active tier at runtime without full reinit.
   */
  public setTier(tier: number): void {
    if (tier < 1 || tier > 3) return;
    this.activeTier = tier as ValidTier;
  }

  private applyEffect(intensity: number): void {
    if (!this.overlayEl) return;

    const clamped = Math.max(0.01, Math.min(1, intensity));
    const params = CRT_TIER_PARAMS[this.activeTier];

    const lineH = params.lineHeight;
    const opacity = params.baseOpacity * clamped;

    // Scanline gradient: alternating transparent and dark bands
    const scanlines = `repeating-linear-gradient(0deg, transparent 0px, transparent ${lineH}px, rgba(0,0,0,${opacity}) ${lineH}px, rgba(0,0,0,${opacity}) ${lineH * 2}px)`;

    // Color fringe: subtle red/blue edge glow via box-shadow
    const fringe = params.colorFringe * clamped;
    const fringeVal = fringe > 0
      ? `inset ${fringe}px 0 ${fringe * 2}px rgba(255,0,0,${0.06 * clamped}), inset -${fringe}px 0 ${fringe * 2}px rgba(0,100,255,${0.06 * clamped})`
      : 'none';

    // Vignette: darken edges
    const vignette = params.vignette
      ? `, radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${0.4 * clamped}) 100%)`
      : '';

    this.overlayEl.style.background = scanlines + vignette;
    this.overlayEl.style.boxShadow = fringeVal;
  }

  public dispose(): void {
    if (this.overlayEl && this.overlayEl.parentElement) {
      this.overlayEl.parentElement.removeChild(this.overlayEl);
    }
    this.overlayEl = null;
  }
}
