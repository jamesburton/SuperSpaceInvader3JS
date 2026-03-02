export interface IGameState {
  enter(): void;
  update(dt: number): void;
  render(alpha: number): void;
  exit(): void;
  /** Called when a state above this is popped and this state resumes. Optional. */
  resume?(): void;
}

export class StateManager {
  private readonly stack: IGameState[] = [];

  get current(): IGameState | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  /** Push new state on top. Pauses current (does not call exit). */
  push(state: IGameState): void {
    // Don't call exit on current — it's paused, not exited
    this.stack.push(state);
    state.enter();
  }

  /** Pop top state. Calls exit on it, then calls resume() on the state below. */
  pop(): void {
    const top = this.stack.pop();
    if (top) top.exit();
    if (this.current?.resume) this.current.resume();
  }

  /** Clear stack and replace with new state. Calls exit on all. */
  replace(state: IGameState): void {
    while (this.stack.length > 0) {
      this.stack.pop()?.exit();
    }
    this.stack.push(state);
    state.enter();
  }

  update(dt: number): void {
    this.current?.update(dt);
  }

  render(alpha: number): void {
    this.current?.render(alpha);
  }
}
