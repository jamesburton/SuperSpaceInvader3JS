# Phase 5: Campaign Mode + Game Modes - Research

**Researched:** 2026-03-03
**Domain:** Game mode selection, campaign level data structures, localStorage persistence, FSM state integration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mode Selection UI**
- Arrow-key navigation between modes + letter shortcut keys both work simultaneously
- Three navigable options: Campaign [C], Endless [E], Upgrades [U] (Down from Endless → Upgrades)
- Side-by-side descriptions shown per option (taglines: "Handcrafted Story — Chapter 1 Available" / "Infinite Waves — Score Chase")
- Default highlighted selection: Campaign on first load
- Remembers last selection on return to menu (e.g. after a run ends)
- Bug fix required: TitleState must fully reset RunState and all game systems before launching a new PlayingState — currently, returning to menu after game over and starting again incorrectly lands back on the game over screen

**Campaign Level Structure**
- A "level" is a group of waves defined in a data object; default 3 waves per level, author-overridable per level
- Wave content is a mix: early levels reuse existing endless WaveConfig entries, later levels use fully custom hand-authored configs
- Boss placement is data-driven per level via a hasBoss flag — not hardcoded as "final level only"; supports multiple bosses per chapter
- Algorithmic fallback for un-authored levels: escalating difficulty multipliers cycling through the previous authored wave configs

**Campaign Progression**
- Progress tracked per-chapter (e.g. "Chapter 1: furthest level completed")
- Death ends the run (roguelite model) — no mid-run saves
- Completed levels unlock as start points (completing Level 2 makes Level 3 available as a start)
- Level select screen appears only when the player has at least one unlocked start point beyond Level 1
- Starting from a mid-chapter level: fresh run (no carry-in gold or power-ups), meta bonuses apply normally
- Campaign progress stored in MetaStore (extends existing Zustand persist with a campaignProgress field)

**Level Briefing Text**
- Format: level title + 2-3 sentence atmospheric paragraph
- Narrator voice is campaign-specific — default to resistance/military commander style for Ch.1
- Dismissal: keypress to skip at any time; auto-dismiss toggle (checkbox) stored as persistent user preference
- Chapter 1 briefing content: Claude drafts Neon Tokyo cyberpunk flavour lore

### Claude's Discretion
- Exact HTML/CSS layout of the mode selection overlay (within the established hud.showOverlay() pattern)
- Auto-dismiss briefing timer duration
- Exact localStorage key for auto-dismiss preference
- Campaign progress schema within MetaStore (field names, shape)
- Chapter 1 level briefing copy (author drafts, user refines later)

### Deferred Ideas (OUT OF SCOPE)
- None raised during discussion — scope stayed within Phase 5 boundary

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MODE-01 | Endless mode — infinite procedurally escalating waves, score-chase focused, always available | Endless is the existing SpawnSystem + getWaveConfig() behaviour; rename and route via mode flag in RunState |
| MODE-02 | Campaign mode — handcrafted Chapter 1 with 3-4 levels followed by boss fight | CampaignDef data structure + CampaignLevel[] array; SpawnSystem receives level-scoped WaveConfig[] |
| MODE-03 | Main menu clearly presents mode selection (Campaign, Endless) | TitleState overlay rewrite with arrow-key nav + letter shortcuts; existing hud.showOverlay() pattern |
| MODE-04 | Campaign progress is saved to localStorage and resumable from main menu | MetaStore extension with campaignProgress field; SAVE_VERSION bump to 3; migrate() handles missing field |
| CAMP-01 | Campaign wave scripts are data-driven (TypeScript objects/arrays, not hardcoded logic) | CampaignDef in src/config/campaign.ts exports typed array; SpawnSystem consumes it |
| CAMP-02 | Chapter 1 contains 3-4 handcrafted levels before the boss encounter | campaignChapter1 array with 4 CampaignLevel objects; last level has hasBoss: true |
| CAMP-03 | Brief atmospheric text overlay displays between campaign levels (mission briefing style) | LevelBriefingState pushed onto StateManager stack; hud.showOverlay() with keypress-to-skip logic |

</phase_requirements>

---

## Summary

Phase 5 builds on four complete phases and adds exactly two things: (1) a mode selection UI in TitleState, and (2) campaign-specific orchestration that drives the existing SpawnSystem with hand-authored level data. Everything the phase needs — the FSM, the overlay system, the wave data format, the Zustand persist schema — already exists. This phase is almost entirely glue and configuration, not new subsystems.

