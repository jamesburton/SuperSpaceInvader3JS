import type { Object3D } from 'three';
import { ObjectPool } from '../core/ObjectPool';
import { Particle } from './Particle';
import { wavePalette } from '../config/palettes';
import { runState } from '../state/RunState';
import type { Scene } from 'three';

// Pool sizes: death bursts (6-8 per kill, up to 40 enemies on screen)
const DEATH_PARTICLE_POOL_SIZE = 128;
// Muzzle flash: brief, few particles, fast recycle
const MUZZLE_PARTICLE_POOL_SIZE = 16;
// Engine trail: continuous but short-lived
const TRAIL_PARTICLE_POOL_SIZE = 32;

/**
 * ParticleManager owns three particle pools and provides spawn methods for
 * three effect types:
 *   - spawnDeathBurst()   — enemy kill: geometric shard burst matching wave palette
 *   - spawnMuzzleFlash()  — player shot: brief white flash at barrel tip
 *   - spawnEngineTrail()  — player movement: cyan trail while moving horizontally
 *
 * All particles are pooled — zero runtime heap allocation during gameplay.
 * Call registerBloom() once after BloomEffect is initialized to make all
 * particle meshes glow (handled in Plan 04 wiring).
 */
export class ParticleManager {
  private readonly deathPool: ObjectPool<Particle>;
  private readonly muzzlePool: ObjectPool<Particle>;
  private readonly trailPool: ObjectPool<Particle>;

  // Tracks which pool each live particle came from for correct release
  private readonly sourcePool: Map<Particle, ObjectPool<Particle>> = new Map();

  // All currently active particles — updated each frame
  private readonly activeParticles: Particle[] = [];

  constructor(scene: Scene) {
    this.deathPool = new ObjectPool<Particle>(
      () => new Particle(scene),
      DEATH_PARTICLE_POOL_SIZE,
    );
    this.muzzlePool = new ObjectPool<Particle>(
      () => new Particle(scene),
      MUZZLE_PARTICLE_POOL_SIZE,
    );
    this.trailPool = new ObjectPool<Particle>(
      () => new Particle(scene),
      TRAIL_PARTICLE_POOL_SIZE,
    );
  }

  /**
   * Spawn 6-8 geometric shard particles at enemy kill position.
   * Color matches the current wave palette.
   *
   * @param x World x position of the enemy
   * @param y World y position of the enemy
   * @param hexColor Wave palette color to tint the shards (pass wavePalette.getColor(wave))
   */
  public spawnDeathBurst(x: number, y: number, hexColor: number): void {
    const count = 6 + Math.floor(Math.random() * 3); // 6-8 shards
    for (let i = 0; i < count; i++) {
      const p = this.deathPool.acquire();
      if (!p) break; // pool exhausted — skip remaining shards

      // Tight radial burst with slight random jitter
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 80; // 80-160 units/second
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const rotSpeed = (Math.random() - 0.5) * 8; // ±4 rad/sec tumble
      const lifetime = 0.4 + Math.random() * 0.25; // 0.4-0.65 seconds

      p.init(x, y, vx, vy, rotSpeed, lifetime, hexColor);
      this.sourcePool.set(p, this.deathPool);
      this.activeParticles.push(p);
    }
  }

  /**
   * Spawn a brief muzzle flash at the bullet spawn point.
   * 3-4 white particles, fast upward scatter, short lifetime.
   *
   * @param x World x position of the barrel tip
   * @param y World y position of the barrel tip
   */
  public spawnMuzzleFlash(x: number, y: number): void {
    const count = 3 + Math.floor(Math.random() * 2); // 3-4 flash particles
    for (let i = 0; i < count; i++) {
      const p = this.muzzlePool.acquire();
      if (!p) break;

      // Spread upward in roughly a 180° upward arc
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 40 + Math.random() * 60;
      const vx = Math.cos(angle + Math.PI / 2) * speed * 0.3;
      const vy = Math.sin(angle + Math.PI / 2) * speed;
      const rotSpeed = (Math.random() - 0.5) * 12;
      const lifetime = 0.1 + Math.random() * 0.1; // very brief: 0.1-0.2 seconds

      p.init(x, y, vx, vy, rotSpeed, lifetime, 0xffffff); // always white flash
      this.sourcePool.set(p, this.muzzlePool);
      this.activeParticles.push(p);
    }
  }

  /**
   * Spawn a single engine trail particle below the player ship.
   * Called each fixed step while the player is moving horizontally.
   * Plan 04 calls this from PlayingState.update() when movementSystem.isMovingHorizontally.
   *
   * @param x Player world x position
   * @param y Player world y position
   */
  public spawnEngineTrail(x: number, y: number): void {
    const p = this.trailPool.acquire();
    if (!p) return;

    // Trail spawns just below the ship base at the engine exhaust position
    const trailX = x + (Math.random() - 0.5) * 8;
    const trailY = y - 12; // below the ship base
    const vx = (Math.random() - 0.5) * 20;
    const vy = -(20 + Math.random() * 30); // drift downward
    const rotSpeed = (Math.random() - 0.5) * 6;
    const lifetime = 0.2 + Math.random() * 0.15;
    const color = wavePalette.getColor(runState.wave);

    p.init(trailX, trailY, vx, vy, rotSpeed, lifetime, color);
    this.sourcePool.set(p, this.trailPool);
    this.activeParticles.push(p);
  }

  public spawnPiercingImpact(x: number, y: number, vx: number, vy: number): void {
    const speed = Math.hypot(vx, vy) || 1;
    const dirX = vx / speed;
    const dirY = vy / speed;
    for (let i = 0; i < 3; i++) {
      const p = this.trailPool.acquire();
      if (!p) break;

      const offset = (i - 1) * 10;
      const jitter = (Math.random() - 0.5) * 12;
      p.init(
        x - dirX * offset,
        y - dirY * offset,
        dirX * (40 + jitter),
        dirY * (40 + jitter),
        (Math.random() - 0.5) * 4,
        0.12 + Math.random() * 0.06,
        0x44f5ff,
      );
      this.sourcePool.set(p, this.trailPool);
      this.activeParticles.push(p);
    }
  }

  /**
   * Update all active particles. Call each fixed step before rendering.
   * Dead particles are released back to their source pool automatically.
   *
   * @param dt Fixed timestep in seconds
   */
  public update(dt: number): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      const alive = p.update(dt);
      if (!alive) {
        // Release back to the pool it came from
        const pool = this.sourcePool.get(p);
        if (pool) {
          pool.release(p);
          this.sourcePool.delete(p);
        }
        this.activeParticles.splice(i, 1);
      }
    }
  }

  /**
   * Register all pooled particle meshes with the bloom selection.
   * Call once from Game.init() after BloomEffect.initBloom().
   * Plan 04 wires this — this method is infrastructure only.
   *
   * @param addToBloom Callback that adds a mesh to the bloom selection
   */
  public registerBloom(addToBloom: (mesh: Object3D) => void): void {
    this.deathPool.forEach(p => addToBloom(p.mesh));
    this.muzzlePool.forEach(p => addToBloom(p.mesh));
    this.trailPool.forEach(p => addToBloom(p.mesh));
  }

  /**
   * Release all active particles — call on wave reset or game over.
   */
  public releaseAll(): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      const pool = this.sourcePool.get(p);
      if (pool) {
        pool.release(p);
        this.sourcePool.delete(p);
      }
    }
    this.activeParticles.length = 0;
  }
}
