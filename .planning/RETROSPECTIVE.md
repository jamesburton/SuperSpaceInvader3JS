# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Polish & Depth

**Shipped:** 2026-03-13
**Phases:** 5 | **Plans:** 17 | **Timeline:** 7 days

### What Was Built
- MetaStore migration plus full audio system wiring with persistent volume and mute controls
- Full gamepad support across gameplay, shops, and menu overlays
- Ship customization with unlockable shapes, colors, and CRT filter tiers
- Three new power-ups: piercing shot, homing missiles, and selective time slow
- Expanded meta shop with extra starting lives, pre-run setup, and Hard/Nightmare difficulty unlock flow

### What Worked
- Feature phases stayed cleanly layered: foundation before input, input before cosmetics, cosmetics before power-up and meta expansion
- Focused targeted test suites made retro-validation for Phases 9 and 10 straightforward
- The data/config split for upgrades and difficulty rules made Phase 10 easier to extend without large UI rewrites
- Using dedicated subsystems for specialized behavior (AudioManager, PlayerSkinManager, HomingMissileManager, CRTManager) kept later changes localized

### What Was Inefficient
- Validation history drifted behind implementation for later phases, which forced cleanup work at milestone end
- Milestone summary extraction was weaker for plans without consistent frontmatter, leaving archive tooling short on accomplishments and task counts
- Audio shipped in a technically complete state but still depends on final asset replacement for the intended player-facing quality level

### Patterns Established
- Retro-validation as a cleanup pass can recover Nyquist compliance if per-phase validation lags behind execution
- Requirement-to-summary frontmatter traceability matters if milestone tooling depends on it later
- Category-based meta-shop presentation scales better than a long-scroll upgrade list once multiple cosmetic and progression systems exist
- Pre-run setup is a useful seam for future loadout and mode configuration features

### Key Lessons
1. Planning artifacts need the same maintenance discipline as code or the milestone closeout becomes needlessly expensive.
2. A good test surface on core systems pays off twice: during implementation and again during archival/audit cleanup.
3. Asset placeholders should be tracked as explicit ship debt early, otherwise "feature complete" and "release ready" drift apart.
4. Expansion phases benefit from preserving a clear config layer so balance and unlock logic do not leak into UI code.

### Cost Observations
- Model mix: mostly balanced execution with targeted orchestration and cleanup passes
- Sessions: milestone finish required extra audit/validation sessions because some docs lagged behind shipped code
- Notable: the codebase scaled well, but archive tooling quality was limited by inconsistent planning metadata rather than implementation quality

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-06
**Phases:** 5 | **Plans:** 32 | **Timeline:** 5 days

### What Was Built
- Full Three.js/WebGL game engine with fixed-timestep loop, object pooling, and InstancedMesh rendering
- Neon Tokyo cyberpunk visual identity with selective bloom, particle systems, and per-wave palettes
- Six enemy archetypes with formation-breaking AI and wave escalation
- Complete roguelite economy: in-run Gold + between-wave shop, persistent SI$ + meta shop
- Multi-phase boss encounter with segmented health bar
- Campaign Chapter 1 (4 levels + boss) and Endless mode with mode selection and progress persistence

### What Worked
- Wave-based parallel execution of plans within phases — multiple agents working independently on non-overlapping files
- Strict phase ordering (engine before visuals before gameplay before meta before modes) prevented rework
- Object pooling and InstancedMesh decisions in Phase 1 paid off — zero performance issues throughout later phases
- Human verification checkpoints at end of each phase caught issues early
- Data-driven patterns (wave configs, enemy defs, campaign levels) made later phases faster to implement

### What Was Inefficient
- Phase 3 traceability table shows some requirements as "Pending" despite being implemented (CORE-01, CORE-02) — traceability updates lagged
- Some executor agents spent time on code that was already implemented from prior plans, requiring verification passes
- STATE.md accumulated excessive decision context that exceeded useful reference size

### Patterns Established
- Object.defineProperty visible/active sync pattern for all pooled entities (Bullet, Particle, PickupToken)
- Factory callback pattern to avoid circular imports between states (GameOverState -> PlayingState)
- Auto-reset-on-read pattern for one-shot flags (wasHitThisStep, phaseJustChanged)
- DOM overlay HUD over Three.js TextGeometry for all UI elements
- Module-level private vars in RunState for routing state that shouldn't be in snapshots

### Key Lessons
1. Architecture decisions in Phase 1 (pooling, InstancedMesh, camera type) are load-bearing — get them right early, they cannot be retrofitted
2. Per-type InstancedMesh (6 meshes for 6 enemy types) scales better than per-row (4 meshes) — future-proof the mesh strategy from the start
3. Zustand persist with versioned schema and migration hooks enables safe schema evolution across multiple phases
4. Campaign data as config objects (not hardcoded logic) made Chapter 1 trivially extensible — future chapters are just new arrays

### Cost Observations
- Model mix: ~10% opus (orchestration), ~90% sonnet (execution)
- Balanced profile throughout — sonnet handled all implementation plans successfully
- Notable: Parallel wave execution significantly reduced wall-clock time for phases with independent plans

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 5 days | 5 | Initial build — established all patterns |
| v1.1 | 7 days | 5 | Shift from core buildout to feature layering, validation cleanup, and archive hygiene |

### Cumulative Quality

| Milestone | LOC | Files | Requirements |
|-----------|-----|-------|-------------|
| v1.0 | 7,486 TS | 140 | 64/64 verified |
| v1.1 | 10,990 TS | 160+ | 38/38 milestone requirements satisfied |

### Top Lessons (Verified Across Milestones)

1. Front-load architectural decisions — they compound across all subsequent phases
2. Data-driven patterns enable parallel development and future extensibility
3. Validation and traceability artifacts need continuous maintenance, not just end-of-milestone cleanup
