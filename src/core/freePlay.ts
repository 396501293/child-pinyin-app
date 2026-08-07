// 自由练习（雷达/发射台）的纯逻辑：连击规则 + 退出结算切片。
// 连击铁律（fork 自数学夜航 endless 规则）：只被答错清零，退出/重进永不清零；
// bestStreak 高水位单调不降。掌握度状态机在 mastery.ts（本模块只做切片记账，
// 不碰 s/cd 规则）。全部纯函数，tests/core/freePlay.test.ts 覆盖。
import { settleSession } from './mastery';
import type { FactState } from './types';

export interface StreakState {
  streak: number;
  bestStreak: number;
}

// 一题首答即对（含 blend 全段一次通过）→ +1；bestStreak 高水位跟涨。
export const streakOnCorrect = (s: StreakState): StreakState => {
  const streak = s.streak + 1;
  return { streak, bestStreak: Math.max(s.bestStreak, streak) };
};

// 任何一次答错（含 blend 任一段选错）即清零；bestStreak 不动。重复清零幂等
// （同题多次点错 → 每次都是 0），返回原对象避免无谓落盘。
export const streakOnWrong = (s: StreakState): StreakState =>
  s.streak === 0 ? s : { ...s, streak: 0 };

// 连击里程碑（小庆祝 + sfx.star）：5、10、20，20 后每 +10 一次（30、40…）。
export const isStreakMilestone = (n: number): boolean =>
  n === 5 || n === 10 || (n >= 20 && n % 10 === 0);

// 自由练习退出结算：掌握度 settleSession（全体 cd−1、sessions+1）+ total 累计
// 本次答完的题数。切片其余字段（发射台的 streak/bestStreak）由 settleSession 的
// 展开语义原样保留——「退出不清连击」在此长牙。恰在每次退出时调用一次。
export function settleFreeSlice<
  T extends { items: Record<string, FactState>; sessions: number; total: number },
>(slice: T, states: Record<string, FactState>, answered: number): T {
  const settled = settleSession(slice, states);
  return { ...settled, total: settled.total + answered };
}
