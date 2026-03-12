import {
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  MeshStandardMaterial,
  Color,
} from 'three';
import type { Scene } from 'three';
import { WORLD_HEIGHT } from '../utils/constants';
import { BOSS_DEF, getBossConfig, type BossConfig } from '../config/boss';
import type { DifficultySetting } from '../state/runSetup';

/**
 * Build the boss ship angular octagon geometry.
 * 8 vertices forming a wide flattened angular hull (capital ship aesthetic).
 * Fits within 80×60 unit bounding box (AABB half-extents: width=40, height=30).
 *
 * Vertex layout (y+ is up, toward player below):
 *   0: top center      (  0,  30, 0)
 *   1: top right       ( 25,  20, 0)
 *   2: right           ( 40,   0, 0)
 *   3: bottom right    ( 30, -30, 0)
 *   4: bottom center   (  0, -30, 0)  — flat bottom
 *   5: bottom left     (-30, -30, 0)
 *   6: left            (-40,   0, 0)
 *   7: top left        (-25,  20, 0)
 *
 * Triangulated as a fan from vertex 0 (CCW winding viewed from +Z).
 */
function makeBossGeometry(): BufferGeometry {
  const positions = new Float32Array([
     0,  30, 0, // 0 top center
    25,  20, 0, // 1 top right
    40,   0, 0, // 2 right
    30, -30, 0, // 3 bottom right
     0, -30, 0, // 4 bottom center
   -30, -30, 0, // 5 bottom left
   -40,   0, 0, // 6 left
   -25,  20, 0, // 7 top left
  ]);
  // Fan from vertex 0, CCW winding
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4, 0, 6, 5, 0, 7, 6]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

export class BossEnemy {
  public x: number = 0;
  public y: number = (WORLD_HEIGHT / 2) - 80; // near top of screen
  public readonly width: number = BOSS_DEF.meshW / 2;   // AABB half-width = 40
  public readonly height: number = BOSS_DEF.meshH / 2;  // AABB half-height = 30
  public hp: number;
  public maxHp: number;
  public active: boolean = false;   // starts inactive; SpawnSystem/BossSystem activates it
  public currentPhase: number = 1;
  public readonly mesh: Mesh;
  private readonly mat: MeshStandardMaterial;
  private config: BossConfig = BOSS_DEF;

  constructor(scene: Scene) {
    this.hp = this.config.totalHp;
    this.maxHp = this.config.totalHp;
    const geo = makeBossGeometry();
    this.mat = new MeshStandardMaterial({
      color: this.config.phases[0].color,
      emissive: new Color(this.config.phases[0].color),
      emissiveIntensity: 1.5,
      roughness: 1.0,
      metalness: 0.0,
    });
    this.mesh = new Mesh(geo, this.mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Deal damage to the boss, clamping HP to 0. */
  public takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  /** Returns true if the boss has HP remaining and is active. */
  public isAlive(): boolean {
    return this.hp > 0 && this.active;
  }

  /** Returns HP as a fraction of maxHp (1.0 = full, 0.0 = dead). */
  public healthFraction(): number {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  /** Apply the phase color to the boss mesh material. phaseIndex 0=phase1, 1=phase2. */
  public applyPhaseColor(phaseIndex: number): void {
    const phase = this.config.phases[Math.max(0, Math.min(phaseIndex, this.config.phases.length - 1))];
    const color = phase.color;
    this.mat.color.setHex(color);
    this.mat.emissive.setHex(color);
  }

  /** Flash the mesh with flashColor for visual phase transition telegraph. */
  public applyFlashColor(phaseIndex: number): void {
    const phase = this.config.phases[Math.max(0, Math.min(phaseIndex, this.config.phases.length - 1))];
    const flash = phase.flashColor;
    this.mat.emissive.setHex(flash);
  }

  public setDifficulty(difficulty: DifficultySetting): void {
    this.config = getBossConfig(difficulty);
    this.hp = this.config.totalHp;
    this.maxHp = this.config.totalHp;
    this.currentPhase = 1;
    this.applyPhaseColor(0);
  }

  /** Activate boss — call from SpawnSystem/BossSystem at encounter start. */
  public activate(): void {
    this.hp = this.config.totalHp;
    this.maxHp = this.config.totalHp;
    this.currentPhase = 1;
    this.active = true;
    this.mesh.visible = true;
    this.applyPhaseColor(0);
    this.mesh.position.set(this.x, this.y, 0);
  }

  /** Deactivate boss mesh — call on defeat. */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  /** Sync mesh position to current x/y (call each update). */
  public updateMesh(): void {
    this.mesh.position.set(this.x, this.y, 0);
  }
}
