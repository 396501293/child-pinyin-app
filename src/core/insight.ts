// 家长小结（本地只读，无任何面向孩子的呈现）—— 数学夜航 rewards.recordAnswer 埋点段的重制：
// days = 近 14 天按「本地日」分桶的条目正确率（item key 'L:b'/'S:bà'）；
// errors = 最近 20 条错题环形缓冲 {条目, 孩子的错选, 时间}。
import type { Progress } from './types';

const DAY_MS = 24 * 3600 * 1000;
export const KEEP_DAYS = 14;
export const MAX_ERRORS = 20;

// 本地日序号：按孩子时区的「当天」分桶（UTC 日序号会把晚上八点后的练习记到明天）。
export const dayNumber = (now: number): number =>
  Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / DAY_MS);

// 每次「首答」调用（重试不重复计入）；答错且带 picked 时进错题缓冲。纯函数。
export function recordAnswer(
  p: Progress,
  item: string,
  ok: boolean,
  picked: string | undefined,
  now: number,
): Progress {
  const d = dayNumber(now);
  const days = p.insight.days
    .filter((b) => d - b.d < KEEP_DAYS)
    .map((b) => (b.d === d ? { d: b.d, items: { ...b.items } } : b));
  let today = days.find((b) => b.d === d);
  if (!today) {
    today = { d, items: {} };
    days.push(today);
  }
  const cur = today.items[item] ?? { n: 0, ok: 0 };
  today.items[item] = { n: cur.n + 1, ok: cur.ok + (ok ? 1 : 0) };
  const errors =
    !ok && picked !== undefined
      ? [...p.insight.errors, { item, picked, at: now }].slice(-MAX_ERRORS)
      : p.insight.errors;
  return { ...p, insight: { days, errors } };
}

export interface ErrorSummary { item: string; n: number; wrong: number }

// 家长屏「易错音」：14 天窗口内按错误次数聚合排序，取前 k（全对的条目不上榜）。
export function topErrors(p: Progress, k: number): ErrorSummary[] {
  const agg = new Map<string, { n: number; wrong: number }>();
  for (const b of p.insight.days) {
    for (const [item, s] of Object.entries(b.items)) {
      const cur = agg.get(item) ?? { n: 0, wrong: 0 };
      agg.set(item, { n: cur.n + s.n, wrong: cur.wrong + (s.n - s.ok) });
    }
  }
  return [...agg.entries()]
    .map(([item, s]) => ({ item, n: s.n, wrong: s.wrong }))
    .filter((e) => e.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.n - a.n || (a.item < b.item ? -1 : 1))
    .slice(0, k);
}
