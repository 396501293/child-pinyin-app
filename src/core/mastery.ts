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

// ── 自由练习结算（fork 自 TimesTableSession.answer/commit 的规则内核，纯函数化）──
// s 每会话每条目至多变动 1 级（cd 单位是「会话」，间隔重复的分级只在跨会话推进）：
// 首答定档（对 onFirstCorrect / 错 onWrong）；此后同条目重复只作保温——答对不再加分
// （无速成）、答错不再扣分（无惩罚）；曾答错的条目本会话再答对 → onRetryCorrect（cd=1）。
// M5 的雷达/发射台会话应经这里更新掌握度，不得在 UI 手搓状态机。

export interface MasterySession {
  readonly states: Record<ItemKey, FactState>; // 工作副本
  readonly resolved: ReadonlySet<ItemKey>;     // 本会话 s 已定档的条目
  readonly wrongOnce: ReadonlySet<ItemKey>;    // 本会话答错过的条目
}

export const startMasterySession = (persisted: Record<string, FactState>): MasterySession => ({
  states: Object.fromEntries(Object.entries(persisted).map(([k, v]) => [k, { ...v }])),
  resolved: new Set(),
  wrongOnce: new Set(),
});

// 每次作答调用（含原地重试的每一次）；纯函数，返回新 MasterySession。
export function applyMasteryAnswer(m: MasterySession, key: ItemKey, correct: boolean): MasterySession {
  const st = stateOf(m.states, key);
  const states = { ...m.states };
  const resolved = new Set(m.resolved);
  const wrongOnce = new Set(m.wrongOnce);
  if (correct) {
    if (!resolved.has(key)) { states[key] = onFirstCorrect(st); resolved.add(key); }
    else if (wrongOnce.has(key)) states[key] = onRetryCorrect(st); // 收尾于「这次对了」
    else return m; // 纯保温重复，s/cd 不变
  } else {
    if (!resolved.has(key)) { states[key] = onWrong(st); resolved.add(key); }
    wrongOnce.add(key);
  }
  return { states, resolved, wrongOnce };
}

// 会话结束结算：全体已落盘条目 cd−1（floor 0，间隔时钟走一格）、sessions+1；
// 切片其余字段（streak/total 等）原样保留。纯函数，恰在每会话结束调用一次。
export function settleSession<T extends { items: Record<string, FactState>; sessions: number }>(
  slice: T,
  states: Record<string, FactState>,
): T {
  const items: Record<string, FactState> = {};
  for (const [k, st] of Object.entries(states)) items[k] = { s: st.s, cd: Math.max(st.cd - 1, 0) };
  return { ...slice, items, sessions: slice.sessions + 1 };
}

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
