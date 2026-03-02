/**
 * Minimal Three.js mock for unit testing.
 * Replaces WebGL-dependent Three.js with lightweight stubs
 * that satisfy the constructor calls in Player, Bullet, Enemy, etc.
 */

export class Color {
  r = 0; g = 0; b = 0;
  constructor(_hex?: number | string) {}
  setHex(_hex: number): this { return this; }
  copy(_c: Color): this { return this; }
}

export class BoxGeometry {
  constructor(_w?: number, _h?: number, _d?: number) {}
  dispose() {}
}

export class BufferGeometry {
  private attributes: Record<string, unknown> = {};
  index: unknown = null;
  setAttribute(_name: string, attr: unknown) { this.attributes[_name] = attr; }
  setIndex(index: unknown) { this.index = index; }
  computeVertexNormals() {}
  dispose() {}
}

export class Float32BufferAttribute {
  constructor(_array: Float32Array, _itemSize: number) {}
}

export class Uint16BufferAttribute {
  constructor(_array: Uint16Array, _itemSize: number) {}
}

export class MeshBasicMaterial {
  color = new Color(0xffffff);
  constructor(_params?: object) {}
  dispose() {}
}

export class MeshStandardMaterial {
  color = new Color(0xffffff);
  emissive = new Color(0x000000);
  emissiveIntensity = 1.0;
  roughness = 1.0;
  metalness = 0.0;
  constructor(_params?: object) {}
  dispose() {}
}

export class Mesh {
  public visible: boolean = false;
  public position = { x: 0, y: 0, z: 0, set(_x: number, _y: number, _z: number) {} };
  public material: unknown;

  constructor(_geo?: unknown, mat?: unknown) {
    this.material = mat;
  }
}

export class InstancedMesh {
  count: number = 0;
  material: unknown;
  instanceMatrix = { needsUpdate: false };

  constructor(_geo?: unknown, mat?: unknown, _count?: number) {
    this.material = mat;
  }

  setMatrixAt(_index: number, _matrix: unknown) {}
}

export class Matrix4 {
  makeTranslation(_x: number, _y: number, _z: number): this { return this; }
  makeScale(_x: number, _y: number, _z: number): this { return this; }
}

export class Scene {
  private readonly objects: unknown[] = [];
  add(obj: unknown) { this.objects.push(obj); }
  remove(obj: unknown) {
    const i = this.objects.indexOf(obj);
    if (i >= 0) this.objects.splice(i, 1);
  }
}
