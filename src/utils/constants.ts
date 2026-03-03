// Game loop
export const FIXED_STEP = 1 / 60;          // 60Hz fixed physics update
export const MAX_DELTA = 0.2;              // Cap at 200ms to prevent spiral-of-death

// World dimensions (logical units — OrthographicCamera maps these to screen)
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;

// Object pool sizes — pre-allocated at startup
export const PLAYER_BULLET_POOL_SIZE = 64;
export const ENEMY_BULLET_POOL_SIZE = 128;
export const ENEMY_POOL_SIZE = 512;        // max instances per InstancedMesh row (5×10=50 enemies + Swooper headroom)

// Player
export const PLAYER_SPEED = 300;           // units/second
export const PLAYER_LIVES = 3;
export const PLAYER_INVINCIBILITY_DURATION = 1.5; // seconds after hit
export const PLAYER_MOVE_BOUNDS = 360;     // ±units from center horizontally

// Enemy formation
export const ENEMY_COLS = 10;
export const ENEMY_ROWS = 4;
export const ENEMY_BASE_MARCH_SPEED = 30;  // units/second
export const ENEMY_MARCH_SPEEDUP = 0.035;  // 3.5% faster per enemy destroyed
export const ENEMY_DROP_DISTANCE = 20;     // units to drop when reversing direction
export const ENEMY_FIRE_RATE = 1.5;        // shots/second across whole formation

// Bullets
export const BULLET_SPEED = 500;           // units/second (player bullets)
export const ENEMY_BULLET_SPEED = 300;     // units/second (enemy bullets)
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 16;

// HUD
export const HUD_Z = 0;                    // Z-layer for HUD elements

// LocalStorage
export const META_STORAGE_KEY = 'ssi-meta-v1';

// Lives cap (for shop upgrades)
export const MAX_LIVES_CAP = 9;

// Shop trigger interval (every N waves)
export const SHOP_TRIGGER_INTERVAL = 5;

// Currency symbols
export const GOLD_SYMBOL = 'Gold';        // In-run currency (resets each run)
export const META_CURRENCY_SYMBOL = 'SI$'; // Meta/persistent currency (accumulates across runs)
