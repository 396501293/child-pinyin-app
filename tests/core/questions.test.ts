// 出题器种子化性质测试（仿数学夜航 generator.test.ts）：
// 每课 × 每练 × 500 seeds 全遍历。热路径用 check() 抛错替代逐条 expect（数百万断言会拖爆用时）。
import { describe, expect, test } from 'vitest';
import { clipInfo } from '../../src/audio/manifest';
import type { ClipId } from '../../src/audio/manifest';
import { CONFUSABLE } from '../../src/core/confusables';
import { ALL_FINALS, ALL_INITIALS, LESSONS, STATIONS } from '../../src/core/curriculum';
import { letterKey, syllableKey } from '../../src/core/mastery';
import { composeSyllable, toneMark } from '../../src/core/pinyin';
import type { Tone } from '../../src/core/pinyin';
import {
  buildLaunchpadQuestion,
  buildPractice,
  buildRadarQuestion,
  buildStation,
  questionItem,
  taughtUpTo,
} from '../../src/core/questions';
import type { Question } from '../../src/core/questions';
import type { FactState } from '../../src/core/types';
import { seeded } from './helpers';

const SEEDS = 500;
const TONES: readonly Tone[] = [1, 2, 3, 4];

function check(cond: unknown, msg: () => string): asserts cond {
  if (!cond) throw new Error(msg());
}

const distinct = (xs: readonly string[]) => new Set(xs).size === xs.length;
const containsOnce = (xs: readonly string[], x: string) => xs.filter((v) => v === x).length === 1;

// 有易混项时干扰位必须优先被易混项占满（pickDistractors 的承诺）。
function checkConfusablePreferred(answer: string, options: string[], ctx: string): void {
  const conf = CONFUSABLE[answer];
  if (!conf) return;
  const want = Math.min(2, conf.length);
  const got = conf.filter((c) => options.includes(c)).length;
  check(got >= want, () => `${ctx}: '${answer}' 易混项应占 ${want} 个干扰位，实得 ${got}（${options}）`);
}

// 单题通用不变量：clip 可解析、选项数/互异/答案恰现一次、类别纯净、拼读段可合成。
function checkQuestion(q: Question, ctx: string): void {
  clipInfo(q.clip as ClipId); // 缺失即 throw
  if (q.kind === 'listen-pick') {
    check(q.options.length === 3, () => `${ctx}: listen-pick 应 3 项，得 ${q.options.length}`);
    check(distinct(q.options), () => `${ctx}: 选项重复 ${q.options}`);
    check(containsOnce(q.options, q.answer), () => `${ctx}: 答案未恰好出现一次 ${q.options}`);
    checkConfusablePreferred(q.answer, q.options, ctx);
    return;
  }
  if (q.kind === 'tone-pick') {
    check(q.options.length === 4, () => `${ctx}: tone-pick 应 4 项，得 ${q.options.length}`);
    check(distinct(q.options), () => `${ctx}: 选项重复 ${q.options}`);
    check(containsOnce(q.options, q.answer), () => `${ctx}: 答案未恰好出现一次 ${q.options}`);
    const expected = new Set(TONES.map((t) => toneMark(q.base, t)));
    check(q.options.every((o) => expected.has(o)), () => `${ctx}: 选项须是 '${q.base}' 的 4 个带调形，得 ${q.options}`);
    return;
  }
  const roles = q.stages.map((s) => s.role).join(',');
  const wanted = [
    ...(q.target.initial !== '' ? ['initial'] : []),
    ...(q.target.medial !== undefined ? ['medial'] : []),
    'final',
  ].join(',');
  check(roles === wanted, () => `${ctx}: '${q.target.text}' 段序应 ${wanted}，得 ${roles}`);
  for (const st of q.stages) {
    check(st.options.length === 3, () => `${ctx}: ${st.role} 段应 3 项，得 ${st.options.length}`);
    check(distinct(st.options), () => `${ctx}: ${st.role} 段选项重复 ${st.options}`);
    check(containsOnce(st.options, st.answer), () => `${ctx}: ${st.role} 段答案未恰好出现一次`);
    if (st.role === 'initial') {
      check(st.options.every((o) => ALL_INITIALS.includes(o)), () => `${ctx}: 声母段混入非声母 ${st.options}`);
      checkConfusablePreferred(st.answer, st.options, `${ctx} 声母段`);
    } else if (st.role === 'medial') {
      check(st.options.every((o) => o === 'i' || o === 'u' || o === 'ü'), () => `${ctx}: 介母段越界 ${st.options}`);
    } else {
      check(st.options.every((o) => ALL_FINALS.includes(o)), () => `${ctx}: 韵母段混入非韵母 ${st.options}`);
      checkConfusablePreferred(st.answer, st.options, `${ctx} 韵母段`);
    }
  }
  const init = q.stages.find((s) => s.role === 'initial')?.answer ?? '';
  const med = q.stages.find((s) => s.role === 'medial')?.answer as 'i' | 'u' | 'ü' | undefined;
  const fin = q.stages.find((s) => s.role === 'final')?.answer ?? '';
  check(
    composeSyllable(init, med ?? '', fin, q.target.tone).text === q.target.text,
    () => `${ctx}: 段答案 ${init}+${med ?? ''}+${fin} 拼不回 '${q.target.text}'`,
  );
}

