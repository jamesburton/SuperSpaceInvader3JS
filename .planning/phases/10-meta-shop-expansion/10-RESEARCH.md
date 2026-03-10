# Phase 10 Research: Meta Shop Expansion

**Phase:** 10  
**Date:** 2026-03-10  
**Status:** Research complete, ready for planning

## Scope

Phase 10 should expand the existing persistent meta shop and title-screen run-start flow without introducing a new progression system. The implementation must cover:

- `SHOP-01`: extra starting lives, capped at `+2`
- `SHOP-02`: starting power-up slot unlock
- `SHOP-03`: pre-run starting power-up selection from unlocked pool, with explicit none option
- `SHOP-04`: Hard difficulty unlock sold in meta shop
- `SHOP-05`: Hard ruleset changes enemy speed, wave size, and Sniper timing
- `SHOP-06`: Nightmare unlock only after Hard is cleared
- `SHOP-07`: Nightmare adds more aggressive formation breaks and a third boss attack phase

The planner should treat this as three connected slices, not one giant UI task: entitlement data, pre-run setup flow, and difficulty/combat rules.

## Current Baseline

Relevant code already exists in the repo:

- `src/ui/MetaShopUI.ts`: current DOM-based meta shop overlay with linear gamepad cursor support and section rendering
- `src/config/metaUpgrades.ts`: single registry for meta purchases; current categories are `loadout`, `passive`, `bunker`, `skin`, `crt`
- `src/state/MetaState.ts`: already persists `difficulty`, `startingPowerUp`, and `extraLivesPurchased`, but only exposes setters for skin/CRT/audio
- `src/states/TitleState.ts`: current mode-select entry point; this is the cleanest place to add pre-run difficulty + starting power-up setup
- `src/states/PlayingState.ts`: `applyMetaBonuses()` currently applies persistent unlocks at run start and is the correct place to activate selected run-start bonuses
- `src/config/waveConfig.ts` and `src/config/campaign.ts`: current wave generation layer for endless and campaign difficulty scaling
- `src/systems/AISystem.ts`: current timing knobs for flanker charges, sniper cadence, and swooper group triggers
- `src/config/boss.ts` and `src/systems/BossSystem.ts`: boss logic is explicitly hardcoded for two phases today

## Requirement Mapping

| Requirement | Primary implementation surface | Notes for planner |
|---|---|---|
| `SHOP-01` | `metaUpgrades.ts`, `MetaShopUI.ts`, `PlayingState.ts` | Prefer two sequential meta upgrades representing life tier 1 and 2; apply at run start |
| `SHOP-02` | `metaUpgrades.ts`, `MetaShopUI.ts` | One permanent unlock gate for run-start power-up selection |
| `SHOP-03` | `TitleState.ts`, `MetaState.ts`, `PlayingState.ts`, `powerups.ts` | Store selected power-up as a run-start preference, not as a purchase |
| `SHOP-04` | `metaUpgrades.ts`, `MetaShopUI.ts`, `TitleState.ts` | Unlock grants access to difficulty option in run-start flow |
| `SHOP-05` | `waveConfig.ts`, `campaign.ts`, difficulty helper module, `AISystem.ts` | Centralize rule transformation so campaign and endless both use the same difficulty logic |
| `SHOP-06` | meta entitlement + persistent Hard-clear marker | Current store has no difficulty-specific completion marker; planner must add one |
| `SHOP-07` | `AISystem.ts`, `BossSystem.ts`, `boss.ts` | Boss code assumes exactly 2 phases today; this is the main combat refactor risk |

## Recommended Architecture

## Standard Stack

- Keep using the existing DOM-overlay menu pattern used by `MetaShopUI`, `SkinShopUI`, and `TitleState`
- Keep Zustand `MetaState` as the persistent source for player preferences
- Keep `metaUpgrades.ts` as the entitlement catalog for purchasable unlocks
- Add a small difficulty rules module rather than scattering `if (difficulty === ...)` checks across gameplay systems

## Architecture Patterns

### 1. Split entitlements from selections

Use `purchasedUpgrades` as the source of truth for permanent unlock ownership:

- extra life tier 1
- extra life tier 2
- starting power-up slot
- Hard unlock
- Nightmare unlock
- optional zero-cost achievement marker for "Hard cleared"

Use `MetaState` only for mutable player preferences:

- `difficulty`
- `startingPowerUp`

