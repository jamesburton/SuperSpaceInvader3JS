import {
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  MeshStandardMaterial,
  Color,
} from 'three';
import type { Scene } from 'three';
import {
  PLAYER_SPEED,
  PLAYER_MOVE_BOUNDS,
  PLAYER_LIVES,
  WORLD_HEIGHT,
} from '../utils/constants';

// Fire rate: one shot per FIRE_COOLDOWN seconds (4 shots/second max)
const FIRE_COOLDOWN = 0.25;

/**
 * Build the player ship angular chevron geometry.
 * 6 vertices forming a pointed-nose ship with swept-back wings.
 * Fits within 40×24 unit bounding box (AABB half-extents: width=20, height=12).
 *
 * Vertex layout (y+ is up, toward enemies):
 *   0: nose tip        ( 0,  12, 0)  — top center
 *   1: right wing tip  (20, -12, 0)  — bottom right
 *   2: right wing inner( 8,  -4, 0)  — inner notch
 *   3: center base     ( 0,  -8, 0)  — center base notch
 *   4: left wing inner (-8,  -4, 0)  — inner notch mirror
 *   5: left wing tip   (-20, -12, 0) — bottom left
 */
function makePlayerGeometry(): BufferGeometry {
  const positions = new Float32Array([
      0,  12, 0, // 0 nose tip
     20, -12, 0, // 1 right wing tip
      8,  -4, 0, // 2 right wing inner
      0,  -8, 0, // 3 center base notch
     -8,  -4, 0, // 4 left wing inner
    -20, -12, 0, // 5 left wing tip
  ]);
  // CCW fan from nose tip (viewed from +Z camera): flip each triangle to face toward camera
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

export class Player {
  public x: number = 0;
  public y: number = -(WORLD_HEIGHT / 2) + 40; // 40 units from bottom
  public readonly width: number = 20;           // AABB half-width for collision
  public readonly height: number = 12;          // AABB half-height for collision
  public lives: number = PLAYER_LIVES;
  public active: boolean = true;

  private fireCooldown: number = 0;
  private fireCooldownMultiplier: number = 1.0;
  private speedMultiplier: number = 1.0;
  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    // Angular chevron ship pointing upward (toward enemies)
    const geo = makePlayerGeometry();
    const mat = new MeshStandardMaterial({
      color: 0x00ffff,      // cyan — player is always cyan regardless of wave
      emissive: new Color(0x00ffff),
      emissiveIntensity: 1.2,
      roughness: 1.0,
      metalness: 0.0,
    });
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
    if (leftHeld) this.x -= PLAYER_SPEED * this.speedMultiplier * dt;
    if (rightHeld) this.x += PLAYER_SPEED * this.speedMultiplier * dt;

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
    this.fireCooldown = FIRE_COOLDOWN * this.fireCooldownMultiplier;
  }

  /**
   * Set fire cooldown multiplier from shop upgrade (fireRateUp).
   * A multiplier < 1.0 shortens the cooldown (faster fire rate).
   */
  public setFireCooldownMultiplier(m: number): void {
    this.fireCooldownMultiplier = m;
  }

  /**
   * Set movement speed multiplier from shop upgrade (moveSpeed).
   * A multiplier > 1.0 increases the speed.
   */
  public setSpeedMultiplier(m: number): void {
    this.speedMultiplier = m;
  }
}