The primary technical risk is the TitleState restart bug. When GameOverState returns to TitleState via `onReturnToMenu` and the player starts a new run, RunState and all game systems are not reset before PlayingState is entered. The bug is confirmed by code inspection: `GameOverState.returnToMenu()` resets some systems but not RunState (no `runState.reset()` call), and TitleState's Space-to-start flow creates a new PlayingState without any reset at all. This must be fixed as the first task.

The campaign state machine is a thin layer on top of the existing SpawnSystem. A `CampaignLevel` data object wraps an array of `WaveConfig` entries with metadata (`briefingTitle`, `briefingText`, `hasBoss`, `waveOverrideCount`). PlayingState receives a `mode: 'endless' | 'campaign'` parameter and a campaign level index. The SpawnSystem is fed per-level wave configs instead of calling `getWaveConfig(runState.wave)` globally. Between levels, PlayingState pushes a `LevelBriefingState` onto the StateManager stack — when dismissed, the stack pops back to PlayingState which advances to the next level.

**Primary recommendation:** Build in this order: (1) fix the TitleState restart bug, (2) add mode field to RunState + TitleState mode-select UI, (3) define CampaignDef data types + Chapter 1 content, (4) wire campaign mode through PlayingState + SpawnSystem, (5) implement LevelBriefingState, (6) extend MetaStore with campaignProgress + resume flow.

---

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand vanilla | 5.x (existing) | Campaign progress persistence | Already used for MetaState; same persist middleware pattern |
| TypeScript | existing | CampaignDef type definitions | All config is typed; no runtime schema validation needed |
| DOM overlay via hud.showOverlay() | existing | Mode select, level briefings | Established pattern for all full-screen UI in this codebase |
| StateManager pushdown automaton | existing | LevelBriefingState push/pop | push() already implemented; pop() not yet used — need to verify |

### No New Packages Required

This phase introduces zero new npm dependencies. All needed functionality is in the existing stack.

**Installation:**
```bash
# No new packages — all functionality is in existing stack
```

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── config/
│   ├── waveConfig.ts       # EXISTING — WaveConfig interface + WAVE_CONFIGS[]
│   └── campaign.ts         # NEW — CampaignLevel interface + CAMPAIGN_CHAPTER_1[]
├── states/
│   ├── TitleState.ts       # MODIFY — mode select UI + arrow-key nav
│   ├── PlayingState.ts     # MODIFY — mode parameter + campaign level tracking
│   ├── GameOverState.ts    # MODIFY — bug fix: reset RunState in returnToMenu()
│   └── LevelBriefingState.ts  # NEW — atmospheric text overlay between campaign levels
├── state/
│   ├── RunState.ts         # MODIFY — add mode field ('endless' | 'campaign')
│   └── MetaState.ts        # MODIFY — add campaignProgress field, bump SAVE_VERSION to 3
└── systems/
    └── SpawnSystem.ts      # MODIFY — accept optional WaveConfig[] override (campaign mode)
```

### Pattern 1: CampaignLevel Data Object

**What:** A typed data object that describes one campaign level — its wave configs, boss flag, and briefing text. Wraps existing `WaveConfig` objects.

**When to use:** All campaign content is defined here; no campaign logic in SpawnSystem.

```typescript
// src/config/campaign.ts
import type { WaveConfig } from './waveConfig';
import { WAVE_CONFIGS, getWaveConfig } from './waveConfig';

export interface CampaignLevel {
  /** Display name shown in level briefing header */
  title: string;
  /** 2-3 sentence atmospheric text shown before level starts */
  briefingText: string;
  /**
   * Wave configs for this level. If omitted, falls back to algorithmic escalation
   * based on the level index (cycles + escalates from previous authored configs).
   */
  waves?: WaveConfig[];
  /** Default 3 waves per level; override per level as needed */
  waveCount?: number;
  /** If true, boss encounter triggers after all waves are cleared */
  hasBoss: boolean;
  /** Level index within chapter (1-based) */
  levelNumber: number;
}

export interface CampaignChapter {
  chapterNumber: number;
  title: string;
  levels: CampaignLevel[];
}

/**
 * Algorithmic fallback: generate wave configs for un-authored levels.
 * Cycles through existing authored configs with escalating multipliers.
 */
export function getAlgorithmicWaves(levelIndex: number, waveCount: number): WaveConfig[] {
  const result: WaveConfig[] = [];
  for (let i = 0; i < waveCount; i++) {
    const cycleIndex = (levelIndex * waveCount + i) % WAVE_CONFIGS.length;
    const base = WAVE_CONFIGS[cycleIndex];
    const escalation = 1 + levelIndex * 0.15; // 15% harder per level
    result.push({
      ...base,
      waveNumber: levelIndex * waveCount + i + 1,
      speedMultiplier: base.speedMultiplier * escalation,
      fireRateMultiplier: base.fireRateMultiplier * escalation,
      hpMultiplier: base.hpMultiplier * escalation,
      shopAfterThisWave: i === waveCount - 1, // shop after last wave of each level
    });
  }
  return result;
}

