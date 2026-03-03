---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-03T01:03:00.325Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 20
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.
**Current focus:** Phase 3 - Enemy Depth + Wave Systems + Power-Ups

## Current Position

Phase: 3 of 5 (Enemy Depth + Wave Systems + Power-Ups) — IN PROGRESS
Next: Phase 4 (Boss Encounter + Meta Progression) — pending Phase 3 fun bar gate
Status: Phase 3 executing — 2/9 plans complete
Last activity: 2026-03-03 — 03-03 complete: PickupToken, PowerUpManager, powerups config (PWR-01..04)

Progress: [██████░░░░] 40% (2/5 phases complete; Phase 3 in progress 2/9 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 3.75 min
- Total execution time: 0.45 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-engine-core-combat | 5 | 23 min | 5 min |
| 02-visual-identity-game-feel | 4 | 11 min | 2.75 min |
| 03-enemy-depth-wave-systems-power-ups | 1 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 02-01 (3 min), 02-02 (2 min), 02-03 (2 min), 02-04 (3 min), 03-01 (4 min)
- Trend: Stable fast

*Updated after each plan completion*
| Phase 02-visual-identity-game-feel P02 | 2 | 2 tasks | 5 files |
| Phase 02-visual-identity-game-feel P03 | 2 | 2 tasks | 4 files |
| Phase 02-visual-identity-game-feel P04 | 3 | 2 tasks | 8 files |
| Phase 03-enemy-depth-wave-systems-power-ups P01 | 4 | 3 tasks | 8 files |
| Phase 03-enemy-depth-wave-systems-power-ups P03 | 27 | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Three.js/WebGL stack committed — not up for debate
- OrthographicCamera required for exact hitbox math on 2D gameplay plane
- Object pooling and InstancedMesh must be built in Phase 1 — retrofitting is a HIGH-cost rewrite
- No audio in v1 — deferred to post-v1 to avoid scope bloat
- Fun bar gate: Phase 3 must be validated as engaging before Phase 4 meta systems are built
- [Phase 01-engine-core-combat]: OrthographicCamera viewport: halfH = WORLD_HEIGHT/2, halfW = halfH * aspect — preserves aspect ratio on resize
- [Phase 01-engine-core-combat]: ObjectPool uses visible-flag toggling not scene.add/remove — zero GC pressure during gameplay
- [Phase 01-engine-core-combat]: Named Three.js imports enforced throughout — no import * as THREE — critical for Vite tree-shaking
- [Phase 01-engine-core-combat]: Bullet.visible via Object.defineProperty — pool calls obj.visible, getter/setter syncs mesh.visible and active flag
- [Phase 01-engine-core-combat]: WeaponSystem.update() receives activeBullets ref — system pushes acquired bullets directly into shared list
- [Phase 01-engine-core-combat]: Update order in Game.update(): weaponSystem → player movement → movementSystem → clearJustPressed
- [Phase 01-engine-core-combat]: Three.js mock in src/__mocks__/three.ts enables entity unit tests without WebGL context
- [Phase 01-engine-core-combat]: InstancedMesh pre-allocated to ENEMY_POOL_SIZE=256 — formation uses first 40 slots; spawnWave() resets and reuses same mesh for Wave 2+
- [Phase 01-engine-core-combat]: Dead enemies hidden via setMatrixAt(scale=0) — consistent with object-pool visible-flag pattern, zero GC pressure
- [Phase 01-engine-core-combat]: EnemyFormation.getEnemyAABB() is canonical collision interface for Plan 04 — CollisionSystem must not access formationX/Y directly
- [Phase 01-engine-core-combat]: March speed = BASE * pow(1.08, killed) recalculated from scratch each kill to prevent float drift over 40 kills
- [Phase 01-engine-core-combat]: RunState plain TS module singleton — volatile, no Zustand, no localStorage
- [Phase 01-engine-core-combat]: MetaState Zustand 5 persist (ssix_v1) with saveVersion=1 for Phase 4 migration hook
- [Phase 01-engine-core-combat]: HUD is DOM overlay (absolutely-positioned divs in #hud) — no Three.js TextGeometry
- [Phase 01-engine-core-combat]: CollisionSystem owns playerInvincibility timer — not Player entity — keeps entity layer clean
- [Phase 01-engine-core-combat]: SpawnSystem.update() returns isTransitioning bool — Game.ts skips AI during 2.5s wave gap
- [Phase 01-engine-core-combat]: Factory callback in PlayingState.triggerGameOver() — GameOverState accepts onRestart: () => void instead of importing PlayingState, eliminating circular import
- [Phase 01-engine-core-combat]: StateManager pushdown automaton: push() does not call exit() on current state — preserves PlayingState intact for resume
- [Phase 01-engine-core-combat]: PausedState.exit() does NOT hide overlay — PlayingState.resume() handles it, keeping state responsibilities clean
- [Phase 01-engine-core-combat]: PlayingStateContext interface bundles all entity/system refs — single pass to all states, extensible for Phase 2+
- [Phase 02-visual-identity-game-feel 02-01]: Enemy.instanceIndex equals enemy.col (0-9) — each row has its own InstancedMesh; index within mesh = column position
- [Phase 02-visual-identity-game-feel 02-01]: EnemyFormation.rowMeshes[4] replaces single instancedMesh — 4 per-row InstancedMesh with distinct BufferGeometry shapes
- [Phase 02-visual-identity-game-feel 02-01]: applyPalette(hex) called in SpawnSystem.initPalette() at game start + startNextWave() on wave transition
- [Phase 02-visual-identity-game-feel 02-01]: Bullet constructor no longer accepts color param — init() sets emissive per isPlayerBullet flag
- [Phase 02-visual-identity-game-feel 02-01]: MeshStandardMaterial with emissiveIntensity on all entities — prerequisite for bloom rendering pipeline (Plan 02-02)
- [Phase 02-visual-identity-game-feel]: SelectiveBloomEffect.selection.add(mesh) — no manual layer management; library handles render layer 11 internally
- [Phase 02-visual-identity-game-feel]: Bullet meshes pre-registered at init time (not lazily) — bloom applies from first shot with zero per-frame overhead
- [Phase 02-visual-identity-game-feel]: renderWithEffects() falls back to renderer.render() if bloom uninitialised — safe for test harnesses
- [Phase 02-visual-identity-game-feel 02-03]: Particle uses Object.defineProperty visible/active sync (same as Bullet) — consistent ObjectPool<T> contract
- [Phase 02-visual-identity-game-feel 02-03]: Map<Particle, ObjectPool<Particle>> tracks source pool per particle — three pools (128/16/32) with correct release
- [Phase 02-visual-identity-game-feel 02-03]: worldPos captured before killEnemy() in CollisionSystem — killEnemy zeroes the matrix so position must be read first
- [Phase 02-visual-identity-game-feel 02-03]: setParticleManager() setter injection on CollisionSystem — avoids circular constructor deps
- [Phase 02-visual-identity-game-feel 02-04]: CameraShake.apply() called in render() not update() — shake is render-frequency, not fixed-step
- [Phase 02-visual-identity-game-feel 02-04]: wasHitThisStep() auto-reset-on-read pattern — PlayingState polls once per step without separate clear call
- [Phase 02-visual-identity-game-feel 02-04]: Stub components (BossHealthBar, PickupFeedback) constructed in Game.init() and in PlayingStateContext — Phase 3/4 hooks require zero wiring changes
- [Phase 03-enemy-depth-wave-systems-power-ups]: EnemyDef.shieldHp optional only for Shielder; sidDropAmount required on all types — type system enforces archetype-specific data
- [Phase 03-enemy-depth-wave-systems-power-ups]: getWaveConfig beyond wave 10: +5% speed, +4% fireRate, +3% HP per extra wave; shop every 5th wave
- [Phase 03-enemy-depth-wave-systems-power-ups]: ENEMY_POOL_SIZE 256->512: accommodates 5x10 formation plus Swooper off-screen pool headroom
- [Phase 03-enemy-depth-wave-systems-power-ups]: EnemyEntity.type broadened to EnemyType in Plan 03-01 (types.ts), not deferred to 03-02 — avoids inconsistent intermediate state
- [Phase 03-enemy-depth-wave-systems-power-ups]: PickupToken.visible uses Object.defineProperty to sync mesh.visible and active flag — identical to Bullet.ts ObjectPool contract
- [Phase 03-enemy-depth-wave-systems-power-ups]: Shield power-up modelled as absorb charge (shieldCharges=1) not a duration — consumeShieldCharge() returns bool for CollisionSystem
- [Phase 03-enemy-depth-wave-systems-power-ups]: trySpawnDrop() takes dropChance float — caller (CollisionSystem) owns enemy-specific drop probability, PowerUpManager stays generic
- [Phase 03-enemy-depth-wave-systems-power-ups]: getActiveTokens() returns readonly array — prevents CollisionSystem from mutating pool-internal list directly

### Pending Todos

None yet.

### Blockers/Concerns

- Collision detection performance at 150+ simultaneous entities is unvalidated — AABB approach confirmed for Phase 1 (40 enemies + ~10 bullets); Phase 3 stress test still recommended

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 03-03-PLAN.md — PickupToken, PowerUpManager, powerups config (PWR-01..04)
Resume file: none

## Phase 3 Plan Index

| Plan | Wave | Depends On | Files | Requirements |
|------|------|------------|-------|--------------|
| 03-01 | 1 | — | enemies.ts, waveConfig.ts, constants.ts, types.ts, RunState.ts | ENEMY-01,07,08,09, INRUN-01,03 |
| 03-02 | 2 | 03-01 | Enemy.ts | ENEMY-02,03,04,05,06,07,08,10 |
| 03-03 | 2 | 03-01 | PickupToken.ts, PowerUpManager.ts, powerups.ts | PWR-01,02,03,04 |
| 03-04 | 3 | 03-02 | AISystem.ts | ENEMY-03,04,05,06,10 |
| 03-05 | 3 | 03-01,02 | SpawnSystem.ts | ENEMY-08,09, INRUN-02 |
| 03-06 | 4 | 03-03,04 | CollisionSystem.ts, WeaponSystem.ts, Bullet.ts | ENEMY-02, PWR-01,02,03,04 |
| 03-07 | 4 | 03-01,05 | ShopSystem.ts, ShopUI.ts, HUD.ts | INRUN-02,04 |
| 03-08 | 5 | 03-04,06,07 | Game.ts, PlayingState.ts, GameOverState.ts | INRUN-01,02,03,04, PWR-01,02,03,04 |
| 03-09 | 6 | 03-08 | — | All 18 (human verification) |