Recommendation: do **not** make `extraLivesPurchased` the authority if life ownership is already encoded as upgrade IDs. That creates duplicate truth and drift risk. If the field is kept, it should be derived or updated in exactly one place.

### 2. Add a dedicated run-setup overlay after mode choice

The required run-start flow is:

1. Player chooses `Campaign` or `Endless`
2. If campaign resume/start selection applies, resolve that first
3. Show run-setup overlay
4. Let player choose difficulty from unlocked set
5. If starting slot is unlocked, let player choose a starting power-up or `NONE`
6. Launch `PlayingState`

This should live in `TitleState`, not in the meta shop and not in `PlayingState`.

Reasoning:

- phase context explicitly says difficulty switching belongs in title/run-start path
- `TitleState` already owns mode selection and overlay transitions
- `PlayingState` should consume finalized setup state, not ask for it

### 3. Centralize difficulty transformation

Add a module such as `src/config/difficultyRules.ts` or `src/systems/DifficultyManager.ts` that accepts base authored configs and returns effective configs for the selected difficulty.

This module should own:

- wave count/formation size adjustments
- enemy speed/fire-rate/hp multipliers if used
- earlier Sniper availability
- AI timer overrides for flanker and swooper aggression
- boss phase count / boss attack config

This avoids hidden differences between endless and campaign content.

### 4. Treat Nightmare unlock gating as an entitlement + achievement problem

`SHOP-06` requires "unlock after completing Hard", but current persistence only tracks campaign progress globally, not by difficulty. There are two viable approaches:

- Preferred: add a zero-cost pseudo-upgrade such as `milestone_hard_clear` into `purchasedUpgrades` when the player beats campaign on Hard, then gate Nightmare purchase on it
- Higher-risk alternative: add a new persisted field for difficulty-specific completion and accept a save-schema bump

Preferred option is lower risk because it reuses the existing persistent entitlement channel and avoids another migration during the final v1.1 phase.

### 5. Expand boss logic to N phases before adding Nightmare behavior

Current `BossConfig` and `BossSystem` are fixed to two phases:

- `boss.ts` uses `phases: [BossPhaseConfig, BossPhaseConfig]`
- `BossSystem` explicitly checks for phase `1 -> 2` transition at `<= 0.5`

For `SHOP-07`, do not bolt Nightmare behavior on with one-off special cases. First refactor boss config/system to support an array of phases and generic threshold-based transitions. Then Normal/Hard can still use two phases while Nightmare supplies three.

This is the cleanest path to an "additional boss attack phase" without contaminating the rest of combat flow.

## Integration Plan

### Meta upgrade catalog

Add new entries in `metaUpgrades.ts` for:

- `passive_startingLife_1`
- `passive_startingLife_2`
- `starting_powerup_slot`
- `difficulty_hard_unlock`
- `difficulty_nightmare_unlock`

Recommended category placement for the reorganized shop:

- `Weapons`: starting power-up slot
- `Ships`: existing ship skins
- `Upgrades`: extra lives, difficulty unlocks, economy passives, bunkers
- `Visual`: CRT unlocks

If locked items remain hidden by default, provide a simple reveal toggle per tab or global toggle. Do not permanently render the full locked tree by default; the current context explicitly rejects that clutter.

### Meta state

`MetaState.ts` needs explicit setters for:

- `setDifficulty(difficulty)`
- `setStartingPowerUp(powerUpTypeOrNull)`

Recommended cleanup: update the `startingPowerUp` comment/type usage so it stores a `PowerUpType | null` semantic value, not a meta-upgrade ID. `PlayingState` activates power-ups by power-up type already; storing upgrade IDs only adds mapping overhead.

### Title flow

`TitleState.ts` should gain a run-setup overlay separate from `MetaShopUI`.

The setup overlay should:

- read unlocked difficulty choices from `purchasedUpgrades`
- remember the last selected difficulty from `MetaState.difficulty`
- show starting power-up chooser only when slot unlock is owned
- build the chooser from the currently meta-unlocked run power-up pool
- always include `NONE`

Power-up pool recommendation for this milestone:

- `spreadShot`
- `rapidFire`
- `piercingShot`
- `homingMissile`
- `timeSlow`

Map each available run-start choice from entitlement state, not from a hand-maintained second list.

### Run-start bonus application

`PlayingState.applyMetaBonuses()` is the correct application point.

