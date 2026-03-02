/**
 * BossHealthBar — DOM overlay component for Phase 4 boss encounter.
 * Stub: shown/hidden correctly; fill/phase display implemented in Phase 4.
 */
export class BossHealthBar {
  private readonly root: HTMLElement;

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
      'height:12px',
      'background:#111',
      'border:1px solid #ff1133',
      'box-shadow:0 0 8px #ff1133',
      'font-family:"Courier New",monospace',
    ].join(';');
    hudRoot.appendChild(el);
    this.root = el;
  }

  /** Show the boss health bar — call on boss encounter start (Phase 4) */
  public show(_totalPhases: number, _currentPhase: number): void {
    this.root.style.display = 'block';
  }

  /** Hide the boss health bar — call on boss defeat or wave end */
  public hide(): void {
    this.root.style.display = 'none';
  }

  /** Update fill percentage and phase indicator — stub, implemented in Phase 4 */
  public update(_healthPercent: number, _currentPhase: number): void {
    // Phase 4: fill inner bar, update phase segment markers
  }
}
