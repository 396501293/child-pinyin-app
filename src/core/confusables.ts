// 易混单元表 + 干扰项挑选。表中每个键/值都必须是真实课程单元（测试强制）。
import { ALL_FINALS, ALL_INITIALS } from './curriculum';
import { shuffle } from './rand';
import type { Rng } from './types';

// 形近（b/d/p/q）、音近（n/l、平翘舌、前后鼻音）混淆对。
export const CONFUSABLE: Readonly<Record<string, readonly string[]>> = {
  b: ['d', 'p'], d: ['b', 'q'], p: ['q', 'b'], q: ['p', 'd'],
  n: ['l'], l: ['n'], f: ['t'], t: ['f'],
  z: ['zh'], zh: ['z'], c: ['ch'], ch: ['c'], s: ['sh'], sh: ['s'],
  o: ['e'], e: ['o'], u: ['ü'], 'ü': ['u'],
  ei: ['ie'], ie: ['ei'], ui: ['iu'], iu: ['ui'], ao: ['ou'], ou: ['ao'],
  an: ['ang'], ang: ['an'], en: ['eng'], eng: ['en'], in: ['ing'], ing: ['in'],
  un: ['ün'], 'ün': ['un'],
};

const ALL_UNITS = [...ALL_INITIALS, ...ALL_FINALS];
const UNIT_SET = new Set(ALL_UNITS);

/**
 * 挑 count 个干扰项：先取答案的易混单元，不够再从课内池补，仍不够从 fallback 池补
 * （缺省全部单元；调用方可传 ALL_INITIALS/ALL_FINALS 之类的类别池，从构造上保证
 * 干扰项不跨类——拼读对接的声母/韵母段用此参数）。
 * 保证：不含答案、互不重复、恰好 count 个。
 */
export function pickDistractors(
  answer: string,
  lessonPool: readonly string[],
  rng: Rng,
  count = 2,
  fallback: readonly string[] = ALL_UNITS,
): string[] {
  const picks: string[] = [];
  const take = (candidates: readonly string[]) => {
    for (const c of shuffle([...candidates], rng)) {
      if (picks.length >= count) return;
      if (c !== answer && !picks.includes(c) && UNIT_SET.has(c)) picks.push(c);
    }
  };
  take(CONFUSABLE[answer] ?? []);
  take(lessonPool);
  take(fallback);
  if (picks.length < count) {
    throw new Error(`pickDistractors: cannot find ${count} distractors for '${answer}'`);
  }
  return picks;
}
