/**
 * BossHealthBar — DOM overlay component for Phase 4 boss encounter.
 * Fully implemented: segmented fill bar, phase boundary marker at 50%, phase label.
 * Color shifts from neon red (phase 1) to neon orange (phase 2).
 */
export class BossHealthBar {
  private readonly root: HTMLElement;
  private readonly fillEl: HTMLElement;
  private readonly phaseMarkerEl: HTMLElement;
  private readonly phaseLabel: HTMLElement;
  private totalPhases: number = 2;

  constructor(hudRoot: HTMLElement) {
    const el = document.createElement('div');
    el.id = 'boss-health-bar';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'bottom:32px',
      'left:50%',
      'transform:translateX(-50%)',
      'width:60%',
      'background:transparent',
      'text-align:center',
      'font-family:"Courier New",monospace',
    ].join(';');

    el.innerHTML = `
      <div id="boss-phase-label" style="font-size:12px;color:#ff1133;text-shadow:0 0 8px #ff1133;margin-bottom:4px;letter-spacing:2px;">BOSS \u2014 PHASE 1</div>
      <div style="position:relative;width:100%;height:12px;background:#111;border:1px solid #ff1133;box-shadow:0 0 8px #ff1133;">
        <div id="boss-hp-fill" style="height:100%;width:100%;background:#ff1133;transition:width 0.1s linear;"></div>
        <div id="boss-phase-marker" style="position:absolute;top:0;left:50%;width:2px;height:100%;background:#fff;opacity:0.7;"></div>
      </div>
    `;

    hudRoot.appendChild(el);
    this.root = el;
    this.fillEl = el.querySelector('#boss-hp-fill') as HTMLElement;
    this.phaseMarkerEl = el.querySelector('#boss-phase-marker') as HTMLElement;
    this.phaseLabel = el.querySelector('#boss-phase-label') as HTMLElement;
  }

  /** Show the boss health bar — call on boss encounter start (Phase 4) */
  public show(totalPhases: number, currentPhase: number): void {
    this.totalPhases = Math.max(1, totalPhases);
    this.root.style.display = 'block';
    this.update(1.0, currentPhase);
  }

  /** Hide the boss health bar — call on boss defeat or game over */
  public hide(): void {
    this.root.style.display = 'none';
  }

  /** Update fill percentage and phase label. Called each update step during boss fight. */
  public update(healthPercent: number, currentPhase: number): void {
    const pct = Math.max(0, Math.min(1, healthPercent)) * 100;
    const color = currentPhase >= 2 ? '#FF6600' : '#FF1133';
    this.fillEl.style.width = `${pct}%`;
    this.fillEl.style.background = color;
    this.phaseLabel.style.color = color;
    this.phaseLabel.style.textShadow = `0 0 8px ${color}`;
    this.phaseLabel.textContent = `BOSS \u2014 PHASE ${currentPhase}/${this.totalPhases}`;
    this.phaseMarkerEl.style.display = this.totalPhases > 1 ? 'block' : 'none';
  }
}
