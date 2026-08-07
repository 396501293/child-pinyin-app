import { describe, expect, test } from 'vitest';
import {
  MAX_NEW_PER_SESSION,
  S0,
  letterKey,
  masteryWeight,
  onFirstCorrect,
  onRetryCorrect,
  onWrong,
  planSession,
  stateOf,
  syllableKey,
  unitOfKey,
  weightedPick,
} from '../../src/core/mastery';
import type { FactState } from '../../src/core/types';
import { seeded } from './helpers';

describe('条目 key', () => {
  test('letter/syllable key 与 unitOfKey 往返', () => {
    expect(letterKey('b')).toBe('L:b');
    expect(letterKey('ai')).toBe('L:ai');
    expect(syllableKey('bà')).toBe('S:bà');
    expect(unitOfKey('L:ai')).toBe('ai');
    expect(unitOfKey('S:bà')).toBe('bà');
  });
});

describe('掌握度状态机（转移表）', () => {
  test('onFirstCorrect：s+1 封顶 3，cd = 新 s', () => {
    expect(onFirstCorrect({ s: 0, cd: 0 })).toEqual({ s: 1, cd: 1 });
    expect(onFirstCorrect({ s: 1, cd: 0 })).toEqual({ s: 2, cd: 2 });
    expect(onFirstCorrect({ s: 2, cd: 1 })).toEqual({ s: 3, cd: 3 });
    expect(onFirstCorrect({ s: 3, cd: 0 })).toEqual({ s: 3, cd: 3 });
  });

  test('onRetryCorrect：s 不变，cd=1（不因重试给满奖励）', () => {
    expect(onRetryCorrect({ s: 0, cd: 0 })).toEqual({ s: 0, cd: 1 });
    expect(onRetryCorrect({ s: 2, cd: 2 })).toEqual({ s: 2, cd: 1 });
    expect(onRetryCorrect({ s: 3, cd: 3 })).toEqual({ s: 3, cd: 1 });
  });

  test('onWrong：s−1 floor 0，cd=0（很快再到期）', () => {
    expect(onWrong({ s: 0, cd: 0 })).toEqual({ s: 0, cd: 0 });
    expect(onWrong({ s: 1, cd: 1 })).toEqual({ s: 0, cd: 0 });
    expect(onWrong({ s: 3, cd: 3 })).toEqual({ s: 2, cd: 0 });
  });

  test('权重次序：新 > 弱 > 到期熟 > 到期已点亮 > 未到期熟 > 未到期已点亮', () => {
    const w = (s: FactState['s'], cd: number) => masteryWeight({ s, cd });
    expect(w(0, 0)).toBeGreaterThan(w(1, 0));
    expect(w(1, 0)).toBeGreaterThan(w(2, 0));
    expect(w(2, 0)).toBeGreaterThan(w(3, 0));
    expect(w(3, 0)).toBeGreaterThan(w(2, 2));
    expect(w(2, 2)).toBeGreaterThan(w(3, 2));
  });

  test('stateOf：未记录条目返回 S0', () => {
    expect(stateOf({}, 'L:b')).toEqual(S0);
    expect(stateOf({ 'L:b': { s: 2, cd: 1 } }, 'L:b')).toEqual({ s: 2, cd: 1 });
  });
});

describe('weightedPick', () => {
  test('空池抛错', () => {
    expect(() => weightedPick([], () => 1, seeded(1))).toThrow();
  });

  test('权重为主导时高权项占多数', () => {
    const rng = seeded(7);
    let hits = 0;
    for (let n = 0; n < 2000; n++) {
      if (weightedPick(['a', 'b'], (x) => (x === 'a' ? 9 : 1), rng) === 'a') hits++;
    }
    expect(hits / 2000).toBeGreaterThan(0.8);
  });
});

describe('planSession（性质，多种子）', () => {
  const pool = ['L:a', 'L:o', 'L:e', 'L:i', 'L:u', 'L:ü', 'L:b', 'L:p', 'L:m', 'L:f'];

  test('长度恰为 size，条目全部来自池', () => {
    for (let s = 1; s <= 200; s++) {
      const plan = planSession(pool, {}, 12, seeded(s));
      expect(plan).toHaveLength(12);
      for (const k of plan) expect(pool).toContain(k);
    }
  });

  test('每会话引入的新条目 ≤ MAX_NEW_PER_SESSION', () => {
    const states: Record<string, FactState> = { 'L:a': { s: 2, cd: 0 }, 'L:o': { s: 1, cd: 0 } };
    for (let s = 1; s <= 200; s++) {
      const plan = planSession(pool, states, 12, seeded(s));
      const newOnes = new Set(plan.filter((k) => stateOf(states, k).s === 0));
      expect(newOnes.size).toBeLessThanOrEqual(MAX_NEW_PER_SESSION);
    }
  });

  test('池足够大时不与最近 3 题重复', () => {
    for (let s = 1; s <= 200; s++) {
      const plan = planSession(pool, {}, 12, seeded(s));
      for (let i = 0; i < plan.length; i++) {
        const recent = plan.slice(Math.max(0, i - 3), i);
        expect(recent).not.toContain(plan[i]);
      }
    }
  });

  test('小池（≤3 项）放宽去重仍能出满', () => {
    for (let s = 1; s <= 50; s++) {
      const plan = planSession(['L:a', 'L:o'], {}, 8, seeded(s));
      expect(plan).toHaveLength(8);
    }
  });

  test('弱项权重占优：s1 条目出现次数明显多于未到期 s3', () => {
    const states: Record<string, FactState> = {};
    for (const k of pool) states[k] = { s: 3, cd: 3 }; // 全部未到期 s3（权重 0.3）
    states['L:b'] = { s: 1, cd: 0 };                   // 唯一弱项（权重 4）
    const rng = seeded(99);
    let weak = 0;
    let total = 0;
    for (let n = 0; n < 300; n++) {
      for (const k of planSession(pool, states, 12, rng)) {
        total++;
        if (k === 'L:b') weak++;
      }
    }
    // 均匀抽样弱项占 1/10；加权后应显著超过（去重约束下仍 > 20%）
    expect(weak / total).toBeGreaterThan(0.2);
  });

  test('空池返回空', () => {
    expect(planSession([], {}, 12, seeded(1))).toEqual([]);
  });
});