describe('buildPractice 性质：每课 × 每练 × 500 seeds', () => {
  for (const lesson of LESSONS) {
    test(`L${lesson.id}「${lesson.title}」`, () => {
      for (let s = 1; s <= SEEDS; s++) {
        // 练1：每个新字母 ×2，全 listen-pick
        const p1 = buildPractice(lesson, 1, seeded(s));
        check(p1.length === lesson.newLetters.length * 2, () => `L${lesson.id} 练1 题数 ${p1.length}`);
        const counts = new Map<string, number>();
        for (const q of p1) {
          check(q.kind === 'listen-pick', () => `L${lesson.id} 练1 出了 ${q.kind}`);
          checkQuestion(q, `L${lesson.id} 练1 seed${s}`);
          counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
        }
        for (const u of lesson.newLetters)
          check(counts.get(u) === 2, () => `L${lesson.id} 练1 '${u}' 应出 2 次，得 ${counts.get(u)}`);

        // 练2：每个底座 × 4 声，全 tone-pick，答案互异
        const p2 = buildPractice(lesson, 2, seeded(s * 31 + 1));
        check(p2.length === lesson.toneSets.length * 4, () => `L${lesson.id} 练2 题数 ${p2.length}`);
        const seenTone = new Set<string>();
        for (const q of p2) {
          check(q.kind === 'tone-pick', () => `L${lesson.id} 练2 出了 ${q.kind}`);
          checkQuestion(q, `L${lesson.id} 练2 seed${s}`);
          check(lesson.toneSets.includes(q.base), () => `L${lesson.id} 练2 底座越界 '${q.base}'`);
          check(!seenTone.has(q.answer), () => `L${lesson.id} 练2 重复 '${q.answer}'`);
          seenTone.add(q.answer);
        }

        // 练3：有 blends → 每个拼读目标恰一次；L1-2 → 带调元音混合认读（tv-*）
        const p3 = buildPractice(lesson, 3, seeded(s * 77 + 2));
        if (lesson.blends.length === 0) {
          check(p3.length === lesson.toneSets.length * 4, () => `L${lesson.id} 练3 题数 ${p3.length}`);
          const seenTv = new Set<string>();
          for (const q of p3) {
            check(q.kind === 'listen-pick', () => `L${lesson.id} 练3 应为带调认读，出了 ${q.kind}`);
            check(q.clip.startsWith('tv-'), () => `L${lesson.id} 练3 clip 应走 tv-*，得 ${q.clip}`);
            checkQuestion(q, `L${lesson.id} 练3 seed${s}`);
            check(!seenTv.has(q.answer), () => `L${lesson.id} 练3 重复 '${q.answer}'`);
            seenTv.add(q.answer);
          }
        } else {
          check(p3.length === lesson.blends.length, () => `L${lesson.id} 练3 题数 ${p3.length}`);
          const targets: string[] = [];
          for (const q of p3) {
            check(q.kind === 'blend', () => `L${lesson.id} 练3 出了 ${q.kind}`);
            checkQuestion(q, `L${lesson.id} 练3 seed${s}`);
            targets.push(q.target.text);
          }
          check(
            distinct(targets) && lesson.blends.every((b) => targets.includes(b)),
            () => `L${lesson.id} 练3 目标应恰为课程 blends，得 ${targets}`,
          );
        }
      }
      expect(SEEDS).toBe(500); // 循环体内全用 check()，此处仅锚定测试已跑完
    });
  }
});

