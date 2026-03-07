import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
} from 'three';

// ---------------------------------------------------------------------------
// Ship Geometry Factories
// All shapes fit within ±20 x ±12 bounding box (AABB half-extents: w=20, h=12)
// Each factory returns a fresh BufferGeometry with position attribute + indices
// ---------------------------------------------------------------------------

/**
 * Default chevron — the original player ship.
 * 6 vertices: pointed nose, swept-back wings.
 * Matches makePlayerGeometry() in Player.ts exactly.
 */
function makeDefaultGeometry(): BufferGeometry {
  const positions = new Float32Array([
      0,  12, 0, // 0 nose tip
     20, -12, 0, // 1 right wing tip
      8,  -4, 0, // 2 right wing inner
      0,  -8, 0, // 3 center base notch
     -8,  -4, 0, // 4 left wing inner
    -20, -12, 0, // 5 left wing tip
  ]);
  // CCW fan from nose tip (viewed from +Z camera)
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(new Uint16BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Delta / arrowhead — wide at base, sharp tip.
 * 4 vertices: simple arrowhead with center base notch.
 */
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

/**
 * Dart — narrow, elongated with small swept wings.
 * 6 vertices: fine needle nose with tight wing span.
 */
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

/**
 * Cruiser — wide, flat body with long wing span.
 * 8 vertices: broad wings extending to full ±20 width.
 */
function makeCruiserGeometry(): BufferGeometry {
  const positions = new Float32Array([
     0,  12, 0, // 0 nose
    20,   2, 0, // 1 right wing front
    20, -12, 0, // 2 right wing tip
    10,  -8, 0, // 3 right inner
     0,  -6, 0, // 4 tail center
   -10,  -8, 0, // 5 left inner
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

// ---------------------------------------------------------------------------
// Public Data Records
// ---------------------------------------------------------------------------

/** Map of shapeId → geometry factory function */
export const SHIP_SHAPES: Record<string, () => BufferGeometry> = {
  'default': makeDefaultGeometry,
  'delta':   makeDeltaGeometry,
  'dart':    makeDartGeometry,
  'cruiser': makeCruiserGeometry,
};

/** Map of shapeId → display name */
export const SHIP_SHAPE_NAMES: Record<string, string> = {
  'default': 'CHEVRON',
  'delta':   'DELTA',
  'dart':    'DART',
  'cruiser': 'CRUISER',
};

/**
 * Map of colorId → hex number.
 * Neon Tokyo palette — all high-saturation / high-luminance for bloom glow.
 */
export const SKIN_COLORS: Record<string, number> = {
  'white':   0xffffff, // GHOST — default
  'cyan':    0x00ffff, // CYBER — legacy player color
  'magenta': 0xff00ff, // NEON
  'yellow':  0xffff00, // SOLAR
  'green':   0x00ff88, // VENOM
  'orange':  0xff6600, // FIRE
};

/** Map of colorId → display name */
export const SKIN_COLOR_NAMES: Record<string, string> = {
  'white':   'GHOST',
  'cyan':    'CYBER',
  'magenta': 'NEON',
  'yellow':  'SOLAR',
  'green':   'VENOM',
  'orange':  'FIRE',
};

/**
 * SVG polygon point strings for UI preview thumbnails.
 * Coordinates scaled from world units (±20, ±12) to SVG space (0-80, 0-48) with Y-flip.
 * Used in SkinShopUI card rendering — no second WebGL context needed.
 */
export const SHAPE_SVG_PATHS: Record<string, string> = {
  'default': '40,2 60,46 52,28 40,32 28,28 20,46',    // chevron
  'delta':   '40,2 62,46 40,38 18,46',                // delta/arrowhead
  'dart':    '40,0 56,46 40,34 24,46',                // narrow dart
  'cruiser': '40,4 58,46 52,22 40,36 28,22 22,46 8,36 12,12', // wide body
};

/**
 * Upgrade definitions for purchasable ship shapes.
 * The 'default' chevron is free and always owned — not listed here.
 * Used by Plan 08-02 SkinShopUI to render purchase cards and
 * by Plan 08-02 MetaShopUI extension to gate unlock by SI$ balance.
 */
export interface SkinUpgradeDef {
  shapeId: string;
  cost: number;
}

export const SKIN_UPGRADE_DEFS: SkinUpgradeDef[] = [
  { shapeId: 'delta',   cost: 25 },
  { shapeId: 'dart',    cost: 35 },
  { shapeId: 'cruiser', cost: 50 },
];