export const CAMPAIGN_CHAPTER_1: CampaignChapter = {
  chapterNumber: 1,
  title: 'Neon Reclamation',
  levels: [
    {
      levelNumber: 1,
      title: 'Breach Point',
      briefingText: 'Commander, enemy forces have locked down Sector 7. Three waves of Grunt formations hold the corridor. Break through — we need that data node.',
      waves: [WAVE_CONFIGS[0], WAVE_CONFIGS[1], WAVE_CONFIGS[2]], // waves 1-3
      hasBoss: false,
    },
    {
      levelNumber: 2,
      title: 'Shield Wall',
      briefingText: 'The Shielders have formed a kill-box at the central plaza. Their frontal barriers are near-impenetrable — target the flanks. Four waves stand between you and the relay tower.',
      waves: [WAVE_CONFIGS[3], WAVE_CONFIGS[4], WAVE_CONFIGS[5], WAVE_CONFIGS[6]], // waves 4-7
      hasBoss: false,
    },
    {
      levelNumber: 3,
      title: 'Precision Strike',
      briefingText: 'Snipers have taken elevated positions. Three elite formations — faster, sharper, more coordinated. Stay mobile. The Core lies beyond.',
      waves: [WAVE_CONFIGS[7], WAVE_CONFIGS[8], WAVE_CONFIGS[9]], // waves 8-10
      hasBoss: false,
    },
    {
      levelNumber: 4,
      title: 'The Sentinel',
      briefingText: 'The Sentinel AI is online. It commands everything. We have one shot at this, Commander. One.',
      waves: [WAVE_CONFIGS[10], WAVE_CONFIGS[11]], // waves 11-12
      hasBoss: true, // boss triggers after these waves
    },
  ],
};
```

**Confidence:** HIGH — follows established WaveConfig pattern exactly; data-driven, no logic in config.

### Pattern 2: RunState Mode Flag

**What:** Add a `mode` field to RunState singleton to communicate campaign vs. endless to all consumers.

**When to use:** PlayingState, SpawnSystem, and GameOverState need to know the active mode.

```typescript
// src/state/RunState.ts — ADD to existing _state object and reset()
const _state: RunStateData = {
  // ... existing fields ...
  mode: 'endless' as 'endless' | 'campaign',
  campaignLevelIndex: 0, // current level index within chapter (0-based)
};

export const runState = {
  // ... existing getters ...
  get mode() { return _state.mode; },
  get campaignLevelIndex() { return _state.campaignLevelIndex; },

  setMode(mode: 'endless' | 'campaign'): void {
    _state.mode = mode;
  },
  setCampaignLevel(index: number): void {
    _state.campaignLevelIndex = index;
  },

  reset(): void {
    // ... existing reset ...
    _state.mode = 'endless';
    _state.campaignLevelIndex = 0;
  },
};
```

### Pattern 3: MetaStore campaignProgress Extension

**What:** Add `campaignProgress` to MetaStore with a per-chapter record of the furthest level completed.

**When to use:** Persisted across sessions; checked at TitleState to show resume option.

```typescript
// src/state/MetaState.ts — ADD to MetaStore interface
const SAVE_VERSION = 3; // bump from 2

export interface CampaignProgress {
  /** Per-chapter record: chapter number → furthest level index completed (0-based) */
  [chapterNumber: number]: number;
}

export interface MetaStore {
  // ... existing fields ...
  campaignProgress: CampaignProgress;
  /** Auto-dismiss briefings preference (true = skip briefing on keypress only; false = auto-dismiss after timer) */
  briefingAutoDismiss: boolean;
  recordLevelComplete: (chapterNumber: number, levelIndex: number) => void;
  toggleBriefingAutoDismiss: () => void;
}

// In persist config: bump version to 3
// In migrate():
// v2 → v3: add campaignProgress and briefingAutoDismiss if missing
if (version < 3) {
  state = { ...state, campaignProgress: {}, briefingAutoDismiss: false, saveVersion: 3 };
}
```

**Confidence:** HIGH — follows exact same pattern as v1→v2 bunkersEnabled migration already in place.

### Pattern 4: SpawnSystem Campaign Mode Override

**What:** SpawnSystem receives an optional `levelWaves: WaveConfig[] | null` parameter. When non-null (campaign mode), it consumes from this array instead of calling `getWaveConfig(runState.wave)`. When the array is exhausted, it signals level complete (not boss — that is handled separately via the `hasBoss` flag).

**When to use:** Campaign mode routes through this path; endless ignores it.

```typescript
// src/systems/SpawnSystem.ts — ADD level-complete signal

