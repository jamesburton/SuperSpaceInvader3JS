---
phase: 06-foundation
plan: 04
subsystem: ui
tags: [audio, howler, metastore, volume-control, sfx]

# Dependency graph
requires:
  - phase: 06-02
    provides: AudioManager singleton with setVolume/setMuted/playSfx/isMuted API
  - phase: 06-01
    provides: MetaStore v4 with volume/muted fields and setVolume/setMuted actions
provides:
  - Volume slider and mute button in pause overlay (PausedState)
  - M-key mute shortcut during gameplay (PlayingState)
  - menuNav SFX on ArrowUp/ArrowDown and menu selection (TitleState)
  - Purchase SFX on successful shop buy (ShopUI)
  - Pause SFX on PausedState.enter()
affects: [08-visual, 09-powerups, 10-meta-shop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DOM event listeners (input, click) for pause overlay controls — not per-frame polling
    - audioManager.playSfx() at justPressed() call sites for UI SFX (not isDown())

key-files:
  created: []
  modified:
    - src/states/PausedState.ts
    - src/states/PlayingState.ts
    - src/states/TitleState.ts
    - src/ui/ShopUI.ts

key-decisions:
  - "Volume slider uses DOM input events (not per-frame polling) for responsive real-time control"
  - "M-key mute shortcut placed after shop-open guard and before ESC/P pause check in PlayingState.update()"
  - "menuNav SFX fires in _launchSelected() covering all selection paths (C/E/U keys + Space/Enter)"

patterns-established:
  - "Pause overlay controls use DOM addEventListener after showOverlay() — getElementById queries live DOM"
  - "audioManager.setMuted() reads fresh useMetaStore.getState().muted each click for correctness"

requirements-completed: [AUD-04, AUD-06, AUD-07]

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 6 Plan 04: Audio UI Controls Summary

**Volume slider + mute toggle in pause overlay, M-key mute shortcut, menuNav/purchase/pause SFX across PausedState, PlayingState, TitleState, and ShopUI**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T10:11:55Z
- **Completed:** 2026-03-07T10:15:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Pause overlay now shows a volume range slider (0–1, 5% steps) and MUTE/UNMUTE button below pause text
- Volume and mute changes apply in real-time via audioManager and persist to MetaStore v4 automatically
- M-key toggles global mute during gameplay without triggering pause; no conflict with GameOverState's M-key menu binding
- menuNav SFX plays on ArrowUp/ArrowDown navigation and on menu selection in TitleState
- Purchase SFX plays on every successful shop buy in ShopUI
- Pause SFX plays immediately when PausedState.enter() is called

## Task Commits

Each task was committed atomically:

1. **Task 1: Volume control UI in pause overlay** - `83d6fa3` (feat)
2. **Task 2: UI SFX for shop/menu + M-key mute shortcut** - `1dcbbce` (feat)

## Files Created/Modified

- `src/states/PausedState.ts` - Extended enter() with volume slider + mute button DOM controls, pause SFX
- `src/states/PlayingState.ts` - Added M-key mute shortcut after shop guard, before ESC/P pause check
- `src/states/TitleState.ts` - Added menuNav SFX on ArrowDown/ArrowUp handlers and in _launchSelected()
- `src/ui/ShopUI.ts` - Added audioManager import and purchase SFX in _buyItem() success branch

## Decisions Made

- Volume slider uses DOM `addEventListener('input', ...)` rather than per-frame polling — more responsive and avoids saturating the Howler pool
- mute-btn click handler reads fresh `useMetaStore.getState().muted` on each click to avoid stale closure
- menuNav SFX fires inside `_launchSelected()` at the very start, covering C/E/U hotkeys, Space, and Enter uniformly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx tsc --noEmit` reported "declared but never read" errors for `audioManager` imports added in 06-03 as stubs across multiple files (WeaponSystem, TitleState, HUD, CollisionSystem). These resolved automatically once Task 2 added the SFX calls that used the imports. The TypeScript build via `node ... tsc --noEmit` confirmed zero errors throughout.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full audio system complete: BGM looping (06-02), all SFX triggers (06-03, 06-04), volume/mute UI (06-04), preference persistence (06-01/06-04)
- Phase 6 Foundation is complete (all 4 plans done)
- Phase 7 (Gamepad Support) can begin — no audio dependencies

---
*Phase: 06-foundation*
*Completed: 2026-03-07*
