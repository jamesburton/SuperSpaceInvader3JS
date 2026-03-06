# Phase 3: Enemy Depth + Wave Systems + Power-Ups - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers six distinct enemy archetypes with intelligent behaviors, wave escalation that makes the game meaningfully harder over time, random power-up drops from enemy kills, and an in-run between-wave upgrade shop funded by SIDs (Space Invader Dollars — in-run currency only). All shop upgrades reset at run end. This phase must make the core loop engaging for 10+ minutes without meta unlocks.

Meta-persistence (second currency, death conversion, permanent menu shop) is Phase 4. Alternative formation modes are v2.

</domain>

<decisions>
## Implementation Decisions

### Enemy Archetypes — All Six Behaviors

- **Grunt** (existing): Basic formation march + random-fire; no changes to core behavior
- **Shielder**: Shield is a separate HP pool (e.g., 2 hits to break) visually distinct from body. Shield must be fully depleted before the body takes damage. Shield destruction triggers a visual effect. Body dies in 1 hit after shield is gone.
- **Flanker**: Stays in formation initially; on a trigger condition, breaks formation and charges laterally toward the player's current X position, firing during the charge. Cannot return to formation after breaking off.
- **Sniper**: Remains in formation. Fires a high-damage aimed bullet directly at the player's current position (no lead, no prediction). Telegraphed with a brief windup. Fire rate slower than Grunt but damage higher.
- **Charger**: Remains in formation until a timer fires, then dives straight down toward the player position. Timer-based (not health-triggered). Can dive multiple times during a wave if it survives.
- **Swooper**: Groups of 3-4 Swoopers break formation simultaneously. Dive-bomb the player area, exit off the bottom/side of the screen, then loop back around and re-enter from the top — classic Galaga-style loop. Off-screen entities must be tracked. May rejoin a loose formation or remain independent until destroyed.

### Wave Escalation

- Wave 1: Grunts only. New archetypes introduced gradually at escalating waves.
- Exact archetype introduction schedule: researcher/planner to determine (e.g., Wave 3 adds Shielders, Wave 5 adds Flankers, etc.)
- Escalation levers per wave: march speed multiplier, fire rate multiplier, enemy HP multiplier — all configurable in a wave-config data structure (not hardcoded)
- HP jump at milestone waves forces player to rely on shop upgrades or power-ups to kill efficiently
- Formation remains single-screen grid per wave. Rows × cols are configurable per wave definition (currently hardcoded 4×10 — make these data-driven and configurable)
- **Code flexibility requirement**: Formation system must be written with a clean abstraction layer (e.g., a `FormationLayout` interface or similar) so future formation modes (scatter, squad shapes, attractive-loci swarming) can be plugged in without rewriting the spawn/collision/AI systems. Do not implement alternate modes now, but do not lock them out.

### Power-Ups (from Enemy Kill Drops)

- Three types: Spread Shot, Rapid Fire, Shield (absorbs one hit)
- Durations vary by type:
  - Spread Shot: **5 seconds** (aggressive/short — high impact, punchy)
  - Rapid Fire: **10 seconds** (default)
  - Shield: **15 seconds** (mild — player has time to use it strategically)
