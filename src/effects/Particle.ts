import {
  Mesh,
  BufferGeometry,
  MeshStandardMaterial,
  Color,
  Float32BufferAttribute,
} from 'three';
import type { Scene } from 'three';

/**
 * A single pooled particle — geometric shard for death bursts, muzzle flash dots,
 * and engine trail sparks.
 *
 * Uses the same Object.defineProperty visible/active sync pattern as Bullet —
 * ObjectPool<Particle> drives activation via obj.visible = true/false.
 */
export class Particle {
  public active: boolean = false;

  // Declared for TypeScript — defined via Object.defineProperty below
  declare public visible: boolean;

  public readonly mesh: Mesh;

  // Physics state
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;   // units/second
  public vy: number = 0;
  public rotationSpeed: number = 0; // radians/second (tumble)
  public lifetime: number = 0;      // remaining seconds
  public maxLifetime: number = 0;

  constructor(scene: Scene) {
    // Diamond shard geometry — 4 vertices forming a flattened diamond
    // Width=6, Height=10 — angular shard shape
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute([
       0,  5, 0,  // top
      -3,  0, 0,  // left
       0, -5, 0,  // bottom
       3,  0, 0,  // right
    ], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);  // two triangles

    const mat = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: new Color(0xffffff),
      emissiveIntensity: 1.2,
      roughness: 1.0,
      metalness: 0.0,
    });

    this.mesh = new Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /**
   * Initialize this particle for a new burst effect.
   * Called by ParticleManager after pool.acquire().
   */
  public init(
    x: number,
    y: number,
    vx: number,
    vy: number,
    rotationSpeed: number,
    lifetime: number,
    hexColor: number,
  ): void {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.rotationSpeed = rotationSpeed;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;

    const mat = this.mesh.material as MeshStandardMaterial;
    mat.color.setHex(hexColor);
    mat.emissive.setHex(hexColor);
    mat.emissiveIntensity = 1.2;

    this.mesh.position.set(x, y, 0.5);
    this.mesh.rotation.z = Math.random() * Math.PI * 2;
    this.mesh.scale.setScalar(1.0);
    this.mesh.visible = true;
  }

  /**
   * Update particle physics. Returns true if still alive.
   * Called each fixed step by ParticleManager.update().
   */
  public update(dt: number): boolean {
    if (!this.active) return false;

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.active = false;
      this.mesh.visible = false;
      return false;
    }

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Tumble
    this.mesh.rotation.z += this.rotationSpeed * dt;

    // Fade out: scale emissiveIntensity by remaining lifetime ratio
    const t = this.lifetime / this.maxLifetime;
    const mat = this.mesh.material as MeshStandardMaterial;
    mat.emissiveIntensity = 1.2 * t;

    // Shrink as they die
    const s = 0.5 + 0.5 * t;
    this.mesh.scale.setScalar(s);

    this.mesh.position.set(this.x, this.y, 0.5);
    return true;
  }

  /** Reset back to pool-ready state. */
  public reset(): void {
    this.active = false;
    this.mesh.visible = false;
  }
}

// Override visible getter/setter so ObjectPool<Particle> can drive activation
// via obj.visible = true/false — same pattern as Bullet.
Object.defineProperty(Particle.prototype, 'visible', {
  get(this: Particle): boolean {
    return this.mesh.visible;
  },
  set(this: Particle, v: boolean) {
    this.mesh.visible = v;
    this.active = v;
  },
  configurable: true,
  enumerable: true,
});