private levelWaves: WaveConfig[] | null = null;
private levelWaveIndex: number = 0;
private _levelCompletePending: boolean = false;

public get levelCompletePending(): boolean { return this._levelCompletePending; }
public clearLevelCompletePending(): void { this._levelCompletePending = false; }

public setLevelWaves(waves: WaveConfig[] | null): void {
  this.levelWaves = waves;
  this.levelWaveIndex = 0;
}

// In update(): when formation clears and levelWaves is set:
// - If levelWaveIndex < levelWaves.length: spawn next wave from array
// - If exhausted: set _levelCompletePending = true (PlayingState handles boss/next-level routing)

private getNextWaveConfig(): WaveConfig {
  if (this.levelWaves && this.levelWaveIndex < this.levelWaves.length) {
    return this.levelWaves[this.levelWaveIndex++];
  }
  // Endless fallback: use getWaveConfig(runState.wave)
  return getWaveConfig(runState.wave);
}
```

### Pattern 5: LevelBriefingState

**What:** A new IGameState pushed onto the StateManager stack between campaign levels. Displays atmospheric text and waits for keypress (or auto-dismiss timer) before popping.

**When to use:** Campaign mode only; pushed by PlayingState when it detects level-complete and the next level has a briefing.

```typescript
// src/states/LevelBriefingState.ts — NEW FILE
import type { IGameState, StateManager } from '../core/StateManager';
import type { InputManager } from '../core/InputManager';
import type { HUD } from '../ui/HUD';
import type { CampaignLevel } from '../config/campaign';
import { useMetaStore } from '../state/MetaState';

export class LevelBriefingState implements IGameState {
  private autoDismissTimer: number = 0;
  private readonly AUTO_DISMISS_DURATION = 6; // seconds

  constructor(
    private readonly stateManager: StateManager,
    private readonly input: InputManager,
    private readonly hud: HUD,
    private readonly level: CampaignLevel,
    private readonly onDismiss: () => void,
  ) {}

  enter(): void {
    const autoDismiss = useMetaStore.getState().briefingAutoDismiss;
    this.autoDismissTimer = autoDismiss ? this.AUTO_DISMISS_DURATION : Infinity;

    this.hud.showOverlay(`
      <h2 style="font-size:14px;letter-spacing:4px;opacity:0.6;margin-bottom:8px;">
        CHAPTER 1 — LEVEL ${this.level.levelNumber}
      </h2>
      <h1 style="font-size:36px;letter-spacing:3px;text-shadow:0 0 20px #0ff;margin-bottom:24px;">
        ${this.level.title.toUpperCase()}
      </h1>
      <p style="font-size:16px;max-width:520px;line-height:1.7;opacity:0.85;margin-bottom:32px;">
        ${this.level.briefingText}
      </p>
      <p style="font-size:14px;opacity:0.5;letter-spacing:2px;">PRESS ANY KEY TO BEGIN</p>
      ${autoDismiss ? '' : '<label style="font-size:12px;opacity:0.4;margin-top:16px;display:block;">AUTO-DISMISS OFF — PRESS F to toggle</label>'}
    `);
  }

  update(dt: number): void {
    this.autoDismissTimer -= dt;
    if (this.autoDismissTimer <= 0) {
      this.dismiss();
      return;
    }
    // Any key press dismisses immediately (excluding modifier keys)
    if (this.input.anyKeyJustPressed()) {
      this.dismiss();
      return;
    }
    // Toggle auto-dismiss preference
    if (this.input.justPressed('KeyF')) {
      useMetaStore.getState().toggleBriefingAutoDismiss();
    }
    this.input.clearJustPressed();
  }

  private dismiss(): void {
    this.hud.hideOverlay();
    this.onDismiss();
  }

  render(_alpha: number): void {
    // Scene renders behind overlay
  }

  exit(): void {
    this.hud.hideOverlay();
  }
}
```

NOTE: `InputManager.anyKeyJustPressed()` may not exist. Check InputManager API. If missing, add it or use a known key list. The justPressed() API accepts a KeyboardEvent.code string — any recently pressed code will work.

### Pattern 6: TitleState Mode Selection UI

**What:** TitleState overlay replaced with a 3-option mode selector. Arrow keys and letter keys both navigate. Selected mode is highlighted. Space/Enter launches the selected mode.

**When to use:** All TitleState enter() logic.

```typescript
// src/states/TitleState.ts — REWRITE enter() and update()
type MenuOption = 'campaign' | 'endless' | 'upgrades';

