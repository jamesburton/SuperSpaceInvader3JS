import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { ObjectPool } from './ObjectPool';
import { Player } from '../entities/Player';
import { Bullet, createBulletPools } from '../entities/Bullet';
import { EnemyFormation } from '../entities/Enemy';
import { MovementSystem } from '../systems/MovementSystem';
import { AISystem } from '../systems/AISystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { runState } from '../state/RunState';
import { useMetaStore } from '../state/MetaState';
import { HUD } from '../ui/HUD';
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
  private readonly activeBullets: Bullet[] = [];

  // Systems
  private readonly movementSystem = new MovementSystem();
  private readonly aiSystem = new AISystem();
  private readonly collisionSystem = new CollisionSystem();
  private readonly spawnSystem = new SpawnSystem();

  // UI
  private hud!: HUD;

  // Loop state
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  // Game phase flags (Plan 05 replaces with StateManager)
  private isPaused: boolean = false;
  private isGameOver: boolean = false;

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

    const hudRoot = document.getElementById('hud') as HTMLElement;
    this.hud = new HUD(hudRoot);
    this.hud.sync(runState.snapshot());

    console.log('[Game] All systems initialized. MetaState loaded from localStorage:', useMetaStore.getState());
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
    if (this.isGameOver || this.isPaused) {
      this.input.clearJustPressed();
      return;
    }

    // 1. Player fire input
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

    // 3. Spawn system (wave transition — pauses AI during wave change)
    const isTransitioning = this.spawnSystem.update(
      dt,
      this.formation,
      this.playerBulletPool,
      this.enemyBulletPool,
      this.activeBullets,
      this.hud,
    );

    if (!isTransitioning) {
      // 4. Enemy AI (formation march + firing)
      const reachedBottom = this.aiSystem.update(
        dt,
        this.formation,
        this.enemyBulletPool,
        this.activeBullets,
      );
      if (reachedBottom) {
        this.triggerGameOver(); // Plan 05 adds proper game-over screen
      }
    }

    // 5. Bullet movement + culling
    this.movementSystem.updateBullets(
      dt,
      this.activeBullets,
      this.playerBulletPool,
      this.enemyBulletPool,
    );

    // 6. Collision detection
    this.collisionSystem.update(
      dt,
      this.activeBullets,
      this.player,
      this.formation,
      this.playerBulletPool,
      this.enemyBulletPool,
    );

    // 7. Check lives
    if (runState.lives <= 0 && !this.isGameOver) {
      this.triggerGameOver();
    }

    // 8. Sync HUD
    this.hud.sync(runState.snapshot());

    // 9. Clear just-pressed — MUST be last input operation
    this.input.clearJustPressed();
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    runState.setPhase('gameover');
    // Update high score in persistent MetaState
    useMetaStore.getState().updateHighScore(runState.score);
    // Plan 05 replaces this with full GameOver screen and StateManager
    this.hud.showOverlay(`
      <h1 style="font-size:48px;margin-bottom:24px;text-shadow:0 0 20px #fff;">GAME OVER</h1>
      <p style="font-size:24px;margin:8px 0;">Score: ${runState.score}</p>
      <p style="font-size:24px;margin:8px 0;">Wave: ${runState.wave}</p>
      <p style="font-size:24px;margin:8px 0;">Kills: ${runState.enemiesKilled}</p>
      <p style="font-size:18px;margin-top:32px;opacity:0.7;">Press R to restart</p>
    `);

    // Restart on R key (placeholder — Plan 05 adds proper StateManager)
    const restartHandler = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        window.removeEventListener('keydown', restartHandler);
        this.restart();
      }
    };
    window.addEventListener('keydown', restartHandler);
  }

  private restart(): void {
    runState.reset();
    this.hud.hideOverlay();
    this.isGameOver = false;
    this.player.active = true;
    this.player.mesh.visible = true;
    this.player.lives = runState.lives; // sync entity lives with runState
    this.player.x = 0;
    this.formation.spawnWave();
    this.activeBullets.forEach((b) => {
      if (b.isPlayerBullet) this.playerBulletPool.release(b);
      else this.enemyBulletPool.release(b);
    });
    this.activeBullets.length = 0;
    this.collisionSystem.reset();
    this.spawnSystem.reset();
    this.aiSystem.reset();
  }

  private render(_alpha: number): void {
    this.scene.render();
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
  }
}
