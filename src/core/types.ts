// 共享类型 + Progress 形状与缺省值（M3）。
// 存储 key 'pinyin_planet_v1'（storage.ts）；掌握度状态机在 mastery.ts。
export type { Tone, Syllable } from './pinyin';

export type Rng = () => number; // [0,1)

export type Star = 0 | 1 | 2 | 3;

// 间隔重复条目状态：s=掌握度，cd=冷却（单位「会话」）。
// 条目 key：'L:b' / 'L:ai'（听辨字母）、'S:bà'（拼读音节）——见 mastery.ts。
export interface FactState { s: 0 | 1 | 2 | 3; cd: number }

// 每颗星球：学（learned）+ 练1/练2/练3 三颗星。
export interface PlanetProgress { learned: boolean; stars: [Star, Star, Star] }

export interface Progress {
  version: 1;
  planets: Record<number, PlanetProgress>; // 课 1-13；缺项 = 未触碰（读取用 progression.planetOf）
  stations: Record<'r1' | 'r2', Star>;
  unlocked: number; // NodeId 前沿 1..15
  radar: { items: Record<string, FactState>; sessions: number; total: number };
  launchpad: { items: Record<string, FactState>; sessions: number; streak: number; bestStreak: number; total: number };
  collectionSeen: string[]; // 图鉴里孩子已点开过的收藏品 id（「新」角标用）
  settings: { clipVolume: number };
  // 家长小结：近 14 天按日分桶的条目正确率 + 最近 20 条错题环形缓冲（insight.ts）。
  insight: {
    days: Array<{ d: number; items: Record<string, { n: number; ok: number }> }>;
    errors: Array<{ item: string; picked: string; at: number }>;
  };
}

export function defaultProgress(): Progress {
  return {
    version: 1,
    planets: {},
    stations: { r1: 0, r2: 0 },
    unlocked: 1,
    radar: { items: {}, sessions: 0, total: 0 },
    launchpad: { items: {}, sessions: 0, streak: 0, bestStreak: 0, total: 0 },
    collectionSeen: [],
    settings: { clipVolume: 1 },
    insight: { days: [], errors: [] },
  };
}
