# Phase 10: Meta Shop Expansion - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand the persistent meta shop so it supports extra starting lives, a starting power-up slot with pre-run selection, Hard and Nightmare difficulty unlocks, and a clearer category-based shop structure. This phase is about exposing and organizing those unlocks, not about adding new weapon families or new progression systems beyond the roadmap scope.

</domain>

<decisions>
## Implementation Decisions

### Run setup flow
- Starting power-up choice should happen before every run, after the player chooses Campaign or Endless
- The pre-run flow must always offer an explicit "no starting power-up" option
- Extra lives are permanent meta unlocks with a hard cap of +2 total
- The starting slot should draw from the currently unlockable run power-up pool in this milestone, not just spread/rapid

### Difficulty progression
- Hard unlocks first; Nightmare only unlocks after Hard is cleared
- Difficulty switching should happen from the title/run-start path, not inside the meta shop and not in-run
- The game should remember the last selected difficulty
- Hard and Nightmare should feel clearly harder, but remain tuned as real playable modes rather than novelty punishment modes

### Meta shop organization
- The expanded meta shop should use category tabs as the primary navigation model
- Category names should align with the roadmap wording: Weapons, Ships, Upgrades, Visual
- Upgrade cards should stay compact and quick to scan: short effect text, cost, and state only
- Locked upgrades should be hidden by default and revealable on demand rather than always cluttering the main browse path

### Claude's Discretion
- The exact UI treatment for revealing locked upgrades
- The exact wording and styling of the pre-run starting power-up chooser
- The exact stat multipliers for Hard and Nightmare, as long as they stay within the "noticeable but fair" target
- Exact tab styling, card spacing, and category iconography

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/ui/MetaShopUI.ts`: existing DOM-based shop shell with gamepad navigation, purchase handling, and section rendering
- `src/state/MetaState.ts`: already contains dormant `difficulty`, `startingPowerUp`, and `extraLivesPurchased` fields ready to be activated
- `src/config/metaUpgrades.ts`: current meta-upgrade registry and sequential unlock conventions
- `src/states/TitleState.ts`: existing mode-selection entry point where difficulty and pre-run setup can attach cleanly
- `src/config/waveConfig.ts` and `src/config/campaign.ts`: existing difficulty levers and campaign fallback generation points

### Established Patterns
- Meta shop unlocks are already represented as persistent upgrade IDs in Zustand state
- DOM overlays are the preferred UI pattern for menus and shop flows; prior phases avoided heavier UI systems
- Sequential unlock chains already exist in the meta shop and should remain readable/consistent
- The project already persists long-lived preferences like skin choice, CRT settings, and difficulty through `MetaState`

### Integration Points
- `MetaShopUI` is the main surface for new unlock purchases and category navigation
- `TitleState` is the right integration point for difficulty selection and the pre-run starting power-up choice
- `PlayingState.applyMetaBonuses()` is the current place where persistent run-start bonuses get applied
- `waveConfig` / campaign generation will need the final difficulty multipliers once planning locks them

</code_context>

<specifics>
## Specific Ideas

- The starting power-up slot should feel like a quick loadout step before launch, not a buried settings toggle
- The difficulty ladder should feel earned and readable: Normal -> Hard -> Nightmare
- The shop should feel faster to browse than the current long-scroll layout, especially once the catalog grows further
- Locked content should be discoverable when the player asks for it, but should not dominate the default browsing view

</specifics>

<deferred>
## Deferred Ideas

- Automatically including future weapon families in the starting power-up slot without revisiting the flow
- Any broader discovery-first unlock system where run encounters gate permanent shop availability

</deferred>

---

*Phase: 10-meta-shop-expansion*
*Context gathered: 2026-03-10*
