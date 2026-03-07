# Phase 8: Visual Customization - Research

**Researched:** 2026-03-07
**Domain:** Three.js geometry swapping, pmndrs/postprocessing custom Effect subclassing, DOM overlay UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKIN-01 | Player can view and select from 3-4 distinct ship geometry shapes in a selection UI | BufferGeometry factory pattern; DOM overlay with mini Three.js canvas previews |
| SKIN-02 | Player can choose from 6 color variants per ship shape | MeshStandardMaterial color/emissive swap; color palette data object |
| SKIN-03 | Ship skins are purchasable with SI$ in the meta shop | MetaShopUI extension pattern; purchaseUpgrade() already exists |
| SKIN-04 | Selected skin and color persist across sessions | MetaStore.selectedSkin already typed; just write via Zustand set() |
| SKIN-05 | Ship selection shows visual preview of each option | Off-screen WebGLRenderer or SVG path preview in DOM cards |
| CRT-01 | Player can unlock CRT Tier 1 "HIGH-DEF 2003" (light scanlines) in meta shop | ScanlineEffect (density 1.5), MetaStore.crtTier=1 unlock gate |
| CRT-02 | Player can unlock CRT Tier 2 "CONSUMER 1991" (moderate scanlines + chromatic aberration) | ScanlineEffect (density 2.5) + ChromaticAberrationEffect (offset 0.003) |
| CRT-03 | Player can unlock CRT Tier 3 "ARCADE 1983" (heavy scanlines + strong chromatic aberration) | ScanlineEffect (density 4.0) + ChromaticAberrationEffect (offset 0.006) |
| CRT-04 | Player can adjust CRT effect intensity with a slider | CRT intensity 0–1 maps to density and offset multipliers; Zustand crtIntensity |
| CRT-05 | CRT effect updates in real-time as settings change (no restart required) | scanlineEffect.density and chromaticEffect.offset are live-settable properties |
</phase_requirements>

---

## Summary

Phase 8 splits into two largely independent sub-problems: ship skins and CRT post-processing. Both lean on well-understood Three.js primitives and the existing project architecture.

**Ship skins** are achieved by pre-defining 3-4 `BufferGeometry` factories (each a hand-authored vertex array, like the existing `makePlayerGeometry()`), swapping the player `Mesh.geometry` and `Mesh.material` in-place at run-start based on `MetaStore.selectedSkin`. A separate `PlayerSkinManager` class owns the geometry/color definitions and the swap logic, keeping `Player.ts` clean. The selection UI is a DOM overlay in the existing `MetaShopUI` style — cards for each shape, a color swatch row per shape, purchase buttons. Previews are SVG path thumbnails rendered inline in the card HTML (no second WebGL context needed).

**CRT post-processing** uses built-in pmndrs/postprocessing effects: `ScanlineEffect` and `ChromaticAberrationEffect`, both already in the installed package (v6.38.3). They live in a **second `EffectPass`** added to the existing `EffectComposer` after the bloom `EffectPass`. This is the correct separation — confirmed by STATE.md decision "CRT must live in a separate EffectPass after bloom (not merged) — merging causes bloom to disappear." The CRT effects are conditionally created/destroyed based on `MetaStore.crtTier`, and intensity is driven by multiplying property values from `MetaStore.crtIntensity` (0–1). The `BloomEffect.ts` class needs a `addCrtPass()` method so the CRT pass attaches to the same composer.

