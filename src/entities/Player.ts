import { Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import type { Scene } from 'three';
import {
  PLAYER_SPEED,
  PLAYER_MOVE_BOUNDS,
  PLAYER_LIVES,
  WORLD_HEIGHT,
} from '../utils/constants';

// Fire rate: one shot per FIRE_COOLDOWN seconds (4 shots/second max)
const FIRE_COOLDOWN = 0.25;

export class Player {
  public x: number = 0;
  public y: number = -(WORLD_HEIGHT / 2) + 40; // 40 units from bottom
  public readonly width: number = 20;           // AABB half-width for collision
  public readonly height: number = 12;          // AABB half-height for collision
  public lives: number = PLAYER_LIVES;
  public active: boolean = true;

  private fireCooldown: number = 0;
  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    // Placeholder chevron: BoxGeometry. Phase 2 replaces with neon material.
    // Width=40, height=24 (matches AABB: half-size = width/height above)
    const geo = new BoxGeometry(40, 24, 1);
    const mat = new MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new Mesh(geo, mat);
    this.mesh.position.set(this.x, this.y, 0);
    scene.add(this.mesh);
  }

  /**
   * Poll input and update position. Called every fixed step.
   * @param dt Fixed timestep in seconds
   * @param leftHeld Whether left key is currently held
   * @param rightHeld Whether right key is currently held
   */
  public update(dt: number, leftHeld: boolean, rightHeld: boolean): void {
    if (leftHeld) this.x -= PLAYER_SPEED * dt;
    if (rightHeld) this.x += PLAYER_SPEED * dt;

    // Clamp to world bounds
    this.x = Math.max(-PLAYER_MOVE_BOUNDS, Math.min(PLAYER_MOVE_BOUNDS, this.x));

    // Tick down fire cooldown
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // Sync mesh position
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
  }

  /** Returns true when the fire cooldown has elapsed and player may shoot */
  public canFire(): boolean {
    return this.fireCooldown <= 0;
  }

  /** Resets the fire cooldown timer — call after successfully spawning a bullet */
  public recordFire(): void {
    this.fireCooldown = FIRE_COOLDOWN;
  }
}