export class TitleState implements IGameState {
  private metaShopUI: MetaShopUI | null = null;
  private selectedOption: MenuOption = 'campaign'; // default + remembered

  // enter(): render mode selection overlay with selectedOption highlighted
  // update(): handle ArrowUp/Down, C/E/U shortcuts, Space/Enter to launch

  private renderOverlay(): void {
    const options: MenuOption[] = ['campaign', 'endless', 'upgrades'];
    // Build HTML with selected option highlighted in neon white; others at opacity 0.45
    this.hud.showOverlay(this._buildMenuHTML());
  }

  private launchSelected(): void {
    if (this.selectedOption === 'upgrades') {
      this.metaShopUI?.show(() => { /* close callback */ });
      return;
    }
    // Set mode on RunState BEFORE entering PlayingState
    runState.reset(); // CRITICAL BUG FIX: reset RunState before new run
    // Reset all systems (same sequence as GameOverState.restartGame())
    this._resetAllSystems();
    runState.setMode(this.selectedOption);
    if (this.selectedOption === 'campaign') {
      // Check for resume point; if player has unlocked levels, show level select
      const progress = useMetaStore.getState().campaignProgress[1] ?? 0;
      if (progress > 0) {
        this._showLevelSelect();
        return;
      }
    }
    this.stateManager.replace(new PlayingState(
      this.stateManager, this.input, this.hud, this.ctx,
      () => this.stateManager.replace(new TitleState(this.stateManager, this.input, this.hud, this.ctx)),
    ));
  }
}
```

### Pattern 7: TitleState Bug Fix — System Reset

**What:** Before launching PlayingState from TitleState, all game systems must be reset to initial state. Currently this is skipped entirely.

**Root cause confirmed:** `TitleState.update()` calls `this.stateManager.replace(new PlayingState(...))` with no reset. The `onReturnToMenu` callback in PlayingState does call `GameOverState.returnToMenu()` which resets some (but not all) systems. Then TitleState re-enters and the player presses Space again — systems still have state from the previous run.

**Fix:** Extract a shared `_resetAllSystems()` method in TitleState (or a utility function) that mirrors the full reset sequence from `GameOverState.restartGame()`. Call it in both `launchSelected()` and when returning from GameOverState.

```typescript
// The complete system reset sequence (from GameOverState.restartGame())
private _resetAllSystems(): void {
  const { ctx } = this;
  runState.reset(); // MUST be first — clears wave counter, lives, score
  ctx.player.active = true;
  ctx.player.mesh.visible = true;
  ctx.player.x = 0;
  ctx.activeBullets.forEach(b => b.isPlayerBullet
    ? ctx.playerBulletPool.release(b)
    : ctx.enemyBulletPool.release(b));
  ctx.activeBullets.length = 0;
  ctx.collisionSystem.reset();
  ctx.spawnSystem.reset();
  ctx.aiSystem.reset();
  ctx.shopSystem.reset();
  ctx.powerUpManager.releaseAll();
  ctx.boss.deactivate();
  ctx.bossSystem.reset();
  ctx.bossHealthBar.hide();
  ctx.bunkerManager.reset();
  ctx.formation.spawnWave(); // re-spawn wave 1 formation
}
```

**Confidence:** HIGH — confirmed by code inspection of TitleState.ts and GameOverState.ts.

### Anti-Patterns to Avoid

- **Hardcoding boss as "last level only"**: The `hasBoss` flag on each `CampaignLevel` is how boss placement is declared. Never check `levelIndex === levels.length - 1` in code.
- **Storing campaign state in RunState**: RunState is volatile (reset each run). Campaign chapter/level progress belongs in MetaStore.
- **Calling `getWaveConfig(runState.wave)` in campaign mode**: Campaign mode feeds a pre-built `WaveConfig[]` to SpawnSystem. The global wave number from RunState is used only for endless mode.
- **Pushing LevelBriefingState with `replace()`**: Use `push()` so PlayingState remains on the stack and resumes when briefing is dismissed. Verify StateManager.pop() is implemented — if not, implement it in this phase.
- **Forgetting to bump SAVE_VERSION**: Adding `campaignProgress` to MetaStore without bumping from 2 to 3 will corrupt existing saves.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent campaign progress | Custom localStorage read/write | Zustand persist middleware (already in MetaState) | Migration, versioning, and serialization are handled; matches established MetaState pattern |
| Level sequence state machine | Bespoke level runner class | RunState mode flag + SpawnSystem levelWaves override | Existing SpawnSystem already handles wave sequencing; campaign is just a scoped WaveConfig[] |
| Mode select UI framework | Custom nav component | DOM overlay + InputManager.justPressed() key handling | Matches every other full-screen UI in the codebase; zero extra complexity |
| Briefing timer | requestAnimationFrame manual timer | Fixed-step dt accumulation in update() | Consistent with existing game loop; avoids separate timer lifecycle |
| Level select UI | Third-party UI library | hud.showOverlay() with HTML + window global onclick handlers | Matches MetaShopUI pattern (window.__metaShopBuy global for onclick handlers) |

**Key insight:** This codebase already has every primitive needed. Phase 5 is configuration + thin orchestration, not new systems.

---

## Common Pitfalls

### Pitfall 1: TitleState Restart Bug — Incomplete Reset

**What goes wrong:** Player returns to menu after game over (GameOverState.returnToMenu()), then presses Space in TitleState to start a new run — the game starts mid-state (game over screen reappears, or enemy formation is in wrong state).

**Why it happens:** `GameOverState.returnToMenu()` resets some systems but does NOT call `runState.reset()`. Then TitleState creates a new PlayingState on top of stale RunState (`lives=0`, `gamePhase='gameover'`).

**How to avoid:** TitleState must call `runState.reset()` AND reset all game systems before constructing any new PlayingState. Extract shared `_resetAllSystems()` utility. Apply it in TitleState for ALL mode launches (Space-to-start, C, E). Also verify `GameOverState.returnToMenu()` resets `ctx.collisionSystem` — confirmed it does, but RunState is the gap.

**Warning signs:** After returning to menu and restarting, `runState.gamePhase` is still `'gameover'`; player has 0 lives; formation.activeCount is 0.

### Pitfall 2: StateManager.pop() Not Implemented

**What goes wrong:** `LevelBriefingState` is designed to be pushed with `stateManager.push()` and dismissed with `stateManager.pop()`. If `pop()` does not exist on StateManager, the pattern breaks.

**Why it happens:** The pushdown automaton (push/pop pattern) was designed in Phase 1 for PausedState, but PausedState uses the same stateManager reference to push itself, not to pop. It is unclear whether `pop()` is implemented.

**How to avoid:** Read `src/core/StateManager.ts` before implementing LevelBriefingState. If `pop()` is absent, add it (it is a 3-line method: call `exit()` on top state, pop the stack, call `resume()` on the new top). Alternative: pass an explicit `onDismiss` callback to LevelBriefingState that calls `stateManager.replace()` with the next state instead of relying on pop.

**Warning signs:** TypeScript will refuse to compile if `pop()` is called and the method doesn't exist.

### Pitfall 3: SAVE_VERSION Not Bumped

**What goes wrong:** Adding `campaignProgress: {}` and `briefingAutoDismiss: false` to MetaStore without bumping `SAVE_VERSION` from 2 to 3 means existing localStorage data has `version: 2`. Zustand's persist middleware compares stored version to current version; if they match, `migrate()` is never called. The new fields will be `undefined`.

**How to avoid:** Always bump `SAVE_VERSION` constant AND the `version:` parameter inside `persist()`. Add migration branch `if (version < 3)` that seeds the new fields with defaults.

**Warning signs:** `useMetaStore.getState().campaignProgress` is `undefined` on browsers that have existing save data.

### Pitfall 4: Campaign WaveConfig waveNumber Mismatch

**What goes wrong:** SpawnSystem increments `runState.wave` and then calls `hud.showWaveAnnouncement(runState.wave, ...)`. In campaign mode, `runState.wave` will drift from the WaveConfig's `waveNumber` field (which was authored for endless context). HUD shows wrong wave numbers.

**How to avoid:** In campaign mode, `hud.showWaveAnnouncement()` should show level-relative wave number, not global `runState.wave`. Either: (a) track a `campaignWaveIndexWithinLevel` counter in SpawnSystem, or (b) always pass the WaveConfig's own display label from CampaignLevel. Simplest: show "Level X - Wave Y of Z" for campaign; keep `runState.wave` incrementing normally for score/SI$ purposes.

**Warning signs:** HUD shows "Wave 8" when the player is on Level 1 Wave 2 of the campaign.

### Pitfall 5: InputManager.anyKeyJustPressed() Not Implemented

**What goes wrong:** LevelBriefingState needs to dismiss on "any key press". The existing `InputManager.justPressed(code)` API requires a specific key code. If `anyKeyJustPressed()` doesn't exist, briefing cannot be skipped generically.

**How to avoid:** Either add `anyKeyJustPressed(): boolean` to InputManager (returns true if the just-pressed set is non-empty), or hardcode a list of common dismiss keys (Space, Enter, KeyE, KeyC). The former is cleaner. Inspect `src/core/InputManager.ts` before deciding.

**Warning signs:** LevelBriefingState shows but the player cannot dismiss it by pressing arbitrary keys.

### Pitfall 6: Level Select UI Global Handler Collision

**What goes wrong:** Level select HTML uses `window.__campaignLevelSelect` for onclick handlers (like MetaShopUI uses `window.__metaShopBuy`). If the previous run left a stale handler reference, clicking a level card calls the old callback.

**How to avoid:** Re-assign `window.__campaignLevelSelect` every time the level select overlay is rendered. Delete it in exit(). Match the MetaShopUI established pattern exactly.

---

## Code Examples

Verified patterns from codebase inspection:

### Zustand persist migration (MetaState.ts — existing pattern to follow)

```typescript
// Source: src/state/MetaState.ts (inspected)
migrate: (persistedState: unknown, version: number) => {
  let state = persistedState as Partial<MetaStore>;
  if (version < 1) {
    state = { ...state, purchasedUpgrades: [], saveVersion: 1 };
  }
  if (version < 2) {
    state = { ...state, bunkersEnabled: true, saveVersion: 2 };
  }
  // ADD for Phase 5:
  if (version < 3) {
    state = { ...state, campaignProgress: {}, briefingAutoDismiss: false, saveVersion: 3 };
  }
  return state as MetaStore;
},
```

### StateManager push/replace pattern (TitleState.ts — existing)

```typescript
// Source: src/states/TitleState.ts (inspected)
// EXISTING: replace() for major transitions
this.stateManager.replace(
  new PlayingState(this.stateManager, this.input, this.hud, this.ctx, onReturnToMenu),
);

