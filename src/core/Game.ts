import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { ObjectPool } from './ObjectPool';
import { StateManager } from './StateManager';
import { Player } from '../entities/Player';
import { Bullet, createBulletPools } from '../entities/Bullet';
import { EnemyFormation } from '../entities/Enemy';
import { MovementSystem } from '../systems/MovementSystem';
import { AISystem } from '../systems/AISystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { HUD } from '../ui/HUD';
import { TitleState } from '../states/TitleState';
import type { PlayingStateContext } from '../states/PlayingState';
import { FIXED_STEP, MAX_DELTA } from '../utils/constants';

export class Game {
  public readonly scene: SceneManager;
  public readonly input: InputManager;
  private readonly stateManager: StateManager;

  // Accumulator state
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  constructor(container: HTMLElement) {
    this.scene = new SceneManager(container);
    this.input = new InputManager();
    this.stateManager = new StateManager();
  }

  public init(): void {
    // Create all shared resources
    const { playerPool, enemyPool } = createBulletPools(this.scene.scene);
    const playerBulletPool: ObjectPool<Bullet> = playerPool;
    const enemyBulletPool: ObjectPool<Bullet> = enemyPool;
    const activeBullets: Bullet[] = [];

    const player = new Player(this.scene.scene);
    const formation = new EnemyFormation(this.scene.scene);

    const movementSystem = new MovementSystem();
    const aiSystem = new AISystem();
    const collisionSystem = new CollisionSystem();
    const spawnSystem = new SpawnSystem();

    const hudRoot = document.getElementById('hud') as HTMLElement;
    const hud = new HUD(hudRoot);

    // PlayingStateContext — shared across all states
    const ctx: PlayingStateContext = {
      scene: this.scene,
      player,
      formation,
      playerBulletPool,
      enemyBulletPool,
      activeBullets,
      movementSystem,
      aiSystem,
      collisionSystem,
      spawnSystem,
    };

    // Apply Wave 1 palette so initial enemy formation spawns cyan (not gray default)
    spawnSystem.initPalette(formation);

    // Initialise bloom post-processing — must be called after all entities are created
    // so their meshes exist and can be registered with the SelectiveBloomEffect selection.
    const bloom = this.scene.initBloom();

    // Register player mesh for bloom (cyan emissive chevron)
    bloom.bloomEffect.selection.add(player.mesh);

    // Register all enemy row meshes for bloom (one InstancedMesh per row)
    for (const rowMesh of formation.rowMeshes) {
      bloom.bloomEffect.selection.add(rowMesh);
    }

    // Register all bullet meshes — both player (white) and enemy (red-orange) are emissive
    playerBulletPool.forEach((b) => bloom.bloomEffect.selection.add(b.mesh));
    enemyBulletPool.forEach((b) => bloom.bloomEffect.selection.add(b.mesh));

    // Start at TitleState
    this.stateManager.replace(new TitleState(this.stateManager, this.input, hud, ctx));

    console.log('[Game] All systems initialized. Starting at TitleState.');
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
      this.stateManager.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    this.stateManager.render(this.accumulator / FIXED_STEP);
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
  }
}
