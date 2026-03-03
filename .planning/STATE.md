---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-03T19:28:52.448Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 32
  completed_plans: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** The thrill of arcade shooting elevated — every run feels different because of layered in-run progression, meta-unlocks that evolve your build over time, and enemies smart enough to keep you on your toes.
**Current focus:** Phase 5 - Campaign Mode + Game Modes

## Current Position

Phase: 5 of 5 (Campaign Mode + Game Modes) — IN PROGRESS (Plan 3 of 6 complete)
Next: Execute 05-04 — Campaign level progression
Status: Phase 5 executing — 05-03 complete: TitleState rewritten with mode selection menu (Campaign/Endless/Upgrades), arrow-key nav, letter shortcuts, _resetAllSystems()
Last activity: 2026-03-03 — 05-03 complete: TitleState mode select menu with full system reset (MODE-03, MODE-01, MODE-04)

Progress: [██████████] 86% (Phase 4 impl done + Phase 5 plan 3/6 complete)

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
| Phase 03-enemy-depth-wave-systems-power-ups P02 | 44 | 3 tasks | 1 files |
| Phase 03-enemy-depth-wave-systems-power-ups P05 | 4 | 3 tasks | 3 files |
| Phase 03-enemy-depth-wave-systems-power-ups P04 | 8 | 3 tasks | 3 files |
| Phase 03-enemy-depth-wave-systems-power-ups P07 | 2 | 3 tasks | 5 files |
| Phase 03-enemy-depth-wave-systems-power-ups P06 | 3 | 2 tasks | 5 files |
| Phase 03-enemy-depth-wave-systems-power-ups P08 | 3 | 3 tasks | 4 files |
| Phase 04-boss-encounter-meta-progression P01 | 139 | 3 tasks | 11 files |
| Phase 04-boss-encounter-meta-progression P02 | 11 | 2 tasks | 3 files |
| Phase 04-boss-encounter-meta-progression P03 | 7 | 2 tasks | 6 files |
| Phase 04-boss-encounter-meta-progression P05 | 4 | 2 tasks | 6 files |
| Phase 05-campaign-mode-game-modes P01 | 216 | 2 tasks | 3 files |
| Phase 05-campaign-mode-game-modes P02 | 3 | 3 tasks | 3 files |
| Phase 05-campaign-mode-game-modes P03 | 2 | 1 tasks | 1 files |

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
- [Phase 03-enemy-depth-wave-systems-power-ups]: typeMeshes Map<EnemyType, InstancedMesh> replaces rowMeshes[]: 6 archetype meshes (up from 4 row meshes); rowMeshes getter preserves bloom registration API
- [Phase 03-enemy-depth-wave-systems-power-ups]: meshSlot field on Enemy: sequential index within type's InstancedMesh, assigned during spawnWave() for killEnemy() and matrix updates
- [Phase 03-enemy-depth-wave-systems-power-ups]: Row-homogeneous archetype assignment (row % allowedTypes.length): each row gets one type, creating clear visual threat groupings
- [Phase 03-enemy-depth-wave-systems-power-ups]: spawnWave() default param getWaveConfig(1): zero-arg calls from Game.ts constructor path remain valid with no call-site changes
- [Phase 03-enemy-depth-wave-systems-power-ups]: shopPending captured from currentConfig BEFORE runState.nextWave() — shopAfterThisWave belongs to wave just cleared
- [Phase 03-enemy-depth-wave-systems-power-ups]: aiSystem.reset() before setFireRateMultiplier() in startNextWave(): clears accumulator then applies new interval
- [Phase 03-enemy-depth-wave-systems-power-ups 03-04]: Flanker reuses chargerTargetX and chargerDiveTimer fields — avoids adding new Enemy fields for single use case; documented in AISystem comments
- [Phase 03-enemy-depth-wave-systems-power-ups 03-04]: Aimed bullet pattern: bullet.init() then manual vx/vy override — init() is allocation hook, vx/vy are public for direction override
- [Phase 03-enemy-depth-wave-systems-power-ups 03-04]: Swooper group ID = instanceIndex % 4 computed at dispatch time — no extra field needed on Enemy
- [Phase 03-enemy-depth-wave-systems-power-ups 03-04]: Swooper returns via killEnemy on bottom exit in 'returning' phase — simpler than re-integrating into tight formation grid
- [Phase 03-enemy-depth-wave-systems-power-ups 03-04]: Independent-movement pattern: AISystem calls formation.setEnemyWorldPos(); getEnemyWorldPos() detects and returns stored x/y for Flanker/Charger/Swooper
- [Phase 03-enemy-depth-wave-systems-power-ups 03-07]: ShopSystem holds stat multipliers as public fields; PlayingState reads directly in 03-08
- [Phase 03-enemy-depth-wave-systems-power-ups 03-07]: _onShieldChargePurchased callback injected by PlayingState to avoid circular import (ShopSystem vs PowerUpManager)
- [Phase 03-enemy-depth-wave-systems-power-ups 03-07]: HUD.syncPowerUp() takes explicit params (type, remaining, full, shieldCharges) — keeps HUD decoupled from PowerUpManager class
- [Phase 03-enemy-depth-wave-systems-power-ups 03-06]: WeaponSystem.update() replaces PlayingState inline fire block — Phase 3 canonical fire path with optional particleManager and powerUpManager params
- [Phase 03-enemy-depth-wave-systems-power-ups 03-06]: Rapid fire uses player.setFireCooldown(0.08) after recordFire() — overrides cooldown without disrupting fireCooldownMultiplier shop stat
- [Phase 03-enemy-depth-wave-systems-power-ups 03-06]: Shielder shield pop burst uses 0xff00ff magenta hardcoded — distinct from wave palette death burst, visually signals shield destruction not kill
- [Phase 03-enemy-depth-wave-systems-power-ups 03-08]: powerUpManager changed from PowerUpManager|null to non-null in PlayingStateContext — Game.ts always constructs it
- [Phase 03-enemy-depth-wave-systems-power-ups 03-08]: wasTransitioning+isTransitioning delta in PlayingState tracks wave-end for releaseAll() without SpawnSystem API change
- [Phase 03-enemy-depth-wave-systems-power-ups 03-08]: shopPending check placed after transition delta so releaseAll() fires before shop opens on same wave-clear event
- [Phase 03-enemy-depth-wave-systems-power-ups 03-08]: grantShieldCharge() added to PowerUpManager capped at 3; WeaponSystem.setPowerUpManager() not needed (receives via update() optional param)
- [Phase 04-boss-encounter-meta-progression]: Dual currency: Gold for in-run shop (volatile), SI$ for meta shop (persistent Zustand)
- [Phase 04-boss-encounter-meta-progression]: META_STORAGE_KEY changed from ssix_v1 to ssi-meta-v1; SID_SYMBOL replaced by GOLD_SYMBOL+META_CURRENCY_SYMBOL
- [Phase 04-boss-encounter-meta-progression]: purchaseUpgrade() is idempotent — re-purchasing same id does not double-add to purchasedUpgrades array
- [Phase 04-boss-encounter-meta-progression]: Boss bullet speed 280 (vs 300 regular) for readability in multi-bullet patterns
- [Phase 04-boss-encounter-meta-progression]: phaseJustChanged auto-reset-on-read getter — identical to wasHitThisStep() pattern, consumer polls once per step
- [Phase 04-boss-encounter-meta-progression]: BossEnemy starts inactive (active=false, mesh.visible=false) — SpawnSystem activates at encounter start in 04-03
- [Phase 04-boss-encounter-meta-progression 04-04]: window.__metaShopBuy global for onclick handlers in innerHTML-rendered upgrade cards — simpler than event delegation for static list
- [Phase 04-boss-encounter-meta-progression 04-04]: MetaShopUI lazy-init in TitleState.enter() via document.getElementById('hud') — constructor-time DOM access unreliable
- [Phase 04-boss-encounter-meta-progression 04-04]: MetaShopUI appended to #hud at z-index:200 — renders above existing overlay without HUD API changes
- [Phase 04-boss-encounter-meta-progression]: Boss mode early-return in PlayingState.update(): ctx.boss.active check returns early, skipping normal AI/collision — cleaner separation
- [Phase 04-boss-encounter-meta-progression]: triggerVictory() reuses GameOverState for R-to-restart flow via factory callback — same circular-import avoidance as game-over flow
- [Phase 04-boss-encounter-meta-progression 04-05]: SI$ awarded to MetaStore before GameOverState constructed — constructor reads metaCurrency after addMetaCurrency() for accurate totalSI display
- [Phase 04-boss-encounter-meta-progression 04-05]: triggerVictory() combines waveSI + bossReward in one addMetaCurrency() call — avoids double-counting
- [Phase 04-boss-encounter-meta-progression 04-05]: PowerUpManager.activate(type, duration) uses same activePowerUp/activeDuration fields as collectPickup() — WeaponSystem.isActive() unchanged
- [Phase 04-boss-encounter-meta-progression 04-05]: applyMetaBonuses() compound multiplier: Math.pow(1.10, tiers) fire rate, Math.pow(1.08, tiers) speed — applies 0 tiers if no upgrades purchased
- [Phase 05-campaign-mode-game-modes]: mode and campaignLevelIndex stored as module-level private vars in RunState (not RunStateData) — mode is routing state, not HUD display data; snapshot() correctly omits it
- [Phase 05-campaign-mode-game-modes]: CAMPAIGN_CHAPTER_1 uses direct WAVE_CONFIGS array index references (not getWaveConfig()) — ensures campaign uses exact authored configs, not derived escalation values
- [Phase 05-campaign-mode-game-modes]: getNextWaveConfig() private helper dispatches campaign vs endless — single call site in startNextWave()
- [Phase 05-campaign-mode-game-modes]: levelCompletePending early-return in startNextWave() — sets flag then returns without spawning, PlayingState handles routing
- [Phase 05-campaign-mode-game-modes]: runState.reset() as FIRST line in returnToMenu() — consistent with restartGame() ordering, ensures clean state before system cleanup
- [Phase 05-campaign-mode-game-modes]: selectedOption persists on TitleState instance — Campaign is default; remembered on return-from-run
- [Phase 05-campaign-mode-game-modes]: OPTIONS array drives arrow-key cycle: campaign, endless, upgrades — extensible without changing cycle logic

### Pending Todos

None yet.

### Blockers/Concerns

- Collision detection performance at 150+ simultaneous entities is unvalidated — AABB approach confirmed for Phase 1 (40 enemies + ~10 bullets); Phase 3 stress test still recommended

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 05-03-PLAN.md — TitleState mode selection menu
Resume file: .planning/phases/05-campaign-mode-game-modes/05-04-PLAN.md

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
