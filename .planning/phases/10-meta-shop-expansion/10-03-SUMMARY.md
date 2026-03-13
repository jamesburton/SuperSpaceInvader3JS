requirements-completed: [SHOP-01, SHOP-02, SHOP-04]

# Plan 10-03 Summary

## Outcome

Reorganized the meta shop into faster-scanning category tabs:
- added primary tabs for `Weapons`, `Ships`, `Upgrades`, and `Visual`
- hid locked content by default and exposed it through a reveal-on-demand toggle
- preserved keyboard/gamepad navigation with tab focus, linear content traversal, and actionable entries for special controls
- kept CRT controls and the ship customizer accessible inside the tabbed layout

## Key Files

- `src/ui/MetaShopUI.ts`
- `src/ui/MetaShopUI.test.ts`
- `src/config/metaUpgrades.ts`

## Verification

- `npx vitest run src/ui/MetaShopUI.test.ts`
- `npx tsc --noEmit`

## Notes

- The tabbed UI keeps entitlement logic in the data/config layer and treats the shop as a presentation surface over existing upgrade state.
- Locked CRT tiers remain hidden until reveal mode is enabled, matching the Phase 10 browse-path requirement.