// PATTERN: push() for overlay states (PausedState does this)
// PlayingState.update() — PausedState.ts uses push()
stateManager.push(new PausedState(stateManager, input, hud));
// PausedState exits by calling stateManager.pop() (needs verification)
```

### SpawnSystem reset() (existing — complete reset sequence)

```typescript
// Source: src/systems/SpawnSystem.ts (inspected)
public reset(): void {
  this.waveTransitioning = false;
  this.transitionTimer = 0;
  this._shopPending = false;
  this._bossPending = false;
  this.onWaveCleared = null;
  // ADD for Phase 5:
  // this.levelWaves = null;
  // this.levelWaveIndex = 0;
  // this._levelCompletePending = false;
}
```

### GameOverState full reset sequence (for reference — TitleState must mirror this)

```typescript
// Source: src/states/GameOverState.ts restartGame() (inspected)
runState.reset();
ctx.player.active = true;
ctx.player.mesh.visible = true;
ctx.player.x = 0;
ctx.activeBullets.forEach(b => b.isPlayerBullet
  ? ctx.playerBulletPool.release(b)
  : ctx.enemyBulletPool.release(b));
ctx.activeBullets.length = 0;
ctx.collisionSystem.reset();
ctx.spawnSystem.reset();
ctx.aiSystem.reset();
ctx.shopSystem.reset();
ctx.powerUpManager.releaseAll();
ctx.boss.deactivate();
ctx.bossSystem.reset();
ctx.bossHealthBar.hide();
ctx.bunkerManager.reset();
ctx.formation.spawnWave(); // spawn wave 1 formation
```

### WaveConfig array slice for campaign levels

```typescript
// Source: src/config/waveConfig.ts (inspected) — WAVE_CONFIGS[0..11] are Wave 1-12
// Pattern: campaign levels slice from the existing array
const CAMPAIGN_CHAPTER_1_LEVEL_1_WAVES = [
  WAVE_CONFIGS[0], // wave 1: tutorial grunts
  WAVE_CONFIGS[1], // wave 2: shielder intro
  WAVE_CONFIGS[2], // wave 3: standard grunts
];
```

### Letter key shortcut pattern (TitleState.ts + MetaShopUI — existing)

```typescript
// Source: src/states/TitleState.ts (inspected)
if (this.input.justPressed('KeyU')) { /* open upgrades */ }

