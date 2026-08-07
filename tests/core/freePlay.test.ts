import { describe, expect, test } from 'vitest';
import {
  isStreakMilestone,
  settleFreeSlice,
  streakOnCorrect,
  streakOnWrong,
} from '../../src/core/freePlay';
import { defaultProgress } from '../../src/core/types';

describe('连击规则（fork 铁律：只被答错清零，退出不清）', () => {
  test('首答对 +1，bestStreak 高水位跟涨', () => {
    expect(streakOnCorrect({ streak: 0, bestStreak: 0 })).toEqual({ streak: 1, bestStreak: 1 });
    expect(streakOnCorrect({ streak: 4, bestStreak: 9 })).toEqual({ streak: 5, bestStreak: 9 });
    expect(streakOnCorrect({ streak: 9, bestStreak: 9 })).toEqual({ streak: 10, bestStreak: 10 });
  });

  test('答错清零；bestStreak 高水位不动', () => {
    expect(streakOnWrong({ streak: 7, bestStreak: 12 })).toEqual({ streak: 0, bestStreak: 12 });
  });

  test('重复清零幂等且返回原对象（调用方据此跳过落盘）', () => {
    const s = { streak: 0, bestStreak: 5 };
    expect(streakOnWrong(s)).toBe(s);
  });

  test('里程碑：5、10、20，20 后每 +10；其余不庆祝', () => {
    for (const n of [5, 10, 20, 30, 40]) expect(isStreakMilestone(n), `${n}`).toBe(true);
    for (const n of [0, 1, 4, 6, 15, 19, 21, 25]) expect(isStreakMilestone(n), `${n}`).toBe(false);
  });
});

describe('settleFreeSlice（自由练习退出结算）', () => {
  test('雷达切片：cd−1 floor 0、sessions+1、total 累计', () => {
    const p = defaultProgress();
    const radar = { ...p.radar, sessions: 2, total: 30 };
    const out = settleFreeSlice(radar, { 'L:b': { s: 2, cd: 2 }, 'L:p': { s: 1, cd: 0 } }, 7);
    expect(out.sessions).toBe(3);
    expect(out.total).toBe(37);
    expect(out.items).toEqual({ 'L:b': { s: 2, cd: 1 }, 'L:p': { s: 1, cd: 0 } });
  });

  test('发射台切片：退出保连击——streak/bestStreak 原样保留（不清零、不涨落）', () => {
    const p = defaultProgress();
    const lp = { ...p.launchpad, sessions: 1, streak: 7, bestStreak: 12, total: 20 };
    const out = settleFreeSlice(lp, { 'S:bà': { s: 3, cd: 3 } }, 5);
    expect(out.streak).toBe(7);
    expect(out.bestStreak).toBe(12);
    expect(out.sessions).toBe(2);
    expect(out.total).toBe(25);
    expect(out.items['S:bà']).toEqual({ s: 3, cd: 2 });
  });

  test('纯：不改入参切片与状态', () => {
    const p = defaultProgress();
    const lp = { ...p.launchpad, streak: 3 };
    const states = { 'S:mā': { s: 1 as const, cd: 1 } };
    settleFreeSlice(lp, states, 4);
    expect(lp.total).toBe(0);
    expect(lp.streak).toBe(3);
    expect(states['S:mā']).toEqual({ s: 1, cd: 1 });
  });

  test('零答题退出：total 不动，sessions 仍 +1（进过就是一个会话）', () => {
    const p = defaultProgress();
    const out = settleFreeSlice(p.radar, {}, 0);
    expect(out.total).toBe(0);
    expect(out.sessions).toBe(1);
  });
});
