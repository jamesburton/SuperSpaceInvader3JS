// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import { CRTManager } from './CRTManager';

describe('CRTManager', () => {
  let container: HTMLElement;
  let manager: CRTManager;

  beforeEach(() => {
    document.body.innerHTML = '<div id="viewport"></div>';
    container = document.getElementById('viewport') as HTMLElement;
    manager = new CRTManager();
  });

  it('creates a scanline overlay for tier 1', () => {
    manager.init(container, null, 1, 0.5);

    const overlay = document.getElementById('crt-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.style.background).toContain('repeating-linear-gradient');
    expect(overlay.style.background).not.toContain('radial-gradient');
    expect(overlay.style.boxShadow).toBe('none');
  });

  it('adds color fringe for tier 2 and vignette for tier 3', () => {
    manager.init(container, null, 2, 1);
    const tier2Overlay = document.getElementById('crt-overlay') as HTMLElement;
    expect(tier2Overlay.style.boxShadow).toContain('rgba(255,0,0');
    expect(tier2Overlay.style.background).not.toContain('radial-gradient');

    manager.dispose();
    manager.init(container, null, 3, 1);
    const tier3Overlay = document.getElementById('crt-overlay') as HTMLElement;
    expect(tier3Overlay.style.boxShadow).toContain('rgba(255,0,0');
    expect(tier3Overlay.style.background).toContain('radial-gradient');
  });

  it('updates overlay styling when intensity changes at runtime', () => {
    manager.init(container, null, 1, 0.2);
    const overlay = document.getElementById('crt-overlay') as HTMLElement;
    const before = overlay.style.background;

    manager.setIntensity(0.9);

    expect(overlay.style.background).not.toBe(before);
  });
});
