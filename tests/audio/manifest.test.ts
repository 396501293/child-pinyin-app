// M2 四重守卫（全部读真实文件，不 mock）：
// (a) 课程表每处引用都能解析出 audio-script.json 里存在的 clip；
// (b) 每个 clip 的 mp3 都已提交到 public/audio/；
// (c) public/audio/ 无孤儿 mp3（每个文件恰被一个 clip 引用）；
// (d) lines.ts 的 VOICE 台词与 audio-script.json 的 ln-* 双向一致。
// 外加：sy-* 的 say 必须等于课程表载字（audio-script 与 curriculum 永不脱钩）。
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import audioScript from '../../src/data/audio-script.json';
import { LESSONS } from '../../src/core/curriculum';
import { parseSyllable, toneMark } from '../../src/core/pinyin';
import type { Tone } from '../../src/core/pinyin';
import {
  BARE_VOWELS,
  clipForLetter,
  clipForLine,
  clipForSyllable,
  clipForTonedVowel,
  clipForWholeRead,
  clipInfo,
} from '../../src/audio/manifest';
import type { ClipId } from '../../src/audio/manifest';
import { VOICE } from '../../src/audio/lines';

const CLIPS: Record<string, { say: string; file: string }> = audioScript.clips;
const CLIP_IDS = new Set(Object.keys(CLIPS));
const AUDIO_DIR = join(__dirname, '..', '..', 'public', 'audio');
const TONES: readonly Tone[] = [1, 2, 3, 4];

describe('guard (a): every curriculum reference resolves to a clip', () => {
  it('newLetters resolve via clipForLetter', () => {
    for (const lesson of LESSONS) {
      for (const unit of lesson.newLetters) {
        expect(CLIP_IDS.has(clipForLetter(unit)), `${unit}`).toBe(true);
      }
    }
  });

  it('toneSets × 4 tones resolve via clipForSyllable (L1-2 bare vowels route to tv-*)', () => {
    for (const lesson of LESSONS) {
      for (const base of lesson.toneSets) {
        for (const tone of TONES) {
          const id = clipForSyllable(parseSyllable(toneMark(base, tone)));
          expect(CLIP_IDS.has(id), `${base}${tone} -> ${id}`).toBe(true);
        }
      }
    }
  });

  it('blends resolve via clipForSyllable', () => {
    for (const lesson of LESSONS) {
      for (const blend of lesson.blends) {
        const id = clipForSyllable(parseSyllable(blend));
        expect(CLIP_IDS.has(id), `${blend} -> ${id}`).toBe(true);
      }
    }
  });

  it('wholeRead resolve via clipForWholeRead', () => {
    for (const lesson of LESSONS) {
      for (const base of lesson.wholeRead ?? []) {
        expect(CLIP_IDS.has(clipForWholeRead(base)), base).toBe(true);
      }
    }
  });

  it('L1-2 vowels × 4 tones resolve via clipForTonedVowel', () => {
    for (const vowel of BARE_VOWELS) {
      for (const tone of TONES) {
        expect(CLIP_IDS.has(clipForTonedVowel(vowel, tone)), `${vowel}${tone}`).toBe(true);
      }
    }
  });

  it("sy-* say matches the curriculum's carrier chars (数据永不脱钩)", () => {
    for (const lesson of LESSONS) {
      lesson.toneSets.forEach((base, i) => {
        const carriers = lesson.toneSetCarriers?.[i];
        if (!carriers) return; // L1-2：无载字，音频走 tv-*
        [...carriers].forEach((ch, t) => {
          const id = clipForSyllable(parseSyllable(toneMark(base, (t + 1) as Tone)));
          expect(clipInfo(id).say, id).toBe(ch);
        });
      });
      lesson.blends.forEach((blend, i) => {
        const id = clipForSyllable(parseSyllable(blend));
        expect(clipInfo(id).say, id).toBe(lesson.blendCarriers?.[i]);
      });
    }
  });
});

