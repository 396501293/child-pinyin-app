// audio-script.json 的类型化只读视图 + 「课程单元 → clip id」纯查询。
// 缺失一律 throw：tests/audio/manifest.test.ts 四重守卫保证运行时永远打不中。
import audioScript from '../data/audio-script.json';
import { ALL_FINALS, ALL_INITIALS } from '../core/curriculum';
import type { Syllable, Tone } from '../core/pinyin';

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

export const clipInfo = (id: ClipId): Clip => CLIPS[id];

const BARE_VOWELS = new Set(['a', 'o', 'e', 'i', 'u', 'ü']);

/** 带调音节 → sy-{书写形base}{调}；L1-2 的裸带调元音没有 sy-*，路由到 tv-*（同一个音）。 */
export function clipForSyllable(syl: Syllable): ClipId {
  if (syl.initial === '' && BARE_VOWELS.has(syl.base)) return clipForTonedVowel(syl.base, syl.tone);
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
