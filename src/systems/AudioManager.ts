// TODO: Replace placeholder audio files in public/audio/ with real synthwave BGM and synth SFX
// before shipping v1.1. Placeholder files are silent minimal stubs — AudioManager API is fully
// functional and will work transparently with real audio assets.

import { Howl, Howler } from 'howler';
import { useMetaStore } from '../state/MetaState';

/**
 * Union type of all SFX identifiers. Provides typed playSfx() calls at every callsite.
 * Matches the filenames in public/audio/sfx-*.
 */
export type SfxKey =
  | 'shoot'
  | 'enemyDeath'
  | 'playerHit'
  | 'pickup'
  | 'waveStart'
  | 'bossPhase'
  | 'gameOver'
  | 'pause'
  | 'purchase'
  | 'menuNav';

/**
 * Extended MetaStore shape that includes v4 fields added by plan 06-01.
 * AudioManager was designed to run after the v4 migration; we use optional chaining
 * as a safety net if called before 06-01 has run.
 */
interface MetaStoreV4 {
  volume?: number;
  muted?: boolean;
  setVolume?: (v: number) => void;
  setMuted?: (m: boolean) => void;
}

/**
 * AudioManager singleton wrapping Howler.js.
 *
 * Responsibilities:
 *   - BGM: gapless looping synthwave track (AUD-01)
 *   - SFX: typed dispatch with pool:3 rate-limiting (AUD-02, AUD-03, AUD-04)
 *   - AudioContext unlock on first keydown (AUD-05)
 *   - Volume + mute control persisted via MetaStore v4 (AUD-06, AUD-07)
 *
 * Usage:
 *   import { audioManager } from '../systems/AudioManager';
 *   audioManager.init();          // call once in Game.init()
 *   audioManager.playBgm();       // call from PlayingState.enter()
 *   audioManager.playSfx('shoot'); // call at every SFX trigger point
 */
class AudioManagerClass {
  private bgm: Howl | null = null;
  private sfxMap: Map<SfxKey, Howl> = new Map();
  private _unlocked = false;

  /**
   * Initialise the audio system. Must be called once before any other method.
   * Reads volume/muted from MetaStore v4 fields (falls back to 0.8/false if not yet migrated).
   * Creates all Howl instances (BGM + SFX) eagerly to avoid per-frame allocation.
   * Registers a one-shot keydown listener to unlock the AudioContext (AUD-05).
   */
  public init(): void {
    const meta = useMetaStore.getState() as MetaStoreV4;
    const volume = meta.volume ?? 0.8;
    const muted = meta.muted ?? false;

    // Apply persisted preferences to Howler globals
    Howler.volume(volume);
    if (muted) Howler.mute(true);

    // --- BGM Howl ---
    // OGG listed first: OGG Vorbis has more reliable gapless looping than MP3
    // (MP3 encoder adds silence padding at boundaries — see RESEARCH.md Pitfall 1).
    // html5: false (default) = Web Audio API path, which loops with exact sample precision.
    // Do NOT pass html5: true — HTML5 Audio has a loop gap in all browsers.
    this.bgm = new Howl({
      src: ['/audio/bgm-synthwave.ogg', '/audio/bgm-synthwave.mp3'],
      loop: true,
      volume: 1.0,  // Master volume is controlled globally via Howler.volume(); per-Howl stays at 1
    });

    // --- SFX Howls ---
    // pool: 3 = at most 3 concurrent instances per SFX type.
    // This prevents audio mud during intense waves (e.g., 3 simultaneous shoot sounds max).
    // OGG listed first for consistency; MP3 as fallback for browsers without OGG codec.
    const sfxDefs: [SfxKey, string][] = [
      ['shoot',      '/audio/sfx-shoot'],
      ['enemyDeath', '/audio/sfx-enemy-death'],
      ['playerHit',  '/audio/sfx-player-hit'],
      ['pickup',     '/audio/sfx-pickup'],
      ['waveStart',  '/audio/sfx-wave-start'],
      ['bossPhase',  '/audio/sfx-boss-phase'],
      ['gameOver',   '/audio/sfx-game-over'],
      ['pause',      '/audio/sfx-pause'],
      ['purchase',   '/audio/sfx-purchase'],
      ['menuNav',    '/audio/sfx-menu-nav'],
    ];
    for (const [key, base] of sfxDefs) {
      this.sfxMap.set(
        key,
        new Howl({
          src: [`${base}.ogg`, `${base}.mp3`],
          pool: 3, // rate-limit: max 3 concurrent instances per SFX type
        }),
      );
    }

    // --- AudioContext unlock (AUD-05) ---
    // Chrome creates all new AudioContexts in "suspended" state until a user gesture
    // occurs in the browser event loop. Howler's own _autoResume may not fire
    // synchronously on the first gesture. Belt-and-suspenders: listen for the first
    // keydown and call Howler.ctx.resume() ourselves.
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        void Howler.ctx.resume();
      }
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('keydown', unlock);
  }

  /**
   * Start the BGM loop. Call from PlayingState.enter() — this always follows a user
   * gesture (pressing start/confirm), so the AudioContext will be in the unlocked state.
   */
  public playBgm(): void {
    this.bgm?.play();
  }

  /**
   * Stop the BGM. Call from GameOverState.enter() or when returning to the title menu.
   */
  public stopBgm(): void {
    this.bgm?.stop();
  }

  /**
   * Play a sound effect by key. Silent no-op if the key is not found in the map.
   * Each call reuses or creates a sound node from the pool (capped at pool:3 per Howl).
   * Do NOT call from a continuous isDown() check — wire to justPressed() / event signals
   * to avoid saturating the pool within a single game tick.
   */
  public playSfx(key: SfxKey): void {
    this.sfxMap.get(key)?.play();
  }

  /**
   * Set master volume (0–1). Updates both Howler and MetaStore v4 atomically.
   * Never call useMetaStore.getState().setVolume() without also calling Howler.volume()
   * — always go through this method to keep them in sync.
   */
  public setVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    Howler.volume(clamped);
    const meta = useMetaStore.getState() as MetaStoreV4;
    meta.setVolume?.(clamped);
  }

  /**
   * Set global mute state. Updates both Howler and MetaStore v4 atomically.
   */
  public setMuted(muted: boolean): void {
    Howler.mute(muted);
    const meta = useMetaStore.getState() as MetaStoreV4;
    meta.setMuted?.(muted);
  }

  /** Current mute state from MetaStore (falls back to false if v4 not yet migrated). */
  public get isMuted(): boolean {
    return (useMetaStore.getState() as MetaStoreV4).muted ?? false;
  }

  /** Current master volume from Howler globals (source of truth). */
  public get volume(): number {
    return Howler.volume() as number;
  }
}

/** Module-level singleton — matches RunState/runState pattern established in v1.0. */
export const audioManager = new AudioManagerClass();
