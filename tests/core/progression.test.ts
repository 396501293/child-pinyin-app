import { describe, expect, test } from 'vitest';
import { LESSONS, STATIONS } from '../../src/core/curriculum';
import { letterKey, syllableKey } from '../../src/core/mastery';
import {
  MAX_NODE,
  launchpadPool,
  launchpadUnlocked,
  nodeState,
  planetCleared,
  planetOf,
  radarPool,
  radarUnlocked,
  starsFor,
  totalStars,
  unlockAfterClear,
} from '../../src/core/progression';
import { defaultProgress } from '../../src/core/types';
import type { Progress } from '../../src/core/types';

const cleared = (...ids: number[]): Progress => {
  const p = defaultProgress();
  for (const id of ids) p.planets[id] = { learned: true, stars: [1, 1, 1] };
  return p;
};

describe('starsFor（星级表）', () => {
  test('0 题守卫 → 0 星', () => {
    expect(starsFor(0, 0)).toBe(0);
    expect(starsFor(5, 0)).toBe(0);
  });
  test('100% → 3★；≥80% → 2★；其余 → 1★', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(8, 8)).toBe(3);
    expect(starsFor(9, 10)).toBe(2);
    expect(starsFor(8, 10)).toBe(2);  // 恰 80%
    expect(starsFor(4, 5)).toBe(2);   // 恰 80%
    expect(starsFor(7, 10)).toBe(1);
    expect(starsFor(0, 10)).toBe(1);  // 完成即有 1 星（无挫败）
    expect(starsFor(-3, 10)).toBe(1); // 负数钳制
  });
});

describe('planetOf / planetCleared', () => {
  test('未触碰星球给缺省切片', () => {
    expect(planetOf(defaultProgress(), 5)).toEqual({ learned: false, stars: [0, 0, 0] });
  });
  test('三练全 ≥1★ 才算点亮', () => {
    const p = defaultProgress();
    p.planets[3] = { learned: true, stars: [3, 3, 0] };
    expect(planetCleared(p, 3)).toBe(false);
    p.planets[3] = { learned: false, stars: [1, 1, 1] }; // learned 与点亮无关
    expect(planetCleared(p, 3)).toBe(true);
  });
});

describe('nodeState / unlockAfterClear', () => {
  test('前沿之外锁定；之内未清=available、已清=cleared', () => {
    const p = defaultProgress();
    expect(nodeState(p, 1)).toBe('available');
    expect(nodeState(p, 2)).toBe('locked');
    const q = cleared(1);
    q.unlocked = 2;
    expect(nodeState(q, 1)).toBe('cleared');
    expect(nodeState(q, 2)).toBe('available');
  });

  test('空间站节点按 stations 星数判清', () => {
    const p = defaultProgress();
    p.unlocked = 9;
    expect(nodeState(p, 9)).toBe('available');
    p.stations.r1 = 1;
    expect(nodeState(p, 9)).toBe('cleared');
  });

  test('unlock 单调不回退，封顶 15', () => {
    const p = defaultProgress();
    p.unlocked = 10;
    expect(unlockAfterClear(p, 3).unlocked).toBe(10); // 补刷旧关不回退
    expect(unlockAfterClear(p, 12).unlocked).toBe(13);
    p.unlocked = MAX_NODE;
    expect(unlockAfterClear(p, MAX_NODE).unlocked).toBe(MAX_NODE);
  });

  test('unlock 链逐节点单调（性质）', () => {
    let p = defaultProgress();
    let prev = p.unlocked;
    for (let n = 1; n <= MAX_NODE; n++) {
      p = unlockAfterClear(p, n);
      expect(p.unlocked).toBeGreaterThanOrEqual(prev);
      prev = p.unlocked;
    }
    expect(p.unlocked).toBe(MAX_NODE);
  });
});

describe('自由练习门槛与池', () => {
  test('雷达 = 点亮第 3 颗；发射台 = 点亮第 5 颗', () => {
    expect(radarUnlocked(defaultProgress())).toBe(false);
    expect(radarUnlocked(cleared(3))).toBe(true);
    expect(launchpadUnlocked(cleared(3, 4))).toBe(false);
    expect(launchpadUnlocked(cleared(5))).toBe(true);
  });

  test('未解锁时池为空（门槛与池同源）', () => {
    expect(radarPool(cleared(1, 2))).toEqual([]);      // 第 3 颗未点亮
    expect(launchpadPool(cleared(3, 4))).toEqual([]);  // 第 5 颗未点亮
  });

  test('解锁后池 = 已点亮星球的单元（L:*/S:*）', () => {
    const p = cleared(1, 2, 3);
    const pool = radarPool(p);
    expect(pool).toEqual([1, 2, 3].flatMap((id) => LESSONS[id - 1].newLetters.map(letterKey)));
    const q = cleared(1, 2, 3, 4, 5);
    expect(launchpadPool(q)).toEqual(
      [3, 4, 5].flatMap((id) => LESSONS[id - 1].blends.map(syllableKey)), // L1-2 无 blends 天然不入池
    );
  });

  test('池不含未点亮星球的内容', () => {
    const p = cleared(1, 2, 3, 5); // 4 未点亮
    for (const u of LESSONS[3].newLetters) expect(radarPool(p)).not.toContain(letterKey(u));
  });
});

describe('totalStars', () => {
  test('满进度 = 123（13×9 + 2×3）', () => {
    const p = defaultProgress();
    for (const l of LESSONS) p.planets[l.id] = { learned: true, stars: [3, 3, 3] };
    for (const s of STATIONS) p.stations[s.id] = 3;
    expect(totalStars(p)).toBe(123);
  });
  test('缺省 0；部分累加正确', () => {
    expect(totalStars(defaultProgress())).toBe(0);
    const p = defaultProgress();
    p.planets[1] = { learned: true, stars: [3, 2, 1] };
    p.stations.r1 = 2;
    expect(totalStars(p)).toBe(8);
  });
});