- Drop chance: configured per archetype via `dropChance` field in `EnemyDef` (already exists in `config/enemies.ts`)
- Active power-up shown on HUD with a countdown indicator (timer bar or countdown text — Claude's discretion on visual)
- `PickupFeedback.ts` swell animation stub is already built — activate it in Phase 3

### In-Run Currency: SIDs (Space Invader Dollars)

- Symbol: **SI$** — displayed in HUD as "SI$ 42" or similar
- Drops from every enemy kill; amount varies by archetype (Grunts = less, higher archetypes = more)
- Exact drop amounts: Claude's discretion, tune for balance (see shop prices)
- HUD shows current SI$ balance at all times during play
- Resets to zero at run end (INRUN-03) — never carried to meta

### Between-Wave Shop (In-Run Only)

- Trigger: Periodic/infrequent during a run. Start with a configurable interval (e.g., every 5 waves); tune in playtesting. Also acceptable: random chance with a guaranteed floor.
- Presents 3 randomly selected upgrade choices per appearance
- Shop uses a **shallow unlock tree**: buying a category node unlocks items within it (e.g., buying "Basic Upgrade Shop" unlocks earlier grades of the more fundamental persistent-within-run power-ups)
- Tree should have placeholder nodes visible but marked **"Coming Soon"** (planned features) or **"Unscheduled"** (not yet planned, with a "Click to Request" affordance) — exact UX for placeholders deferred to v2 but stub structure should be in v1
- All upgrades are in-run only — the tree resets at run end

**Upgrade categories available in Phase 3:**
- Fire rate (shots per second)
- Number of shots (spread count, e.g., 1 → 3 → 5)
- Bullet speed
- Movement speed
- Shield (adds a shield charge)
- Shield regeneration rate
- Extra life (+1 to current lives counter)
- Initial lives (start the next run with more lives) — *wait: this is in-run shop, so this means the current run's lives cap? Clarify: for Phase 3, in-run shop only — treat "initial lives" as +1 to current lives counter for simplicity*

**Continues in Phase 3:**
- Extra life: spend SI$ for +1 life added to counter immediately
- Max lives cap upgrade: spend SI$ to increase the lives cap (so future extra-life purchases have headroom)
- Full arcade-style continues (fresh lives after game over, checkpoint return, ship selection) → **Phase 4**

### Claude's Discretion

- Exact per-wave archetype introduction wave numbers
- Exact SI$ drop amounts and shop item prices (balance via playtesting)
- Shop trigger cadence (start with every 5 waves, tune)
- Shop UI visual design (modal overlay, z-order above game canvas)
- Active power-up HUD indicator design (timer bar vs countdown text)
- Swooper re-entry trajectory and path shape (arc, straight vertical, spiral)
- Exact number of Shielder shield HP

</decisions>

<specifics>
## Specific Ideas

- **SID branding**: "Space Invader Dollars" is the in-game flavor name. Use "SI$" as the symbol throughout HUD and shop UI. Keep the tone tongue-in-cheek/retro.
- **Death has been paid off**: This phrase should be reserved for the Phase 4 meta shop's death-tax mechanic (not Phase 3), but note it in the codebase as a flavor constant.
- **Formation abstraction**: The user explicitly asked for "reasonable flexibility where relevant" in the current code to support future formation modes. Think of the formation as a pluggable layout provider — `FormationLayout` defines positions; the grid is one implementation.
- **"Click to Request" affordance**: For "Unscheduled" shop slots, the UX idea is that players can click to signal demand. This is a v2 product feature (requires backend telemetry), but the UI stub concept should be noted for the roadmap.
- **Swooper Galaga reference**: The Swooper looping back from the top is explicitly referencing classic Galaga dive-bombers. Off-screen entities must be tracked and not despawned. This is a known complexity trade-off the user accepted.
- **Wave config as data structure**: The user envisions wave definitions as data (not logic) — this is also aligned with Phase 5's campaign requirement (CAMP-01). The wave config structure designed in Phase 3 should be forward-compatible with Phase 5's data-driven scripting.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/ui/PickupFeedback.ts` — DOM swell animation stub fully built; activate `showPickup(name)` call from power-up pickup handler
- `src/config/enemies.ts` — `dropChance` field already on `EnemyDef`; `EnemyType` union has a comment "Phase 3 will add: shielder | flanker | sniper | charger" — extend this
- `src/effects/ParticleManager.ts` + `ParticleManager` — reuse for Shielder shield-break burst, Swooper trail effect
- `src/ui/HUD.ts` — DOM-based; add SI$ counter element and power-up timer bar
- `src/systems/SpawnSystem.ts` — wave transition already handled; extend with shop trigger and wave escalation config
- `src/state/RunState.ts` — add `inRunCurrency` (SI$) field; `recordKill()` already exists for hooking drop logic

### Established Patterns

- **InstancedMesh per row** (`EnemyFormation.rowMeshes[]`): New archetype types may need different mesh geometry per type, not just per row. Planner should decide whether to map archetypes to rows or use a type-keyed mesh approach.
- **Module-level singleton state** (`RunState`, `MetaState`): Add `inRunCurrency` to `RunState` (same pattern as `score`)
- **ObjectPool** (`src/core/ObjectPool.ts`): Use for power-up drop entities (pickup tokens floating in play area)
- **Fixed-timestep loop in `PlayingState.update()`**: All archetype AI behaviors hook into this — `AISystem.update()` will dispatch per-type behavior
- **`wavePalette` system** (`src/config/palettes.ts`): Each wave color palette already works; archetype visuals should respect the palette

### Integration Points

- `SpawnSystem.update()` — add: shop trigger check after wave clear, wave escalation config lookup, formation layout selection
- `AISystem.update()` — add: per-type behavior dispatch (Flanker charge trigger, Charger dive timer, Swooper group coordination, Sniper aim)
- `CollisionSystem` — add: Shielder shield HP phase before body damage; power-up pickup collision (player vs pickup token)
- `Enemy.ts` / `EnemyFormation` — make `ENEMY_ROWS` and `ENEMY_COLS` configurable per-wave (data-driven); add `FormationLayout` abstraction interface for future modes
- `PlayingState.ctx` (`PlayingStateContext`) — add: `powerUpManager`, `shopSystem`, `inRunCurrency` (already has `pickupFeedback` stub)
- `src/config/enemies.ts` — extend `EnemyType` union; add full `EnemyDef` entries for all 6 types

</code_context>

<deferred>
## Deferred Ideas

### Phase 4
- **Two-currency system**: A second persistent currency earned by converting game score at death. Only a % of score converts (configurable, upgradable). This is the meta-currency for the permanent shop.
- **Death tax mechanic**: At death, a "death tax" takes a percentage of the conversion (starting at 90% tax → 10% conversion; upgradable until Death is "paid off" and 100% converts). This is the meta-progression hook for Phase 4.
- **Permanent menu shop**: Accessible from the main menu (not during play). Uses the persistent meta-currency. Sells persistent unlocks that carry across runs.
- **Arcade-style continues**: Full continues after game over (fresh set of lives from last checkpoint, ship selection opportunity). Requires "buy max continues upgrade" meta unlock first. Phase 4 scope.
- **Mid-boss encounters**: Boss fights at milestone wave intervals (every 25-50 waves in grand battles). Phase 4 design scope.

### v2
- **Alternative formation modes**: Loose scatter/swarm, pre-defined squad shapes (V, wedge, circle), attractive-loci swarming (whole group drawn toward a moving locus in familiar patterns). **Add to roadmap as early v2 milestone** — user specifically requested this be roadmapped.
- **Grand battle epochs**: "Chapters" or "Epochs" consisting of 50-250 waves each, with standard bosses, mid-boss, and final boss. Grand battles unlock sequentially on completion. Rare drops from grand battles. Multiple sub-waves per level. This is a significant v2 structural feature.
- **Backfill/reinforcement mechanics**: Enemies backfilling the top row over time during longer levels to maintain pressure.
- **Ship selection on continue**: Player can choose a different ship variant when using an arcade continue. Requires v2 alternate ships.
- **"Click to Request" UX for Unscheduled shop items**: Requires telemetry backend — v2 product feature.
- **Shop placeholder nodes**: "Coming Soon" / "Unscheduled" UI stubs — concept established in Phase 3 architecture, full UX in v2.

</deferred>

---

*Phase: 03-enemy-depth-wave-systems-power-ups*
*Context gathered: 2026-03-02*