describe('guard (b): every clip file exists on disk', () => {
  it('all clip files are committed in public/audio/, named after their id', () => {
    for (const [id, clip] of Object.entries(CLIPS)) {
      // id↔file 对应关系锁死（ü→v 转 ASCII）：防听审改 json 时张冠李戴——
      // 若无此行，任意置换 file 字段其余守卫仍全绿。
      expect(clip.file, id).toBe(id.replace(/ü/g, 'v') + '.mp3');
      expect(existsSync(join(AUDIO_DIR, clip.file)), `${id} -> ${clip.file}`).toBe(true);
    }
  });
});

describe('guard (c): no orphan mp3 in public/audio/', () => {
  it('every mp3 on disk is referenced by exactly one clip', () => {
    const onDisk = readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3'));
    const referenced = Object.values(CLIPS).map((c) => c.file);
    expect(new Set(referenced).size).toBe(referenced.length); // 每文件至多一个 clip
    expect(new Set(onDisk)).toEqual(new Set(referenced));
  });
});

describe('guard (d): VOICE lines ⇔ audio-script ln-*', () => {
  it('every VOICE line id exists in audio-script.json', () => {
    for (const [key, id] of Object.entries(VOICE)) {
      expect(CLIP_IDS.has(id), `VOICE.${key} = ${id}`).toBe(true);
      expect(id.startsWith('ln-'), `VOICE.${key} = ${id}`).toBe(true);
    }
  });

  it('every ln-* clip is exported by VOICE (无死台词)', () => {
    const exported = new Set<string>(Object.values(VOICE));
    for (const id of CLIP_IDS) {
      if (id.startsWith('ln-')) expect(exported.has(id), id).toBe(true);
    }
  });
});

describe('manifest id mapping', () => {
  it('uses the written base in sy ids (ü 去点/保留跟随书写形)', () => {
    expect(clipForSyllable(parseSyllable('jú'))).toBe('sy-ju2'); // j+ü 书写形去点
    expect(clipForSyllable(parseSyllable('qù'))).toBe('sy-qu4');
    expect(clipForSyllable(parseSyllable('nǚ'))).toBe('sy-nü3'); // n+ü 书写形保留 ü
    expect(clipForSyllable(parseSyllable('xióng'))).toBe('sy-xiong2');
    expect(clipForSyllable(parseSyllable('èr'))).toBe('sy-er4'); // 零声母非单元音
  });

  it('routes bare toned vowels to tv-* instead of sy-*', () => {
    expect(clipForSyllable(parseSyllable('á'))).toBe('tv-a2');
    expect(clipForSyllable(parseSyllable('ǔ'))).toBe('tv-u3');
    expect(clipForSyllable(parseSyllable('ǜ'))).toBe('tv-ü4');
  });

  it('clipForLetter maps initials to sm-, finals to ym-', () => {
    expect(clipForLetter('zh')).toBe('sm-zh');
    expect(clipForLetter('y')).toBe('sm-y'); // y/w 归声母
    expect(clipForLetter('ü')).toBe('ym-ü');
    expect(clipForLetter('ong')).toBe('ym-ong');
  });

  it('clipForWholeRead / clipForTonedVowel / clipForLine map plainly', () => {
    expect(clipForWholeRead('ying')).toBe('zt-ying');
    expect(clipForTonedVowel('ü', 4)).toBe('tv-ü4');
    expect(clipForLine('ln-welcome')).toBe('ln-welcome');
  });

  it('throws on anything missing (运行时永远不该打中)', () => {
    expect(() => clipForSyllable(parseSyllable('lǜ'))).toThrow(); // 真音节但不在课程内
    expect(() => clipForSyllable(parseSyllable('ba'))).toThrow(); // tone 0 无 sy clip
    expect(() => clipForLetter('v')).toThrow();
    expect(() => clipForWholeRead('ba')).toThrow();
    expect(() => clipForTonedVowel('b', 1)).toThrow();
    expect(() => clipForTonedVowel('a', 0)).toThrow();
    expect(() => clipForLine('ln-nope')).toThrow();
    expect(() => clipForLine('sy-ba4')).toThrow(); // 非 ln- 不走台词通道
    expect(() => clipInfo('sy-nope1' as ClipId)).toThrow(); // clipInfo 同守「缺失即 throw」
  });
});
