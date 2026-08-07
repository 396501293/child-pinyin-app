// 生成 Andika 子集字符表 src/assets/fonts/charset.txt。
// 由 subset-andika.sh 调用（node --experimental-strip-types，本地跑，CI 不碰）。
//
// 覆盖面 = 所有会用 Andika 渲染的字符：
//   1. 基础拉丁：a-z A-Z 0-9 + 基础标点（拼音语境外加保险）
//   2. 全部预组合带调元音（āáǎà…ǖǘǚǜ）+ ü Ü —— toneMark 只会产出这些码位，
//      固定集合即已「证明级」覆盖运行时拼装；
//   3. 课程表逐条推导（title/newLetters/toneSets×四声/blends/wholeRead + tv 元音），
//      与 tests/ui/charset.test.ts 的断言同源——数据变了重跑本脚本即可。
// 输出一律 NFC（pinyin.ts 全链路 NFC，见其文件头注释）。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_FINALS, ALL_INITIALS, LESSONS } from '../src/core/curriculum.ts';
import { toneMark } from '../src/core/pinyin.ts';

const TONES = [1, 2, 3, 4];
const chars = new Set();
const add = (s) => { for (const ch of s.normalize('NFC')) chars.add(ch); };

// 1) 基础拉丁 + 数字 + 基础标点
add('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
add(' !?.,:;\'"()[]/+-·…—–’‘“”ˉˊˇˋ');

// 2) 带调元音全集（固定，独立于课程数据）
for (const v of ['a', 'o', 'e', 'i', 'u', 'ü']) for (const t of TONES) add(toneMark(v, t));
add('üÜ');

// 3) 课程数据推导（含声母/韵母全表——练习干扰项可能取到任何已教单元）
add(ALL_INITIALS.join(''));
add(ALL_FINALS.join(''));
for (const l of LESSONS) {
  add(l.title);
  for (const u of l.newLetters) add(u);
  for (const base of l.toneSets) { add(base); for (const t of TONES) add(toneMark(base, t)); }
  for (const b of l.blends) add(b);
  for (const w of l.wholeRead ?? []) add(w);
}

const out = [...chars].sort().join('');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(root, 'src/assets/fonts/charset.txt'), out, 'utf8');
console.log(`   charset.txt：${chars.size} 个字符`);
