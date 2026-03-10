import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import type { Scene } from 'three';
import type { PowerUpType } from '../config/powerups';
import { POWER_UP_DEFS } from '../config/powerups';

const TOKEN_SIZE = 14;        // square bounding box side length
const TOKEN_DRIFT_SPEED = 40; // units/second downward drift

export class PickupToken {
  public x: number = 0;
  public y: number = 0;
  public vy: number = -TOKEN_DRIFT_SPEED;
  public readonly width: number = 7;   // AABB half-width
  public readonly height: number = 7;  // AABB half-height
  public active: boolean = false;
  public type: PowerUpType = 'spreadShot';

  // 'visible' property is defined via Object.defineProperty below to keep
  // mesh.visible and this.active in sync. Declared here for TypeScript only.
  declare public visible: boolean;

  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    const geo = new BoxGeometry(TOKEN_SIZE, TOKEN_SIZE, 1);
    const mat = new MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.5,
      roughness: 1.0,
      metalness: 0.0,
    });
    this.mesh = new Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh); // added ONCE — pool toggles visible, never scene.add/remove
  }

  /**
   * Called by PowerUpManager after acquire() to configure the token for a new drop.
   * Sets position, type, and emissive color from POWER_UP_DEFS.
   */
  public init(x: number, y: number, type: PowerUpType): void {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.vy = -TOKEN_DRIFT_SPEED;
    this.mesh.position.set(x, y, 0);
    const mat = this.mesh.material as MeshStandardMaterial;
    const def = POWER_UP_DEFS[type];
    mat.color.setHex(def.color);
    mat.emissive.setHex(def.color);
    mat.emissiveIntensity = 1.5;

    this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.z = Math.PI / 4;

    switch (type) {
      case 'piercingShot':
        this.mesh.scale.set(0.45, 1.7, 1);
        this.mesh.rotation.z = Math.PI / 10;
        break;
      case 'homingMissile':
        this.mesh.scale.set(0.75, 1.5, 1);
        this.mesh.rotation.z = 0;
        break;
      case 'timeSlow':
        this.mesh.scale.set(1.25, 1.25, 1);
        this.mesh.rotation.z = Math.PI / 8;
        mat.emissiveIntensity = 1.8;
        break;
    }
  }

  /**
   * Move token downward each fixed step.
   * Returns false when token exits world bottom (y < -350).
   * WORLD_HEIGHT/2 = 300 units; -350 gives 50-unit buffer below screen edge.
   */
  public update(dt: number): boolean {
    this.y += this.vy * dt;
    this.mesh.position.y = this.y;
    return this.y > -350;
  }
}

// Override visible getter/setter so pool's obj.visible = true/false
// forwards to mesh.visible and keeps this.active in sync.
// This is how ObjectPool<PickupToken> drives visibility without direct mesh access.
Object.defineProperty(PickupToken.prototype, 'visible', {
  get(this: PickupToken): boolean {
    return this.mesh.visible;
  },
  set(this: PickupToken, v: boolean) {
    this.mesh.visible = v;
    this.active = v;
  },
  configurable: true,
  enumerable: true,
});
