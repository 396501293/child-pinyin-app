import { describe, expect, it } from 'vitest';
import {
  ALL_FINALS,
  ALL_INITIALS,
  LESSONS,
  STATIONS,
  nodeOfLesson,
  nodeToContent,
} from '../../src/core/curriculum';
import { parseSyllable, toneMark } from '../../src/core/pinyin';
import type { Tone } from '../../src/core/pinyin';

const WHOLE_READ_16 = [
  'yi', 'wu', 'yu', 'zi', 'ci', 'si', 'zhi', 'chi', 'shi', 'ri',
  'ye', 'yue', 'yuan', 'yin', 'yun', 'ying',
];

/** 第 1..id 课累计教过的单元（声母/韵母字母，不含整体认读）。 */
const taughtUpTo = (id: number): Set<string> => {
  const set = new Set<string>();
  for (const lesson of LESSONS) {
    if (lesson.id > id) break;
    for (const letter of lesson.newLetters) set.add(letter);
  }
  return set;
};

describe('unit inventories', () => {
  it('has 23 initials and 24 finals, all unique', () => {
    expect(ALL_INITIALS).toHaveLength(23);
    expect(new Set(ALL_INITIALS).size).toBe(23);
    expect(ALL_FINALS).toHaveLength(24);
    expect(new Set(ALL_FINALS).size).toBe(24);
  });

  it('includes the standard members', () => {
    for (const i of ['b', 'zh', 'ch', 'sh', 'r', 'y', 'w']) expect(ALL_INITIALS).toContain(i);
    for (const f of ['a', 'ü', 'ai', 'ui', 'iu', 'ie', 'üe', 'er', 'ün', 'ong']) {
      expect(ALL_FINALS).toContain(f);
    }
  });

  it('parseSyllable recognizes every initial in ALL_INITIALS (两处声母表一致性)', () => {
    for (const initial of ALL_INITIALS) {
      expect(parseSyllable(toneMark(initial + 'a', 1)).initial).toBe(initial);
    }
  });
});

describe('LESSONS', () => {
  it('is exactly 13 lessons with ids 1..13 in order', () => {
    expect(LESSONS).toHaveLength(13);
    LESSONS.forEach((lesson, i) => expect(lesson.id).toBe(i + 1));
  });

  it('every newLetter is a known unit', () => {
    const known = new Set([...ALL_INITIALS, ...ALL_FINALS, 'y', 'w']);
    for (const lesson of LESSONS) {
      for (const letter of lesson.newLetters) expect(known.has(letter)).toBe(true);
    }
  });

  it('lessons 1-2 have no blends; lessons 3+ have 6-10 each', () => {
    for (const lesson of LESSONS) {
      if (lesson.id <= 2) {
        expect(lesson.blends).toEqual([]);
      } else {
        expect(lesson.blends.length).toBeGreaterThanOrEqual(6);
        expect(lesson.blends.length).toBeLessThanOrEqual(10);
      }
    }
  });

  it('every blend parses, is NFC, and round-trips its text', () => {
    for (const lesson of LESSONS) {
      for (const blend of lesson.blends) {
        expect(blend).toBe(blend.normalize('NFC'));
        const p = parseSyllable(blend);
        expect(p.text).toBe(blend);
      }
    }
  });

  it('blends use only cumulatively taught units', () => {
    for (const lesson of LESSONS) {
      const taught = taughtUpTo(lesson.id);
      for (const blend of lesson.blends) {
        const p = parseSyllable(blend);
        if (p.initial !== '') expect(taught.has(p.initial), `${blend}: initial ${p.initial}`).toBe(true);
        if (p.medial) expect(taught.has(p.medial), `${blend}: medial ${p.medial}`).toBe(true);
        expect(taught.has(p.final), `${blend}: final ${p.final}`).toBe(true);
      }
    }
  });

  it('no 整体认读 syllable appears as a blend', () => {
    for (const lesson of LESSONS) {
      for (const blend of lesson.blends) {
        expect(WHOLE_READ_16).not.toContain(parseSyllable(blend).base);
      }
    }
  });

  it('三拼 (medial) blends appear only from lesson 5 on, and lesson 5 has some', () => {
    for (const lesson of LESSONS) {
      const withMedial = lesson.blends.filter((b) => parseSyllable(b).medial !== undefined);
      if (lesson.id < 5) expect(withMedial).toEqual([]);
      if (lesson.id === 5) expect(withMedial.length).toBeGreaterThan(0);
    }
  });

  it('blends of lessons 3+ carry a real tone and spread across all 4 tones', () => {
    for (const lesson of LESSONS) {
      if (lesson.id <= 2) continue;
      const tones = new Set(lesson.blends.map((b) => parseSyllable(b).tone));
      expect(tones, `lesson ${lesson.id}`).toEqual(new Set([1, 2, 3, 4]));
    }
  });

  it('every toneSet entry produces parseable NFC output in all 4 tones', () => {
    for (const lesson of LESSONS) {
      expect(lesson.toneSets.length).toBeGreaterThan(0);
      for (const base of lesson.toneSets) {
        for (const tone of [1, 2, 3, 4] as Tone[]) {
          const text = toneMark(base, tone);
          expect(text).toBe(text.normalize('NFC'));
          const p = parseSyllable(text);
          expect(p.tone).toBe(tone);
          expect(p.base).toBe(base.normalize('NFC'));
        }
      }
    }
  });

  it('lessons 1-2 toneSets are the bare vowels of the lesson', () => {
    expect(LESSONS[0].toneSets).toEqual(['a', 'o', 'e']);
    expect(LESSONS[1].toneSets).toEqual(['i', 'u', 'ü']);
  });

  const isCJK = (ch: string): boolean => ch >= '一' && ch <= '鿿';

  it('lessons 3+ carry aligned carrier chars; lessons 1-2 carry none (音频走 tv-*)', () => {
    for (const lesson of LESSONS) {
      if (lesson.id <= 2) {
        expect(lesson.toneSetCarriers).toBeUndefined();
        expect(lesson.blendCarriers).toBeUndefined();
        continue;
      }
      // toneSetCarriers：与 toneSets 一一对齐，每项恰 4 个汉字（1-4 声载字）
      expect(lesson.toneSetCarriers, `lesson ${lesson.id}`).toBeDefined();
      expect(lesson.toneSetCarriers).toHaveLength(lesson.toneSets.length);
      for (const carriers of lesson.toneSetCarriers!) {
        expect([...carriers]).toHaveLength(4);
        for (const ch of carriers) expect(isCJK(ch), `'${ch}' in '${carriers}'`).toBe(true);
      }
      // blendCarriers：与 blends 一一对齐，每项 1 个汉字
      expect(lesson.blendCarriers, `lesson ${lesson.id}`).toBeDefined();
      expect(lesson.blendCarriers).toHaveLength(lesson.blends.length);
      for (const ch of lesson.blendCarriers!) {
        expect([...ch]).toHaveLength(1);
        expect(isCJK(ch), `'${ch}'`).toBe(true);
      }
    }
  });

  it('同一音节在全课程中的载字一致（sy-* clip 每 id 只配一次音）', () => {
    const carrierById = new Map<string, string>();
    const claim = (id: string, char: string) => {
      const prev = carrierById.get(id);
      if (prev !== undefined) expect(prev, `carrier conflict for ${id}`).toBe(char);
      carrierById.set(id, char);
    };
    for (const lesson of LESSONS) {
      lesson.toneSets.forEach((base, i) => {
        const carriers = lesson.toneSetCarriers?.[i];
        if (!carriers) return;
        [...carriers].forEach((ch, t) => claim(`${base}${t + 1}`, ch));
      });
      lesson.blends.forEach((blend, i) => {
        const ch = lesson.blendCarriers?.[i];
        if (!ch) return;
        const p = parseSyllable(blend);
        claim(`${p.base}${p.tone}`, ch);
      });
    }
  });

  it('wholeRead union across lessons is exactly the 16 整体认读', () => {
    const union = LESSONS.flatMap((lesson) => lesson.wholeRead ?? []);
    expect(union).toHaveLength(16);
    expect(new Set(union)).toEqual(new Set(WHOLE_READ_16));
  });
});

