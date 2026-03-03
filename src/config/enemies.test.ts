/**
 * Tests for enemies config — all six EnemyType values and their ENEMY_DEFS entries.
 */
import { describe, it, expect } from 'vitest';
import { ENEMY_DEFS, type EnemyType } from './enemies';

const ALL_TYPES: EnemyType[] = ['grunt', 'shielder', 'flanker', 'sniper', 'charger', 'swooper'];

describe('ENEMY_DEFS — completeness', () => {
  it('has entries for all 6 EnemyType values', () => {
    for (const t of ALL_TYPES) {
      expect(ENEMY_DEFS[t], `Missing entry for "${t}"`).toBeDefined();
    }
  });

  it('every entry has required numeric fields', () => {
    for (const t of ALL_TYPES) {
      const def = ENEMY_DEFS[t];
      expect(typeof def.hp).toBe('number');
      expect(typeof def.scoreValue).toBe('number');
      expect(typeof def.halfWidth).toBe('number');
      expect(typeof def.halfHeight).toBe('number');
      expect(typeof def.meshWidth).toBe('number');
      expect(typeof def.meshHeight).toBe('number');
      expect(typeof def.dropChance).toBe('number');
      expect(typeof def.sidDropAmount).toBe('number');
    }
  });
});

describe('ENEMY_DEFS — shieldHp optional field', () => {
  it('shieldHp is defined for shielder', () => {
    expect(ENEMY_DEFS.shielder.shieldHp).toBeDefined();
    expect(ENEMY_DEFS.shielder.shieldHp).toBeGreaterThan(0);
  });

  it('shieldHp is NOT defined for other types', () => {
    const nonShielders: EnemyType[] = ['grunt', 'flanker', 'sniper', 'charger', 'swooper'];
    for (const t of nonShielders) {
      expect(ENEMY_DEFS[t].shieldHp, `${t} should not have shieldHp`).toBeUndefined();
    }
  });
});

describe('ENEMY_DEFS — grunt values', () => {
  it('grunt has hp=1, score=10, dropChance=0.05, sidDropAmount=5', () => {
    const grunt = ENEMY_DEFS.grunt;
    expect(grunt.hp).toBe(1);
    expect(grunt.scoreValue).toBe(10);
    expect(grunt.dropChance).toBe(0.05);
    expect(grunt.sidDropAmount).toBe(5);
  });
});

describe('ENEMY_DEFS — shielder values', () => {
  it('shielder has hp=1, shieldHp=2, score=25, dropChance=0.12, sidDropAmount=15', () => {
    const def = ENEMY_DEFS.shielder;
    expect(def.hp).toBe(1);
    expect(def.shieldHp).toBe(2);
    expect(def.scoreValue).toBe(25);
    expect(def.dropChance).toBe(0.12);
    expect(def.sidDropAmount).toBe(15);
  });
});

describe('ENEMY_DEFS — charger values', () => {
  it('charger has hp=2 (multi-hit)', () => {
    expect(ENEMY_DEFS.charger.hp).toBe(2);
    expect(ENEMY_DEFS.charger.scoreValue).toBe(35);
  });
});
