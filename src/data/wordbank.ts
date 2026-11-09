// 词句卫星（二期）词库：第 3-13 课每课一颗卫星，词 + 短句。
// 纯数据；出题在 core/questions 的 buildMoon。
//
// 数据约束（tests/core/wordbank.test.ts 强制）：
// - syl 每项一个音节（NFC）；轻声写无调形（'ba'），其余必须带调号；
// - 每个音节的声母/介母/韵母都在截至本课累计教过的单元里（整体认读按引入课算）；
// - hz 字数 = 音节数（不含标点，句末标点由 UI 补）；
// - 词一律双音节（听词选拼音的干扰项要求同长）；每课 ≥6 词、≥3 个带 pic、恰 2 句；
// - 带 pic 的词全局 picId 唯一，且 public/pics/ 下有对应图片。

export interface WordEntry {
  readonly syl: readonly string[];
  readonly hz: string;
  // 生图提示词（英文，scripts/gen-pics.mjs 读取）；图片 = public/pics/{picId}.webp。
  // 无 pic 的词只出「听词选拼音」。
  readonly pic?: string;
}

export interface SentenceEntry {
  readonly syl: readonly string[];
  readonly hz: string;
}

export interface Moon {
  readonly lesson: number; // 3..13，与 LESSONS[].id 对齐
  readonly words: readonly WordEntry[];
  readonly sentences: readonly SentenceEntry[];
}

