# Plan 10-02 Summary

## Outcome

Implemented the Phase 10 difficulty ladder and combat hooks:
- added Hard and Nightmare meta-shop entitlements plus a persisted Hard-clear marker for Nightmare gating
- introduced shared difficulty transforms for endless and campaign waves, including faster waves, wider formations, and earlier Sniper availability
- threaded difficulty into AI aggression and boss setup
- generalized the boss encounter to support a Nightmare-only third phase

## Key Files

- `src/config/metaUpgrades.ts`
- `src/config/difficultyRules.ts`
- `src/config/waveConfig.ts`
- `src/config/campaign.ts`
- `src/entities/Boss.ts`
- `src/systems/AISystem.ts`
- `src/systems/BossSystem.ts`
- `src/systems/SpawnSystem.ts`
- `src/states/PlayingState.ts`
- `src/ui/MetaShopUI.ts`

## Verification

- `npx vitest run src/config/difficultyRules.test.ts src/config/waveConfig.test.ts src/systems/BossSystem.test.ts src/states/PlayingState.test.ts`
- `npx tsc --noEmit`

## Notes

- Hard-clear gating reuses `purchasedUpgrades` through the pseudo-entitlement `milestone_hard_clear`, avoiding a second persistence channel.
- Boss phase count now scales from difficulty, while Normal and Hard preserve the original two-phase fight.
