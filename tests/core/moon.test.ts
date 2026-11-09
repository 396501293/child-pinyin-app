// 词句卫星（二期）出题与会话：性质测试遍历全部 11 颗卫星 × 多种子。
import { describe, expect, it } from 'vitest';
import { clipInfo } from '../../src/audio/manifest';
import type { ClipId } from '../../src/audio/manifest';
import { LessonSession } from '../../src/core/lessonFlow';
import { nodeOfLesson } from '../../src/core/curriculum';
import { buildMoon, questionItem, wordText } from '../../src/core/questions';
import { seeded } from './helpers';
import { defaultProgress } from '../../src/core/types';
import { MOONS, picId } from '../../src/data/wordbank';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe('buildMoon', () => {
  for (const moon of MOONS) {
    it(`L${moon.lesson}：3 看图 + 3 听词（洗牌）+ 末尾 2 点读，选项合法`, () => {
      const real = new Set(moon.words.map(wordText));
      const pics = new Set(moon.words.filter((w) => w.pic).map(picId));
      for (const seed of SEEDS) {
        const qs = buildMoon(moon.lesson, seeded(seed));
        expect(qs.map((q) => q.kind).slice(-2)).toEqual(['read-along', 'read-along']);
        expect(qs.filter((q) => q.kind === 'pic-pick')).toHaveLength(3);
        expect(qs.filter((q) => q.kind === 'word-pick')).toHaveLength(3);
        for (const q of qs) {
          clipInfo(q.clip as ClipId);
          if (q.kind === 'read-along') {
            expect(q.taps).toHaveLength(q.syl.length);
            continue;
          }
          if (q.kind !== 'word-pick' && q.kind !== 'pic-pick') throw new Error(q.kind);
          expect(q.options).toHaveLength(3);
          expect(new Set(q.options).size).toBe(3);
          expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
          if (q.kind === 'pic-pick') {
            for (const o of q.options) expect(pics.has(o), o).toBe(true);
            expect(real.has(q.text)).toBe(true);
          } else {
            expect(real.has(q.answer)).toBe(true);
            // 干扰项：真词 或 只差一个声调的假词（同长、去调后与答案同形）
            for (const o of q.options) {
              if (real.has(o)) continue;
              expect(o.length, `${q.answer} vs ${o}`).toBe(q.answer.length);
              const strip = (x: string) => x.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '');
              expect(strip(o)).toBe(strip(q.answer));
            }
          }
        }
      }
    });
  }

  it('L1-2 无卫星 → throw', () => {
    expect(() => buildMoon(1, seeded(1))).toThrow();
  });
});

describe('卫星会话（LessonSession + moon meta）', () => {
  const run = (lesson: number, wrongFirst: boolean) => {
    const qs = buildMoon(lesson, seeded(7));
    const s = new LessonSession(qs, { node: nodeOfLesson(lesson), practice: 1, moon: lesson }, seeded(7));
    let first = true;
    while (!s.isDone()) {
      const q = s.current()!;
      if (q.kind !== 'read-along' && wrongFirst && first) {
        first = false;
        s.answer(false, 'x');
      }
      s.answer(true);
    }
    return s;
  };

  it('点读不进星级分母；全对 3★，写 moons 不动 planets/unlocked', () => {
    const s = run(3, false);
    expect(s.total).toBe(6);
    expect(s.starsEarned()).toBe(3);
    const p = s.commitToProgress(defaultProgress(), 1);
    expect(p.moons[3]).toBe(3);
    expect(p.planets).toEqual({});
    expect(p.unlocked).toBe(1);
  });

  it('错一题 → 5/6 → 2★；星星 max 合并；埋点只有 W: 条目', () => {
    const s = run(5, true);
    expect(s.starsEarned()).toBe(2);
    const prev = { ...defaultProgress(), moons: { 5: 3 as const } };
    const p = s.commitToProgress(prev, 1);
    expect(p.moons[5]).toBe(3);
    const items = Object.keys(p.insight.days[0].items);
    expect(items.length).toBeGreaterThan(0);
    for (const k of items) expect(k.startsWith('W:'), k).toBe(true);
  });

  it('答错的再见面题排在点读之前（点读永远收尾）', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const qs = buildMoon(6, seeded(seed));
      const s = new LessonSession(qs, { node: nodeOfLesson(6), practice: 1, moon: 6 }, seeded(seed));
      const kinds: string[] = [];
      while (!s.isDone()) {
        const q = s.current()!;
        kinds.push(q.kind);
        if (q.kind !== 'read-along') s.answer(false, 'x'); // 每题首答都错 → 每题都排再见面
        s.answer(true);
      }
      const firstRead = kinds.indexOf('read-along');
      expect(kinds.slice(firstRead), kinds.join(',')).toEqual(['read-along', 'read-along']);
      expect(kinds.length).toBe(14); // 6 计分 + 6 再见面 + 2 点读
    }
  });

  it('questionItem：两种计分题都归 W:拼音词', () => {
    for (const q of buildMoon(4, seeded(3))) {
      if (q.kind === 'read-along') continue;
      expect(questionItem(q)).toMatch(/^W:/);
    }
  });
});
