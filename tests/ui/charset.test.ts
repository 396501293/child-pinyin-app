import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ALL_FINALS, ALL_INITIALS, LESSONS } from '../../src/core/curriculum';
import { toneMark } from '../../src/core/pinyin';
import type { Tone } from '../../src/core/pinyin';

// Andika 字体（src/assets/fonts/andika-pinyin.woff2）按 charset.txt **子集化**过，
// 只含表内字形。课程数据加了新拼音字符却没重跑子集化，运行时会静默渲染成
// 豆腐块/秃调号——本测试把它变成响亮的失败。
//
// 修复方式：bash scripts/subset-andika.sh（重新生成 charset.txt + woff2）。
//
// 断言口径与 scripts/gen-charset.mjs 的生成口径同源：凡是会以 Andika 渲染的
// 字符串（课程推导的全部拼音文本）都必须 ⊂ charset.txt，且全部 NFC。

const ROOT = join(__dirname, '..', '..');
const RAW = readFileSync(join(ROOT, 'src/assets/fonts/charset.txt'), 'utf8');
const CHARSET = new Set(RAW);

const TONES: readonly Tone[] = [1, 2, 3, 4];

// 会在 Andika 语境渲染的全部字符串（GalaxyMap 课题/Learn 卡片/Practice 选项与对接段）。
function andikaStrings(): string[] {
  const out: string[] = [];
  for (const l of LESSONS) {
    out.push(l.title, ...l.newLetters, ...l.blends, ...(l.wholeRead ?? []));
    for (const base of l.toneSets) {
      out.push(base);
      for (const t of TONES) out.push(toneMark(base, t)); // 练2 四声选项 + L1-2 带调元音（tv-*）文本
    }
  }
  // 练习干扰项可取到任何已教声母/韵母（confusables 兜底池 = 全表）
  out.push(...ALL_INITIALS, ...ALL_FINALS);
  return out;
}

test('课程推导的全部拼音文本 ⊂ 字体子集', () => {
  const missing = new Map<string, string>(); // 字符 → 首个出现的字符串
  for (const s of andikaStrings()) {
    for (const ch of s) {
      if (!CHARSET.has(ch) && !missing.has(ch)) missing.set(ch, s);
    }
  }
  const detail = [...missing].map(([c, s]) => `'${c}'（${s}）`).join(' ');
  expect(missing.size, `字体子集缺 ${missing.size} 个字符，重跑 scripts/subset-andika.sh：${detail}`).toBe(0);
});

test('带调元音字面全集恒 ⊂ 字体子集（独立于课程数据的底线）', () => {
  for (const ch of 'āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü') {
    expect(CHARSET.has(ch), `带调元音「${ch}」不在字体子集里`).toBe(true);
  }
});

test('基础拉丁与数字 ⊂ 字体子集', () => {
  for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    expect(CHARSET.has(ch), `「${ch}」不在字体子集里`).toBe(true);
  }
});

describe('NFC 守卫（NFD 组合调号会绕过子集检查后渲染成秃调号）', () => {
  test('charset.txt 本身是 NFC', () => {
    expect(RAW.normalize('NFC')).toBe(RAW);
  });
  test('全部 Andika 语境字符串是 NFC', () => {
    for (const s of andikaStrings()) {
      expect(s.normalize('NFC'), `'${s}' 不是 NFC`).toBe(s);
    }
  });
});
