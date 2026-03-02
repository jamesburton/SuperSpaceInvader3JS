import { Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
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

  constructor(scene: Scene, color: number = 0xffffff) {
    const geo = new BoxGeometry(BULLET_WIDTH, BULLET_HEIGHT, 1);
    const mat = new MeshBasicMaterial({ color });
    this.mesh = new Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh); // added ONCE — pool toggles visible, never scene.add/remove
  }

  /**
   * Called by WeaponSystem after acquire() to set bullet state for a new shot.
   * @param x Spawn x position
   * @param y Spawn y position
   * @param isPlayerBullet true = upward/white, false = downward/red
   */
  public init(x: number, y: number, isPlayerBullet: boolean): void {
    this.x = x;
    this.y = y;
    this.isPlayerBullet = isPlayerBullet;
    this.vy = isPlayerBullet ? BULLET_SPEED : -ENEMY_BULLET_SPEED;
    this.vx = 0;
    this.active = true;
    this.mesh.position.set(x, y, 0);
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
    () => new Bullet(scene, 0xffffff),  // white player bullets
    PLAYER_BULLET_POOL_SIZE,
  );
  const enemyPool = new ObjectPool<Bullet>(
    () => new Bullet(scene, 0xff4444),  // reddish enemy bullets
    ENEMY_BULLET_POOL_SIZE,
  );
  return { playerPool, enemyPool };
}