// Pattern for Phase 5 mode select:
if (this.input.justPressed('KeyC')) { this.selectedOption = 'campaign'; this.launchSelected(); }
if (this.input.justPressed('KeyE')) { this.selectedOption = 'endless'; this.launchSelected(); }
if (this.input.justPressed('ArrowUp')) { /* navigate up */ }
if (this.input.justPressed('ArrowDown')) { /* navigate down */ }
if (this.input.justPressed('Space') || this.input.justPressed('Enter')) { this.launchSelected(); }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| "PRESS SPACE TO START" single-action title screen | Three-option mode select with arrow nav + letter shortcuts | Phase 5 | TitleState enter() and update() rewrites; existing MetaShopUI U-key shortcut stays |
| Endless-only: getWaveConfig(runState.wave) always | Campaign: levelWaves array fed to SpawnSystem; endless: getWaveConfig() unchanged | Phase 5 | SpawnSystem gains optional override path; campaign/endless diverge after mode selection |
| No campaign progress persistence | MetaStore.campaignProgress per-chapter level unlock record | Phase 5 | SAVE_VERSION 2→3 with migration |
| Boss trigger: hardcoded BOSS_TRIGGER_WAVE constant | Boss trigger: data-driven hasBoss flag on CampaignLevel | Phase 5 | SpawnSystem still uses BOSS_TRIGGER_WAVE for endless; campaign checks hasBoss flag |

