import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { ObjectPool } from './ObjectPool';
import { Player } from '../entities/Player';
import { Bullet, createBulletPools } from '../entities/Bullet';
import { EnemyFormation } from '../entities/Enemy';
import { MovementSystem } from '../systems/MovementSystem';
import { AISystem } from '../systems/AISystem';
import { FIXED_STEP, MAX_DELTA } from '../utils/constants';

export class Game {
  public readonly scene: SceneManager;
  public readonly input: InputManager;

  // Entities
  private player!: Player;
  private formation!: EnemyFormation;

  // Pools
  private playerBulletPool!: ObjectPool<Bullet>;
  private enemyBulletPool!: ObjectPool<Bullet>;

  // Active entity lists
  private readonly activeBullets: Bullet[] = [];

  // Systems
  private readonly movementSystem = new MovementSystem();
  private readonly aiSystem = new AISystem();

  // Loop state
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(container: HTMLElement) {
    this.scene = new SceneManager(container);
    this.input = new InputManager();
  }

  public init(): void {
    const { playerPool, enemyPool } = createBulletPools(this.scene.scene);
    this.playerBulletPool = playerPool;
    this.enemyBulletPool = enemyPool;

    this.player = new Player(this.scene.scene);
    this.formation = new EnemyFormation(this.scene.scene);

    console.log('[Game] Engine initialized');
    console.log(`[Game] Enemy draw calls: 1 InstancedMesh for ${this.formation.activeCount} enemies`);
    console.log(`[Game] Total renderer draw calls: ${this.scene.renderer.info.render.calls}`);
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
    const delta = Math.min((time - this.lastTime) / 1000, MAX_DELTA);
    this.lastTime = time;
    this.accumulator += delta;
    while (this.accumulator >= FIXED_STEP) {
      this.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
    this.render(this.accumulator / FIXED_STEP);
  }

  private update(dt: number): void {
    // 1. Player fire input (justPressed checked before clearJustPressed)
    if (this.player.active && this.input.justPressed('Space') && this.player.canFire()) {
      const bullet = this.playerBulletPool.acquire();
      if (bullet !== null) {
        bullet.init(this.player.x, this.player.y + this.player.height + 10, true);
        this.activeBullets.push(bullet);
        this.player.recordFire();
      }
    }

    // 2. Player movement
    const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');
    const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
    this.player.update(dt, left, right);

    // 3. Enemy AI (formation march + firing)
    // reachedBottom will trigger game over in Plan 05's StateManager
    void this.aiSystem.update(
      dt,
      this.formation,
      this.enemyBulletPool,
      this.activeBullets,
    );

    // 4. Bullet movement + culling
    this.movementSystem.updateBullets(
      dt,
      this.activeBullets,
      this.playerBulletPool,
      this.enemyBulletPool,
    );

    // 5. Clear just-pressed — MUST be last input operation
    this.input.clearJustPressed();
  }

  private render(_alpha: number): void {
    this.scene.render();
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
  }
}
