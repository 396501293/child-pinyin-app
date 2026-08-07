// 部编版一年级上册拼音课程表：13 课 + 2 个空间站（复习关）。
// 纯数据 + 极小的映射函数；算法（出题等）在 M3 的 questions 模块。
//
// 数据约束（tests/core/curriculum.test.ts 强制）：
// - blends 只用截至本课累计教过的声母/韵母；整体认读不做拼读目标；
// - 每课 6-10 条（第 3 课起）；三拼从第 5 课起；四声齐备；
// - 每条 blend 都是有常用字读音的真实音节，汉字载体在 blendCarriers 中与之对齐
//   （M2 配音的唯一选字来源；tests/audio/manifest.test.ts 强制与 audio-script.json 同步）。

export interface Lesson {
  readonly id: number;                    // 1..13
  readonly title: string;                 // 'a o e'
  readonly newLetters: readonly string[]; // 本课新授单元
  readonly toneSets: readonly string[];   // 练2 底座：每个按 1-4 声齐练
  readonly toneSetCarriers?: readonly string[]; // 与 toneSets 对齐；每项恰 4 个汉字＝1-4 声载字。L1-2 裸元音无载字（音频走 tv-* clip）
  readonly blends: readonly string[];     // 练3 拼读目标（带调 NFC 文本）
  readonly blendCarriers?: readonly string[]; // 与 blends 对齐；每项 1 个常用字载体（M2 配音用）
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
    toneSets: ['ma', 'ba'],
    toneSetCarriers: ['妈麻马骂', '八拔把爸'],
    blends: ['bā', 'mā', 'pó', 'fú', 'bǐ', 'mǎ', 'bà', 'mù'],
    blendCarriers: ['八', '妈', '婆', '服', '笔', '马', '爸', '木'],
  },
  {
    id: 4,
    title: 'd t n l',
    newLetters: ['d', 't', 'n', 'l'],
    toneSets: ['tu'],
    toneSetCarriers: ['突图土兔'],
    blends: ['tā', 'lā', 'dú', 'ná', 'tǔ', 'nǚ', 'dà', 'lù'],
    blendCarriers: ['他', '拉', '读', '拿', '土', '女', '大', '鹿'],
  },
  {
    id: 5,
    title: 'g k h',
    newLetters: ['g', 'k', 'h'],
    toneSets: ['hu'],
    toneSetCarriers: ['呼湖虎户'],
    blends: ['gē', 'guā', 'hé', 'hú', 'kǔ', 'huǒ', 'kè', 'guò'], // guā/huǒ/guò 为三拼入门
    blendCarriers: ['哥', '瓜', '河', '湖', '苦', '火', '课', '过'],
  },
  {
    id: 6,
    title: 'j q x',
    newLetters: ['j', 'q', 'x'],
    toneSets: ['qi'],
    toneSetCarriers: ['七旗起气'],
    blends: ['jī', 'xū', 'jiā', 'qí', 'jú', 'xǐ', 'jù', 'qù'], // jú/jù/qù/xū 演示 ü 去点
    blendCarriers: ['鸡', '需', '家', '旗', '橘', '洗', '句', '去'],
  },
  {
    id: 7,
    title: 'z c s',
    newLetters: ['z', 'c', 's'],
    toneSets: ['ci'], // 整体认读四声：疵词此次（原用 zi，但 zí 无常用字，M2 换 ci——疵，吹毛求疵）
    toneSetCarriers: ['疵词此次'],
    blends: ['cā', 'zū', 'zú', 'zǔ', 'suǒ', 'sè', 'zuò', 'cuò'],
    blendCarriers: ['擦', '租', '足', '组', '锁', '色', '坐', '错'],
    wholeRead: ['zi', 'ci', 'si'],
  },
  {
    id: 8,
    title: 'zh ch sh r',
    newLetters: ['zh', 'ch', 'sh', 'r'],
    toneSets: ['zhu', 'shu'],
    toneSetCarriers: ['猪竹煮住', '书熟鼠树'],
    blends: ['zhū', 'zhuō', 'chá', 'shé', 'zhǔ', 'shǔ', 'shù', 'rè'],
    blendCarriers: ['猪', '桌', '茶', '蛇', '煮', '鼠', '树', '热'],
    wholeRead: ['zhi', 'chi', 'shi', 'ri'],
  },
  {
    id: 9,
    title: 'ai ei ui',
    newLetters: ['ai', 'ei', 'ui'],
    toneSets: ['bai'],
    toneSetCarriers: ['掰白百拜'],
    blends: ['kāi', 'bēi', 'bái', 'lái', 'hǎi', 'shuǐ', 'duì', 'dài'],
    blendCarriers: ['开', '杯', '白', '来', '海', '水', '对', '带'],
  },
  {
    id: 10,
    title: 'ao ou iu',
    newLetters: ['ao', 'ou', 'iu'],
    toneSets: ['you'],
    toneSetCarriers: ['优游有又'],
    blends: ['māo', 'gāo', 'tóu', 'niú', 'hǎo', 'gǒu', 'liù', 'dào'],
    blendCarriers: ['猫', '高', '头', '牛', '好', '狗', '六', '到'],
  },
  {
    id: 11,
    title: 'ie üe er',
    newLetters: ['ie', 'üe', 'er'],
    toneSets: ['xie'],
    toneSetCarriers: ['些鞋写谢'],
    blends: ['tiē', 'quē', 'xié', 'xué', 'jiě', 'xuě', 'què', 'èr'],
    blendCarriers: ['贴', '缺', '鞋', '学', '姐', '雪', '鹊', '二'],
    wholeRead: ['ye', 'yue'],
  },
  {
    id: 12,
    title: 'an en in un ün',
    newLetters: ['an', 'en', 'in', 'un', 'ün'],
    toneSets: ['wan'],
    toneSetCarriers: ['弯玩碗万'],
    blends: ['shān', 'xīn', 'tiān', 'mén', 'qún', 'wǎn', 'mǎn', 'jìn', 'kùn'],
    blendCarriers: ['山', '心', '天', '门', '裙', '碗', '满', '进', '困'],
    wholeRead: ['yuan', 'yin', 'yun'],
  },
  {
    id: 13,
    title: 'ang eng ing ong',
    newLetters: ['ang', 'eng', 'ing', 'ong'],
    toneSets: ['tang'],
    toneSetCarriers: ['汤糖躺烫'],
    blends: ['fēng', 'xīng', 'yáng', 'lóng', 'xióng', 'wǎng', 'lěng', 'pàng', 'mèng'],
    blendCarriers: ['风', '星', '羊', '龙', '熊', '网', '冷', '胖', '梦'],
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