**Primary recommendation:** Build `PlayerSkinManager` as a standalone class, extend `MetaShopUI` with a new "SHIP SKINS" section (or a dedicated `SkinShopUI`), and add a `CRTManager` that wraps the second `EffectPass` with the scanline + chromatic effects.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.183.2 | BufferGeometry, Mesh, MeshStandardMaterial, Color | Already committed — geometry swap is native API |
| postprocessing | 6.38.3 | ScanlineEffect, ChromaticAberrationEffect, EffectPass | Already installed; both effects verified present in build |
| zustand | 5.0.11 | MetaStore.selectedSkin, crtTier, crtIntensity persistence | Already the persistence layer; fields already typed in v4 schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | No new runtime dependencies needed | All required primitives exist |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG preview | Second WebGLRenderer for preview | SVG is zero cost; second renderer adds memory/context overhead |
| ScanlineEffect (built-in) | Custom Effect subclass | Built-in is simpler; custom only needed if we want features not in the built-in (e.g. scrolling scanlines) |
| ChromaticAberrationEffect (built-in) | Custom Effect subclass | Built-in has radialModulation option which is aesthetically better |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── entities/
│   └── PlayerSkinManager.ts    # Ship geometries, color palette, apply-to-mesh
├── effects/
│   ├── BloomEffect.ts          # (modify) add addCrtPass(tier, intensity) method
│   └── CRTEffect.ts            # Wraps ScanlineEffect + ChromaticAberrationEffect
├── ui/
│   ├── MetaShopUI.ts           # (modify) add SHIP SKINS section rendering
│   └── SkinShopUI.ts           # Ship selector UI (show/hide, preview cards, color picker)
└── config/
    └── skinConfig.ts           # SHIP_SHAPES[], SKIN_COLORS[], skin upgrade definitions
```

### Pattern 1: Geometry + Material Swap In-Place

**What:** Player.mesh already exists in the scene and is registered with the bloom selection. Replace geometry and material without removing/re-adding the mesh.

**When to use:** Run-start in `PlayingState.applyMetaBonuses()`, after reading `MetaStore.selectedSkin`.

**How it works:**
```typescript
// Source: Three.js forum discourse.threejs.org/t/solved-how-do-we-swap-the-geometry-and-material-of-a-mesh/963
// Verified: Three.js 0.183 — mesh.geometry and mesh.material are mutable properties

public applySkin(player: Player, shapeId: string, colorId: string): void {
  // Dispose old geometry to free GPU memory
  player.mesh.geometry.dispose();

  // Build and assign new geometry
  player.mesh.geometry = this._buildGeometry(shapeId);

  // Dispose old material
  (player.mesh.material as MeshStandardMaterial).dispose();

  // Build and assign new material with the chosen color
  const colorHex = SKIN_COLORS[colorId] ?? 0x00ffff;
  player.mesh.material = new MeshStandardMaterial({
    color: colorHex,
    emissive: new Color(colorHex),
    emissiveIntensity: 1.2,
    roughness: 1.0,
    metalness: 0.0,
  });
  // Bloom registration NOT needed — mesh is already in bloomEffect.selection
  // selection holds a reference to the Object3D (the mesh), not its geometry/material
}
```

**Key insight:** The bloom `Selection` set holds a reference to the `Mesh` object itself, not its geometry or material. Swapping geometry/material does not require re-registering with bloom.

### Pattern 2: CRT EffectPass Chain

**What:** Add a second `EffectPass` to the existing `EffectComposer` in `BloomEffect.ts` that contains `ScanlineEffect` + `ChromaticAberrationEffect`.

**When to use:** At `Game.init()` time, conditioned on `MetaStore.crtTier`. Can also be toggled dynamically if tier changes (but tier changes only happen in meta shop, not during gameplay).

```typescript
// Source: pmndrs/postprocessing wiki Custom-Effects + ScanlineEffect docs
// Verified: both ScanlineEffect and ChromaticAberrationEffect present in postprocessing 6.38.3

import {
  ScanlineEffect,
  ChromaticAberrationEffect,
  EffectPass,
  BlendFunction,
} from 'postprocessing';
import { Vector2 } from 'three';

// Tier definitions — intensity is a 0-1 multiplier from MetaStore.crtIntensity
const CRT_TIERS = {
  1: { scanlineDensity: 1.5, aberrationOffset: 0.000 }, // scanlines only
  2: { scanlineDensity: 2.5, aberrationOffset: 0.003 }, // moderate + some CA
  3: { scanlineDensity: 4.0, aberrationOffset: 0.006 }, // heavy + strong CA
} as const;

export class CRTManager {
  private crtPass: EffectPass | null = null;
  private scanlineEffect: ScanlineEffect | null = null;
  private chromaticEffect: ChromaticAberrationEffect | null = null;
  private tier: number = 0;
  private intensity: number = 0.5;

