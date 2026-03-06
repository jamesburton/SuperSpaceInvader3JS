# Phase 6: Foundation - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

MetaStore v4 schema migration (SHOP-08) + full audio system (AUD-01 through AUD-07). Players upgrading from v1.0 have their save data intact and can hear full audio in every game session. This is the first v1.1 phase — no prior v1.1 code exists.

</domain>

<decisions>
## Implementation Decisions

### SFX Sound Style
- Synth-electronic aesthetic — punchy synthesized sounds (laser zaps, digital explosions, electronic whooshes) matching the Neon Tokyo cyberpunk visual identity
- Rate-limited playback — cap concurrent instances per SFX type (e.g., max 3 weapon fire overlaps) to prevent audio mud during intense waves while staying responsive
- One shared death SFX for all enemy types — per-type SFX deferred to AUD-08 (v1.1.5+)
- Geometry Wars / Resogun vibe — punchy synth explosions, electronic zaps, intense feedback

### Audio Asset Strategy
- BGM: source a royalty-free synthwave loop from free libraries (Pixabay, Freesound, OpenGameArt)
- SFX: curate from free SFX packs (Freesound/Pixabay/Kenney), with light editing (trim, normalize) as needed
- Audio files committed to repo in /public/audio/ — portfolio piece should be standalone, no external dependencies
- Format: MP3 + OGG fallback — Howler.js handles format selection automatically

### Volume Control Layout
- Master volume only — single slider + mute toggle, matching AUD-06 spec exactly
- Inline in pause overlay — volume slider + mute button rendered directly below "PAUSED" and "PRESS ESC TO RESUME" in existing pause screen DOM overlay
- No HUD indicator — volume only accessible from pause menu, keeps gameplay HUD clean
- M key toggles mute during gameplay without pausing — convenient, low risk of accidental press (M not near movement keys)

### MetaStore v4 Migration
- All v1.1 fields added upfront in one migration (v3 → v4) — no v5 needed later
- Fields: volume, muted, selectedSkin { shapeId, colorId }, crtTier, crtIntensity, difficulty, startingPowerUp, extraLivesPurchased
- Sensible defaults on migration: volume 0.8, muted false, skin default + white, CRT null (not unlocked), difficulty 'normal'
- No migration bonus — clean migration, no freebies, keeps economy consistent

### Claude's Discretion
- Exact Howler.js configuration (sprite pooling, audio sprite vs individual files)
- SFX rate-limiting implementation details (max concurrent, cooldown timing)
- AudioContext unlock strategy (first keypress gesture handling)
- Pause overlay layout/styling for volume controls
- Exact volume slider step granularity

</decisions>

<specifics>
## Specific Ideas

- SFX vibe should match Geometry Wars / Resogun — punchy synth explosions, electronic zaps, intense responsive feedback
- BGM should be a clean synthwave loop with no audible gap at the loop boundary (AUD-01)
- Portfolio piece — all assets self-contained in repo, no CDN or external URLs
- M key mute shortcut is a quality-of-life addition beyond the AUD-06 requirement

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MetaState.ts`: Zustand persist store with clean v0→v1→v2→v3 migration chain — extend to v4
- `HUD.ts`: DOM overlay pattern (`showOverlay()` / `hideOverlay()`) — volume controls use same pattern
- `PausedState.ts`: Currently shows minimal HTML overlay — extend with volume UI

### Established Patterns
- Zustand persist with versioned migration — MetaStore already has 3 successful migrations
- Setter injection for cross-system dependencies (`CollisionSystem.setParticleManager()`) — AudioManager can follow same pattern
- `wasHitThisStep()` / `consumePickupName()` auto-reset-on-read pattern — SFX triggers can piggyback on these existing signals
- RunState as plain TS singleton for volatile state — AudioManager should be similar singleton pattern

### Integration Points
- `WeaponSystem.update()`: fires bullets + triggers muzzle flash — add weapon fire SFX here
- `CollisionSystem.update()`: `wasHitThisStep()` for player hit, `consumePickupName()` for pickup — add SFX triggers
- `CollisionSystem.update()`: enemy death section (line ~132-153) — add death SFX
- `PausedState.enter()`: renders pause overlay HTML — extend with volume controls
- `HUD.showWaveAnnouncement()`: wave start visual — add wave start SFX
- `InputManager`: keyboard-only, processes keycodes — add M key mute handling
- `Game.ts init()`: system wiring — wire AudioManager with setter injection

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-foundation*
*Context gathered: 2026-03-06*
