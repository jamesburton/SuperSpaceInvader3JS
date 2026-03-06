# Super Space Invaders X

A browser-based Space Invaders remake built with **Three.js** and **WebGL**, wrapped in a **Neon Tokyo cyberpunk** aesthetic. Six enemy archetypes with formation-breaking AI, a roguelite meta-progression economy, and both Campaign and Endless game modes.

## Features

- **Neon cyberpunk visuals** — selective bloom post-processing, per-wave color palettes, emissive materials, particle effects (death bursts, muzzle flash, engine trails)
- **Six enemy types** — Grunt, Shielder, Flanker, Sniper, Charger, and Swooper, each with distinct geometry, AI, and attack patterns
- **Boss encounters** — multi-phase fights with telegraphed transitions and segmented health bars
- **Roguelite progression** — dual currency system (in-run Gold + persistent SI$), between-wave upgrade shop, meta shop with weapon loadouts and passive stat upgrades
- **Campaign mode** — Chapter 1 with 4 handcrafted levels, atmospheric briefings, and a boss finale
- **Endless mode** — infinite wave escalation with increasing difficulty
- **Ship customization** — multiple hull shapes and color variants, unlockable and selectable
- **Audio** — synthwave BGM with full SFX coverage (combat, UI, game flow events)
- **Gamepad support** — analog stick movement, button mapping, hot-swap with keyboard fallback
- **CRT filters** — unlockable scanline/CRT presets with intensity slider
- **Stable 60fps** — InstancedMesh rendering, object pooling, fixed-timestep physics

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Install & Run

```bash
git clone https://github.com/jamesburton/SuperSpaceInvader3JS.git
cd SuperSpaceInvader3JS
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

The built files land in `dist/`.

### Run Tests

```bash
npm test
```

## Controls

| Action       | Keyboard          | Gamepad             |
|--------------|--------------------|---------------------|
| Move         | Arrow keys / A, D  | Left stick          |
| Fire         | Space              | A button            |
| Pause        | Escape / P         | Start               |
| Menu navigate| Arrow keys         | D-pad / Left stick  |
| Confirm      | Enter / Space      | A button            |

## Tech Stack

| Layer        | Technology                          |
|--------------|--------------------------------------|
| Renderer     | Three.js 0.183.2 (WebGL)            |
| Language     | TypeScript                           |
| Bundler      | Vite                                 |
| Post-processing | pmndrs/postprocessing (selective bloom) |
| State        | Zustand 5.x (localStorage persist)   |
| Audio        | Howler.js                            |
| Particles    | three.quarks                         |
| Tests        | Vitest                               |

## Project Structure

```
src/
  config/       # Wave definitions, skin configs, balance tuning
  core/         # Game loop, scene manager, input handling
  effects/      # Bloom, CRT filters, particle systems
  entities/     # Player, enemies, bullets, power-ups, bosses
  state/        # Meta-progression store, profile manager
  states/       # Game states (title, playing, shop, game over)
  systems/      # Movement, weapons, collision, AI, shop logic
  ui/           # HUD, menus, meta shop UI, high scores
  utils/        # Object pool, math helpers
```

## License

This project is not currently under an open-source license. All rights reserved.
