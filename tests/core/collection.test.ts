import { describe, expect, test } from 'vitest';
import { COLLECTION, markCollectionSeen, newlyUnlocked, unlockedItems } from '../../src/core/collection';
import { defaultProgress } from '../../src/core/types';

describe('图鉴目录', () => {
  test('恰 12 个收藏品，id 唯一，字段齐全', () => {
    expect(COLLECTION).toHaveLength(12);
    expect(new Set(COLLECTION.map((c) => c.id)).size).toBe(12);
    for (const c of COLLECTION) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.icon.length).toBeGreaterThan(0);
    }
  });

  test('门槛严格递增，落在 1..123（满星）内', () => {
    for (let i = 0; i < COLLECTION.length; i++) {
      expect(COLLECTION[i].threshold).toBeGreaterThanOrEqual(1);
      expect(COLLECTION[i].threshold).toBeLessThanOrEqual(123);
      if (i > 0) expect(COLLECTION[i].threshold).toBeGreaterThan(COLLECTION[i - 1].threshold);
    }
  });
});

describe('unlockedItems（纯派生）', () => {
  test('0 星无收藏；满星全收藏；门槛边界闭合（≤）', () => {
    expect(unlockedItems(0)).toEqual([]);
    expect(unlockedItems(123)).toHaveLength(12);
    const first = COLLECTION[0];
    expect(unlockedItems(first.threshold - 1)).toEqual([]);
    expect(unlockedItems(first.threshold)).toEqual([first]);
  });

  test('派生纯：重复调用结果相同，不改目录', () => {
    const snapshot = JSON.parse(JSON.stringify(COLLECTION));
    expect(unlockedItems(50)).toEqual(unlockedItems(50));
    expect(COLLECTION).toEqual(snapshot);
  });

  test('单调：星星更多解锁不变少', () => {
    for (let s = 1; s <= 123; s++) {
      expect(unlockedItems(s).length).toBeGreaterThanOrEqual(unlockedItems(s - 1).length);
    }
  });
});

describe('newlyUnlocked（拿星后的新收藏）', () => {
  test('恰为跨过门槛的收藏品', () => {
    const p = defaultProgress();
    const [a, b] = COLLECTION;
    expect(newlyUnlocked(p, a.threshold - 1, b.threshold)).toEqual([a, b]);
    expect(newlyUnlocked(p, a.threshold, b.threshold - 1)).toEqual([]);
    expect(newlyUnlocked(p, 0, 0)).toEqual([]);
  });

  test('已看过的（collectionSeen）不再重复弹', () => {
    const p = defaultProgress();
    p.collectionSeen = [COLLECTION[0].id];
    expect(newlyUnlocked(p, 0, COLLECTION[1].threshold)).toEqual([COLLECTION[1]]);
  });
});

describe('markCollectionSeen（图鉴到访记账）', () => {
  test('新增未看过的 id，保留已有顺序', () => {
    const p = { ...defaultProgress(), collectionSeen: ['stardust'] };
    const out = markCollectionSeen(p, ['stardust', 'moon-bunny']);
    expect(out.collectionSeen).toEqual(['stardust', 'moon-bunny']);
  });

  test('幂等：全部已看过时返回原对象（引用相等，可跳过落盘）', () => {
    const p = { ...defaultProgress(), collectionSeen: ['stardust', 'moon-bunny'] };
    expect(markCollectionSeen(p, ['moon-bunny'])).toBe(p);
    expect(markCollectionSeen(p, [])).toBe(p);
  });

  test('纯：不改入参', () => {
    const p = { ...defaultProgress(), collectionSeen: ['stardust'] };
    markCollectionSeen(p, ['rocket-fin']);
    expect(p.collectionSeen).toEqual(['stardust']);
  });
});
