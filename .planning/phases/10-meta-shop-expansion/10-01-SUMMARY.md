requirements-completed: [SHOP-01, SHOP-02, SHOP-03]

# Plan 10-01 Summary

## Outcome

Implemented the Phase 10 run-start foundation:
- added permanent entitlements for two starting-life tiers and the starting power-up slot
- normalized MetaState to persist `PowerUpType | null` for the saved starting choice and expose dedicated run-setup setters
- added a title-screen run-setup overlay that remembers difficulty and starting power-up selections before Campaign or Endless launches
- changed PlayingState to grant extra lives and the selected starting power-up only on fresh run starts, not on continue

## Key Files

- `src/config/metaUpgrades.ts`
- `src/state/MetaState.ts`
- `src/state/runSetup.ts`
- `src/states/TitleState.ts`
- `src/states/PlayingState.ts`
- `src/ui/MetaShopUI.ts`
- `src/state/MetaState.test.ts`
- `src/states/TitleState.test.ts`
- `src/states/PlayingState.test.ts`

## Verification

- `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/states/PlayingState.test.ts`
- `npx tsc --noEmit`

## Notes

- Save schema advanced to version 5 to normalize the legacy `passive_startingLife` purchase and convert old stored loadout ids into `PowerUpType` values.
- The current Meta Shop UI was minimally updated so the two starting-life purchases remain sequential until the larger tabbed rewrite lands in Plan 10-03.

