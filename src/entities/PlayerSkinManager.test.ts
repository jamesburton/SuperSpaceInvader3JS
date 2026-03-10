import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scene, MeshStandardMaterial } from 'three';
import { Player } from './Player';
import { PlayerSkinManager } from './PlayerSkinManager';

describe('PlayerSkinManager', () => {
  let scene: Scene;
  let player: Player;
  let manager: PlayerSkinManager;

  beforeEach(() => {
    scene = new Scene();
    player = new Player(scene);
    manager = new PlayerSkinManager();
  });

  it('swaps geometry and material in place for a purchased skin', () => {
    const meshRef = player.mesh;
    const oldGeometry = player.mesh.geometry;
    const oldMaterial = player.mesh.material as MeshStandardMaterial;
    const disposeGeometry = vi.spyOn(oldGeometry, 'dispose');
    const disposeMaterial = vi.spyOn(oldMaterial, 'dispose');

    manager.applySkin(player, 'delta', 'magenta');

    expect(player.mesh).toBe(meshRef);
    expect(player.mesh.geometry).not.toBe(oldGeometry);
    expect(player.mesh.material).not.toBe(oldMaterial);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);

    const material = player.mesh.material as MeshStandardMaterial;
    expect(material.color.getHex()).toBe(0xff00ff);
    expect(material.emissive.getHex()).toBe(0xff00ff);
    expect(material.emissiveIntensity).toBe(1.2);
  });

  it('falls back to default geometry and white material for unknown IDs', () => {
    manager.applySkin(player, 'missing-shape', 'missing-color');

    const position = player.mesh.geometry.getAttribute('position');
    const material = player.mesh.material as MeshStandardMaterial;

    expect(position.count).toBe(6);
    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.emissive.getHex()).toBe(0xffffff);
  });
});
