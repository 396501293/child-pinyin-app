import { describe, expect, it } from 'vitest';
import { LESSONS } from '../../src/core/curriculum';
import type { PlanetProgress, Star } from '../../src/core/types';
import { allVisited, learnUnits, practiceLabel, practiceUnlocked } from '../../src/ui/gating';

const planet = (learned: boolean, stars: [Star, Star, Star]): PlanetProgress => ({ learned, stars });

describe('practiceUnlocked（UI 顺序 gating：学→练1→练2→练3）', () => {
  it('练1 只看 learned', () => {
    expect(practiceUnlocked(planet(false, [0, 0, 0]), 1)).toBe(false);
    expect(practiceUnlocked(planet(true, [0, 0, 0]), 1)).toBe(true);
  });

  it('练2 需练1 ≥1★（与 learned 无关——星在就该能练）', () => {
    expect(practiceUnlocked(planet(true, [0, 0, 0]), 2)).toBe(false);
    expect(practiceUnlocked(planet(false, [1, 0, 0]), 2)).toBe(true);
    expect(practiceUnlocked(planet(true, [3, 0, 0]), 2)).toBe(true);
  });

  it('练3 需练2 ≥1★', () => {
    expect(practiceUnlocked(planet(true, [3, 0, 0]), 3)).toBe(false);
    expect(practiceUnlocked(planet(true, [1, 1, 0]), 3)).toBe(true);
  });
});

describe('learnUnits / allVisited（学屏计数）', () => {
  it('单元 = 新授字母 + 整体认读（有则并入）', () => {
    const l2 = LESSONS[1]; // i u ü y w + yi wu yu
    expect(learnUnits(l2)).toEqual(['i', 'u', 'ü', 'y', 'w', 'yi', 'wu', 'yu']);
    const l1 = LESSONS[0]; // 无整体认读
    expect(learnUnits(l1)).toEqual(['a', 'o', 'e']);
  });

  it('allVisited：全点过才 true；空集不算完成（除非单元本来为空）', () => {
    const units = ['a', 'o', 'e'];
    expect(allVisited(units, new Set())).toBe(false);
    expect(allVisited(units, new Set(['a', 'o']))).toBe(false);
    expect(allVisited(units, new Set(['a', 'o', 'e']))).toBe(true);
    expect(allVisited(units, new Set(['a', 'o', 'e', 'x']))).toBe(true); // 多点无妨
  });

  it('每一课的 learnUnits 非空（学屏永远有卡可点）', () => {
    for (const l of LESSONS) expect(learnUnits(l).length).toBeGreaterThan(0);
  });
});

describe('practiceLabel（面板/结算共用的练习名）', () => {
  it('练1/练2 名称固定', () => {
    expect(practiceLabel(LESSONS[0], 1)).toBe('听一听');
    expect(practiceLabel(LESSONS[0], 2)).toBe('辨四声');
  });

  it('练3 按有无拼读目标切换：L1-2 无 blends → 认一认，L3+ → 拼一拼', () => {
    expect(practiceLabel(LESSONS[0], 3)).toBe('认一认'); // a o e
    expect(practiceLabel(LESSONS[1], 3)).toBe('认一认'); // i u ü y w
    for (const l of LESSONS.slice(2)) expect(practiceLabel(l, 3)).toBe('拼一拼');
  });
});
