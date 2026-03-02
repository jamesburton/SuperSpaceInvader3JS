/**
 * Minimal Three.js mock for unit testing.
 * Replaces WebGL-dependent Three.js with lightweight stubs
 * that satisfy the constructor calls in Player and Bullet.
 */

export class BoxGeometry {
  constructor(_w?: number, _h?: number, _d?: number) {}
  dispose() {}
}

export class MeshBasicMaterial {
  constructor(_params?: object) {}
  dispose() {}
}

export class Mesh {
  public visible: boolean = false;
  public position = { x: 0, y: 0, z: 0, set(_x: number, _y: number, _z: number) {} };

  constructor(_geo?: unknown, _mat?: unknown) {}
}

export class Scene {
  private readonly objects: unknown[] = [];
  add(obj: unknown) { this.objects.push(obj); }
  remove(obj: unknown) {
    const i = this.objects.indexOf(obj);
    if (i >= 0) this.objects.splice(i, 1);
  }
}
