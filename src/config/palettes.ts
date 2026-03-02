// Temperature ramp: cyan → teal → green → yellow → orange → crimson
// 6 palettes before Endless mode cycles back to index 0
export const WAVE_PALETTES: readonly number[] = [
  0x00ffff, // Wave 1: cyan/ice blue
  0x00e5cc, // Wave 2: teal
  0x00ff88, // Wave 3: electric green
  0xffee00, // Wave 4: yellow
  0xff6600, // Wave 5: orange
  0xff1133, // Wave 6: crimson (peak)
];

export class WavePalette {
  /** Tracks how many full cycles have elapsed (for future Endless-mode stats). */
  private _cycleCount: number = 0;

  /** Get the neon color for a given wave number (1-based). Cycles in Endless mode. */
  public getColor(wave: number): number {
    const idx = (wave - 1) % WAVE_PALETTES.length;
    return WAVE_PALETTES[idx];
  }

  /** Get the number of completed palette cycles (read by HUD or analytics). */
  public get cycleCount(): number {
    return this._cycleCount;
  }

  /** Reset palette to cyan — call on boss defeat (Phase 4 hook). */
  public reset(): void {
    this._cycleCount = 0;
  }
}

export const wavePalette = new WavePalette();