describe('buildStation：只出覆盖课程的内容', () => {
  for (const station of STATIONS) {
    test(`${station.id} × 500 seeds`, () => {
      const lessons = station.coversLessons.map((id) => LESSONS[id - 1]);
      const letters = new Set(lessons.flatMap((l) => l.newLetters));
      const bases = new Set(lessons.flatMap((l) => l.toneSets));
      const blends = new Set(lessons.flatMap((l) => l.blends));
      for (let s = 1; s <= SEEDS; s++) {
        const qs = buildStation(station, seeded(s));
        check(qs.length === 10, () => `${station.id} 题数 ${qs.length}`);
        let listen = 0, tone = 0, blend = 0;
        for (const q of qs) {
          checkQuestion(q, `${station.id} seed${s}`);
          if (q.kind === 'listen-pick') { listen++; check(letters.has(q.answer), () => `${station.id} 听辨越界 '${q.answer}'`); }
          else if (q.kind === 'tone-pick') { tone++; check(bases.has(q.base), () => `${station.id} 四声越界 '${q.base}'`); }
          else { blend++; check(blends.has(q.target.text), () => `${station.id} 拼读越界 '${q.target.text}'`); }
        }
        check(listen === 3 && tone === 3 && blend === 4, () => `${station.id} 配比 ${listen}/${tone}/${blend}`);
      }
      expect(SEEDS).toBe(500);
    });
  }
});

describe('自由练习单题（掌握度加权）', () => {
  const radarPool = [1, 2, 3].flatMap((id) => LESSONS[id - 1].newLetters.map(letterKey));
  const launchPool = [3, 4, 5].flatMap((id) => LESSONS[id - 1].blends.map(syllableKey));

  test('buildRadarQuestion：答案来自池、不变量成立（500 seeds）', () => {
    for (let s = 1; s <= SEEDS; s++) {
      const q = buildRadarQuestion(radarPool, {}, seeded(s));
      checkQuestion(q, `radar seed${s}`);
      check(radarPool.includes(letterKey(q.answer)), () => `radar 答案越池 '${q.answer}'`);
    }
    expect(SEEDS).toBe(500);
  });

  test('buildLaunchpadQuestion：目标来自池、不变量成立（500 seeds）', () => {
    for (let s = 1; s <= SEEDS; s++) {
      const q = buildLaunchpadQuestion(launchPool, {}, seeded(s));
      checkQuestion(q, `launchpad seed${s}`);
      check(launchPool.includes(syllableKey(q.target.text)), () => `launchpad 目标越池 '${q.target.text}'`);
    }
    expect(SEEDS).toBe(500);
  });

  test('雷达抽样偏向弱项（s1 vs 一片未到期 s3）', () => {
    const states: Record<string, FactState> = {};
    for (const k of radarPool) states[k] = { s: 3, cd: 3 };
    states[letterKey('b')] = { s: 1, cd: 0 };
    const rng = seeded(5);
    let hits = 0;
    for (let n = 0; n < 2000; n++) if (buildRadarQuestion(radarPool, states, rng).answer === 'b') hits++;
    expect(hits / 2000).toBeGreaterThan(0.3); // 均匀抽样是 1/12≈0.08，加权期望 ≈0.55
  });
});

describe('questionItem：埋点/掌握度条目 key', () => {
  test('听辨字母 → L:*；带调内容 → S:*', () => {
    const l3 = LESSONS[2];
    const p1 = buildPractice(l3, 1, seeded(1))[0];
    expect(questionItem(p1)).toBe(letterKey(p1.kind === 'listen-pick' ? p1.answer : ''));
    const p2 = buildPractice(l3, 2, seeded(1))[0];
    expect(questionItem(p2).startsWith('S:')).toBe(true);
    const p3 = buildPractice(l3, 3, seeded(1))[0];
    expect(p3.kind).toBe('blend');
    if (p3.kind === 'blend') expect(questionItem(p3)).toBe(syllableKey(p3.target.text));
    const tv = buildPractice(LESSONS[0], 3, seeded(1))[0]; // L1 带调元音认读：ǎ 不是字母单元
    expect(questionItem(tv).startsWith('S:')).toBe(true);
  });
});

describe('taughtUpTo（累计已教单元，边界 fixture）', () => {
  test('L3：声母恰为 y,w,b,p,m,f；韵母恰为 6 个单韵母', () => {
    expect(taughtUpTo(3)).toEqual({
      initials: ['y', 'w', 'b', 'p', 'm', 'f'],
      finals: ['a', 'o', 'e', 'i', 'u', 'ü'],
    });
  });

  test('L8 收齐全部 23 个声母；L9 起才见复韵母', () => {
    expect(taughtUpTo(8).initials).toHaveLength(23);
    expect(new Set(taughtUpTo(8).initials)).toEqual(new Set(ALL_INITIALS));
    expect(taughtUpTo(8).finals).toEqual(['a', 'o', 'e', 'i', 'u', 'ü']);
    expect(taughtUpTo(9).finals).toEqual(['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui']);
  });

  test('L13 收齐全部 24 个韵母', () => {
    expect(new Set(taughtUpTo(13).finals)).toEqual(new Set(ALL_FINALS));
    expect(taughtUpTo(13).initials).toHaveLength(23);
  });
});
