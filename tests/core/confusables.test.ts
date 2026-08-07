import { describe, expect, it } from 'vitest';
import { CONFUSABLE, pickDistractors } from '../../src/core/confusables';
import { ALL_FINALS, ALL_INITIALS } from '../../src/core/curriculum';
import { seeded } from './helpers';

const UNITS = new Set([...ALL_INITIALS, ...ALL_FINALS]);

describe('CONFUSABLE', () => {
  it('every key and value is a real unit', () => {
    for (const [key, values] of Object.entries(CONFUSABLE)) {
      expect(UNITS.has(key), `key ${key}`).toBe(true);
      for (const v of values) expect(UNITS.has(v), `${key} -> ${v}`).toBe(true);
    }
  });

  it('never references itself and has no duplicate values', () => {
    for (const [key, values] of Object.entries(CONFUSABLE)) {
      expect(values).not.toContain(key);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('covers the core mix-up pairs from the design', () => {
    expect(CONFUSABLE['b']).toEqual(expect.arrayContaining(['d', 'p']));
    expect(CONFUSABLE['n']).toContain('l');
    expect(CONFUSABLE['f']).toContain('t');
    expect(CONFUSABLE['ei']).toContain('ie');
    expect(CONFUSABLE['ui']).toContain('iu');
    expect(CONFUSABLE['an']).toContain('ang');
    expect(CONFUSABLE['en']).toContain('eng');
    expect(CONFUSABLE['in']).toContain('ing');
    expect(CONFUSABLE['z']).toContain('zh');
    expect(CONFUSABLE['c']).toContain('ch');
    expect(CONFUSABLE['s']).toContain('sh');
    expect(CONFUSABLE['o']).toContain('e');
    expect(CONFUSABLE['ü']).toContain('u');
  });
});

describe('pickDistractors', () => {
  const pool = ['b', 'p', 'm', 'f', 'a', 'o', 'e', 'i', 'u', 'ü'];

  it('returns exactly `count` distinct units, never the answer (100 seeds)', () => {
    for (let s = 1; s <= 100; s++) {
      for (const count of [2, 3]) {
        const picks = pickDistractors('b', pool, seeded(s), count);
        expect(picks).toHaveLength(count);
        expect(new Set(picks).size).toBe(count);
        expect(picks).not.toContain('b');
        for (const p of picks) expect(UNITS.has(p)).toBe(true);
      }
    }
  });

  it('defaults to count 2', () => {
    expect(pickDistractors('b', pool, seeded(1))).toHaveLength(2);
  });

  it('prefers confusables of the answer when they exist', () => {
    // b 的易混 ['d','p'] 恰好 2 个：count=2 时应恒为这两个。
    for (let s = 1; s <= 50; s++) {
      const picks = pickDistractors('b', pool, seeded(s), 2);
      expect(new Set(picks)).toEqual(new Set(['d', 'p']));
    }
    // n 只有 1 个易混 l：应恒包含 l，另一个来自课内池。
    for (let s = 1; s <= 50; s++) {
      const picks = pickDistractors('n', ['b', 'p', 'm', 'f'], seeded(s), 2);
      expect(picks).toContain('l');
      const other = picks.find((p) => p !== 'l')!;
      expect(['b', 'p', 'm', 'f']).toContain(other);
    }
  });

  it('falls back to the lesson pool when the answer has no confusables', () => {
    for (let s = 1; s <= 50; s++) {
      const picks = pickDistractors('a', ['o', 'e', 'i'], seeded(s), 2);
      for (const p of picks) expect(['o', 'e', 'i']).toContain(p);
    }
  });

  it('falls back to global units when confusables + pool are not enough', () => {
    for (let s = 1; s <= 50; s++) {
      const picks = pickDistractors('a', [], seeded(s), 2);
      expect(picks).toHaveLength(2);
      expect(picks).not.toContain('a');
      expect(new Set(picks).size).toBe(2);
      for (const p of picks) expect(UNITS.has(p)).toBe(true);
    }
  });

  it('ignores the answer if it sneaks into the lesson pool', () => {
    for (let s = 1; s <= 50; s++) {
      const picks = pickDistractors('a', ['a', 'o'], seeded(s), 2);
      expect(picks).not.toContain('a');
      expect(new Set(picks).size).toBe(2);
    }
  });

  it('spreads picks across the pool over many seeds (uses the rng)', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 200; s++) {
      for (const p of pickDistractors('a', ['o', 'e', 'i', 'u', 'ü'], seeded(s), 2)) seen.add(p);
    }
    // 统计性检查：200 个种子应能覆盖池中多于 2 个不同项。
    expect(seen.size).toBeGreaterThan(2);
  });
});
