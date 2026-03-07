---
phase: 07-gamepad-support
plan: 01
subsystem: input
tags: [gamepad, input, ui, toast, controller]
requirements: [PAD-01, PAD-02, PAD-04, PAD-05]

dependency_graph:
  requires: []
  provides: [gamepad-polling, gamepad-synthesis, gamepad-toast, activeInputDevice]
  affects: [InputManager, Game, all-game-states]

tech_stack:
  added: []
  patterns:
    - Gamepad API polling via navigator.getGamepads() in clearJustPressed()
    - State synthesis into existing heldKeys/justPressedKeys Sets (zero state-layer changes)
    - Radial deadzone with binary threshold for keyboard-parity movement feel
    - Per-axis edge detection via prevStick* booleans for justPressed menu navigation
    - Deferred DOM init via initGamepad(hudRoot) — constructor remains dependency-free
    - Double-rAF fade-in trick for CSS opacity transition on toast

key_files:
  created:
    - src/ui/GamepadToast.ts
  modified:
    - src/core/InputManager.ts
    - src/core/Game.ts

decisions:
  - initGamepad(hudRoot) public method defers gamepad/DOM setup to Game.init() — constructor stays backward-compatible
  - prevGamepadButtons pre-populated on connect event (not empty) to prevent double-input on first poll frame
  - Radial deadzone 0.20 applied to stick magnitude before any directional logic
  - Binary threshold (not proportional) preserves identical movement feel to keyboard
  - _clearSynthesizedKeys() on disconnect only removes GAMEPAD_CODES — keyboard-held keys remain intact
  - menuNav SFX reused for connect/disconnect chime — no new audio asset needed

metrics:
  duration: ~2 min
  completed: 2026-03-07
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 7 Plan 01: Gamepad Input Polling and Toast Notifications Summary

**One-liner:** Gamepad polling synthesized into existing InputManager key Sets via clearJustPressed(), with neon toast for connect/disconnect/warning events.

## What Was Built

### GamepadToast (src/ui/GamepadToast.ts)
Bottom-center neon toast DOM element appended to hudRoot. Cyan (#00ffff) styling for connect/disconnect events, amber (#ffaa00) for non-standard controller warnings. Fade-in via double-rAF trick (0.3s), 2s hold, 0.5s fade-out. Clears in-flight timers on re-show to handle rapid events. `pointer-events:none` and `white-space:nowrap` match HUD conventions.

### InputManager — Gamepad Extension (src/core/InputManager.ts)
Full gamepad support added without touching keyboard code paths:

- `initGamepad(hudRoot)` — creates GamepadToast, registers `gamepadconnected` / `gamepaddisconnected` window listeners. Called from Game.init() after hudRoot exists.
- `_pollGamepad()` — called from `clearJustPressed()` once per fixed step. Fetches fresh `navigator.getGamepads()` snapshot (never cached). Button loop synthesizes justPressed/held via edge detection against `prevGamepadButtons[]`. `_synthesizeStick()` handles radial deadzone + binary threshold + per-axis justPressed edge detection.
- Button mapping: A=Space, B=Escape, Y=KeyC, RB=Space, Start=KeyP, D-pad=Arrows.
- `_clearSynthesizedKeys()` — removes all GAMEPAD_CODES from heldKeys on disconnect; keyboard state unaffected.
- `activeInputDevice: 'keyboard' | 'gamepad'` — public property updated on any input.

### Game.ts Wire-Up (src/core/Game.ts)
One line added after `hudRoot` is available in `init()`:
```typescript
this.input.initGamepad(hudRoot);
```

## Success Criteria Status

- [x] Gamepad polling integrated into clearJustPressed() game loop clock
- [x] All button mappings implemented (A=fire/confirm, B=back, Y=continue, RB=alt-fire, Start=pause, D-pad=arrows)
- [x] Radial deadzone 0.20 prevents phantom drift
- [x] Binary threshold stick movement matches keyboard feel
- [x] Connect/disconnect toasts appear in neon cyberpunk style with controller name
- [x] Non-standard controllers get amber warning toast
- [x] Disconnect clears synthesized keys — keyboard takes over immediately
- [x] activeInputDevice tracks last-used input method
- [x] Game.ts wires initGamepad in init() after hudRoot available
- [x] TypeScript compiles clean, Vite production build succeeds

## Deviations from Plan

None — plan executed exactly as written. Approach 3 (initGamepad method) was the specified approach and implemented as described.

## Self-Check

### Files Exist
- src/ui/GamepadToast.ts: FOUND
- src/core/InputManager.ts: FOUND (modified)
- src/core/Game.ts: FOUND (modified)

### Commits
- fce1118: feat(07-01): create GamepadToast notification UI
- 8e5d00f: feat(07-01): add gamepad polling and synthesis to InputManager + wire Game.ts

## Self-Check: PASSED
