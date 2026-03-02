export class ObjectPool<T extends { visible: boolean }> {
  private readonly available: T[] = [];
  private readonly all: T[] = [];

  constructor(factory: () => T, size: number) {
    for (let i = 0; i < size; i++) {
      const obj = factory();
      obj.visible = false;
      this.available.push(obj);
      this.all.push(obj);
    }
  }

  public acquire(): T | null {
    const obj = this.available.pop();
    if (!obj) {
      // Pool exhausted — log warning in dev, return null (caller skips the shot)
      if (import.meta.env.DEV) {
        console.warn('[ObjectPool] Pool exhausted — increase pool size');
      }
      return null;
    }
    obj.visible = true;
    return obj;
  }

  public release(obj: T): void {
    obj.visible = false;
    this.available.push(obj);
  }

  /** Release all active objects back to pool (e.g., on wave reset) */
  public releaseAll(): void {
    for (const obj of this.all) {
      obj.visible = false;
    }
    this.available.length = 0;
    this.available.push(...this.all);
  }

  public get activeCount(): number {
    return this.all.length - this.available.length;
  }

  public get totalSize(): number {
    return this.all.length;
  }

  /** Iterate over every pooled object (active and inactive). Used to register meshes with bloom. */
  public forEach(cb: (item: T) => void): void {
    for (const item of this.all) {
      cb(item);
    }
  }
}
