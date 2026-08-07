// 拼音正字法模型：标调、拼合、反解析。纯正字法规则，不含课程表知识。
// 所有输出一律 NFC（预组合码位），防止字体 subset 漏掉组合符导致的「秃调号」。

export type Tone = 0 | 1 | 2 | 3 | 4; // 0 = 呼读音/citation（不标调）

export interface Syllable {
  initial: string;          // 'b'|'zh'|…|''（零声母）
  medial?: 'i' | 'u' | 'ü'; // 三拼介母 only
  final: string;            // 'a'|'ai'|'üan'|…
  tone: Tone;
  text: string;             // NFC 显示形 'bà' 'guā' 'lǜ'
  base: string;             // 无调形 'ba' 'gua' 'lü'
}

// 6 个可标调元音 × 1-4 声的预组合码位。
const TONED: Record<string, [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

// 反查表：带调元音 → { 无调元音, 调号 }。
const UNTONED = new Map<string, { vowel: string; tone: Tone }>();
for (const [vowel, forms] of Object.entries(TONED)) {
  forms.forEach((toned, i) => UNTONED.set(toned, { vowel, tone: (i + 1) as Tone }));
}

const VOWELS = new Set(['a', 'o', 'e', 'i', 'u', 'ü']);

/** 标调位置：a > o > e；否则标 i/u/ü 中最靠后者（iu 标 u、ui 标 i）。 */
const markIndex = (base: string): number => {
  for (const priority of ['a', 'o', 'e']) {
    const i = base.indexOf(priority);
    if (i >= 0) return i;
  }
  for (let i = base.length - 1; i >= 0; i--) {
    if (base[i] === 'i' || base[i] === 'u' || base[i] === 'ü') return i;
  }
  throw new Error(`toneMark: no vowel in '${base}'`);
};

export function toneMark(base: string, tone: Tone): string {
  if (tone === 0) return base;
  const i = markIndex(base);
  return base.slice(0, i) + TONED[base[i]][tone - 1] + base.slice(i + 1);
}

const DEDOT_INITIALS = new Set(['j', 'q', 'x']);

export function composeSyllable(
  initial: string,
  medial: '' | 'i' | 'u' | 'ü' | undefined,
  final: string,
  tone: Tone,
): Syllable {
  if (final === '') throw new Error('composeSyllable: empty final');
  const m = medial === '' ? undefined : medial;
  // 先归一化到 NFC，避免 NFD 形式的 ü（u + 组合分音符）漏过下面的去点正则。
  let written = ((m ?? '') + final).normalize('NFC');
  // 拼写规则：j/q/x 后的 ü 行省写两点（ju qu xu / jue / juan / jun）。
  if (DEDOT_INITIALS.has(initial)) written = written.replace(/ü/g, 'u');
  const base = (initial + written).normalize('NFC');
  const syllable: Syllable = { initial, final, tone, base, text: toneMark(base, tone) };
  if (m !== undefined) syllable.medial = m;
  return syllable;
}

// 声母最长匹配：两字母的 zh/ch/sh 优先于 z/c/s。
const INITIALS_BY_LENGTH = [
  'zh', 'ch', 'sh',
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w',
];

// 声母用到的全部辅音字母，由声母表推导（避免手写字符串重复失同步）。
const CONSONANT_LETTERS = new Set(INITIALS_BY_LENGTH.join(''));

// ie/üe/iu/ui 是复韵母（标准普通话），首字母虽是 i/u/ü 但不拆介母。
// iu/ui 已被「介母后必须跟 a/o/e」排除，这里只需显式排除 ie/üe。
const COMPOUND_NOT_MEDIAL = new Set(['ie', 'üe']);

/**
 * 反解析显示形（'guā' → g+u+a+1）。
 * 契约：只校验「字符合法性」（合法声母字母/元音/调号），不校验「音节合法性」——
 * 构造出的假音节（如 'zǎng'）同样能解析。仅供可信的课程数据校验与往返测试使用，
 * M3 不得拿它校验用户输入。
 */
export function parseSyllable(text: string): Syllable {
  const nfc = text.normalize('NFC');
  // 1) 去调：找带调元音，还原并记录调号。
  let tone: Tone = 0;
  let base = '';
  for (const ch of nfc) {
    const hit = UNTONED.get(ch);
    if (hit) {
      if (tone !== 0) throw new Error(`parseSyllable: multiple tone marks in '${text}'`);
      tone = hit.tone;
      base += hit.vowel;
    } else if (VOWELS.has(ch) || CONSONANT_LETTERS.has(ch)) {
      base += ch;
    } else {
      throw new Error(`parseSyllable: unexpected character '${ch}' in '${text}'`);
    }
  }
  if (base === '') throw new Error('parseSyllable: empty input');

  // 2) 声母：最长前缀匹配；匹配不到即零声母。
  const initial = INITIALS_BY_LENGTH.find((i) => base.startsWith(i) && base.length > i.length) ?? '';
  let rest = base.slice(initial.length);

  // 3) j/q/x + u 实为 ü 行：还原两点（ju→jü、jue→jüe、juan→jüan、jun→jün）。
  if (DEDOT_INITIALS.has(initial) && rest.startsWith('u')) rest = 'ü' + rest.slice(1);

  // 4) 介母：i/u/ü 紧跟另一元音（a/o/e）为三拼；ie/üe 整体是复韵母，不拆。
  let medial: Syllable['medial'];
  let final = rest;
  if (
    !COMPOUND_NOT_MEDIAL.has(rest) &&
    (rest[0] === 'i' || rest[0] === 'u' || rest[0] === 'ü') &&
    (rest[1] === 'a' || rest[1] === 'o' || rest[1] === 'e')
  ) {
    medial = rest[0] as Syllable['medial'];
    final = rest.slice(1);
  }
  if (![...final].some((ch) => VOWELS.has(ch))) {
    throw new Error(`parseSyllable: no vowel in final of '${text}'`);
  }

  const syllable: Syllable = { initial, final, tone, base, text: nfc };
  if (medial !== undefined) syllable.medial = medial;
  return syllable;
}
