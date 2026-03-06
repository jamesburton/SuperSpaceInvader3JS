---
phase: 02-visual-identity-game-feel
plan: 03
subsystem: effects
tags: [particles, object-pool, bloom, collision, movement]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [particle-system, death-burst, muzzle-flash, engine-trail]
  affects: [CollisionSystem, MovementSystem, PlayingState]
tech_stack:
  added: []
  patterns:
    - Object.defineProperty visible/active sync for ObjectPool<Particle> compatibility
    - Map<Particle, ObjectPool<Particle>> for pool-tracking across multiple pools
    - Setter injection (setParticleManager) to avoid circular constructor dependencies
key_files:
  created:
    - src/effects/Particle.ts
    - src/effects/ParticleManager.ts
  modified:
    - src/systems/CollisionSystem.ts
    - src/systems/MovementSystem.ts
decisions:
  - "Particle uses same Object.defineProperty visible/active sync as Bullet — consistent with Phase 1 ObjectPool contract"
  - "Map<Particle, ObjectPool<Particle>> tracks source pool per particle — enables three separate pools with correct release"
  - "worldPos captured before killEnemy() in CollisionSystem — killEnemy scales matrix to zero so position must be read first"
  - "setParticleManager() setter injection on CollisionSystem — avoids circular deps, matches Phase 1 system pattern"
  - "isMovingHorizontally exposed as public field on MovementSystem — Plan 04 reads it to decide engine trail spawn"
metrics:
  duration: "2 minutes"
  completed: "2026-03-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
requirements_addressed: [VIS-04, VIS-05, FEEL-02, FEEL-03]
---

# Phase 2 Plan 3: Particle System (Death Bursts, Muzzle Flash, Engine Trail) Summary

**One-liner:** Pooled particle system with diamond shard geometry and Map-based pool tracking — zero heap allocation during gameplay, wave-palette-colored death bursts, white muzzle flash, and engine trail infrastructure.

## What Was Built

### src/effects/Particle.ts

Poolable particle entity using diamond shard geometry (4-vertex BufferGeometry, two triangles). Physics state: position, velocity (vx/vy), rotationSpeed, lifetime/maxLifetime. Uses the same `Object.defineProperty` visible/active sync pattern as `Bullet` so `ObjectPool<Particle>` can drive activation without knowing about the mesh. `update(dt)` handles: movement, rotation tumble, emissive fade (1.2 * t), scale shrink (0.5 + 0.5*t), and returns false when lifetime expires.

### src/effects/ParticleManager.ts

Three separate pools: `deathPool` (128), `muzzlePool` (16), `trailPool` (32). A `Map<Particle, ObjectPool<Particle>>` (sourcePool) tracks which pool each active particle came from — enables `pool.release(p)` in the update loop without switching on particle type.

- `spawnDeathBurst(x, y, hexColor)` — 6-8 shards, tight radial spread (80-160 u/s), 0.4-0.65s lifetime, wave palette color
- `spawnMuzzleFlash(x, y)` — 3-4 white particles, upward 180° arc, 0.1-0.2s lifetime
- `spawnEngineTrail(x, y)` — single trail particle at engine exhaust position (y-12), wave palette color, 0.2-0.35s lifetime
- `update(dt)` — iterates backwards, releases dead particles via sourcePool Map
- `registerBloom(addToBloom)` — bulk-registers all pooled meshes for Plan 04 bloom wiring
- `releaseAll()` — wave reset / game over cleanup

### src/systems/CollisionSystem.ts (updated)

Added `setParticleManager(pm)` setter injection method. In the kill path: `getEnemyWorldPos(enemy)` is now called BEFORE `killEnemy()` to capture position while the matrix is still valid. After kill, conditionally calls `particleManager.spawnDeathBurst(worldPos.x, worldPos.y, wavePalette.getColor(runState.wave))`. The `update()` method signature is unchanged — full backward compatibility.

### src/systems/MovementSystem.ts (updated)

Added `isMovingHorizontally: boolean = false` public field and `trackPlayerMovement(leftHeld, rightHeld)` method. Plan 04 will call `trackPlayerMovement` from PlayingState before player.update() and read `isMovingHorizontally` to decide engine trail spawn. No existing functionality changed.

## Verification

- TypeScript: zero errors (`npx tsc --noEmit`)
- Tests: 24/24 pass — Bullet and Player tests unaffected
- CollisionSystem.update() backward-compatible (same 6 parameters)
- Particles won't visually appear until Plan 04 wires the update loop and bloom registration

## Deviations from Plan

None — plan executed exactly as written. The Map-based pool tracking design was specified in the plan and implemented as specified.

## Key Design Decisions

1. **Object.defineProperty visible/active sync** — Particle follows the identical pattern to Bullet so it satisfies `ObjectPool<T extends { visible: boolean }>` without changing the pool constraint.

2. **Three separate pools + Map tracking** — Maintains distinct pool sizes optimized per effect type (128/16/32) while enabling correct release. The Map adds negligible overhead (one Map.set per spawn, one Map.get+delete per release).

3. **worldPos before killEnemy** — `killEnemy()` calls `setMatrixAt(index, zeroMatrix)` to hide the enemy, after which `getEnemyWorldPos` would return 0,0. Capturing before kill ensures accurate burst origin.

4. **Setter injection for ParticleManager** — Game.ts creates both CollisionSystem and ParticleManager independently, then calls `collisionSystem.setParticleManager(pm)`. No circular imports.

5. **Infrastructure-only approach** — Particles, pools, and hooks are all in place but nothing renders until Plan 04 calls `particleManager.update(dt)` in the game loop and `particleManager.registerBloom()` at init. This matches the plan's explicit scope boundary.

## Self-Check

- [x] src/effects/Particle.ts exists
- [x] src/effects/ParticleManager.ts exists
- [x] src/systems/CollisionSystem.ts has setParticleManager() and spawnDeathBurst hook
- [x] src/systems/MovementSystem.ts has isMovingHorizontally and trackPlayerMovement()
- [x] TypeScript: zero errors
- [x] Tests: 24/24 passing
- [x] Commits: 8e3954d (Task 1), 6a3b48e (Task 2)
