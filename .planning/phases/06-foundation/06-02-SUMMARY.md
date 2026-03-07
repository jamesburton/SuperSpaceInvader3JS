---
phase: 06-foundation
plan: 02
subsystem: audio
tags: [howler, audio, sfx, bgm, web-audio, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: "MetaStore v4 fields (volume, muted, setVolume, setMuted)"
provides:
  - "AudioManager singleton (src/systems/AudioManager.ts) with init/playBgm/stopBgm/playSfx/setVolume/setMuted API"
  - "SfxKey union type for typed SFX dispatch"
  - "Howler.js installed as runtime dependency"
  - "22 placeholder audio files in public/audio/ (11 MP3 + 11 OGG)"
affects:
  - "06-03 (SFX wiring into WeaponSystem/CollisionSystem)"
  - "06-04 (volume controls in pause overlay)"

# Tech tracking
tech-stack:
  added:
    - "howler ^2.2.4 (runtime dep)"
    - "@types/howler ^2.2.12 (devDep)"
  patterns:
    - "AudioManager singleton matches RunState/runState module-export pattern"
    - "All Howl instances created eagerly in init() — never per-frame"
    - "Pool:3 per SFX Howl for rate-limiting concurrent instances"
    - "OGG listed first in BGM src array for gapless looping (RESEARCH Pitfall 1)"
    - "MetaStoreV4 local interface with optional fields for forward-compatible design"

key-files:
  created:
    - src/systems/AudioManager.ts
    - public/audio/bgm-synthwave.mp3
    - public/audio/bgm-synthwave.ogg
    - public/audio/sfx-shoot.mp3 (+ .ogg)
    - public/audio/sfx-enemy-death.mp3 (+ .ogg)
    - public/audio/sfx-player-hit.mp3 (+ .ogg)
    - public/audio/sfx-pickup.mp3 (+ .ogg)
    - public/audio/sfx-wave-start.mp3 (+ .ogg)
    - public/audio/sfx-boss-phase.mp3 (+ .ogg)
    - public/audio/sfx-game-over.mp3 (+ .ogg)
    - public/audio/sfx-pause.mp3 (+ .ogg)
    - public/audio/sfx-purchase.mp3 (+ .ogg)
    - public/audio/sfx-menu-nav.mp3 (+ .ogg)
  modified:
    - package.json (howler added)
    - package-lock.json

key-decisions:
  - "Placeholder audio files generated via Node.js binary WAV/MP3 (no ffmpeg available) — TODO: replace with real synthwave BGM and synth SFX before v1.1 ship"
  - "AudioManager uses MetaStoreV4 local interface with optional chaining for v4 methods — safe to run before or after 06-01 migration"
  - "OGG listed first in BGM src array per RESEARCH.md Pitfall 1 (MP3 encoder adds silence padding at loop boundary)"
  - "html5:false (default) on BGM Howl — Web Audio API path ensures gapless loop"
  - "pool:3 on all SFX Howls — caps concurrent instances to prevent audio mud during intense waves"

patterns-established:
  - "Pattern: AudioManager singleton — module-level class instance export (audioManager), mirrors RunState/runState pattern"
  - "Pattern: Eager Howl init — all Howl instances created in init(), play() called repeatedly from callsites"
  - "Pattern: Atomic audio+persist updates — setVolume/setMuted update Howler AND MetaStore in one call"
  - "Pattern: AudioContext unlock — one-shot keydown listener in init() calls Howler.ctx.resume() if suspended"

requirements-completed: [AUD-01, AUD-05]

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 6 Plan 02: AudioManager Summary

**Howler.js audio engine singleton with gapless BGM loop, typed SFX dispatch (pool:3 rate-limiting), and AudioContext unlock on first keydown**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T10:05:37Z
- **Completed:** 2026-03-07T10:09:25Z
- **Tasks:** 2
- **Files modified:** 15 (AudioManager.ts + package.json + 22 audio assets, package-lock.json)

## Accomplishments

- Installed Howler.js 2.2.4 as runtime dependency with @types/howler dev types
- Created 22 placeholder audio files (11 MP3 + 11 OGG) covering BGM and all 10 SFX types
- Built AudioManager singleton with full typed API: init/playBgm/stopBgm/playSfx/setVolume/setMuted
- BGM configured for gapless looping: OGG first, loop:true, no html5 flag (Web Audio path)
- SFX rate-limited via pool:3 per Howl (max 3 concurrent instances per effect)
- AudioContext unlock via one-shot keydown listener registered in init() (AUD-05)
- Volume/mute updates atomic: both Howler globals and MetaStore v4 updated together

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Howler.js and source audio assets** - `f429b96` (chore)
2. **Task 2: Create AudioManager singleton** - `cc1d012` (feat)

## Files Created/Modified

- `src/systems/AudioManager.ts` - AudioManager singleton class; exports `audioManager` and `SfxKey`
- `package.json` - howler ^2.2.4 dependency added
- `public/audio/bgm-synthwave.mp3/.ogg` - BGM placeholder (TODO: replace with real synthwave loop)
- `public/audio/sfx-*.mp3/.ogg` - 10 SFX placeholder files (shoot, enemy-death, player-hit, pickup, wave-start, boss-phase, game-over, pause, purchase, menu-nav)

## Decisions Made

- **No ffmpeg available** — used Node.js binary generation to create minimal valid MP3 frames and WAV-format OGG placeholders. Files are committed with TODO comments. Real audio assets must replace these before v1.1 ships. Howler silently handles format failures, so the API layer works correctly even with placeholders.
- **MetaStoreV4 local interface** — defined an interface with optional v4 fields (`volume?`, `muted?`, `setVolume?`, `setMuted?`) and used optional chaining throughout AudioManager. This makes AudioManager safe to use regardless of whether 06-01 has run, while being fully functional when v4 is present.
- **OGG-first BGM src array** — `src: ['.ogg', '.mp3']` ensures browsers that support OGG use the format with better gapless loop behavior (MP3 encoder adds silence padding).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MetaStore v4 methods not yet added (06-01 ran first, but need forward-compat)**
- **Found during:** Task 2 (AudioManager singleton)
- **Issue:** Plan specified calling `useMetaStore.getState().setVolume()` and `.setMuted()` directly, but the TypeScript interface (MetaStore) didn't include these methods if 06-01 had not yet run
- **Fix:** Introduced local `MetaStoreV4` interface with optional v4 fields; used optional chaining (`meta.setVolume?.(clamped)`) so AudioManager compiles and runs safely before or after 06-01 migration
- **Files modified:** src/systems/AudioManager.ts
- **Verification:** `npx tsc --noEmit` returns exit code 0 with no errors
- **Committed in:** cc1d012 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking TypeScript compile issue)
**Impact on plan:** Fix essential for correctness and compilation safety. No scope creep.