Recommended changes:

- replace current hardcoded meta loadout activation (`loadout_spread_start`, `loadout_rapid_start`) with selected power-up activation from `MetaState.startingPowerUp`
- apply extra lives based on purchased life tiers
- keep skin and passive application in the same method

Be careful not to double-apply life bonuses on continues or state replacement paths. `applyMetaBonuses()` is called on each `PlayingState` entry, so planner should explicitly guard intended behavior for:

- fresh run start
- continue after defeat
- restart after game over

### Hard and Nightmare rules

For `SHOP-05`, Hard should modify effective difficulty through the shared rules layer:

- raise enemy movement speed
- increase formation width by `+1 enemy per wave` where layout allows
- bring Snipers in one wave earlier than base authored schedule

Implementation detail:

- endless: transform `WaveConfig` returned by `getWaveConfig()`
- campaign: transform each authored `WaveConfig` and each generated fallback wave in `getAlgorithmicWaves()`

For `SHOP-07`, Nightmare should additionally:

- reduce flanker charge delay
- trigger swooper groups earlier
- optionally shorten sniper cadence modestly if playtesting needs it
- add a third boss phase via generalized boss config

Do not implement Nightmare by editing raw constants directly inside `AISystem` without a difficulty input. That would make Normal and Hard tuning fragile.

## Dependency Ordering

Recommended order for planning and execution:

1. **Entitlement/data slice**
   Add upgrade definitions, store setters, difficulty helper module scaffold, and any helper functions for "is unlocked" / "available starting power-ups".
2. **Pre-run setup slice**
   Implement `TitleState` run-setup overlay and wire persistent difficulty + starting power-up selection.
3. **Run-start application slice**
   Update `PlayingState.applyMetaBonuses()` to consume the selected setup cleanly and remove hardcoded old starting-loadout assumptions.
4. **Difficulty rules slice**
   Apply shared Hard/Nightmare wave transforms for campaign and endless, then thread difficulty into AI aggression knobs.
5. **Boss phase generalization slice**
   Refactor boss config/system to N-phase support, then add Nightmare-only third phase behavior.
6. **Meta shop reorganization slice**
   Convert long-scroll rendering into tabbed categories and locked-item reveal UX after entitlement logic is stable.

This ordering keeps the risky combat refactor isolated behind stable entitlement and run-setup data.

## Recommended Plan Slices

The roadmap already suggests three plans; these are the best planner cuts:

### Slice A: Extra lives + starting slot + pre-run chooser

Covers:

- `SHOP-01`
- `SHOP-02`
- `SHOP-03`

Core files:

- `src/config/metaUpgrades.ts`
- `src/state/MetaState.ts`
- `src/states/TitleState.ts`
- `src/states/PlayingState.ts`
- optional helper mapping module for meta unlock -> available start power-up list

### Slice B: Hard/Nightmare unlocks + difficulty rules + boss generalization

Covers:

- `SHOP-04`
- `SHOP-05`
- `SHOP-06`
- `SHOP-07`

Core files:

- `src/config/metaUpgrades.ts`
- `src/state/MetaState.ts`
- new difficulty rules module
- `src/config/waveConfig.ts`
- `src/config/campaign.ts`
- `src/systems/AISystem.ts`
- `src/config/boss.ts`
- `src/systems/BossSystem.ts`
- `src/states/PlayingState.ts`

### Slice C: Meta shop tab reorganization

Covers:

- usability success criterion for category navigation
- prerequisite surfacing for all new unlocks

Core files:

- `src/ui/MetaShopUI.ts`
- optionally a small view-model helper to group upgrades by tab and locked visibility state

Keep this slice mostly UI-only. Avoid coupling tab work to combat tuning.

## Don’t Hand-Roll

- Do not invent a second persistence system for unlock gating; reuse `purchasedUpgrades` and `MetaState`
- Do not hardcode per-screen difficulty state outside `MetaState`
- Do not store starting power-up as an ad hoc DOM-only local variable; it must persist as the last selected choice
- Do not special-case a Nightmare boss branch inside `PlayingState`; phase handling belongs in `BossSystem`/boss config

## Common Pitfalls

### Duplicate source of truth for extra lives

Risk: both `purchasedUpgrades` and `extraLivesPurchased` try to represent the same entitlement.

Mitigation: pick one source of truth. Recommendation: upgrade IDs are authoritative; derive count from owned IDs.

