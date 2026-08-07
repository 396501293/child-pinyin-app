import { describe, expect, test } from 'vitest';
import { KEEP_DAYS, MAX_ERRORS, dayNumber, recordAnswer, topErrors } from '../../src/core/insight';
import { defaultProgress } from '../../src/core/types';

// 本地正午：日界前后 ±数小时都落在同一「本地日」，跨时区跑测试不脆。
const NOW = new Date(2026, 7, 7, 12).getTime();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

describe('recordAnswer 日分桶', () => {
  test('首答建桶并累计 {n, ok}；同日同条目合并', () => {
    let p = defaultProgress();
    p = recordAnswer(p, 'L:b', true, undefined, NOW);
    p = recordAnswer(p, 'L:b', false, 'd', NOW + HOUR);
    p = recordAnswer(p, 'S:bà', true, undefined, NOW + 2 * HOUR);
    expect(p.insight.days).toHaveLength(1);
    const today = p.insight.days[0];
    expect(today.d).toBe(dayNumber(NOW));
    expect(today.items['L:b']).toEqual({ n: 2, ok: 1 });
    expect(today.items['S:bà']).toEqual({ n: 1, ok: 1 });
  });

  test('跨日各自成桶', () => {
    let p = defaultProgress();
    p = recordAnswer(p, 'L:b', true, undefined, NOW - DAY);
    p = recordAnswer(p, 'L:b', true, undefined, NOW);
    expect(p.insight.days).toHaveLength(2);
    expect(p.insight.days.map((b) => b.d)).toEqual([dayNumber(NOW - DAY), dayNumber(NOW)]);
  });

  test(`只保留近 ${KEEP_DAYS} 天：写入时过期桶被冲掉`, () => {
    const p = defaultProgress();
    const d = dayNumber(NOW);
    p.insight.days = [
      { d: d - KEEP_DAYS, items: { 'L:x': { n: 5, ok: 0 } } },     // 过期
      { d: d - (KEEP_DAYS - 1), items: { 'L:y': { n: 1, ok: 1 } } }, // 窗口内最老
    ];
    const q = recordAnswer(p, 'L:b', true, undefined, NOW);
    expect(q.insight.days.map((b) => b.d)).toEqual([d - (KEEP_DAYS - 1), d]);
  });

  test('纯函数：源 Progress 不被就地修改', () => {
    const p = defaultProgress();
    p.insight.days = [{ d: dayNumber(NOW), items: { 'L:b': { n: 1, ok: 1 } } }];
    const snapshot = JSON.parse(JSON.stringify(p));
    recordAnswer(p, 'L:b', false, 'd', NOW);
    expect(p).toEqual(snapshot);
  });
});

describe('错题环形缓冲', () => {
  test('答错且带 picked 才入缓冲；答对/无 picked 不入', () => {
    let p = defaultProgress();
    p = recordAnswer(p, 'L:b', true, undefined, NOW);
    p = recordAnswer(p, 'L:d', false, undefined, NOW);
    p = recordAnswer(p, 'L:p', false, 'q', NOW);
    expect(p.insight.errors).toEqual([{ item: 'L:p', picked: 'q', at: NOW }]);
  });

  test(`封顶 ${MAX_ERRORS} 条，保最新`, () => {
    let p = defaultProgress();
    for (let i = 0; i < MAX_ERRORS + 5; i++) {
      p = recordAnswer(p, `L:item${i}`, false, 'x', NOW + i);
    }
    expect(p.insight.errors).toHaveLength(MAX_ERRORS);
    expect(p.insight.errors[0].item).toBe('L:item5'); // 最老 5 条被挤出
    expect(p.insight.errors[MAX_ERRORS - 1].item).toBe(`L:item${MAX_ERRORS + 4}`);
  });
});

describe('topErrors（家长屏易错音）', () => {
  test('跨日聚合、按错误次数降序、全对不上榜、k 截断', () => {
    let p = defaultProgress();
    // L:b 错 3 次（跨两天），S:bà 错 1 次，L:p 全对
    p = recordAnswer(p, 'L:b', false, 'd', NOW - DAY);
    p = recordAnswer(p, 'L:b', false, 'd', NOW);
    p = recordAnswer(p, 'L:b', false, 'p', NOW);
    p = recordAnswer(p, 'S:bà', false, 'pà', NOW);
    p = recordAnswer(p, 'S:bà', true, undefined, NOW);
    p = recordAnswer(p, 'L:p', true, undefined, NOW);
    const top = topErrors(p, 5);
    expect(top).toEqual([
      { item: 'L:b', n: 3, wrong: 3 },
      { item: 'S:bà', n: 2, wrong: 1 },
    ]);
    expect(topErrors(p, 1)).toEqual([{ item: 'L:b', n: 3, wrong: 3 }]);
  });

  test('空进度给空榜', () => {
    expect(topErrors(defaultProgress(), 3)).toEqual([]);
  });
});
