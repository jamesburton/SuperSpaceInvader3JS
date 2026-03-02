import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import type { Scene } from 'three';
import {
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  PLAYER_BULLET_POOL_SIZE,
  ENEMY_BULLET_POOL_SIZE,
} from '../utils/constants';
import { ObjectPool } from '../core/ObjectPool';

export class Bullet {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public readonly width: number = BULLET_WIDTH / 2;   // AABB half-width
  public readonly height: number = BULLET_HEIGHT / 2; // AABB half-height
  public isPlayerBullet: boolean = true;
  public active: boolean = false; // managed by pool via visible flag

  // 'visible' property is defined via Object.defineProperty below to keep
  // mesh.visible and this.active in sync. Declared here for TypeScript only.
  declare public visible: boolean;

  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    const geo = new BoxGeometry(BULLET_WIDTH, BULLET_HEIGHT, 1);
    // Default to player bullet colors — init() will set correct emissive per bullet type
    const mat = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      roughness: 1.0,
      metalness: 0.0,
    });
    this.mesh = new Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh); // added ONCE — pool toggles visible, never scene.add/remove
  }

  /**
   * Called by WeaponSystem after acquire() to set bullet state for a new shot.
   * Sets emissive color based on bullet type:
   *   - Player bullets: white-cyan (0xffffff)
   *   - Enemy bullets: red-orange (0xff4400)
   * @param x Spawn x position
   * @param y Spawn y position
   * @param isPlayerBullet true = upward/white-emissive, false = downward/red-orange-emissive
   */
  public init(x: number, y: number, isPlayerBullet: boolean): void {
    this.x = x;
    this.y = y;
    this.isPlayerBullet = isPlayerBullet;
    this.vy = isPlayerBullet ? BULLET_SPEED : -ENEMY_BULLET_SPEED;
    this.vx = 0;
    this.active = true;
    this.mesh.position.set(x, y, 0);

    // Apply emissive color based on bullet type
    const mat = this.mesh.material as MeshStandardMaterial;
    if (isPlayerBullet) {
      mat.color.setHex(0xffffff);
      mat.emissive.setHex(0xffffff);
    } else {
      mat.color.setHex(0xff4400);
      mat.emissive.setHex(0xff4400);
    }
    mat.emissiveIntensity = 1.0;
  }

  /**
   * Override bullet color — used by Phase 3 weapon types (FEEL-07).
   * Call after init() to apply a weapon-specific emissive color.
   */
  public setColor(hexColor: number): void {
    const mat = this.mesh.material as MeshStandardMaterial;
    mat.color.setHex(hexColor);
    mat.emissive.setHex(hexColor);
  }

  /** Sync mesh position to current x/y. Called by MovementSystem each fixed step. */
  public syncMesh(): void {
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
  }
}

// Override visible getter/setter so pool's obj.visible = true/false
// forwards to mesh.visible and keeps this.active in sync.
// This is how ObjectPool<Bullet> drives visibility without direct mesh access.
Object.defineProperty(Bullet.prototype, 'visible', {
  get(this: Bullet): boolean {
    return this.mesh.visible;
  },
  set(this: Bullet, v: boolean) {
    this.mesh.visible = v;
    this.active = v;
  },
  configurable: true,
  enumerable: true,
});

/**
 * Factory: create player and enemy bullet pools.
 * All bullet meshes are added to scene once here — pool only toggles visibility.
 */
export function createBulletPools(scene: Scene): {
  playerPool: ObjectPool<Bullet>;
  enemyPool: ObjectPool<Bullet>;
} {
  const playerPool = new ObjectPool<Bullet>(
    () => new Bullet(scene),
    PLAYER_BULLET_POOL_SIZE,
  );
  const enemyPool = new ObjectPool<Bullet>(
    () => new Bullet(scene),
    ENEMY_BULLET_POOL_SIZE,
  );
  return { playerPool, enemyPool };
}