export const MOONS: ReadonlyArray<Moon> = [
  {
    lesson: 3, // b p m f（+ a o e i u ü y w）
    words: [
      { syl: ['bà', 'ba'], hz: '爸爸', pic: 'a smiling friendly dad, upper body' },
      { syl: ['mā', 'ma'], hz: '妈妈', pic: 'a smiling friendly mom, upper body' },
      { syl: ['mù', 'mǎ'], hz: '木马', pic: 'a wooden rocking horse toy' },
      { syl: ['mǎ', 'yǐ'], hz: '蚂蚁', pic: 'a cute little ant' },
      { syl: ['yī', 'fu'], hz: '衣服', pic: 'a colorful kid t-shirt' },
      { syl: ['pù', 'bù'], hz: '瀑布' },
      { syl: ['wū', 'yā'], hz: '乌鸦' },
      { syl: ['fù', 'mǔ'], hz: '父母' },
    ],
    sentences: [
      { syl: ['bà', 'ba', 'pá', 'pō'], hz: '爸爸爬坡' },
      { syl: ['mā', 'ma', 'mō', 'mo', 'wǒ'], hz: '妈妈摸摸我' },
    ],
  },
  {
    lesson: 4, // + d t n l
    words: [
      { syl: ['dà', 'mǐ'], hz: '大米', pic: 'a bowl of white steamed rice' },
      { syl: ['dà', 'yú'], hz: '大鱼', pic: 'a big friendly fish' },
      { syl: ['dì', 'tú'], hz: '地图', pic: 'a folded treasure map' },
      { syl: ['mǎ', 'lù'], hz: '马路', pic: 'a short road with white lane stripes' },
      { syl: ['lǎ', 'ba'], hz: '喇叭', pic: 'a shiny brass trumpet' },
      { syl: ['ní', 'tǔ'], hz: '泥土' },
      { syl: ['tǔ', 'dì'], hz: '土地' },
      { syl: ['dà', 'lù'], hz: '大陆' },
    ],
    sentences: [
      { syl: ['tā', 'bù', 'pà'], hz: '他不怕' },
      { syl: ['lǎ', 'ba', 'dī', 'dī', 'dā'], hz: '喇叭嘀嘀嗒' },
    ],
  },
  {
    lesson: 5, // + g k h（三拼入门）
    words: [
      { syl: ['gē', 'ge'], hz: '哥哥', pic: 'a cheerful boy about ten years old, upper body' },
      { syl: ['hé', 'mǎ'], hz: '河马', pic: 'a cute hippo' },
      { syl: ['huā', 'duǒ'], hz: '花朵', pic: 'a pink flower blossom' },
      { syl: ['kě', 'lè'], hz: '可乐', pic: 'a cup of cola with a straw' },
      { syl: ['dà', 'hé'], hz: '大河', pic: 'a wide blue river between green banks' },
      { syl: ['mù', 'guā'], hz: '木瓜' },
      { syl: ['gū', 'gu'], hz: '姑姑' },
    ],
    sentences: [
      { syl: ['gē', 'ge', 'hē', 'kě', 'lè'], hz: '哥哥喝可乐' },
      { syl: ['hé', 'mǎ', 'guò', 'hé'], hz: '河马过河' },
    ],
  },
  {
    lesson: 6, // + j q x
    words: [
      { syl: ['xī', 'guā'], hz: '西瓜', pic: 'a slice of red watermelon' },
      { syl: ['dà', 'xiā'], hz: '大虾', pic: 'a cute pink shrimp' },
      { syl: ['jú', 'huā'], hz: '菊花', pic: 'a yellow chrysanthemum flower' },
      { syl: ['jī', 'qì'], hz: '机器', pic: 'a friendly toy robot' },
      { syl: ['qū', 'qí'], hz: '曲奇', pic: 'a round chocolate chip cookie' },
      { syl: ['jiā', 'jù'], hz: '家具' },
      { syl: ['xǐ', 'yī'], hz: '洗衣' },
    ],
    sentences: [
      { syl: ['dà', 'xiā', 'guò', 'hé'], hz: '大虾过河' },
      { syl: ['wǒ', 'qù', 'xǐ', 'yī'], hz: '我去洗衣' },
    ],
  },
  {
    lesson: 7, // + z c s
    words: [
      { syl: ['kù', 'zi'], hz: '裤子', pic: 'a pair of blue kids trousers' },
      { syl: ['wà', 'zi'], hz: '袜子', pic: 'a pair of striped socks' },
      { syl: ['zǐ', 'sè'], hz: '紫色', pic: 'a purple paint splash with a paintbrush' },
      { syl: ['zì', 'mǔ'], hz: '字母', pic: 'colorful alphabet building blocks without readable letters' },
      { syl: ['sī', 'jī'], hz: '司机' },
      { syl: ['zǔ', 'guó'], hz: '祖国' },
    ],
    sentences: [
      { syl: ['wǒ', 'zì', 'jǐ', 'xǐ', 'wà', 'zi'], hz: '我自己洗袜子' },
      { syl: ['dì', 'di', 'zuò', 'xià'], hz: '弟弟坐下' },
    ],
  },
  {
    lesson: 8, // + zh ch sh r
    words: [
      { syl: ['huǒ', 'chē'], hz: '火车', pic: 'a red cartoon steam train' },
      { syl: ['shī', 'zi'], hz: '狮子', pic: 'a cute lion' },
      { syl: ['rì', 'chū'], hz: '日出', pic: 'the sun rising over hills' },
      { syl: ['zhú', 'zi'], hz: '竹子', pic: 'green bamboo stalks with leaves' },
      { syl: ['hē', 'chá'], hz: '喝茶', pic: 'a steaming cup of tea' },
      { syl: ['shù', 'zhī'], hz: '树枝' },
      { syl: ['shū', 'shu'], hz: '叔叔' },
    ],
    sentences: [
      { syl: ['shū', 'shu', 'hē', 'chá'], hz: '叔叔喝茶' },
      { syl: ['zhè', 'shì', 'shū'], hz: '这是书' },
    ],
  },
  {
    lesson: 9, // + ai ei ui
    words: [
      { syl: ['bēi', 'zi'], hz: '杯子', pic: 'a simple drinking cup' },
      { syl: ['bái', 'cài'], hz: '白菜', pic: 'a fresh chinese cabbage' },
      { syl: ['shuǐ', 'guǒ'], hz: '水果', pic: 'a pile of fruits apple banana grapes' },
      { syl: ['dà', 'hǎi'], hz: '大海', pic: 'ocean waves' },
      { syl: ['fēi', 'jī'], hz: '飞机', pic: 'a cartoon airplane' },
      { syl: ['nǎi', 'nai'], hz: '奶奶', pic: 'a smiling grandma with grey hair, upper body' },
      { syl: ['mèi', 'mei'], hz: '妹妹' },
      { syl: ['guì', 'zi'], hz: '柜子' },
    ],
    sentences: [
      { syl: ['fēi', 'jī', 'zài', 'fēi'], hz: '飞机在飞' },
      { syl: ['wǒ', 'ài', 'hē', 'shuǐ'], hz: '我爱喝水' },
    ],
  },
  {
    lesson: 10, // + ao ou iu
    words: [
      { syl: ['xiǎo', 'gǒu'], hz: '小狗', pic: 'a cute puppy' },
      { syl: ['xiǎo', 'māo'], hz: '小猫', pic: 'a cute kitten' },
      { syl: ['qì', 'qiú'], hz: '气球', pic: 'a red balloon on a string' },
      { syl: ['lǎo', 'hǔ'], hz: '老虎', pic: 'a cute tiger' },
      { syl: ['zú', 'qiú'], hz: '足球', pic: 'a soccer ball' },
      { syl: ['cǎo', 'méi'], hz: '草莓', pic: 'a red strawberry' },
      { syl: ['hóu', 'zi'], hz: '猴子', pic: 'a cute monkey' },
      { syl: ['niú', 'nǎi'], hz: '牛奶' },
    ],
    sentences: [
      { syl: ['xiǎo', 'māo', 'chī', 'yú'], hz: '小猫吃鱼' },
      { syl: ['wǒ', 'ài', 'tī', 'zú', 'qiú'], hz: '我爱踢足球' },
    ],
  },
  {
    lesson: 11, // + ie üe er
    words: [
      { syl: ['xié', 'zi'], hz: '鞋子', pic: 'a pair of kids sneakers' },
      { syl: ['hú', 'dié'], hz: '蝴蝶', pic: 'a colorful butterfly' },
      { syl: ['ěr', 'duo'], hz: '耳朵', pic: 'a cartoon ear' },
      { syl: ['xué', 'xiào'], hz: '学校', pic: 'a small school building with a flag' },
      { syl: ['yé', 'ye'], hz: '爷爷', pic: 'a smiling grandpa with grey hair, upper body' },
      { syl: ['jiě', 'jie'], hz: '姐姐' },
      { syl: ['xuě', 'huā'], hz: '雪花', pic: 'a blue snowflake' },
    ],
    sentences: [
      { syl: ['hú', 'dié', 'zài', 'fēi'], hz: '蝴蝶在飞' },
      { syl: ['jiě', 'jie', 'qù', 'xué', 'xiào'], hz: '姐姐去学校' },
    ],
  },
  {
    lesson: 12, // + an en in un ün
    words: [
      { syl: ['xuě', 'rén'], hz: '雪人', pic: 'a snowman with a scarf' },
      { syl: ['yǔ', 'sǎn'], hz: '雨伞', pic: 'an open umbrella' },
      { syl: ['miàn', 'bāo'], hz: '面包', pic: 'a loaf of bread' },
      { syl: ['qún', 'zi'], hz: '裙子', pic: 'a girls dress' },
      { syl: ['diàn', 'nǎo'], hz: '电脑', pic: 'a laptop computer' },
      { syl: ['bái', 'yún'], hz: '白云', pic: 'a fluffy white cloud with light blue outline' },
      { syl: ['qīn', 'rén'], hz: '亲人' },
    ],
    sentences: [
      { syl: ['wǒ', 'men', 'duī', 'xuě', 'rén'], hz: '我们堆雪人' },
      { syl: ['bái', 'yún', 'piāo', 'piāo'], hz: '白云飘飘' },
    ],
  },
  {
    lesson: 13, // + ang eng ing ong
    words: [
      { syl: ['xióng', 'māo'], hz: '熊猫', pic: 'a cute giant panda' },
      { syl: ['xīng', 'xing'], hz: '星星', pic: 'a yellow star' },
      { syl: ['tài', 'yáng'], hz: '太阳', pic: 'a smiling sun' },
      { syl: ['yuè', 'liang'], hz: '月亮', pic: 'a yellow crescent moon' },
      { syl: ['fēng', 'zheng'], hz: '风筝', pic: 'a colorful diamond kite with a tail' },
      { syl: ['dēng', 'long'], hz: '灯笼', pic: 'a red chinese lantern' },
      { syl: ['xiàng', 'jī'], hz: '相机', pic: 'a camera' },
      { syl: ['hóng', 'sè'], hz: '红色' },
    ],
    sentences: [
      { syl: ['tiān', 'shàng', 'yǒu', 'xīng', 'xing'], hz: '天上有星星' },
      { syl: ['wǒ', 'ài', 'fàng', 'fēng', 'zheng'], hz: '我爱放风筝' },
    ],
  },
];