### Nightmare unlock with no Hard-clear persistence

Risk: current `campaignProgress` does not distinguish Normal vs Hard clears.

Mitigation: add `milestone_hard_clear` entitlement on Hard victory, or explicitly budget a schema bump if planner wants a dedicated field.

### Starting chooser drifting from actual unlock pool

Risk: hardcoded chooser options fall out of sync with the run shop / power-up system as more power-ups are added.

Mitigation: use a single mapping helper from owned meta unlocks to `PowerUpType[]`.

### Boss refactor scope explosion

Risk: adding a third phase by mutating multiple unrelated systems creates brittle code.

Mitigation: first generalize boss config to phase array semantics, then add Nightmare-specific data.

### Applying run-start bonuses on continue

Risk: `PlayingState` re-entry paths can re-run bonus application.

Mitigation: planner should explicitly define whether continue counts as a fresh run start. For this phase, extra lives and starting power-up should apply only at fresh run launch, not after continue.

## Testing Strategy

### Unit tests

- `MetaState` tests for new setters and persistence of difficulty / starting power-up
- helper tests for unlocked difficulty options and starting power-up pool derivation
- wave transformation tests proving Hard/Nightmare modify base configs without mutating authored source data
- boss config/system tests for generic N-phase transitions

### Integration tests

- `TitleState` tests for run-setup overlay visibility, remembered difficulty, and `NONE` starting power-up path
- `PlayingState` tests for applying selected starting power-up and extra lives on fresh run start
- `MetaShopUI` tests for tab grouping, locked reveal toggle, and purchase gating

### Human verification focus

- category tabs are actually faster to browse than the current long-scroll layout
- Hard feels clearly harder but fair
- Nightmare aggression is readable, not chaotic
- boss third phase is visually and mechanically distinct

## Validation Architecture

Nyquist generation should target these layers:

### Requirement-to-test mapping

| Requirement | Automated validation | Human validation |
|---|---|---|
| `SHOP-01` | Assert both life-tier unlocks can be purchased sequentially and fresh run starts with base lives + owned tiers | Start a run after buying +2 lives and confirm UI/life count reflects the cap |
| `SHOP-02` | Assert starting slot unlock appears in entitlements and enables run-setup power-up chooser | Buy slot and confirm chooser appears before every run |
| `SHOP-03` | Assert chooser includes `NONE`, persists last choice, and `PlayingState` activates selected `PowerUpType` only on fresh run start | Choose none, then choose a power-up, and confirm both paths behave correctly |
| `SHOP-04` | Assert Hard option is hidden/disabled before unlock and selectable after purchase | Buy Hard and confirm title/run-start path exposes it outside the meta shop |
| `SHOP-05` | Assert Hard transformed waves have increased speed, `+1` enemy where allowed, and earlier Sniper eligibility | Play first campaign/endless waves on Hard and confirm difficulty change is noticeable but playable |
| `SHOP-06` | Assert Nightmare purchase remains locked until Hard-clear marker exists, then becomes purchasable | Beat campaign on Hard and verify Nightmare purchase appears/unlocks afterward |
| `SHOP-07` | Assert Nightmare difficulty applies more aggressive AI timers and boss config resolves to 3 phases | Play Nightmare boss and confirm a clearly distinct extra phase plus more aggressive formation breaks |

### Suggested automated test files

- `src/state/MetaState.test.ts`
- `src/states/TitleState.test.ts`
- `src/states/PlayingState.test.ts`
- `src/ui/MetaShopUI.test.ts`
- new difficulty rules test file
- `src/systems/BossSystem.test.ts`

### Required invariants

- base authored wave config objects are not mutated by difficulty transforms
- Normal behavior remains unchanged when no difficulty unlock is selected
- starting power-up chooser never offers locked power-ups
- Nightmare cannot be selected or purchased before Hard completion
- continue flow does not re-grant fresh-run bonuses

## Planner Notes

- The cleanest technical seam is `TitleState` for selection and `PlayingState.applyMetaBonuses()` for consumption.
- The highest-risk technical change is the boss refactor from fixed 2-phase logic to generic phase progression.
- The highest-risk product/design issue is Nightmare tuning; planner should isolate tuning constants so they can be adjusted without structural rewrites.
- Shop UI reorganization should be treated as a presentation slice over stable upgrade data, not as the place where unlock logic lives.