**Important:** For endless mode, `BOSS_TRIGGER_WAVE = 10` in constants.ts remains the boss trigger. For campaign mode, the boss trigger is `hasBoss: true` on the level definition. SpawnSystem must route differently based on `runState.mode`.

---

## Open Questions

1. **Is StateManager.pop() implemented?**
   - What we know: `push()` is implemented and used by PausedState; `replace()` is the primary transition. The pushdown automaton design implies pop() should exist.
   - What's unclear: PausedState's exit path — how does it pop itself? Inspecting StateManager.ts before implementing LevelBriefingState is essential.
   - Recommendation: Read `src/core/StateManager.ts` as first action in implementation. If pop() is missing, add it before building LevelBriefingState.

2. **Does InputManager expose anyKeyJustPressed() or a justPressedSet?**
   - What we know: `justPressed(code)` and `clearJustPressed()` are confirmed in use. `isDown(code)` also exists.
   - What's unclear: Whether there's a way to detect "any key" without a hard-coded list.
   - Recommendation: Read `src/core/InputManager.ts`. If it exposes the justPressed Set internally, add a public `anyKeyJustPressed(): boolean` getter in Phase 5. If not, hardcode dismiss keys for briefing (Space, Enter, ArrowUp, ArrowDown).

3. **Should campaign victory use a different GameOverState message?**
   - What we know: `GameOverState` accepts `type: 'defeat' | 'victory'`. Campaign chapter complete should feel different from endless boss defeat.
   - What's unclear: Whether "VICTORY!" suffices for campaign completion or a new `'campaign_victory'` type is warranted.
   - Recommendation: Reuse `'victory'` type for now; add a `levelTitle` display in the GameOverState header text. CONTEXT.md doesn't call for a custom screen, so minimal change is correct.

---

## Sources

### Primary (HIGH confidence)

- `src/states/TitleState.ts` — inspected: current menu structure, key handling, MetaShopUI integration
- `src/states/PlayingState.ts` — inspected: PlayingStateContext interface, mode routing hooks, full update loop
- `src/states/GameOverState.ts` — inspected: restart/returnToMenu sequences, confirmed RunState.reset() gap
- `src/systems/SpawnSystem.ts` — inspected: wave escalation, boss trigger, pending signal pattern
- `src/state/MetaState.ts` — inspected: Zustand persist schema, SAVE_VERSION=2, migrate() pattern
- `src/state/RunState.ts` — inspected: singleton structure, reset(), available extension points
- `src/config/waveConfig.ts` — inspected: WaveConfig interface, WAVE_CONFIGS[0..11], getWaveConfig() fallback
- `src/core/Game.ts` — inspected: PlayingStateContext wiring, all system construction
- `.planning/phases/05-campaign-mode-game-modes/05-CONTEXT.md` — user decisions, locked constraints

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — accumulated architectural decisions from all prior phases; cross-referenced against source files
- `.planning/REQUIREMENTS.md` — MODE-01..04, CAMP-01..03 requirement definitions

### Tertiary (LOW confidence)

- StateManager.pop() existence: not confirmed by direct source inspection (StateManager.ts not yet read) — flagged as Open Question

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing
- Architecture: HIGH — confirmed by source inspection of all 8 primary files
- Pitfalls: HIGH — confirmed by code inspection (TitleState bug, SAVE_VERSION pattern, SpawnSystem wave numbering)
- Open questions: LOW — StateManager.pop() and InputManager.anyKeyJustPressed() need source verification before implementation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain; only changes if upstream architecture changes)
