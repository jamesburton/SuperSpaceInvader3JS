---
phase: 10
status: passed
verified: 2026-03-11
---

# Phase 10 Verification

## Result

Phase 10 passed verification.

## Requirements Covered

- `SHOP-01`: two permanent starting-life tiers apply on fresh runs only
- `SHOP-02`: starting power-up slot unlock is purchasable in the meta shop
- `SHOP-03`: TitleState run-setup overlay remembers the chosen difficulty and starting power-up, including `NONE`
- `SHOP-04`: Hard unlock is purchasable and exposed only through the pre-run setup flow
- `SHOP-05`: Hard wave transforms increase speed, widen formations where possible, and bring Snipers in earlier
- `SHOP-06`: Nightmare purchase stays gated behind the persisted Hard-clear marker
- `SHOP-07`: Nightmare applies more aggressive formation timing and adds a third boss phase

## Automated Verification

- `npx vitest run src/state/MetaState.test.ts src/states/TitleState.test.ts src/states/PlayingState.test.ts src/ui/MetaShopUI.test.ts src/config/difficultyRules.test.ts src/config/waveConfig.test.ts src/systems/BossSystem.test.ts`
- `npx tsc --noEmit`

## Notes

- The targeted Vitest run passed with 40 tests.
- The MetaState unit tests still emit expected persist-storage warnings under the current test environment, but the assertions passed.
