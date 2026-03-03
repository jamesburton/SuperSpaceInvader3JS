# Phase 5: Campaign Mode + Game Modes - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add mode selection to the main menu (Campaign and Endless), build handcrafted Campaign Chapter 1 (3-4 levels + boss), and save campaign progress to localStorage. Endless mode is the existing behavior renamed and surfaced as an explicit choice. All wave and level content is data-driven.

</domain>

<decisions>
## Implementation Decisions

### Mode Selection UI

- Arrow-key navigation between modes + letter shortcut keys both work simultaneously
- Three navigable options: **Campaign** [C], **Endless** [E], **Upgrades** [U] (Down from Endless → Upgrades)
- Side-by-side descriptions shown per option (taglines: "Handcrafted Story — Chapter 1 Available" / "Infinite Waves — Score Chase")
- Default highlighted selection: **Campaign** on first load
- Remembers last selection on return to menu (e.g. after a run ends)
- **Bug fix required:** TitleState must fully reset RunState and all game systems before launching a new PlayingState — currently, returning to menu after game over and starting again incorrectly lands back on the game over screen

### Campaign Level Structure

- A "level" is a group of waves defined in a data object; default 3 waves per level, author-overridable per level
- Wave content is a **mix**: early levels reuse existing endless `WaveConfig` entries, later levels use fully custom hand-authored configs
- **Boss placement is data-driven** per level via a `hasBoss` flag — not hardcoded as "final level only"; supports multiple bosses per chapter (e.g. halfway boss + final boss in longer campaigns). Chapter 1 (3-4 levels) has one final boss.
- **Algorithmic fallback** for un-authored levels: escalating difficulty multipliers cycling through the previous authored wave configs. Allows development without blocking on content authorship.

### Campaign Progression

- Progress tracked **per-chapter** (e.g. "Chapter 1: furthest level completed")
- Death ends the run (roguelite model) — no mid-run saves
- **Completed levels unlock as start points** (completing Level 2 makes Level 3 available as a start; dying on Level 3 without completing it does not unlock it)
- **Level select screen** appears only when the player has at least one unlocked start point beyond Level 1
- Starting from a mid-chapter level: fresh run (no carry-in gold or power-ups), meta bonuses apply normally
- Campaign progress stored in **MetaStore** (extends existing Zustand persist with a `campaignProgress` field — cleanest, reuses established persistence pattern)

### Level Briefing Text

- Format: **level title** + **2–3 sentence atmospheric paragraph**
- Narrator voice is **campaign-specific** — can differ between chapters (Chapter 1 tone to be determined in content; default to resistance/military commander style for Ch.1 draft)
- Dismissal: **keypress to skip** at any time; **auto-dismiss toggle** (checkbox in options or briefing overlay) lets players choose auto-progress vs manual advance — stored as a persistent user preference
- Chapter 1 briefing content: Claude drafts Neon Tokyo cyberpunk flavour lore as placeholder; refinable post-ship based on RoI

### Claude's Discretion

- Exact HTML/CSS layout of the mode selection overlay (within the established `hud.showOverlay()` pattern)
- Auto-dismiss briefing timer duration
- Exact localStorage key for auto-dismiss preference
- Campaign progress schema within MetaStore (field names, shape)
- Chapter 1 level briefing copy (author drafts, user refines later)

</decisions>

<specifics>
## Specific Ideas

- Mode select should feel like a natural evolution of the existing title screen, not a redesign — same neon aesthetic, same overlay pattern
- The level select screen should show locked levels as visually greyed out, not hidden, so the player can see what's coming
- Briefings should be skippable immediately (no forced read time) to respect returning players
- The TitleState restart bug is a known issue to fix as part of this phase's wiring work

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `TitleState.ts` — current main menu; will be extended with mode selection logic and arrow-key nav
- `MetaState.ts` (Zustand persist, `ssi-meta-v1`) — extend with `campaignProgress` field; established migration/versioning pattern already in place
- `WaveConfig` interface + `WAVE_CONFIGS[]` in `waveConfig.ts` — reused directly for campaign levels (mix approach); campaign level wrapper adds `hasBoss`, wave override count, briefing text
- `HUD.showOverlay()` — used for all existing full-screen overlays (title, pause, game over, wave announcement); briefing text uses same pattern
- `StateManager.replace()` — used for all major state transitions; mode selection routes here
- `GameOverState` factory callback pattern — already handles game-over → title return; same pattern needed for campaign victory

### Established Patterns

- DOM overlay via `hud.showOverlay(html)` — all full-screen UI is HTML in `#hud`; no Three.js UI elements
- Zustand vanilla store + `persist` middleware — MetaStore pattern for all persistent state
- `runState` module singleton — volatile per-run state (reset at run start); campaign mode flag belongs here
- `ObjectPool` visible-flag toggling — not relevant to this phase but constrains any new entity work
- Letter key shortcuts in `TitleState` + `MetaShopUI` — `input.justPressed('KeyC')` / `input.justPressed('KeyE')` pattern

### Integration Points

- `TitleState.ts` — primary modification target: mode select UI, key handling, last-selection memory
- `PlayingState.ts` — receives a `mode` parameter (campaign vs endless) to drive boss trigger and level progression logic
- `SpawnSystem.ts` — currently drives wave escalation; Campaign mode feeds it level-scoped wave configs instead of endless escalation
- `Game.ts` — constructs `PlayingState`; must reset RunState and all mutable game systems before launch (bug fix)
- `MetaState.ts` — add `campaignProgress` field; increment on level complete

</code_context>

<deferred>
## Deferred Ideas

- None raised during discussion — scope stayed within Phase 5 boundary

</deferred>

---

*Phase: 05-campaign-mode-game-modes*
*Context gathered: 2026-03-03*
