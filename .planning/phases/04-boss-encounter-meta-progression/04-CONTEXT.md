# Phase 4: Boss Encounter + Meta Progression - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning
**Source:** User feedback after Phase 3 playtest

<domain>
## Phase Boundary

Phase 4 introduces a multi-phase boss encounter that caps the run, redesigns the in-run currency system to use Gold (common drops → in-run booster shop) vs SI$ (rare persistent currency → meta shop), and builds the persistent roguelite meta shop that gives players a reason to replay. The meta unlocks are the balance mechanism — without them the game ramps too hard past wave 5.

Phase 5 (Campaign Mode) is out of scope here.

</domain>

<decisions>
## Implementation Decisions

### Currency System Redesign (Critical — affects existing Phase 3 code)

**Two-currency system replacing Phase 3's single SI$ in-run currency:**

#### Gold (in-run, non-persistent)
- Drops from most enemy kills during a run (common drop, roughly every kill or every 2-3 kills)
- Resets to zero on run end (same behavior as current `inRunCurrency`)
- Spent in the **between-wave booster shop** (the current in-run shop, now funded by Gold)
- Visual: gold/yellow token drop from enemies (distinct from power-up tokens)
- `RunState.inRunCurrency` should be renamed/repurposed to track Gold
- The existing between-wave shop (ShopSystem) switches to Gold as its currency

#### SI$ (persistent meta currency)
- Earned slower — e.g., 1 SI$ per wave cleared, or a small fixed amount per run regardless of performance, or small per-kill amount. Planner to determine exact earn rate.
- Persists across browser sessions via Zustand + localStorage (versioned schema v1, same pattern as rest of meta state)
- Spent in the **persistent meta shop** accessible from the main menu
- NOT available in the between-wave shop
- Run-end screen shows: "SI$ earned this run: X | Total: Y"

### Meta Shop (Persistent, Main Menu)
- Accessible from main menu (new "UPGRADES" or "META SHOP" button)
- Funded exclusively by SI$ (persisted in Zustand MetaStore)
- Offers:
  - **Starting weapon loadouts**: at least 2 unlocks (e.g., start with spread shot active for 30s, or start with 1 rapid fire charge)
  - **Passive stat upgrades** (capped, persistent): fire rate, move speed, starting shield charge, extra starting life — each with 3 tiers
  - Planner free to design exact item set and pricing as long as at least 2 loadout unlocks + stat upgrade set exist
- Unlocks carry into all future runs from the moment of purchase
- MetaStore (Zustand, localStorage key `ssi-meta-v1`) stores: `metaCurrency` (SI$ balance), `purchasedUpgrades: string[]`

### Boss Encounter
- Triggers after wave 10 (or configurable threshold — planner's discretion)
- Visually distinct: significantly larger than any normal enemy (e.g., 3-4x the size)
- Segmented health bar with visible phase boundaries (at least 2 phases)
- Phase 1 → Phase 2 transition: telegraph with clear visual + behavioral change (color shift, new attack pattern)
- Phase 2+ attack: something qualitatively different from phase 1 (e.g., phase 1 = aimed spread shots, phase 2 = sweeping beam or diagonal dive charges)
- Boss geometry: planner's discretion — should fit the neon cyberpunk aesthetic
- Boss death: triggers run-end / victory screen with SI$ earned display

### Run-End Screen Updates
- Existing game-over flow gets extended (or a separate victory screen for boss kills)
- Shows: wave reached, enemies killed, SI$ earned this run, total SI$ balance
- "Play Again" restarts run with any purchased meta upgrades applied

### Difficulty Calibration
- The persistent meta upgrades are intentionally the balancing mechanism
- First run without upgrades should be challenging past wave 5 — that's by design
- With 2-3 meta upgrades active, wave 5-10 should feel manageable
- No blanket difficulty reduction needed — the meta shop IS the difficulty curve

### What Stays from Phase 3
- Gold between-wave booster shop: same ShopSystem, same 6 upgrade types, now funded by Gold
- All enemy types and behaviors unchanged
- Power-up drops unchanged
- Phase 3 fixes (Flanker chain behavior, spread shot) are already committed

### Claude's Discretion
- Exact SI$ earn rate per wave/kill
- Boss geometry design (within neon cyberpunk aesthetic)
- Boss health pool and phase thresholds
- Meta upgrade pricing in SI$
- Whether to add a victory screen vs extend the existing game-over screen
- Boss attack patterns (beyond the minimum: 2 distinct phases, telegraphed)
- Integration order of boss vs meta shop (planner to sequence waves)

</decisions>

<specifics>
## Specific Ideas

- The between-wave shop should label its currency as "Gold" or show a gold coin icon to distinguish from SI$
- "UPGRADES" button on main menu (similar to existing neon button style)
- Boss health bar could be rendered as DOM overlay (same pattern as existing HUD) to avoid Three.js UI complexity
- MetaStore Zustand slice: `metaCurrency: number`, `purchasedUpgrades: string[]`, `addMetaCurrency(n)`, `purchaseUpgrade(id)`, versioned localStorage key `ssi-meta-v1`

</specifics>

<deferred>
## Deferred Ideas

- Death tax / currency conversion mechanic (originally considered)
- Arcade-style continues (out of scope)
- Per-enemy SI$ drop rates (keep it simple: per-wave earned)
- Boss as a separate stage/transition (keep inline with wave flow for v1)

</deferred>

---

*Phase: 04-boss-encounter-meta-progression*
*Context gathered: 2026-03-03 — post Phase 3 playtest feedback*
