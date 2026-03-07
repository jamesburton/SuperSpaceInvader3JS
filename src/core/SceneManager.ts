import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  Color,
  LineLoop,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
} from 'three';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';
import { BloomEffect } from '../effects/BloomEffect';
import { CRTManager } from '../effects/CRTManager';

export class SceneManager {
  public readonly scene: Scene;
  public readonly camera: OrthographicCamera;
  public readonly renderer: WebGLRenderer;

  private bloomEffect: BloomEffect | null = null;
  private crtManager: CRTManager | null = null;

  constructor(container: HTMLElement) {
    this.scene = new Scene();
    this.scene.background = new Color(0x000000);

    // Fixed orthographic camera — always shows exactly WORLD_WIDTH × WORLD_HEIGHT.
    // Game logic can treat these as the true play area bounds at all times.
    this.camera = new OrthographicCamera(
      -WORLD_WIDTH / 2, WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2, -WORLD_HEIGHT / 2,
      0.1, 100,
    );
    this.camera.position.z = 10;

    this.renderer = new WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Letterbox: fill maximum viewport space while preserving 4:3 aspect ratio.
    // The container (#game-viewport) is flex-centred in the full-viewport parent.
    const { w, h } = this.letterboxSize();
    container.style.width  = `${w}px`;
    container.style.height = `${h}px`;
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    // Dim border marks the play-area edges so the boundary is always visible.
    const hw = WORLD_WIDTH / 2 - 1;
    const hh = WORLD_HEIGHT / 2 - 1;
    const borderGeo = new BufferGeometry();
    borderGeo.setAttribute('position', new Float32BufferAttribute([
      -hw, -hh, 0,
       hw, -hh, 0,
       hw,  hh, 0,
      -hw,  hh, 0,
    ], 3));
    this.scene.add(new LineLoop(borderGeo, new LineBasicMaterial({ color: 0x333366 })));

    window.addEventListener('resize', () => this.onResize(container));
  }

  private letterboxSize(): { w: number; h: number } {
    const gameAspect   = WORLD_WIDTH / WORLD_HEIGHT;
    const screenAspect = window.innerWidth / window.innerHeight;
    if (screenAspect > gameAspect) {
      // Screen wider than 4:3 — pillarbox (fit to height)
      return { w: Math.round(window.innerHeight * gameAspect), h: window.innerHeight };
    } else {
      // Screen taller than 4:3 — letterbox (fit to width)
      return { w: window.innerWidth, h: Math.round(window.innerWidth / gameAspect) };
    }
  }

  private onResize(container: HTMLElement): void {
    const { w, h } = this.letterboxSize();
    container.style.width  = `${w}px`;
    container.style.height = `${h}px`;
    this.renderer.setSize(w, h);
    this.bloomEffect?.setSize(w, h);
    // Camera projection is fixed — no update needed.
  }

  /**
   * Initialise the bloom post-processing pipeline.
   * Returns the BloomEffect so Game.ts can register emissive meshes via
   * bloom.bloomEffect.selection.add(mesh).
   * Call once during Game.init(), after all entities have been created.
   */
  public initBloom(): BloomEffect {
    this.bloomEffect = new BloomEffect(this.renderer, this.scene, this.camera);
    return this.bloomEffect;
  }

  /**
   * Initialise the CRT post-processing pass (added after bloom).
   * Must be called after initBloom() so the CRT EffectPass is ordered after the bloom pass.
   * Returns null if bloom is not initialised or tier is null/invalid (CRT not unlocked).
   *
   * @param tier      - CRT tier (1/2/3) or null if not unlocked
   * @param intensity - Effect intensity in [0.0, 1.0]
   */
  public initCrt(tier: number | null, intensity: number): CRTManager | null {
    if (!this.bloomEffect || tier === null || tier < 1) return null;
    this.crtManager = new CRTManager();
    this.crtManager.init(this.bloomEffect.composer, this.camera, tier, intensity);
    return this.crtManager;
  }

  /** Access the CRTManager after initCrt() has been called. */
  public get crt(): CRTManager | null {
    return this.crtManager;
  }

  /**
   * Render via EffectComposer (bloom active).
   * Used by PlayingState.render() only — other states call render() directly.
   */
  public renderWithEffects(alpha: number): void {
    if (this.bloomEffect) {
      this.bloomEffect.render(1 / 60); // fixed timestep delta for composer
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    void alpha;
  }

  /**
   * Render the scene. Routes through EffectComposer when bloom (and optionally CRT)
   * is active so all game states receive post-processing effects.
   * TitleState, GameOverState, and any other non-playing states call this method;
   * by routing through the composer here, CRT applies globally across all states.
   */
  public render(): void {
    if (this.bloomEffect) {
      this.bloomEffect.render(1 / 60);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    this.crtManager?.dispose();
    this.bloomEffect?.dispose();
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
