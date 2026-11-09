// audio-script.json 的类型化只读视图 + 「课程单元 → clip id」纯查询。
// 缺失一律 throw：tests/audio/manifest.test.ts 四重守卫保证运行时永远打不中。
import audioScript from '../data/audio-script.json';
import { ALL_FINALS, ALL_INITIALS } from '../core/curriculum';
import { parseSyllable } from '../core/pinyin';
import type { Syllable, Tone } from '../core/pinyin';
import { sentenceClipId, syllableClipId, wordClipId } from '../data/wordbank';
import type { WordEntry } from '../data/wordbank';

export type ClipId = keyof typeof audioScript.clips;

export interface Clip {
  readonly say: string; // TTS 念的文本（汉字载体/台词），也是 Web Speech 降级文本
  readonly file: string; // public/audio/ 下的文件名（ü 已转 v，纯 ASCII）
  readonly candidates?: readonly string[]; // 听审候选（仅生成脚本用，运行时无关）
}

const CLIPS = audioScript.clips as Record<string, Clip>;

function ensure(id: string): ClipId {
  if (!(id in CLIPS)) throw new Error(`manifest: no clip '${id}'`);
  return id as ClipId;
}

export function clipInfo(id: ClipId): Clip {
  const clip = CLIPS[id];
  if (!clip) throw new Error(`manifest: no clip '${id}'`);
  return clip;
}

/** 可带调的 6 个裸元音（L1-2 练2 的对象；带调时走 tv-* 而非 sy-*）。 */
export const BARE_VOWELS: readonly string[] = ['a', 'o', 'e', 'i', 'u', 'ü'];

/** 带调音节 → sy-{书写形base}{调}；L1-2 的裸带调元音没有 sy-*，路由到 tv-*（同一个音）。 */
export function clipForSyllable(syl: Syllable): ClipId {
  if (syl.initial === '' && BARE_VOWELS.includes(syl.base)) {
    return clipForTonedVowel(syl.base, syl.tone);
  }
  return ensure(`sy-${syl.base}${syl.tone}`);
}

/** 声母/韵母单元 → 呼读音 clip（按 ALL_INITIALS/ALL_FINALS 归属，y/w 在声母表）。 */
export function clipForLetter(unit: string): ClipId {
  if (ALL_INITIALS.includes(unit)) return ensure(`sm-${unit}`);
  if (ALL_FINALS.includes(unit)) return ensure(`ym-${unit}`);
  throw new Error(`manifest: '${unit}' is not a taught letter unit`);
}

/** 整体认读（base 无调形，如 'ying'）→ zt-*。 */
export const clipForWholeRead = (base: string): ClipId => ensure(`zt-${base}`);

/** 带调元音（L1-2 练2：a o e i u ü × 1-4 声）→ tv-*。 */
export const clipForTonedVowel = (vowel: string, tone: Tone): ClipId =>
  ensure(`tv-${vowel}${tone}`);

/** 台词 id（须以 ln- 开头；类型化清单见 lines.ts 的 VOICE）。 */
export function clipForLine(id: string): ClipId {
  if (!id.startsWith('ln-')) throw new Error(`manifest: '${id}' is not a voice line`);
  return ensure(id);
}

// ── 词句卫星（二期）：id 推导在 data/wordbank.ts（与 sync-wordbank-audio.mjs 同源）──

/** 整词 TTS（wd-*）。 */
export const clipForWord = (w: WordEntry): ClipId => ensure(wordClipId(w));

/** 整句 TTS（st-{课}-{n}）。 */
export const clipForSentence = (lesson: number, index: number): ClipId =>
  ensure(sentenceClipId(lesson, index));

/**
 * 点读单个音节 → 人声 clip。带调音节必有（缺失 throw）；
 * 轻声只有数据集带 *5 的（ma/de/le/ne/dei）才有 clip，其余返回 null——
 * 调用方降级播所在整词/整句（README「词句卫星」口径）。
 */
export function clipForTap(syl: string): ClipId | null {
  const parsed = parseSyllable(syl);
  if (parsed.tone !== 0) return clipForSyllable(parsed);
  const id = syllableClipId(syl);
  return id in CLIPS ? (id as ClipId) : null;
}
