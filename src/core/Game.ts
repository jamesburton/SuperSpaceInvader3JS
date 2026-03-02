import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { ObjectPool } from './ObjectPool';
import { Player } from '../entities/Player';
import { Bullet, createBulletPools } from '../entities/Bullet';
import { WeaponSystem } from '../systems/WeaponSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { FIXED_STEP, MAX_DELTA } from '../utils/constants';

export class Game {
  public readonly scene: SceneManager;
  public readonly input: InputManager;

  // Entities
  private player!: Player;

  // Pools
  private playerBulletPool!: ObjectPool<Bullet>;
  private enemyBulletPool!: ObjectPool<Bullet>;

  // Active entity lists (bullets acquired from pool, managed here)
  private readonly activeBullets: Bullet[] = [];

  // Systems
  private readonly weaponSystem = new WeaponSystem();
  private readonly movementSystem = new MovementSystem();

  // Loop state
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(container: HTMLElement) {
    this.scene = new SceneManager(container);
    this.input = new InputManager();
  }

  public init(): void {
    // Create bullet pools — all meshes added to scene once here
    const { playerPool, enemyPool } = createBulletPools(this.scene.scene);
    this.playerBulletPool = playerPool;
    this.enemyBulletPool = enemyPool;

    // Create player
    this.player = new Player(this.scene.scene);

    console.log('[Game] Engine initialized');
    console.log(`[Game] Player bullet pool: ${this.playerBulletPool.totalSize} slots`);
    console.log(`[Game] Enemy bullet pool: ${this.enemyBulletPool.totalSize} slots`);
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.scene.renderer.setAnimationLoop((time: number) => this.loop(time));
  }

  public stop(): void {
    this.running = false;
    this.scene.renderer.setAnimationLoop(null);
  }

  private loop(time: number): void {
    if (!this.running) return;

    // Delta capped at MAX_DELTA (200ms) to prevent spiral-of-death on tab switch
    const delta = Math.min((time - this.lastTime) / 1000, MAX_DELTA);
    this.lastTime = time;

    // Fixed-timestep accumulator: run physics at exactly 60Hz
    this.accumulator += delta;
    while (this.accumulator >= FIXED_STEP) {
      this.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    // Render every frame (variable rate) with interpolation alpha for smooth visuals
    const alpha = this.accumulator / FIXED_STEP;
    this.render(alpha);
  }

  /**
   * Fixed-rate update — all physics, movement, collision, AI happens here.
   * Called at exactly FIXED_STEP (1/60s) regardless of frame rate.
   * @param dt Fixed timestep (always 1/60)
   */
  private update(dt: number): void {
    // 1. Weapon input — justPressed must be checked BEFORE clearJustPressed
    this.weaponSystem.update(dt, this.input, this.player, this.playerBulletPool, this.activeBullets);

    // 2. Player movement
    const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');
    const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
    this.player.update(dt, left, right);

    // 3. Bullet movement and culling
    this.movementSystem.updateBullets(
      dt,
      this.activeBullets,
      this.playerBulletPool,
      this.enemyBulletPool,
    );

    // 4. Clear just-pressed keys — MUST be last input operation each update step
    this.input.clearJustPressed();
  }

  /**
   * Variable-rate render — called every animation frame.
   * @param _alpha Interpolation factor (0-1) for smooth rendering between physics steps
   */
  private render(_alpha: number): void {
    this.scene.render();
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
  }
}
