import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  Color,
} from 'three';
import { WORLD_HEIGHT } from '../utils/constants';

export class SceneManager {
  public readonly scene: Scene;
  public readonly camera: OrthographicCamera;
  public readonly renderer: WebGLRenderer;

  constructor(container: HTMLElement) {
    this.scene = new Scene();
    this.scene.background = new Color(0x000000);

    // OrthographicCamera maps WORLD_WIDTH x WORLD_HEIGHT logical units to screen
    // This makes hitbox math exact and eliminates perspective distortion
    const aspect = container.clientWidth / container.clientHeight;
    const halfH = WORLD_HEIGHT / 2;
    const halfW = halfH * aspect;
    this.camera = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
    this.camera.position.z = 10;

    this.renderer = new WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Resize handling — update camera aspect ratio and renderer size
    window.addEventListener('resize', () => this.onResize(container));
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const aspect = w / h;
    const halfH = WORLD_HEIGHT / 2;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Call on scene teardown to prevent VRAM leaks.
   * Iterates scene children and disposes geometry + material.
   */
  public dispose(): void {
    this.scene.traverse((obj) => {
      if ('geometry' in obj && obj.geometry) {
        (obj as { geometry: { dispose(): void } }).geometry.dispose();
      }
      if ('material' in obj && obj.material) {
        const mat = (obj as { material: unknown }).material;
        if (Array.isArray(mat)) {
          mat.forEach((m: { dispose(): void }) => m.dispose());
        } else {
          (mat as { dispose(): void }).dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