  /** Attach CRT pass to an existing composer (after bloom pass). */
  public init(
    composer: EffectComposer,
    camera: OrthographicCamera,
    tier: number,
    intensity: number,
  ): void {
    this.tier = tier;
    this.intensity = intensity;
    if (tier < 1 || tier > 3) return; // not unlocked

    const { scanlineDensity, aberrationOffset } = CRT_TIERS[tier as 1|2|3];

    this.scanlineEffect = new ScanlineEffect({
      blendFunction: BlendFunction.OVERLAY,
      density: scanlineDensity * intensity,
    });

    const effects: Effect[] = [this.scanlineEffect];

    if (aberrationOffset > 0) {
      this.chromaticEffect = new ChromaticAberrationEffect({
        offset: new Vector2(aberrationOffset * intensity, aberrationOffset * intensity),
        radialModulation: true,
        modulationOffset: 0.15,
      });
      effects.push(this.chromaticEffect);
    }

    this.crtPass = new EffectPass(camera, ...effects);
    composer.addPass(this.crtPass);
  }

  /** Update intensity in real-time (called from settings slider). */
  public setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
    if (!this.scanlineEffect) return;
    const { scanlineDensity, aberrationOffset } = CRT_TIERS[this.tier as 1|2|3];
    this.scanlineEffect.density = scanlineDensity * this.intensity;
    if (this.chromaticEffect) {
      const off = aberrationOffset * this.intensity;
      this.chromaticEffect.offset = new Vector2(off, off);
    }
  }
}
```

**Critical:** `crtTier` and `crtIntensity` must not be null/undefined before calling `CRTManager.init()`. The MetaStore v4 schema guarantees both fields exist.

### Pattern 3: Ship Preview with Inline SVG

**What:** Render a tiny ship silhouette for each shape ID as an SVG `<polygon>` inside a DOM card. No second WebGL context.

**When to use:** Skin selector UI cards — one card per shape.

```typescript
// Pre-compute SVG viewBox coordinates from the same vertex arrays used for BufferGeometry
// Scale from world units (±20, ±12) to SVG (0-80, 0-48) with Y-flip
const SHAPE_SVG_PATHS: Record<string, string> = {
  'default': '40,2 60,46 52,28 40,32 28,28 20,46',   // chevron
  'delta':   '40,2 62,46 40,38 18,46',               // delta/arrowhead
  'cruiser': '40,4 58,46 52,22 40,36 28,22 22,46 8,36 12,12', // wide body
  'dart':    '40,0 56,46 40,34 24,46',               // narrow dart
};

// In card HTML:
// <svg viewBox="0 0 80 48" width="80" height="48">
//   <polygon points="${SHAPE_SVG_PATHS[shapeId]}" fill="${colorHex}" opacity="0.9"/>
// </svg>
```

**Why not a second WebGL context:** Mobile and desktop browsers cap simultaneous WebGL contexts (typically 8–16). Opening a second renderer for preview risks hitting that cap or degrading performance. SVG paths are a zero-cost alternative for 2D ship silhouettes.

### Pattern 4: MetaStore Integration for Skins

**What:** `MetaStore.selectedSkin` is already typed as `{ shapeId: string; colorId: string }` with default `{ shapeId: 'default', colorId: 'white' }`. Writing to it uses Zustand `set()`.

```typescript
// Add to MetaStore (or just call useMetaStore.getState() directly)
setSelectedSkin: (shapeId: string, colorId: string) => void;