/** 配图文件名：音节去调相连（ü→v，纯 ASCII），如 bàba → 'baba'。 */
export const picId = (w: WordEntry): string =>
  w.syl.map((x) => x.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').replace(/u\u0308/g, 'v')).join('');

export const moonOf = (lessonId: number): Moon | undefined => MOONS.find((m) => m.lesson === lessonId);

// ── 音频 clip id（纯字符串推导，不 import 其他模块：scripts/sync-wordbank-audio.mjs
//    用 node --experimental-strip-types 直接加载本文件，扩展名省略的 import 会挂）──

const TONE_OF: Record<string, number> = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };

/** 'lǜ' → { base: 'lü', tone: 4 }；轻声（无调号）tone = 0。 */
export function splitTone(s: string): { base: string; tone: number } {
  let tone = 0;
  const base = s.normalize('NFD').replace(/[̀́̄̌]/g, (m) => {
    tone = TONE_OF[m];
    return '';
  });
  return { base: base.normalize('NFC'), tone };
}

/** 音节人声 clip：与 manifest.clipForSyllable 同形 sy-{base}{tone}；轻声 tone=0。 */
export const syllableClipId = (s: string): string => {
  const { base, tone } = splitTone(s);
  return `sy-${base}${tone}`;
};

/** 整词 TTS：wd-{base+tone 以 - 相连}，如 wd-ba4-ba0。 */
export const wordClipId = (w: WordEntry): string =>
  'wd-' + w.syl.map((s) => { const { base, tone } = splitTone(s); return `${base}${tone}`; }).join('-');

/** 整句 TTS：st-{课}-{序号 1 起}。 */
export const sentenceClipId = (lesson: number, index: number): string => `st-${lesson}-${index + 1}`;
