// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from 'vitest';
import { HUD } from './HUD';

describe('HUD time slow effect', () => {
  let root: HTMLElement;
  let hud: HUD;

  beforeEach(() => {
    document.body.innerHTML = '<div id="hud"></div>';
    root = document.getElementById('hud') as HTMLElement;
    hud = new HUD(root);
  });

  it('shows the overlay when time slow is active', () => {
    hud.setTimeSlowEffect(0.5);

    const overlay = root.querySelector('#hud-timeslow-overlay') as HTMLElement;
    expect(overlay.style.display).toBe('block');
    expect(overlay.style.opacity).toBe('0.425');
  });

  it('hides the overlay when time slow is inactive', () => {
    hud.setTimeSlowEffect(0.5);
    hud.setTimeSlowEffect(0);

    const overlay = root.querySelector('#hud-timeslow-overlay') as HTMLElement;
    expect(overlay.style.display).toBe('none');
  });
});
