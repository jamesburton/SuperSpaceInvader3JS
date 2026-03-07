import {
  MeshStandardMaterial,
  Color,
} from 'three';
import type { Mesh } from 'three';
import { SHIP_SHAPES, SKIN_COLORS } from '../config/skinConfig';
import type { Player } from './Player';

/**
 * PlayerSkinManager — swap geometry + material on the player mesh in-place.
 *
 * Design notes:
 * - Swaps mesh.geometry and mesh.material directly without removing/re-adding the mesh.
 * - Bloom registration is NOT needed after swap: the bloom Selection set holds a reference
 *   to the Mesh Object3D, not its geometry or material. Swapping leaves the mesh identity intact.
 * - Disposes the old geometry and material to free GPU memory before assigning new ones.
 * - Falls back to 'default' shape and 'white' color if unknown IDs are passed.
 */
export class PlayerSkinManager {
  /**
   * Apply a skin (shape + color) to the given player mesh.
   * Called once at run start from PlayingState.applyMetaBonuses().
   *
   * @param player - The Player instance whose mesh will be modified.
   * @param shapeId - Key from SHIP_SHAPES; falls back to 'default' if not found.
   * @param colorId - Key from SKIN_COLORS; falls back to 'white' if not found.
   */
  public applySkin(player: Player, shapeId: string, colorId: string): void {
    const mesh = player.mesh as Mesh;

    // --- Dispose old geometry ---
    mesh.geometry.dispose();

    // --- Build and assign new geometry ---
    const geoFactory = SHIP_SHAPES[shapeId] ?? SHIP_SHAPES['default'];
    mesh.geometry = geoFactory();

    // --- Dispose old material ---
    const oldMat = mesh.material;
    if (Array.isArray(oldMat)) {
      oldMat.forEach(m => m.dispose());
    } else {
      (oldMat as MeshStandardMaterial).dispose();
    }

    // --- Build and assign new material ---
    const colorHex = SKIN_COLORS[colorId] ?? SKIN_COLORS['white'];
    mesh.material = new MeshStandardMaterial({
      color: colorHex,
      emissive: new Color(colorHex),
      emissiveIntensity: 1.2,
      roughness: 1.0,
      metalness: 0.0,
    });
  }
}