// In MetaState.ts — add action:
setSkin: (shapeId: string, colorId: string) => {
  set({ selectedSkin: { shapeId, colorId } });
},
```

**Persistence:** Automatic via Zustand `persist` middleware — no extra code needed.

### Anti-Patterns to Avoid

- **Removing and re-adding the Mesh to the scene for a skin change:** Causes bloom registration to be lost. Always swap geometry/material in-place.
- **Merging CRT effects into the bloom EffectPass:** Confirmed by STATE.md to suppress bloom output. Always use a separate `EffectPass` for CRT after bloom.
- **Creating a separate WebGLRenderer for ship previews:** Context limit risk; SVG is sufficient for silhouette previews.
- **Checking `purchasedUpgrades` for skin unlock in-game at every frame:** Read MetaStore once at run start in `applyMetaBonuses()` — not every update tick.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scanline overlay | Custom fullscreen quad shader | `ScanlineEffect` (postprocessing 6.38.3) | Already in package; tested; handles resolution correctly |
| Chromatic aberration | Custom GLSL offset sampling | `ChromaticAberrationEffect` (postprocessing 6.38.3) | Already in package; radialModulation option is aesthetically superior |
| Geometry serialization | Custom file format | Inline vertex arrays in TypeScript | 3-4 simple polygons — not worth asset pipeline complexity |
| Color persistence | Custom localStorage write | Zustand persist (already active) | selectedSkin field already in MetaStore v4 schema |

**Key insight:** Both CRT effects are in the already-installed package. Zero new dependencies or custom GLSL shaders are needed.

---

## Common Pitfalls

### Pitfall 1: Bloom Lost After CRT Pass Added to Same EffectPass
**What goes wrong:** Bloom disappears or is severely weakened when CRT effects are merged into the bloom `EffectPass`.
**Why it happens:** `SelectiveBloomEffect` uses an internal render target / layer system that doesn't compose cleanly with unrelated effects in the same pass.
**How to avoid:** Always add CRT as a **second, separate** `EffectPass` added after the bloom pass. STATE.md documents this decision explicitly.
**Warning signs:** Emissive meshes lose glow immediately after adding CRT to the bloom EffectPass.

### Pitfall 2: Geometry Dispose Crash (Null Reference)
**What goes wrong:** Calling `mesh.geometry.dispose()` when geometry is already disposed (e.g., if `applySkin()` is called twice before the render frame).
**Why it happens:** Defensive coding omission.
**How to avoid:** Guard with a check, or only call `applySkin()` once at run-start. The geometry factory is idempotent so re-calling is safe after the first disposal.
**Warning signs:** WebGL warnings about using disposed buffers, or silent geometry reset to empty.

### Pitfall 3: ScanlineEffect Density = 0 Shows No Effect
**What goes wrong:** Setting `density` to `0` when intensity slider is at zero still technically renders the effect pass (wasting GPU time) while showing nothing.
**How to avoid:** When `crtIntensity` is 0 or `crtTier` is null, skip adding the CRT pass entirely. If the user reduces intensity to near-zero, keep a minimum density (e.g., `density = max(0.5, computed)`) so there's always some visible effect once the tier is unlocked.

### Pitfall 4: Color Swatch Hover State in DOM vs. Selected State Confusion
**What goes wrong:** Player confuses the hover-highlighted color (CSS `:hover`) with the actually-selected color stored in MetaStore.
**Why it happens:** DOM UI manages its own visual state; the underlying selected state is in Zustand.
**How to avoid:** Always re-render the skin selector from `MetaStore.selectedSkin` on open (don't rely on UI component state). Use distinct border styles: `selected = solid 2px #00ffff`, `hovered = dashed 1px #ffffff`.

### Pitfall 5: CRT Pass Fails to Resize on Window Resize
**What goes wrong:** Scanlines appear at wrong frequency on window resize because the EffectPass render target wasn't resized.
**Why it happens:** `SceneManager.onResize()` calls `bloomEffect.setSize()` but not the CRT pass.
**How to avoid:** Expose a `setSize(w, h)` method on `CRTManager` and call it from `SceneManager.onResize()`. The `EffectComposer.setSize()` call in `BloomEffect.setSize()` already propagates to all passes — if CRTManager adds its pass to the same composer, no extra resize call is needed. Verify this during Plan 08-03 implementation.

### Pitfall 6: MetaStore.crtTier Read Before Phase 6 Migration
**What goes wrong:** Code reading `MetaStore.crtTier` crashes on old v3 saves not yet migrated.
**Why it happens:** Phase 6 (Plan 06-01) already ran the v3→v4 migration. This is a non-issue for v1.1 players, but worth noting.
**How to avoid:** Use optional chaining when reading: `useMetaStore.getState().crtTier ?? null`. The v4 migration already runs on first load.

---

## Code Examples

### Ship Geometry: Three Additional Shapes