describe('STATIONS and nodeToContent', () => {
  it('stations cover lessons 1-8 and 9-13', () => {
    expect(STATIONS).toHaveLength(2);
    const [r1, r2] = STATIONS;
    expect(r1).toMatchObject({ id: 'r1', afterLesson: 8 });
    expect(r1.coversLessons).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r2).toMatchObject({ id: 'r2', afterLesson: 13 });
    expect(r2.coversLessons).toEqual([9, 10, 11, 12, 13]);
  });

  it('maps nodes 1..15 to [L1..L8, R1, L9..L13, R2]', () => {
    const expectLesson = (n: number, lessonId: number) => {
      const content = nodeToContent(n);
      expect(content.kind).toBe('lesson');
      if (content.kind === 'lesson') expect(content.lesson.id).toBe(lessonId);
    };
    for (let n = 1; n <= 8; n++) expectLesson(n, n);
    const r1 = nodeToContent(9);
    expect(r1.kind).toBe('station');
    if (r1.kind === 'station') expect(r1.station.id).toBe('r1');
    for (let n = 10; n <= 14; n++) expectLesson(n, n - 1);
    const r2 = nodeToContent(15);
    expect(r2.kind).toBe('station');
    if (r2.kind === 'station') expect(r2.station.id).toBe('r2');
  });

  it('rejects out-of-range nodes', () => {
    expect(() => nodeToContent(0)).toThrow();
    expect(() => nodeToContent(16)).toThrow();
  });

  it('nodeOfLesson：与 nodeToContent 互逆（L9-13 因 r1 错位 +1）', () => {
    for (const lesson of LESSONS) {
      const n = nodeOfLesson(lesson.id);
      const content = nodeToContent(n);
      expect(content.kind).toBe('lesson');
      if (content.kind === 'lesson') expect(content.lesson.id).toBe(lesson.id);
    }
    expect(nodeOfLesson(8)).toBe(8);
    expect(nodeOfLesson(9)).toBe(10); // 陷阱位：9 是空间站 r1
    expect(nodeOfLesson(13)).toBe(14);
  });
});
