import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../../src/core/curriculum';
import { parseSyllable } from '../../src/core/pinyin';
import { MOONS, picId } from '../../src/data/wordbank';

const PICS = join(__dirname, '..', '..', 'public', 'pics');

/** 第 1..id 课累计教过的单元（声母/韵母字母）。 */
const taughtUpTo = (id: number): Set<string> => {
  const set = new Set<string>();
  for (const lesson of LESSONS) {
    if (lesson.id > id) break;
    for (const letter of lesson.newLetters) set.add(letter);
  }
  return set;
};

/**
 * 音节 → 需要已学的单元。parseSyllable 不认 y 后省点的 u（yue/yuan/yun/yu），
 * 这里先还原成 ü 再拆：yue → y + üe，yuan → y + ü + an。
 */
function unitsOf(text: string): string[] {
  const s = parseSyllable(text);
  if (s.initial === 'y' && s.base.startsWith('yu')) {
    const rest = 'ü' + s.base.slice(2);
    if (rest === 'üe' || rest === 'ü' || rest === 'ün') return ['y', rest];
    return ['y', 'ü', rest.slice(1)]; // üan → ü + an
  }
  return [s.initial, s.medial, s.final].filter((u): u is string => !!u);
}

const hzCount = (hz: string): number => [...hz].length;

describe('wordbank', () => {
  it('第 3-13 课各一颗卫星，按课序', () => {
    expect(MOONS.map((m) => m.lesson)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  for (const moon of MOONS) {
    describe(`L${moon.lesson}`, () => {
      const taught = taughtUpTo(moon.lesson);
      const entries = [...moon.words, ...moon.sentences];

      it('每个音节只用已学单元', () => {
        for (const e of entries) {
          for (const syl of e.syl) {
            for (const u of unitsOf(syl)) {
              expect(taught.has(u), `${e.hz} 的「${syl}」用到未学的「${u}」`).toBe(true);
            }
          }
        }
      });

      it('音节 NFC、汉字数 = 音节数', () => {
        for (const e of entries) {
          for (const syl of e.syl) expect(syl).toBe(syl.normalize('NFC'));
          expect(hzCount(e.hz), e.hz).toBe(e.syl.length);
        }
      });

      it('首音节必带调（轻声只在词/句中间或末尾）', () => {
        for (const e of entries) expect(parseSyllable(e.syl[0]).tone, e.hz).not.toBe(0);
      });

      it('≥6 个双音节词、≥3 个带图、图不重复、恰 2 句', () => {
        expect(moon.words.length).toBeGreaterThanOrEqual(6);
        for (const w of moon.words) expect(w.syl.length, w.hz).toBe(2);
        expect(moon.words.filter((w) => w.pic).length).toBeGreaterThanOrEqual(3);
        expect(moon.sentences).toHaveLength(2);
      });

      it('词不重复（拼音形）', () => {
        const keys = moon.words.map((w) => w.syl.join(' '));
        expect(new Set(keys).size).toBe(keys.length);
      });
    });
  }

  // 配图：scripts/gen-pics.mjs 本地生成、产物入库。缺图时跑：
  //   AGNES_API_KEY=... node scripts/gen-pics.mjs
  const picWords = MOONS.flatMap((m) => m.words.filter((w) => w.pic));

  it('配图 picId 全局唯一、纯 ASCII 小写', () => {
    const ids = picWords.map(picId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+$/);
  });

  it('每个配图都有 public/pics/{picId}.webp', () => {
    const missing = picWords.map(picId).filter((id) => !existsSync(join(PICS, `${id}.webp`)));
    expect(missing, `缺 ${missing.length} 张图，跑 scripts/gen-pics.mjs`).toEqual([]);
  });
});
