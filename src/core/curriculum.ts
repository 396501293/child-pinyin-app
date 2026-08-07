// 部编版一年级上册拼音课程表：13 课 + 2 个空间站（复习关）。
// 纯数据 + 极小的映射函数；算法（出题等）在 M3 的 questions 模块。
//
// 数据约束（tests/core/curriculum.test.ts 强制）：
// - blends 只用截至本课累计教过的声母/韵母；整体认读不做拼读目标；
// - 每课 6-10 条（第 3 课起）；三拼从第 5 课起；四声齐备；
// - 每条 blend 都是有常用字读音的真实音节（M2 用汉字载体配音，选字见各行注释）。

export interface Lesson {
  readonly id: number;                    // 1..13
  readonly title: string;                 // 'a o e'
  readonly newLetters: readonly string[]; // 本课新授单元
  readonly toneSets: readonly string[];   // 练2 底座：每个按 1-4 声齐练
  readonly blends: readonly string[];     // 练3 拼读目标（带调 NFC 文本）
  readonly wholeRead?: readonly string[]; // 本课引入的整体认读
}

export const ALL_INITIALS: readonly string[] = [
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
  'g', 'k', 'h', 'j', 'q', 'x',
  'zh', 'ch', 'sh', 'r', 'z', 'c', 's',
  'y', 'w',
]; // 23 声母（含 y w）

export const ALL_FINALS: readonly string[] = [
  'a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er',
  'an', 'en', 'in', 'un', 'ün',
  'ang', 'eng', 'ing', 'ong',
]; // 24 韵母

export const LESSONS: ReadonlyArray<Lesson> = [
  {
    id: 1,
    title: 'a o e',
    newLetters: ['a', 'o', 'e'],
    toneSets: ['a', 'o', 'e'],
    blends: [], // 尚未学声母，无法拼读——M3 在此课改出「带调字母混合认读」题
  },
  {
    id: 2,
    title: 'i u ü y w',
    newLetters: ['i', 'u', 'ü', 'y', 'w'],
    toneSets: ['i', 'u', 'ü'],
    blends: [], // 同第 1 课：无声母可拼，M3 改出带调字母混合认读题
    wholeRead: ['yi', 'wu', 'yu'],
  },
  {
    id: 3,
    title: 'b p m f',
    newLetters: ['b', 'p', 'm', 'f'],
    toneSets: ['ma', 'ba'], // 妈麻马骂 / 八拔把爸
    blends: ['bā', 'mā', 'pó', 'fú', 'bǐ', 'mǎ', 'bà', 'mù'], // 八妈婆服笔马爸木
  },
  {
    id: 4,
    title: 'd t n l',
    newLetters: ['d', 't', 'n', 'l'],
    toneSets: ['tu'], // 突图土兔
    blends: ['tā', 'lā', 'dú', 'ná', 'tǔ', 'nǚ', 'dà', 'lù'], // 他拉读拿土女大鹿
  },
  {
    id: 5,
    title: 'g k h',
    newLetters: ['g', 'k', 'h'],
    toneSets: ['hu'], // 呼湖虎户
    blends: ['gē', 'guā', 'hé', 'hú', 'kǔ', 'huǒ', 'kè', 'guò'], // 哥瓜河湖苦火课过（guā/huǒ/guò 为三拼入门）
  },
  {
    id: 6,
    title: 'j q x',
    newLetters: ['j', 'q', 'x'],
    toneSets: ['qi'], // 七旗起气
    blends: ['jī', 'xū', 'jiā', 'qí', 'jú', 'xǐ', 'jù', 'qù'], // 鸡需家旗橘洗句去（jú/jù/qù/xū 演示 ü 去点）
  },
  {
    id: 7,
    title: 'z c s',
    newLetters: ['z', 'c', 's'],
    toneSets: ['zi'], // 整体认读四声：资?子字（2 声无常用字，M2 走 candidates 听审）
    blends: ['cā', 'zū', 'zú', 'zǔ', 'suǒ', 'sè', 'zuò', 'cuò'], // 擦租足组锁色坐错
    wholeRead: ['zi', 'ci', 'si'],
  },
  {
    id: 8,
    title: 'zh ch sh r',
    newLetters: ['zh', 'ch', 'sh', 'r'],
    toneSets: ['zhu', 'shu'], // 猪竹煮住 / 书熟鼠树
    blends: ['zhū', 'zhuō', 'chá', 'shé', 'zhǔ', 'shǔ', 'shù', 'rè'], // 猪桌茶蛇煮鼠树热
    wholeRead: ['zhi', 'chi', 'shi', 'ri'],
  },
  {
    id: 9,
    title: 'ai ei ui',
    newLetters: ['ai', 'ei', 'ui'],
    toneSets: ['bai'], // 掰白百拜
    blends: ['kāi', 'bēi', 'bái', 'lái', 'hǎi', 'shuǐ', 'duì', 'dài'], // 开杯白来海水对带
  },
  {
    id: 10,
    title: 'ao ou iu',
    newLetters: ['ao', 'ou', 'iu'],
    toneSets: ['you'], // 优游有又
    blends: ['māo', 'gāo', 'tóu', 'niú', 'hǎo', 'gǒu', 'liù', 'dào'], // 猫高头牛好狗六到
  },
  {
    id: 11,
    title: 'ie üe er',
    newLetters: ['ie', 'üe', 'er'],
    toneSets: ['xie'], // 些鞋写谢
    blends: ['tiē', 'quē', 'xié', 'xué', 'jiě', 'xuě', 'què', 'èr'], // 贴缺鞋学姐雪鹊二
    wholeRead: ['ye', 'yue'],
  },
  {
    id: 12,
    title: 'an en in un ün',
    newLetters: ['an', 'en', 'in', 'un', 'ün'],
    toneSets: ['wan'], // 弯玩碗万
    blends: ['shān', 'xīn', 'tiān', 'mén', 'qún', 'wǎn', 'mǎn', 'jìn', 'kùn'], // 山心天门裙碗满进困
    wholeRead: ['yuan', 'yin', 'yun'],
  },
  {
    id: 13,
    title: 'ang eng ing ong',
    newLetters: ['ang', 'eng', 'ing', 'ong'],
    toneSets: ['tang'], // 汤糖躺烫
    blends: ['fēng', 'xīng', 'yáng', 'lóng', 'xióng', 'wǎng', 'lěng', 'pàng', 'mèng'], // 风星羊龙熊网冷胖梦
    wholeRead: ['ying'],
  },
];

export interface Station {
  readonly id: 'r1' | 'r2';
  readonly afterLesson: 8 | 13;
  readonly coversLessons: readonly number[];
}

export const STATIONS: ReadonlyArray<Station> = [
  { id: 'r1', afterLesson: 8, coversLessons: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'r2', afterLesson: 13, coversLessons: [9, 10, 11, 12, 13] },
];

export type NodeId = number; // 1..15 = [L1..L8, R1, L9..L13, R2]

export function nodeToContent(
  n: NodeId,
): { kind: 'lesson'; lesson: Lesson } | { kind: 'station'; station: Station } {
  if (n >= 1 && n <= 8) return { kind: 'lesson', lesson: LESSONS[n - 1] };
  if (n === 9) return { kind: 'station', station: STATIONS[0] };
  if (n >= 10 && n <= 14) return { kind: 'lesson', lesson: LESSONS[n - 2] };
  if (n === 15) return { kind: 'station', station: STATIONS[1] };
  throw new Error(`nodeToContent: node ${n} out of range 1..15`);
}
