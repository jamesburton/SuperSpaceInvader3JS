import { EffectComposer, EffectPass, RenderPass, SelectiveBloomEffect } from 'postprocessing';
import type { WebGLRenderer, Scene, OrthographicCamera } from 'three';

/**
 * BloomEffect wraps pmndrs/postprocessing EffectComposer with SelectiveBloomEffect.
 *
 * SelectiveBloomEffect uses a Selection (Set<Object3D>) to target only registered meshes.
 * Register emissive meshes via: bloomEffect.selection.add(mesh)
 * Non-emissive objects (border LineLoop, background) are not added and will not bloom.
 * HUD is DOM-based and entirely outside the WebGL pipeline — unaffected by any post-processing.
 */
export class BloomEffect {
  /** Exposed as public so CRTManager can addPass() to the same EffectComposer after bloom init */
  public readonly composer: EffectComposer;

  /** Exposed so Game.ts can register emissive meshes via selection.add(mesh) */
  public readonly bloomEffect: SelectiveBloomEffect;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: OrthographicCamera) {
    this.composer = new EffectComposer(renderer);

    // Pass 1: render the scene normally
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Pass 2: selective bloom — only objects added to bloomEffect.selection glow
    // SelectiveBloomEffect.selection is a Selection (extends Set<Object3D>)
    // Default selection layer is 10 or 11 (library managed), exclusive=false by default
    const bloom = new SelectiveBloomEffect(scene, camera, {
      intensity: 1.8,
      luminanceThreshold: 0.15,
      luminanceSmoothing: 0.05,
      radius: 0.75,
      mipmapBlur: true,
    });

    this.bloomEffect = bloom;

    const effectPass = new EffectPass(camera, bloom);
    this.composer.addPass(effectPass);
  }

  /** Call each frame instead of renderer.render() */
  public render(deltaTime: number): void {
    this.composer.render(deltaTime);
  }

  /** Call when renderer is resized so composer render targets match */
  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  public dispose(): void {
    this.composer.dispose();
  }
}
