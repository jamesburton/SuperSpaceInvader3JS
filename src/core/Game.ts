import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { ObjectPool } from './ObjectPool';
import { StateManager } from './StateManager';
import { Player } from '../entities/Player';
import { Bullet, createBulletPools } from '../entities/Bullet';
import { EnemyFormation } from '../entities/Enemy';
import { MovementSystem } from '../systems/MovementSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { AISystem } from '../systems/AISystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { PowerUpManager } from '../systems/PowerUpManager';
import { ParticleManager } from '../effects/ParticleManager';
import { CameraShake } from '../effects/CameraShake';
import { BossHealthBar } from '../ui/BossHealthBar';
import { PickupFeedback } from '../ui/PickupFeedback';
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
    const weaponSystem = new WeaponSystem();      // Phase 3: canonical player fire path
    const aiSystem = new AISystem();
    const collisionSystem = new CollisionSystem();
    const spawnSystem = new SpawnSystem();
    const powerUpManager = new PowerUpManager(this.scene.scene); // Phase 3: drop spawner + active state

    const hudRoot = document.getElementById('hud') as HTMLElement;
    const hud = new HUD(hudRoot);

    // Phase 2: construct particle, shake, and stub UI components
    const particleManager = new ParticleManager(this.scene.scene);
    const cameraShake = new CameraShake();
    const bossHealthBar = new BossHealthBar(hudRoot);
    const pickupFeedback = new PickupFeedback(hudRoot);

    // PlayingStateContext — shared across all states
    const ctx: PlayingStateContext = {
      scene: this.scene,
      player,
      formation,
      playerBulletPool,
      enemyBulletPool,
      activeBullets,
      movementSystem,
      weaponSystem,      // Phase 3
      aiSystem,
      collisionSystem,
      spawnSystem,
      particleManager,   // Phase 2
      cameraShake,       // Phase 2
      bossHealthBar,     // Phase 2 stub (Phase 4 activates)
      pickupFeedback,    // Phase 2 stub (Phase 3 activates in 03-07)
      powerUpManager,    // Phase 3
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

    // Phase 2: register particle meshes with bloom so particles glow
    particleManager.registerBloom((mesh) => bloom.bloomEffect.selection.add(mesh));

    // Phase 3: register pickup token meshes with bloom so tokens glow
    powerUpManager.registerBloom((mesh) => bloom.bloomEffect.selection.add(mesh));

    // Phase 2: wire particle manager into collision system for death burst effects
    collisionSystem.setParticleManager(particleManager);

    // Phase 3: wire power-up manager into collision system for pickup/shield/SID drops
    collisionSystem.setPowerUpManager(powerUpManager);

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
