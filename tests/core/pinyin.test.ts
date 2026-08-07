import { describe, expect, it } from 'vitest';
import { composeSyllable, parseSyllable, toneMark } from '../../src/core/pinyin';
import type { Tone } from '../../src/core/pinyin';
import { LESSONS } from '../../src/core/curriculum';

const nfc = (s: string) => expect(s).toBe(s.normalize('NFC'));

describe('toneMark', () => {
  // 每个元音 × 4 声（NFC 预组合码位）。
  const TONED: Record<string, [string, string, string, string]> = {
    a: ['ā', 'á', 'ǎ', 'à'],
    o: ['ō', 'ó', 'ǒ', 'ò'],
    e: ['ē', 'é', 'ě', 'è'],
    i: ['ī', 'í', 'ǐ', 'ì'],
    u: ['ū', 'ú', 'ǔ', 'ù'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  };

  it('marks every single vowel across tones 1-4 with precomposed NFC output', () => {
    for (const [vowel, forms] of Object.entries(TONED)) {
      for (const tone of [1, 2, 3, 4] as const) {
        const out = toneMark(vowel, tone);
        expect(out).toBe(forms[tone - 1]);
        expect(out.length).toBe(1); // 预组合单码位，非「元音+组合符」
        nfc(out);
      }
    }
  });

  it('tone 0 (呼读音) leaves the base unmarked', () => {
    for (const base of ['a', 'ma', 'lü', 'shui', 'xiong']) {
      expect(toneMark(base, 0)).toBe(base);
    }
  });

  it('priority a > o > e', () => {
    expect(toneMark('hao', 3)).toBe('hǎo');
    expect(toneMark('tian', 1)).toBe('tiān');
    expect(toneMark('gua', 1)).toBe('guā');
    expect(toneMark('gou', 3)).toBe('gǒu');
    expect(toneMark('xiong', 2)).toBe('xióng');
    expect(toneMark('lei', 4)).toBe('lèi');
    expect(toneMark('gei', 3)).toBe('gěi');
  });

  it('üe marks e (e outranks ü)', () => {
    expect(toneMark('lüe', 4)).toBe('lüè');
    expect(toneMark('xue', 3)).toBe('xuě');
    expect(toneMark('yue', 4)).toBe('yuè');
  });

  it('iu marks u, ui marks i (adjacent i+u marks the latter)', () => {
    expect(toneMark('liu', 4)).toBe('liù');
    expect(toneMark('niu', 2)).toBe('niú');
    expect(toneMark('jiu', 3)).toBe('jiǔ');
    expect(toneMark('shui', 3)).toBe('shuǐ');
    expect(toneMark('dui', 4)).toBe('duì');
    expect(toneMark('gui', 1)).toBe('guī');
  });

  it('marks i/u/ü when no a/o/e present', () => {
    expect(toneMark('xin', 1)).toBe('xīn');
    expect(toneMark('jun', 1)).toBe('jūn');
    expect(toneMark('lün', 3)).toBe('lǚn'); // 构造用例：ü 在无 a/o/e 时被标
    expect(toneMark('ming', 2)).toBe('míng');
    expect(toneMark('nü', 3)).toBe('nǚ');
  });

  it('every output is NFC', () => {
    const cases: Array<[string, Tone]> = [
      ['ma', 1], ['po', 2], ['de', 3], ['di', 4], ['lu', 1], ['lü', 2],
      ['hao', 3], ['lei', 4], ['liu', 1], ['gui', 2], ['xue', 3], ['tian', 4],
    ];
    for (const [base, tone] of cases) nfc(toneMark(base, tone));
  });
});

describe('composeSyllable', () => {
  it('j/q/x + ü-row are written without dots', () => {
    expect(composeSyllable('j', undefined, 'ü', 1).text).toBe('jū');
    expect(composeSyllable('q', undefined, 'ü', 4).text).toBe('qù');
    expect(composeSyllable('x', undefined, 'ü', 1).text).toBe('xū');
    expect(composeSyllable('j', undefined, 'üe', 2).text).toBe('jué');
    expect(composeSyllable('q', undefined, 'üe', 1).text).toBe('quē');
    expect(composeSyllable('x', undefined, 'üe', 3).text).toBe('xuě');
    expect(composeSyllable('j', 'ü', 'an', 3).text).toBe('juǎn');
    expect(composeSyllable('q', 'ü', 'an', 1).text).toBe('quān');
    expect(composeSyllable('x', 'ü', 'an', 3).text).toBe('xuǎn');
    expect(composeSyllable('j', undefined, 'ün', 1).text).toBe('jūn');
    expect(composeSyllable('q', undefined, 'ün', 2).text).toBe('qún');
    expect(composeSyllable('x', undefined, 'ün', 2).text).toBe('xún');
  });

  it('keeps phonological fields while base uses the written form', () => {
    const s = composeSyllable('j', undefined, 'ü', 4);
    expect(s.initial).toBe('j');
    expect(s.medial).toBeUndefined();
    expect(s.final).toBe('ü');
    expect(s.base).toBe('ju');
    expect(s.text).toBe('jù');
    expect(s.tone).toBe(4);
  });

  it('n/l + ü keep the dots', () => {
    expect(composeSyllable('n', undefined, 'ü', 3).text).toBe('nǚ');
    expect(composeSyllable('l', undefined, 'ü', 4).text).toBe('lǜ');
    expect(composeSyllable('l', undefined, 'üe', 4).text).toBe('lüè');
    expect(composeSyllable('n', undefined, 'ü', 3).base).toBe('nü');
  });

  it('composes 三拼 with a medial', () => {
    const gua = composeSyllable('g', 'u', 'a', 1);
    expect(gua.text).toBe('guā');
    expect(gua.base).toBe('gua');
    expect(gua.medial).toBe('u');
    expect(composeSyllable('h', 'u', 'a', 1).text).toBe('huā');
    expect(composeSyllable('t', 'i', 'an', 1).text).toBe('tiān');
    expect(composeSyllable('x', 'i', 'ong', 2).text).toBe('xióng');
    expect(composeSyllable('j', 'i', 'a', 1).text).toBe('jiā');
  });

  it('tone 0 produces an unmarked text', () => {
    expect(composeSyllable('m', undefined, 'a', 0).text).toBe('ma');
  });

  it('outputs NFC text and base', () => {
    for (const s of [
      composeSyllable('l', undefined, 'ü', 4),
      composeSyllable('x', undefined, 'üe', 3),
      composeSyllable('g', 'u', 'a', 1),
    ]) {
      nfc(s.text);
      nfc(s.base);
    }
  });
});

describe('parseSyllable', () => {
  it('longest-match: zh/ch/sh win over z/c/s', () => {
    expect(parseSyllable('zhū').initial).toBe('zh');
    expect(parseSyllable('chá').initial).toBe('ch');
    expect(parseSyllable('shuǐ').initial).toBe('sh');
    expect(parseSyllable('zū').initial).toBe('z');
    expect(parseSyllable('cā').initial).toBe('c');
    expect(parseSyllable('sè').initial).toBe('s');
  });

  it('detects 三拼 medials (i/u/ü immediately before another vowel)', () => {
    expect(parseSyllable('guā')).toMatchObject({ initial: 'g', medial: 'u', final: 'a', tone: 1 });
    expect(parseSyllable('jiā')).toMatchObject({ initial: 'j', medial: 'i', final: 'a', tone: 1 });
    expect(parseSyllable('tiān')).toMatchObject({ initial: 't', medial: 'i', final: 'an', tone: 1 });
    expect(parseSyllable('xióng')).toMatchObject({ initial: 'x', medial: 'i', final: 'ong', tone: 2 });
    expect(parseSyllable('huǒ')).toMatchObject({ initial: 'h', medial: 'u', final: 'o', tone: 3 });
  });

  it('compound finals ie/üe/iu/ui are NOT split into medial+final (标准普通话：它们是复韵母)', () => {
    expect(parseSyllable('tiē')).toMatchObject({ initial: 't', final: 'ie' });
    expect(parseSyllable('tiē').medial).toBeUndefined();
    expect(parseSyllable('xuě')).toMatchObject({ initial: 'x', final: 'üe' });
    expect(parseSyllable('niú')).toMatchObject({ initial: 'n', final: 'iu' });
    expect(parseSyllable('duì')).toMatchObject({ initial: 'd', final: 'ui' });
  });

  it('j/q/x + u restores the ü-row', () => {
    expect(parseSyllable('jù')).toMatchObject({ initial: 'j', final: 'ü', tone: 4 });
    expect(parseSyllable('qù')).toMatchObject({ initial: 'q', final: 'ü', tone: 4 });
    expect(parseSyllable('xuě')).toMatchObject({ initial: 'x', final: 'üe', tone: 3 });
    expect(parseSyllable('juān')).toMatchObject({ initial: 'j', medial: 'ü', final: 'an', tone: 1 });
    expect(parseSyllable('qún')).toMatchObject({ initial: 'q', final: 'ün', tone: 2 });
  });

  it('round-trips j/q/x + ü through composeSyllable', () => {
    const composed = composeSyllable('j', undefined, 'ü', 4);
    const parsed = parseSyllable(composed.text);
    expect(parsed).toEqual(composed);
  });

  it('handles zero-initial syllables', () => {
    expect(parseSyllable('ér')).toMatchObject({ initial: '', final: 'er', tone: 2 });
    expect(parseSyllable('ā')).toMatchObject({ initial: '', final: 'a', tone: 1 });
    expect(parseSyllable('ǒ')).toMatchObject({ initial: '', final: 'o', tone: 3 });
  });

  it('unmarked text parses as tone 0', () => {
    expect(parseSyllable('ma')).toMatchObject({ initial: 'm', final: 'a', tone: 0 });
    expect(parseSyllable('lü')).toMatchObject({ initial: 'l', final: 'ü', tone: 0 });
  });

  it('y/w spellings parse at the spelling level (y/w 作声母；ü 还原仅限 j/q/x)', () => {
    // 约定：yu/yue 等零声母拼写按字面分解（y+u），不还原 ü——它们由课程数据整体给出。
    expect(parseSyllable('yǔ')).toMatchObject({ initial: 'y', final: 'u', tone: 3 });
    expect(parseSyllable('wǔ')).toMatchObject({ initial: 'w', final: 'u', tone: 3 });
    expect(parseSyllable('yáng')).toMatchObject({ initial: 'y', final: 'ang', tone: 2 });
  });

  it('normalizes NFD input to NFC', () => {
    const nfd = 'guā'.normalize('NFD');
    expect(nfd).not.toBe('guā');
    expect(parseSyllable(nfd).text).toBe('guā');
  });

  it('throws on garbage input', () => {
    expect(() => parseSyllable('xyz9')).toThrow();
    expect(() => parseSyllable('')).toThrow();
  });

  it('round-trips every curriculum blend', () => {
    for (const lesson of LESSONS) {
      for (const blend of lesson.blends) {
        const p = parseSyllable(blend);
        expect(p.text).toBe(blend);
        const recomposed = composeSyllable(p.initial, p.medial, p.final, p.tone);
        expect(recomposed.text).toBe(blend);
        expect(parseSyllable(recomposed.text)).toEqual(p);
      }
    }
  });
});