## Issues Encountered

- ffmpeg not available on the host system — used Node.js binary generation for placeholder audio files per the plan's stated fallback approach. All 22 files created successfully.

## User Setup Required

**Audio assets require replacement before v1.1 ships.** The placeholder files in `public/audio/` are silent stubs generated for API wiring purposes:

1. Source a royalty-free synthwave BGM loop (Pixabay/Freesound/OpenGameArt) in OGG + MP3 format
2. Source/create synthesized SFX pack (Geometry Wars / Resogun vibe) for all 10 SFX types
3. Replace files at `public/audio/bgm-synthwave.ogg/.mp3` and `public/audio/sfx-*.ogg/.mp3`
4. Verify BGM loops without audible gap at seam (test in headphones)

## Next Phase Readiness

- AudioManager singleton is complete and TypeScript-clean — Plans 06-03 and 06-04 can wire it into game systems
- 06-03: Wire SFX into WeaponSystem/CollisionSystem — call `audioManager.playSfx('shoot')` etc.
- 06-04: Wire BGM start/stop into PlayingState/GameOverState; add volume controls to pause overlay
- **Blocker for v1.1 ship:** Real audio assets must replace placeholders (see User Setup Required above)

---
*Phase: 06-foundation*
*Completed: 2026-03-07*
