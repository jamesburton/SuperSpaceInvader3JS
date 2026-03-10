import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { Object3D, Scene } from 'three';
import { ObjectPool } from '../core/ObjectPool';
import { HomingMissile } from '../entities/HomingMissile';
import type { Enemy, EnemyFormation } from '../entities/Enemy';
import type { ParticleManager } from '../effects/ParticleManager';
import type { PowerUpManager } from './PowerUpManager';
import { ENEMY_DEFS } from '../config/enemies';
import { runState } from '../state/RunState';
import { wavePalette } from '../config/palettes';
import { audioManager } from './AudioManager';

const MISSILE_POOL_SIZE = 12;
const RETICLE_POOL_SIZE = 12;
const MISSILE_SPEED = 320;
const MISSILE_LIFETIME = 2.2;
const TURN_RATE = 120 * (Math.PI / 180);

class LockReticle {
  public active = false;
  public targetEnemyId: number | null = null;
  declare public visible: boolean;
  public readonly mesh: Mesh;

  constructor(scene: Scene) {
    const geometry = new BoxGeometry(18, 18, 1);
    const material = new MeshStandardMaterial({
      color: 0xff6677,
      emissive: 0xff6677,
      emissiveIntensity: 1.1,
      roughness: 1,
      metalness: 0,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }
}

Object.defineProperty(LockReticle.prototype, 'visible', {
  get(this: LockReticle): boolean {
    return this.mesh.visible;
  },
  set(this: LockReticle, visible: boolean) {
    this.mesh.visible = visible;
    this.active = visible;
  },
  configurable: true,
  enumerable: true,
});

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export class HomingMissileManager {
  private readonly missilePool: ObjectPool<HomingMissile>;
  private readonly reticlePool: ObjectPool<LockReticle>;
  private readonly activeMissiles: HomingMissile[] = [];
  private readonly activeReticles = new Map<HomingMissile, LockReticle>();

  constructor(scene: Scene) {
    this.missilePool = new ObjectPool<HomingMissile>(() => new HomingMissile(scene), MISSILE_POOL_SIZE);
    this.reticlePool = new ObjectPool<LockReticle>(() => new LockReticle(scene), RETICLE_POOL_SIZE);
  }

  public spawnMissile(x: number, y: number, formation: EnemyFormation): boolean {
    const missile = this.missilePool.acquire();
    if (!missile) return false;

    const target = this.findNearestEnemy(x, y, formation);
    missile.init(x, y, target?.instanceIndex ?? null, MISSILE_SPEED, MISSILE_LIFETIME);
    this.activeMissiles.push(missile);

    const reticle = this.reticlePool.acquire();
    if (reticle) {
      reticle.targetEnemyId = target?.instanceIndex ?? null;
      this.activeReticles.set(missile, reticle);
      this.updateReticle(reticle, target, formation);
    }

    return true;
  }

  public update(
    dt: number,
    formation: EnemyFormation,
    powerUpManager?: PowerUpManager,
    particleManager?: ParticleManager,
  ): void {
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const missile = this.activeMissiles[i];
      if (!missile.active) continue;

      missile.lifetimeRemaining -= dt;
      if (missile.lifetimeRemaining <= 0) {
        this.releaseMissile(missile, i);
        continue;
      }

      const target = this.getTargetEnemy(missile, formation);
      if (target) {
        const targetPos = formation.getEnemyWorldPos(target);
        const desiredHeading = Math.atan2(targetPos.y - missile.y, targetPos.x - missile.x);
        const angleDelta = normalizeAngle(desiredHeading - missile.heading);
        const maxTurn = TURN_RATE * dt;
        missile.heading += Math.max(-maxTurn, Math.min(maxTurn, angleDelta));
      }

      missile.vx = Math.cos(missile.heading) * missile.speed;
      missile.vy = Math.sin(missile.heading) * missile.speed;
      missile.x += missile.vx * dt;
      missile.y += missile.vy * dt;
      missile.syncMesh();

      const reticle = this.activeReticles.get(missile);
      if (reticle) this.updateReticle(reticle, target, formation);

      if (target && this.isMissileColliding(missile, formation.getEnemyAABB(target))) {
        this.applyHit(target, formation, powerUpManager, particleManager, missile);
        this.releaseMissile(missile, i);
      }
    }
  }

  public releaseAll(): void {
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      this.releaseMissile(this.activeMissiles[i], i);
    }
  }

  public getActiveMissiles(): readonly HomingMissile[] {
    return this.activeMissiles;
  }

  public registerBloom(addToBloom: (mesh: Object3D) => void): void {
    this.missilePool.forEach((missile) => addToBloom(missile.mesh));
    this.reticlePool.forEach((reticle) => addToBloom(reticle.mesh));
  }

  private findNearestEnemy(x: number, y: number, formation: EnemyFormation): Enemy | null {
    let best: Enemy | null = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    for (const enemy of formation.enemies) {
      if (!enemy.active) continue;
      const pos = formation.getEnemyWorldPos(enemy);
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < bestDistanceSq) {
        best = enemy;
        bestDistanceSq = distanceSq;
      }
    }
    return best;
  }

  private getTargetEnemy(missile: HomingMissile, formation: EnemyFormation): Enemy | null {
    if (missile.targetEnemyId === null) return null;
    return formation.enemies.find((enemy) => enemy.instanceIndex === missile.targetEnemyId && enemy.active) ?? null;
  }

  private updateReticle(reticle: LockReticle, target: Enemy | null, formation: EnemyFormation): void {
    if (!target) {
      reticle.visible = false;
      reticle.targetEnemyId = null;
      return;
    }
    const pos = formation.getEnemyWorldPos(target);
    reticle.visible = true;
    reticle.targetEnemyId = target.instanceIndex;
    reticle.mesh.position.set(pos.x, pos.y, 0.5);
    reticle.mesh.rotation.z += 0.1;
  }

  private isMissileColliding(
    missile: HomingMissile,
    target: { x: number; y: number; w: number; h: number },
  ): boolean {
    return Math.abs(missile.x - target.x) < missile.width + target.w
      && Math.abs(missile.y - target.y) < missile.height + target.h;
  }

  private applyHit(
    enemy: Enemy,
    formation: EnemyFormation,
    powerUpManager: PowerUpManager | undefined,
    particleManager: ParticleManager | undefined,
    missile: HomingMissile,
  ): void {
    enemy.health -= 1;
    if (enemy.health > 0) return;

    const worldPos = formation.getEnemyWorldPos(enemy);
    formation.killEnemy(enemy.instanceIndex);
    runState.addScore(ENEMY_DEFS[enemy.type].scoreValue);
    runState.recordKill();
    audioManager.playSfx('enemyDeath');

    const def = ENEMY_DEFS[enemy.type];
    runState.addGold(def.sidDropAmount);
    powerUpManager?.trySpawnDrop(worldPos.x, worldPos.y, def.dropChance);
    particleManager?.spawnDeathBurst(worldPos.x, worldPos.y, wavePalette.getColor(runState.wave));
    particleManager?.spawnPiercingImpact(missile.x, missile.y, missile.vx, missile.vy);
  }

  private releaseMissile(missile: HomingMissile, index: number): void {
    const reticle = this.activeReticles.get(missile);
    if (reticle) {
      reticle.visible = false;
      reticle.targetEnemyId = null;
      this.reticlePool.release(reticle);
      this.activeReticles.delete(missile);
    }
    missile.targetEnemyId = null;
    this.missilePool.release(missile);
    this.activeMissiles.splice(index, 1);
  }
}
