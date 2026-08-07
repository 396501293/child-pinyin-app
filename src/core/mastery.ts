// 掌握度状态机 + 会话选题 —— fork 自数学夜航 timesTable.ts（34-105 行），
// 去 fact 特化：条目是字符串 key，'L:b' = 听辨字母单元，'S:bà' = 拼读带调音节。
// 雷达/发射台共用；cd 的单位是「会话」，跨会话 −1（结算方负责）。
import type { FactState, Rng } from './types';

export type ItemKey = string;
export const letterKey = (unit: string): ItemKey => `L:${unit}`;
export const syllableKey = (text: string): ItemKey => `S:${text}`;
export const unitOfKey = (key: ItemKey): string => key.slice(2);

export const S0: FactState = { s: 0, cd: 0 }; // 未触碰的缺省态
export const MAX_NEW_PER_SESSION = 4; // 每会话最多引入 4 个新条目（「慢慢」）

// 首次即答对：越熟休越久（cd = 新 s，s3 歇 3 个会话）。
export const onFirstCorrect = (st: FactState): FactState => {
  const s = Math.min(st.s + 1, 3) as FactState['s'];
  return { s, cd: s };
};
// 答错后本轮再见面答对：不因重试给满奖励（s 不变），但短期内再复习一次（cd=1）。
export const onRetryCorrect = (st: FactState): FactState => ({ s: st.s, cd: 1 });
// 答错：微回落强化记忆（floor 0），孩子侧无可见惩罚；cd=0 使其很快再到期（不锁死）。
export const onWrong = (st: FactState): FactState => ({
  s: Math.max(st.s - 1, 0) as FactState['s'],
  cd: 0,
});

// 抽样权重：新 > 弱 > 到期熟 > 到期已点亮 > 未到期熟 > 未到期已点亮。
export function masteryWeight(st: FactState): number {
  const due = st.cd <= 0;
  switch (st.s) {
    case 0: return 5;   // 新/未见（受「每会话≤4 个新」约束）
    case 1: return 4;   // 弱项优先
    case 2: return due ? 2.5 : 0.8;
    default: return due ? 1 : 0.3; // s3：集齐后偶尔保温
  }
}

export const stateOf = (states: Record<string, FactState>, key: string): FactState =>
  states[key] ?? S0;

export function weightedPick<T>(pool: readonly T[], w: (x: T) => number, rng: Rng): T {
  if (pool.length === 0) throw new Error('weightedPick: empty pool');
  const total = pool.reduce((s, x) => s + w(x), 0);
  let roll = rng() * total;
  for (const x of pool) { roll -= w(x); if (roll < 0) return x; }
  return pool[pool.length - 1];
}

// 生成一次会话的条目序列（size 条，含重复；再见面/兜底由会话运行时插入）。
export function planSession(
  pool: readonly string[],
  states: Record<string, FactState>,
  size: number,
  rng: Rng,
): string[] {
  if (pool.length === 0) return [];
  const isNew = (k: string) => stateOf(states, k).s === 0;

  const plan: string[] = [];
  const newChosen = new Set<string>(); // 本会话已引入的「新条目」（去重后计数）
  const capBlocks = (k: string) =>
    isNew(k) && !newChosen.has(k) && newChosen.size >= MAX_NEW_PER_SESSION;

  for (let n = 0; n < size; n++) {
    const recent = plan.slice(-3); // 去重：不与最近 3 题同条目
    let candidates = pool.filter((k) => !recent.includes(k) && !capBlocks(k));
    if (candidates.length === 0) candidates = pool.filter((k) => !capBlocks(k)); // 池太小 → 放宽去重
    if (candidates.length === 0) candidates = [...pool];                          // 兜底（极端退化）
    const pick = weightedPick(candidates, (k) => masteryWeight(stateOf(states, k)), rng);
    if (isNew(pick)) newChosen.add(pick);
    plan.push(pick);
  }
  return plan;
}