```typescript
// Source: Three.js BufferGeometry docs + existing Player.ts pattern
// All shapes fit inside ±20 x ±12 bounding box (matching player AABB)

/** Delta/arrow — wide at base, sharp tip */
function makeDeltaGeometry(): BufferGeometry {
  const positions = new Float32Array([
     0,  12, 0, // 0 nose tip
    20, -12, 0, // 1 right base
     0,  -4, 0, // 2 center base notch
   -20, -12, 0, // 3 left base
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

/** Dart — narrow, elongated */
function makeDartGeometry(): BufferGeometry {
  const positions = new Float32Array([
     0,  12, 0, // 0 nose
     8,  -8, 0, // 1 right shoulder
     4, -12, 0, // 2 right wing tip
     0, -10, 0, // 3 tail center
    -4, -12, 0, // 4 left wing tip
    -8,  -8, 0, // 5 left shoulder
  ]);
  const indices = new Uint16Array([0, 1, 5, 1, 2, 3, 1, 3, 5, 3, 4, 5]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

/** Cruiser — wide, flat body */
function makeCruiserGeometry(): BufferGeometry {
  const positions = new Float32Array([
     0,  12, 0, // 0 nose
    20,   2, 0, // 1 right wing front
    20, -12, 0, // 2 right wing tip
    10, -8,  0, // 3 right inner
     0, -6,  0, // 4 tail center
   -10, -8,  0, // 5 left inner
   -20, -12, 0, // 6 left wing tip
   -20,   2, 0, // 7 left wing front
  ]);
  const indices = new Uint16Array([
    0, 1, 7,   // nose to wings
    1, 3, 4,   // right fill
    1, 2, 3,   // right wing
    4, 5, 7,   // left fill
    5, 6, 7,   // left wing
    1, 4, 7,   // center fill
  ]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}
```

### Skin Color Palette (6 colors)

```typescript
// Source: project design (neon Tokyo aesthetic — matches existing wave palette approach)
export const SKIN_COLORS: Record<string, number> = {
  'white':   0xffffff, // default
  'cyan':    0x00ffff, // legacy player color
  'magenta': 0xff00ff,
  'yellow':  0xffff00,
  'green':   0x00ff88,
  'orange':  0xff6600,
};

export const SKIN_COLOR_NAMES: Record<string, string> = {
  'white':   'GHOST',
  'cyan':    'CYBER',
  'magenta': 'NEON',
  'yellow':  'SOLAR',
  'green':   'VENOM',
  'orange':  'FIRE',
};
```

### CRTManager: Controlled Enable/Disable

```typescript
// Source: pmndrs/postprocessing wiki + verified against postprocessing 6.38.3 type defs
import { ScanlineEffect, ChromaticAberrationEffect, EffectPass, BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import type { EffectComposer } from 'postprocessing';
import type { OrthographicCamera } from 'three';

const CRT_TIER_PARAMS = {
  1: { baseDensity: 1.5, baseCA: 0.0000 },
  2: { baseDensity: 2.5, baseCA: 0.0030 },
  3: { baseDensity: 4.0, baseCA: 0.0060 },
} as const;

export class CRTManager {
  private pass: EffectPass | null = null;
  private scanline: ScanlineEffect | null = null;
  private chromatic: ChromaticAberrationEffect | null = null;
  private activeTier: 1|2|3 = 1;

  public init(
    composer: EffectComposer,
    camera: OrthographicCamera,
    tier: number | null,
    intensity: number,
  ): void {
    if (tier === null || tier < 1 || tier > 3) return;
    this.activeTier = tier as 1|2|3;
    const { baseDensity, baseCA } = CRT_TIER_PARAMS[this.activeTier];

    this.scanline = new ScanlineEffect({
      blendFunction: BlendFunction.OVERLAY,
      density: baseDensity * intensity,
    });

    const effects: (ScanlineEffect | ChromaticAberrationEffect)[] = [this.scanline];

    if (baseCA > 0) {
      const off = baseCA * intensity;
      this.chromatic = new ChromaticAberrationEffect({
        offset: new Vector2(off, off),
        radialModulation: true,
        modulationOffset: 0.15,
      });
      effects.push(this.chromatic);
    }

    this.pass = new EffectPass(camera, ...effects);
    composer.addPass(this.pass);
  }

  /** Live update — call from intensity slider onChange. Also persists to MetaStore. */
  public setIntensity(intensity: number): void {
    intensity = Math.max(0.01, Math.min(1, intensity));
    const { baseDensity, baseCA } = CRT_TIER_PARAMS[this.activeTier];
    if (this.scanline) {
      this.scanline.density = baseDensity * intensity;
    }
    if (this.chromatic) {
      const off = baseCA * intensity;
      this.chromatic.offset = new Vector2(off, off);
    }
  }

  public dispose(): void {
    this.pass?.dispose();
    this.scanline = null;
    this.chromatic = null;
    this.pass = null;
  }
}
```

