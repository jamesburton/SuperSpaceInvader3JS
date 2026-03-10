import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { Scene } from 'three';

export class HomingMissile {
  public active = false;
  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public speed = 320;
  public heading = Math.PI / 2;
  public lifetimeRemaining = 0;
  public targetEnemyId: number | null = null;

  declare public visible: boolean;

  public readonly width = 5;
  public readonly height = 10;
  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    const geometry = new BoxGeometry(10, 20, 1);
    const material = new MeshStandardMaterial({
      color: 0xff6677,
      emissive: 0xff6677,
      emissiveIntensity: 1.5,
      roughness: 1,
      metalness: 0,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public init(x: number, y: number, targetEnemyId: number | null, speed: number, lifetime: number): void {
    this.active = true;
    this.x = x;
    this.y = y;
    this.heading = Math.PI / 2;
    this.speed = speed;
    this.lifetimeRemaining = lifetime;
    this.targetEnemyId = targetEnemyId;
    this.vx = Math.cos(this.heading) * this.speed;
    this.vy = Math.sin(this.heading) * this.speed;
    this.syncMesh();
  }

  public syncMesh(): void {
    this.mesh.position.set(this.x, this.y, 0);
    this.mesh.rotation.z = this.heading - Math.PI / 2;
  }
}

Object.defineProperty(HomingMissile.prototype, 'visible', {
  get(this: HomingMissile): boolean {
    return this.mesh.visible;
  },
  set(this: HomingMissile, visible: boolean) {
    this.mesh.visible = visible;
    this.active = visible;
  },
  configurable: true,
  enumerable: true,
});