### Applying Skin at Run Start (PlayingState Hook)

```typescript
// In PlayingState.applyMetaBonuses() — append after existing upgrade logic
const { selectedSkin, crtTier, crtIntensity } = useMetaStore.getState();
playerSkinManager.applySkin(ctx.player, selectedSkin.shapeId, selectedSkin.colorId);
// CRT is initialized once in Game.init(), not per-run — no action needed here
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Three.js UnrealBloomPass (built-in) | pmndrs SelectiveBloomEffect | Phase 2 (v1.0) | Already locked — never change |
| Single EffectPass for all effects | Separate EffectPass per effect group | STATE.md decision (v1.1) | CRT must be its own pass after bloom |
| Custom GLSL shaders for CRT | Built-in ScanlineEffect + ChromaticAberrationEffect | postprocessing 6.x | No custom shader code needed |

**Deprecated/outdated:**
- Three.js `Geometry` (pre-r125): replaced by `BufferGeometry`. All existing code already uses `BufferGeometry`. Do not use deprecated `Geometry` class.

---

## Open Questions

1. **Skin preview fidelity**
   - What we know: SVG polygon previews are sufficient for silhouette thumbnails
   - What's unclear: Whether the player will be satisfied with SVG previews vs. actual WebGL rendering at mini scale
   - Recommendation: Ship SVG previews for Plan 08-02; they match the aesthetic (monochrome neon), and the in-game experience is the real preview

2. **CRT on the Title/GameOver states**
   - What we know: `renderWithEffects()` is only called in `PlayingState.render()`; other states call `scene.render()` which bypasses the EffectComposer entirely
   - What's unclear: Whether CRT should apply during menus (CRT-01 says "across the entire game canvas")
   - Recommendation: Change non-playing states to call `renderWithEffects()` so CRT applies globally. This is the correct interpretation of "entire game canvas." Plan 08-03 should address this.

3. **CRT pass added dynamically vs. at init**
   - What we know: `EffectComposer.addPass()` can be called at any time; `removePass()` also exists
   - What's unclear: Whether the composer handles mid-session pass add/remove cleanly
   - Recommendation: Add CRT pass once at `Game.init()` when `crtTier !== null`. If tier is later purchased in meta shop, require meta shop close + game restart (or TitleState re-enter) to apply. This avoids dynamic pass management complexity.

---

## Validation Architecture

> nyquist_validation not set to true in config.json — skipping this section.

---

## Sources

### Primary (HIGH confidence)
- Three.js 0.183 — BufferGeometry, Mesh.geometry/material swap (mutable properties confirmed in type defs)
- postprocessing 6.38.3 — ScanlineEffect, ChromaticAberrationEffect, Effect base class (verified in node_modules type definitions and build output)
- [pmndrs/postprocessing Wiki - Custom Effects](https://github.com/pmndrs/postprocessing/wiki/Custom-Effects) — Effect subclass constructor pattern
- MetaState.ts (project source) — `selectedSkin`, `crtTier`, `crtIntensity` fields confirmed in MetaStore interface
- BloomEffect.ts (project source) — existing EffectComposer structure; second EffectPass placement confirmed
- STATE.md (project decisions) — "CRT must live in a separate EffectPass after bloom (not merged)" — locked decision

### Secondary (MEDIUM confidence)
- [ScanlineEffect API docs](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/ScanlineEffect.js~ScanlineEffect.html) — density property, constructor options
- [ChromaticAberrationEffect API docs](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/ChromaticAberrationEffect.js~ChromaticAberrationEffect.html) — offset Vector2, radialModulation
- [Three.js forum thread on geometry/material swap](https://discourse.threejs.org/t/solved-how-do-we-swap-the-geometry-and-material-of-a-mesh/963) — in-place swap pattern verified

### Tertiary (LOW confidence)
- None — all key claims verified against installed package source or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified against installed node_modules
- Architecture: HIGH — geometry swap and EffectPass chaining are well-documented Three.js/postprocessing patterns; verified against project's existing code
- Pitfalls: HIGH — bloom/CRT separation comes from locked project decision in STATE.md; geometry disposal is documented Three.js behavior; others are standard UI patterns

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable ecosystem — postprocessing 6.38.x, Three.js 0.183.x)
